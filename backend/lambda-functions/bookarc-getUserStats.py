import json
import pymysql
import os
from decimal import Decimal
from datetime import datetime

# Environment variables
DB_HOST = os.environ['DB_HOST']
DB_NAME = os.environ['DB_NAME']
DB_USER = os.environ['DB_USER']
DB_PASSWORD = os.environ['DB_PASSWORD']

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
}

def get_db_connection():
    """Create database connection"""
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5
    )

def decimal_default(obj):
    """Handle Decimal and datetime objects in JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def lambda_handler(event, context):
    """
    Get comprehensive user statistics including:
    - Basic stats (reviews, ratings, books read, followers/following)
    - Author ratings list
    - Book ratings list
    - Author reviews list
    - Book reviews list
    """
    
    print(f"=== Full Event ===")
    print(json.dumps(event, indent=2))
    
    # Handle OPTIONS request for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        # Try to get user_id from different sources
        user_id = None
        cognito_sub = None
        
        # 1. Check query parameters
        if event.get('queryStringParameters'):
            user_id = event['queryStringParameters'].get('userId')
            print(f"Found userId in query params: {user_id}")
        
        # 2. Check path parameters
        if not user_id and event.get('pathParameters'):
            user_id = event['pathParameters'].get('userId')
            print(f"Found userId in path params: {user_id}")
        
        # 3. Check JWT token from API Gateway authorizer
        if not user_id:
            print("Checking requestContext for authorizer...")
            print(f"RequestContext keys: {event.get('requestContext', {}).keys()}")
            
            request_context = event.get('requestContext', {})
            authorizer = request_context.get('authorizer', {})
            
            print(f"Authorizer keys: {authorizer.keys()}")
            
            # Try different locations where cognito_sub might be
            if 'claims' in authorizer:
                cognito_sub = authorizer['claims'].get('sub')
                print(f"Found cognito_sub in claims: {cognito_sub}")
            elif 'sub' in authorizer:
                cognito_sub = authorizer.get('sub')
                print(f"Found cognito_sub directly in authorizer: {cognito_sub}")
            
            # Sometimes it's in principalId
            if not cognito_sub and 'principalId' in authorizer:
                cognito_sub = authorizer.get('principalId')
                print(f"Found cognito_sub in principalId: {cognito_sub}")
        
        # Validate that we have either user_id or cognito_sub
        if not user_id and not cognito_sub:
            print("ERROR: No user_id or cognito_sub found anywhere!")
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': 'userId parameter or valid JWT token required'
                })
            }
        
        # Connect to database
        connection = get_db_connection()
        
        try:
            with connection.cursor() as cursor:
                # Get user_id from cognito_sub if needed
                if cognito_sub and not user_id:
                    print(f"Looking up user_id for cognito_sub: {cognito_sub}")
                    cursor.execute(
                        "SELECT user_id FROM users WHERE cognito_sub = %s",
                        (cognito_sub,)
                    )
                    result = cursor.fetchone()
                    if not result:
                        print(f"No user found with cognito_sub: {cognito_sub}")
                        return {
                            'statusCode': 404,
                            'headers': CORS_HEADERS,
                            'body': json.dumps({'error': 'User not found'})
                        }
                    user_id = result['user_id']
                    print(f"Found user_id: {user_id}")
                
                # Verify user exists
                cursor.execute(
                    "SELECT user_id, username, display_name, role FROM users WHERE user_id = %s",
                    (user_id,)
                )
                user = cursor.fetchone()
                
                if not user:
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'User not found'})
                    }
                
                # ========================================
                # BASIC STATS
                # ========================================
                
                # ✅ 1. Count books in "Completed" list (books_read)
                cursor.execute("""
                    SELECT COUNT(DISTINCT lb.book_id) as count
                    FROM lists l
                    JOIN list_books lb ON l.list_id = lb.list_id
                    WHERE l.user_id = %s AND l.name = 'Completed'
                """, (user_id,))
                
                books_read = cursor.fetchone()['count']
                print(f"Books read (from Completed list): {books_read}")
                
                # 2. Count total BOOK reviews
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM reviews
                    WHERE user_id = %s
                """, (user_id,))
                
                total_book_reviews = cursor.fetchone()['count']
                print(f"Total book reviews: {total_book_reviews}")
                
                # 2b. Count total AUTHOR reviews
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM author_reviews
                    WHERE user_id = %s
                """, (user_id,))
                
                total_author_reviews = cursor.fetchone()['count']
                print(f"Total author reviews: {total_author_reviews}")
                
                # 3. Count total ratings (BOTH book ratings AND author ratings)
                cursor.execute("""
                    SELECT 
                        (SELECT COUNT(*) FROM ratings WHERE user_id = %s) +
                        (SELECT COUNT(*) FROM author_ratings WHERE user_id = %s) as count
                """, (user_id, user_id))
                
                total_ratings = cursor.fetchone()['count']
                print(f"Total ratings (books + authors): {total_ratings}")
                
                # 4. Count following users
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM user_follow_user
                    WHERE follower_id = %s
                """, (user_id,))
                
                following_users = cursor.fetchone()['count']
                
                # 5. Count followers
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM user_follow_user
                    WHERE following_id = %s
                """, (user_id,))
                
                followers_count = cursor.fetchone()['count']
                
                # 6. Count following authors
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM user_follow_author
                    WHERE user_id = %s
                """, (user_id,))
                
                following_authors = cursor.fetchone()['count']
                
                # ========================================
                # AUTHOR RATINGS LIST
                # ========================================
                
                cursor.execute("""
                    SELECT 
                        ar.author_rating_id,
                        ar.rating_value,
                        ar.created_at as rated_at,
                        a.author_id,
                        a.name as author_name,
                        a.user_id,
                        COALESCE(u.profile_image, '') as author_avatar
                    FROM author_ratings ar
                    JOIN authors a ON ar.author_id = a.author_id
                    LEFT JOIN users u ON a.user_id = u.user_id
                    WHERE ar.user_id = %s
                    ORDER BY ar.created_at DESC
                """, (user_id,))
                
                author_ratings = []
                for row in cursor.fetchall():
                    author_ratings.append({
                        'author_id': row['author_id'],
                        'author_name': row['author_name'],
                        'author_avatar': row['author_avatar'],
                        'rating_value': row['rating_value'],
                        'rated_at': row['rated_at'],
                        'user_id': row['user_id']
                    })
                
                print(f"Author ratings: {len(author_ratings)}")
                
                # ========================================
                # BOOK RATINGS LIST
                # ========================================
                
                cursor.execute("""
                    SELECT 
                        r.rating_id,
                        r.rating_value,
                        r.created_at as rated_at,
                        b.book_id,
                        b.title as book_title,
                        b.cover_image_url as book_cover,
                        GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') as book_author
                    FROM ratings r
                    JOIN books b ON r.book_id = b.book_id
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    WHERE r.user_id = %s
                    GROUP BY r.rating_id, r.rating_value, r.created_at, b.book_id, b.title, b.cover_image_url
                    ORDER BY r.created_at DESC
                """, (user_id,))
                
                book_ratings = []
                for row in cursor.fetchall():
                    book_ratings.append({
                        'book_id': row['book_id'],
                        'book_title': row['book_title'],
                        'book_cover': row['book_cover'] or '',
                        'book_author': row['book_author'] or 'Unknown',
                        'rating_value': row['rating_value'],
                        'rated_at': row['rated_at']
                    })
                
                print(f"Book ratings: {len(book_ratings)}")
                
                # ========================================
                # AUTHOR REVIEWS LIST
                # ========================================
                
                cursor.execute("""
                    SELECT 
                        ar.author_review_id,
                        ar.review_text,
                        ar.created_at,
                        ar.updated_at,
                        a.author_id,
                        a.name as author_name,
                        COALESCE(u.profile_image, '') as author_avatar
                    FROM author_reviews ar
                    JOIN authors a ON ar.author_id = a.author_id
                    LEFT JOIN users u ON a.user_id = u.user_id
                    WHERE ar.user_id = %s
                    ORDER BY ar.created_at DESC
                """, (user_id,))
                
                author_reviews = []
                for row in cursor.fetchall():
                    author_reviews.append({
                        'author_review_id': row['author_review_id'],
                        'author_id': row['author_id'],
                        'author_name': row['author_name'],
                        'author_avatar': row['author_avatar'],
                        'review_text': row['review_text'],
                        'created_at': row['created_at'],
                        'updated_at': row['updated_at']
                    })
                
                print(f"Author reviews: {len(author_reviews)}")
                
                # ========================================
                # BOOK REVIEWS LIST
                # ========================================
                
                cursor.execute("""
                    SELECT 
                        rev.review_id,
                        rev.review_text,
                        rev.created_at,
                        rev.updated_at,
                        b.book_id,
                        b.title as book_title,
                        b.cover_image_url as book_cover,
                        GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') as book_author,
                        COALESCE(r.rating_value, 0) as rating_value
                    FROM reviews rev
                    JOIN books b ON rev.book_id = b.book_id
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    LEFT JOIN ratings r ON rev.book_id = r.book_id AND rev.user_id = r.user_id
                    WHERE rev.user_id = %s
                    GROUP BY rev.review_id, rev.review_text, rev.created_at, rev.updated_at, 
                             b.book_id, b.title, b.cover_image_url, r.rating_value
                    ORDER BY rev.created_at DESC
                """, (user_id,))
                
                book_reviews = []
                for row in cursor.fetchall():
                    book_reviews.append({
                        'review_id': row['review_id'],
                        'book_id': row['book_id'],
                        'book_title': row['book_title'],
                        'book_cover': row['book_cover'] or '',
                        'book_author': row['book_author'] or 'Unknown',
                        'review_text': row['review_text'],
                        'rating_value': row['rating_value'],
                        'created_at': row['created_at'],
                        'updated_at': row['updated_at']
                    })
                
                print(f"Book reviews: {len(book_reviews)}")
                
                # ========================================
                # BUILD COMPREHENSIVE RESPONSE
                # ========================================
                
                response_data = {
                    # Basic stats
                    'user_id': user_id,
                    'total_book_reviews': total_book_reviews,
                    'total_author_reviews': total_author_reviews,
                    'total_ratings': total_ratings,
                    'books_read': books_read,  # ✅ Now from Completed list
                    'followers': followers_count,
                    'following': following_users + following_authors,
                    
                    # Detailed lists
                    'author_ratings': author_ratings,
                    'book_ratings': book_ratings,
                    'author_reviews': author_reviews,
                    'book_reviews': book_reviews
                }
                
                print(f"Successfully retrieved all stats and details")
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps(response_data, default=decimal_default)
                }
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }
