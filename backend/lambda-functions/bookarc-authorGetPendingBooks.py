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
        
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                # Get user_id and verify admin role
                if cognito_sub and not user_id_from_authorizer:
                    cursor.execute("""
                        SELECT user_id, role
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
                else:
                    user_id = user_id_from_authorizer
                    # If role not in authorizer, get from database
                    if not user_role:
                        cursor.execute("""
                            SELECT role
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
                
                # Check if user is an admin
                if user_role != 'admin':
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({'message': 'Unauthorized. Admin access required.'})
                    }
                
                # Get query parameters
                query_params = event.get('queryStringParameters') or {}
                page = int(query_params.get('page', 1))
                limit = int(query_params.get('limit', 20))
                search = query_params.get('search', '').strip()
                
                offset = (page - 1) * limit
                
                # Build search condition
                search_condition = ""
                search_params = []
                
                if search:
                    search_condition = """
                        AND (
                            b.title LIKE %s 
                            OR GROUP_CONCAT(DISTINCT a.name) LIKE %s
                            OR u.username LIKE %s
                            OR u.email LIKE %s
                        )
                    """
                    search_pattern = f"%{search}%"
                    search_params = [search_pattern, search_pattern, search_pattern, search_pattern]
                
                # Get total count
                count_query = f"""
                    SELECT COUNT(DISTINCT b.book_id) as total
                    FROM books b
                    LEFT JOIN users u ON b.uploaded_by = u.user_id
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    WHERE b.approval_status = 'pending'
                """
                
                if search:
                    # For count with search, we need to use a subquery
                    cursor.execute(f"""
                        SELECT COUNT(*) as total
                        FROM (
                            SELECT b.book_id
                            FROM books b
                            LEFT JOIN users u ON b.uploaded_by = u.user_id
                            LEFT JOIN book_author ba ON b.book_id = ba.book_id
                            LEFT JOIN authors a ON ba.author_id = a.author_id
                            WHERE b.approval_status = 'pending'
                            GROUP BY b.book_id
                            HAVING (
                                MAX(b.title) LIKE %s 
                                OR GROUP_CONCAT(DISTINCT a.name) LIKE %s
                                OR MAX(u.username) LIKE %s
                                OR MAX(u.email) LIKE %s
                            )
                        ) as filtered
                    """, search_params)
                else:
                    cursor.execute(count_query)
                
                total_result = cursor.fetchone()
                total = total_result['total'] if total_result else 0
                total_pages = (total + limit - 1) // limit if total > 0 else 1
                
                # Get pending books with pagination
                # Note: Use IFNULL to show username if author name is not found
                query = f"""
                    SELECT 
                        b.book_id,
                        b.title,
                        b.summary,
                        b.isbn,
                        b.publish_date,
                        b.cover_image_url,
                        b.approval_status,
                        b.source_name,
                        b.created_at as submitted_at,
                        u.user_id as submitted_by_id,
                        u.username as submitted_by_username,
                        u.email as submitted_by_email,
                        IFNULL(
                            GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', '),
                            IFNULL(u.display_name, u.username)
                        ) as authors,
                        GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') as genres
                    FROM books b
                    LEFT JOIN users u ON b.uploaded_by = u.user_id
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    LEFT JOIN book_genre bg ON b.book_id = bg.book_id
                    LEFT JOIN genres g ON bg.genre_id = g.genre_id
                    WHERE b.approval_status = 'pending'
                    GROUP BY b.book_id, b.title, b.summary, b.isbn, b.publish_date,
                             b.cover_image_url, b.approval_status, b.source_name, b.created_at,
                             u.user_id, u.username, u.email, u.display_name
                    {f"HAVING (MAX(b.title) LIKE %s OR GROUP_CONCAT(DISTINCT a.name) LIKE %s OR MAX(u.username) LIKE %s OR MAX(u.email) LIKE %s)" if search else ""}
                    ORDER BY b.created_at DESC
                    LIMIT %s OFFSET %s
                """
                
                params = search_params + [limit, offset] if search else [limit, offset]
                cursor.execute(query, params)
                
                books = cursor.fetchall()
                
                # Format the response
                formatted_books = []
                for book in books:
                    # Use author name from authors table, fallback to display_name or username
                    author_name = book['authors'] if book['authors'] else 'Unknown Author'
                    
                    formatted_books.append({
                        'book_id': book['book_id'],
                        'title': book['title'],
                        'summary': book['summary'],
                        'isbn': book['isbn'],
                        'publish_date': book['publish_date'].isoformat() if book['publish_date'] else None,
                        'cover_image_url': book['cover_image_url'],
                        'approval_status': book['approval_status'],
                        'source_name': book['source_name'],
                        'authors': author_name,
                        'genres': book['genres'] or 'N/A',
                        'submitted_at': book['submitted_at'].isoformat() if book['submitted_at'] else None,
                        'submitted_by': {
                            'user_id': book['submitted_by_id'],
                            'username': book['submitted_by_username'],
                            'email': book['submitted_by_email']
                        }
                    })
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'books': formatted_books,
                        'total': total,
                        'page': page,
                        'totalPages': total_pages,
                        'limit': limit
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
