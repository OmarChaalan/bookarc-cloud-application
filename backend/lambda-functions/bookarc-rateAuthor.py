"""
Lambda Function: bookarc-rateAuthor
Rate an author (1-5 stars) with EMBEDDED notifications
Endpoint: POST/GET/DELETE /authors/{author_id}/rating
"""

import json
import pymysql
import os
from decimal import Decimal
from typing import Dict, Any, Optional

# ============================================================================
# EMBEDDED NOTIFICATION SERVICE - NO LAYER NEEDED
# ============================================================================

class NotificationService:
    """Service for creating and managing notifications"""
    
    def __init__(self, connection):
        self.connection = connection
    
    def create_notification(
        self, 
        user_id: int, 
        message: str, 
        notification_type: str,
        audience_type: str = 'all'
    ) -> Optional[int]:
        """Create a single notification"""
        try:
            with self.connection.cursor() as cursor:
                sql = """
                    INSERT INTO notifications 
                    (user_id, message, type, audience_type, is_read, created_at)
                    VALUES (%s, %s, %s, %s, FALSE, NOW())
                """
                cursor.execute(sql, (user_id, message, notification_type, audience_type))
                self.connection.commit()
                notification_id = cursor.lastrowid
                print(f"Created notification {notification_id} for user {user_id}: {message}")
                return notification_id
        except Exception as e:
            print(f"Error creating notification: {str(e)}")
            return None
    
    def notify_user_rated_author(
        self, 
        user_id: int, 
        author_name: str, 
        rating_value: int
    ) -> Optional[int]:
        """Notify user that they successfully rated an author"""
        stars = '⭐' * rating_value
        message = f'You have successfully rated {author_name} {stars} ({rating_value}/5)'
        return self.create_notification(user_id, message, 'author_rating_success', 'all')
    
    def notify_author_received_rating(
        self, 
        author_user_id: int, 
        rater_name: str, 
        rating_value: int
    ) -> Optional[int]:
        """Notify author that they received a rating"""
        stars = '⭐' * rating_value
        message = f'⭐ {rater_name} rated you {stars} ({rating_value}/5)'
        return self.create_notification(author_user_id, message, 'author_rating', 'author')

# ============================================================================
# END OF EMBEDDED NOTIFICATION SERVICE
# ============================================================================

# Database configuration
DB_CONFIG = {
    'host': os.environ.get('DB_HOST'),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
}

def response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized API response"""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=lambda x: float(x) if isinstance(x, Decimal) else None)
    }

def get_or_create_author(cursor, connection, author_id_param: int) -> Optional[Dict[str, Any]]:
    """Get existing author or create one for verified users"""
    
    print(f"Looking up author with ID: {author_id_param}")
    
    # Strategy 1: Try as author_id directly
    cursor.execute("""
        SELECT author_id, name, is_registered_author, user_id, average_rating
        FROM authors WHERE author_id = %s
    """, (author_id_param,))
    author = cursor.fetchone()
    
    if author:
        print(f"Found author: author_id={author['author_id']}, name={author['name']}")
        return author
    
    # Strategy 2: Try as user_id of registered author
    cursor.execute("""
        SELECT author_id, name, is_registered_author, user_id, average_rating
        FROM authors WHERE user_id = %s AND is_registered_author = 1
    """, (author_id_param,))
    author = cursor.fetchone()
    
    if author:
        print(f"Found registered author by user_id: {author['author_id']}")
        return author
    
    # Strategy 3: Check if verified user without author entry
    cursor.execute("""
        SELECT user_id, username, display_name, bio, verification_status, role
        FROM users WHERE user_id = %s
    """, (author_id_param,))
    user = cursor.fetchone()
    
    if not user:
        print(f"No user found")
        return None
    
    # Strategy 4: Create author entry for verified users
    if user['verification_status'] == 'approved' or user['role'] == 'author':
        try:
            cursor.execute("""
                INSERT INTO authors (name, bio, is_registered_author, verified, user_id)
                VALUES (%s, %s, TRUE, TRUE, %s)
            """, (user['display_name'] or user['username'], user['bio'], user['user_id']))
            connection.commit()
            
            cursor.execute("""
                SELECT author_id, name, is_registered_author, user_id, average_rating
                FROM authors WHERE user_id = %s AND is_registered_author = TRUE
            """, (user['user_id'],))
            author = cursor.fetchone()
            
            if author:
                print(f"Created new author entry: author_id={author['author_id']}")
                return author
                
        except pymysql.IntegrityError:
            connection.rollback()
            cursor.execute("""
                SELECT author_id, name, is_registered_author, user_id, average_rating
                FROM authors WHERE user_id = %s AND is_registered_author = TRUE
            """, (user['user_id'],))
            author = cursor.fetchone()
            if author:
                return author
    
    return None

def update_author_average_rating(cursor, author_id: int) -> float:
    """Calculate and update author's average rating"""
    cursor.execute("""
        SELECT AVG(rating_value) as avg_rating, COUNT(*) as total
        FROM author_ratings WHERE author_id = %s
    """, (author_id,))
    
    stats = cursor.fetchone()
    avg_rating = float(stats['avg_rating']) if stats and stats['avg_rating'] else 0.0
    total_ratings = int(stats['total']) if stats else 0
    
    cursor.execute("""
        UPDATE authors SET average_rating = %s WHERE author_id = %s
    """, (avg_rating, author_id))
    
    print(f"Updated author average_rating to {avg_rating:.2f} (from {total_ratings} ratings)")
    return avg_rating

