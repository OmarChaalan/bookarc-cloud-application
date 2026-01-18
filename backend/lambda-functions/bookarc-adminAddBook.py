import json
import pymysql
import os
from datetime import datetime

def get_db_connection():
    """Create database connection"""
    return pymysql.connect(
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME'],
        cursorclass=pymysql.cursors.DictCursor
    )

def cors_response(status_code, body):
    """Helper function to return CORS-enabled responses"""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }

def check_admin_role(cognito_sub, cursor):
    """Check if user is admin by querying database"""
    cursor.execute("""
        SELECT user_id, role 
        FROM users 
        WHERE cognito_sub = %s
    """, (cognito_sub,))
    
    result = cursor.fetchone()
    if not result:
        return None, False
    
    return result['user_id'], result['role'] == 'admin'

def lambda_handler(event, context):
    """
    Add a new book to the database
    POST /admin/books/add
    Body: {
        "title": "Book Title",
        "summary": "Book summary",
        "isbn": "978-3-16-148410-0",
        "publish_date": "2023-01-15",
        "cover_image_url": "https://...",
        "source_name": "Manual",
        "authors": ["Author 1", "Author 2"],
        "genres": ["Fiction", "Mystery"]
    }
    """
    
    # Handle OPTIONS preflight request
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        # Get cognito_sub from authorizer context
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        cognito_sub = claims.get('sub')
        
        if not cognito_sub:
            return cors_response(401, {'error': 'Unauthorized - No user identity'})
        
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            return cors_response(400, {'error': 'Invalid JSON in request body'})
        
        # Validate required fields
        title = body.get('title', '').strip()
        authors = body.get('authors', [])
        genres = body.get('genres', [])
        
        if not title:
            return cors_response(400, {'error': 'Title is required'})
        
        if not authors or not any(a.strip() for a in authors):
            return cors_response(400, {'error': 'At least one author is required'})
        
        if not genres or not any(g.strip() for g in genres):
            return cors_response(400, {'error': 'At least one genre is required'})
        
        # Get optional fields
        summary = body.get('summary', '').strip() or None
        isbn = body.get('isbn', '').strip() or None
        publish_date = body.get('publish_date') or None
        cover_image_url = body.get('cover_image_url', '').strip() or None
        source_name = body.get('source_name', 'Manual').strip()
        
        # Clean author and genre lists
        authors = [a.strip() for a in authors if a.strip()]
        genres = [g.strip() for g in genres if g.strip()]
        
        # Connect to database
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                # Check if user is admin
                admin_user_id, is_admin = check_admin_role(cognito_sub, cursor)
                
                if not is_admin:
                    print(f"User {cognito_sub} is not admin")
                    return cors_response(403, {'error': 'Forbidden - Admin access required'})
                
                # Insert book
                cursor.execute("""
                    INSERT INTO books 
                    (title, summary, isbn, publish_date, cover_image_url, 
                     uploaded_by, approval_status, approved_by, approved_at, source_name)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    title, summary, isbn, publish_date, cover_image_url,
                    admin_user_id, 'approved', admin_user_id, datetime.now(), source_name
                ))
                
                book_id = cursor.lastrowid
                
                # Process authors
                author_ids = []
                for author_name in authors:
                    # Check if author exists
                    cursor.execute("""
                        SELECT author_id FROM authors 
                        WHERE name = %s
                    """, (author_name,))
                    
                    existing_author = cursor.fetchone()
                    
                    if existing_author:
                        author_id = existing_author['author_id']
                    else:
                        # Create new author
                        cursor.execute("""
                            INSERT INTO authors (name, is_registered_author, verified)
                            VALUES (%s, FALSE, FALSE)
                        """, (author_name,))
                        author_id = cursor.lastrowid
                    
                    author_ids.append(author_id)
                    
                    # Link book to author
                    cursor.execute("""
                        INSERT INTO book_author (book_id, author_id)
                        VALUES (%s, %s)
                    """, (book_id, author_id))
                
                # Process genres
                genre_ids = []
                for genre_name in genres:
                    # Check if genre exists
                    cursor.execute("""
                        SELECT genre_id FROM genres 
                        WHERE genre_name = %s
                    """, (genre_name,))
                    
                    existing_genre = cursor.fetchone()
                    
                    if existing_genre:
                        genre_id = existing_genre['genre_id']
                    else:
                        # Create new genre
                        cursor.execute("""
                            INSERT INTO genres (genre_name)
                            VALUES (%s)
                        """, (genre_name,))
                        genre_id = cursor.lastrowid
                    
                    genre_ids.append(genre_id)
                    
                    # Link book to genre
                    cursor.execute("""
                        INSERT INTO book_genre (book_id, genre_id)
                        VALUES (%s, %s)
                    """, (book_id, genre_id))
                
                # Log the action in audit logs
                cursor.execute("""
                    INSERT INTO admin_audit_logs 
                    (admin_user_id, action_type, entity_type, entity_id, details)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    admin_user_id,
                    'BOOK_ADD',
                    'book',
                    book_id,
                    json.dumps({
                        'title': title,
                        'authors': authors,
                        'genres': genres,
                        'isbn': isbn,
                        'source_name': source_name
                    })
                ))
                
                connection.commit()
                
                print(f"Book '{title}' (ID: {book_id}) added successfully by admin {admin_user_id}")
            
                return cors_response(200, {
                    'message': 'Book added successfully',
                    'book': {
                        'book_id': book_id,
                        'title': title,
                        'authors': authors,
                        'genres': genres,
                        'isbn': isbn,
                        'publish_date': publish_date,
                        'cover_image_url': cover_image_url,
                        'source_name': source_name
                    }
                })
                
        finally:
            connection.close()
        
    except Exception as e:
        print(f"Error adding book: {str(e)}")
        import traceback
        traceback.print_exc()
        return cors_response(500, {
            'error': 'Failed to add book',
            'message': str(e)
        })
