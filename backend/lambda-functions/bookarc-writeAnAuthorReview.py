"""
Lambda Function: bookarc-writeAnAuthorReview
Handle author review operations with EMBEDDED notifications
Endpoints: POST/GET/PUT/DELETE /authors/{author_id}/review(s)
"""

import json
import pymysql
import os
from datetime import datetime
from typing import Optional

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
    
    def notify_user_submitted_author_review(
        self, 
        user_id: int, 
        author_name: str
    ) -> Optional[int]:
        """Notify user that their author review was successfully submitted"""
        message = f'Your review has been successfully submitted for {author_name}'
        return self.create_notification(user_id, message, 'author_review_success', 'all')
    
    def notify_author_received_review(
        self, 
        author_user_id: int, 
        reviewer_name: str
    ) -> Optional[int]:
        """Notify author that they received a review"""
        message = f'{reviewer_name} submitted a review about you'
        return self.create_notification(author_user_id, message, 'author_review', 'author')
    
    def notify_user_updated_author_review(
        self, 
        user_id: int, 
        author_name: str
    ) -> Optional[int]:
        """Notify user that their author review was updated"""
        message = f'Your review for {author_name} has been updated successfully'
        return self.create_notification(user_id, message, 'author_review_updated', 'all')

# ============================================================================
# END OF EMBEDDED NOTIFICATION SERVICE
# ============================================================================

# Database configuration
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

def get_db_connection():
    """Create database connection"""
    return pymysql.connect(
        host=DB_HOST, 
        user=DB_USER, 
        password=DB_PASSWORD,
        database=DB_NAME, 
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def response(status_code, body):
    """Helper to create consistent API responses"""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body)
    }

def get_user_from_cognito(connection, cognito_sub):
    """Get user details from cognito_sub"""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT user_id, username, display_name, profile_image, role FROM users WHERE cognito_sub = %s",
            (cognito_sub,)
        )
        return cursor.fetchone()

def get_author_by_id(connection, author_id):
    """Get author by author_id (works for both registered and external authors)"""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT author_id, name, user_id as author_user_id FROM authors WHERE author_id = %s",
            (author_id,)
        )
        author = cursor.fetchone()
        
        if author:
            print(f"Found author: id={author['author_id']}, name={author['name']}, user_id={author['author_user_id']}")
        else:
            print(f"No author found with author_id: {author_id}")
        
        return author

def lambda_handler(event, context):
    """
    Handle author review operations
    
    Endpoints:
    - POST   /authors/{author_id}/review    - Write review
    - GET    /authors/{author_id}/review    - Get user's review
    - PUT    /authors/{author_id}/review    - Update review
    - DELETE /authors/{author_id}/review    - Delete review
    - GET    /authors/{author_id}/reviews   - Get all reviews (PUBLIC)
    """
    
    print(f"Event: {json.dumps(event)}")
    
    # Handle OPTIONS (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'OK'})
        }
    
    http_method = event.get('httpMethod')
    path = event.get('path', '')
    author_id = event.get('pathParameters', {}).get('author_id')
    
    print(f"📍 Path: {path}")
    print(f"📍 author_id: {author_id}")
    print(f"📍 HTTP Method: {http_method}")
    
    if not author_id:
        return response(400, {'message': 'Missing author_id in path'})
    
    try:
        author_id = int(author_id)
    except (ValueError, TypeError):
        return response(400, {'message': 'Invalid author_id format'})
    
    # PUBLIC ENDPOINT: GET all reviews (no auth required)
    if path.endswith('/reviews') and http_method == 'GET':
        return get_all_reviews(author_id)
    
    # PRIVATE ENDPOINTS: Require authentication
    cognito_sub = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
    
    if not cognito_sub:
        return response(401, {'message': 'Unauthorized - Authentication required'})
    
    connection = None
    
    try:
        connection = get_db_connection()
        
        # Get current user
        user = get_user_from_cognito(connection, cognito_sub)
        if not user:
            return response(404, {'message': 'User not found'})
        
        user_id = user['user_id']
        user_role = user['role']
        
        print(f"Authenticated user: id={user_id}, role={user_role}, name={user['display_name'] or user['username']}")
        
        # Get author
        author = get_author_by_id(connection, author_id)
        if not author:
            return response(404, {'message': 'Author not found'})
        
        # Prevent self-review
        if author['author_user_id'] and author['author_user_id'] == user_id:
            return response(403, {'message': 'You cannot review yourself'})
        
        # Prevent admin reviews
        if user_role == 'admin':
            return response(403, {'message': 'Admins cannot review authors'})
        
        # Route to appropriate handler
        handlers = {
            'POST': lambda: create_review(connection, user_id, user, author, author_id, event),
            'GET': lambda: get_user_review(connection, user_id, author_id),
            'PUT': lambda: update_review(connection, user_id, user, author, author_id, event),
            'DELETE': lambda: delete_review(connection, user_id, author_id)
        }
        
        handler = handlers.get(http_method)
        if not handler:
            return response(405, {'message': f'Method {http_method} not allowed'})
        
        return handler()
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return response(500, {'message': f'Internal server error: {str(e)}'})
    
    finally:
        if connection:
            connection.close()