def rate_author(connection, user_id: int, author_id: int, author: Dict, event: Dict[str, Any]) -> Dict[str, Any]:
    """Rate an author (1-5 stars) - WITH NOTIFICATIONS"""
    try:
        body = json.loads(event.get('body', '{}'))
        rating_value = body.get('rating_value')
        
        print(f"Rating request: user_id={user_id}, author_id={author_id}, rating={rating_value}")
        
        if not isinstance(rating_value, int) or not 1 <= rating_value <= 5:
            return response(400, {'message': 'Rating value must be an integer between 1 and 5'})
        
        with connection.cursor() as cursor:
            # Get user's display name
            cursor.execute("""
                SELECT COALESCE(display_name, username) as name 
                FROM users WHERE user_id = %s
            """, (user_id,))
            user_data = cursor.fetchone()
            user_name = user_data['name'] if user_data else 'A user'
            
            # Check for existing rating
            cursor.execute("""
                SELECT author_rating_id FROM author_ratings 
                WHERE user_id = %s AND author_id = %s
            """, (user_id, author_id))
            existing = cursor.fetchone()
            
            is_new_rating = not existing
            
            if existing:
                cursor.execute("""
                    UPDATE author_ratings SET rating_value = %s 
                    WHERE author_rating_id = %s
                """, (rating_value, existing['author_rating_id']))
                message = 'Rating updated successfully'
            else:
                cursor.execute("""
                    INSERT INTO author_ratings (rating_value, user_id, author_id)
                    VALUES (%s, %s, %s)
                """, (rating_value, user_id, author_id))
                message = 'Rating submitted successfully'
            
            # Update average
            avg_rating = update_author_average_rating(cursor, author_id)
            
            cursor.execute("""
                SELECT COUNT(*) as total FROM author_ratings WHERE author_id = %s
            """, (author_id,))
            total_ratings = cursor.fetchone()['total']
            
            connection.commit()
            print(f"Database updated - avg_rating={avg_rating:.2f}, total={total_ratings}")
            
            # SEND NOTIFICATIONS
            try:
                print(f"\nCreating NotificationService...")
                notif_service = NotificationService(connection)
                
                # 1. Notify the user who rated
                author_name = author['name']
                print(f"Sending notification to user {user_id}")
                user_notif_id = notif_service.notify_user_rated_author(user_id, author_name, rating_value)
                print(f"User notification created: {user_notif_id}")
                
                # 2. Notify the author if registered (ONLY for new ratings)
                if is_new_rating and author.get('user_id'):
                    print(f"Sending notification to author user_id {author['user_id']}")
                    author_notif_id = notif_service.notify_author_received_rating(
                        author['user_id'], 
                        user_name, 
                        rating_value
                    )
                    print(f"Author notification created: {author_notif_id}")
                
                print(f"All notifications sent successfully\n")
            except Exception as notif_error:
                print(f"Notification error: {str(notif_error)}")
                import traceback
                traceback.print_exc()
            
            return response(200, {
                'message': message,
                'rating': {
                    'user_id': user_id,
                    'author_id': int(author_id),
                    'rating_value': rating_value,
                    'avg_rating': avg_rating,
                    'total_ratings': total_ratings
                }
            })
    
    except json.JSONDecodeError:
        return response(400, {'message': 'Invalid JSON in request body'})
    except Exception as e:
        connection.rollback()
        print(f"Error in rate_author: {str(e)}")
        import traceback
        traceback.print_exc()
        raise e

