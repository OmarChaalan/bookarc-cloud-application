import json
import pymysql
import os
from datetime import datetime
from notification_service import NotificationService

def lambda_handler(event, context):
    """
    Lambda function for authors to submit new books
    POST /author/books
    Automatically assigns the logged-in author as the book author
    """
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle preflight
    if event['httpMethod'] == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        # Get user from JWT token
        authorizer = event.get('requestContext', {}).get('authorizer', {})
        cognito_sub = authorizer.get('claims', {}).get('sub') if 'claims' in authorizer else authorizer.get('cognito_sub')
        
        print(f"Cognito Sub: {cognito_sub}")
        
        if not cognito_sub:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized. No user identity found.'})
            }
        
        # Parse request body
        body = json.loads(event['body'])
        
        # Validate required fields (NO AUTHORS REQUIRED - we'll add automatically)
        required_fields = ['title', 'genres']
        for field in required_fields:
            if field not in body or not body[field]:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'error': f'Missing required field: {field}'
                    })
                }
        
        # Extract fields
        title = body.get('title', '').strip()
        summary = body.get('summary', '').strip() or None
        isbn = body.get('isbn', '').strip() or None
        publish_date = body.get('publish_date') or None
        cover_image_url = body.get('cover_image_url', '').strip() or None
        genres = body.get('genres', [])  # List of genre names
        
        # Validate genres
        if not isinstance(genres, list) or len(genres) == 0:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'At least one genre is required'})
            }
        
        # Filter empty strings
        genres = [g.strip() for g in genres if g.strip()]
        
        if len(genres) == 0:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Genres cannot be empty'})
            }
        
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
                # Get user info
                cursor.execute("""
                    SELECT user_id, username, display_name, role, verification_status 
                    FROM users 
                    WHERE cognito_sub = %s AND is_active = 1
                """, (cognito_sub,))
                
                user = cursor.fetchone()
                
                if not user:
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'error': 'User not found'})
                    }
                
                # Check if user is verified author
                if user['role'] != 'author':
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({
                            'error': 'Only verified authors can submit books'
                        })
                    }
                
                if user['verification_status'] != 'approved':
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({
                            'error': 'Your author account must be verified first',
                            'verification_status': user['verification_status']
                        })
                    }
                
                # Use display_name if available, otherwise username
                author_name = user['display_name'] if user['display_name'] else user['username']
                
                print(f"Author submitting book: {author_name} (user_id: {user['user_id']})")
                
                # Insert the book (status: pending)
                cursor.execute("""
                    INSERT INTO books (
                        title, summary, isbn, publish_date, 
                        cover_image_url, uploaded_by, 
                        approval_status, source_name, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, 'pending', 'Author Submission', NOW()
                    )
                """, (title, summary, isbn, publish_date, cover_image_url, user['user_id']))
                
                book_id = cursor.lastrowid
                
                # Check if author entry exists for this user
                cursor.execute("""
                    SELECT author_id 
                    FROM authors 
                    WHERE user_id = %s
                """, (user['user_id'],))
                
                author_record = cursor.fetchone()
                
                if author_record:
                    # Author record exists, use it
                    author_id = author_record['author_id']
                    print(f"Using existing author record: {author_id}")
                else:
                    # Create new author entry for this user
                    cursor.execute("""
                        INSERT INTO authors (name, is_registered_author, verified, user_id)
                        VALUES (%s, TRUE, TRUE, %s)
                    """, (author_name, user['user_id']))
                    author_id = cursor.lastrowid
                    print(f"Created new author record: {author_id} for {author_name}")
                
                # Link book to the author
                cursor.execute("""
                    INSERT INTO book_author (book_id, author_id)
                    VALUES (%s, %s)
                """, (book_id, author_id))
                
                # Process genres
                genre_ids = []
                for genre_name in genres:
                    # Check if genre exists
                    cursor.execute("""
                        SELECT genre_id FROM genres WHERE genre_name = %s
                    """, (genre_name,))
                    
                    genre = cursor.fetchone()
                    
                    if genre:
                        genre_ids.append(genre['genre_id'])
                    else:
                        # Create new genre
                        cursor.execute("""
                            INSERT INTO genres (genre_name) VALUES (%s)
                        """, (genre_name,))
                        genre_ids.append(cursor.lastrowid)
                
                # Link book to genres
                for genre_id in genre_ids:
                    cursor.execute("""
                        INSERT INTO book_genre (book_id, genre_id)
                        VALUES (%s, %s)
                    """, (book_id, genre_id))
                
                # Log the submission in admin audit
                cursor.execute("""
                    INSERT INTO admin_audit_logs (
                        admin_user_id, action_type, entity_type, 
                        entity_id, details, timestamp
                    ) VALUES (
                        %s, 'BOOK_SUBMITTED', 'book', %s, %s, NOW()
                    )
                """, (
                    user['user_id'],
                    book_id,
                    json.dumps({
                        'title': title,
                        'author': author_name,
                        'genres': genres
                    })
                ))
                
                conn.commit()
                
                # CREATE NOTIFICATION
                notif_service = NotificationService(conn)
                notif_service.notify_book_submitted(user['user_id'], title)
                
                return {
                    'statusCode': 201,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Book submitted successfully and is pending admin approval',
                        'book': {
                            'book_id': book_id,
                            'title': title,
                            'authors': [author_name],  # Single author - the logged-in user
                            'genres': genres,
                            'isbn': isbn,
                            'publish_date': publish_date,
                            'cover_image_url': cover_image_url,
                            'approval_status': 'pending',
                            'submitted_by': user['username']
                        }
                    })
                }
                
        finally:
            conn.close()
            
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body'})
        }
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
