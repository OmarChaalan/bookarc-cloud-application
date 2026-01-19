import json
import pymysql
import os

def lambda_handler(event, context):
    """
    PATCH /notifications/{notification_id}/read
    Mark a notification as read
    """
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'PATCH,OPTIONS',
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
        
        # Get notification_id from path
        notification_id = event['pathParameters']['notification_id']
        
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
                # Get user_id
                cursor.execute("""
                    SELECT user_id FROM users 
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
                
                # Check if notification exists and belongs to user
                cursor.execute("""
                    SELECT notification_id, is_read 
                    FROM notifications 
                    WHERE notification_id = %s AND user_id = %s
                """, (notification_id, user_id))
                
                notification = cursor.fetchone()
                
                if not notification:
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'error': 'Notification not found'})
                    }
                
                # Mark as read
                cursor.execute("""
                    UPDATE notifications 
                    SET is_read = TRUE 
                    WHERE notification_id = %s
                """, (notification_id,))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Notification marked as read',
                        'notification_id': int(notification_id),
                        'is_read': True
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
