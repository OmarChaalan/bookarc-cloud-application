import json
import pymysql
import os
from datetime import datetime

# Database configuration
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASSWORD,
        database=DB_NAME, charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def response(status_code, body):
    """Helper to create consistent API responses"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
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

def get_author(connection, author_id):
    """Get author details"""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT author_id, name, user_id as author_user_id FROM authors WHERE author_id = %s",
            (author_id,)
        )
        return cursor.fetchone()

def lambda_handler(event, context):
    """
    Handle author review operations
    POST   /author/{user_id}/review  - Write review
    GET    /author/{user_id}/review  - Get user's review
    PUT    /author/{user_id}/review  - Update review
    DELETE /author/{user_id}/review  - Delete review
    GET    /author/{user_id}/reviews - Get all reviews (PUBLIC)
    """
    
    print(f"Event: {json.dumps(event)}")
    
    http_method = event.get('httpMethod')
    path = event.get('path', '')
    author_id = event.get('pathParameters', {}).get('user_id')
    
    # Public endpoint: GET /reviews
    if path.endswith('/reviews') and http_method == 'GET':
        return get_all_reviews(author_id)
    
    # Authenticate user for private endpoints
    cognito_sub = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
    
    if not cognito_sub:
        return response(401, {'message': 'Unauthorized - Authentication required'})
    
    if not author_id:
        return response(400, {'message': 'Missing author_id in path'})
    
    connection = None
    
    try:
        connection = get_db_connection()
        
        # Get current user
        user = get_user_from_cognito(connection, cognito_sub)
        if not user:
            return response(404, {'message': 'User not found'})
        
        user_id = user['user_id']
        
        # Get author details
        author = get_author(connection, author_id)
        if not author:
            return response(404, {'message': 'Author not found'})
        
        # Prevent self-review
        if author['author_user_id'] and author['author_user_id'] == user_id:
            return response(403, {'message': 'You cannot review yourself'})
        
        # Prevent admin reviews
        if user['role'] == 'admin':
            return response(403, {'message': 'Admins cannot review authors'})
        
        # Route to appropriate handler
        handlers = {
            'POST': lambda: create_review(connection, user_id, user, author_id, event),
            'GET': lambda: get_user_review(connection, user_id, author_id),
            'PUT': lambda: update_review(connection, user_id, author_id, event),
            'DELETE': lambda: delete_review(connection, user_id, author_id)
        }
        
        handler = handlers.get(http_method)
        if not handler:
            return response(405, {'message': 'Method not allowed'})
        
        return handler()
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        print(traceback.format_exc())
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

def create_review(connection, user_id, user, author_id, event):
    """Create a new review"""
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
            return response(404, {'message': 'No review found'})
        
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

def update_review(connection, user_id, author_id, event):
    """Update user's review"""
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
        print(f"❌ Error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return response(500, {'message': f'Internal server error: {str(e)}'})
    
    finally:
        if connection:
            connection.close()
