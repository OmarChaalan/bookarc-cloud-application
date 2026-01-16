"""
Lambda Function: Record User Book Interactions
Stores user interactions for recommendation algorithm improvement
"""

import json
import pymysql
import os
from datetime import datetime

# Environment variables
DB_HOST = os.environ['DB_HOST']
DB_NAME = os.environ['DB_NAME']
DB_USER = os.environ['DB_USER']
DB_PASSWORD = os.environ['DB_PASSWORD']

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
    Records a user interaction event
    
    Event types:
    - view: User viewed book details
    - rate: User rated a book (event_value = rating 1-5)
    - review: User reviewed a book
    - add_to_list: User added book to reading list
    - complete: User marked book as completed
    """
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Get user ID from Cognito token
        cognito_sub = event['requestContext']['authorizer']['claims']['sub']
        
        # Extract parameters
        book_id = body.get('book_id')
        event_type = body.get('event_type')  # view, rate, review, add_to_list, complete
        event_value = body.get('event_value')  # optional, used for ratings
        
        # Validate required fields
        if not all([book_id, event_type]):
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': True,
                },
                'body': json.dumps({
                    'error': 'Missing required fields: book_id, event_type'
                })
            }
        
        # Validate event type
        valid_event_types = ['view', 'rate', 'review', 'add_to_list', 'complete']
        if event_type not in valid_event_types:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': True,
                },
                'body': json.dumps({
                    'error': f'Invalid event_type. Must be one of: {", ".join(valid_event_types)}'
                })
            }
        
        conn = get_db_connection()
        try:
            # Get database user_id from cognito_sub
            with conn.cursor() as cursor:
                cursor.execute("SELECT user_id FROM users WHERE cognito_sub = %s", (cognito_sub,))
                user_row = cursor.fetchone()
                if not user_row:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Credentials': True,
                        },
                        'body': json.dumps({'error': 'User not found'})
                    }
                user_id = user_row['user_id']
            
            # Get current timestamp (Unix epoch in seconds)
            timestamp = int(datetime.now().timestamp())
            
            # Record interaction in database
            with conn.cursor() as cursor:
                sql = """
                    INSERT INTO interaction_events 
                    (user_id, book_id, event_type, event_value, timestamp)
                    VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (user_id, book_id, event_type, event_value, timestamp))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': True,
                },
                'body': json.dumps({
                    'message': 'Interaction recorded successfully',
                    'event_type': event_type,
                    'book_id': book_id,
                    'timestamp': timestamp
                })
            }
            
        finally:
            conn.close()
        
    except Exception as e:
        print(f"Error recording interaction: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True,
            },
            'body': json.dumps({
                'error': 'Failed to record interaction',
                'details': str(e)
            })
        }
