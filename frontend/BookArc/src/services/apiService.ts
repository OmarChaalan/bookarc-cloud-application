// src/services/apiService.ts

import { awsConfig, getApiUrl } from '../config/aws-config';
import { authService } from './authService';

class ApiService {
  // Helper method to make authenticated requests
    private getIdToken(): string | null {
    return authService.getIdToken();
  }

private async makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  console.log('ðŸš€ ===== API REQUEST START =====');
  
  const idToken = authService.getIdToken();
  console.log('ðŸ”‘ Getting token...');
  console.log('ðŸ”‘ Token exists?', !!idToken);
  
  if (!idToken) {
    console.error('âŒ NO TOKEN - User not authenticated');
    throw new Error('Not authenticated');
  }

  const url = getApiUrl(endpoint);
  console.log('ðŸ“ Full URL:', url);
  console.log('ðŸ“ Method:', options.method || 'GET');
  console.log('ðŸ“ Endpoint:', endpoint);
  console.log('ðŸ“ Body:', options.body);
  
  console.log('ðŸ“¤ Sending fetch request...');
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      ...options.headers,
    },
  });

  console.log('ðŸ“¥ Response received:');
  console.log('   Status:', response.status);
  console.log('   Status Text:', response.statusText);
  console.log('   OK?', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('âŒ Error response body:', errorText);
    
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: errorText };
    }
    
    console.error('âŒ Parsed error:', error);
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log('âœ… ===== API REQUEST SUCCESS =====');
  console.log('ðŸ“¦ Response data:', data);
  
  return data;
}

  
async getUserProfile(): Promise<{
  user_id: number;
  username: string;
  display_name?: string;
  email: string;
  role: 'normal' | 'premium' | 'author' | 'admin';
  profile_image?: string;
  bio?: string;
  location?: string;
  is_public: boolean;
  created_at: string;
  verification_status?: 'none' | 'pending' | 'approved' | 'rejected' | null;
}> {
  return this.makeRequest(awsConfig.api.endpoints.profile, {
    method: 'GET',
  });
}

  // Update user profile
 async updateUserProfile(data: {
  display_name?: string;
  bio?: string;
  location?: string;
  profile_image?: string;
}) {
  return this.makeRequest(awsConfig.api.endpoints.updateProfile, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

  // Delete user account
  async deleteUserAccount(): Promise<{ message: string; deleted_user_id?: number }> {
    return this.makeRequest(awsConfig.api.endpoints.deleteAccount, {
      method: 'DELETE',
      body: JSON.stringify({
        confirm_delete: true
      }),
    });
  }

  // Get books (example)
  async getBooks(params?: { genre?: string; search?: string }) {
    const queryString = params 
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    
    return this.makeRequest(`${awsConfig.api.endpoints.books}${queryString}`, {
      method: 'GET',
    });
  }

  // USER STATS & PROFILE PICTURE
async getUserStats(): Promise<{
  user_id: number;
  total_book_reviews: number;
  total_author_reviews: number;
  total_ratings: number;
  books_read: number;
  followers: number;
  following: number;
  author_ratings: Array<{
    author_id: number;
    author_name: string;
    author_avatar: string;
    rating_value: number;
    rated_at: string;
    user_id: number;
  }>;
  book_ratings: Array<{
    book_id: number;
    book_title: string;
    book_cover: string;
    book_author: string;
    rating_value: number;
    rated_at: string;
  }>;
  author_reviews: Array<{
    author_review_id: number;
    author_id: number;
    author_name: string;
    author_avatar: string;
    review_text: string;
    created_at: string;
    updated_at: string;
  }>;
  book_reviews: Array<{
    review_id: number;
    book_id: number;
    book_title: string;
    book_cover: string;
    book_author: string;
    review_text: string;
    rating_value: number;
    created_at: string;
    updated_at: string;
  }>;
}> {
  return this.makeRequest(awsConfig.api.endpoints.userStats, {
    method: 'GET',
  });
}

  async getPreSignedUrl(params: {
    fileType: string;
    fileName: string;
  }): Promise<{
    uploadUrl: string;
    fileUrl: string;
    key: string;
  }> {
    const queryString = new URLSearchParams({
      fileType: params.fileType,
      fileName: params.fileName,
    }).toString();

    return this.makeRequest(`${awsConfig.api.endpoints.preSignedUrl}?${queryString}`, {
      method: 'GET',
    });
  }

  async uploadToS3(presignedUrl: string, file: File): Promise<void> {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to S3');
    }
  }

  async uploadProfilePicture(file: File): Promise<{
    fileUrl: string;
    profile: any;
  }> {
    const { uploadUrl, fileUrl, key } = await this.getPreSignedUrl({
      fileType: file.type,
      fileName: file.name,
    });

    await this.uploadToS3(uploadUrl, file);

    const profile = await this.updateUserProfile({
      profile_image: fileUrl,
    });

    return { fileUrl, profile };
  }

  async updateProfilePictureUrl(data: {
    profile_image_url: string;
  }): Promise<{
    message: string;
    profile_image: string;
  }> {
    return this.makeRequest(awsConfig.api.endpoints.profilePicture, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ADMIN ENDPOINTS
  async getAdminStats(): Promise<{
    totalUsers: number;
    totalAuthors: number;
    totalBooks: number;
    pendingReports: number;
    usersGrowth: string;
    authorsGrowth: string;
    booksGrowth: string;
  }> {
    return this.makeRequest(awsConfig.api.endpoints.adminStats, {
      method: 'GET',
    });
  }

  async getAdminReports(params?: {
    status?: 'pending' | 'resolved' | 'dismissed';
  }): Promise<{
    reports: Array<{
      id: number;
      type: string;
      reporter: string;
      reported: string;
      reason: string;
      date: string;
      status: string;
    }>;
  }> {
    const queryString = params 
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    
    return this.makeRequest(`${awsConfig.api.endpoints.adminReports}${queryString}`, {
      method: 'GET',
    });
  }

  async getAdminUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    users: Array<{
      user_id: number;
      displayName: string;
      username: string;
      email: string;
      role: string;
      join_date: string;
      is_public: boolean;
      is_active: boolean;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryString = params 
      ? '?' + new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : '';
    
    return this.makeRequest(`${awsConfig.api.endpoints.adminUsers}${queryString}`, {
      method: 'GET',
    });
  }

  async getAdminAuthors(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    authors: Array<{
      author_id: number;
      name: string;
      email: string;
      verified: boolean;
      book_count: number;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryString = params 
      ? '?' + new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : '';
    
    return this.makeRequest(`${awsConfig.api.endpoints.adminAuthors}${queryString}`, {
      method: 'GET',
    });
  }

  async getAdminBooks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'pending' | 'approved' | 'rejected';
  }): Promise<{
    books: Array<{
      book_id: number;
      title: string;
      authors: string;
      genres: string;
      average_rating: number;
      approval_status: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryString = params 
      ? '?' + new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : '';
    
    return this.makeRequest(`${awsConfig.api.endpoints.adminBooks}${queryString}`, {
      method: 'GET',
    });
  }

  // Toggle user active status (activate/deactivate)
  async toggleUserStatus(
    userId: number,
    action: 'activate' | 'deactivate'
  ): Promise<{
    message: string;
    user: {
      user_id: number;
      username: string;
      email: string;
      role: string;
      is_active: boolean;
    };
  }> {
    const endpoint = `${awsConfig.api.endpoints.toggleUserStatus}/${userId}/toggle-status`;
    
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // Add new book (admin only)
  async addBook(data: {
    title: string;
    summary?: string | null;
    isbn?: string | null;
    publish_date?: string | null;
    cover_image_url?: string | null;
    source_name: string;
    authors: string[];
    genres: string[];
  }): Promise<{
    message: string;
    book: {
      book_id: number;
      title: string;
      authors: string[];
      genres: string[];
      isbn?: string;
      publish_date?: string;
      cover_image_url?: string;
      source_name: string;
    };
  }> {
    return this.makeRequest(awsConfig.api.endpoints.addBook, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async searchUsers(params: {
  q: string;
  limit?: number;
  include_private?: boolean;
}): Promise<{
  users: Array<{
    id: number;
    username: string;
    displayName: string;
    email: string;
    role: string;
    avatarUrl: string;
    bio?: string;
    location?: string;
    website?: string;
    isPrivate: boolean;
    joinDate: string;
    stats: {
      totalReviews: number;
      totalRatings: number;
      booksRead: number;
      followers: number;
      following: number;
    };
  }>;
  total: number;
  query: string;
}> {
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  // âœ… Use makePublicRequest instead of makeRequest
  return this.makePublicRequest(`${awsConfig.api.endpoints.searchUsers}?${queryString}`, {
    method: 'GET',
  });
}

async getUserById(userId: number): Promise<{
  id: number;
  username: string;
  email: string;
  avatarUrl: string;
  bio?: string;
  location?: string;
  website?: string;
  joinDate: string;
  isPrivate: boolean;
    stats: {
      totalReviews: number;
      totalRatings: number;
      booksRead: number;
      followers: number;
      following: number;
    };
    lists: Array<{
      id: number;
      name: string;
      count: number;
      isPublic: boolean;
    }>;
    recentReviews: Array<{
      id: number;
      bookId: number;
      bookTitle: string;
      bookAuthor: string;
      rating: number;
      comment: string;
      date: string;
      likes: number;
    }>;
    favoriteGenres: string[];
  }> {
    console.log(`ðŸ” API: Calling getUserById for user ${userId}`);
    console.log(`ðŸ” API: Type of userId: ${typeof userId}`);
    console.log(`ðŸ” API: userId value: ${userId}`);

    const endpoint = `${awsConfig.api.endpoints.getUserById}/${userId}`;
    console.log(`ðŸ” API: Full URL will be: ${getApiUrl(endpoint)}`);

    try {
      const result = await this.makeRequest<{
        id: number;
        username: string;
        email: string;
        avatarUrl: string;
        bio?: string;
        location?: string;
        joinDate: string;
        isPrivate: boolean;
        stats: {
          totalReviews: number;
          totalRatings: number;
          booksRead: number;
          followers: number;
          following: number;
        };
        lists: Array<{
          id: number;
          name: string;
          count: number;
          isPublic: boolean;
        }>;
        recentReviews: Array<{
          id: number;
          bookId: number;
          bookTitle: string;
          bookAuthor: string;
          rating: number;
          comment: string;
          date: string;
          likes: number;
        }>;
        favoriteGenres: string[];
      }>(endpoint, {
        method: 'GET',
      });

      console.log(`âœ… API: Successfully fetched user ${userId}`, result);
      return result;
    } catch (error: any) {
      console.error(`âŒ API: Error fetching user ${userId}:`, {
        error: error.message,
        endpoint,
        fullUrl: getApiUrl(endpoint),
      });
      throw error;
    }
  }

  // ==================== USER FOLLOW/UNFOLLOW ENDPOINTS ====================

  /**
   * Follow a user
   */
  async followUser(userId: number): Promise<{ 
    message: string; 
    followerId: number; 
    followingId: number;
  }> {
    const endpoint = `${awsConfig.api.endpoints.users}/${userId}/follow`;
    
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ action: 'follow' }),
    });
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: number): Promise<{ 
    message: string; 
    followerId: number; 
    followingId: number;
  }> {
    const endpoint = `${awsConfig.api.endpoints.users}/${userId}/follow`;
    
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ action: 'unfollow' }),
    });
  }

