import json
import pymysql
import os

def lambda_handler(event, context):
    """
    Cognito Pre-Authentication Trigger
    Blocks deactivated users from logging in
    """
    
    try:
        # Get user attributes from Cognito event
        user_attributes = event.get('request', {}).get('userAttributes', {})
        cognito_sub = user_attributes.get('sub')
        email = user_attributes.get('email')
        
        print(f"🔍 Pre-auth check for user: {email} (sub: {cognito_sub})")
        
        if not cognito_sub:
            print("❌ No cognito_sub found")
            raise Exception("Authentication failed: Invalid user")
        
        # Connect to database
        connection = pymysql.connect(
            host=os.environ['DB_HOST'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            database=os.environ['DB_NAME'],
            cursorclass=pymysql.cursors.DictCursor
        )
        
        try:
            with connection.cursor() as cursor:
                # Check if user is active
                cursor.execute("""
                    SELECT user_id, username, email, is_active, role
                    FROM users 
                    WHERE cognito_sub = %s
                """, (cognito_sub,))
                
                user = cursor.fetchone()
                
                if not user:
                    print(f"⚠️ User not found in database: {cognito_sub}")
                    # Allow login - user might not be in DB yet (will be added by post-confirmation)
                    return event
                
                # Check if user is deactivated
                if not user['is_active']:
                    print(f"❌ User {user['username']} ({user['email']}) is deactivated")
                    raise Exception(
                        "Your account has been deactivated. "
                        "Please contact support at admin@bookarc.com for assistance."
                    )
                
                print(f"✅ User {user['username']} ({user['email']}) is active - allowing login")
                
        finally:
            connection.close()
        
        # Return event to allow authentication
        return event
        
    except Exception as e:
        error_message = str(e)
        print(f"❌ Pre-authentication error: {error_message}")
        
        # If it's our custom deactivation message, re-raise it
        if "deactivated" in error_message.lower():
            raise Exception(error_message)
        
        # For other errors, log but allow login to prevent blocking legitimate users
        print(f"⚠️ Unexpected error in pre-auth, allowing login: {error_message}")
        return event
