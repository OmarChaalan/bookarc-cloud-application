import json
import pymysql
import os
from datetime import datetime

# RDS Configuration from environment variables
DB_HOST = os.environ['DB_HOST']
DB_USER = os.environ['DB_USER']
DB_PASSWORD = os.environ['DB_PASSWORD']
DB_NAME = os.environ['DB_NAME']

# CORS headers - apply to all responses
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
}

def lambda_handler(event, context):
    """
    Lambda function to update user profile in RDS
    Triggered by API Gateway PUT /profile
    """
    
    print(f"Event: {json.dumps(event)}")
    
    # Handle OPTIONS request for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'OK'})
        }
    
    # Get Cognito sub from JWT token
    try:
        cognito_sub = event['requestContext']['authorizer']['claims']['sub']
        print(f"Cognito sub: {cognito_sub}")
    except KeyError as e:
        print(f"Authorization error: {str(e)}")
        return {
            'statusCode': 401,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Unauthorized'})
        }
    
    # Parse request body
    try:
        body = json.loads(event['body'])
        print(f"Request body: {body}")
    except (json.JSONDecodeError, KeyError) as e:
        print(f"JSON parse error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Invalid JSON body'})
        }
    
    # Get fields to update (only fields that exist in your database)
    username = body.get('username')
    display_name = body.get('display_name')
    bio = body.get('bio')
    location = body.get('location')
    # REMOVED: website field
    profile_image = body.get('profile_image')
    
    connection = None
    
    try:
        # Connect to RDS
        print(f"Connecting to database: {DB_HOST}")
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            connect_timeout=5
        )
        print("Database connection successful")
        
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            # First, check if user exists and get column names
            cursor.execute("DESCRIBE users")
            columns = [col['Field'] for col in cursor.fetchall()]
            print(f"Available columns: {columns}")
            
            # Determine the correct cognito column name
            cognito_column = None
            if 'cognito_sub' in columns:
                cognito_column = 'cognito_sub'
            elif 'cognito_user_id' in columns:
                cognito_column = 'cognito_user_id'
            else:
                print("ERROR: No cognito column found in users table")
                return {
                    'statusCode': 500,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'message': 'Database configuration error: missing cognito column'})
                }
            
            print(f"Using cognito column: {cognito_column}")
            
            # Build UPDATE query dynamically based on provided fields
            update_fields = []
            params = []
            
            if username is not None:
                update_fields.append('username = %s')
                params.append(username)
            
            if display_name is not None:
                update_fields.append('display_name = %s')
                params.append(display_name)
            
            if bio is not None:
                update_fields.append('bio = %s')
                params.append(bio)
            
            # Check if location column exists before updating
            if location is not None and 'location' in columns:
                update_fields.append('location = %s')
                params.append(location)
                print(f"Updating location to: {location}")
            elif location is not None and 'location' not in columns:
                print("WARNING: location field provided but column doesn't exist in database")
            
            # REMOVED: website handling
            
            if profile_image is not None:
                update_fields.append('profile_image = %s')
                params.append(profile_image)
            
            if not update_fields:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'message': 'No fields to update'})
                }
            
            # Always update the updated_at timestamp if the column exists
            if 'updated_at' in columns:
                update_fields.append('updated_at = NOW()')
            
            # Add cognito_sub for WHERE clause
            params.append(cognito_sub)
            
            sql = f"""
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE {cognito_column} = %s
            """
            
            print(f"Executing SQL: {sql}")
            print(f"With params: {params}")
            
            affected_rows = cursor.execute(sql, params)
            connection.commit()
            
            print(f"Affected rows: {affected_rows}")
            
            if affected_rows == 0:
                return {
                    'statusCode': 404,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'message': 'User not found'})
                }
            
            # Fetch updated user data - build SELECT based on available columns
            select_columns = []
            base_columns = ['user_id', 'email', 'username']
            optional_columns = ['display_name', 'bio', 'location', 'profile_image',  # REMOVED 'website'
                              'role', 'created_at', 'updated_at']
            
            for col in base_columns + optional_columns:
                if col in columns:
                    select_columns.append(col)
            
            # Always include the cognito column
            if cognito_column not in select_columns:
                select_columns.append(cognito_column)
            
            select_sql = f"""
                SELECT {', '.join(select_columns)}
                FROM users 
                WHERE {cognito_column} = %s
            """
            
            print(f"Fetching updated user: {select_sql}")
            cursor.execute(select_sql, (cognito_sub,))
            
            result = cursor.fetchone()
            
            if not result:
                return {
                    'statusCode': 404,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'message': 'User not found after update'})
                }
            
            # Convert datetime objects to strings
            for key, value in result.items():
                if isinstance(value, datetime):
                    result[key] = value.isoformat()
            
            print(f"User updated successfully: {result.get('user_id')}")
            print(f"Updated location: {result.get('location')}")
            
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps(result)
            }
    
    except pymysql.MySQLError as e:
        print(f"Database error: {str(e)}")
        print(f"Error code: {e.args[0] if e.args else 'Unknown'}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': 'Database error',
                'error': str(e),
                'error_code': e.args[0] if e.args else None
            })
        }
    
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
    
    finally:
        if connection:
            connection.close()
            print("Database connection closed")
