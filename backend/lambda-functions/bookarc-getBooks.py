"""
Lambda Function: bookarc-getBooks
Handle all book-related operations with EMBEDDED notifications
"""

import json
import os
import pymysql
from decimal import Decimal
from datetime import datetime
from typing import Optional

# ============================================================================
# EMBEDDED NOTIFICATION SERVICE
# ============================================================================

class NotificationService:
    """Service for creating and managing notifications"""
    
    def __init__(self, connection):
        self.connection = connection
    
    def create_notification(self, user_id: int, message: str, notification_type: str, audience_type: str = 'all') -> Optional[int]:
        """Create a single notification"""
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO notifications (user_id, message, type, audience_type, is_read, created_at)
                    VALUES (%s, %s, %s, %s, FALSE, NOW())
                """, (user_id, message, notification_type, audience_type))
                self.connection.commit()
                return cursor.lastrowid
        except Exception as e:
            print(f"Error creating notification: {str(e)}")
            return None

# ============================================================================
# AUTH HELPERS
# ============================================================================
def get_authenticated_user(event):
    """Extract authenticated user from Cognito authorizer"""
    try:
        claims = event["requestContext"]["authorizer"]["claims"]
        return {"sub": claims["sub"], "email": claims.get("email"), "username": claims.get("cognito:username")}
    except Exception as e:
        print(f"Auth extraction error: {e}")
        return None

def get_or_create_user(cursor, cognito_user):
    """Get existing user or create new one"""
    cursor.execute("SELECT user_id, COALESCE(display_name, username) as name, role FROM users WHERE cognito_sub = %s", 
                  (cognito_user["sub"],))
    user = cursor.fetchone()
    if user:
        return user
    
    cursor.execute("INSERT INTO users (cognito_sub, email, display_name) VALUES (%s, %s, %s)",
                  (cognito_user["sub"], cognito_user.get("email"), cognito_user.get("username")))
    return {"user_id": cursor.lastrowid, "name": cognito_user.get("username"), "role": "normal"}

# ============================================================================
# UTILITIES
# ============================================================================
def decimal_default(obj):
    """Convert Decimal to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def get_connection():
    """Create MySQL database connection"""
    return pymysql.connect(
        host=os.environ["DB_HOST"], user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"], database=os.environ["DB_NAME"],
        connect_timeout=5, cursorclass=pymysql.cursors.DictCursor
    )

def response(status, body):
    """Create standardized HTTP response"""
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Authorization,Content-Type",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
        },
        "body": json.dumps(body, default=decimal_default)
    }

