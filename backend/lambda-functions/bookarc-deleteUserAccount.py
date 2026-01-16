import json
import pymysql
import os
import boto3
from typing import Dict, Any, Optional

# Environment configuration
DB_CONFIG = {
    'host': os.environ['DB_HOST'],
    'user': os.environ['DB_USER'],
    'password': os.environ['DB_PASSWORD'],
    'database': os.environ['DB_NAME'],
    'connect_timeout': 5
}

COGNITO_USER_POOL_ID = os.environ['COGNITO_USER_POOL_ID']
S3_BUCKET = os.environ.get('S3_BUCKET')

# AWS clients
cognito = boto3.client('cognito-idp')
s3 = boto3.client('s3')

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
}

def response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized API response"""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body)
    }

def delete_cognito_user(cognito_sub: str) -> bool:
    """Delete user from Cognito User Pool"""
    try:
        cognito.admin_delete_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=cognito_sub
        )
        print(f"Deleted user from Cognito: {cognito_sub}")
        return True
    except cognito.exceptions.UserNotFoundException:
        print(f"User not found in Cognito: {cognito_sub}")
        return True
    except Exception as e:
        print(f"Error deleting from Cognito: {e}")
        raise

def delete_s3_data(user_id: int) -> None:
    """Delete all user data from S3"""
    if not S3_BUCKET:
        print("S3_BUCKET not configured, skipping")
        return
    
    try:
        prefix = f"users/{user_id}/"
        response = s3.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
        
        if 'Contents' in response:
            objects = [{'Key': obj['Key']} for obj in response['Contents']]
            s3.delete_objects(Bucket=S3_BUCKET, Delete={'Objects': objects})
            print(f"Deleted {len(objects)} S3 objects for user {user_id}")
        else:
            print(f"No S3 objects for user {user_id}")
    except Exception as e:
        print(f"S3 deletion error (non-fatal): {e}")

def table_exists(cursor, table_name: str) -> bool:
    """Check if table exists in database"""
    try:
        cursor.execute("""
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_schema = DATABASE() AND table_name = %s
        """, (table_name,))
        return cursor.fetchone()['count'] > 0
    except Exception as e:
        print(f"Error checking table {table_name}: {e}")
        return False

def delete_from_table(cursor, table_name: str, where_clause: str, params: tuple) -> int:
    """Delete from table if it exists"""
    if not table_exists(cursor, table_name):
        print(f"Table '{table_name}' doesn't exist, skipping")
        return 0
    
    cursor.execute(f"DELETE FROM {table_name} WHERE {where_clause}", params)
    count = cursor.rowcount
    print(f"Deleted {count} records from {table_name}")
    return count

def delete_user_from_db(connection, user_id: int) -> bool:
    """Delete all user data from database"""
    with connection.cursor() as cursor:
        print(f"Deleting data for user_id: {user_id}")
        
        # Delete in order respecting foreign key constraints
        tables_to_delete = [
            ('user_books', 'user_id = %s', (user_id,)),
            ('ratings', 'user_id = %s', (user_id,)),
            ('reviews', 'user_id = %s', (user_id,)),
            ('reading_activity', 'user_id = %s', (user_id,)),
            ('notifications', 'user_id = %s', (user_id,)),
            ('follows', 'follower_id = %s OR following_id = %s', (user_id, user_id)),
        ]
        
        # Handle list_items (requires subquery)
        if table_exists(cursor, 'list_items') and table_exists(cursor, 'lists'):
            cursor.execute("""
                DELETE FROM list_items 
                WHERE list_id IN (SELECT list_id FROM lists WHERE user_id = %s)
            """, (user_id,))
            print(f"Deleted {cursor.rowcount} list items")
            
            delete_from_table(cursor, 'lists', 'user_id = %s', (user_id,))
        
        # Delete from all other tables
        for table, where, params in tables_to_delete:
            delete_from_table(cursor, table, where, params)
        
        # Delete user profile (should always exist)
        cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        deleted = cursor.rowcount
        print(f"Deleted user profile: {deleted}")
        
        if deleted == 0:
            print(f"WARNING: User {user_id} not found")
            return False
        
        connection.commit()
        return True

def get_user_info(connection, cognito_sub: str) -> Optional[Dict[str, Any]]:
    """Retrieve user info from database"""
    with connection.cursor(pymysql.cursors.DictCursor) as cursor:
        cursor.execute(
            "SELECT user_id, email, username FROM users WHERE cognito_sub = %s",
            (cognito_sub,)
        )
        return cursor.fetchone()

def lambda_handler(event, context):
    """Delete user account completely (DB + S3 + Cognito)"""
    print(f"Event: {json.dumps(event)}")
    
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return response(200, {'message': 'OK'})
    
    # Extract cognito_sub from JWT
    try:
        claims = event['requestContext']['authorizer']['claims']
        cognito_sub = claims['sub']
        user_email = claims.get('email', 'unknown')
        print(f"Deleting account - cognito_sub: {cognito_sub}, email: {user_email}")
    except KeyError as e:
        print(f"Authorization error: {e}")
        return response(401, {'message': 'Unauthorized'})
    
    # Require deletion confirmation
    try:
        body = json.loads(event.get('body', '{}'))
        if not body.get('confirm_delete'):
            return response(400, {
                'message': 'Account deletion requires confirmation',
                'required_field': 'confirm_delete: true'
            })
    except json.JSONDecodeError:
        return response(400, {'message': 'Invalid JSON body'})
    
    connection = None
    try:
        # Connect to database
        connection = pymysql.connect(**DB_CONFIG)
        
        # Get user info
        user = get_user_info(connection, cognito_sub)
        if not user:
            print(f"User not found in DB for cognito_sub: {cognito_sub}")
            delete_cognito_user(cognito_sub)
            return response(200, {
                'message': 'Account deletion completed',
                'note': 'User not found in database'
            })
        
        user_id = user['user_id']
        print(f"Found user: {user}")
        
        # Delete from all sources
        print("Step 1: Deleting from database...")
        delete_user_from_db(connection, user_id)
        
        print("Step 2: Deleting from S3...")
        delete_s3_data(user_id)
        
        print("Step 3: Deleting from Cognito...")
        delete_cognito_user(cognito_sub)
        
        print(f"Successfully deleted account - user_id: {user_id}, cognito_sub: {cognito_sub}")
        return response(200, {
            'message': 'Account deleted successfully',
            'deleted_user_id': user_id
        })
    
    except pymysql.MySQLError as e:
        print(f"Database error: {e}")
        if connection:
            connection.rollback()
        return response(500, {
            'message': 'Failed to delete account - database error',
            'error': str(e)
        })
    
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        if connection:
            connection.rollback()
        return response(500, {
            'message': 'Failed to delete account',
            'error': str(e)
        })
    
    finally:
        if connection:
            connection.close()