async getUserFollowers(userId: number): Promise<{
  followers: Array<{
    id: number;
    username: string;
    avatarUrl: string;
    bio?: string;
    isPrivate: boolean;
    followedAt: string;
    stats: {
      totalReviews: number;
      booksRead: number;
    };
  }>;
  total: number;
}> {
  const endpoint = `${awsConfig.api.endpoints.users}/${userId}/followers`;
  
  // âœ… Use makePublicRequest to allow viewing public follower lists
  return this.makePublicRequest(endpoint, {
    method: 'GET',
  });
}

async getUserFollowing(userId: number): Promise<{
  following: Array<{
    id: number;
    username: string;
    avatarUrl: string;
    bio?: string;
    isPrivate: boolean;
    followedAt: string;
    stats: {
      totalReviews: number;
      booksRead: number;
    };
  }>;
  total: number;
}> {
  const endpoint = `${awsConfig.api.endpoints.users}/${userId}/following`;
  
  // âœ… Use makePublicRequest to allow viewing public following lists
  return this.makePublicRequest(endpoint, {
    method: 'GET',
  });
}

async checkFollowStatus(userId: number): Promise<{
  isFollowing: boolean;
  followerId: number;
  followingId: number;
}> {
  const endpoint = `${awsConfig.api.endpoints.users}/${userId}/follower-status`;
  
  // âœ… Use makePublicRequest - returns false if not authenticated
  return this.makePublicRequest(endpoint, {
    method: 'GET',
  });
}

    // ==================== LIST MANAGEMENT ENDPOINTS ====================

  /**
   * Get all lists (default + custom) for the current user
   */
  async getUserLists(): Promise<{
    defaultLists: Array<{
      id: number;
      name: string;
      count: number;
      visibility: string;
      icon: string;
      created_at: string;
    }>;
    customLists: Array<{
      id: number;
      name: string;
      count: number;
      visibility: string;
      icon: string;
      created_at: string;
    }>;
    total: number;
  }> {
    return this.makeRequest(awsConfig.api.endpoints.lists, {
      method: 'GET',
    });
  }

  /**
   * Create a new custom list
   */
  async createList(data: {
    name: string;
    visibility?: 'public' | 'private';
  }): Promise<{
    message: string;
    list: {
      id: number;
      name: string;
      visibility: string;
      count: number;
      bookIds: number[];
      created_at: string;
    };
  }> {
    return this.makeRequest(awsConfig.api.endpoints.createList, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an existing custom list
   */
  async updateList(
    listId: number,
    data: {
      name?: string;
      visibility?: 'public' | 'private';
    }
  ): Promise<{
    message: string;
    list: {
      id: number;
      name: string;
      visibility: string;
    };
  }> {
    const endpoint = `${awsConfig.api.endpoints.updateList}/${listId}`;
    
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a custom list
   */
  async deleteList(listId: number): Promise<{
    message: string;
    deleted_list_id: number;
  }> {
    const endpoint = `${awsConfig.api.endpoints.deleteList}/${listId}`;
    
    return this.makeRequest(endpoint, {
      method: 'DELETE',
    });
  }

  async toggleListVisibility(
  listId: number,
  visibility: 'public' | 'private'
): Promise<{
  message: string;
  list: {
    id: number;
    name: string;
    visibility: string;
  };
}> {
  const endpoint = `${awsConfig.api.endpoints.updateList}/${listId}/visibility`;
  
  return this.makeRequest(endpoint, {
    method: 'PATCH',
    body: JSON.stringify({ visibility }),
  });
}

/**
 * Get lists for a specific user (public lists only if not the current user)
 * This endpoint does NOT require authentication for viewing public lists
 */
async getUserListsById(userId: number): Promise<{
  defaultLists: Array<{
    id: number;
    name: string;
    count: number;
    visibility: string;
    icon: string;
    created_at: string;
  }>;
  customLists: Array<{
    id: number;
    name: string;
    count: number;
    visibility: string;
    icon: string;
    created_at: string;
  }>;
  total: number;
}> {
  const endpoint = `${awsConfig.api.endpoints.users}/${userId}/lists`;
  const url = getApiUrl(endpoint);
  
  // Try with authentication first (in case this is the user's own profile)
  const idToken = this.getIdToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add auth header if available
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error(`âŒ Error fetching lists for user ${userId}:`, error);
    throw error;
  }
}

async getAllGenres(): Promise<{
  genres: Array<{
    genre_id: number;
    genre_name: string;
    book_count: number;
    is_favorited: boolean;
  }>;
  total: number;
  user_logged_in: boolean;
}> {
  try {
    return await this.makeRequest('/genres', {
      method: 'GET',
    });
  } catch (error: any) {
    const idToken = this.getIdToken();
    if (!idToken) {
      const url = getApiUrl('/genres');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch genres');
      }
      
      return response.json();
    }
    throw error;
  }
}

async favoriteGenre(genreId: number): Promise<{
  message: string;
  genre: {
    genre_id: number;
    genre_name: string;
    is_favorited: boolean;
  };
}> {
  const endpoint = `/genres/${genreId}/favorite`;
  
  return this.makeRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ action: 'favorite' }),
  });
}

