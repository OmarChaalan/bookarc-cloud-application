import json
import pymysql
import os
import re

# ==================== DATABASE CONFIG ====================

DB_CONFIG = {
    'host': os.environ.get('DB_HOST'),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

# ==================== HELPERS ====================

def get_connection():
    return pymysql.connect(**DB_CONFIG)

def success_response(data, status_code=200):
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(data, default=str)
    }

def error_response(message, status_code=400):
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        'body': json.dumps({'message': message})
    }

def get_param(params, *names):
    """
    Safely get a path parameter.
    Accepts multiple possible names (book_id OR id).
    """
    for name in names:
        if params.get(name):
            return int(params[name])
    raise ValueError(f"Missing path parameter: {names}")

def get_user_id(connection, cognito_sub):
    with connection.cursor() as cursor:
        cursor.execute(
            'SELECT user_id FROM users WHERE cognito_sub = %s',
            (cognito_sub,)
        )
        user = cursor.fetchone()
        if not user:
            raise ValueError('User not found')
        return user['user_id']

# ==================== LIST HANDLERS ====================

def create_custom_list(connection, user_id, body):
    title = body.get('title', '').strip()
    visibility = body.get('visibility', 'private')

    if not title:
        raise ValueError('List title is required')

    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO lists (user_id, name, title, visibility, created_at, updated_at)
            VALUES (%s, 'Custom', %s, %s, NOW(), NOW())
        """, (user_id, title, visibility))

        connection.commit()
        list_id = cursor.lastrowid

        return success_response({
            'message': 'List created successfully',
            'list': {
                'list_id': list_id,
                'user_id': user_id,
                'name': 'Custom',
                'title': title,
                'visibility': visibility
            }
        }, 201)

def get_user_lists(connection, user_id):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT l.*, COUNT(lb.book_id) AS book_count
            FROM lists l
            LEFT JOIN list_books lb ON l.list_id = lb.list_id
            WHERE l.user_id = %s
            GROUP BY l.list_id
            ORDER BY 
                CASE l.name
                    WHEN 'Reading' THEN 1
                    WHEN 'Completed' THEN 2
                    WHEN 'Plan to Read' THEN 3
                    WHEN 'On-Hold' THEN 4
                    WHEN 'Dropped' THEN 5
                    ELSE 6
                END,
                l.created_at
        """, (user_id,))
        return success_response({'lists': cursor.fetchall()})

def get_list_by_id(connection, user_id, list_id):
    """
    IMPROVED VERSION - Fetches books with authors and genre
    """
    with connection.cursor() as cursor:
        # Get list details
        cursor.execute("""
           SELECT * FROM lists
       WHERE list_id = %s 
       AND (user_id = %s OR visibility = 'public')
        """, (list_id, user_id))
        lst = cursor.fetchone()

        if not lst:
            raise ValueError('List not found')

        # Get books in the list with enhanced details
        cursor.execute("""
            SELECT 
                b.book_id,
                b.title,
                b.cover_image_url,
                b.average_rating,
                b.summary,
                lb.added_at,
                (
                    SELECT GROUP_CONCAT(a.name SEPARATOR ', ')
                    FROM book_author ba
                    JOIN authors a ON ba.author_id = a.author_id
                    WHERE ba.book_id = b.book_id
                ) as authors,
                (
                    SELECT g.genre_name
                    FROM book_genre bg
                    JOIN genres g ON bg.genre_id = g.genre_id
                    WHERE bg.book_id = b.book_id
                    LIMIT 1
                ) as genre
            FROM list_books lb
            JOIN books b ON lb.book_id = b.book_id
            WHERE lb.list_id = %s
            ORDER BY lb.added_at DESC
        """, (list_id,))
        
        books = cursor.fetchall()
        
        # Process books to convert authors string to array
        for book in books:
            if book.get('authors'):
                book['authors'] = book['authors'].split(', ')
            else:
                book['authors'] = []
        
        lst['books'] = books

        return success_response({'list': lst})

