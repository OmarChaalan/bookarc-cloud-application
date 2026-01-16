import json
import pymysql
import os

# Database configuration
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME', 'bookarcdb')

def get_db_connection():
    """Create database connection"""
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def get_user_id_from_token(event):
    """Extract user_id from JWT token claims"""
    try:
        claims = event['requestContext']['authorizer']['claims']
        cognito_sub = claims['sub']
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT user_id FROM users WHERE cognito_sub = %s",
                    (cognito_sub,)
                )
                result = cursor.fetchone()
                if result:
                    return result['user_id']
                return None
        finally:
            conn.close()
    except Exception as e:
        print(f"Error extracting user_id: {str(e)}")
        return None

def lambda_handler(event, context):
    """
    Get all lists (default + custom) for the authenticated user
    
    Returns both:
    - Default lists: Reading, Completed, Plan to Read, On-Hold, Dropped
    - Custom lists: User-created lists
    """
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    # Handle OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        # Get user_id from token
        user_id = get_user_id_from_token(event)
        if not user_id:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # Get all lists with book counts
                cursor.execute("""
                    SELECT 
                        l.list_id,
                        l.name as list_type,
                        l.title as custom_name,
                        l.visibility,
                        l.created_at,
                        COUNT(DISTINCT lb.book_id) as book_count
                    FROM lists l
                    LEFT JOIN list_books lb ON l.list_id = lb.list_id
                    WHERE l.user_id = %s
                    GROUP BY l.list_id, l.name, l.title, l.visibility, l.created_at
                    ORDER BY 
                        CASE l.name
                            WHEN 'Reading' THEN 1
                            WHEN 'Completed' THEN 2
                            WHEN 'Plan to Read' THEN 3
                            WHEN 'On-Hold' THEN 4
                            WHEN 'Dropped' THEN 5
                            WHEN 'Custom' THEN 6
                        END,
                        l.created_at DESC
                """, (user_id,))
                
                lists = cursor.fetchall()
                
                # Format lists for frontend
                default_lists = []
                custom_lists = []
                
                # Map for list icons (frontend will handle actual icons)
                list_type_map = {
                    'Reading': {'id': -1, 'icon': 'BookOpen'},
                    'Completed': {'id': -2, 'icon': 'BookCheck'},
                    'Plan to Read': {'id': -3, 'icon': 'Clock'},
                    'On-Hold': {'id': -4, 'icon': 'Pause'},
                    'Dropped': {'id': -5, 'icon': 'List'}
                }
                
                for lst in lists:
                    list_obj = {
                        'id': lst['list_id'],
                        'name': lst['custom_name'] if lst['list_type'] == 'Custom' else lst['list_type'],
                        'count': lst['book_count'],
                        'visibility': lst['visibility'],
                        'created_at': lst['created_at'].isoformat() if lst['created_at'] else None
                    }
                    
                    if lst['list_type'] == 'Custom':
                        list_obj['icon'] = 'Heart'  # Frontend will assign random icon
                        custom_lists.append(list_obj)
                    else:
                        list_obj['icon'] = list_type_map.get(lst['list_type'], {}).get('icon', 'List')
                        default_lists.append(list_obj)
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'defaultLists': default_lists,
                        'customLists': custom_lists,
                        'total': len(lists)
                    })
                }
        
        finally:
            conn.close()
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Internal server error'})
        }
