import json
import boto3
import os
from datetime import datetime
import base64
import uuid
import pymysql

s3 = boto3.client('s3')

# Database configuration from environment variables
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')
VERIFICATION_BUCKET = os.environ.get('VERIFICATION_BUCKET', 'bookarc-verification-documents')

def get_db_connection():
    """Create and return a database connection"""
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def lambda_handler(event, context):
    """
    POST /author/verification
    Submit author verification request with ID and selfie images
    """
    
    connection = None
    
    try:
        # Get user_id from Cognito authorizer
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        connection = get_db_connection()
        
        with connection.cursor() as cursor:
            # Get user's database ID
            user_query = """
                SELECT user_id, username, email, verification_status, role
                FROM users 
                WHERE cognito_sub = %s
            """
            
            cursor.execute(user_query, (user_id,))
            user_result = cursor.fetchone()
            
            if not user_result:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'User not found'})
                }
            
            db_user_id = user_result['user_id']
            username = user_result['username']
            email = user_result['email']
            verification_status = user_result['verification_status'] if user_result['verification_status'] else 'none'
            user_role = user_result['role']
            
            # Check if already an author or has pending/approved verification
            if user_role == 'author':
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'You are already an author',
                        'verification_status': 'approved'
                    })
                }
            
            if verification_status in ['pending', 'approved']:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': f'Verification already {verification_status}',
                        'verification_status': verification_status
                    })
                }
            
            # Parse request body
            body = json.loads(event['body'])
            full_name = body.get('full_name', '').strip()
            id_card_base64 = body.get('id_card_image')  # Base64 encoded image
            selfie_base64 = body.get('selfie_image')    # Base64 encoded image
            
            # Validation
            if not full_name:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Full name is required'})
                }
            
            if not id_card_base64 or not selfie_base64:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Both ID card and selfie images are required'})
                }
            
            # Upload images to S3
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_id = str(uuid.uuid4())[:8]
            
            # Upload ID card
            id_card_key = f"verification/{db_user_id}/{timestamp}_{unique_id}_id_card.jpg"
            id_card_data = base64.b64decode(id_card_base64.split(',')[1] if ',' in id_card_base64 else id_card_base64)
            
            # Validate file size (max 5MB)
            if len(id_card_data) > 5 * 1024 * 1024:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'ID card image must be less than 5MB'})
                }
            
            s3.put_object(
                Bucket=VERIFICATION_BUCKET,
                Key=id_card_key,
                Body=id_card_data,
                ContentType='image/jpeg'
            )
            id_card_url = f"https://{VERIFICATION_BUCKET}.s3.amazonaws.com/{id_card_key}"
            
            # Upload selfie
            selfie_key = f"verification/{db_user_id}/{timestamp}_{unique_id}_selfie.jpg"
            selfie_data = base64.b64decode(selfie_base64.split(',')[1] if ',' in selfie_base64 else selfie_base64)
            
            # Validate file size (max 5MB)
            if len(selfie_data) > 5 * 1024 * 1024:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Selfie image must be less than 5MB'})
                }
            
            s3.put_object(
                Bucket=VERIFICATION_BUCKET,
                Key=selfie_key,
                Body=selfie_data,
                ContentType='image/jpeg'
            )
            selfie_url = f"https://{VERIFICATION_BUCKET}.s3.amazonaws.com/{selfie_key}"
            
            # Check if user has already submitted today (prevent spam)
            check_query = """
                SELECT request_id 
                FROM author_verification_requests 
                WHERE user_id = %s 
                AND DATE(submitted_at) = CURDATE()
                AND status = 'pending'
            """
            
            cursor.execute(check_query, (db_user_id,))
            check_result = cursor.fetchone()
            
            if check_result:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'You have already submitted a verification request today. Please wait for review.'
                    })
                }
            
            # Insert verification request
            insert_query = """
                INSERT INTO author_verification_requests 
                (user_id, full_name, id_image_url, selfie_image_url, status, submitted_at)
                VALUES (%s, %s, %s, %s, 'pending', NOW())
            """
            
            cursor.execute(insert_query, (db_user_id, full_name, id_card_url, selfie_url))
            
            # Update user verification status to pending
            update_user_query = """
                UPDATE users 
                SET verification_status = 'pending'
                WHERE user_id = %s
            """
            
            cursor.execute(update_user_query, (db_user_id,))
            
            connection.commit()
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Verification request submitted successfully',
                'verification_status': 'pending',
                'submitted_at': datetime.now().isoformat()
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        if connection:
            connection.rollback()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }
    finally:
        if connection:
            connection.close()
