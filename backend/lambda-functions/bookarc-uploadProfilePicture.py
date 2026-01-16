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
        except Exception as e:
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
                
                # Generate unique filename
                file_extension = content_type.split('/')[-1]
                filename = f"profile-pictures/{user_id}/{uuid.uuid4()}.{file_extension}"
                
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
                
                # Update database
                cursor.execute(
                    "UPDATE users SET profile_image = %s, updated_at = NOW() WHERE user_id = %s",
                    (s3_url, user_id)
                )
                connection.commit()
                
                # Delete old profile image from S3 if exists
                if old_profile_image and old_profile_image.startswith(f"https://{S3_BUCKET}"):
                    try:
                        old_key = old_profile_image.split('.com/')[-1]
                        s3_client.delete_object(Bucket=S3_BUCKET, Key=old_key)
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
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
