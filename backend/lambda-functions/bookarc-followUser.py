import json
import pymysql
import os
from datetime import datetime
from notification_service import NotificationService

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
    Follow or unfollow a user
    POST /users/{user_id}/follow
    Body: { "action": "follow" | "unfollow" }
    """
    
    # CORS headers for all responses
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
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
        # Debug: Print the entire event to CloudWatch
        print(f"DEBUG: Incoming event: {json.dumps(event)}")
        
        # Get authenticated user from authorizer - FIXED VERSION
        follower_cognito_sub = None
        
        try:
            request_context = event.get('requestContext', {})
            authorizer = request_context.get('authorizer', {})
            
            print(f"DEBUG: Full request context keys: {list(request_context.keys())}")
            print(f"DEBUG: Authorizer keys: {list(authorizer.keys())}")
            
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
            # Some configurations store it directly in requestContext
            elif 'identity' in request_context and 'cognitoAuthenticationProvider' in request_context['identity']:
                # Extract from Cognito authentication provider string
                auth_provider = request_context['identity']['cognitoAuthenticationProvider']
                # Format: cognito-idp.region.amazonaws.com/userPoolId,cognito-idp.region.amazonaws.com/userPoolId:CognitoSignIn:sub
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
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'follow')
        
        print(f"🔍 Action: {action}, Follower (Cognito): {follower_cognito_sub}, Following: {following_id}")
        
        if action not in ['follow', 'unfollow']:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Invalid action',
                    'message': 'Action must be "follow" or "unfollow"'
                })
            }
        
        conn = get_db_connection()
        
        try:
            with conn.cursor() as cursor:
                # Get follower's database user_id
                print(f"Looking up user with cognito_sub: {follower_cognito_sub}")
                cursor.execute(
                    "SELECT user_id, role FROM users WHERE cognito_sub = %s",
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
                            'message': 'Your user account was not found in the database'
                        })
                    }
                
                follower_db_id = follower_result['user_id']
                follower_role = follower_result['role']
                print(f"Follower DB ID: {follower_db_id}, Role: {follower_role}")
                
                # Only prevent admins from following, allow authors
                if follower_role == 'admin':
                    return {
                        'statusCode': 403,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'error': 'Forbidden',
                            'message': 'Admins cannot follow users'
                        })
                    }
                
                # Validate target user exists and is active
                print(f"🔍 Checking if target user {following_id} exists")
                cursor.execute(
                    "SELECT user_id, username, is_active FROM users WHERE user_id = %s",
                    (following_id,)
                )
                following_result = cursor.fetchone()
                
                if not following_result:
                    print(f"Target user not found: {following_id}")
                    return {
                        'statusCode': 404,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'error': 'User not found',
                            'message': 'The user you are trying to follow does not exist'
                        })
                    }
                
                if not following_result['is_active']:
                    print(f"Target user is not active: {following_id}")
                    return {
                        'statusCode': 404,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'error': 'User not found',
                            'message': 'The user you are trying to follow does not exist'
                        })
                    }
                
                target_username = following_result['username']
                print(f"Target user found: {following_id} ({target_username})")
                
                # Prevent self-follow
                if str(follower_db_id) == str(following_id):
                    return {
                        'statusCode': 400,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'error': 'Invalid action',
                            'message': 'You cannot follow yourself'
                        })
                    }
                
                if action == 'follow':
                    # Check if already following
                    print(f"Checking if already following")
                    cursor.execute(
                        """
                        SELECT * FROM user_follow_user 
                        WHERE follower_id = %s AND following_id = %s
                        """,
                        (follower_db_id, following_id)
                    )
                    
                    if cursor.fetchone():
                        print(f"Already following")
                        return {
                            'statusCode': 400,
                            'headers': cors_headers,
                            'body': json.dumps({
                                'error': 'Already following',
                                'message': f'You are already following {target_username}'
                            })
                        }
                    
                    # Create follow relationship
                    print(f"Creating follow relationship")
                    cursor.execute(
                        """
                        INSERT INTO user_follow_user (follower_id, following_id, followed_at)
                        VALUES (%s, %s, %s)
                        """,
                        (follower_db_id, following_id, datetime.now())
                    )
                    
                    conn.commit()
                    
                    print(f"Successfully followed: {follower_db_id} -> {following_id}")
                    
                    # CREATE NOTIFICATION
                    notif_service = NotificationService(conn)
                    follower_name = notif_service.get_user_display_name(follower_db_id)
                    notif_service.notify_user_new_follower(int(following_id), follower_name)
                    
                    return {
                        'statusCode': 200,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'message': f'Successfully followed {target_username}',
                            'followerId': follower_db_id,
                            'followingId': int(following_id)
                        })
                    }
                
                else:  # unfollow
                    # Delete follow relationship
                    print(f"Removing follow relationship")
                    cursor.execute(
                        """
                        DELETE FROM user_follow_user 
                        WHERE follower_id = %s AND following_id = %s
                        """,
                        (follower_db_id, following_id)
                    )
                    
                    if cursor.rowcount == 0:
                        print(f"Not following this user")
                        return {
                            'statusCode': 400,
                            'headers': cors_headers,
                            'body': json.dumps({
                                'error': 'Not following',
                                'message': f'You are not following {target_username}'
                            })
                        }
                    
                    conn.commit()
                    
                    print(f"Successfully unfollowed: {follower_db_id} -> {following_id}")
                    
                    return {
                        'statusCode': 200,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'message': f'Successfully unfollowed {target_username}',
                            'followerId': follower_db_id,
                            'followingId': int(following_id)
                        })
                    }
        
        finally:
            conn.close()
            print("Database connection closed")
    
    except json.JSONDecodeError as e:
        print(f"JSON Error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': cors_headers,
            'body': json.dumps({
                'error': 'Invalid JSON',
                'message': 'Request body must be valid JSON'
            })
        }
    
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
