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
    Get all authors for admin
    GET /admin/authors
    Query params: page, limit, search
    """
    
    # Handle OPTIONS preflight request
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        # Get cognito_sub from authorizer context
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        cognito_sub = claims.get('sub')
        
        if not cognito_sub:
            return cors_response(401, {'error': 'Unauthorized - No user identity'})
        
        # Get query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        page = int(query_params.get('page', 1))
        limit = int(query_params.get('limit', 20))
        search = query_params.get('search', '')
        
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
                
                # Build query - join with users table to get email
                base_query = """
                    SELECT 
                        a.author_id,
                        a.name,
                        u.email,
                        a.verified,
                        a.is_registered_author,
                        COUNT(DISTINCT ba.book_id) as book_count
                    FROM authors a
                    LEFT JOIN users u ON a.user_id = u.user_id
                    LEFT JOIN book_author ba ON a.author_id = ba.author_id
                """
                
                count_query = """
                    SELECT COUNT(DISTINCT a.author_id) as total 
                    FROM authors a
                    LEFT JOIN users u ON a.user_id = u.user_id
                """
                
                if search:
                    search_condition = " WHERE a.name LIKE %s OR u.email LIKE %s"
                    base_query += search_condition
                    count_query += search_condition
                    search_param = f"%{search}%"
                    
                    # Get total count
                    cursor.execute(count_query, (search_param, search_param))
                    total = cursor.fetchone()['total']
                    
                    # Get paginated authors
                    cursor.execute(
                        base_query + " GROUP BY a.author_id, a.name, u.email, a.verified, a.is_registered_author ORDER BY a.author_id DESC LIMIT %s OFFSET %s",
                        (search_param, search_param, limit, offset)
                    )
                else:
                    # Get total count
                    cursor.execute(count_query)
                    total = cursor.fetchone()['total']
                    
                    # Get paginated authors
                    cursor.execute(
                        base_query + " GROUP BY a.author_id, a.name, u.email, a.verified, a.is_registered_author ORDER BY a.author_id DESC LIMIT %s OFFSET %s",
                        (limit, offset)
                    )
                
                authors = cursor.fetchall()
                
                return cors_response(200, {
                    'authors': authors,
                    'total': total,
                    'page': page,
                    'totalPages': (total + limit - 1) // limit
                })
                
        finally:
            connection.close()
        
    except Exception as e:
        print(f"Error getting admin authors: {str(e)}")
        import traceback
        traceback.print_exc()
        return cors_response(500, {
            'error': 'Failed to retrieve authors',
            'message': str(e)
        })