/**
 * Remove a genre from user's favorites
 */
async unfavoriteGenre(genreId: number): Promise<{
  message: string;
  genre: {
    genre_id: number;
    genre_name: string;
    is_favorited: boolean;
  };
}> {
  const endpoint = `/genres/${genreId}/favorite`;
  
  return this.makeRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ action: 'unfavorite' }),
  });
}

/**
 * Get user's favorite genres
 */
async getUserFavoriteGenres(): Promise<{
  genres: Array<{
    genre_id: number;
    genre_name: string;
    book_count: number;
  }>;
  total: number;
}> {
  // Use the existing /genres endpoint which returns is_favorited
  console.log("ðŸ“ž Calling getAllGenres()...");
  const response = await this.getAllGenres();
  
  console.log("ðŸ“¦ getAllGenres response:", response);
  console.log("ðŸ“Š Total genres returned:", response.genres?.length);
  console.log("ðŸ” Checking is_favorited flags:", response.genres?.map(g => ({
    name: g.genre_name,
    is_favorited: g.is_favorited
  })));
  
  // Filter to only return favorited genres
  const favoritedGenres = response.genres.filter(g => g.is_favorited);
  
  console.log("â­ Favorited genres after filter:", favoritedGenres);
  console.log("ðŸ“Š Number of favorited genres:", favoritedGenres.length);
  
  return {
    genres: favoritedGenres.map(g => ({
      genre_id: g.genre_id,
      genre_name: g.genre_name,
      book_count: g.book_count,
    })),
    total: favoritedGenres.length,
  };
}

  /**
   * Get personalized book recommendations for the current user
   */
  async getRecommendations(params?: {
    num_results?: number;
  }): Promise<{
    recommendations: Array<{
      book_id: number;
      title: string;
      summary?: string;
      cover_image_url?: string;
      average_rating: number;
      publish_date?: string;
      publish_year?: number;
      authors: string;
      genres: string;
      reason: string;
    }>;
    total: number;
    source: 'custom_algorithm' | 'fallback';
    has_favorite_genres: boolean;
  }> {
    const queryString = params 
      ? '?' + new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : '';
    
    return this.makeRequest(`${awsConfig.api.endpoints.recommendations}${queryString}`, {
      method: 'GET',
    });
  }

  /**
   * Record a user interaction with a book
   * Event types: 'view', 'rate', 'review', 'add_to_list', 'complete'
   */
  async recordInteraction(data: {
    book_id: number;
    event_type: 'view' | 'rate' | 'review' | 'add_to_list' | 'complete';
    event_value?: number;
  }): Promise<{
    message: string;
    event_type: string;
    book_id: number;
    timestamp: number;
  }> {
    return this.makeRequest(awsConfig.api.endpoints.recordInteraction, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

    /**
   * Submit a new book for admin approval (author only)
   */
// In your apiService.ts file, find the submitBook method and replace it with this:

/**
 * Submit a new book for admin approval (author only)
 * Authors field is now optional - backend will auto-assign the logged-in author
 */
async submitBook(data: {
  title: string;
  summary?: string | null;
  isbn?: string | null;
  publish_date?: string | null;
  cover_image_url?: string | null;
  authors?: string[];  // âœ… Made optional with ?
  genres: string[];
}): Promise<{
  message: string;
  book: {
    book_id: number;
    title: string;
    authors: string[];
    genres: string[];
    isbn?: string;
    publish_date?: string;
    cover_image_url?: string;
    approval_status: string;
    submitted_by: string;
  };
}> {
  return this.makeRequest('/author/books', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

  /**
   * Get all books submitted by the current author
   */
  async getAuthorBooks(): Promise<{
    books: Array<{
      book_id: number;
      title: string;
      summary?: string;
      isbn?: string;
      publish_date?: string;
      cover_image_url?: string;
      approval_status: 'pending' | 'approved' | 'rejected';
      rejection_reason?: string;
      average_rating: number;
      authors: string;
      genres: string;
      created_at: string;
      approved_at?: string;
      approved_by?: string;
    }>;
    total: number;
  }> {
    return this.makeRequest('/author/books', {
      method: 'GET',
    });
  }

  /**
   * Update a pending book (author can only edit pending books)
   */
async updatePendingBook(
  bookId: number,
  data: {
    title?: string;
    summary?: string | null;
    isbn?: string | null;
    publish_date?: string | null;
    cover_image_url?: string | null;
    authors?: string[];  // âœ… Made optional with ?
    genres?: string[];
  }
): Promise<{
  message: string;
  book: any;
}> {
  const endpoint = `/author/books/${bookId}`;
  
  return this.makeRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

  /**
   * Delete a pending book
   */
  async deletePendingBook(bookId: number): Promise<{
    message: string;
    deleted_book_id: number;
  }> {
    const endpoint = `/author/books/${bookId}`;
    
    return this.makeRequest(endpoint, {
      method: 'DELETE',
    });
  }

  // ==================== ADMIN BOOK APPROVAL ENDPOINTS ====================

  /**
   * Get all pending books (admin only)
   */
  async getAdminPendingBooks(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    books: Array<{
      book_id: number;
      title: string;
      summary?: string;
      isbn?: string;
      publish_date?: string;
      cover_image_url?: string;
      approval_status: string;
      authors: string;
      genres: string;
      source_name: string;
      submitted_at: string;
      submitted_by: {
        user_id: number;
        username: string;
        email: string;
      };
    }>;
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  }> {
    const queryString = params 
      ? '?' + new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : '';
    
    return this.makeRequest(`/admin/books/pending${queryString}`, {
      method: 'GET',
    });
  }

  /**
   * Approve a pending book (admin only)
   */
  async approveBook(bookId: number): Promise<{
    message: string;
    book: {
      book_id: number;
      title: string;
      authors: string;
      genres: string;
      approval_status: string;
      approved_at: string;
      approved_by: string;
    };
  }> {
    const endpoint = `/admin/books/${bookId}/approve`;
    
    return this.makeRequest(endpoint, {
      method: 'POST',
    });
  }

  /**
   * Reject a pending book (admin only)
   */
  async rejectBook(
    bookId: number,
    rejectionReason: string
  ): Promise<{
    message: string;
    book: {
      book_id: number;
      title: string;
      approval_status: string;
      rejection_reason: string;
      rejected_by: string;
    };
  }> {
    const endpoint = `/admin/books/${bookId}/reject`;
    
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
  }

async searchAuthors(params: {
  q: string;
  limit?: number;
}): Promise<{
  authors: Array<{
    id: number;
    name: string;
    email: string;
    avatarUrl: string;
    bio?: string;
    location?: string;
    website?: string;
    verified: boolean;
    joinDate: string;
    authorType: 'registered' | 'external';
    stats: {
      totalBooks: number;
      totalReads: number;
      totalRatings: number;
      avgRating: number;
      followers: number;
    };
  }>;
  total: number;
  query: string;
}> {
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  // âœ… Use makePublicRequest instead of makeRequest
  return this.makePublicRequest(`${awsConfig.api.endpoints.searchAuthors}?${queryString}`, {
    method: 'GET',
  });
}


async getAuthorProfile(
  id: number,
  authorType?: 'registered' | 'external'
): Promise<{
  id: number;
  authorId: number;
  name: string;
  email: string;
  avatarUrl: string;
  bio?: string;
  location?: string;
  website?: string;
  verified: boolean;
  joinDate: string;
  authorType: 'registered' | 'external';
  stats: {
    totalBooks: number;
    totalReads: number;
    totalRatings: number;
    avgRating: number;
    followers: number;
    totalReviews: number;
    ratingBreakdown: {
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  };
  books: Array<any>;
}> {
  console.log(`📖 API: Fetching author profile for ID: ${id}, type: ${authorType || 'auto'}`);
  
  // ✅ SIMPLIFIED: Just use /author/{id} - your backend handles the logic
  const endpoint = `/author/${id}`;
  console.log(`🔍 Using endpoint: ${endpoint}`);
  
  try {
    const result = await this.makePublicRequest<any>(endpoint, {
      method: 'GET',
    });
    
    console.log(`✅ API: Successfully fetched author profile:`, result);
    console.log(`🔑 User ID: ${result.id}, Author ID: ${result.authorId}`);
    return result;
  } catch (error: any) {
    console.error(`❌ API: Error fetching author profile for ID ${id}:`, error);
    throw error;
  }
}

/**
 * Submit author verification request with ID and selfie images
 */
async submitAuthorVerification(data: {
  full_name: string;
  id_card_image: string;  // Base64 encoded
  selfie_image: string;   // Base64 encoded
}): Promise<{
  message: string;
  verification_status: string;
  submitted_at: string;
}> {
  return this.makeRequest('/author/verification', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get current user's verification status
 */
async getVerificationStatus(): Promise<{
  user_id: number;
  username: string;
  email: string;
  role: string;
  verification_status: string;
  verified_at?: string;
  latest_request?: {
    request_id: number;
    full_name: string;
    status: string;
    submitted_at: string;
    reviewed_at?: string;
    rejection_reason?: string;
  };
}> {
  return this.makeRequest('/author/verification', {
    method: 'GET',
  });
}

/**
 * Get all verification requests (admin only)
 */
async getAdminVerificationRequests(params?: {
  status?: 'pending' | 'approved' | 'rejected';
  page?: number;
  limit?: number;
}): Promise<{
  requests: Array<{
    request_id: number;
    user_id: number;
    username: string;
    email: string;
    profile_image?: string;
    full_name: string;
    id_image_url: string;
    selfie_image_url: string;
    status: string;
    submitted_at: string;
    reviewed_at?: string;
    reviewed_by?: number;
    rejection_reason?: string;
    reviewed_by_username?: string;
  }>;
  total: number;
  page: number;
  total_pages: number;
  limit: number;
}> {
  const queryString = params 
    ? '?' + new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString()
    : '';
  
  return this.makeRequest(`/admin/verification-requests${queryString}`, {
    method: 'GET',
  });
}

/**
 * Approve a verification request (admin only)
 */
async approveAuthorVerification(requestId: number): Promise<{
  message: string;
  request_id: number;
  user_id: number;
  username: string;
  approved_at: string;
}> {
  const endpoint = `/admin/verification-requests/${requestId}/approve`;
  
  return this.makeRequest(endpoint, {
    method: 'POST',
  });
}

/**
 * Reject a verification request (admin only)
 */
async rejectAuthorVerification(
  requestId: number,
  rejectionReason: string
): Promise<{
  message: string;
  request_id: number;
  user_id: number;
  username: string;
  rejection_reason: string;
  rejected_at: string;
}> {
  const endpoint = `/admin/verification-requests/${requestId}/reject`;
  
  return this.makeRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ rejection_reason: rejectionReason }),
  });
}

/**
 * Get author's book statistics including author rating
 */
async getAuthorBookStats(): Promise<{
  author_stats: {
    avgRating: number;
    totalRatings: number;
    totalReviews: number;
    ratingBreakdown: {
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  };
  author_id: number;
  books: Array<{
    book_id: number;
    title: string;
    summary?: string;
    isbn?: string;
    publish_date?: string;
    cover_image_url?: string;
    approval_status: string;
    created_at: string;
    approved_at?: string;
    average_rating: number;
    genres: string;
    authors: string;
    total_reviews: number;
    total_ratings: number;
    rating_breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  }>;
  stats: {
    total_books: number;
    published_books: number;
    pending_books: number;
    rejected_books: number;
    total_reviews: number;
    total_ratings: number;
    overall_avg_rating: number;
  };
}> {
  return this.makeRequest('/author/books/stats', {
    method: 'GET',
  });
}

// ==================== NOTIFICATION ENDPOINTS ====================

/**
 * Get all notifications for the current user
 */
async getNotifications(params?: {
  page?: number;
  limit?: number;
  is_read?: boolean;
  type?: string;
}): Promise<{
  notifications: Array<{
    notification_id: number;
    user_id: number;
    message: string;
    type: string;
    audience_type: string;
    is_read: boolean;
    created_at: string;
  }>;
  total: number;
  unread_count: number;
  page: number;
  total_pages: number;
}> {
  const queryString = params 
    ? '?' + new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString()
    : '';
  
  return this.makeRequest(`${awsConfig.api.endpoints.notifications}${queryString}`, {
    method: 'GET',
  });
}

/**
 * Mark a notification as read
 */
async markNotificationAsRead(notificationId: number): Promise<{
  message: string;
  notification_id: number;
  is_read: boolean;
}> {
  const endpoint = `${awsConfig.api.endpoints.markNotificationRead}/${notificationId}/read`;
  
  return this.makeRequest(endpoint, {
    method: 'PATCH',
  });
}

/**
 * Mark all notifications as read
 */
async markAllNotificationsAsRead(): Promise<{
  message: string;
  updated_count: number;
}> {
  return this.makeRequest(awsConfig.api.endpoints.markAllNotificationsRead, {
    method: 'PATCH',
  });
}

/**
 * Delete a notification
 */
async deleteNotification(notificationId: number): Promise<{
  message: string;
  deleted_notification_id: number;
}> {
  const endpoint = `${awsConfig.api.endpoints.deleteNotification}/${notificationId}`;
  
  return this.makeRequest(endpoint, {
    method: 'DELETE',
  });
}

/**
 * Get notification preferences
 */
async getNotificationPreferences(): Promise<{
  pref_id: number;
  user_id: number;
  allow_email: boolean;
  allow_author_updates: boolean;
  allow_premium_offers: boolean;
}> {
  return this.makeRequest(awsConfig.api.endpoints.notificationPreferences, {
    method: 'GET',
  });
}

/**
 * Update notification preferences
 */
async updateNotificationPreferences(data: {
  allow_email?: boolean;
  allow_author_updates?: boolean;
  allow_premium_offers?: boolean;
}): Promise<{
  message: string;
  preferences: {
    pref_id: number;
    user_id: number;
    allow_email: boolean;
    allow_author_updates: boolean;
    allow_premium_offers: boolean;
  };
}> {
  return this.makeRequest(awsConfig.api.endpoints.notificationPreferences, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

private async makePublicRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(endpoint);
  const idToken = this.getIdToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  // Add auth header if available (for authenticated users to get more data)
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // âœ… FIXED: Handle 401 for followers/following with correct structure
    if (response.status === 401) {
      console.log('âš ï¸ 401 Unauthorized on public endpoint:', endpoint);
      
      // Return appropriate empty structure based on endpoint
      if (endpoint.includes('/followers')) {
        console.log('â„¹ï¸ Returning empty followers array for unauthenticated request');
        return { followers: [], total: 0 } as T;
      }
      
      if (endpoint.includes('/following')) {
        console.log('â„¹ï¸ Returning empty following array for unauthenticated request');
        return { following: [], total: 0 } as T;
      }
      
      // For other endpoints, throw the error
      const error = await response.json().catch(() => ({ message: 'Unauthorized' }));
      throw new Error(error.message || 'Unauthorized');
    }
    
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Add these methods to your apiService.ts class

// ==================== AUTHOR RATING ENDPOINTS ====================

/**
 * Rate an author (1-5 stars)
 * Uses: POST /author/{user_id}/rating
 */
async rateAuthor(
  authorId: number,
  ratingValue: number
): Promise<{
  message: string;
  rating: {
    user_id: number;
    author_id: number;
    rating_value: number;
    avg_rating: number;
    total_ratings: number;
  };
}> {
  const endpoint = `/authors/${authorId}/rating`;  // ✅ FIXED
  const fullUrl = getApiUrl(endpoint);
  
  console.log('🚀 RATING REQUEST:', {
    authorId,
    ratingValue,
    fullUrl,
    method: 'POST',
    hasToken: !!this.getIdToken()
  });
  
  try {
    const result = await this.makeRequest<{
      message: string;
      rating: {
        user_id: number;
        author_id: number;
        rating_value: number;
        avg_rating: number;
        total_ratings: number;
      };
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ rating_value: ratingValue }),
    });
    
    console.log('✅ RATING RESPONSE:', result);
    return result;
  } catch (error: any) {
    console.error('❌ RATING ERROR:', {
      message: error.message,
      endpoint,
      fullUrl
    });
    throw error;
  }
}


/**
 * Get user's rating for an author
 * Uses: GET /author/{user_id}/rating
 */
async getUserAuthorRating(authorId: number): Promise<{
  rating: {
    author_rating_id: number;
    rating_value: number;
    created_at: string;
  };
}> {
  const endpoint = `/authors/${authorId}/rating`; 
  
  return this.makeRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Delete user's rating for an author
 * Uses: DELETE /author/{user_id}/rating
 */
async deleteAuthorRating(authorId: number): Promise<{
  message: string;
}> {
  const endpoint = `/authors/${authorId}/rating`;  // ✅ FIXED
  
  return this.makeRequest(endpoint, {
    method: 'DELETE',
  });
}

// ==================== AUTHOR REVIEW ENDPOINTS ====================

/**
 * Write a review for an author
 * Uses: POST /author/{user_id}/review
 */
async writeAuthorReview(
  authorId: number,
  reviewText: string
): Promise<{
  message: string;
  review: {
    author_review_id: number;
    user_id: number;
    username: string;
    avatar_url: string;
    author_id: number;
    review_text: string;
    created_at: string;
  };
}> {
  const endpoint = `/authors/${authorId}/review`;
  
  return this.makeRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ review_text: reviewText }),
  });
}

/**
 * Get user's review for an author
 * Uses: GET /author/{user_id}/review
 */
async getUserAuthorReview(authorId: number): Promise<{
  review: {
    author_review_id: number;
    username: string;
    avatar_url: string;
    review_text: string;
    created_at: string;
    updated_at: string;
  };
}> {
  const endpoint = `/authors/${authorId}/review`;
  
  return this.makeRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Update user's review for an author
 * Uses: PUT /author/{user_id}/review
 */
async updateAuthorReview(
  authorId: number,
  reviewText: string
): Promise<{
  message: string;
  review_text: string;
}> {
  const endpoint = `/authors/${authorId}/review`;
  
  return this.makeRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify({ review_text: reviewText }),
  });
}

