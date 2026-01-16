import json
import pymysql
import os

DB_HOST = os.environ['DB_HOST']
DB_USER = os.environ['DB_USER']
DB_PASSWORD = os.environ['DB_PASSWORD']
DB_NAME = os.environ['DB_NAME']

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

def lambda_handler(event, context):
    print("Post-confirmation event received:", json.dumps(event))

    try:
        user_attributes = event['request']['userAttributes']

        cognito_sub = user_attributes['sub']
        email = user_attributes['email']

        # Get username from preferred_username (set during registration)
        username = user_attributes.get('preferred_username')
        
        # Get display name from 'name' attribute
        display_name = user_attributes.get('name')
        
        # Fallback if something went wrong
        if not username:
            username = email.split('@')[0]
        if not display_name:
            display_name = username

        print(f"Creating user profile:")
        print(f"  - username (permanent): {username}")
        print(f"  - display_name (changeable): {display_name}")
        print(f"  - email: {email}")
        print(f"  - cognito_sub: {cognito_sub}")

        connection = get_db_connection()

        try:
            with connection.cursor() as cursor:
                # Idempotency check
                cursor.execute(
                    "SELECT user_id FROM users WHERE cognito_sub = %s",
                    (cognito_sub,)
                )
                if cursor.fetchone():
                    print("User already exists, skipping insert.")
                    return event

                # Insert both username and display_name
                insert_query = """
                    INSERT INTO users (
                        username,
                        display_name,
                        email,
                        cognito_sub,
                        role,
                        is_public,
                        join_date
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """

                cursor.execute(insert_query, (
                    username,        # Permanent username
                    display_name,    # Changeable display name
                    email,
                    cognito_sub,
                    'normal',
                    True
                ))

                user_id = cursor.lastrowid
                connection.commit()

                print(f"User created with user_id: {user_id}")

                # Create default reading lists
                default_lists = [
                    'Reading',
                    'Completed',
                    'Plan to Read',
                    'On-Hold',
                    'Dropped'
                ]

                list_query = """
                    INSERT INTO lists (user_id, name, visibility)
                    VALUES (%s, %s, 'private')
                """

                for name in default_lists:
                    cursor.execute(list_query, (user_id, name))

                connection.commit()
                print(f"Default lists created for user_id: {user_id}")

        finally:
            connection.close()

        return event

    except Exception as e:
        print("Post-confirmation error:", str(e))
        import traceback
        traceback.print_exc()
        return event
