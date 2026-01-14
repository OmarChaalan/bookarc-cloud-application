"""
lambda-changePassword.py - UPDATED VERSION
Uses access token from request body instead of header
Includes notification on successful password change
"""

import json
import boto3
import pymysql
import os
from botocore.exceptions import ClientError
from notification_service import NotificationService

cognito_client = boto3.client('cognito-idp', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
}

def get_db_connection():
    """Create database connection"""
    return pymysql.connect(
        host=os.environ.get('DB_HOST'),
        user=os.environ.get('DB_USER'),
        password=os.environ.get('DB_PASSWORD'),
        database=os.environ.get('DB_NAME'),
        cursorclass=pymysql.cursors.DictCursor
    )

def lambda_handler(event, context):
    print(f"Event: {json.dumps(event)}")
    
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
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Bad Request',
                    'message': 'Invalid JSON in request body'
                })
            }
        
        old_password = body.get('oldPassword')
        new_password = body.get('newPassword')
        access_token = body.get('accessToken')  # Get from body instead of header
        
        # Validate input
        if not old_password or not new_password:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Bad Request',
                    'message': 'Both oldPassword and newPassword are required'
                })
            }
        
        if not access_token:
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Unauthorized',
                    'message': 'Access token is required'
                })
            }
        
        if len(new_password) < 8:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Bad Request',
                    'message': 'New password must be at least 8 characters long'
                })
            }
        
        if old_password == new_password:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Bad Request',
                    'message': 'New password must be different from the old password'
                })
            }
        
        # Change password in Cognito using access token from body
        try:
            response = cognito_client.change_password(
                PreviousPassword=old_password,
                ProposedPassword=new_password,
                AccessToken=access_token
            )
            
            print(f"Password changed successfully in Cognito")
            
            # 🔔 CREATE NOTIFICATION
            # Get user_id from Cognito token to send notification
            try:
                # Get user info from access token
                user_info = cognito_client.get_user(AccessToken=access_token)
                cognito_sub = None
                
                for attr in user_info.get('UserAttributes', []):
                    if attr['Name'] == 'sub':
                        cognito_sub = attr['Value']
                        break
                
                if cognito_sub:
                    # Connect to database to get user_id
                    conn = get_db_connection()
                    try:
                        with conn.cursor() as cursor:
                            cursor.execute(
                                "SELECT user_id FROM users WHERE cognito_sub = %s",
                                (cognito_sub,)
                            )
                            user = cursor.fetchone()
                            
                            if user:
                                # Send notification
                                notif_service = NotificationService(conn)
                                notif_service.notify_password_changed(user['user_id'])
                                print(f"✅ Notification sent to user {user['user_id']}")
                    finally:
                        conn.close()
                else:
                    print("⚠️ Could not extract cognito_sub from token")
                    
            except Exception as notif_error:
                # Don't fail the password change if notification fails
                print(f"⚠️ Failed to send notification: {str(notif_error)}")
            
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
                'message': str(e)
            })
        }
