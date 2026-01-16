import json
import pymysql
import os
from datetime import datetime, timedelta

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
    Lambda function to get admin statistics
    Requires admin role
    """
    
    # Handle OPTIONS preflight request
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        # Get cognito_sub from authorizer context
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        cognito_sub = claims.get('sub')
        
        print(f"🔍 DEBUG: Full claims: {json.dumps(claims)}")
        print(f"🔍 DEBUG: cognito_sub: {cognito_sub}")
        
        if not cognito_sub:
            return cors_response(401, {'error': 'Unauthorized - No user identity'})
        
        # Connect to database
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                # Check if user is admin from database
                if not check_admin_role(cognito_sub, cursor):
                    print(f"❌ User {cognito_sub} is not admin")
                    return cors_response(403, {'error': 'Forbidden - Admin access required'})
                
                print(f"✅ User {cognito_sub} is admin")
                
                # Get total users
                cursor.execute("SELECT COUNT(*) as total FROM users")
                total_users = cursor.fetchone()['total']
                
                # Get total authors (verified authors)
                cursor.execute("""
                    SELECT COUNT(*) as total 
                    FROM authors 
                    WHERE is_registered_author = TRUE
                """)
                total_authors = cursor.fetchone()['total']
                
                # Get total books (approved books)
                cursor.execute("""
                    SELECT COUNT(*) as total 
                    FROM books 
                    WHERE approval_status = 'approved'
                """)
                total_books = cursor.fetchone()['total']
                
                # Get pending reports (you can implement this later)
                # For now, setting it to 0
                pending_reports = 0
                
                # ✅ NEW: Get pending author verification requests
                cursor.execute("""
                    SELECT COUNT(*) as total 
                    FROM author_verification_requests 
                    WHERE status = 'pending'
                """)
                pending_verifications = cursor.fetchone()['total']
                
                # ✅ NEW: Get pending books
                cursor.execute("""
                    SELECT COUNT(*) as total 
                    FROM books 
                    WHERE approval_status = 'pending'
                """)
                pending_books = cursor.fetchone()['total']
                
                # Calculate growth metrics
                one_month_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
                
                # Users growth
                cursor.execute(f"""
                    SELECT COUNT(*) as total 
                    FROM users 
                    WHERE join_date >= '{one_month_ago}'
                """)
                new_users = cursor.fetchone()['total']
                old_users = total_users - new_users
                users_growth = f"+{int((new_users / max(old_users, 1)) * 100)}%" if old_users > 0 else "+0%"
                
                # Authors growth
                cursor.execute(f"""
                    SELECT COUNT(*) as total 
                    FROM author_verification_requests 
                    WHERE status = 'approved' 
                    AND reviewed_at >= '{one_month_ago}'
                """)
                new_authors = cursor.fetchone()['total']
                old_authors = total_authors - new_authors
                authors_growth = f"+{int((new_authors / max(old_authors, 1)) * 100)}%" if old_authors > 0 else "+0%"
                
                # Books growth
                cursor.execute(f"""
                    SELECT COUNT(*) as total 
                    FROM books 
                    WHERE approval_status = 'approved' 
                    AND approved_at >= '{one_month_ago}'
                """)
                new_books = cursor.fetchone()['total']
                old_books = total_books - new_books
                books_growth = f"+{int((new_books / max(old_books, 1)) * 100)}%" if old_books > 0 else "+0%"
                
                # Return statistics
                stats = {
                    'totalUsers': total_users,
                    'totalAuthors': total_authors,
                    'totalBooks': total_books,
                    'pendingReports': pending_reports,
                    'pendingVerifications': pending_verifications,  # ✅ NEW
                    'pendingBooks': pending_books,                  # ✅ NEW
                    'usersGrowth': users_growth,
                    'authorsGrowth': authors_growth,
                    'booksGrowth': books_growth
                }
                
                print(f"✅ Returning stats: {json.dumps(stats)}")
                return cors_response(200, stats)
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f"❌ Error getting admin stats: {str(e)}")
        import traceback
        traceback.print_exc()
        return cors_response(500, {
            'error': 'Failed to retrieve admin statistics',
            'message': str(e)
        })
