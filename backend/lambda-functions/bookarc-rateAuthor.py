import json
import pymysql
import os
from decimal import Decimal
from typing import Dict, Any, Optional

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
    'Access-Control-Allow-Origin': '*'
}

def response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized API response"""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=lambda x: float(x) if isinstance(x, Decimal) else None)
    }

def get_or_create_author(cursor, connection, user_id_or_author_id: int) -> Optional[Dict[str, Any]]:
    """Get existing author or create one for verified users"""
    
    # Try as author_id first
    cursor.execute("""
        SELECT author_id, name, is_registered_author, user_id, average_rating
        FROM authors WHERE author_id = %s
    """, (user_id_or_author_id,))
    author = cursor.fetchone()
    if author:
        print(f"✅ Found author by author_id: {author['author_id']}")
        return author
    
    # Try as user_id of registered author
    cursor.execute("""
        SELECT author_id, name, is_registered_author, user_id, average_rating
        FROM authors WHERE user_id = %s AND is_registered_author = 1
    """, (user_id_or_author_id,))
    author = cursor.fetchone()
    if author:
        print(f"✅ Found author by user_id: {author['author_id']}")
        return author
    
    # Check if verified user without author entry
    cursor.execute("""
        SELECT user_id, username, display_name, bio, verification_status, role
        FROM users WHERE user_id = %s
    """, (user_id_or_author_id,))
    user = cursor.fetchone()
    
    if not user:
        print(f"❌ No user found with user_id={user_id_or_author_id}")
        return None
    
    # Create author entry for verified users
    if user['verification_status'] == 'approved' or user['role'] == 'author':
        print(f"✅ Creating author entry for verified user {user['user_id']}")
        
        cursor.execute("""
            INSERT INTO authors (name, bio, is_registered_author, verified, user_id)
            VALUES (%s, %s, TRUE, TRUE, %s)
        """, (user['display_name'] or user['username'], user['bio'], user['user_id']))
        connection.commit()
        
        cursor.execute("""
            SELECT author_id, name, is_registered_author, user_id, average_rating
            FROM authors WHERE user_id = %s
        """, (user_id_or_author_id,))
        author = cursor.fetchone()
        
        print(f"✅ Created new author entry: author_id={author['author_id']}")
        return author
    
    print(f"❌ User {user_id_or_author_id} is not a verified author")
    return None

def update_author_average_rating(cursor, author_id: int) -> float:
    """Calculate and update author's average rating"""
    cursor.execute("""
        SELECT AVG(rating_value) as avg_rating
        FROM author_ratings WHERE author_id = %s
    """, (author_id,))
    
    stats = cursor.fetchone()
    avg_rating = float(stats['avg_rating']) if stats['avg_rating'] else 0
    
    cursor.execute("""
        UPDATE authors SET average_rating = %s WHERE author_id = %s
    """, (avg_rating, author_id))
    
    print(f"✅ Updated author average_rating to {avg_rating}")
    return avg_rating

def rate_author(connection, user_id: int, author_id: int, event: Dict[str, Any]) -> Dict[str, Any]:
    """Rate an author (1-5 stars)"""
    try:
        body = json.loads(event.get('body', '{}'))
        rating_value = body.get('rating_value')
        
        if not isinstance(rating_value, int) or not 1 <= rating_value <= 5:
            return response(400, {'message': 'Rating value must be an integer between 1 and 5'})
        
        with connection.cursor() as cursor:
            # Check for existing rating
            cursor.execute("""
                SELECT author_rating_id FROM author_ratings 
                WHERE user_id = %s AND author_id = %s
            """, (user_id, author_id))
            existing = cursor.fetchone()
            
            if existing:
                cursor.execute("""
                    UPDATE author_ratings SET rating_value = %s 
                    WHERE author_rating_id = %s
                """, (rating_value, existing['author_rating_id']))
                message = 'Rating updated successfully'
                print(f"✅ Updated rating: user_id={user_id}, author_id={author_id}, value={rating_value}")
            else:
                cursor.execute("""
                    INSERT INTO author_ratings (rating_value, user_id, author_id)
                    VALUES (%s, %s, %s)
                """, (rating_value, user_id, author_id))
                message = 'Rating submitted successfully'
                print(f"✅ Created rating: user_id={user_id}, author_id={author_id}, value={rating_value}")
            
            # Update average
            avg_rating = update_author_average_rating(cursor, author_id)
            
            cursor.execute("""
                SELECT COUNT(*) as total FROM author_ratings WHERE author_id = %s
            """, (author_id,))
            total_ratings = cursor.fetchone()['total']
            
            connection.commit()
            
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
            
            # Recalculate average
            update_author_average_rating(cursor, author_id)
            connection.commit()
            
            print(f"✅ Deleted rating: user_id={user_id}, author_id={author_id}")
            return response(200, {'message': 'Rating deleted successfully'})
    
    except Exception as e:
        connection.rollback()
        raise e

def lambda_handler(event, context):
    """Handle author rating operations: POST/GET/DELETE /author/{user_id}/rating"""
    print(f"Event: {json.dumps(event)}")
    
    # Extract path and auth info
    target_user_id = event.get('pathParameters', {}).get('user_id')
    cognito_sub = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
    http_method = event.get('httpMethod')
    
    print(f"📍 Target user_id: {target_user_id}, 🔐 Cognito sub: {cognito_sub}")
    
    # Validation
    if not cognito_sub:
        return response(401, {'message': 'Unauthorized - Authentication required'})
    if not target_user_id:
        return response(400, {'message': 'Missing user_id in path'})
    
    connection = None
    try:
        connection = pymysql.connect(**DB_CONFIG)
        
        with connection.cursor() as cursor:
            # Get authenticated user
            cursor.execute("""
                SELECT user_id, role FROM users WHERE cognito_sub = %s
            """, (cognito_sub,))
            user = cursor.fetchone()
            
            if not user:
                return response(404, {'message': 'User not found'})
            
            user_id = user['user_id']
            print(f"✅ Found user: user_id={user_id}, role={user['role']}")
            
            # Get or create author
            author = get_or_create_author(cursor, connection, target_user_id)
            if not author:
                return response(404, {'message': 'Author profile not found for this user'})
            
            author_id = author['author_id']
            print(f"✅ Found author: {author['name']}, author_id={author_id}")
            
            # Prevent self-rating and admin rating
            if author.get('user_id') == user_id:
                return response(403, {'message': 'You cannot rate yourself'})
            if user['role'] == 'admin':
                return response(403, {'message': 'Admins cannot rate authors'})
        
        # Route to appropriate handler
        if http_method == 'POST':
            return rate_author(connection, user_id, author_id, event)
        elif http_method == 'GET':
            return get_user_rating(connection, user_id, author_id)
        elif http_method == 'DELETE':
            return delete_rating(connection, user_id, author_id)
        else:
            return response(405, {'message': 'Method not allowed'})
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return response(500, {'message': f'Internal server error: {str(e)}'})
    
    finally:
        if connection:
            connection.close()
