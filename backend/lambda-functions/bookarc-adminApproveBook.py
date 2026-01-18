"""
Lambda Function: bookarc-adminApproveBook
Approve book submissions with EMBEDDED notifications
Endpoint: POST /admin/books/{book_id}/approve
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
    
    def notify_followers_new_book(self, author_user_id: int, book_title: str) -> int:
        """Notify all followers that author published a new book"""
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("""
                    SELECT COALESCE(display_name, username) as name FROM users WHERE user_id = %s
                """, (author_user_id,))
                author_result = cursor.fetchone()
                author_name = author_result['name'] if author_result else 'An author'
                
                cursor.execute("""
                    SELECT ufa.user_id
                    FROM user_follow_author ufa
                    JOIN authors a ON ufa.author_id = a.author_id
                    WHERE a.user_id = %s
                """, (author_user_id,))
                
                follower_ids = [row['user_id'] for row in cursor.fetchall()]
            
            if follower_ids:
                message = f'{author_name} just published a new book: "{book_title}"'
                with self.connection.cursor() as cursor:
                    cursor.executemany("""
                        INSERT INTO notifications (user_id, message, type, audience_type, is_read, created_at)
                        VALUES (%s, %s, 'author_update', 'normal', FALSE, NOW())
                    """, [(uid, message) for uid in follower_ids])
                    self.connection.commit()
                    print(f"Notified {len(follower_ids)} followers about new book")
                    return len(follower_ids)
            return 0
        except Exception as e:
            print(f"Error notifying followers: {str(e)}")
            return 0

# ============================================================================
# Database configuration
# ============================================================================

DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
}

def lambda_handler(event, context):
    print("Event:", json.dumps(event))
    
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}
    
    try:
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        cognito_sub = authorizer.get('claims', {}).get('sub') if 'claims' in authorizer else authorizer.get('cognito_sub')
        user_id_from_authorizer = authorizer.get('user_id')
        user_role = authorizer.get('role')
        
        if not cognito_sub and not user_id_from_authorizer:
            return {'statusCode': 401, 'headers': CORS_HEADERS, 
                   'body': json.dumps({'message': 'Unauthorized. No user identity found.'})}
        
        path_params = event.get('pathParameters') or {}
        book_id = path_params.get('book_id')
        
        if not book_id:
            return {'statusCode': 400, 'headers': CORS_HEADERS,
                   'body': json.dumps({'message': 'Missing book_id in path'})}
        
        try:
            book_id = int(book_id)
        except ValueError:
            return {'statusCode': 400, 'headers': CORS_HEADERS,
                   'body': json.dumps({'message': 'Invalid book_id'})}
        
        connection = pymysql.connect(
            host=DB_HOST, user=DB_USER, password=DB_PASSWORD,
            database=DB_NAME, cursorclass=pymysql.cursors.DictCursor
        )
        
        try:
            with connection.cursor() as cursor:
                # Get admin user and verify role
                if cognito_sub and not user_id_from_authorizer:
                    cursor.execute("""
                        SELECT user_id, username, role
                        FROM users WHERE cognito_sub = %s AND is_active = 1
                    """, (cognito_sub,))
                    user = cursor.fetchone()
                    if not user:
                        return {'statusCode': 404, 'headers': CORS_HEADERS,
                               'body': json.dumps({'message': 'User not found'})}
                    admin_user_id, admin_username, user_role = user['user_id'], user['username'], user['role']
                else:
                    admin_user_id = user_id_from_authorizer
                    if not user_role:
                        cursor.execute("""
                            SELECT username, role FROM users WHERE user_id = %s AND is_active = 1
                        """, (admin_user_id,))
                        user = cursor.fetchone()
                        if not user:
                            return {'statusCode': 404, 'headers': CORS_HEADERS,
                                   'body': json.dumps({'message': 'User not found'})}
                        admin_username, user_role = user['username'], user['role']
                    else:
                        cursor.execute("SELECT username FROM users WHERE user_id = %s", (admin_user_id,))
                        user = cursor.fetchone()
                        admin_username = user['username'] if user else 'Admin'
                
                print(f"Admin: {admin_username} (ID: {admin_user_id}, Role: {user_role})")
                
                if user_role != 'admin':
                    return {'statusCode': 403, 'headers': CORS_HEADERS,
                           'body': json.dumps({'message': 'Unauthorized. Admin access required.'})}
                
                # Get book details
                cursor.execute("""
                    SELECT 
                        b.book_id, b.title, b.approval_status, b.uploaded_by,
                        GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') as authors,
                        GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') as genres
                    FROM books b
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    LEFT JOIN book_genre bg ON b.book_id = bg.book_id
                    LEFT JOIN genres g ON bg.genre_id = g.genre_id
                    WHERE b.book_id = %s
                    GROUP BY b.book_id, b.title, b.approval_status, b.uploaded_by
                """, (book_id,))
                
                book = cursor.fetchone()
                
                if not book:
                    return {'statusCode': 404, 'headers': CORS_HEADERS,
                           'body': json.dumps({'message': 'Book not found'})}
                
                print(f"Book: {book['title']} (Status: {book['approval_status']})")
                
                if book['approval_status'] != 'pending':
                    return {'statusCode': 400, 'headers': CORS_HEADERS,
                           'body': json.dumps({'message': f'Book is already {book["approval_status"]}. Only pending books can be approved.'})}
                
                # Approve book
                cursor.execute("""
                    UPDATE books
                    SET approval_status = 'approved', approved_by = %s, approved_at = NOW(), rejection_reason = NULL
                    WHERE book_id = %s
                """, (admin_user_id, book_id))
                
                # Log admin action
                cursor.execute("""
                    INSERT INTO admin_audit_logs (admin_user_id, action_type, entity_type, entity_id, details, timestamp)
                    VALUES (%s, 'BOOK_APPROVED', 'book', %s, %s, NOW())
                """, (admin_user_id, book_id, json.dumps({
                    'book_title': book['title'],
                    'authors': book['authors'],
                    'genres': book['genres']
                })))
                
                connection.commit()
                print("Book approved successfully")
                
                # Send notifications
                try:
                    notif_service = NotificationService(connection)
                    
                    if book['uploaded_by']:
                        notif_service.create_notification(
                            book['uploaded_by'],
                            f'Congratulations! Your book "{book["title"]}" has been approved and is now live.',
                            'book_approval',
                            'author'
                        )
                        
                        follower_count = notif_service.notify_followers_new_book(book['uploaded_by'], book['title'])
                        print(f"Notified {follower_count} followers")
                    
                    print("All notifications sent successfully")
                except Exception as notif_error:
                    print(f"Failed to send notifications: {str(notif_error)}")
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'message': f'Book "{book["title"]}" has been approved successfully',
                        'book': {
                            'book_id': book['book_id'],
                            'title': book['title'],
                            'authors': book['authors'],
                            'genres': book['genres'],
                            'approval_status': 'approved',
                            'approved_at': datetime.now().isoformat(),
                            'approved_by': admin_username
                        }
                    })
                }
                
        finally:
            connection.close()
            
    except KeyError as ke:
        print(f"Missing required field: {str(ke)}")
        return {'statusCode': 400, 'headers': CORS_HEADERS,
               'body': json.dumps({'message': 'Bad request', 'error': f'Missing required field: {str(ke)}'})}
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'statusCode': 500, 'headers': CORS_HEADERS,
               'body': json.dumps({'message': 'Internal server error', 'error': str(e)})}
