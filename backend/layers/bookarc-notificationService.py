"""
Notification Service for BookArc
Add this as a Lambda Layer and import in your Lambda functions
"""

import pymysql
from typing import Optional, List


class NotificationService:
    """Service for creating and managing notifications"""
    
    def __init__(self, connection):
        self.connection = connection
    
    def create_notification(
        self, 
        user_id: int, 
        message: str, 
        notification_type: str,
        audience_type: str = 'all'
    ) -> Optional[int]:
        """
        Create a single notification
        
        Args:
            user_id: User to notify
            message: Notification message
            notification_type: Type (e.g., 'book_approval', 'new_follower')
            audience_type: 'normal', 'premium', 'author', 'admin', or 'all'
            
        Returns:
            notification_id or None if failed
        """
        try:
            with self.connection.cursor() as cursor:
                sql = """
                    INSERT INTO notifications 
                    (user_id, message, type, audience_type, is_read, created_at)
                    VALUES (%s, %s, %s, %s, FALSE, NOW())
                """
                cursor.execute(sql, (user_id, message, notification_type, audience_type))
                self.connection.commit()
                return cursor.lastrowid
        except Exception as e:
            print(f"Error creating notification: {str(e)}")
            return None
    
    def get_user_display_name(self, user_id: int) -> str:
        """Get user's display name or username"""
        try:
            with self.connection.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute(
                    "SELECT COALESCE(display_name, username) as name FROM users WHERE user_id = %s",
                    (user_id,)
                )
                result = cursor.fetchone()
                return result['name'] if result else 'A user'
        except Exception as e:
            print(f"Error getting user name: {str(e)}")
            return 'A user'
    
    # Author Notifications
    def notify_book_submitted(self, user_id: int, book_title: str) -> Optional[int]:
        """Notify author that their book was submitted"""
        message = f'Your book "{book_title}" has been successfully submitted and is pending review.'
        return self.create_notification(user_id, message, 'book_submission', 'author')
    
    def notify_book_approved(self, user_id: int, book_title: str) -> Optional[int]:
        """Notify author that their book was approved"""
        message = f'Congratulations! Your book "{book_title}" has been approved and is now live.'
        return self.create_notification(user_id, message, 'book_approval', 'author')
    
    def notify_book_rejected(
        self, 
        user_id: int, 
        book_title: str, 
        rejection_reason: Optional[str] = None
    ) -> Optional[int]:
        """Notify author that their book was rejected"""
        message = f'Your book "{book_title}" was rejected.'
        if rejection_reason:
            message += f' Reason: {rejection_reason}'
        return self.create_notification(user_id, message, 'book_rejection', 'author')
    
    def notify_user_new_follower(self, user_id: int, follower_name: str) -> Optional[int]:
        """Notify user of a new follower"""
        message = f'{follower_name} is now following you!'
        return self.create_notification(user_id, message, 'new_follower', 'all')
    
    def notify_password_changed(self, user_id: int) -> Optional[int]:
        """Notify user that password was changed"""
        message = 'Your password was successfully changed.'
        return self.create_notification(user_id, message, 'password_change', 'all')
    
    def notify_verification_approved(self, user_id: int) -> Optional[int]:
        """Notify user that author verification was approved"""
        message = 'Congratulations! Your author verification has been approved. You can now access your Author Dashboard.'
        return self.create_notification(user_id, message, 'verification_approved', 'author')
    
    def notify_verification_rejected(
        self, 
        user_id: int, 
        rejection_reason: Optional[str] = None
    ) -> Optional[int]:
        """Notify user that author verification was rejected"""
        message = 'Your author verification request was rejected.'
        if rejection_reason:
            message += f' Reason: {rejection_reason}'
        return self.create_notification(user_id, message, 'verification_rejected', 'normal')
    
    def notify_followers_new_book(self, author_user_id: int, book_title: str) -> int:
        """Notify all followers that author published a new book"""
        try:
            with self.connection.cursor() as cursor:
                # Get all followers of this author
                cursor.execute("""
                    SELECT ufa.user_id
                    FROM user_follow_author ufa
                    JOIN authors a ON ufa.author_id = a.author_id
                    WHERE a.user_id = %s
                """, (author_user_id,))
                
                follower_ids = [row[0] for row in cursor.fetchall()]
            
            if follower_ids:
                # Get author name
                author_name = self.get_user_display_name(author_user_id)
                
                message = f'{author_name} just published a new book: "{book_title}"'
                
                # Create notifications for all followers
                with self.connection.cursor() as cursor:
                    sql = """
                        INSERT INTO notifications 
                        (user_id, message, type, audience_type, is_read, created_at)
                        VALUES (%s, %s, 'author_update', 'normal', FALSE, NOW())
                    """
                    values = [(uid, message) for uid in follower_ids]
                    cursor.executemany(sql, values)
                    self.connection.commit()
                    return cursor.rowcount
            return 0
        except Exception as e:
            print(f"Error notifying followers: {str(e)}")
            return 0


# Standalone helper function for quick use
def send_notification(connection, user_id, message, notification_type, audience_type='all'):
    """Quick helper to send a notification"""
    service = NotificationService(connection)
    return service.create_notification(user_id, message, notification_type, audience_type)