/**
 * Delete user's review for an author
 * Uses: DELETE /author/{user_id}/review
 */
async deleteAuthorReview(authorId: number): Promise<{
  message: string;
}> {
  const endpoint = `/authors/${authorId}/review`;
  
  return this.makeRequest(endpoint, {
    method: 'DELETE',
  });
}

/**
 * Get all reviews for an author (public endpoint, no auth required)
 * Uses: GET /author/{user_id}/reviews
 */
async getAuthorReviews(authorId: number): Promise<{
  reviews: Array<{
    author_review_id: number;
    user_id: number;
    username: string;
    avatar_url: string;
    review_text: string;
    created_at: string;
    updated_at: string;
  }>;
  total: number;
}> {
  const endpoint = `/authors/${authorId}/reviews`;
  
  return this.makePublicRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Follow an author (works for both registered and external authors)
 * @param authorId - The author_id from the authors table
 * @param authorType - 'registered' or 'external'
 */
async followAuthor(
  authorId: number,  // âœ… This should be author_id from authors table
  authorType: 'registered' | 'external'
): Promise<{ 
  message: string; 
  userId: number; 
  authorId: number;
  authorType: string;
}> {
  const endpoint = `/authors/${authorId}/follow`;  // âœ… Using /authors/{author_id}/follow
  
  return this.makeRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ 
      action: 'follow',
      author_type: authorType  // Optional metadata
    }),
  });
}

