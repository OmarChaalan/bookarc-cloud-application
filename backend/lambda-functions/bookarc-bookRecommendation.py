"""
Lambda Function: Simplified Book Recommendations Engine
Generates personalized recommendations - MySQL compatible
"""

import json
import pymysql
import os
import datetime
from datetime import timedelta
from decimal import Decimal

# Environment variables
DB_HOST = os.environ.get('DB_HOST')
DB_NAME = os.environ.get('DB_NAME')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')

def decimal_to_float(obj):
    """Convert Decimal and date objects to JSON-serializable types"""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime.date, datetime)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

def get_db_connection():
    """Create database connection"""
    print(f"📊 Connecting to database: {DB_HOST}/{DB_NAME}")
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5
    )

def get_user_reading_history(conn, user_id):
    """Get books the user has already read/rated/reviewed"""
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT DISTINCT book_id
                FROM (
                    SELECT book_id FROM ratings WHERE user_id = %s
                    UNION
                    SELECT book_id FROM reviews WHERE user_id = %s
                    UNION
                    SELECT book_id FROM user_reading_status WHERE user_id = %s
                ) AS read_books
            """
            cursor.execute(sql, (user_id, user_id, user_id))
            result = [row['book_id'] for row in cursor.fetchall()]
            print(f"📚 User has {len(result)} books in reading history")
            return result
    except Exception as e:
        print(f"⚠️ Error getting reading history: {str(e)}")
        return []

def get_user_favorite_genres(conn, user_id):
    """Get user's favorite genres"""
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT g.genre_id, g.genre_name
                FROM user_favorite_genres ufg
                JOIN genres g ON ufg.genre_id = g.genre_id
                WHERE ufg.user_id = %s
            """
            cursor.execute(sql, (user_id,))
            result = cursor.fetchall()
            print(f"⭐ User has {len(result)} favorite genres: {[g['genre_name'] for g in result]}")
            return result
    except Exception as e:
        print(f"⚠️ Error getting favorite genres: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

def get_recommendations_simple(conn, user_id, favorite_genres, exclude_books, limit=10):
    """Get recommendations based on favorite genres - SIMPLIFIED"""
    try:
        with conn.cursor() as cursor:
            if favorite_genres:
                # User has favorite genres - recommend from those
                genre_ids = [g['genre_id'] for g in favorite_genres]
                genre_placeholders = ','.join(['%s'] * len(genre_ids))
                
                if exclude_books:
                    exclude_placeholders = ','.join(['%s'] * len(exclude_books))
                    exclude_clause = f"AND b.book_id NOT IN ({exclude_placeholders})"
                else:
                    exclude_clause = ""
                
                sql = f"""
                    SELECT DISTINCT
                        b.book_id,
                        b.title,
                        b.summary,
                        b.cover_image_url,
                        CAST(b.average_rating AS DECIMAL(3,2)) as average_rating,
                        b.publish_date,
                        YEAR(b.publish_date) as publish_year,
                        GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') as authors,
                        GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') as genres,
                        COUNT(DISTINCT bg.genre_id) as matching_genres,
                        'Based on your favorite genres' as reason
                    FROM books b
                    JOIN book_genre bg ON b.book_id = bg.book_id
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    LEFT JOIN genres g ON bg.genre_id = g.genre_id
                    WHERE bg.genre_id IN ({genre_placeholders})
                    AND b.approval_status = 'approved'
                    {exclude_clause}
                    GROUP BY b.book_id, b.title, b.summary, b.cover_image_url, b.average_rating, b.publish_date
                    ORDER BY matching_genres DESC, b.average_rating DESC, RAND()
                    LIMIT %s
                """
                
                params = list(genre_ids)
                if exclude_books:
                    params.extend(exclude_books)
                params.append(limit)
                
            else:
                # No favorite genres - recommend highly rated books
                if exclude_books:
                    exclude_placeholders = ','.join(['%s'] * len(exclude_books))
                    exclude_clause = f"AND b.book_id NOT IN ({exclude_placeholders})"
                else:
                    exclude_clause = ""
                
                sql = f"""
                    SELECT 
                        b.book_id,
                        b.title,
                        b.summary,
                        b.cover_image_url,
                        CAST(b.average_rating AS DECIMAL(3,2)) as average_rating,
                        b.publish_date,
                        YEAR(b.publish_date) as publish_year,
                        GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') as authors,
                        GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') as genres,
                        'Highly rated by readers' as reason
                    FROM books b
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    LEFT JOIN book_genre bg ON b.book_id = bg.book_id
                    LEFT JOIN genres g ON bg.genre_id = g.genre_id
                    WHERE b.approval_status = 'approved'
                    AND b.average_rating >= 4.0
                    {exclude_clause}
                    GROUP BY b.book_id, b.title, b.summary, b.cover_image_url, b.average_rating, b.publish_date
                    ORDER BY b.average_rating DESC, RAND()
                    LIMIT %s
                """
                
                params = []
                if exclude_books:
                    params.extend(exclude_books)
                params.append(limit)
            
            print(f"🔍 Executing SQL query...")
            cursor.execute(sql, params)
            results = cursor.fetchall()
            
            print(f"✅ Found {len(results)} recommendations")
            
            # Convert all numeric fields to proper types
            for book in results:
                if book.get('average_rating') is not None:
                    book['average_rating'] = float(book['average_rating'])
                if book.get('matching_genres') is not None:
                    book['matching_genres'] = int(book['matching_genres'])
            
            return results
            
    except Exception as e:
        print(f"❌ Error getting recommendations: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

def lambda_handler(event, context):
    """Generate personalized book recommendations"""
    
    print("=" * 60)
    print("🚀 RECOMMENDATIONS LAMBDA STARTED")
    print(f"📅 Timestamp: {datetime.datetime.now()}")
    print("=" * 60)
    
    try:
        # Verify environment variables
        print(f"🔧 DB_HOST: {DB_HOST}")
        print(f"🔧 DB_NAME: {DB_NAME}")
        print(f"🔧 DB_USER: {DB_USER}")
        
        if not all([DB_HOST, DB_NAME, DB_USER, DB_PASSWORD]):
            raise Exception("Missing required environment variables")
        
        # Get user ID from Cognito token
        try:
            cognito_sub = event['requestContext']['authorizer']['claims']['sub']
            print(f"👤 Cognito Sub: {cognito_sub}")
        except KeyError as e:
            print(f"❌ Missing Cognito authorization: {str(e)}")
            return {
                'statusCode': 401,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': True,
                },
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Connect to database
        print("🔌 Connecting to database...")
        conn = get_db_connection()
        print("✅ Database connected successfully")
        
        try:
            # Get database user_id from cognito_sub
            print("🔍 Looking up user in database...")
            with conn.cursor() as cursor:
                cursor.execute("SELECT user_id, username, role FROM users WHERE cognito_sub = %s", (cognito_sub,))
                user_row = cursor.fetchone()
                if not user_row:
                    print("❌ User not found in database")
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Credentials': True,
                        },
                        'body': json.dumps({'error': 'User not found'})
                    }
                db_user_id = user_row['user_id']
                print(f"✅ Found user: {user_row['username']} (ID: {db_user_id}, Role: {user_row['role']})")
        
            # Get query parameters
            params = event.get('queryStringParameters') or {}
            num_results = min(int(params.get('num_results', 10)), 50)
            print(f"🎯 Requesting {num_results} recommendations")
            
            # Get user's reading history
            print("📚 Fetching reading history...")
            exclude_books = get_user_reading_history(conn, db_user_id)
            
            # Get user's favorite genres
            print("⭐ Fetching favorite genres...")
            favorite_genres = get_user_favorite_genres(conn, db_user_id)
            
            # Get recommendations
            print("🎲 Generating recommendations...")
            recommendations = get_recommendations_simple(
                conn, db_user_id, favorite_genres, exclude_books, num_results
            )
            
            if not recommendations:
                print("⚠️ No recommendations found, trying fallback...")
                # Fallback: Just get any highly rated books
                with conn.cursor() as cursor:
                    sql = """
                        SELECT 
                            b.book_id,
                            b.title,
                            b.summary,
                            b.cover_image_url,
                            CAST(b.average_rating AS DECIMAL(3,2)) as average_rating,
                            b.publish_date,
                            YEAR(b.publish_date) as publish_year,
                            GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') as authors,
                            GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') as genres,
                            'Popular on BookArc' as reason
                        FROM books b
                        LEFT JOIN book_author ba ON b.book_id = ba.book_id
                        LEFT JOIN authors a ON ba.author_id = a.author_id
                        LEFT JOIN book_genre bg ON b.book_id = bg.book_id
                        LEFT JOIN genres g ON bg.genre_id = g.genre_id
                        WHERE b.approval_status = 'approved'
                        GROUP BY b.book_id, b.title, b.summary, b.cover_image_url, b.average_rating, b.publish_date
                        ORDER BY b.average_rating DESC, RAND()
                        LIMIT %s
                    """
                    cursor.execute(sql, (num_results,))
                    recommendations = cursor.fetchall()
                    
                    for book in recommendations:
                        if book.get('average_rating') is not None:
                            book['average_rating'] = float(book['average_rating'])
            
            print(f"✅ Returning {len(recommendations)} recommendations")
            print("=" * 60)
            
            response_body = {
                'recommendations': recommendations,
                'total': len(recommendations),
                'source': 'custom_algorithm',
                'has_favorite_genres': len(favorite_genres) > 0
            }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': True,
                },
                'body': json.dumps(response_body, default=decimal_to_float)
            }
            
        finally:
            conn.close()
            print("🔒 Database connection closed")
        
    except Exception as e:
        print("=" * 60)
        print(f"❌ FATAL ERROR OCCURRED")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': True,
            },
            'body': json.dumps({
                'error': 'Failed to get recommendations',
                'details': str(e),
                'error_type': type(e).__name__
            })
        }
