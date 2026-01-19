// src/utils/timeUtils.ts

/**
 * Format a UTC timestamp to local time
 * @param timestamp - ISO 8601 timestamp from database (UTC)
 * @returns Formatted local time string
 */
export const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return 'Unknown';
  
  // Ensure the timestamp is treated as UTC
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  const date = new Date(utcTimestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Relative time for recent timestamps
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  // For older dates, show formatted date in local timezone
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format timestamp to full date and time in local timezone
 * @param timestamp - ISO 8601 timestamp from database (UTC)
 * @returns Full formatted date/time string
 */
export const formatFullDateTime = (timestamp: string): string => {
  if (!timestamp) return 'Unknown';
  
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  const date = new Date(utcTimestamp);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format timestamp to date only in local timezone
 * @param timestamp - ISO 8601 timestamp from database (UTC)
 * @returns Formatted date string
 */
export const formatDate = (timestamp: string): string => {
  if (!timestamp) return 'Unknown';
  
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  const date = new Date(utcTimestamp);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format timestamp to short date (MMM DD, YYYY)
 * @param timestamp - ISO 8601 timestamp from database (UTC)
 * @returns Short formatted date string
 */
export const formatShortDate = (timestamp: string): string => {
  if (!timestamp) return 'Unknown';
  
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  const date = new Date(utcTimestamp);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get time ago string (e.g., "2 hours ago", "3 days ago")
 * @param timestamp - ISO 8601 timestamp from database (UTC)
 * @returns Relative time string
 */
export const getTimeAgo = (timestamp: string): string => {
  if (!timestamp) return 'Unknown';
  
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  const date = new Date(utcTimestamp);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffMs / 604800000);
  const diffMonths = Math.floor(diffMs / 2592000000);
  const diffYears = Math.floor(diffMs / 31536000000);

  if (diffSecs < 10) return "Just now";
  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
};

/**
 * Check if a timestamp is today
 * @param timestamp - ISO 8601 timestamp from database (UTC)
 * @returns boolean
 */
export const isToday = (timestamp: string): boolean => {
  if (!timestamp) return false;
  
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  const date = new Date(utcTimestamp);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

/**
 * Check if a timestamp is within the last N days
 * @param timestamp - ISO 8601 timestamp from database (UTC)
 * @param days - Number of days
 * @returns boolean
 */
export const isWithinDays = (timestamp: string, days: number): boolean => {
  if (!timestamp) return false;
  
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  const date = new Date(utcTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / 86400000;
  
  return diffDays <= days;
};