"""
Lambda Function: Favorite/Unfavorite Genre
Endpoint: POST /genres/{genre_id}/favorite
Purpose: Toggle favorite status for a genre
Runtime: Python 3.14
"""

import json
import pymysql
import os
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


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for favoriting/unfavoriting genres
    """
    print(f"Event: {json.dumps(event)}")
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,DELETE,OPTIONS',
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
        # Get user from JWT token
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        jwt_claims = authorizer.get('jwt', {}).get('claims', {}) or authorizer.get('claims', {})
        cognito_sub = jwt_claims.get('sub')
        
        if not cognito_sub:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized - No valid token'})
            }
        
        # Get genre_id from path parameters
        path_params = event.get('pathParameters', {})
        genre_id = path_params.get('genre_id')
        
        if not genre_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Genre ID is required'})
            }
        
        # Parse request body to determine action
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'favorite')  # 'favorite' or 'unfavorite'
        
        if action not in ['favorite', 'unfavorite']:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid action. Must be "favorite" or "unfavorite"'})
            }
        
        # Create database connection
        connection = get_db_connection()
        
        with connection.cursor() as cursor:
            # Get user_id from cognito_sub
            cursor.execute(
                "SELECT user_id FROM users WHERE cognito_sub = %s",
                (cognito_sub,)
            )
            user_result = cursor.fetchone()
            
            if not user_result:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'error': 'User not found'})
                }
            
            user_id = user_result['user_id']
            
            # Verify genre exists
            cursor.execute(
                "SELECT genre_id, genre_name FROM genres WHERE genre_id = %s",
                (genre_id,)
            )
            genre_result = cursor.fetchone()
            
            if not genre_result:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'error': 'Genre not found'})
                }
            
            genre_name = genre_result['genre_name']
            
            if action == 'favorite':
                # Add to favorites (ignore if already exists)
                cursor.execute(
                    """
                    INSERT IGNORE INTO user_favorite_genres (user_id, genre_id)
                    VALUES (%s, %s)
                    """,
                    (user_id, genre_id)
                )
                message = f'Added {genre_name} to favorites'
                is_favorited = True
            else:
                # Remove from favorites
                cursor.execute(
                    "DELETE FROM user_favorite_genres WHERE user_id = %s AND genre_id = %s",
                    (user_id, genre_id)
                )
                message = f'Removed {genre_name} from favorites'
                is_favorited = False
            
            connection.commit()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': message,
                'genre': {
                    'genre_id': int(genre_id),
                    'genre_name': genre_name,
                    'is_favorited': is_favorited
                }
            })
        }
    
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    
    except Exception as e:
        print(f"Error toggling favorite genre: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to toggle favorite genre',
                'details': str(e)
            })
        }
    
    finally:
        if connection:
            connection.close()
