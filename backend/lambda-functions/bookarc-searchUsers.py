import json
import pymysql
import os
from decimal import Decimal

# Database Configuration
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

def decimal_default(obj):
    """Helper to serialize Decimal objects"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def get_db_connection():
    """Create and return database connection"""
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def lambda_handler(event, context):
    """
    Search for users by display name only (excludes authors)
    GET /users/search?q={query}&limit={limit}&include_private={true/false}
    ✅ PUBLIC ACCESS - No authentication required
    """
    
    # CORS headers
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
    
    print(f"DEBUG: Incoming event: {json.dumps(event)}")
    
    try:
        # Extract query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        search_query = query_params.get('q', '').strip()
        limit = int(query_params.get('limit', 20))
        include_private = query_params.get('include_private', 'false').lower() == 'true'
        
        print(f"Search query: '{search_query}', Limit: {limit}, Include private: {include_private}")
        
        # Validation
        if not search_query:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Search query is required',
                    'message': 'Please provide a search query using the "q" parameter'
                })
            }
        
        if len(search_query) < 2:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Search query too short',
                    'message': 'Search query must be at least 2 characters long'
                })
            }
        
        # Limit validation (1-50)
        limit = max(1, min(limit, 50))
        
        # Connect to database
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                search_pattern = f"%{search_query}%"
                
                # Base query - searches display_name only
                # EXCLUDES users with role='author' to separate them
                base_query = """
                    SELECT 
                        u.user_id as id,
                        u.username,
                        COALESCE(u.display_name, u.username) as displayName,
                        u.email,
                        u.role,
                        COALESCE(u.profile_image, '') as avatarUrl,
                        COALESCE(u.bio, '') as bio,
                        COALESCE(u.location, '') as location,
                        u.is_public as isPublic,
                        u.created_at as joinDate,
                        (SELECT COUNT(*) FROM reviews r WHERE r.user_id = u.user_id) as totalReviews,
                        (SELECT COUNT(*) FROM ratings rat WHERE rat.user_id = u.user_id) as totalRatings,
                        (SELECT COUNT(DISTINCT urs.book_id) FROM user_reading_status urs 
                         WHERE urs.user_id = u.user_id AND urs.status = 'completed') as booksRead,
                        (SELECT COUNT(*) FROM user_follow_user ufu WHERE ufu.following_id = u.user_id) as followers,
                        (SELECT COUNT(*) FROM user_follow_user ufu WHERE ufu.follower_id = u.user_id) as following
                    FROM users u
                    WHERE u.display_name LIKE %s
                    AND u.role != 'author'
                    AND u.is_active = 1
                """
                
                params = [search_pattern]
                
                # Add privacy filter if needed
                if not include_private:
                    base_query += " AND u.is_public = TRUE"
                
                # Add ordering and limit
                base_query += """
                    ORDER BY 
                        CASE 
                            WHEN u.display_name LIKE %s THEN 1
                            ELSE 2
                        END,
                        u.display_name
                    LIMIT %s
                """
                
                exact_pattern = f"{search_query}%"
                params.extend([exact_pattern, limit])
                
                # Execute query
                cursor.execute(base_query, params)
                users = cursor.fetchall()
                
                print(f"Found {len(users)} users (excluding authors, display_name only)")
                
                # Format results
                formatted_users = []
                for user in users:
                    formatted_user = {
                        'id': int(user['id']),
                        'username': str(user['username']),
                        'displayName': str(user['displayName']),
                        'email': str(user['email']),
                        'role': str(user['role']),
                        'avatarUrl': str(user['avatarUrl']),
                        'bio': str(user['bio']),
                        'location': str(user['location']),
                        'isPrivate': not bool(user['isPublic']),
                        'joinDate': user['joinDate'].strftime('%B %Y') if user['joinDate'] else '',
                        'stats': {
                            'totalReviews': int(user['totalReviews'] or 0),
                            'totalRatings': int(user['totalRatings'] or 0),
                            'booksRead': int(user['booksRead'] or 0),
                            'followers': int(user['followers'] or 0),
                            'following': int(user['following'] or 0)
                        }
                    }
                    
                    formatted_users.append(formatted_user)
                
                response_body = {
                    'users': formatted_users,
                    'total': len(formatted_users),
                    'query': search_query
                }
                
                print(f"Returning {len(formatted_users)} users")
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps(response_body, default=decimal_default)
                }
                
        finally:
            connection.close()
            
    except ValueError as e:
        print(f"ValueError: {str(e)}")
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'error': 'Invalid parameter',
                'message': str(e)
            })
        }
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
