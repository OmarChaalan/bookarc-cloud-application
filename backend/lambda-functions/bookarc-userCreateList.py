import json
import pymysql
import os
from datetime import datetime

# Database configuration
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME', 'bookarcdb')

def get_db_connection():
    """Create database connection"""
    print(f"Connecting to database: {DB_HOST}/{DB_NAME}")
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
        print(f"Cognito Sub: {cognito_sub}")
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT user_id FROM users WHERE cognito_sub = %s",
                    (cognito_sub,)
                )
                result = cursor.fetchone()
                if result:
                    print(f"Found user_id: {result['user_id']}")
                    return result['user_id']
                print("No user found for cognito_sub")
                return None
        finally:
            conn.close()
    except Exception as e:
        print(f"Error extracting user_id: {str(e)}")
        return None

def lambda_handler(event, context):
    """
    Create a new custom list for the authenticated user
    
    Expected request body:
    {
        "name": "Summer Reading 2025",
        "visibility": "public" | "private"  (optional, defaults to "private")
    }
    """
    
    print("Received event:", json.dumps(event))
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    # Handle OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        print("OPTIONS request - returning CORS headers")
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        # Get user_id from token
        user_id = get_user_id_from_token(event)
        if not user_id:
            print("Unauthorized - no user_id found")
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        print(f"Request body: {body}")
        
        list_name = body.get('name', '').strip()
        visibility = body.get('visibility', 'private').lower()
        
        print(f"List name: '{list_name}', visibility: '{visibility}'")
        
        # Validation
        if not list_name:
            print("Validation failed - list name is empty")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'List name is required'})
            }
        
        if len(list_name) > 255:
            print("Validation failed - list name too long")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'List name too long (max 255 characters)'})
            }
        
        if visibility not in ['public', 'private']:
            visibility = 'private'
            print(f"Invalid visibility, defaulting to 'private'")
        
        # Create list in database
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                print(f"Inserting list into database for user_id: {user_id}")
                
                # Insert custom list
                cursor.execute("""
                    INSERT INTO lists (user_id, name, title, visibility, created_at, updated_at)
                    VALUES (%s, 'Custom', %s, %s, NOW(), NOW())
                """, (user_id, list_name, visibility))
                
                list_id = cursor.lastrowid
                conn.commit()
                
                print(f"List created with ID: {list_id}")
                
                # Return created list
                return {
                    'statusCode': 201,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'List created successfully',
                        'list': {
                            'id': list_id,
                            'name': list_name,
                            'visibility': visibility,
                            'count': 0,
                            'bookIds': [],
                            'created_at': datetime.now().isoformat()
                        }
                    })
                }
        
        except pymysql.IntegrityError as e:
            conn.rollback()
            print(f"Database integrity error: {str(e)}")
            return {
                'statusCode': 409,
                'headers': headers,
                'body': json.dumps({'error': 'A list with this name already exists'})
            }
        
        except Exception as e:
            conn.rollback()
            print(f"Database error: {str(e)}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': f'Failed to create list: {str(e)}'})
            }
        
        finally:
            conn.close()
    
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
    
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }
