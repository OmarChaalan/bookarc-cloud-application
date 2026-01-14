import json
import pymysql
import os
from datetime import datetime
from notification_service import NotificationService

# RDS Configuration
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def lambda_handler(event, context):
    print("Event:", json.dumps(event))
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        # Extract user info from authorizer
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        
        # Try to get cognito_sub (for JWT authorizer)
        cognito_sub = authorizer.get('claims', {}).get('sub') if 'claims' in authorizer else authorizer.get('cognito_sub')
        
        # Also try user_id and role (for custom authorizer)
        user_id_from_authorizer = authorizer.get('user_id')
        user_role = authorizer.get('role')
        
        print(f"Cognito Sub: {cognito_sub}")
        print(f"User ID from authorizer: {user_id_from_authorizer}")
        print(f"User Role from authorizer: {user_role}")
        
        if not cognito_sub and not user_id_from_authorizer:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'message': 'Unauthorized. No user identity found.'})
            }
        
        # Get book_id from path parameters
        path_params = event.get('pathParameters') or {}
        book_id = path_params.get('book_id')
        
        if not book_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Missing book_id in path'})
            }
        
        try:
            book_id = int(book_id)
        except ValueError:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Invalid book_id'})
            }
        
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                # Get user_id and verify admin role
                if cognito_sub and not user_id_from_authorizer:
                    cursor.execute("""
                        SELECT user_id, username, role
                        FROM users
                        WHERE cognito_sub = %s AND is_active = 1
                    """, (cognito_sub,))
                    
                    user = cursor.fetchone()
                    
                    if not user:
                        return {
                            'statusCode': 404,
                            'headers': headers,
                            'body': json.dumps({'message': 'User not found'})
                        }
                    
                    admin_user_id = user['user_id']
                    admin_username = user['username']
                    user_role = user['role']
                else:
                    admin_user_id = user_id_from_authorizer
                    # If role not in authorizer, get from database
                    if not user_role:
                        cursor.execute("""
                            SELECT username, role
                            FROM users
                            WHERE user_id = %s AND is_active = 1
                        """, (admin_user_id,))
                        
                        user = cursor.fetchone()
                        
                        if not user:
                            return {
                                'statusCode': 404,
                                'headers': headers,
                                'body': json.dumps({'message': 'User not found'})
                            }
                        
                        admin_username = user['username']
                        user_role = user['role']
                    else:
                        cursor.execute("""
                            SELECT username
                            FROM users
                            WHERE user_id = %s
                        """, (admin_user_id,))
                        user = cursor.fetchone()
                        admin_username = user['username'] if user else 'Admin'
                
                # Check if user is an admin
                if user_role != 'admin':
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({'message': 'Unauthorized. Admin access required.'})
                    }
                
                # Check if book exists and is pending
                cursor.execute("""
                    SELECT 
                        b.book_id,
                        b.title,
                        b.approval_status,
                        b.uploaded_by,
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
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'message': 'Book not found'})
                    }
                
                if book['approval_status'] != 'pending':
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({
                            'message': f'Book is already {book["approval_status"]}. Only pending books can be approved.'
                        })
                    }
                
                # Approve the book
                cursor.execute("""
                    UPDATE books
                    SET 
                        approval_status = 'approved',
                        approved_by = %s,
                        approved_at = NOW(),
                        rejection_reason = NULL
                    WHERE book_id = %s
                """, (admin_user_id, book_id))
                
                # Log the action in admin audit logs
                cursor.execute("""
                    INSERT INTO admin_audit_logs (
                        admin_user_id, 
                        action_type, 
                        entity_type, 
                        entity_id, 
                        details,
                        timestamp
                    ) VALUES (
                        %s, 'BOOK_APPROVED', 'book', %s, %s, NOW()
                    )
                """, (
                    admin_user_id,
                    book_id,
                    json.dumps({
                        'book_title': book['title'],
                        'authors': book['authors'],
                        'genres': book['genres']
                    })
                ))
                
                connection.commit()
                
                # CREATE NOTIFICATIONS
                notif_service = NotificationService(connection)
                
                # Notify the author
                if book['uploaded_by']:
                    notif_service.notify_book_approved(book['uploaded_by'], book['title'])
                    
                    # Notify all followers of this author
                    notif_service.notify_followers_new_book(book['uploaded_by'], book['title'])
                
                return {
                    'statusCode': 200,
                    'headers': headers,
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
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
