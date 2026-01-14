import json
import pymysql
import os
from datetime import datetime
from notification_service import NotificationService

# Database configuration
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

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
    POST /admin/verification-requests/{request_id}/reject
    Reject an author verification request (admin only)
    Body: { "rejection_reason": "..." }
    """
    
    connection = None
    
    try:
        # Get user_id from Cognito authorizer
        admin_user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # Get request_id from path parameters
        request_id = int(event['pathParameters']['request_id'])
        
        # Parse request body
        body = json.loads(event['body'])
        rejection_reason = body.get('rejection_reason', '').strip()
        
        if not rejection_reason:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Rejection reason is required'
                })
            }
        
        connection = get_db_connection()
        
        with connection.cursor() as cursor:
            # Verify user is admin
            admin_query = """
                SELECT user_id, role 
                FROM users 
                WHERE cognito_sub = %s
            """
            cursor.execute(admin_query, (admin_user_id,))
            admin_result = cursor.fetchone()
            
            if not admin_result:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Admin user not found'})
                }
            
            admin_db_id = admin_result['user_id']
            admin_role = admin_result['role']
            
            if admin_role != 'admin':
                return {
                    'statusCode': 403,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Forbidden: Admin access required'})
                }
            
            # Get verification request details
            request_query = """
                SELECT 
                    avr.user_id,
                    avr.full_name,
                    avr.status,
                    u.username,
                    u.email
                FROM author_verification_requests avr
                INNER JOIN users u ON avr.user_id = u.user_id
                WHERE avr.request_id = %s
            """
            cursor.execute(request_query, (request_id,))
            request_result = cursor.fetchone()
            
            if not request_result:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Verification request not found'})
                }
            
            user_id = request_result['user_id']
            full_name = request_result['full_name']
            current_status = request_result['status']
            username = request_result['username']
            email = request_result['email']
            
            # Check if already processed
            if current_status in ['approved', 'rejected']:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': f'Verification request already {current_status}'
                    })
                }
            
            # Update verification request
            update_request_query = """
                UPDATE author_verification_requests 
                SET 
                    status = 'rejected',
                    reviewed_at = NOW(),
                    reviewed_by = %s,
                    rejection_reason = %s
                WHERE request_id = %s
            """
            cursor.execute(update_request_query, (admin_db_id, rejection_reason, request_id))
            
            # Update user verification status
            update_user_query = """
                UPDATE users 
                SET verification_status = 'rejected'
                WHERE user_id = %s
            """
            cursor.execute(update_user_query, (user_id,))
            
            connection.commit()
            
            # CREATE NOTIFICATION using NotificationService
            notif_service = NotificationService(connection)
            notif_service.notify_verification_rejected(user_id, rejection_reason)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Author verification rejected',
                'request_id': request_id,
                'user_id': user_id,
                'username': username,
                'rejection_reason': rejection_reason,
                'rejected_at': datetime.now().isoformat()
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
