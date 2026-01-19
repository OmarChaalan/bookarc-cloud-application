"""
lambda-changePassword.py - FIXED VERSION
Handles password changes via Cognito
Uses access token from request body
"""

import json
import boto3
import os
from botocore.exceptions import ClientError

# Initialize Cognito client
cognito_client = boto3.client('cognito-idp', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
}

def lambda_handler(event, context):
    """
    Main handler for password change requests
    
    Request body should contain:
    {
        "oldPassword": "current password",
        "newPassword": "new password",
        "accessToken": "Cognito access token"
    }
    """
    print(f"Event: {json.dumps(event)}")
    
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
            print(f"Parsed body: {json.dumps({k: '***' if 'password' in k.lower() or 'token' in k.lower() else v for k, v in body.items()})}")
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {str(e)}")
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Bad Request',
                    'message': 'Invalid JSON in request body'
                })
            }
        
        # Extract and validate input
        old_password = body.get('oldPassword')
        new_password = body.get('newPassword')
        access_token = body.get('accessToken')
        
        # Validation
        if not old_password or not new_password:
            print("Missing password fields")
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Bad Request',
                    'message': 'Both oldPassword and newPassword are required'
                })
            }
        
        if not access_token:
            print("Missing access token")
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Unauthorized',
                    'message': 'Access token is required'
                })
            }
        
        if len(new_password) < 8:
            print("New password too short")
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Bad Request',
                    'message': 'New password must be at least 8 characters long'
                })
            }
        
        if old_password == new_password:
            print("Same password provided")
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Bad Request',
                    'message': 'New password must be different from the old password'
                })
            }
        
        # Change password in Cognito
        print("Attempting to change password in Cognito...")
        try:
            response = cognito_client.change_password(
                PreviousPassword=old_password,
                ProposedPassword=new_password,
                AccessToken=access_token
            )
            
            print(f"Password changed successfully in Cognito")
            print(f"Cognito response metadata: {response.get('ResponseMetadata', {})}")
            
            # Optional: Send notification (only if notification system is set up)
            try:
                send_password_change_notification(access_token)
            except Exception as notif_error:
                # Don't fail the password change if notification fails
                print(f"Failed to send notification: {str(notif_error)}")
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'success': True,
                    'message': 'Password changed successfully'
                })
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            
            print(f"Cognito Error: {error_code} - {error_message}")
            
            # Handle specific Cognito errors
            if error_code == 'NotAuthorizedException':
                return {
                    'statusCode': 401,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Invalid Credentials',
                        'message': 'Current password is incorrect'
                    })
                }
            elif error_code == 'InvalidPasswordException':
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Invalid Password',
                        'message': 'New password does not meet password policy requirements'
                    })
                }
            elif error_code == 'LimitExceededException':
                return {
                    'statusCode': 429,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Too Many Requests',
                        'message': 'Too many attempts. Please try again later'
                    })
                }
            elif error_code == 'InvalidParameterException':
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Invalid Parameter',
                        'message': error_message
                    })
                }
            else:
                return {
                    'statusCode': 500,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'error': 'Cognito Error',
                        'message': error_message
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
                'error': 'Internal Server Error',
                'message': 'An unexpected error occurred'
            })
        }


def send_password_change_notification(access_token):
    """
    Optional: Send notification when password is changed
    Only runs if database and notification system are properly configured
    """
    try:
        # Only attempt if we have DB environment variables
        if not all([
            os.environ.get('DB_HOST'),
            os.environ.get('DB_USER'),
            os.environ.get('DB_PASSWORD'),
            os.environ.get('DB_NAME')
        ]):
            print("Database not configured, skipping notification")
            return
        
        import pymysql
        
        # Get user info from Cognito
        user_info = cognito_client.get_user(AccessToken=access_token)
        cognito_sub = None
        
        for attr in user_info.get('UserAttributes', []):
            if attr['Name'] == 'sub':
                cognito_sub = attr['Value']
                break
        
        if not cognito_sub:
            print("Could not extract cognito_sub from token")
            return
        
        # Connect to database
        conn = pymysql.connect(
            host=os.environ.get('DB_HOST'),
            user=os.environ.get('DB_USER'),
            password=os.environ.get('DB_PASSWORD'),
            database=os.environ.get('DB_NAME'),
            cursorclass=pymysql.cursors.DictCursor
        )
        
        try:
            with conn.cursor() as cursor:
                # Get user_id
                cursor.execute(
                    "SELECT user_id FROM users WHERE cognito_sub = %s",
                    (cognito_sub,)
                )
                user = cursor.fetchone()
                
                if user:
                    # Create notification
                    cursor.execute("""
                        INSERT INTO notifications (user_id, message, type, audience_type, is_read)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        user['user_id'],
                        'Your password was successfully changed. If you did not make this change, please contact support immediately.',
                        'security',
                        'all',
                        False
                    ))
                    conn.commit()
                    print(f"Notification sent to user {user['user_id']}")
                else:
                    print("User not found in database")
        finally:
            conn.close()
            
    except ImportError:
        print("pymysql not available, skipping notification")
    except Exception as e:
        print(f"Notification error (non-critical): {str(e)}")
