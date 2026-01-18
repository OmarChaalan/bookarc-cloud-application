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
    Get all reports for admin (author verification requests)
    GET /admin/reports
    Query params: status (pending/approved/rejected)
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
        status = query_params.get('status', 'pending')
        
        # Connect to database
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                # Check if user is admin
                if not check_admin_role(cognito_sub, cursor):
                    print(f"User {cognito_sub} is not admin")
                    return cors_response(403, {'error': 'Forbidden - Admin access required'})
                
                # Get author verification requests as "reports"
                query = """
                    SELECT 
                        avr.request_id as id,
                        'Author Verification' as type,
                        u.username as reporter,
                        avr.full_name as reported,
                        CASE 
                            WHEN avr.status = 'pending' THEN 'Pending verification'
                            WHEN avr.status = 'approved' THEN 'Approved'
                            WHEN avr.status = 'rejected' THEN COALESCE(avr.rejection_reason, 'Rejected')
                        END as reason,
                        avr.submitted_at as date,
                        avr.status
                    FROM author_verification_requests avr
                    JOIN users u ON avr.user_id = u.user_id
                    WHERE avr.status = %s
                    ORDER BY avr.submitted_at DESC
                """
                
                cursor.execute(query, (status,))
                reports = cursor.fetchall()
                
                # Format dates
                for report in reports:
                    if isinstance(report['date'], datetime):
                        report['date'] = report['date'].strftime('%Y-%m-%d')
                
                return cors_response(200, {
                    'reports': reports
                })
                
        finally:
            connection.close()
        
    except Exception as e:
        print(f"Error getting admin reports: {str(e)}")
        import traceback
        traceback.print_exc()
        return cors_response(500, {
            'error': 'Failed to retrieve reports',
            'message': str(e)
        })
