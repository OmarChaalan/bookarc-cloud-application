import json
import pymysql
import os

def lambda_handler(event, context):
    """
    GET /notifications
    Get all notifications for the current user (REAL DATA from database)
    Query params: page, limit, is_read, type
    """
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    if event['httpMethod'] == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        # Get user from JWT token
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        cognito_sub = authorizer.get('claims', {}).get('sub') if 'claims' in authorizer else authorizer.get('cognito_sub')
        
        if not cognito_sub:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Parse query parameters
        params = event.get('queryStringParameters') or {}
        page = int(params.get('page', 1))
        limit = int(params.get('limit', 20))
        is_read = params.get('is_read')  # 'true', 'false', or None for all
        notification_type = params.get('type')  # Optional filter by type
        
        offset = (page - 1) * limit
        
        # Connect to database
        conn = pymysql.connect(
            host=os.environ['DB_HOST'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            database=os.environ['DB_NAME'],
            cursorclass=pymysql.cursors.DictCursor
        )
        
        try:
            with conn.cursor() as cursor:
                # Get user_id from cognito_sub
                cursor.execute("""
                    SELECT user_id, role FROM users 
                    WHERE cognito_sub = %s AND is_active = 1
                """, (cognito_sub,))
                
                user = cursor.fetchone()
                
                if not user:
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'error': 'User not found'})
                    }
                
                user_id = user['user_id']
                user_role = user['role']
                
                # Build WHERE clause for filters
                where_conditions = ["user_id = %s"]
                query_params = [user_id]
                
                if is_read is not None:
                    where_conditions.append("is_read = %s")
                    query_params.append(is_read.lower() == 'true')
                
                if notification_type:
                    where_conditions.append("type = %s")
                    query_params.append(notification_type)
                
                where_clause = " AND ".join(where_conditions)
                
                # Get total count
                count_sql = f"""
                    SELECT COUNT(*) as total
                    FROM notifications
                    WHERE {where_clause}
                """
                cursor.execute(count_sql, query_params)
                total_count = cursor.fetchone()['total']
                
                # Get unread count
                cursor.execute("""
                    SELECT COUNT(*) as unread_count
                    FROM notifications
                    WHERE user_id = %s AND is_read = FALSE
                """, (user_id,))
                unread_count = cursor.fetchone()['unread_count']
                
                # Get notifications with pagination
                notifications_sql = f"""
                    SELECT 
                        notification_id,
                        user_id,
                        message,
                        type,
                        audience_type,
                        is_read,
                        created_at
                    FROM notifications
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """
                
                cursor.execute(notifications_sql, query_params + [limit, offset])
                notifications = cursor.fetchall()
                
                # Format timestamps to ISO format
                for notif in notifications:
                    if notif['created_at']:
                        notif['created_at'] = notif['created_at'].isoformat()
                
                total_pages = (total_count + limit - 1) // limit
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'notifications': notifications,
                        'total': total_count,
                        'unread_count': unread_count,
                        'page': page,
                        'total_pages': total_pages,
                        'limit': limit
                    })
                }
                
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }
