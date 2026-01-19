import json
import pymysql
import os
from datetime import datetime

def lambda_handler(event, context):
    """
    Get list of users that follow a specific user (followers)
    GET /users/{user_id}/followers
    """
    
    # Enable CORS
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        print(f"DEBUG: Incoming event: {json.dumps(event)}")
        
        # Get user_id from path parameters
        user_id = event.get('pathParameters', {}).get('user_id')
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'user_id is required'})
            }
        
        # Convert to integer
        try:
            user_id = int(user_id)
        except ValueError:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Invalid user_id format'})
            }
        
        print(f"🔍 Getting followers for user {user_id}")
        
        # Connect to database
        connection = pymysql.connect(
            host=os.environ['DB_HOST'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            database=os.environ['DB_NAME'],
            cursorclass=pymysql.cursors.DictCursor
        )
        
        try:
            with connection.cursor() as cursor:
                # Check if user exists
                cursor.execute(
                    "SELECT user_id FROM users WHERE user_id = %s",
                    (user_id,)
                )
                
                if not cursor.fetchone():
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'message': 'User not found'})
                    }
                
                # UPDATED: Get users that follow this user (followers) + include role + use display_name
                query = """
                SELECT 
                    u.user_id as id,
                    COALESCE(u.display_name, u.username) as username,
                    u.role,
                    COALESCE(u.profile_image, '') as avatarUrl,
                    COALESCE(u.bio, '') as bio,
                    u.is_public,
                    f.followed_at as followedAt,
                    (SELECT COUNT(*) FROM reviews r WHERE r.user_id = u.user_id) as totalReviews,
                    (SELECT COUNT(DISTINCT urs.book_id) 
                     FROM user_reading_status urs 
                     WHERE urs.user_id = u.user_id AND urs.status = 'completed') as booksRead
                FROM user_follow_user f
                INNER JOIN users u ON f.follower_id = u.user_id
                WHERE f.following_id = %s
                ORDER BY f.followed_at DESC
                """
                
                print(f"Executing query for followers of user {user_id}")
                cursor.execute(query, (user_id,))
                followers = cursor.fetchall()
                
                print(f"Found {len(followers)} followers")
                
                # Format the response
                formatted_followers = []
                for user in followers:
                    formatted_followers.append({
                        'id': int(user['id']),
                        'username': str(user['username']),
                        'role': str(user['role']),
                        'avatarUrl': str(user['avatarUrl']),
                        'bio': str(user['bio']),
                        'isPrivate': not bool(user['is_public']),
                        'followedAt': user['followedAt'].isoformat() if user['followedAt'] else '',
                        'stats': {
                            'totalReviews': int(user['totalReviews'] or 0),
                            'booksRead': int(user['booksRead'] or 0)
                        }
                    })
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'followers': formatted_followers,
                        'total': len(formatted_followers)
                    })
                }
                
        finally:
            connection.close()
            print("Database connection closed")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
