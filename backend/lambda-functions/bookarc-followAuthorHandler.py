import json
import os
import pymysql
from datetime import datetime
from decimal import Decimal

# Database configuration
db_config = {
    'host': os.environ['DB_HOST'],
    'user': os.environ['DB_USER'],
    'password': os.environ['DB_PASSWORD'],
    'database': os.environ['DB_NAME'],
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def get_db_connection():
    return pymysql.connect(**db_config)

def get_user_from_token(event):
    """Extract user_id from Cognito JWT token"""
    try:
        cognito_sub = event['requestContext']['authorizer']['claims']['sub']
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT user_id, role FROM users WHERE cognito_sub = %s AND is_active = 1
                """, (cognito_sub,))
                return cursor.fetchone()
        finally:
            conn.close()
    except Exception as e:
        print(f"Error getting user from token: {str(e)}")
        return None

def extract_author_id(event):
    """Extract and convert author_id or user_id from path"""
    path_params = event.get('pathParameters', {})
    
    # Try author_id first
    if 'author_id' in path_params:
        try:
            return int(path_params['author_id'])
        except (ValueError, TypeError):
            pass
    
    # Try user_id and convert to author_id
    if 'user_id' in path_params:
        try:
            user_id = int(path_params['user_id'])
            conn = get_db_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT author_id FROM authors 
                        WHERE user_id = %s AND is_registered_author = 1
                    """, (user_id,))
                    result = cursor.fetchone()
                    if result:
                        return result['author_id']
            finally:
                conn.close()
        except Exception as e:
            print(f"Error converting user_id to author_id: {str(e)}")
    
    # Fallback: parse from path
    try:
        path_parts = [p for p in event['path'].split('/') if p]
        
        if 'authors' in path_parts:
            idx = path_parts.index('authors')
            if idx + 1 < len(path_parts) and path_parts[idx + 1].isdigit():
                return int(path_parts[idx + 1])
        elif 'author' in path_parts:
            idx = path_parts.index('author')
            if idx + 1 < len(path_parts) and path_parts[idx + 1].isdigit():
                user_id = int(path_parts[idx + 1])
                conn = get_db_connection()
                try:
                    with conn.cursor() as cursor:
                        cursor.execute("""
                            SELECT author_id FROM authors 
                            WHERE user_id = %s AND is_registered_author = 1
                        """, (user_id,))
                        result = cursor.fetchone()
                        if result:
                            return result['author_id']
                finally:
                    conn.close()
    except Exception as e:
        print(f"Error parsing from path: {str(e)}")
    
    return None

def lambda_handler(event, context):
    """Handle author follow/unfollow operations"""
    
    print(f"Event: {json.dumps(event)}")
    
    http_method = event['httpMethod']
    path = event['path']
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }
    
    if http_method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'message': 'OK'})}
    
    try:
        author_id = extract_author_id(event)
        print(f"Final author_id: {author_id}, Path: {path}, Method: {http_method}")
        
        # Route to handlers
        if path.endswith('/follow') and http_method == 'POST':
            return handle_follow_unfollow(event, author_id, headers)
        elif path.endswith('/follow-status') and http_method == 'GET':
            return handle_follow_status(event, author_id, headers)
        elif path.endswith('/followers') and http_method == 'GET':
            return handle_get_followers(author_id, headers)
        elif path == '/author/following' or path.endswith('/author/following'):
            return handle_get_following(event, headers)
        else:
            return {'statusCode': 404, 'headers': headers,
                   'body': json.dumps({'message': 'Endpoint not found', 'path': path, 'method': http_method})}
            
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'statusCode': 500, 'headers': headers,
               'body': json.dumps({'message': f'Internal server error: {str(e)}'})}

