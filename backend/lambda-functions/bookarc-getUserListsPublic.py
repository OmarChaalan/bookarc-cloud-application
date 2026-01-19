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

def lambda_handler(event, context):
    """
    GET /users/{user_id}/lists
    Get PUBLIC lists for a specific user (no authentication required)
    """
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    # Handle OPTIONS request for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    path_parameters = event.get('pathParameters') or {}
    user_id = path_parameters.get('user_id')
    
    if not user_id:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'message': 'user_id is required'})
        }
    
    try:
        user_id = int(user_id)
    except ValueError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'message': 'Invalid user_id'})
        }
    
    print(f"Getting public lists for user_id: {user_id}")
    
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cursor:
            # Check if user exists
            cursor.execute("""
                SELECT user_id, username, display_name, role, is_active
                FROM users 
                WHERE user_id = %s
            """, (user_id,))
            
            user = cursor.fetchone()
            
            if not user:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'message': 'User not found'})
                }
            
            if not user['is_active']:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'message': 'User not found'})
                }
            
            # Get ONLY PUBLIC lists with book counts
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
                AND l.visibility = 'public'
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
            
            print(f"Found {len(lists)} public lists")
            
            # Format lists for frontend
            default_lists = []
            custom_lists = []
            
            # Map for list icons
            list_type_map = {
                'Reading': 'BookOpen',
                'Completed': 'BookCheck',
                'Plan to Read': 'Clock',
                'On-Hold': 'Pause',
                'Dropped': 'List'
            }
            
            for lst in lists:
                list_obj = {
                    'id': lst['list_id'],
                    'name': lst['custom_name'] if lst['list_type'] == 'Custom' else lst['list_type'],
                    'count': lst['book_count'],
                    'visibility': lst['visibility'],
                    'icon': list_type_map.get(lst['list_type'], 'Heart'),
                    'created_at': lst['created_at'].isoformat() if lst['created_at'] else None
                }
                
                if lst['list_type'] == 'Custom':
                    custom_lists.append(list_obj)
                else:
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
    
    except Exception as e:
        print(f"Database error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'message': f'Database error: {str(e)}'})
        }
    finally:
        conn.close()
