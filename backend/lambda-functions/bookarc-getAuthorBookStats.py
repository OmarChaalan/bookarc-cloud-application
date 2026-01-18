import json
import pymysql
import os
from decimal import Decimal

def lambda_handler(event, context):
    """
    GET /author/books/stats
    Returns statistics for all books by the current author
    INCLUDING author rating and review statistics
    """
    
    # CRITICAL: Add decimal_default function
    def decimal_default(obj):
        if isinstance(obj, Decimal):
            return float(obj)
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    
    connection = pymysql.connect(
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME'],
        cursorclass=pymysql.cursors.DictCursor
    )
    
    try:
        # Extract user_id from authorizer context
        user_cognito_sub = event['requestContext']['authorizer']['claims']['sub']
        
        with connection.cursor() as cursor:
            # Get user_id and verify they're an author
            cursor.execute("""
                SELECT user_id, role
                FROM users
                WHERE cognito_sub = %s
            """, (user_cognito_sub,))
            
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
            
            if user['role'] != 'author':
                return {
                    'statusCode': 403,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Author role required'})
                }
            
            user_id = user['user_id']
            
            # Get author profile with pre-calculated average_rating
            cursor.execute("""
                SELECT 
                    a.author_id,
                    a.name,
                    a.average_rating,
                    a.verified
                FROM authors a
                WHERE a.user_id = %s
            """, (user_id,))
            
            author = cursor.fetchone()
            
            if not author:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Author profile not found. Please contact support.'})
                }
            
            author_id = author['author_id']
            
            print(f"Found author: {author['name']} (ID: {author_id})")
            print(f"Author average_rating from DB: {author['average_rating']}")
            
            # Get all books with detailed statistics
            cursor.execute("""
                SELECT 
                    b.book_id,
                    b.title,
                    b.summary,
                    b.isbn,
                    b.publish_date,
                    b.cover_image_url,
                    b.approval_status,
                    b.created_at,
                    b.approved_at,
                    b.average_rating,
                    GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') as genres,
                    GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR ', ') as authors,
                    COUNT(DISTINCT rev.review_id) as total_reviews,
                    COUNT(DISTINCT rat.rating_id) as total_ratings
                FROM books b
                LEFT JOIN book_genre bg ON b.book_id = bg.book_id
                LEFT JOIN genres g ON bg.genre_id = g.genre_id
                LEFT JOIN book_author ba ON b.book_id = ba.book_id
                LEFT JOIN authors a ON ba.author_id = a.author_id
                LEFT JOIN reviews rev ON b.book_id = rev.book_id
                LEFT JOIN ratings rat ON b.book_id = rat.book_id
                WHERE b.uploaded_by = %s
                GROUP BY b.book_id
                ORDER BY b.created_at DESC
            """, (user_id,))
            
            books = cursor.fetchall()
            
            # For each book, get rating breakdown
            books_with_stats = []
            for book in books:
                # Get rating breakdown (count of each rating 1-5)
                cursor.execute("""
                    SELECT 
                        rating_value,
                        COUNT(*) as count
                    FROM ratings
                    WHERE book_id = %s
                    GROUP BY rating_value
                    ORDER BY rating_value DESC
                """, (book['book_id'],))
                
                rating_data = cursor.fetchall()
                
                # Create rating breakdown dict
                rating_breakdown = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
                for rating in rating_data:
                    rating_breakdown[rating['rating_value']] = rating['count']
                
                books_with_stats.append({
                    'book_id': book['book_id'],
                    'title': book['title'],
                    'summary': book['summary'],
                    'isbn': book['isbn'],
                    'publish_date': book['publish_date'].isoformat() if book['publish_date'] else None,
                    'cover_image_url': book['cover_image_url'],
                    'approval_status': book['approval_status'],
                    'created_at': book['created_at'].isoformat(),
                    'approved_at': book['approved_at'].isoformat() if book['approved_at'] else None,
                    'average_rating': float(book['average_rating']) if book['average_rating'] else 0.0,
                    'genres': book['genres'] or '',
                    'authors': book['authors'] or '',
                    'total_reviews': book['total_reviews'],
                    'total_ratings': book['total_ratings'],
                    'rating_breakdown': rating_breakdown
                })
            
            # Calculate overall stats for books
            total_books = len(books)
            published_books = len([b for b in books if b['approval_status'] == 'approved'])
            pending_books = len([b for b in books if b['approval_status'] == 'pending'])
            rejected_books = len([b for b in books if b['approval_status'] == 'rejected'])
            
            total_reviews = sum(b['total_reviews'] for b in books)
            total_ratings_count = sum(b['total_ratings'] for b in books)
            
            # Calculate overall average rating for books
            if total_ratings_count > 0:
                cursor.execute("""
                    SELECT AVG(r.rating_value) as avg_rating
                    FROM ratings r
                    JOIN books b ON r.book_id = b.book_id
                    WHERE b.uploaded_by = %s
                """, (user_id,))
                avg_result = cursor.fetchone()
                overall_avg_rating = float(avg_result['avg_rating']) if avg_result['avg_rating'] else 0.0
            else:
                overall_avg_rating = 0.0
            
            # Get author rating statistics using author_id
            # Get the rating breakdown from author_ratings table
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
            
            author_rating_result = cursor.fetchone()
            
            # Get author review count
            cursor.execute("""
                SELECT COUNT(*) as total_reviews
                FROM author_reviews
                WHERE author_id = %s
            """, (author_id,))
            
            author_review_result = cursor.fetchone()
            
            # Use average_rating from authors table (pre-calculated by trigger)
            author_avg_rating = float(author['average_rating']) if author['average_rating'] else 0.0
            
            print(f"Author rating stats:")
            print(f"   - Average: {author_avg_rating}")
            print(f"   - Total Ratings: {author_rating_result['total_ratings']}")
            print(f"   - Total Reviews: {author_review_result['total_reviews']}")
            
            author_rating_stats = {
                'avgRating': author_avg_rating,  # From authors.average_rating
                'totalRatings': author_rating_result['total_ratings'] or 0,
                'totalReviews': author_review_result['total_reviews'] or 0,
                'ratingBreakdown': {
                    '5': author_rating_result['five_star'] or 0,
                    '4': author_rating_result['four_star'] or 0,
                    '3': author_rating_result['three_star'] or 0,
                    '2': author_rating_result['two_star'] or 0,
                    '1': author_rating_result['one_star'] or 0
                }
            }
            
            response_data = {
                'books': books_with_stats,
                'stats': {
                    'total_books': total_books,
                    'published_books': published_books,
                    'pending_books': pending_books,
                    'rejected_books': rejected_books,
                    'total_reviews': total_reviews,
                    'total_ratings': total_ratings_count,
                    'overall_avg_rating': round(overall_avg_rating, 1)
                },
                'author_stats': author_rating_stats,  # Includes avgRating, totalRatings, totalReviews, ratingBreakdown
                'author_id': author_id  # Critical for frontend
            }
            
            print(f"Final response author_stats: {author_rating_stats}")
            
            # Use decimal_default when serializing JSON
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(response_data, default=decimal_default)
            }
            
    except KeyError as e:
        print(f"KeyError: {str(e)}")
        print(f"Event: {json.dumps(event)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Unauthorized - Invalid token', 'details': str(e)})
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
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
