import json
import pymysql
import os
from decimal import Decimal

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

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def lambda_handler(event, context):
    print("Event:", json.dumps(event))
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
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
        # Extract user info from authorizer (try both formats)
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        
        # Try to get cognito_sub first (for JWT authorizer)
        cognito_sub = authorizer.get('claims', {}).get('sub') if 'claims' in authorizer else authorizer.get('cognito_sub')
        
        # Also try user_id (for custom authorizer)
        user_id_from_authorizer = authorizer.get('user_id')
        
        print(f"Cognito Sub: {cognito_sub}")
        print(f"User ID from authorizer: {user_id_from_authorizer}")
        
        if not cognito_sub and not user_id_from_authorizer:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'message': 'Unauthorized. No user identity found.'})
            }
        
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                # Get user_id from cognito_sub if we have it
                if cognito_sub and not user_id_from_authorizer:
                    cursor.execute("""
                        SELECT user_id, role, verification_status
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
                    
                    user_id = user['user_id']
                    user_role = user['role']
                    verification_status = user['verification_status']
                else:
                    user_id = user_id_from_authorizer
                    # Get user role from database
                    cursor.execute("""
                        SELECT role, verification_status
                        FROM users
                        WHERE user_id = %s AND is_active = 1
                    """, (user_id,))
                    
                    user = cursor.fetchone()
                    
                    if not user:
                        return {
                            'statusCode': 404,
                            'headers': headers,
                            'body': json.dumps({'message': 'User not found'})
                        }
                    
                    user_role = user['role']
                    verification_status = user['verification_status']
                
                # Check if user is an author
                if user_role != 'author':
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({'message': 'Unauthorized. Author access required.'})
                    }
                
                # Check if author is verified
                if verification_status != 'approved':
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({
                            'message': 'Your author account must be verified first',
                            'verification_status': verification_status
                        })
                    }
                
                # Get all books uploaded by this author
                cursor.execute("""
                    SELECT 
                        b.book_id,
                        b.title,
                        b.summary,
                        b.isbn,
                        b.publish_date,
                        b.cover_image_url,
                        b.approval_status,
                        b.rejection_reason,
                        b.average_rating,
                        b.created_at,
                        b.approved_at,
                        u_approved.username as approved_by,
                        GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') as authors,
                        GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') as genres
                    FROM books b
                    LEFT JOIN users u_approved ON b.approved_by = u_approved.user_id
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    LEFT JOIN book_genre bg ON b.book_id = bg.book_id
                    LEFT JOIN genres g ON bg.genre_id = g.genre_id
                    WHERE b.uploaded_by = %s
                    GROUP BY b.book_id, b.title, b.summary, b.isbn, b.publish_date,
                             b.cover_image_url, b.approval_status, b.rejection_reason,
                             b.average_rating, b.created_at, b.approved_at, u_approved.username
                    ORDER BY b.created_at DESC
                """, (user_id,))
                
                books = cursor.fetchall()
                
                # Format the response
                formatted_books = []
                for book in books:
                    formatted_books.append({
                        'book_id': book['book_id'],
                        'title': book['title'],
                        'summary': book['summary'],
                        'isbn': book['isbn'],
                        'publish_date': book['publish_date'].isoformat() if book['publish_date'] else None,
                        'cover_image_url': book['cover_image_url'],
                        'approval_status': book['approval_status'],
                        'rejection_reason': book['rejection_reason'],
                        'average_rating': float(book['average_rating']) if book['average_rating'] else 0.0,
                        'authors': book['authors'] or 'Unknown',
                        'genres': book['genres'] or 'N/A',
                        'created_at': book['created_at'].isoformat() if book['created_at'] else None,
                        'approved_at': book['approved_at'].isoformat() if book['approved_at'] else None,
                        'approved_by': book['approved_by']
                    })
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'books': formatted_books,
                        'total': len(formatted_books)
                    }, default=decimal_default)
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