def get_user_rating(connection, user_id: int, author_id: int) -> Dict[str, Any]:
    """Get user's rating for an author"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT author_rating_id, rating_value, created_at
            FROM author_ratings
            WHERE user_id = %s AND author_id = %s
        """, (user_id, author_id))
        rating = cursor.fetchone()
        
        if not rating:
            return response(404, {'message': 'No rating found'})
        
        return response(200, {
            'rating': {
                'author_rating_id': rating['author_rating_id'],
                'rating_value': rating['rating_value'],
                'created_at': rating['created_at'].isoformat() if rating['created_at'] else None
            }
        })

def delete_rating(connection, user_id: int, author_id: int) -> Dict[str, Any]:
    """Delete user's rating"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                DELETE FROM author_ratings
                WHERE user_id = %s AND author_id = %s
            """, (user_id, author_id))
            
            if cursor.rowcount == 0:
                return response(404, {'message': 'No rating found to delete'})
            
            update_author_average_rating(cursor, author_id)
            connection.commit()
            
            return response(200, {'message': 'Rating deleted successfully'})
    except Exception as e:
        connection.rollback()
        raise e

def lambda_handler(event, context):
    """Handle author rating operations"""
    print(f"===== bookarc-rateAuthor =====")
    
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'message': 'OK'})}
    
    target_author_id = event.get('pathParameters', {}).get('author_id')
    cognito_sub = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
    http_method = event.get('httpMethod')
    
    if not cognito_sub:
        return response(401, {'message': 'Unauthorized'})
    
    if not target_author_id:
        return response(400, {'message': 'Missing author_id'})
    
    try:
        target_author_id = int(target_author_id)
    except (ValueError, TypeError):
        return response(400, {'message': 'Invalid author_id'})
    
    connection = None
    try:
        connection = pymysql.connect(**DB_CONFIG)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT user_id, role, COALESCE(display_name, username) as name 
                FROM users WHERE cognito_sub = %s
            """, (cognito_sub,))
            user = cursor.fetchone()
            
            if not user:
                return response(404, {'message': 'User not found'})
            
            user_id = user['user_id']
            user_role = user['role']
            
            author = get_or_create_author(cursor, connection, target_author_id)
            
            if not author:
                return response(404, {'message': 'Author not found'})
            
            author_id = author['author_id']
            
            if author.get('user_id') == user_id:
                return response(403, {'message': 'You cannot rate yourself'})
            
            if user_role == 'admin':
                return response(403, {'message': 'Admins cannot rate authors'})
        
        if http_method == 'POST':
            return rate_author(connection, user_id, author_id, author, event)
        elif http_method == 'GET':
            return get_user_rating(connection, user_id, author_id)
        elif http_method == 'DELETE':
            return delete_rating(connection, user_id, author_id)
        else:
            return response(405, {'message': f'Method {http_method} not allowed'})
    
    except pymysql.Error as db_error:
        print(f"Database error: {str(db_error)}")
        return response(500, {'message': f'Database error: {str(db_error)}'})
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return response(500, {'message': f'Internal server error: {str(e)}'})
    finally:
        if connection:
            connection.close()
