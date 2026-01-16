"""
Lambda Function: Toggle List Visibility
Endpoint: PATCH /lists/{listId}/visibility
Purpose: Toggle visibility of a list (public/private)
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
    Main Lambda handler for toggling list visibility
    """
    print(f"Event: {json.dumps(event)}")
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
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
        
        # Get list_id from path parameters
        path_params = event.get('pathParameters', {})
        list_id = path_params.get('list_id')  # API Gateway sends snake_case
        
        if not list_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'List ID is required'})
            }
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        visibility = body.get('visibility')
        
        if not visibility or visibility not in ['public', 'private']:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Valid visibility value is required (public or private)'})
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
            
            # Verify the list belongs to the user
            cursor.execute(
                "SELECT list_id, name FROM lists WHERE list_id = %s AND user_id = %s",
                (list_id, user_id)
            )
            list_result = cursor.fetchone()
            
            if not list_result:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'error': 'List not found or you do not have permission to modify it'})
                }
            
            list_name = list_result['name']
            
            # Update list visibility
            cursor.execute(
                "UPDATE lists SET visibility = %s WHERE list_id = %s AND user_id = %s",
                (visibility, list_id, user_id)
            )
            connection.commit()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': f'List visibility updated to {visibility}',
                'list': {
                    'id': int(list_id),
                    'name': list_name,
                    'visibility': visibility
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
        print(f"Error toggling list visibility: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to toggle list visibility',
                'details': str(e)
            })
        }
    
    finally:
        if connection:
            connection.close()