def validate_review_text(review_text):
    """Validate review text"""
    if not review_text or len(review_text.strip()) < 10:
        return 'Review must be at least 10 characters long'
    if len(review_text) > 5000:
        return 'Review must not exceed 5000 characters'
    return None

def create_review(connection, user_id, user, author, author_id, event):
    """Create a new review - WITH NOTIFICATIONS"""
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return response(400, {'message': 'Invalid JSON in request body'})
    
    review_text = body.get('review_text', '').strip()
    
    # Validate
    error = validate_review_text(review_text)
    if error:
        return response(400, {'message': error})
    
    try:
        with connection.cursor() as cursor:
            # Check for existing review
            cursor.execute(
                "SELECT author_review_id FROM author_reviews WHERE user_id = %s AND author_id = %s",
                (user_id, author_id)
            )
            
            if cursor.fetchone():
                return response(409, {'message': 'You have already reviewed this author. Use PUT to update.'})
            
            # Insert review
            cursor.execute(
                "INSERT INTO author_reviews (review_text, user_id, author_id) VALUES (%s, %s, %s)",
                (review_text, user_id, author_id)
            )
            
            review_id = cursor.lastrowid
            connection.commit()
            
            print(f"Created review: id={review_id}, user_id={user_id}, author_id={author_id}")
            
            # SEND NOTIFICATIONS
            try:
                print(f"\nCreating NotificationService...")
                notif_service = NotificationService(connection)
                
                user_name = user['display_name'] or user['username']
                author_name = author['name']
                
                # 1. Notify the user who submitted the review
                print(f"Sending notification to user {user_id}")
                user_notif_id = notif_service.notify_user_submitted_author_review(user_id, author_name)
                print(f"User notification created: {user_notif_id}")
                
                # 2. Notify the author if they're a registered user
                if author.get('author_user_id'):
                    print(f"Sending notification to author user_id {author['author_user_id']}")
                    author_notif_id = notif_service.notify_author_received_review(
                        author['author_user_id'], 
                        user_name
                    )
                    print(f"Author notification created: {author_notif_id}")
                
                print(f"All notifications sent successfully\n")
            except Exception as notif_error:
                print(f"Failed to send notifications: {str(notif_error)}")
                import traceback
                traceback.print_exc()
            
            return response(201, {
                'message': 'Review submitted successfully',
                'review': {
                    'author_review_id': review_id,
                    'user_id': user_id,
                    'username': user['display_name'] or user['username'],
                    'avatar_url': user['profile_image'],
                    'author_id': int(author_id),
                    'review_text': review_text,
                    'created_at': datetime.now().isoformat()
                }
            })
    
    except Exception as e:
        connection.rollback()
        raise e