/**
 * Unfollow an author (works for both registered and external authors)
 */
async unfollowAuthor(
  authorId: number,
  authorType: 'registered' | 'external'
): Promise<{ 
  message: string; 
  userId: number; 
  authorId: number;
}> {
  const endpoint = `/authors/${authorId}/follow`; 
  
  return this.makeRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ 
      action: 'unfollow',
      author_type: authorType 
    }),
  });
}

/**
 * Check if current user is following an author
 */
async checkAuthorFollowStatus(authorId: number): Promise<{
  isFollowing: boolean;
  userId: number;
  authorId: number;
}> {
  const endpoint = `/authors/${authorId}/follow-status`;
  
  return this.makePublicRequest(endpoint, {
    method: 'GET',
  });
}


/**
 * Get all authors the current user is following
 */
async getFollowedAuthors(): Promise<{
  authors: Array<{
    author_id: number;
    name: string;
    bio?: string;
    verified: boolean;
    average_rating: number;
    is_registered_author: boolean;
    user_id?: number;
    external_source_id?: string;
    followed_at: string;
    stats: {
      totalBooks: number;
      followers: number;
    };
  }>;
  total: number;
}> {
  return this.makeRequest('/author/following', {
    method: 'GET',
  });
}

/**
 * Get followers of an author (public endpoint)
 */
