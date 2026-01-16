import json
import pymysql
import os
from decimal import Decimal
from typing import Dict, Any, List

# Database configuration
DB_CONFIG = {
    'host': os.environ.get('DB_HOST'),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
    'cursorclass': pymysql.cursors.DictCursor
}

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
}

def response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized API response"""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=lambda x: float(x) if isinstance(x, Decimal) else None)
    }

def get_user_profile(cursor, user_id: int) -> Dict[str, Any]:
    """Get user profile with stats"""
    cursor.execute("""
        SELECT 
            u.user_id as id,
            u.username,
            u.display_name as displayName,
            u.email,
            u.profile_image as avatarUrl,
            u.bio,
            u.location,
            u.is_public as isPublic,
            u.created_at as joinDate,
            (SELECT COUNT(*) FROM reviews r WHERE r.user_id = u.user_id) as totalReviews,
            (SELECT COUNT(*) FROM ratings rat WHERE rat.user_id = u.user_id) as totalRatings,
            (SELECT COUNT(DISTINCT urs.book_id) FROM user_reading_status urs 
             WHERE urs.user_id = u.user_id AND urs.status = 'completed') as booksRead,
            (SELECT COUNT(*) FROM user_follow_user ufu WHERE ufu.following_id = u.user_id) as followers,
            (SELECT COUNT(*) FROM user_follow_user ufu WHERE ufu.follower_id = u.user_id) as following
        FROM users u
        WHERE u.user_id = %s
    """, (user_id,))
    
    user = cursor.fetchone()
    print(f"Query result: {user}")
    return user

def get_user_lists(cursor, user_id: int) -> List[Dict[str, Any]]:
    """Get user's reading lists"""
    cursor.execute("""
        SELECT 
            l.list_id as id,
            CASE 
                WHEN l.name = 'Custom' THEN l.title
                ELSE l.name
            END as name,
            (SELECT COUNT(*) FROM list_books lb WHERE lb.list_id = l.list_id) as count,
            CASE WHEN l.visibility = 'public' THEN TRUE ELSE FALSE END as isPublic
        FROM lists l
        WHERE l.user_id = %s
        ORDER BY l.created_at DESC
    """, (user_id,))
    
    lists = cursor.fetchall()
    print(f"Found {len(lists)} lists")
    return lists

def get_user_reviews(cursor, user_id: int) -> List[Dict[str, Any]]:
    """Get user's recent reviews"""
    cursor.execute("""
        SELECT 
            r.review_id as id,
            b.book_id as bookId,
            b.title as bookTitle,
            GROUP_CONCAT(DISTINCT a.name SEPARATOR ', ') as bookAuthor,
            rat.rating_value as rating,
            r.review_text as comment,
            r.created_at as date,
            0 as likes
        FROM reviews r
        INNER JOIN books b ON r.book_id = b.book_id
        LEFT JOIN book_author ba ON b.book_id = ba.book_id
        LEFT JOIN authors a ON ba.author_id = a.author_id
        LEFT JOIN ratings rat ON r.user_id = rat.user_id AND r.book_id = rat.book_id
        WHERE r.user_id = %s
        GROUP BY r.review_id, b.book_id, b.title, rat.rating_value, r.review_text, r.created_at
        ORDER BY r.created_at DESC
        LIMIT 10
    """, (user_id,))
    
    reviews = cursor.fetchall()
    print(f"Found {len(reviews)} reviews")
    return reviews

def get_favorite_genres(cursor, user_id: int) -> List[str]:
    """Get user's top 5 favorite genres"""
    cursor.execute("""
        SELECT 
            g.genre_name as genre,
            COUNT(*) as count
        FROM ratings r
        INNER JOIN books b ON r.book_id = b.book_id
        INNER JOIN book_genre bg ON b.book_id = bg.book_id
        INNER JOIN genres g ON bg.genre_id = g.genre_id
        WHERE r.user_id = %s
        GROUP BY g.genre_name
        ORDER BY count DESC
        LIMIT 5
    """, (user_id,))
    
    genres = [g['genre'] for g in cursor.fetchall()]
    print(f"Found {len(genres)} genres")
    return genres

def format_profile_response(user: Dict[str, Any], lists: List, reviews: List, genres: List) -> Dict[str, Any]:
    """Format user profile data for API response"""
    return {
        'id': user['id'],
        'username': user['displayName'] or user['username'],
        'email': user['email'],
        'avatarUrl': user['avatarUrl'] or '',
        'bio': user['bio'] or '',
        'location': user['location'] or '',
        'website': '',
        'joinDate': user['joinDate'].strftime('%B %Y') if user['joinDate'] else '',
        'isPrivate': not user['isPublic'],
        'stats': {
            'totalReviews': int(user['totalReviews'] or 0),
            'totalRatings': int(user['totalRatings'] or 0),
            'booksRead': int(user['booksRead'] or 0),
            'followers': int(user['followers'] or 0),
            'following': int(user['following'] or 0)
        },
        'lists': [
            {
                'id': lst['id'],
                'name': lst['name'],
                'count': int(lst['count'] or 0),
                'isPublic': bool(lst['isPublic'])
            }
            for lst in lists
        ],
        'recentReviews': [
            {
                'id': review['id'],
                'bookId': review['bookId'],
                'bookTitle': review['bookTitle'],
                'bookAuthor': review['bookAuthor'] or 'Unknown',
                'rating': int(review['rating'] or 0),
                'comment': review['comment'] or '',
                'date': review['date'].strftime('%B %d, %Y') if review['date'] else '',
                'likes': int(review['likes'] or 0)
            }
            for review in reviews
        ],
        'favoriteGenres': genres
    }

def lambda_handler(event, context):
    """Get detailed user profile by user ID"""
    print(f"Incoming event: {json.dumps(event)}")
    
    try:
        # Extract and validate user_id
        user_id = event.get('pathParameters', {}).get('user_id')
        print(f"Extracted user_id: {user_id}")
        
        if not user_id:
            return response(400, {
                'error': 'User ID is required',
                'message': 'Please provide a user_id in the path'
            })
        
        try:
            user_id = int(user_id)
            print(f"Converted user_id to int: {user_id}")
        except ValueError:
            return response(400, {
                'error': 'Invalid user ID',
                'message': 'User ID must be a number'
            })
        
        # Connect to database
        connection = pymysql.connect(**DB_CONFIG)
        
        try:
            with connection.cursor() as cursor:
                # Get user profile
                print(f"🔍 Executing query for user_id: {user_id}")
                user = get_user_profile(cursor, user_id)
                
                if not user:
                    print(f"No user found with ID {user_id}")
                    return response(404, {
                        'error': 'User not found',
                        'message': f'No user found with ID {user_id}'
                    })
                
                # Get additional data
                lists = get_user_lists(cursor, user_id)
                reviews = get_user_reviews(cursor, user_id)
                genres = get_favorite_genres(cursor, user_id)
                
                # Format response
                profile_data = format_profile_response(user, lists, reviews, genres)
                
                print(f"Successfully formatted response for {profile_data['username']} (ID: {user_id})")
                return response(200, profile_data)
        
        finally:
            connection.close()
    
    except pymysql.MySQLError as e:
        print(f"Database error: {str(e)}")
        import traceback
        traceback.print_exc()
        return response(500, {
            'error': 'Database error',
            'message': str(e)
        })
    
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return response(500, {
            'error': 'Internal server error',
            'message': str(e)
        })
