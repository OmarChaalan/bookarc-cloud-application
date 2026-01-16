import json
import boto3
import os
from datetime import datetime
import uuid
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')

# Environment variables
S3_BUCKET = os.environ['S3_BUCKET_NAME']

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
}

def lambda_handler(event, context):
    """
    Generate a pre-signed URL for uploading OR downloading profile pictures
    
    For UPLOAD (from frontend):
    - Query parameters: fileType, fileName
    - Returns: uploadUrl (PUT), fileUrl (public access)
    
    For DOWNLOAD (legacy support):
    - Query parameters: imageKey or imageUrl
    - Returns: presignedUrl (GET)
    """
    
    print(f"Event: {json.dumps(event)}")
    
    # Handle OPTIONS request for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        query_params = event.get('queryStringParameters', {})
        
        if not query_params:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Missing query parameters'})
            }
        
        # Check if this is an UPLOAD request (fileType + fileName present)
        file_type = query_params.get('fileType')
        file_name = query_params.get('fileName')
        
        if file_type and file_name:
            # UPLOAD MODE - Generate pre-signed URL for PUT
            return handle_upload_request(file_type, file_name, event)
        
        # Otherwise, DOWNLOAD MODE - Generate pre-signed URL for GET
        return handle_download_request(query_params)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }


def handle_upload_request(file_type, file_name, event):
    """Handle upload pre-signed URL generation"""
    
    # Validate file type (only allow images)
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if file_type not in allowed_types:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': f'Invalid file type. Allowed: {", ".join(allowed_types)}'})
        }
    
    # Get user info from JWT token (for folder organization)
    try:
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        claims = authorizer.get('claims', {})
        cognito_sub = claims.get('sub', 'anonymous')
        user_email = claims.get('email', 'unknown')
        print(f"Upload request from user: {user_email} (sub: {cognito_sub})")
    except:
        cognito_sub = 'anonymous'
        print("Could not extract user info from token")
    
    # Generate unique key for the file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    file_extension = file_name.split('.')[-1] if '.' in file_name else 'jpg'
    
    # Create S3 key with user-specific folder
    key = f"profile-pictures/{cognito_sub}/{timestamp}_{unique_id}.{file_extension}"
    
    print(f"Generating pre-signed URL for UPLOAD - key: {key}")
    
    try:
        # Generate pre-signed URL for PUT operation
        # REMOVED ACL parameter - modern S3 buckets use bucket policies instead
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': key,
                'ContentType': file_type
            },
            ExpiresIn=3600  # URL expires in 1 hour
        )
        
        # Generate the public file URL (for accessing after upload)
        file_url = f"https://{S3_BUCKET}.s3.amazonaws.com/{key}"
        
        print(f"Generated upload URL successfully")
        print(f"File will be accessible at: {file_url}")
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'uploadUrl': presigned_url,
                'fileUrl': file_url,
                'key': key,
                'bucket': S3_BUCKET,
                'expiresIn': 3600
            })
        }
        
    except ClientError as e:
        print(f"S3 ClientError during upload URL generation: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Failed to generate upload URL', 'details': str(e)})
        }


def handle_download_request(query_params):
    """Handle download pre-signed URL generation (legacy support)"""
    
    # Get the S3 object key
    image_key = query_params.get('imageKey')
    image_url = query_params.get('imageUrl')
    
    if image_url and not image_key:
        # Extract key from full S3 URL
        if '.s3.amazonaws.com/' in image_url:
            image_key = image_url.split('.s3.amazonaws.com/')[-1]
        else:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Invalid image URL format'})
            }
    
    if not image_key:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'imageKey or imageUrl parameter required'})
        }
    
    print(f"Generating pre-signed URL for DOWNLOAD - key: {image_key}")
    
    try:
        # Generate pre-signed URL for GET operation
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': image_key
            },
            ExpiresIn=3600  # 1 hour
        )
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'presignedUrl': presigned_url,
                'expiresIn': 3600,
                'message': 'Pre-signed URL generated successfully'
            })
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f"S3 ClientError: {error_code} - {str(e)}")
        
        if error_code == 'NoSuchKey':
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Image not found'})
            }
        else:
            return {
                'statusCode': 500,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Failed to generate pre-signed URL', 'details': str(e)})
            }