def get_user_review(connection, user_id, author_id):
    """Get user's review for an author"""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT ar.author_review_id, ar.review_text, ar.created_at, ar.updated_at,
                   u.username, u.display_name, u.profile_image
            FROM author_reviews ar
            JOIN users u ON ar.user_id = u.user_id
            WHERE ar.user_id = %s AND ar.author_id = %s
            """,
            (user_id, author_id)
        )
        review = cursor.fetchone()
        
        if not review:
            print(f"No review found: user_id={user_id}, author_id={author_id}")
            return response(404, {'message': 'No review found'})
        
        print(f"Found review: id={review['author_review_id']}, user_id={user_id}, author_id={author_id}")
        
        return response(200, {
            'review': {
                'author_review_id': review['author_review_id'],
                'username': review['display_name'] or review['username'],
                'avatar_url': review['profile_image'],
                'review_text': review['review_text'],
                'created_at': review['created_at'].isoformat() if review['created_at'] else None,
                'updated_at': review['updated_at'].isoformat() if review['updated_at'] else None
            }
        })

def update_review(connection, user_id, user, author, author_id, event):
    """Update user's review - WITH NOTIFICATIONS"""
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return response(400, {'message': 'Invalid JSON in request body'})
    
    review_text = body.get('review_text', '').strip()
    
    # Validate
    error = validate_review_text(review_text)
    if error:
        return response(400, {'message': error})
    
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE author_reviews SET review_text = %s WHERE user_id = %s AND author_id = %s",
                (review_text, user_id, author_id)
            )
            
            if cursor.rowcount == 0:
                return response(404, {'message': 'No review found to update'})
            
            connection.commit()
            
            print(f"Updated review: user_id={user_id}, author_id={author_id}")
            
            # SEND NOTIFICATION
            try:
                print(f"\n📧 Creating NotificationService...")
                notif_service = NotificationService(connection)
                author_name = author['name']
                
                print(f"Sending update notification to user {user_id}")
                notif_id = notif_service.notify_user_updated_author_review(user_id, author_name)
                print(f"Update notification created: {notif_id}\n")
            except Exception as notif_error:
                print(f"Failed to send notification: {str(notif_error)}")
                import traceback
                traceback.print_exc()
            
            return response(200, {
                'message': 'Review updated successfully',
                'review_text': review_text
            })
    
    except Exception as e:
        connection.rollback()
        raise e

def delete_review(connection, user_id, author_id):
    """Delete user's review"""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM author_reviews WHERE user_id = %s AND author_id = %s",
                (user_id, author_id)
            )
            
            if cursor.rowcount == 0:
                return response(404, {'message': 'No review found to delete'})
            
            connection.commit()
            
            print(f"Deleted review: user_id={user_id}, author_id={author_id}")
            
            return response(200, {'message': 'Review deleted successfully'})
    
    except Exception as e:
        connection.rollback()
        raise e

def get_all_reviews(author_id):
    """Get all reviews for an author (PUBLIC - no auth required)"""
    connection = None
    
    try:
        connection = get_db_connection()
        
        with connection.cursor() as cursor:
            print(f"Getting reviews for author_id: {author_id}")
            
            # Fetch all reviews for this author_id
            cursor.execute(
                """
                SELECT ar.author_review_id, ar.review_text, ar.created_at, ar.updated_at,
                       u.user_id, u.username, u.display_name, u.profile_image
                FROM author_reviews ar
                JOIN users u ON ar.user_id = u.user_id
                WHERE ar.author_id = %s
                ORDER BY ar.created_at DESC
                """,
                (author_id,)
            )
            reviews = cursor.fetchall()
            
            print(f"Found {len(reviews)} reviews for author_id: {author_id}")
            
            formatted_reviews = [
                {
                    'author_review_id': r['author_review_id'],
                    'user_id': r['user_id'],
                    'username': r['display_name'] or r['username'],
                    'avatar_url': r['profile_image'],
                    'review_text': r['review_text'],
                    'created_at': r['created_at'].isoformat() if r['created_at'] else None,
                    'updated_at': r['updated_at'].isoformat() if r['updated_at'] else None
                }
                for r in reviews
            ]
            
            return response(200, {
                'reviews': formatted_reviews,
                'total': len(formatted_reviews)
            })
    
    except Exception as e:
        print(f"Error in get_all_reviews: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return response(500, {'message': f'Internal server error: {str(e)}'})
    
    finally:
        if connection:
            connection.close()
