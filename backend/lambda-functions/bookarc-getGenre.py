import json
import pymysql
import os
import base64
from typing import Dict, Any

# Database configuration from environment variables
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')


def get_db_connection():
    """Create and return a database connection"""
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )


def decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without verification (we trust API Gateway did this)"""
    try:
        # JWT format: header.payload.signature
        parts = token.split('.')
        if len(parts) != 3:
            return {}
        
        # Decode the payload (second part)
        payload = parts[1]
        # Add padding if needed
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += '=' * padding
        
        decoded = base64.urlsafe_b64decode(payload)
        return json.loads(decoded)
    except Exception as e:
        print(f"Error decoding JWT: {e}")
        return {}


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for getting all genres
    """
    print(f"Event: {json.dumps(event)}")
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle OPTIONS preflight
    http_method = event.get('requestContext', {}).get('http', {}).get('method') or event.get('httpMethod')
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    connection = None
    
    try:
        # Try to get user from authorizer first
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        jwt_claims = authorizer.get('jwt', {}).get('claims', {}) or authorizer.get('claims', {})
        cognito_sub = jwt_claims.get('sub')
        
        # If authorizer didn't provide it, try to parse the JWT directly
        if not cognito_sub:
            auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.replace('Bearer ', '')
                jwt_payload = decode_jwt_payload(token)
                cognito_sub = jwt_payload.get('sub')
                print(f"Decoded JWT manually, sub: {cognito_sub}")
        
        print(f"Cognito sub: {cognito_sub}")
        
        user_id = None
        
        # If user is logged in, get their user_id
        if cognito_sub:
            connection = get_db_connection()
            
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT user_id FROM users WHERE cognito_sub = %s",
                    (cognito_sub,)
                )
                user_result = cursor.fetchone()
                
                if user_result:
                    user_id = user_result['user_id']
                    print(f"User found: user_id={user_id}")
                else:
                    print(f"No user found for cognito_sub: {cognito_sub}")
        
        # Reopen connection if needed
        if not connection:
            connection = get_db_connection()
        
        with connection.cursor() as cursor:
            # First, let's check what's in user_favorite_genres for this user
            if user_id:
                cursor.execute(
                    "SELECT genre_id FROM user_favorite_genres WHERE user_id = %s",
                    (user_id,)
                )
                favorite_genre_ids = [row['genre_id'] for row in cursor.fetchall()]
                print(f"User's favorite genre IDs: {favorite_genre_ids}")
            
            # Get all genres with book counts
            if user_id:
                # Include user's favorite status
                query = """
                    SELECT 
                        g.genre_id,
                        g.genre_name,
                        COUNT(DISTINCT bg.book_id) as book_count,
                        EXISTS(
                            SELECT 1 FROM user_favorite_genres ufg 
                            WHERE ufg.genre_id = g.genre_id 
                            AND ufg.user_id = %s
                        ) as is_favorited
                    FROM genres g
                    LEFT JOIN book_genre bg ON g.genre_id = bg.genre_id
                    GROUP BY g.genre_id, g.genre_name
                    ORDER BY book_count DESC, g.genre_name ASC
                """
                cursor.execute(query, (user_id,))
            else:
                # No user logged in - just return genres without favorite status
                query = """
                    SELECT 
                        g.genre_id,
                        g.genre_name,
                        COUNT(DISTINCT bg.book_id) as book_count,
                        FALSE as is_favorited
                    FROM genres g
                    LEFT JOIN book_genre bg ON g.genre_id = bg.genre_id
                    GROUP BY g.genre_id, g.genre_name
                    ORDER BY book_count DESC, g.genre_name ASC
                """
                cursor.execute(query)
            
            genres = cursor.fetchall()
            
            print(f"Total genres retrieved: {len(genres)}")
            
            # Convert is_favorited to boolean (MySQL returns 0/1)
            favorited_count = 0
            for genre in genres:
                original_value = genre['is_favorited']
                genre['is_favorited'] = bool(genre['is_favorited'])
                if genre['is_favorited']:
                    favorited_count += 1
                    print(f"⭐ Favorited genre: {genre['genre_name']} (id={genre['genre_id']}, original_value={original_value})")
            
            print(f"Total favorited genres: {favorited_count}")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'genres': genres,
                'total': len(genres),
                'user_logged_in': user_id is not None
            })
        }
    
    except Exception as e:
        print(f"Error getting genres: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to retrieve genres',
                'details': str(e)
            })
        }
    
    finally:
        if connection:
            connection.close()
