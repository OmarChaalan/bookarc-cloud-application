import json
import boto3
import pymysql
import os
import base64
import uuid
from datetime import datetime

s3_client = boto3.client('s3')

# Environment variables
S3_BUCKET = os.environ['S3_BUCKET_NAME']
DB_HOST = os.environ['DB_HOST']
DB_NAME = os.environ['DB_NAME']
DB_USER = os.environ['DB_USER']
DB_PASSWORD = os.environ['DB_PASSWORD']

# Allowed image types
ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
MAX_SIZE = 5 * 1024 * 1024  # 5MB

def get_db_connection():
    """Create database connection"""
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def send_notification(connection, user_id, message, notification_type='profile_update'):
    """
    Send a notification to the user
    
    Args:
        connection: Database connection
        user_id: User ID to notify
        message: Notification message
        notification_type: Type of notification
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO notifications 
                (user_id, message, type, audience_type, is_read, created_at)
                VALUES (%s, %s, %s, 'all', FALSE, NOW())
            """, (user_id, message, notification_type))
            connection.commit()
            print(f"Notification sent to user {user_id}: {message}")
            return True
    except Exception as e:
        print(f"Failed to send notification: {str(e)}")
        return False

def lambda_handler(event, context):
    """
    Upload profile picture to S3 and update user record
    
    Expected input:
    {
        "cognitoSub": "user-cognito-sub-id",
        "image": "base64-encoded-image-data",
        "contentType": "image/jpeg"
    }
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        cognito_sub = body.get('cognitoSub')
        image_data = body.get('image')
        content_type = body.get('contentType', 'image/jpeg')
        
        print(f"Profile picture upload request for cognito_sub: {cognito_sub}")
        
        # Validation
        if not cognito_sub:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'error': 'cognitoSub is required'})
            }
        
        if not image_data:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'error': 'image data is required'})
            }
        
        # Validate content type
        if content_type not in ALLOWED_TYPES:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'error': f'Invalid content type. Allowed: {ALLOWED_TYPES}'})
            }
        
        # Decode base64 image
        try:
            image_bytes = base64.b64decode(image_data)
            print(f"Image decoded, size: {len(image_bytes)} bytes")
        except Exception as e:
            print(f"Base64 decode error: {str(e)}")
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'error': 'Invalid base64 image data'})
            }
        
        # Check file size
        if len(image_bytes) > MAX_SIZE:
            print(f"Image too large: {len(image_bytes)} bytes")
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'error': f'Image too large. Max size: {MAX_SIZE / (1024*1024)}MB'})
            }
        
        # Connect to database
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                # Get user_id and old profile image
                cursor.execute(
                    "SELECT user_id, profile_image FROM users WHERE cognito_sub = %s",
                    (cognito_sub,)
                )
                user = cursor.fetchone()
                
                if not user:
                    print(f"User not found for cognito_sub: {cognito_sub}")
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                            'Access-Control-Allow-Methods': 'POST,OPTIONS'
                        },
                        'body': json.dumps({'error': 'User not found'})
                    }
                
                user_id = user['user_id']
                old_profile_image = user['profile_image']
                
                print(f"User found: user_id={user_id}")
                
                # Generate unique filename
                file_extension = content_type.split('/')[-1]
                filename = f"profile-pictures/{user_id}/{uuid.uuid4()}.{file_extension}"
                
                print(f"Uploading to S3: {filename}")
                
                # Upload to S3
                s3_client.put_object(
                    Bucket=S3_BUCKET,
                    Key=filename,
                    Body=image_bytes,
                    ContentType=content_type,
                    Metadata={
                        'user_id': str(user_id),
                        'uploaded_at': datetime.utcnow().isoformat()
                    }
                )
                
                # Build S3 URL
                s3_url = f"https://{S3_BUCKET}.s3.amazonaws.com/{filename}"
                
                print(f"S3 upload successful: {s3_url}")
                
                # Update database
                cursor.execute(
                    "UPDATE users SET profile_image = %s, updated_at = NOW() WHERE user_id = %s",
                    (s3_url, user_id)
                )
                connection.commit()
                
                print(f"Database updated for user {user_id}")
                
                # SEND NOTIFICATION
                is_first_upload = not old_profile_image or old_profile_image == ''
                
                if is_first_upload:
                    notification_message = "🎉 Welcome! Your profile picture has been uploaded successfully."
                else:
                    notification_message = "✨ Your profile picture has been updated successfully."
                
                # Send the notification
                send_notification(
                    connection=connection,
                    user_id=user_id,
                    message=notification_message,
                    notification_type='profile_update'
                )
                
                # Delete old profile image from S3 if exists
                if old_profile_image and old_profile_image.startswith(f"https://{S3_BUCKET}"):
                    try:
                        old_key = old_profile_image.split('.com/')[-1]
                        s3_client.delete_object(Bucket=S3_BUCKET, Key=old_key)
                        print(f"Deleted old profile image: {old_key}")
                    except Exception as e:
                        print(f"Error deleting old image: {str(e)}")
                        # Don't fail the request if deletion fails
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({
                        'message': 'Profile picture uploaded successfully',
                        'profileImageUrl': s3_url,
                        'userId': user_id
                    })
                }
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
