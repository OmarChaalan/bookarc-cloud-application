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
    Update a custom list name/visibility
    
    PUT /lists/{list_id}
    Body: {
        "name": "New Name",
        "visibility": "public" | "private"
    }
    """
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        user_id = get_user_id_from_token(event)
        if not user_id:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Get list_id from path
        list_id = event.get('pathParameters', {}).get('list_id')
        if not list_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'List ID required'})
            }
        
        # Parse body
        body = json.loads(event.get('body', '{}'))
        new_name = body.get('name', '').strip()
        visibility = body.get('visibility', '').lower()
        
        if not new_name and not visibility:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Name or visibility required'})
            }
        
        if visibility and visibility not in ['public', 'private']:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Visibility must be public or private'})
            }
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # Verify ownership and that it's a custom list
                cursor.execute("""
                    SELECT list_id, name, title, visibility
                    FROM lists
                    WHERE list_id = %s AND user_id = %s
                """, (list_id, user_id))
                
                lst = cursor.fetchone()
                
                if not lst:
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'error': 'List not found'})
                    }
                
                # Don't allow updating default lists
                if lst['name'] != 'Custom':
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({'error': 'Cannot edit default lists'})
                    }
                
                # Update list
                update_fields = []
                params = []
                
                if new_name:
                    update_fields.append("title = %s")
                    params.append(new_name)
                
                if visibility:
                    update_fields.append("visibility = %s")
                    params.append(visibility)
                
                update_fields.append("updated_at = NOW()")
                params.extend([list_id, user_id])
                
                cursor.execute(f"""
                    UPDATE lists
                    SET {', '.join(update_fields)}
                    WHERE list_id = %s AND user_id = %s
                """, params)
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'List updated successfully',
                        'list': {
                            'id': int(list_id),
                            'name': new_name if new_name else lst['title'],
                            'visibility': visibility if visibility else lst['visibility']
                        }
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
