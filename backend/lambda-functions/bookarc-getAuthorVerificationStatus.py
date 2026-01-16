import json
import pymysql
import os
from datetime import datetime

def lambda_handler(event, context):
    """
    GET /author/verification
    Returns the current user's verification status and latest request details
    """
    
    # Database connection
    connection = pymysql.connect(
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME'],
        cursorclass=pymysql.cursors.DictCursor
    )
    
    try:
        # Extract user_id from authorizer context
        user_id = event['requestContext']['authorizer']['claims']['sub']
        
        with connection.cursor() as cursor:
            # Get user info and verification status
            cursor.execute("""
                SELECT 
                    u.user_id,
                    u.username,
                    u.email,
                    u.role,
                    u.verification_status,
                    u.verified_at
                FROM users u
                WHERE u.cognito_sub = %s
            """, (user_id,))
            
            user = cursor.fetchone()
            
            if not user:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'User not found'})
                }
            
            # Get latest verification request if any
            cursor.execute("""
                SELECT 
                    request_id,
                    full_name,
                    status,
                    submitted_at,
                    reviewed_at,
                    rejection_reason
                FROM author_verification_requests
                WHERE user_id = %s
                ORDER BY submitted_at DESC
                LIMIT 1
            """, (user['user_id'],))
            
            latest_request = cursor.fetchone()
            
            response_data = {
                'user_id': user['user_id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role'],
                'verification_status': user['verification_status'],
                'verified_at': user['verified_at'].isoformat() if user['verified_at'] else None
            }
            
            if latest_request:
                response_data['latest_request'] = {
                    'request_id': latest_request['request_id'],
                    'full_name': latest_request['full_name'],
                    'status': latest_request['status'],
                    'submitted_at': latest_request['submitted_at'].isoformat(),
                    'reviewed_at': latest_request['reviewed_at'].isoformat() if latest_request['reviewed_at'] else None,
                    'rejection_reason': latest_request['rejection_reason']
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(response_data)
            }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
    finally:
        connection.close()
