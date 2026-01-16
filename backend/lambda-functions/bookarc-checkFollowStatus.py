import json
import pymysql
import os

# RDS Configuration - UPDATED variable names
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

def get_db_connection():
    """Create database connection with error handling"""
    try:
        print(f"Attempting DB connection to {DB_HOST}")
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            connect_timeout=5,
            cursorclass=pymysql.cursors.DictCursor
        )
        print("Database connection successful")
        return connection
    except Exception as e:
        print(f"Database connection failed: {str(e)}")
        raise

def lambda_handler(event, context):
    """
    Check if current user is following a specific user
    GET /users/{user_id}/follower-status
    """
    
    # CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle OPTIONS request for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'CORS preflight'})
        }
    
    # Validate environment variables
    if not all([DB_HOST, DB_USER, DB_PASSWORD, DB_NAME]):
        print("Missing database environment variables")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Configuration error',
                'message': 'Database configuration is incomplete'
            })
        }
    
    try:
        # Debug: Print the entire event
        print(f"🔍 DEBUG: Incoming event: {json.dumps(event)}")
        
        # Get authenticated user from authorizer
        follower_cognito_sub = None
        
        try:
            request_context = event.get('requestContext', {})
            authorizer = request_context.get('authorizer', {})
            
            print(f"🔍 DEBUG: Full request context keys: {list(request_context.keys())}")
            print(f"🔍 DEBUG: Authorizer keys: {list(authorizer.keys())}")
            
            # Try multiple possible locations for the user identity
            if 'claims' in authorizer and 'sub' in authorizer['claims']:
                follower_cognito_sub = authorizer['claims']['sub']
                print(f"Found user in claims: {follower_cognito_sub}")
            elif 'jwt' in authorizer and 'claims' in authorizer['jwt'] and 'sub' in authorizer['jwt']['claims']:
                follower_cognito_sub = authorizer['jwt']['claims']['sub']
                print(f"Found user in JWT: {follower_cognito_sub}")
            elif 'sub' in authorizer:
                follower_cognito_sub = authorizer['sub']
                print(f"Found user in authorizer.sub: {follower_cognito_sub}")
            elif 'identity' in request_context and 'cognitoAuthenticationProvider' in request_context['identity']:
                auth_provider = request_context['identity']['cognitoAuthenticationProvider']
                if ':CognitoSignIn:' in auth_provider:
                    follower_cognito_sub = auth_provider.split(':CognitoSignIn:')[-1]
                    print(f"Found user in cognitoAuthenticationProvider: {follower_cognito_sub}")
            
            if not follower_cognito_sub:
                print(f"Could not find sub in any expected location")
                print(f"Available authorizer keys: {list(authorizer.keys())}")
                if authorizer:
                    print(f"Authorizer content sample: {str(authorizer)[:200]}")
                raise KeyError("Could not find user sub in authorizer")
                
        except Exception as e:
            print(f"Error extracting user from authorizer: {str(e)}")
            return {
                'statusCode': 401,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Unauthorized',
                    'message': 'Could not identify authenticated user',
                    'details': str(e)
                })
            }
        
        # Get target user ID from path
        path_params = event.get('pathParameters', {})
        if not path_params or 'user_id' not in path_params:
            print("Missing user_id in path parameters")
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Bad Request',
                    'message': 'Missing user_id in path'
                })
            }
        
        following_id = path_params['user_id']
        
        print(f"Checking if {follower_cognito_sub} is following user {following_id}")
        
        conn = get_db_connection()
        
        try:
            with conn.cursor() as cursor:
                # Get follower's database user_id
                print(f"Looking up user with cognito_sub: {follower_cognito_sub}")
                cursor.execute(
                    "SELECT user_id FROM users WHERE cognito_sub = %s",
                    (follower_cognito_sub,)
                )
                follower_result = cursor.fetchone()
                
                if not follower_result:
                    print(f"Follower not found for cognito_sub: {follower_cognito_sub}")
                    return {
                        'statusCode': 404,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'error': 'User not found',
                            'message': 'Your user account was not found'
                        })
                    }
                
                follower_db_id = follower_result['user_id']
                print(f"Follower DB ID: {follower_db_id}")
                
                # Check if follow relationship exists
                print(f"Checking follow relationship: {follower_db_id} -> {following_id}")
                cursor.execute(
                    """
                    SELECT * FROM user_follow_user 
                    WHERE follower_id = %s AND following_id = %s
                    """,
                    (follower_db_id, following_id)
                )
                
                follow_relationship = cursor.fetchone()
                is_following = follow_relationship is not None
                
                print(f"Follow status: {is_following}")
                
                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': json.dumps({
                        'isFollowing': is_following,
                        'followerId': follower_db_id,
                        'followingId': int(following_id)
                    })
                }
        
        finally:
            conn.close()
            print("Database connection closed")
    
    except pymysql.Error as e:
        print(f"Database error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Database error',
                'message': 'Failed to query database'
            })
        }
    
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        print(traceback.format_exc())
        
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