async getAuthorFollowers(authorId: number): Promise<{
  followers: Array<{
    user_id: number;
    username: string;
    avatar_url: string;
    bio?: string;
    followed_at: string;
  }>;
  total: number;
}> {
  const endpoint = `/authors/${authorId}/followers`;
  
  return this.makePublicRequest(endpoint, {
    method: 'GET',
  });
}

/**
 * Add a book to a specific list
 * POST /lists/{list_id}/books
 */
async addBookToList(
  listId: number,
  bookId: number
): Promise<{
  message: string;
  list_book: {
    list_book_id: number;
    list_id: number;
    book_id: number;
    added_at: string;
  };
}> {
  console.log('📚 Adding book to list:', { listId, bookId });
  
  return this.makeRequest(`${awsConfig.api.endpoints.lists}/${listId}/books`, {
    method: 'POST',
    body: JSON.stringify({ book_id: bookId }),
  });
}

/**
 * Remove a book from a specific list
 * DELETE /lists/{list_id}/books/{book_id}
 */
async removeBookFromList(
  listId: number,
  bookId: number
): Promise<{
  message: string;
}> {
  console.log('🗑️ Removing book from list:', { listId, bookId });
  
  return this.makeRequest(`${awsConfig.api.endpoints.lists}/${listId}/books/${bookId}`, {
    method: 'DELETE',
  });
}

/**
 * Get which lists contain a specific book
 * GET /books/{book_id}/lists
 */
async getBookLists(bookId: number): Promise<{
  lists: Array<{
    list_id: number;
    name: string;
    title?: string;
    added_at: string;
  }>;
}> {
  return this.makeRequest(`${awsConfig.api.endpoints.books}/${bookId}/lists`, {
    method: 'GET',
  });
}

}
export const apiService = new ApiService();