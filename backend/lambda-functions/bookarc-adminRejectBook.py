import json
import pymysql
import os
from notification_service import NotificationService

def lambda_handler(event, context):
    """
    Lambda function for admins to reject a pending book
    POST /admin/books/{book_id}/reject
    """
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    if event['httpMethod'] == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        # Get book_id from path
        book_id = event['pathParameters']['book_id']
        
        # Parse request body
        body = json.loads(event['body'])
        rejection_reason = body.get('rejection_reason', '').strip()
        
        if not rejection_reason:
            return {
                'statusCode': 400,
                'headers': headers,
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
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({'error': 'Admin access required'})
                    }
                
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
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'error': 'Book not found'})
                    }
                
                if book['approval_status'] != 'pending':
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({
                            'error': f'Book is already {book["approval_status"]}'
                        })
                    }
                
                # Reject the book
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
                
                # CREATE NOTIFICATION
                if book['uploaded_by']:
                    notif_service = NotificationService(conn)
                    notif_service.notify_book_rejected(
                        book['uploaded_by'], 
                        book['title'], 
                        rejection_reason
                    )
                
                return {
                    'statusCode': 200,
                    'headers': headers,
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
            
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }
