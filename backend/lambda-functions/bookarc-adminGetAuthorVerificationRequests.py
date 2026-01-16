import json
import pymysql
import os

def lambda_handler(event, context):
    """
    GET /admin/verification-requests
    Returns paginated list of verification requests filtered by status
    """
    
    # Database connection
    connection = pymysql.connect(
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME'],
        cursorclass=pymysql.cursors.DictCursor
    )
    
    try:
        # Extract admin user_id from authorizer
        admin_cognito_sub = event['requestContext']['authorizer']['claims']['sub']
        
        # Get query parameters
        params = event.get('queryStringParameters') or {}
        status = params.get('status', 'pending')
        page = int(params.get('page', 1))
        limit = int(params.get('limit', 20))
        offset = (page - 1) * limit
        
        with connection.cursor() as cursor:
            # Verify admin privileges
            cursor.execute("""
                SELECT user_id, role
                FROM users
                WHERE cognito_sub = %s
            """, (admin_cognito_sub,))
            
            admin = cursor.fetchone()
            
            if not admin or admin['role'] != 'admin':
                return {
                    'statusCode': 403,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Admin privileges required'})
                }
            
            # Get total count
            cursor.execute("""
                SELECT COUNT(*) as total
                FROM author_verification_requests
                WHERE status = %s
            """, (status,))
            
            total = cursor.fetchone()['total']
            total_pages = (total + limit - 1) // limit
            
            # Get verification requests
            cursor.execute("""
                SELECT 
                    avr.request_id,
                    avr.user_id,
                    u.username,
                    u.email,
                    u.profile_image,
                    avr.full_name,
                    avr.id_image_url,
                    avr.selfie_image_url,
                    avr.status,
                    avr.submitted_at,
                    avr.reviewed_at,
                    avr.reviewed_by,
                    avr.rejection_reason,
                    reviewer.username as reviewed_by_username
                FROM author_verification_requests avr
                JOIN users u ON avr.user_id = u.user_id
                LEFT JOIN users reviewer ON avr.reviewed_by = reviewer.user_id
                WHERE avr.status = %s
                ORDER BY avr.submitted_at DESC
                LIMIT %s OFFSET %s
            """, (status, limit, offset))
            
            requests = cursor.fetchall()
            
            # Format the response
            formatted_requests = []
            for req in requests:
                formatted_requests.append({
                    'request_id': req['request_id'],
                    'user_id': req['user_id'],
                    'username': req['username'],
                    'email': req['email'],
                    'profile_image': req['profile_image'],
                    'full_name': req['full_name'],
                    'id_image_url': req['id_image_url'],
                    'selfie_image_url': req['selfie_image_url'],
                    'status': req['status'],
                    'submitted_at': req['submitted_at'].isoformat(),
                    'reviewed_at': req['reviewed_at'].isoformat() if req['reviewed_at'] else None,
                    'reviewed_by': req['reviewed_by'],
                    'rejection_reason': req['rejection_reason'],
                    'reviewed_by_username': req['reviewed_by_username']
                })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'requests': formatted_requests,
                    'total': total,
                    'page': page,
                    'total_pages': total_pages,
                    'limit': limit
                })
            }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
    finally:
        connection.close()
