"""
Lambda Function: bookarc-adminRejectBook
Reject book submissions with EMBEDDED notifications
Endpoint: POST /admin/books/{book_id}/reject
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
    
    def notify_book_rejected(
        self, 
        user_id: int, 
        book_title: str, 
        rejection_reason: Optional[str] = None
    ) -> Optional[int]:
        """Notify author that their book was rejected"""
        message = f'Your book "{book_title}" was rejected.'
        if rejection_reason:
            message += f' Reason: {rejection_reason}'
        return self.create_notification(user_id, message, 'book_rejection', 'author')

# ============================================================================
# END OF EMBEDDED NOTIFICATION SERVICE
# ============================================================================

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
}

def lambda_handler(event, context):
    """
    Lambda function for admins to reject a pending book
    POST /admin/books/{book_id}/reject
    """
    
    print(f"Event: {json.dumps(event)}")
    
    if event['httpMethod'] == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}
    
    try:
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # Get book_id from path
        book_id = event['pathParameters']['book_id']
        
        print(f"Admin rejection request for book ID: {book_id}")
        
        # Parse request body
        body = json.loads(event['body'])
        rejection_reason = body.get('rejection_reason', '').strip()
        
        print(f"Rejection reason: {rejection_reason}")
        
        if not rejection_reason:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'Rejection reason is required'
                })
            }
        
        conn = pymysql.connect(
            host=os.environ['DB_HOST'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            database=os.environ['DB_NAME'],
            cursorclass=pymysql.cursors.DictCursor
        )
        
        try:
            with conn.cursor() as cursor:
                # Verify admin
                cursor.execute("""
                    SELECT user_id, username, role FROM users 
                    WHERE cognito_sub = %s AND is_active = 1
                """, (user_id,))
                
                admin_user = cursor.fetchone()
                
                if not admin_user or admin_user['role'] != 'admin':
                    print(f"User is not an admin")
                    return {
                        'statusCode': 403,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'Admin access required'})
                    }
                
                print(f"Admin: {admin_user['username']} (ID: {admin_user['user_id']})")
                
                # Check if book exists and is pending
                cursor.execute("""
                    SELECT 
                        b.book_id,
                        b.title,
                        b.approval_status,
                        b.uploaded_by,
                        u.username as author_username,
                        u.email as author_email
                    FROM books b
                    LEFT JOIN users u ON b.uploaded_by = u.user_id
                    WHERE b.book_id = %s
                """, (book_id,))
                
                book = cursor.fetchone()
                
                if not book:
                    print(f"Book {book_id} not found")
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'Book not found'})
                    }
                
                print(f"Book: {book['title']} (Status: {book['approval_status']})")
                
                if book['approval_status'] != 'pending':
                    return {
                        'statusCode': 400,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({
                            'error': f'Book is already {book["approval_status"]}'
                        })
                    }
                
                # Reject the book
                print(f"Rejecting book {book_id}...")
                cursor.execute("""
                    UPDATE books 
                    SET 
                        approval_status = 'rejected',
                        approved_by = %s,
                        approved_at = NOW(),
                        rejection_reason = %s
                    WHERE book_id = %s
                """, (admin_user['user_id'], rejection_reason, book_id))
                
                # Log the rejection
                cursor.execute("""
                    INSERT INTO admin_audit_logs (
                        admin_user_id, action_type, entity_type, 
                        entity_id, details, timestamp
                    ) VALUES (
                        %s, 'BOOK_REJECTED', 'book', %s, %s, NOW()
                    )
                """, (
                    admin_user['user_id'],
                    book_id,
                    json.dumps({
                        'book_title': book['title'],
                        'author_id': book['uploaded_by'],
                        'author_username': book['author_username'],
                        'rejection_reason': rejection_reason
                    })
                ))
                
                conn.commit()
                
                print(f"Book rejected successfully")
                
                # SEND NOTIFICATION
                try:
                    if book['uploaded_by']:
                        print(f"\n📧 Creating NotificationService...")
                        notif_service = NotificationService(conn)
                        
                        print(f"📬 Sending rejection notification to author (user_id: {book['uploaded_by']})")
                        notif_id = notif_service.notify_book_rejected(
                            book['uploaded_by'], 
                            book['title'], 
                            rejection_reason
                        )
                        print(f"Notification created: {notif_id}\n")
                    else:
                        print("No author user_id found, skipping notification")
                except Exception as notif_error:
                    print(f"Failed to send notification: {str(notif_error)}")
                    import traceback
                    traceback.print_exc()
                    # Don't fail the request if notification fails
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'message': 'Book rejected successfully',
                        'book': {
                            'book_id': book['book_id'],
                            'title': book['title'],
                            'approval_status': 'rejected',
                            'rejection_reason': rejection_reason,
                            'rejected_by': admin_user['username']
                        }
                    })
                }
                
        finally:
            conn.close()
            print("Database connection closed")
    
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except KeyError as ke:
        print(f"Missing required field: {str(ke)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Bad request',
                'details': f'Missing required field: {str(ke)}'
            })
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