def add_book_to_list(connection, user_id, list_id, body):
    book_id = body.get('book_id')
    if not book_id:
        raise ValueError('book_id is required')

    with connection.cursor() as cursor:
        # Verify list belongs to user
        cursor.execute(
            'SELECT 1 FROM lists WHERE list_id = %s AND user_id = %s',
            (list_id, user_id)
        )
        if not cursor.fetchone():
            raise ValueError('List not found or access denied')

        # Add book to list
        cursor.execute("""
            INSERT INTO list_books (list_id, book_id, added_at)
            VALUES (%s, %s, NOW())
            ON DUPLICATE KEY UPDATE added_at = NOW()
        """, (list_id, book_id))

        connection.commit()

        return success_response({'message': 'Book added to list successfully'}, 201)

def remove_book_from_list(connection, user_id, list_id, book_id):
    with connection.cursor() as cursor:
        # Verify list belongs to user
        cursor.execute(
            'SELECT 1 FROM lists WHERE list_id = %s AND user_id = %s',
            (list_id, user_id)
        )
        if not cursor.fetchone():
            raise ValueError('List not found or access denied')

        # Remove book from list
        cursor.execute(
            'DELETE FROM list_books WHERE list_id = %s AND book_id = %s',
            (list_id, book_id)
        )
        connection.commit()

        return success_response({'message': 'Book removed from list successfully'})

def get_book_lists(connection, user_id, book_id):
    """
    Returns ALL user lists with is_added flag for a specific book
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                l.list_id, 
                l.name, 
                l.title,
                l.visibility,
                l.created_at,
                l.updated_at,
                CASE 
                    WHEN lb.book_id IS NOT NULL THEN 1
                    ELSE 0
                END AS is_added,
                lb.added_at,
                (SELECT COUNT(*) FROM list_books WHERE list_id = l.list_id) AS book_count
            FROM lists l
            LEFT JOIN list_books lb ON l.list_id = lb.list_id AND lb.book_id = %s
            WHERE l.user_id = %s
            ORDER BY 
                CASE l.name
                    WHEN 'Reading' THEN 1
                    WHEN 'Completed' THEN 2
                    WHEN 'Plan to Read' THEN 3
                    WHEN 'On-Hold' THEN 4
                    WHEN 'Dropped' THEN 5
                    ELSE 6
                END,
                l.created_at
        """, (book_id, user_id))
        
        lists = cursor.fetchall()
        
        # Convert is_added to boolean
        for lst in lists:
            lst['is_added'] = bool(lst['is_added'])
        
        return success_response({'lists': lists})

def update_list(connection, user_id, list_id, body):
    """Update list title and/or visibility"""
    title = body.get('title')
    visibility = body.get('visibility')
    
    if not title and not visibility:
        raise ValueError('No updates provided')
    
    with connection.cursor() as cursor:
        # Verify list belongs to user
        cursor.execute(
            'SELECT * FROM lists WHERE list_id = %s AND user_id = %s',
            (list_id, user_id)
        )
        lst = cursor.fetchone()
        
        if not lst:
            raise ValueError('List not found or access denied')
        
        # Build update query
        updates = []
        params = []
        
        if title is not None:
            updates.append('title = %s')
            params.append(title)
        
        if visibility is not None:
            updates.append('visibility = %s')
            params.append(visibility)
        
        updates.append('updated_at = NOW()')
        params.extend([list_id, user_id])
        
        query = f"UPDATE lists SET {', '.join(updates)} WHERE list_id = %s AND user_id = %s"
        cursor.execute(query, params)
        connection.commit()
        
        # Get updated list
        cursor.execute(
            'SELECT * FROM lists WHERE list_id = %s AND user_id = %s',
            (list_id, user_id)
        )
        updated_list = cursor.fetchone()
        
        return success_response({
            'message': 'List updated successfully',
            'list': updated_list
        })

