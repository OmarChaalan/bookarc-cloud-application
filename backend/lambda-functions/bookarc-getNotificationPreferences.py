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
    Lambda: GET /notifications/preferences
    Get notification preferences for the current user
    """
    print(f"Event: {json.dumps(event)}")
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
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
            
            # Get or create notification preferences
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
            
            prefs = cursor.fetchone()
            
            # If no preferences exist, create default ones
            if not prefs:
                cursor.execute("""
                    INSERT INTO notification_preferences 
                    (user_id, allow_email, allow_author_updates, allow_premium_offers)
                    VALUES (%s, TRUE, TRUE, TRUE)
                """, (db_user_id,))
                connection.commit()
                
                # Fetch the newly created preferences
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
                
                prefs = cursor.fetchone()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'pref_id': prefs['pref_id'],
                    'user_id': prefs['user_id'],
                    'allow_email': bool(prefs['allow_email']),
                    'allow_author_updates': bool(prefs['allow_author_updates']),
                    'allow_premium_offers': bool(prefs['allow_premium_offers'])
                })
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
