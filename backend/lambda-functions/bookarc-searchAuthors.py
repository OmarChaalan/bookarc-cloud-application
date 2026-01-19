import json
import pymysql
import os
from decimal import Decimal

# Database configuration
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

def decimal_default(obj):
    """Convert Decimal to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

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
    Main Lambda handler for author search and profile endpoints
    Routes:
    - GET /author?q=search&limit=20 -> search_authors()
    - GET /author/{user_id}?type=registered|external -> get_author_profile()
    ✅ PUBLIC ACCESS - No authentication required
    """
    
    http_method = event.get('httpMethod')
    path_parameters = event.get('pathParameters') or {}
    query_parameters = event.get('queryStringParameters') or {}
    
    # Handle preflight
    if http_method == 'OPTIONS':
        return cors_response(200, {'message': 'OK'})
    
    print(f"Method: {http_method}, PathParams: {path_parameters}, Query: {query_parameters}")
    
    try:
        # Route: GET /author?q=search
        if http_method == 'GET' and not path_parameters.get('user_id'):
            return search_authors(query_parameters)
        
        # Route: GET /author/{user_id}?type=registered|external
        elif http_method == 'GET' and path_parameters.get('user_id'):
            author_type = query_parameters.get('type', 'auto')
            return get_author_profile(int(path_parameters['user_id']), author_type)
        
        else:
            return cors_response(404, {'message': 'Route not found'})
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return cors_response(500, {'message': f'Internal server error: {str(e)}'})

