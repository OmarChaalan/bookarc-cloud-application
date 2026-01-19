// src/hooks/useUserStats.ts

import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

interface UserStats {
  user_id: number;
  total_reviews: number;
  total_ratings: number;
  books_read: number;
  followers: number;
  following: number;
}

export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getUserStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load user stats:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return {
    stats,
    isLoading,
    error,
    refetch: loadStats,
  };
}

// Usage example:
// const { stats, isLoading, error, refetch } = useUserStats();
// if (isLoading) return <div>Loading...</div>;
// if (error) return <div>Error: {error.message}</div>;
// return <div>Reviews: {stats?.total_reviews}</div>;