def handle_follow_unfollow(event, author_id, headers):
    """Handle follow/unfollow action"""
    
    print(f"Starting follow/unfollow for author_id: {author_id}")
    
    if not author_id:
        return {'statusCode': 400, 'headers': headers,
               'body': json.dumps({'message': 'Author ID is required',
                   'debug': {'path': event.get('path'), 'pathParameters': event.get('pathParameters')}})}
    
    user = get_user_from_token(event)
    if not user:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'message': 'Unauthorized'})}
    
    if user['role'] == 'admin':
        return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'message': 'Admins cannot follow authors'})}
    
    user_id = user['user_id']
    print(f"Authenticated user: user_id={user_id}, role={user['role']}")
    
    try:
        body = json.loads(event['body'])
        action = body.get('action')
        print(f"Action: {action}")
    except:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'message': 'Invalid request body'})}
    
    if action not in ['follow', 'unfollow']:
        return {'statusCode': 400, 'headers': headers,
               'body': json.dumps({'message': 'Invalid action. Must be "follow" or "unfollow"'})}
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT author_id, name, is_registered_author, user_id, average_rating
                FROM authors WHERE author_id = %s
            """, (author_id,))
            
            author = cursor.fetchone()
            
            if not author:
                return {'statusCode': 404, 'headers': headers,
                       'body': json.dumps({'message': 'Author not found', 'author_id': author_id})}
            
            print(f"Found author: {author['name']} (author_id={author['author_id']}, is_registered={author['is_registered_author']})")
            
            if author['is_registered_author'] and author['user_id'] == user_id:
                return {'statusCode': 403, 'headers': headers,
                       'body': json.dumps({'message': 'You cannot follow yourself'})}
            
            if action == 'follow':
                cursor.execute("""
                    SELECT * FROM user_follow_author WHERE user_id = %s AND author_id = %s
                """, (user_id, author_id))
                
                if cursor.fetchone():
                    return {'statusCode': 400, 'headers': headers,
                           'body': json.dumps({'message': f'Already following {author["name"]}'})}
                
                cursor.execute("""
                    INSERT INTO user_follow_author (user_id, author_id, followed_at)
                    VALUES (%s, %s, NOW())
                """, (user_id, author_id))
                
                conn.commit()
                print(f"Follow inserted! Rows affected: {cursor.rowcount}")
                message = f'Successfully followed {author["name"]}'
                
            else:  # unfollow
                cursor.execute("""
                    SELECT * FROM user_follow_author WHERE user_id = %s AND author_id = %s
                """, (user_id, author_id))
                
                if not cursor.fetchone():
                    return {'statusCode': 400, 'headers': headers,
                           'body': json.dumps({'message': f'Not following {author["name"]}'})}
                
                cursor.execute("""
                    DELETE FROM user_follow_author WHERE user_id = %s AND author_id = %s
                """, (user_id, author_id))
                
                conn.commit()
                print(f"Unfollow deleted! Rows affected: {cursor.rowcount}")
                message = f'Successfully unfollowed {author["name"]}'
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': message,
                'userId': user_id,
                'authorId': author_id,
                'authorType': 'registered' if author['is_registered_author'] else 'external',
                'action': action
            }, default=decimal_default)
        }
        
    except Exception as e:
        conn.rollback()
        print(f"Error in handle_follow_unfollow: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'statusCode': 500, 'headers': headers,
               'body': json.dumps({'message': f'Failed to {action} author: {str(e)}'})}
    finally:
        conn.close()

def handle_follow_status(event, author_id, headers):
    """Check if user is following an author"""
    
    if not author_id:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'message': 'Author ID is required'})}
    
    user = get_user_from_token(event)
    
    if not user:
        return {'statusCode': 200, 'headers': headers,
               'body': json.dumps({'isFollowing': False, 'userId': None, 'authorId': author_id})}
    
    user_id = user['user_id']
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT author_id, name FROM authors WHERE author_id = %s", (author_id,))
            
            if not cursor.fetchone():
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'message': 'Author not found'})}
            
            cursor.execute("""
                SELECT * FROM user_follow_author WHERE user_id = %s AND author_id = %s
            """, (user_id, author_id))
            
            is_following = cursor.fetchone() is not None
            
            return {'statusCode': 200, 'headers': headers,
                   'body': json.dumps({'isFollowing': is_following, 'userId': user_id, 'authorId': author_id})}
    finally:
        conn.close()

def handle_get_followers(author_id, headers):
    """Get all followers of an author"""
    
    if not author_id:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'message': 'Author ID is required'})}
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT author_id, name FROM authors WHERE author_id = %s", (author_id,))
            
            if not cursor.fetchone():
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'message': 'Author not found'})}
            
            cursor.execute("""
                SELECT 
                    u.user_id, u.username, u.profile_image as avatar_url, u.bio, ufa.followed_at
                FROM user_follow_author ufa
                JOIN users u ON ufa.user_id = u.user_id
                WHERE ufa.author_id = %s AND u.is_active = 1 AND u.is_public = 1
                ORDER BY ufa.followed_at DESC
            """, (author_id,))
            
            followers = cursor.fetchall()
            
            return {'statusCode': 200, 'headers': headers,
                   'body': json.dumps({'followers': followers, 'total': len(followers)}, default=decimal_default)}
    finally:
        conn.close()

def handle_get_following(event, headers):
    """Get all authors the user is following"""
    
    user = get_user_from_token(event)
    if not user:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'message': 'Unauthorized'})}
    
    user_id = user['user_id']
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    a.author_id, a.name, a.bio, a.verified, a.average_rating,
                    a.is_registered_author, a.user_id, a.external_source_id, ufa.followed_at,
                    COUNT(DISTINCT ba.book_id) as total_books,
                    COUNT(DISTINCT ufa2.user_id) as followers
                FROM user_follow_author ufa
                JOIN authors a ON ufa.author_id = a.author_id
                LEFT JOIN book_author ba ON a.author_id = ba.author_id
                LEFT JOIN user_follow_author ufa2 ON a.author_id = ufa2.author_id
                WHERE ufa.user_id = %s
                GROUP BY a.author_id, a.name, a.bio, a.verified, a.average_rating,
                         a.is_registered_author, a.user_id, a.external_source_id, ufa.followed_at
                ORDER BY ufa.followed_at DESC
            """, (user_id,))
            
            authors = cursor.fetchall()
            
            formatted_authors = [{
                'author_id': author['author_id'],
                'name': author['name'],
                'bio': author['bio'],
                'verified': bool(author['verified']),
                'average_rating': float(author['average_rating']) if author['average_rating'] else 0.0,
                'is_registered_author': bool(author['is_registered_author']),
                'user_id': author['user_id'],
                'external_source_id': author['external_source_id'],
                'followed_at': author['followed_at'].isoformat() if author['followed_at'] else None,
                'stats': {'totalBooks': author['total_books'], 'followers': author['followers']}
            } for author in authors]
            
            return {'statusCode': 200, 'headers': headers,
                   'body': json.dumps({'authors': formatted_authors, 'total': len(formatted_authors)}, default=decimal_default)}
    finally:
        conn.close()