def cors_response(status_code, data):
    """Helper to create CORS-enabled responses"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        'body': json.dumps(data, default=decimal_default)
    }

def search_authors(query_params):
    """
    Search for authors - includes BOTH registered users and external authors
    GET /author?q=search&limit=20
    ✅ PUBLIC ACCESS
    🔧 FIXED: Returns proper IDs and types for navigation
    """
    search_query = query_params.get('q', '').strip()
    limit = min(int(query_params.get('limit', 20)), 50)
    
    print(f"Searching for: '{search_query}' (limit: {limit})")
    
    if len(search_query) < 2:
        return cors_response(200, {
            'message': 'Search query must be at least 2 characters',
            'authors': [],
            'total': 0,
            'query': search_query
        })
    
    connection = get_db_connection()
    
    try:
        with connection.cursor() as cursor:
            # FIXED: Separate queries to ensure correct ID mapping
            
            # Query 1: Registered authors (return user_id as 'id')
            registered_sql = """
                SELECT 
                    u.user_id as id,
                    COALESCE(u.display_name, u.username) as name,
                    u.email,
                    u.profile_image as avatarUrl,
                    u.bio,
                    u.location,
                    u.created_at,
                    u.verification_status,
                    COALESCE(a.verified, 0) as author_verified,
                    COALESCE(a.author_id, 0) as author_id,
                    COALESCE(a.average_rating, 0.00) as author_avg_rating,
                    (SELECT COUNT(*) FROM user_follow_user WHERE following_id = u.user_id) +
                    COALESCE((SELECT COUNT(*) FROM user_follow_author WHERE author_id = a.author_id), 0) as followers,
                    'registered' as author_type
                FROM users u
                LEFT JOIN authors a ON u.user_id = a.user_id AND a.is_registered_author = TRUE
                WHERE u.role = 'author' AND u.is_active = 1
                AND COALESCE(u.display_name, u.username) LIKE %s
                LIMIT %s
            """
            
            # Query 2: External authors (return author_id as 'id')
            external_sql = """
                SELECT 
                    a.author_id as id,
                    a.name,
                    '' as email,
                    '' as avatarUrl,
                    COALESCE(a.bio, '') as bio,
                    '' as location,
                    NOW() as created_at,
                    'none' as verification_status,
                    COALESCE(a.verified, 0) as author_verified,
                    a.author_id,
                    COALESCE(a.average_rating, 0.00) as author_avg_rating,
                    COALESCE((SELECT COUNT(*) FROM user_follow_author WHERE author_id = a.author_id), 0) as followers,
                    'external' as author_type
                FROM authors a
                WHERE a.is_registered_author = FALSE
                AND a.name LIKE %s
                LIMIT %s
            """
            
            search_pattern = f"%{search_query}%"
            
            # Execute both queries
            cursor.execute(registered_sql, (search_pattern, limit))
            registered_results = cursor.fetchall()
            
            cursor.execute(external_sql, (search_pattern, limit))
            external_results = cursor.fetchall()
            
            # Combine results
            all_results = list(registered_results) + list(external_results)
            
            # Limit total results
            results = all_results[:limit]
            
            print(f"Found {len(registered_results)} registered + {len(external_results)} external = {len(results)} total authors")
            
            # Debug: Log each result
            for idx, row in enumerate(results):
                print(f"   Result {idx + 1}: id={row['id']}, name={row['name']}, type={row['author_type']}")
            
            # Get stats for each author
            authors = []
            for row in results:
                stats = get_author_stats(cursor, row['author_id'], row['author_type'])
                formatted = format_author(row, stats)
                authors.append(formatted)
            
            return cors_response(200, {
                'authors': authors,
                'total': len(authors),
                'query': search_query
            })
    
    finally:
        connection.close()

def get_author_profile(author_or_user_id, author_type_hint='auto'):
    """
    Get detailed author profile
    Handles BOTH registered (user_id) and external (author_id)
    
    🔧 FIXED: Uses type hint to avoid ID collision
    
    Args:
        author_or_user_id: The ID to lookup
        author_type_hint: 'auto', 'registered', or 'external'
    
    ✅ PUBLIC ACCESS
    """
    print(f"Getting author profile for ID: {author_or_user_id}, type hint: {author_type_hint}")
    
    connection = get_db_connection()
    
    try:
        with connection.cursor() as cursor:
            
            # 🔧 If external type hint, check external authors only
            if author_type_hint == 'external':
                print(f"Type hint = 'external', checking external authors table only")
                author = get_external_author(cursor, author_or_user_id)
                
                if author:
                    print(f"Found as EXTERNAL author: {author['name']}")
                    return build_external_author_response(cursor, author)
                
                return cors_response(404, {'message': f'External author with ID {author_or_user_id} not found'})
            
            # 🔧 If registered type hint, check registered authors only
            if author_type_hint == 'registered':
                print(f"Type hint = 'registered', checking registered authors (users) only")
                author = get_registered_author(cursor, author_or_user_id)
                
                if author:
                    print(f"Found as REGISTERED author: {author['display_name'] or author['username']}")
                    return build_registered_author_response(cursor, author)
                
                return cors_response(404, {'message': f'Registered author with ID {author_or_user_id} not found'})
            
            # Auto mode: Try registered first, then external
            print(f"Auto mode: trying registered author first...")
            author = get_registered_author(cursor, author_or_user_id)
            
            if author:
                print(f"Found as REGISTERED author: {author['display_name'] or author['username']}")
                return build_registered_author_response(cursor, author)
            
            # Try as external author
            print(f"Not found as registered, trying external author...")
            author = get_external_author(cursor, author_or_user_id)
            
            if author:
                print(f"Found as EXTERNAL author: {author['name']}")
                return build_external_author_response(cursor, author)
            
            return cors_response(404, {'message': f'Author with ID {author_or_user_id} not found'})
    
    finally:
        connection.close()

def build_registered_author_response(cursor, author):
    """Build response for registered author"""
    print(f"🔑 User ID: {author['user_id']}, Author ID: {author['author_id']}")
    
    books = get_author_books(cursor, author['author_id'])
    stats = get_author_stats(cursor, author['author_id'], 'registered')
    stats['followers'] = int(author['user_followers']) + int(author['author_followers'])
    
    author_rating_stats = get_author_rating_stats(cursor, author['author_id'])
    
    return cors_response(200, {
        'id': author['user_id'],
        'authorId': author['author_id'],
        'name': author['display_name'] or author['username'],
        'email': author['email'],
        'avatarUrl': author['profile_image'] or '',
        'bio': author['bio'] or '',
        'location': author['location'] or '',
        'website': '',
        'verified': author['verification_status'] == 'approved' or author.get('author_verified') == 1,
        'joinDate': author['created_at'].strftime('%B %Y') if author.get('created_at') else '',
        'authorType': 'registered',
        'stats': {
            **stats,
            **author_rating_stats
        },
        'books': books
    })

def build_external_author_response(cursor, author):
    """Build response for external author"""
    print(f"🔑 Author ID: {author['author_id']}")
    
    books = get_author_books(cursor, author['author_id'])
    stats = get_author_stats(cursor, author['author_id'], 'external')
    stats['followers'] = int(author['follower_count'])
    
    author_rating_stats = get_author_rating_stats(cursor, author['author_id'])
    
    return cors_response(200, {
        'id': author['author_id'],
        'authorId': author['author_id'],
        'name': author['name'],
        'email': '',
        'avatarUrl': '',
        'bio': author['bio'] or '',
        'location': '',
        'website': '',
        'verified': author['verified'] == 1,
        'joinDate': '',
        'authorType': 'external',
        'stats': {
            **stats,
            **author_rating_stats
        },
        'books': books
    })

def get_registered_author(cursor, user_id):
    """Get registered author info"""
    sql = """
        SELECT 
            u.user_id, u.username, u.display_name, u.email, u.profile_image,
            u.bio, u.location, u.created_at, u.verification_status,
            a.author_id, a.verified as author_verified, a.average_rating as author_avg_rating,
            (SELECT COUNT(*) FROM user_follow_user WHERE following_id = u.user_id) as user_followers,
            COALESCE((SELECT COUNT(*) FROM user_follow_author WHERE author_id = a.author_id), 0) as author_followers
        FROM users u
        LEFT JOIN authors a ON u.user_id = a.user_id AND a.is_registered_author = TRUE
        WHERE u.user_id = %s AND u.role = 'author' AND u.is_active = 1
    """
    cursor.execute(sql, (user_id,))
    return cursor.fetchone()

def get_external_author(cursor, author_id):
    """Get external author info"""
    sql = """
        SELECT 
            a.author_id, a.name, a.bio, a.verified, a.average_rating as author_avg_rating,
            COALESCE((SELECT COUNT(*) FROM user_follow_author WHERE author_id = a.author_id), 0) as follower_count
        FROM authors a
        WHERE a.author_id = %s AND a.is_registered_author = FALSE
    """
    cursor.execute(sql, (author_id,))
    return cursor.fetchone()

def get_author_books(cursor, author_id):
    """Get all approved books for an author"""
    if not author_id:
        return []
    
    sql = """
        SELECT 
            b.book_id, b.title, b.summary, b.cover_image_url, 
            b.publish_date, b.average_rating,
            YEAR(b.publish_date) as publish_year,
            GROUP_CONCAT(DISTINCT a2.name ORDER BY a2.name SEPARATOR ', ') as all_authors,
            GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') as genres,
            COUNT(DISTINCT r.rating_id) as rating_count
        FROM books b
        JOIN book_author ba ON b.book_id = ba.book_id
        LEFT JOIN book_author ba2 ON b.book_id = ba2.book_id
        LEFT JOIN authors a2 ON ba2.author_id = a2.author_id
        LEFT JOIN book_genre bg ON b.book_id = bg.book_id
        LEFT JOIN genres g ON bg.genre_id = g.genre_id
        LEFT JOIN ratings r ON b.book_id = r.book_id
        WHERE ba.author_id = %s AND b.approval_status = 'approved'
        GROUP BY b.book_id
        ORDER BY b.publish_date DESC
    """
    
    cursor.execute(sql, (author_id,))
    results = cursor.fetchall()
    
    return [{
        'id': book['book_id'],
        'title': book['title'],
        'author': book['all_authors'] or 'Unknown',
        'cover': book['cover_image_url'] or '',
        'coverUrl': book['cover_image_url'] or '',
        'rating': float(book['average_rating'] or 0),
        'totalRatings': int(book['rating_count']),
        'genre': book['genres'].split(', ')[0] if book['genres'] else 'Fiction',
        'description': book['summary'] or '',
        'publishYear': int(book['publish_year']) if book['publish_year'] else 2024
    } for book in results]

def get_author_stats(cursor, author_id, author_type):
    """Calculate author statistics"""
    if not author_id:
        return {'totalBooks': 0, 'totalReads': 0, 'totalRatings': 0, 'avgRating': 0, 'followers': 0}
    
    sql = """
        SELECT 
            COUNT(DISTINCT b.book_id) as total_books,
            COUNT(DISTINCT r.rating_id) as total_ratings,
            COALESCE(AVG(b.average_rating), 0) as avg_rating
        FROM book_author ba
        JOIN books b ON ba.book_id = b.book_id AND b.approval_status = 'approved'
        LEFT JOIN ratings r ON b.book_id = r.book_id
        WHERE ba.author_id = %s
    """
    
    cursor.execute(sql, (author_id,))
    result = cursor.fetchone()
    
    return {
        'totalBooks': int(result['total_books'] or 0),
        'totalReads': int(result['total_ratings'] or 0) * 5,
        'totalRatings': int(result['total_ratings'] or 0),
        'avgRating': round(float(result['avg_rating'] or 0), 2),
        'followers': 0
    }

def get_author_rating_stats(cursor, author_id):
    """Get author-specific rating statistics"""
    if not author_id:
        return {
            'totalReviews': 0,
            'ratingBreakdown': {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0}
        }
    
    cursor.execute("""
        SELECT COALESCE(average_rating, 0) as avg_rating
        FROM authors
        WHERE author_id = %s
    """, (author_id,))
    
    author_result = cursor.fetchone()
    author_avg_rating = float(author_result['avg_rating']) if author_result else 0.0
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total_ratings,
            SUM(CASE WHEN rating_value = 5 THEN 1 ELSE 0 END) as five_star,
            SUM(CASE WHEN rating_value = 4 THEN 1 ELSE 0 END) as four_star,
            SUM(CASE WHEN rating_value = 3 THEN 1 ELSE 0 END) as three_star,
            SUM(CASE WHEN rating_value = 2 THEN 1 ELSE 0 END) as two_star,
            SUM(CASE WHEN rating_value = 1 THEN 1 ELSE 0 END) as one_star
        FROM author_ratings
        WHERE author_id = %s
    """, (author_id,))
    
    rating_result = cursor.fetchone()
    
    cursor.execute("""
        SELECT COUNT(*) as total_reviews
        FROM author_reviews
        WHERE author_id = %s
    """, (author_id,))
    
    review_result = cursor.fetchone()
    
    return {
        'avgRating': round(author_avg_rating, 2),
        'totalRatings': int(rating_result['total_ratings'] or 0),
        'totalReviews': int(review_result['total_reviews'] or 0),
        'ratingBreakdown': {
            '5': int(rating_result['five_star'] or 0),
            '4': int(rating_result['four_star'] or 0),
            '3': int(rating_result['three_star'] or 0),
            '2': int(rating_result['two_star'] or 0),
            '1': int(rating_result['one_star'] or 0)
        }
    }

def format_author(row, stats):
    """Format author data for response"""
    is_verified = row['verification_status'] == 'approved' or row['author_verified'] == 1
    
    try:
        join_date = row['created_at'].strftime('%B %Y') if row['created_at'] else ''
    except (AttributeError, ValueError):
        join_date = ''
    
    return {
        'id': row['id'],
        'name': row['name'],
        'email': row['email'],
        'avatarUrl': row['avatarUrl'] or '',
        'bio': row['bio'] or '',
        'location': row['location'] or '',
        'website': '',
        'verified': is_verified,
        'joinDate': join_date,
        'authorType': row['author_type'],
        'stats': {
            'totalBooks': stats['totalBooks'],
            'totalReads': stats['totalReads'],
            'totalRatings': stats['totalRatings'],
            'avgRating': stats['avgRating'],
            'followers': int(row['followers'])
        }
    }
