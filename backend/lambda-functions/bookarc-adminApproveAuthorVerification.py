import json
import pymysql
import os
from datetime import datetime
from notification_service import NotificationService

def lambda_handler(event, context):
    """
    POST /admin/verification-requests/{request_id}/approve
    Approves an author verification request
    """
    
    # Database connection
    connection = pymysql.connect(
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME'],
        cursorclass=pymysql.cursors.DictCursor
    )
    
    try:
        # Extract admin user_id from authorizer
        admin_cognito_sub = event['requestContext']['authorizer']['claims']['sub']
        
        # Get request_id from path parameters
        request_id = event['pathParameters']['request_id']
        
        with connection.cursor() as cursor:
            # Verify admin privileges
            cursor.execute("""
                SELECT user_id, role
                FROM users
                WHERE cognito_sub = %s
            """, (admin_cognito_sub,))
            
            admin = cursor.fetchone()
            
            if not admin or admin['role'] != 'admin':
                return {
                    'statusCode': 403,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Admin privileges required'})
                }
            
            admin_user_id = admin['user_id']
            
            # Get the verification request
            cursor.execute("""
                SELECT avr.*, u.username, u.email
                FROM author_verification_requests avr
                JOIN users u ON avr.user_id = u.user_id
                WHERE avr.request_id = %s
            """, (request_id,))
            
            request = cursor.fetchone()
            
            if not request:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Verification request not found'})
                }
            
            if request['status'] != 'pending':
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': f'Request already {request["status"]}'})
                }
            
            # Update verification request to approved
            cursor.execute("""
                UPDATE author_verification_requests
                SET status = 'approved',
                    reviewed_at = NOW(),
                    reviewed_by = %s
                WHERE request_id = %s
            """, (admin_user_id, request_id))
            
            # Update user's verification status and role
            cursor.execute("""
                UPDATE users
                SET verification_status = 'approved',
                    verified_at = NOW(),
                    role = 'author'
                WHERE user_id = %s
            """, (request['user_id'],))
            
            connection.commit()
            
            # 🔔 CREATE NOTIFICATION using NotificationService
            notif_service = NotificationService(connection)
            notif_service.notify_verification_approved(request['user_id'])
            
            # Log admin action
            cursor.execute("""
                INSERT INTO admin_audit_logs (admin_user_id, action_type, entity_type, entity_id, details)
                VALUES (%s, 'APPROVE_VERIFICATION', 'author_verification', %s, %s)
            """, (
                admin_user_id,
                request_id,
                json.dumps({'username': request['username'], 'email': request['email']})
            ))
            
            connection.commit()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Verification approved successfully',
                    'request_id': request_id,
                    'user_id': request['user_id'],
                    'username': request['username'],
                    'approved_at': datetime.now().isoformat()
                })
            }
            
    except Exception as e:
        connection.rollback()
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
    finally:
        connection.close()