# ============================================================================
# MAIN HANDLER
# ============================================================================
def handler(event, context):
    """Main Lambda handler for all book-related operations"""
    print("EVENT:", json.dumps(event))

    http_method = event.get("httpMethod")
    resource = event.get("resource", "")
    path_params = event.get("pathParameters") or {}

    if http_method == "OPTIONS":
        return response(200, {"message": "CORS preflight"})

    conn = get_connection()

    try:
        with conn.cursor() as cursor:

            # ==================== GET /books ====================
            if http_method == "GET" and resource == "/books":
                print("Fetching all books")
                
                cursor.execute("""
                    SELECT
                        b.book_id AS id, b.title,
                        COALESCE(GROUP_CONCAT(DISTINCT a.name SEPARATOR ', '), 'Unknown Author') AS author,
                        COALESCE((SELECT AVG(r.rating_value) FROM ratings r WHERE r.book_id = b.book_id), 0) AS rating,
                        COALESCE((SELECT COUNT(*) FROM ratings r WHERE r.book_id = b.book_id), 0) AS totalRatings,
                        COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.book_id = b.book_id), 0) AS reviews,
                        COALESCE(b.cover_image_url, '') AS cover,
                        COALESCE(b.cover_image_url, '') AS coverUrl,
                        COALESCE(MAX(g.genre_name), 'Unknown') AS genre,
                        COALESCE(b.summary, '') AS description,
                        COALESCE(YEAR(b.publish_date), 2024) AS publishYear,
                        FALSE AS isTrending
                    FROM books b
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    LEFT JOIN book_genre bg ON b.book_id = bg.book_id
                    LEFT JOIN genres g ON bg.genre_id = g.genre_id
                    WHERE b.approval_status = 'approved'
                    GROUP BY b.book_id
                    ORDER BY b.book_id DESC;
                """)
                
                books = cursor.fetchall()
                print(f"Found {len(books)} books")
                return response(200, books)

            # ==================== GET /books/{id} ====================
            elif http_method == "GET" and resource == "/books/{id}":
                book_id = int(path_params["id"])
                print(f"Fetching book ID: {book_id}")

                cursor.execute("""
                    SELECT
                        b.book_id AS id, b.title,
                        COALESCE(GROUP_CONCAT(DISTINCT a.name SEPARATOR ', '), 'Unknown Author') AS author,
                        COALESCE((SELECT AVG(r.rating_value) FROM ratings r WHERE r.book_id = b.book_id), 0) AS rating,
                        COALESCE((SELECT COUNT(*) FROM ratings r WHERE r.book_id = b.book_id), 0) AS totalRatings,
                        COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.book_id = b.book_id), 0) AS reviews,
                        COALESCE(b.cover_image_url, '') AS cover,
                        COALESCE(b.cover_image_url, '') AS coverUrl,
                        COALESCE(MAX(g.genre_name), 'Unknown') AS genre,
                        COALESCE(b.summary, '') AS description,
                        COALESCE(YEAR(b.publish_date), 2024) AS publishYear,
                        b.isbn, FALSE AS isTrending
                    FROM books b
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    LEFT JOIN book_genre bg ON b.book_id = bg.book_id
                    LEFT JOIN genres g ON bg.genre_id = g.genre_id
                    WHERE b.book_id = %s AND b.approval_status = 'approved'
                    GROUP BY b.book_id;
                """, (book_id,))

                book = cursor.fetchone()
                
                if not book:
                    print(f"Book {book_id} not found")
                    return response(404, {"message": "Book not found"})

                cursor.execute("""
                    SELECT rating_value, COUNT(*) as count
                    FROM ratings WHERE book_id = %s
                    GROUP BY rating_value
                """, (book_id,))
                
                rating_breakdown = {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0}
                for row in cursor.fetchall():
                    rating_breakdown[str(row['rating_value'])] = row['count']
                
                book['ratingBreakdown'] = rating_breakdown
                print(f"Found book: {book['title']}")
                return response(200, book)

            # ==================== GET /books/{id}/reviews ====================
            elif http_method == "GET" and resource == "/books/{id}/reviews":
                book_id = int(path_params["id"])
                print(f"Fetching reviews for book ID: {book_id}")
                
                current_user_id = None
                cognito_user = get_authenticated_user(event)
                if cognito_user:
                    cursor.execute("SELECT user_id FROM users WHERE cognito_sub = %s", (cognito_user["sub"],))
                    user_row = cursor.fetchone()
                    if user_row:
                        current_user_id = user_row["user_id"]
                        print(f"Authenticated user: {current_user_id}")
                
                cursor.execute("""
                    SELECT
                        r.review_id AS id, r.user_id AS userId, u.display_name AS user,
                        COALESCE(u.profile_image, '') AS avatar, rat.rating_value AS rating,
                        DATE_FORMAT(r.created_at, '%%M %%d, %%Y') AS date,
                        r.review_text AS review, 0 AS helpful
                    FROM reviews r
                    JOIN users u ON r.user_id = u.user_id
                    LEFT JOIN ratings rat ON r.book_id = rat.book_id AND r.user_id = rat.user_id
                    WHERE r.book_id = %s
                    ORDER BY r.created_at DESC;
                """, (book_id,))
                
                reviews = cursor.fetchall()
                for review in reviews:
                    review["isOwner"] = (current_user_id is not None and review["userId"] == current_user_id)
                
                print(f"Found {len(reviews)} reviews")
                return response(200, reviews)

            # ==================== GET /books/{id}/stores ====================
            elif http_method == "GET" and resource == "/books/{id}/stores":
                book_id = int(path_params["id"])
                print(f"Fetching stores for book ID: {book_id}")
                
                cursor.execute("""
                    SELECT store_id, store_name, price, currency, url, availability_status, last_checked
                    FROM book_stores WHERE book_id = %s ORDER BY price ASC;
                """, (book_id,))
                
                stores = cursor.fetchall()
                print(f"Found {len(stores)} stores")
                return response(200, stores)

            # ==================== POST /books/{id}/ratings ====================
            elif http_method == "POST" and resource == "/books/{id}/ratings":
                book_id = int(path_params["id"])
                body = json.loads(event.get("body") or "{}")
                rating_value = int(body.get("rating"))
                
                print(f"Rating book {book_id} with {rating_value} stars")

                if not (1 <= rating_value <= 5):
                    return response(400, {"message": "Rating must be between 1 and 5"})

                cognito_user = get_authenticated_user(event)
                if not cognito_user:
                    return response(401, {"message": "Unauthorized"})

                user = get_or_create_user(cursor, cognito_user)
                user_id = user["user_id"]
                user_name = user["name"]
                print(f"User: {user_name} (ID: {user_id})")

                cursor.execute("""
                    SELECT b.title, ba.author_id, a.user_id as author_user_id
                    FROM books b
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    WHERE b.book_id = %s LIMIT 1
                """, (book_id,))
                book_data = cursor.fetchone()
                
                if not book_data:
                    return response(404, {"message": "Book not found"})
                
                book_title = book_data["title"]

                cursor.execute("SELECT rating_id FROM ratings WHERE book_id = %s AND user_id = %s", (book_id, user_id))
                is_new_rating = cursor.fetchone() is None

                cursor.execute("""
                    INSERT INTO ratings (book_id, user_id, rating_value)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE rating_value = VALUES(rating_value);
                """, (book_id, user_id, rating_value))

                cursor.execute("""
                    UPDATE books SET average_rating = (SELECT AVG(rating_value) FROM ratings WHERE book_id = %s)
                    WHERE book_id = %s;
                """, (book_id, book_id))

                conn.commit()
                print("Rating saved successfully")
                
                try:
                    notif_service = NotificationService(conn)
                    
                    stars = '⭐' * rating_value
                    notif_service.create_notification(
                        user_id,
                        f'You have successfully rated "{book_title}" {stars} ({rating_value}/5)',
                        'book_rating_success',
                        'all'
                    )
                    
                    if is_new_rating and book_data.get("author_user_id"):
                        notif_service.create_notification(
                            book_data["author_user_id"],
                            f'{user_name} rated your book "{book_title}" {stars} ({rating_value}/5)',
                            'book_rated',
                            'author'
                        )
                    
                    print("Notifications sent successfully")
                except Exception as notif_error:
                    print(f"Failed to send notifications: {str(notif_error)}")
                
                return response(201, {"message": "Rating submitted successfully"})

            # ==================== POST /books/{id}/reviews ====================
            elif http_method == "POST" and resource == "/books/{id}/reviews":
                book_id = int(path_params["id"])
                body = json.loads(event.get("body") or "{}")
                rating_value = int(body.get("rating"))
                review_text = body.get("reviewText", "").strip()
                
                print(f"Submitting review for book {book_id}")

                if not (1 <= rating_value <= 5):
                    return response(400, {"message": "Rating must be between 1 and 5"})
                
                if not review_text:
                    return response(400, {"message": "Review text cannot be empty"})

                cognito_user = get_authenticated_user(event)
                if not cognito_user:
                    return response(401, {"message": "Unauthorized"})

                user = get_or_create_user(cursor, cognito_user)
                user_id = user["user_id"]
                user_name = user["name"]
                print(f"User: {user_name} (ID: {user_id})")

                cursor.execute("""
                    SELECT b.title, ba.author_id, a.user_id as author_user_id
                    FROM books b
                    LEFT JOIN book_author ba ON b.book_id = ba.book_id
                    LEFT JOIN authors a ON ba.author_id = a.author_id
                    WHERE b.book_id = %s LIMIT 1
                """, (book_id,))
                book_data = cursor.fetchone()
                
                if not book_data:
                    return response(404, {"message": "Book not found"})
                
                book_title = book_data["title"]

                cursor.execute("""
                    INSERT INTO reviews (book_id, user_id, review_text, created_at)
                    VALUES (%s, %s, %s, NOW());
                """, (book_id, user_id, review_text))

                cursor.execute("""
                    INSERT INTO ratings (book_id, user_id, rating_value)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE rating_value = VALUES(rating_value);
                """, (book_id, user_id, rating_value))

                cursor.execute("""
                    UPDATE books SET average_rating = (SELECT AVG(rating_value) FROM ratings WHERE book_id = %s)
                    WHERE book_id = %s;
                """, (book_id, book_id))

                conn.commit()
                print("Review submitted successfully")
                
                try:
                    notif_service = NotificationService(conn)
                    
                    notif_service.create_notification(
                        user_id,
                        f'Your review has been successfully submitted for "{book_title}"',
                        'book_review_success',
                        'all'
                    )
                    
                    if book_data.get("author_user_id"):
                        notif_service.create_notification(
                            book_data["author_user_id"],
                            f'{user_name} submitted a review for your book "{book_title}"',
                            'book_reviewed',
                            'author'
                        )
                    
                    print("Notifications sent successfully")
                except Exception as notif_error:
                    print(f"Failed to send notifications: {str(notif_error)}")
                
                return response(201, {"message": "Review submitted successfully"})

            # ==================== DELETE /books/{id}/reviews/{reviewId} ====================
            elif http_method == "DELETE" and resource == "/books/{id}/reviews/{reviewId}":
                book_id = int(path_params["id"])
                review_id = int(path_params["reviewId"])
                
                print(f"Deleting review {review_id} for book {book_id}")
                
                cognito_user = get_authenticated_user(event)
                if not cognito_user:
                    return response(401, {"message": "Unauthorized"})
                
                user = get_or_create_user(cursor, cognito_user)
                user_id = user["user_id"]
                print(f"User ID: {user_id}")
                
                cursor.execute("""
                    SELECT review_id, user_id FROM reviews WHERE review_id = %s AND book_id = %s
                """, (review_id, book_id))
                
                review = cursor.fetchone()
                
                if not review:
                    return response(404, {"message": "Review not found"})
                
                if review["user_id"] != user_id:
                    return response(403, {"message": "You can only delete your own reviews"})
                
                cursor.execute("DELETE FROM reviews WHERE review_id = %s AND user_id = %s", (review_id, user_id))
                
                conn.commit()
                print("Review deleted successfully")
                return response(200, {"message": "Review deleted successfully"})

            print(f"Route not found: {http_method} {resource}")
            return response(404, {"message": "Route not found"})

    except ValueError as e:
        print(f"Validation error: {e}")
        return response(400, {"message": "Invalid input", "error": str(e)})
    
    except Exception as e:
        import traceback
        print(f"Internal error: {e}")
        traceback.print_exc()
        return response(500, {"message": "Internal server error", "error": str(e)})

    finally:
        conn.close()
        print("Database connection closed")
