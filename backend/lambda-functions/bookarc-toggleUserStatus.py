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
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }

def check_admin_role(cognito_sub, cursor):
    """Check if user is admin by querying database"""
    cursor.execute("""
        SELECT user_id, role 
        FROM users 
        WHERE cognito_sub = %s
    """, (cognito_sub,))
    
    result = cursor.fetchone()
    if not result:
        return None, False
    
    return result['user_id'], result['role'] == 'admin'

def lambda_handler(event, context):
    """
    Toggle user active status (activate/deactivate)
    POST /admin/users/{user_id}/toggle-status
    Body: { "action": "activate" | "deactivate" }
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
        
        # Get user_id from path parameters
        path_params = event.get('pathParameters', {})
        user_id = path_params.get('user_id')
        
        if not user_id:
            return cors_response(400, {'error': 'Missing user_id parameter'})
        
        # Get action from request body
        try:
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
        except json.JSONDecodeError:
            return cors_response(400, {'error': 'Invalid JSON in request body'})
        
        if action not in ['activate', 'deactivate']:
            return cors_response(400, {
                'error': 'Invalid action. Must be "activate" or "deactivate"'
            })
        
        # Connect to database
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                # Check if requesting user is admin
                admin_user_id, is_admin = check_admin_role(cognito_sub, cursor)
                
                if not is_admin:
                    print(f"❌ User {cognito_sub} is not admin")
                    return cors_response(403, {'error': 'Forbidden - Admin access required'})
                
                # Check if target user exists
                cursor.execute("""
                    SELECT user_id, username, email, role, COALESCE(is_active, TRUE) as is_active 
                    FROM users 
                    WHERE user_id = %s
                """, (user_id,))
                user = cursor.fetchone()
                
                if not user:
                    return cors_response(404, {'error': 'User not found'})
                
                # Prevent deactivating admin accounts
                if user['role'] == 'admin':
                    return cors_response(403, {
                        'error': 'Cannot deactivate admin accounts'
                    })
                
                # Prevent self-deactivation
                if admin_user_id == int(user_id):
                    return cors_response(403, {
                        'error': 'Cannot deactivate your own account'
                    })
                
                # Update user status
                new_status = True if action == 'activate' else False
                cursor.execute("""
                    UPDATE users 
                    SET is_active = %s, updated_at = %s 
                    WHERE user_id = %s
                """, (new_status, datetime.now(), user_id))
                
                # Log the action in audit logs
                cursor.execute("""
                    INSERT INTO admin_audit_logs 
                    (admin_user_id, action_type, entity_type, entity_id, details)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    admin_user_id,
                    f'USER_{action.upper()}',
                    'user',
                    user_id,
                    json.dumps({
                        'username': user['username'],
                        'email': user['email'],
                        'previous_status': bool(user['is_active']),
                        'new_status': new_status
                    })
                ))
                
                connection.commit()
                
                # Get updated user data
                cursor.execute("""
                    SELECT user_id, username, email, role, is_active 
                    FROM users 
                    WHERE user_id = %s
                """, (user_id,))
                updated_user = cursor.fetchone()
                
                # Ensure is_active is boolean
                updated_user['is_active'] = bool(updated_user['is_active'])
                
                print(f"✅ User {user_id} successfully {action}d by admin {admin_user_id}")
                
                return cors_response(200, {
                    'message': f'User successfully {action}d',
                    'user': updated_user
                })
                
        finally:
            connection.close()
        
    except Exception as e:
        print(f"❌ Error toggling user status: {str(e)}")
        import traceback
        traceback.print_exc()
        return cors_response(500, {
            'error': 'Failed to toggle user status',
            'message': str(e)
        })
