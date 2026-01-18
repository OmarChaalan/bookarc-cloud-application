"""
Lambda Function: bookarc-adminApproveAuthorVerification
Approve author verification requests with EMBEDDED notifications
Endpoint: POST /admin/verification-requests/{request_id}/approve
"""

import json
import pymysql
import os
from datetime import datetime
from typing import Optional

# ============================================================================
# EMBEDDED NOTIFICATION SERVICE
# ============================================================================

class NotificationService:
    """Service for creating and managing notifications"""
    
    def __init__(self, connection):
        self.connection = connection
    
    def create_notification(self, user_id: int, message: str, notification_type: str, audience_type: str = 'all') -> Optional[int]:
        """Create a single notification"""
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO notifications (user_id, message, type, audience_type, is_read, created_at)
                    VALUES (%s, %s, %s, %s, FALSE, NOW())
                """, (user_id, message, notification_type, audience_type))
                self.connection.commit()
                return cursor.lastrowid
        except Exception as e:
            print(f"Error creating notification: {str(e)}")
            return None

# ============================================================================
# Database configuration
# ============================================================================

DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
}

def lambda_handler(event, context):
    """
    POST /admin/verification-requests/{request_id}/approve
    Approves an author verification request (admin only)
    """
    
    print(f"Event: {json.dumps(event)}")
    
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'message': 'OK'})}
    
    connection = None
    
    try:
        admin_cognito_sub = event['requestContext']['authorizer']['claims']['sub']
        request_id = int(event['pathParameters']['request_id'])
        
        print(f"Admin approval request for verification ID: {request_id}")
        
        connection = pymysql.connect(
            host=DB_HOST, user=DB_USER, password=DB_PASSWORD,
            database=DB_NAME, cursorclass=pymysql.cursors.DictCursor
        )
        
        with connection.cursor() as cursor:
            # Single query to get admin and verification request data
            cursor.execute("""
                SELECT 
                    admin.user_id as admin_user_id,
                    admin.role as admin_role,
                    admin.username as admin_username,
                    avr.request_id,
                    avr.user_id as applicant_user_id,
                    avr.status,
                    u.username as applicant_username,
                    u.email as applicant_email,
                    COALESCE(u.display_name, u.username) as applicant_display_name
                FROM users admin
                CROSS JOIN author_verification_requests avr
                JOIN users u ON avr.user_id = u.user_id
                WHERE admin.cognito_sub = %s AND avr.request_id = %s
            """, (admin_cognito_sub, request_id))
            
            result = cursor.fetchone()
            
            if not result:
                return {'statusCode': 404, 'headers': CORS_HEADERS, 
                       'body': json.dumps({'error': 'Admin or request not found'})}
            
            if result['admin_role'] != 'admin':
                print(f"User {result['admin_user_id']} is not an admin")
                return {'statusCode': 403, 'headers': CORS_HEADERS,
                       'body': json.dumps({'error': 'Admin privileges required'})}
            
            if result['status'] != 'pending':
                print(f"Request already {result['status']}")
                return {'statusCode': 400, 'headers': CORS_HEADERS,
                       'body': json.dumps({'error': f'Request already {result["status"]}'})}
            
            # Update verification request to approved
            cursor.execute("""
                UPDATE author_verification_requests
                SET status = 'approved', reviewed_at = NOW(), reviewed_by = %s
                WHERE request_id = %s
            """, (result['admin_user_id'], request_id))
            
            # Update user's verification status and role
            cursor.execute("""
                UPDATE users
                SET verification_status = 'approved', verified_at = NOW(), role = 'author'
                WHERE user_id = %s
            """, (result['applicant_user_id'],))
            
            connection.commit()
            print(f"Verification approved for {result['applicant_username']}")
            
            # Send notifications
            try:
                notif_service = NotificationService(connection)
                
                # Notify the applicant
                notif_service.create_notification(
                    result['applicant_user_id'],
                    'Congratulations! Your author verification has been approved. You can now access your Author Dashboard.',
                    'verification_approved',
                    'author'
                )
                
                # Notify the admin
                notif_service.create_notification(
                    result['admin_user_id'],
                    f'You approved author verification for {result["applicant_display_name"]}.',
                    'admin_action',
                    'admin'
                )
                
                print("Notifications sent successfully")
            except Exception as notif_error:
                print(f"Failed to send notifications: {str(notif_error)}")
            
            # Log admin action
            try:
                cursor.execute("""
                    INSERT INTO admin_audit_logs (admin_user_id, action_type, entity_type, entity_id, details)
                    VALUES (%s, 'APPROVE_VERIFICATION', 'author_verification', %s, %s)
                """, (result['admin_user_id'], request_id, 
                     json.dumps({'username': result['applicant_username'], 'email': result['applicant_email']})))
                connection.commit()
            except Exception as log_error:
                print(f"Failed to log admin action: {str(log_error)}")
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'message': 'Verification approved successfully',
                    'request_id': request_id,
                    'user_id': result['applicant_user_id'],
                    'username': result['applicant_username'],
                    'approved_at': datetime.now().isoformat()
                })
            }
    
    except KeyError as ke:
        print(f"Missing required field: {str(ke)}")
        if connection:
            connection.rollback()
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Bad request', 'details': f'Missing required field: {str(ke)}'})
        }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        if connection:
            connection.rollback()
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
    finally:
        if connection:
            connection.close()
