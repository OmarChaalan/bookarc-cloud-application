import json
import pymysql
import os

# Database configuration
DB_CONFIG = {
    'host': os.environ['DB_HOST'],
    'user': os.environ['DB_USER'],
    'password': os.environ['DB_PASSWORD'],
    'database': os.environ['DB_NAME'],
    'port': 3306
}

def lambda_handler(event, context):
    """
    Lambda: PUT /notifications/preferences
    Update notification preferences for the current user
    """
    print(f"Event: {json.dumps(event)}")
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'PUT,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    connection = None
    
    try:
        # Extract user ID from Cognito authorizer
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'message': 'Unauthorized - No user ID found'})
            }
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        allow_email = body.get('allow_email')
        allow_author_updates = body.get('allow_author_updates')
        allow_premium_offers = body.get('allow_premium_offers')
        
        connection = pymysql.connect(**DB_CONFIG)
        
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            # Get user's database ID from cognito_sub
            cursor.execute("SELECT user_id FROM users WHERE cognito_sub = %s", (user_id,))
            user_row = cursor.fetchone()
            
            if not user_row:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'message': 'User not found'})
                }
            
            db_user_id = user_row['user_id']
            
            # Check if preferences exist
            cursor.execute("""
                SELECT pref_id FROM notification_preferences WHERE user_id = %s
            """, (db_user_id,))
            
            existing_prefs = cursor.fetchone()
            
            # Build update query dynamically based on provided fields
            update_fields = []
            update_values = []
            
            if allow_email is not None:
                update_fields.append("allow_email = %s")
                update_values.append(allow_email)
            
            if allow_author_updates is not None:
                update_fields.append("allow_author_updates = %s")
                update_values.append(allow_author_updates)
            
            if allow_premium_offers is not None:
                update_fields.append("allow_premium_offers = %s")
                update_values.append(allow_premium_offers)
            
            if not update_fields:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'message': 'No valid fields provided for update'})
                }
            
            if existing_prefs:
                # Update existing preferences
                update_values.append(db_user_id)
                update_query = f"""
                    UPDATE notification_preferences 
                    SET {', '.join(update_fields)}
                    WHERE user_id = %s
                """
                cursor.execute(update_query, tuple(update_values))
            else:
                # Create new preferences with provided values
                cursor.execute("""
                    INSERT INTO notification_preferences 
                    (user_id, allow_email, allow_author_updates, allow_premium_offers)
                    VALUES (%s, %s, %s, %s)
                """, (
                    db_user_id,
                    allow_email if allow_email is not None else True,
                    allow_author_updates if allow_author_updates is not None else True,
                    allow_premium_offers if allow_premium_offers is not None else True
                ))
            
            connection.commit()
            
            # Fetch updated preferences
            cursor.execute("""
                SELECT 
                    pref_id,
                    user_id,
                    allow_email,
                    allow_author_updates,
                    allow_premium_offers
                FROM notification_preferences
                WHERE user_id = %s
            """, (db_user_id,))
            
            updated_prefs = cursor.fetchone()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Notification preferences updated successfully',
                    'preferences': {
                        'pref_id': updated_prefs['pref_id'],
                        'user_id': updated_prefs['user_id'],
                        'allow_email': bool(updated_prefs['allow_email']),
                        'allow_author_updates': bool(updated_prefs['allow_author_updates']),
                        'allow_premium_offers': bool(updated_prefs['allow_premium_offers'])
                    }
                })
            }
            
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'message': 'Invalid JSON in request body'})
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
    finally:
        if connection:
            connection.close()
