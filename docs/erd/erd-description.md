# BookArc Database ERD Description

The BookArc application uses a **MySQL relational database** hosted on AWS RDS.  
The schema is designed to support books, users, authors, reviews, ratings, reading lists, notifications, subscriptions, and audit logs.  
Below is a summary of the main entities, their relationships, and purpose.

---

## Users

- Stores information about platform users:
  - `username`, `display_name`, `email`, `profile_image`, `bio`, `location`, `website`
  - `role` defines user type: `normal`, `premium`, `author`, or `admin`
  - `verification_status` and `verified_at` track author verification
- Each user can:
  - Follow other users
  - Follow authors
  - Submit reviews and ratings
  - Create reading lists
  - Receive notifications
  - Subscribe to plans
  - Trigger interaction events for recommendations

---

## Authors

- Represents book authors.
- Can be linked to a registered `users.user_id` when the author is a BookArc user.
- Stores author-specific information: `name`, `bio`, `is_registered_author`, `verified`
- Users can follow authors
- Authors can be rated and reviewed by users

---

## Author Verification Requests

- Tracks requests from users to become verified authors
- Includes submission info (`full_name`, `id_image_url`, `selfie_image_url`) and `status` (`pending`, `approved`, `rejected`)
- Links to:
  - `users.user_id` (requester)
  - `users.user_id` (reviewer)
- Ensures only **one request per day per user** (unique constraint)

---

## Books

- Stores all book data:
  - `title`, `summary`, `isbn`, `publish_date`, `cover_image_url`, `average_rating`
  - Approval workflow: `approval_status`, `approved_by`, `approved_at`, `rejection_reason`
- Relationships:
  - Linked to authors via `book_author`
  - Can belong to multiple genres via `book_genre`
  - Users can rate and review books
  - Users can track reading status
  - External pricing information via `book_stores`

---

## Genres & Book-Genre Mapping

- `genres`: list of all book genres
- `book_genre`: many-to-many mapping between books and genres
- `user_favorite_genres`: stores each user’s preferred genres

---

## Ratings & Reviews

- `ratings`: user ratings of books (1-5 scale, unique per user-book)
- `reviews`: user text reviews for books
- `author_ratings` and `author_reviews`: ratings/reviews for authors
- Enforces **one rating/review per user per book/author**

---

## Reading Lists & User Status

- `lists`: default and custom reading lists for each user
- `list_books`: books included in each list
- `user_reading_status`: tracks progress (`reading`, `completed`, `planned`, `dropped`, `on_hold`) and timestamps

---

## Notifications

- `notification_preferences`: user notification settings (email, author updates, premium offers)
- `notifications`: stores messages for users
  - Centralized via the `notification_service.py` Lambda layer
  - Supports audience targeting (`normal`, `premium`, `author`, `all`)
  - Tracks read/unread status

---

## Subscriptions & Plans

- `plans`: subscription plans (`monthly`, `yearly`, `onetime`)
- `subscriptions`: user subscriptions to plans, with payment info and status

---

## Interaction Events

- `interaction_events`: stores user interactions with books
  - Supports recommendations and personalization (e.g., AWS Personalize)
  - Tracks type of event, value, timestamp

---

## Admin Audit Logs

- `admin_audit_logs`: tracks administrative actions for security and compliance
- Records:
  - Admin user performing the action
  - Action type and entity affected
  - Timestamp and additional details

---

## Relationships Overview

- **User → User**: Many-to-Many via `user_follow_user`
- **User → Author**: Many-to-Many via `user_follow_author`
- **User → Author Verification Requests**: One-to-Many
- **Book → Author**: Many-to-Many via `book_author`
- **Book → Genre**: Many-to-Many via `book_genre`
- **User → Lists**: One-to-Many
- **List → Book**: Many-to-Many via `list_books`
- **User → Ratings/Reviews**: One-to-Many
- **Book → Ratings/Reviews**: One-to-Many
- **Author → Ratings/Reviews**: One-to-Many
- **User → Notifications**: One-to-Many
- **User → Subscriptions**: One-to-Many
- **User → Interaction Events**: One-to-Many

---

## Notes

- Default lists (`Reading`, `Completed`, etc.) are created automatically for each user after signup (via Lambda), not in the schema.
- Many-to-many relationships are implemented with join tables.
- Foreign key constraints enforce data integrity and cascading deletes where appropriate.
