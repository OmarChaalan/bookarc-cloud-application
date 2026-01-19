import json
import pymysql
import os
from datetime import datetime

def get_db_connection():
    """Create database connection"""
    return pymysql.connect(
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME'],
        cursorclass=pymysql.cursors.DictCursor
    )

def cors_response(status_code, body):
    """Helper function to return CORS-enabled responses"""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }

def check_admin_role(cognito_sub, cursor):
    """Check if user is admin by querying database"""
    cursor.execute("""
        SELECT role 
        FROM users 
        WHERE cognito_sub = %s
    """, (cognito_sub,))
    
    result = cursor.fetchone()
    if not result:
        return False
    
    return result['role'] == 'admin'

def lambda_handler(event, context):
    """
    Get all books for admin
    GET /admin/books
    Query params: page, limit, search, status
    """
    
    # Handle OPTIONS preflight request
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        # Get cognito_sub from authorizer context
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        cognito_sub = claims.get('sub')
        
        print(f"DEBUG: cognito_sub: {cognito_sub}")
        
        if not cognito_sub:
            return cors_response(401, {'error': 'Unauthorized - No user identity'})
        
        # Get query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        page = int(query_params.get('page', 1))
        limit = int(query_params.get('limit', 20))
        search = query_params.get('search', '')
        status = query_params.get('status', 'approved')
        
        print(f"🔍 DEBUG: Query params - page: {page}, limit: {limit}, search: {search}, status: {status}")
        
        # Handle "undefined" string from frontend
        if search == 'undefined' or not search:
            search = ''
        
        offset = (page - 1) * limit
        
        # Connect to database
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                # Check if user is admin
                if not check_admin_role(cognito_sub, cursor):
                    print(f"User {cognito_sub} is not admin")
                    return cors_response(403, {'error': 'Forbidden - Admin access required'})
                
                print(f"User {cognito_sub} is admin")
                
                # Simpler approach: Get books first, then get authors/genres separately
                base_query = """
                    SELECT 
                        b.book_id,
                        b.title,
                        b.average_rating,
                        b.approval_status
                    FROM books b
                    WHERE b.approval_status = %s
                """
                
                count_query = """
                    SELECT COUNT(*) as total 
                    FROM books b
                    WHERE b.approval_status = %s
                """
                
                query_params = [status]
                
                # Add search condition if provided
                if search:
                    base_query += " AND b.title LIKE %s"
                    count_query += " AND b.title LIKE %s"
                    query_params.append(f"%{search}%")
                
                # Get total count
                cursor.execute(count_query, query_params)
                total = cursor.fetchone()['total']
                
                print(f"Total books found: {total}")
                
                # Get paginated books
                query_params_with_limit = query_params + [limit, offset]
                cursor.execute(
                    base_query + " ORDER BY b.book_id DESC LIMIT %s OFFSET %s",
                    query_params_with_limit
                )
                
                books = cursor.fetchall()
                
                print(f"Retrieved {len(books)} books for current page")
                
                # For each book, get authors and genres
                for book in books:
                    book_id = book['book_id']
                    
                    # Convert Decimal to float for JSON serialization
                    if book.get('average_rating') is not None:
                        from decimal import Decimal
                        if isinstance(book['average_rating'], Decimal):
                            book['average_rating'] = float(book['average_rating'])
                    
                    # Get authors for this book
                    cursor.execute("""
                        SELECT a.name
                        FROM authors a
                        JOIN book_author ba ON a.author_id = ba.author_id
                        WHERE ba.book_id = %s
                    """, (book_id,))
                    
                    authors = cursor.fetchall()
                    book['authors'] = ', '.join([a['name'] for a in authors]) if authors else 'Unknown'
                    
                    # Get genres for this book
                    cursor.execute("""
                        SELECT g.genre_name
                        FROM genres g
                        JOIN book_genre bg ON g.genre_id = bg.genre_id
                        WHERE bg.book_id = %s
                    """, (book_id,))
                    
                    genres = cursor.fetchall()
                    book['genres'] = ', '.join([g['genre_name'] for g in genres]) if genres else 'N/A'
                
                result = {
                    'books': books,
                    'total': total,
                    'page': page,
                    'totalPages': (total + limit - 1) // limit if total > 0 else 1
                }
                
                print(f"Returning result: {len(books)} books, total: {total}, pages: {result['totalPages']}")
                
                return cors_response(200, result)
                
        finally:
            connection.close()
        
    except Exception as e:
        print(f"Error getting admin books: {str(e)}")
        import traceback
        traceback.print_exc()
        return cors_response(500, {
            'error': 'Failed to retrieve books',
            'message': str(e)
        })
