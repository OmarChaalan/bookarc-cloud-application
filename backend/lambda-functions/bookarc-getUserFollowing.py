import json
import pymysql
import os
from datetime import datetime

def lambda_handler(event, context):
    """
    Get list of users AND authors that a specific user is following
    GET /users/{user_id}/following
    PUBLIC ACCESS - No authentication required
    UPDATED: Now returns both users AND authors
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
        print(f"🔍 DEBUG: Incoming event: {json.dumps(event)}")
        
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
        
        print(f"🔍 Getting users AND authors that user {user_id} is following")
        
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
                
                # QUERY 1: Get USERS that this user is following
                user_query = """
                SELECT 
                    u.user_id as id,
                    COALESCE(u.display_name, u.username) as username,
                    u.role,
                    COALESCE(u.profile_image, '') as avatarUrl,
                    COALESCE(u.bio, '') as bio,
                    u.is_public,
                    f.followed_at as followedAt,
                    'user' as type,
                    (SELECT COUNT(*) FROM reviews r WHERE r.user_id = u.user_id) as totalReviews,
                    (SELECT COUNT(DISTINCT urs.book_id) 
                     FROM user_reading_status urs 
                     WHERE urs.user_id = u.user_id AND urs.status = 'completed') as booksRead
                FROM user_follow_user f
                INNER JOIN users u ON f.following_id = u.user_id
                WHERE f.follower_id = %s
                """
                
                print(f"🔍 Executing query for user {user_id}'s following (USERS)")
                cursor.execute(user_query, (user_id,))
                following_users = cursor.fetchall()
                print(f"Found {len(following_users)} USERS that user {user_id} is following")
                
                # QUERY 2: Get AUTHORS that this user is following
                author_query = """
                SELECT 
                    a.author_id,
                    a.name as username,
                    a.user_id as linked_user_id,
                    a.is_registered_author,
                    COALESCE(a.bio, '') as bio,
                    a.verified,
                    ufa.followed_at as followedAt,
                    'author' as type,
                    -- For registered authors, get their user info
                    CASE 
                        WHEN a.is_registered_author = 1 THEN COALESCE(u.profile_image, '')
                        ELSE ''
                    END as avatarUrl,
                    CASE 
                        WHEN a.is_registered_author = 1 THEN u.is_public
                        ELSE 1
                    END as is_public,
                    -- Get author stats
                    (SELECT COUNT(DISTINCT ba.book_id) 
                     FROM book_author ba 
                     WHERE ba.author_id = a.author_id) as totalBooks,
                    (SELECT COUNT(*) 
                     FROM author_reviews ar 
                     WHERE ar.author_id = a.author_id) as totalReviews
                FROM user_follow_author ufa
                INNER JOIN authors a ON ufa.author_id = a.author_id
                LEFT JOIN users u ON a.user_id = u.user_id AND a.is_registered_author = 1
                WHERE ufa.user_id = %s
                """
                
                print(f"Executing query for user {user_id}'s following (AUTHORS)")
                cursor.execute(author_query, (user_id,))
                following_authors = cursor.fetchall()
                print(f"Found {len(following_authors)} AUTHORS that user {user_id} is following")
                
                # Format the response - USERS
                formatted_following = []
                
                for user in following_users:
                    formatted_following.append({
                        'id': int(user['id']),
                        'username': str(user['username']),
                        'role': str(user['role']),
                        'avatarUrl': str(user['avatarUrl']),
                        'bio': str(user['bio']),
                        'isPrivate': not bool(user['is_public']),
                        'followedAt': user['followedAt'].isoformat() if user['followedAt'] else '',
                        'type': 'user',  # 
                        'stats': {
                            'totalReviews': int(user['totalReviews'] or 0),
                            'booksRead': int(user['booksRead'] or 0)
                        }
                    })
                
                # Format the response - AUTHORS
                for author in following_authors:
                    formatted_following.append({
                        'id': int(author['linked_user_id']) if author['linked_user_id'] else int(author['author_id']),
                        'authorId': int(author['author_id']), 
                        'username': str(author['username']),
                        'role': 'author',  
                        'avatarUrl': str(author['avatarUrl']),
                        'bio': str(author['bio']),
                        'isPrivate': not bool(author['is_public']),
                        'followedAt': author['followedAt'].isoformat() if author['followedAt'] else '',
                        'type': 'author', 
                        'authorType': 'registered' if author['is_registered_author'] else 'external',
                        'verified': bool(author['verified']),
                        'stats': {
                            'totalReviews': int(author['totalReviews'] or 0),
                            'booksRead': int(author['totalBooks'] or 0)  # Using totalBooks for authors
                        }
                    })
                
                # Sort by followedAt (most recent first)
                formatted_following.sort(key=lambda x: x['followedAt'], reverse=True)
                
                print(f"Total following (users + authors): {len(formatted_following)}")
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'following': formatted_following,
                        'total': len(formatted_following)
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
