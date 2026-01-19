"""
Lambda Function: bookarc-followUser
Follow/Unfollow a user (including users who are authors) with EMBEDDED notifications
Endpoint: POST /users/{user_id}/follow
Uses display_name in notifications
"""

import json
import pymysql
import os
from datetime import datetime
from typing import Optional

# ============================================================================
# EMBEDDED NOTIFICATION SERVICE - NO LAYER NEEDED
# ============================================================================

class NotificationService:
    """Service for creating and managing notifications"""
    
    def __init__(self, connection):
        self.connection = connection
    
    def create_notification(
        self, 
        user_id: int, 
        message: str, 
        notification_type: str,
        audience_type: str = 'all'
    ) -> Optional[int]:
        """Create a single notification"""
        try:
            with self.connection.cursor() as cursor:
                sql = """
                    INSERT INTO notifications 
                    (user_id, message, type, audience_type, is_read, created_at)
                    VALUES (%s, %s, %s, %s, FALSE, NOW())
                """
                cursor.execute(sql, (user_id, message, notification_type, audience_type))
                self.connection.commit()
                notification_id = cursor.lastrowid
                print(f"Created notification {notification_id} for user {user_id}: {message}")
                return notification_id
        except Exception as e:
            print(f"Error creating notification: {str(e)}")
            return None
    
    def notify_user_new_follower(self, user_id: int, follower_name: str) -> Optional[int]:
        """Notify user of a new follower"""
        message = f'👥 {follower_name} is now following you!'
        return self.create_notification(user_id, message, 'new_follower', 'all')

# ============================================================================
# END OF EMBEDDED NOTIFICATION SERVICE
# ============================================================================

# RDS Configuration
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
    
    print("\n" + "="*80)
    print("🎬 ===== LAMBDA START: bookarc-followUser =====")
    print("="*80 + "\n")
    
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
        print(f"Incoming event:\n{json.dumps(event, indent=2)}\n")
        
        # Get authenticated user from authorizer
        follower_cognito_sub = None
        
        try:
            request_context = event.get('requestContext', {})
            authorizer = request_context.get('authorizer', {})
            
            print(f"Request context keys: {list(request_context.keys())}")
            print(f"Authorizer keys: {list(authorizer.keys())}")
            
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
            
            if not follower_cognito_sub:
                print(f"Could not find sub in any expected location")
                raise KeyError("Could not find user sub in authorizer")
                
        except Exception as e:
            print(f"Error extracting user from authorizer: {str(e)}")
            return {
                'statusCode': 401,
                'headers': cors_headers,
                'body': json.dumps({
                    'error': 'Unauthorized',
                    'message': 'Could not identify authenticated user'
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
        
        print(f"\nAction Details:")
        print(f"   Action: {action}")
        print(f"   Follower (Cognito): {follower_cognito_sub}")
        print(f"   Target User ID: {following_id}\n")
        
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
                # Get follower's database user_id and display_name
                print(f"Looking up user with cognito_sub: {follower_cognito_sub}")
                cursor.execute(
                    """
                    SELECT user_id, username, role, 
                           COALESCE(display_name, username) as display_name
                    FROM users 
                    WHERE cognito_sub = %s
                    """,
                    (follower_cognito_sub,)
                )
                follower_result = cursor.fetchone()
                
                if not follower_result:
                    print(f"Follower not found")
                    return {
                        'statusCode': 404,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'error': 'User not found',
                            'message': 'Your user account was not found'
                        })
                    }
                
                follower_db_id = follower_result['user_id']
                follower_username = follower_result['username']
                follower_display_name = follower_result['display_name']
                follower_role = follower_result['role']
                print(f"Follower: user_id={follower_db_id}, username={follower_username}, display_name={follower_display_name}, role={follower_role}")
                
                # Only prevent admins from following
                if follower_role == 'admin':
                    print(f"Admin cannot follow users")
                    return {
                        'statusCode': 403,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'error': 'Forbidden',
                            'message': 'Admins cannot follow users'
                        })
                    }
                
                # Validate target user exists and is active
                print(f"Checking target user {following_id}")
                cursor.execute(
                    "SELECT user_id, username, is_active, role FROM users WHERE user_id = %s",
                    (following_id,)
                )
                following_result = cursor.fetchone()
                
                if not following_result:
                    print(f"Target user not found")
                    return {
                        'statusCode': 404,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'error': 'User not found',
                            'message': 'The user you are trying to follow does not exist'
                        })
                    }
                
                if not following_result['is_active']:
                    print(f"Target user is not active")
                    return {
                        'statusCode': 404,
                        'headers': cors_headers,
                        'body': json.dumps({
                            'error': 'User not found',
                            'message': 'The user you are trying to follow does not exist'
                        })
                    }
                
                target_username = following_result['username']
                target_role = following_result['role']
                print(f"Target user: user_id={following_id}, username={target_username}, role={target_role}")
                
                # Prevent self-follow
                if str(follower_db_id) == str(following_id):
                    print(f"Cannot follow yourself")
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
                    print(f"Database updated - follow relationship created")
                    
                    # SEND NOTIFICATION
                    print(f"\n{'='*60}")
                    print(f"NOTIFICATION PROCESS START")
                    print(f"{'='*60}")
                    
                    try:
                        notif_service = NotificationService(conn)
                        print(f"📧 Creating notification for user {following_id}")
                        print(f"   Message: '{follower_display_name} is now following you!'")
                        
                        notif_id = notif_service.notify_user_new_follower(
                            int(following_id), 
                            follower_display_name 
                        )
                        
                        if notif_id:
                            print(f"Notification created successfully: ID {notif_id}")
                        else:
                            print(f"Notification was not created (returned None)")
                        
                    except Exception as notif_error:
                        print(f"Notification error: {str(notif_error)}")
                        import traceback
                        traceback.print_exc()
                        # Don't fail the request if notification fails
                    
                    print(f"{'='*60}\n")
                    
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
                        print(f"⚠️ Not following this user")
                        return {
                            'statusCode': 400,
                            'headers': cors_headers,
                            'body': json.dumps({
                                'error': 'Not following',
                                'message': f'You are not following {target_username}'
                            })
                        }
                    
                    conn.commit()
                    print(f"✅ Successfully unfollowed")
                    
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
        import traceback
        traceback.print_exc()
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
    
    finally:
        print("\n" + "="*80)
        print("🏁 ===== LAMBDA END =====")
        print("="*80 + "\n")
