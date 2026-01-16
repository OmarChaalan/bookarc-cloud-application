import json
import pymysql
import os
from datetime import datetime

# RDS Configuration from environment variables
DB_HOST = os.environ['DB_HOST']
DB_USER = os.environ['DB_USER']
DB_PASSWORD = os.environ['DB_PASSWORD']
DB_NAME = os.environ['DB_NAME']

# CORS headers - apply to all responses
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
}

def lambda_handler(event, context):
    """
    Lambda function to get user profile from RDS
    Triggered by API Gateway GET /profile
    """
    
    print(f"Event: {json.dumps(event)}")
    
    # Handle OPTIONS request for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'OK'})
        }
    
    # Get Cognito sub from JWT token (added by API Gateway Cognito Authorizer)
    try:
        cognito_sub = event['requestContext']['authorizer']['claims']['sub']
        print(f"Cognito sub: {cognito_sub}")
    except KeyError as e:
        print(f"Authorization error: {str(e)}")
        return {
            'statusCode': 401,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Unauthorized'})
        }
    
    connection = None
    
    try:
        # Connect to RDS
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            connect_timeout=5
        )
        
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            # Query user from RDS using cognito_sub
            sql = """
                SELECT user_id, cognito_sub, email, username, display_name, 
                       bio, location, profile_image, is_public, role, created_at, updated_at 
                FROM users 
                WHERE cognito_sub = %s
            """
            cursor.execute(sql, (cognito_sub,))
            result = cursor.fetchone()
            
            if not result:
                print(f"User not found for cognito_sub: {cognito_sub}")
                return {
                    'statusCode': 404,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'message': 'User not found'})
                }
            
            # Convert datetime objects to strings
            if result.get('created_at'):
                result['created_at'] = result['created_at'].isoformat()
            if result.get('updated_at'):
                result['updated_at'] = result['updated_at'].isoformat()
            
            # Debug logs
            print(f"User found: {result['user_id']}")
            print(f"Email: {result.get('email')}")
            print(f"Role: {result.get('role')}")  # Log the role
            print(f"Location: {result.get('location')}")
            
            # Build response with explicit field mapping for clarity
            response_data = {
                'user_id': result['user_id'],
                'cognito_sub': result['cognito_sub'],
                'email': result['email'],
                'username': result['username'],
                'display_name': result.get('display_name'),
                'bio': result.get('bio'),
                'location': result.get('location'),
                'profile_image': result.get('profile_image'),
                'is_public': result.get('is_public', True),
                'role': result.get('role', 'normal'),  # Default to 'normal' if not set
                'created_at': result.get('created_at'),
                'updated_at': result.get('updated_at')
            }
            
            print(f"Response data: {json.dumps(response_data)}")
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps(response_data)
            }
    
    except pymysql.MySQLError as e:
        print(f"Database error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
    
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
    
    finally:
        if connection:
            connection.close()
