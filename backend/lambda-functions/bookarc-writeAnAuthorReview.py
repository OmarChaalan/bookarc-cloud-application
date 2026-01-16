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
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def lambda_handler(event, context):
    """
    Handle author review operations
    
    POST /author/{user_id}/review - Write a review
    GET /author/{user_id}/review - Get user's review
    PUT /author/{user_id}/review - Update user's review
    DELETE /author/{user_id}/review - Delete user's review
    GET /author/{user_id}/reviews - Get all reviews for author (PUBLIC)
    """
    
    print(f"Event: {json.dumps(event)}")
    
    http_method = event.get('httpMethod')
    path_parameters = event.get('pathParameters', {})
    
    # ✅ FIXED: Get from 'user_id' path parameter (API Gateway uses {user_id})
    author_id = path_parameters.get('user_id')
    
    print(f"📍 Path parameters: {path_parameters}")
    print(f"📍 Author ID from path: {author_id}")
    
    # GET /author/{user_id}/reviews doesn't require authentication (public endpoint)
    if event.get('path', '').endswith('/reviews') and http_method == 'GET':
        print("ℹ️ Public endpoint: /reviews - no auth required")
        return get_all_reviews(author_id)
    
    # All other endpoints require authentication
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    cognito_sub = claims.get('sub')
    
    print(f"🔐 Cognito sub: {cognito_sub}")
    print(f"🔐 Full claims: {claims}")
    
    if not cognito_sub:
        print("❌ No Cognito claims found")
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Unauthorized - Authentication required'})
        }
    
    if not author_id:
        print("❌ No author_id in path")
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Missing author_id in path'})
        }
    
    connection = None
    
    try:
        connection = get_db_connection()
        
        # Get user_id from cognito_sub
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT user_id, username, display_name, profile_image, role FROM users WHERE cognito_sub = %s",
                (cognito_sub,)
            )
            user = cursor.fetchone()
            
            if not user:
                print(f"❌ User not found for cognito_sub: {cognito_sub}")
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'User not found'})
                }
            
            user_id = user['user_id']
            user_role = user['role']
            print(f"✅ Found user: user_id={user_id}, role={user_role}")
        
        # Check if author exists
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT a.author_id, a.name, a.user_id as author_user_id
                FROM authors a
                WHERE a.author_id = %s
                """,
                (author_id,)
            )
            author = cursor.fetchone()
            
            if not author:
                print(f"❌ Author not found: author_id={author_id}")
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Author not found'})
                }
            
            print(f"✅ Found author: {author['name']}, author_user_id={author['author_user_id']}")
        
        # Prevent users from reviewing themselves
        if author['author_user_id'] and author['author_user_id'] == user_id:
            print(f"❌ User {user_id} trying to review themselves")
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'You cannot review yourself'})
            }
        
        # Prevent admins from reviewing
        if user_role == 'admin':
            print(f"❌ Admin user {user_id} trying to review author")
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Admins cannot review authors'})
            }
        
        if http_method == 'POST':
            return create_review(connection, user_id, user, author_id, event)
        elif http_method == 'GET':
            return get_user_review(connection, user_id, author_id)
        elif http_method == 'PUT':
            return update_review(connection, user_id, author_id, event)
        elif http_method == 'DELETE':
            return delete_review(connection, user_id, author_id)
        else:
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Method not allowed'})
            }
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': f'Internal server error: {str(e)}'})
        }
    
    finally:
        if connection:
            connection.close()

def create_review(connection, user_id, user, author_id, event):
    """Create a review for an author"""
    
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Invalid JSON in request body'})
        }
    
    review_text = body.get('review_text', '').strip()
    
    if not review_text or len(review_text) < 10:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Review must be at least 10 characters long'})
        }
    
    if len(review_text) > 5000:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Review must not exceed 5000 characters'})
        }
    
    try:
        with connection.cursor() as cursor:
            # Check if user already reviewed this author
            cursor.execute(
                """
                SELECT author_review_id 
                FROM author_reviews 
                WHERE user_id = %s AND author_id = %s
                """,
                (user_id, author_id)
            )
            existing_review = cursor.fetchone()
            
            if existing_review:
                return {
                    'statusCode': 409,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': 'You have already reviewed this author. Use PUT to update your review.'
                    })
                }
            
            # Insert new review
            cursor.execute(
                """
                INSERT INTO author_reviews (review_text, user_id, author_id)
                VALUES (%s, %s, %s)
                """,
                (review_text, user_id, author_id)
            )
            
            review_id = cursor.lastrowid
            connection.commit()
            
            display_name = user['display_name'] or user['username']
            print(f"✅ Created review: user_id={user_id}, author_id={author_id}, review_id={review_id}")
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Review submitted successfully',
                    'review': {
                        'author_review_id': review_id,
                        'user_id': user_id,
                        'username': display_name,
                        'avatar_url': user['profile_image'],
                        'author_id': int(author_id),
                        'review_text': review_text,
                        'created_at': datetime.now().isoformat()
                    }
                })
            }
    
    except Exception as e:
        connection.rollback()
        raise e

def get_user_review(connection, user_id, author_id):
    """Get user's review for an author"""
    
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 
                ar.author_review_id,
                ar.review_text,
                ar.created_at,
                ar.updated_at,
                u.username,
                u.display_name,
                u.profile_image
            FROM author_reviews ar
            JOIN users u ON ar.user_id = u.user_id
            WHERE ar.user_id = %s AND ar.author_id = %s
            """,
            (user_id, author_id)
        )
        review = cursor.fetchone()
        
        if not review:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'No review found'})
            }
        
        display_name = review['display_name'] or review['username']
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'review': {
                    'author_review_id': review['author_review_id'],
                    'username': display_name,
                    'avatar_url': review['profile_image'],
                    'review_text': review['review_text'],
                    'created_at': review['created_at'].isoformat() if review['created_at'] else None,
                    'updated_at': review['updated_at'].isoformat() if review['updated_at'] else None
                }
            })
        }

def update_review(connection, user_id, author_id, event):
    """Update user's review"""
    
    try:
        body = json.loads(event.get('body', '{}'))
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Invalid JSON in request body'})
        }
    
    review_text = body.get('review_text', '').strip()
    
    if not review_text or len(review_text) < 10:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Review must be at least 10 characters long'})
        }
    
    if len(review_text) > 5000:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Review must not exceed 5000 characters'})
        }
    
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE author_reviews 
                SET review_text = %s
                WHERE user_id = %s AND author_id = %s
                """,
                (review_text, user_id, author_id)
            )
            
            if cursor.rowcount == 0:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'No review found to update'})
                }
            
            connection.commit()
            print(f"✅ Updated review: user_id={user_id}, author_id={author_id}")
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Review updated successfully',
                    'review_text': review_text
                })
            }
    
    except Exception as e:
        connection.rollback()
        raise e

def delete_review(connection, user_id, author_id):
    """Delete user's review"""
    
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM author_reviews
                WHERE user_id = %s AND author_id = %s
                """,
                (user_id, author_id)
            )
            
            if cursor.rowcount == 0:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'No review found to delete'})
                }
            
            connection.commit()
            print(f"✅ Deleted review: user_id={user_id}, author_id={author_id}")
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Review deleted successfully'})
            }
    
    except Exception as e:
        connection.rollback()
        raise e

def get_all_reviews(author_id):
    """Get all reviews for an author (public endpoint - no auth required)"""
    
    connection = None
    
    try:
        connection = get_db_connection()
        
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    ar.author_review_id,
                    ar.review_text,
                    ar.created_at,
                    ar.updated_at,
                    u.user_id,
                    u.username,
                    u.display_name,
                    u.profile_image
                FROM author_reviews ar
                JOIN users u ON ar.user_id = u.user_id
                WHERE ar.author_id = %s
                ORDER BY ar.created_at DESC
                """,
                (author_id,)
            )
            reviews = cursor.fetchall()
            
            formatted_reviews = []
            for review in reviews:
                display_name = review['display_name'] or review['username']
                formatted_reviews.append({
                    'author_review_id': review['author_review_id'],
                    'user_id': review['user_id'],
                    'username': display_name,
                    'avatar_url': review['profile_image'],
                    'review_text': review['review_text'],
                    'created_at': review['created_at'].isoformat() if review['created_at'] else None,
                    'updated_at': review['updated_at'].isoformat() if review['updated_at'] else None
                })
            
            print(f"✅ Retrieved {len(formatted_reviews)} reviews for author_id={author_id}")
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'reviews': formatted_reviews,
                    'total': len(formatted_reviews)
                })
            }
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': f'Internal server error: {str(e)}'})
        }
    
    finally:
        if connection:
            connection.close()