def delete_list(connection, user_id, list_id):
    """Delete a custom list"""
    with connection.cursor() as cursor:
        # Verify list belongs to user and is custom
        cursor.execute(
            'SELECT name FROM lists WHERE list_id = %s AND user_id = %s',
            (list_id, user_id)
        )
        lst = cursor.fetchone()
        
        if not lst:
            raise ValueError('List not found or access denied')
        
        if lst['name'] != 'Custom':
            raise ValueError('Cannot delete default lists')
        
        # Delete list (will cascade delete list_books)
        cursor.execute(
            'DELETE FROM lists WHERE list_id = %s AND user_id = %s',
            (list_id, user_id)
        )
        connection.commit()
        
        return success_response({'message': 'List deleted successfully'})

# ==================== MAIN HANDLER ====================

def lambda_handler(event, context):
    connection = None

    try:
        print("RAW EVENT:", json.dumps(event))

        # -------- Normalize path (remove /prod or other stage prefix) --------
        path = event['path']
        stage = event['requestContext'].get('stage')
        if stage and path.startswith(f'/{stage}'):
            path = path[len(stage) + 1:]

        http_method = event['httpMethod']
        path_parameters = event.get('pathParameters') or {}
        body = json.loads(event['body']) if event.get('body') else {}

        print("PATH:", path)
        print("HTTP METHOD:", http_method)
        print("PATH PARAMS:", path_parameters)

        # -------- Auth --------
        authorizer = event['requestContext'].get('authorizer')
        if not authorizer or 'claims' not in authorizer:
            return error_response('Unauthorized', 401)

        cognito_sub = authorizer['claims']['sub']

        # -------- DB --------
        connection = get_connection()
        user_id = get_user_id(connection, cognito_sub)

        print("USER ID:", user_id)

        # -------- ROUTES --------

        # GET /lists - Get all user lists
        if http_method == 'GET' and path == '/lists':
            return get_user_lists(connection, user_id)

        # GET /lists/{list_id} - Get specific list with books
        if http_method == 'GET' and re.match(r'^/lists/\d+$', path):
            list_id = get_param(path_parameters, 'list_id', 'id')
            return get_list_by_id(connection, user_id, list_id)

        # POST /lists - Create custom list
        if http_method == 'POST' and path == '/lists':
            return create_custom_list(connection, user_id, body)

        # PUT /lists/{list_id} - Update list
        if http_method == 'PUT' and re.match(r'^/lists/\d+$', path):
            list_id = get_param(path_parameters, 'list_id', 'id')
            return update_list(connection, user_id, list_id, body)

        # DELETE /lists/{list_id} - Delete custom list
        if http_method == 'DELETE' and re.match(r'^/lists/\d+$', path):
            list_id = get_param(path_parameters, 'list_id', 'id')
            return delete_list(connection, user_id, list_id)

        # POST /lists/{list_id}/books - Add book to list
        if http_method == 'POST' and re.match(r'^/lists/\d+/books$', path):
            list_id = get_param(path_parameters, 'list_id', 'id')
            return add_book_to_list(connection, user_id, list_id, body)

        # DELETE /lists/{list_id}/books/{book_id} - Remove book from list
        if http_method == 'DELETE' and re.match(r'^/lists/\d+/books/\d+$', path):
            list_id = get_param(path_parameters, 'list_id', 'id')
            book_id = get_param(path_parameters, 'book_id', 'id')
            return remove_book_from_list(connection, user_id, list_id, book_id)

        # GET /books/{book_id}/lists - Get all lists with is_added flag for this book
        if http_method == 'GET' and re.match(r'^/books/\d+/lists$', path):
            book_id = get_param(path_parameters, 'book_id', 'id')
            return get_book_lists(connection, user_id, book_id)

        return error_response('Route not found', 404)

    except ValueError as e:
        print("VALUE ERROR:", str(e))
        return error_response(str(e), 400)

    except Exception as e:
        print("UNEXPECTED ERROR:", str(e))
        import traceback
        traceback.print_exc()
        return error_response('Internal server error', 500)

    finally:
        if connection:
            connection.close()
