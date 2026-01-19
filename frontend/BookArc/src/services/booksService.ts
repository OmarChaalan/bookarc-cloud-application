import { fetchAuthSession } from "aws-amplify/auth";
import { authService } from './authService';

// Replace with your actual API Gateway URL
const API_URL = "https://nhjdde9qxc.execute-api.us-east-1.amazonaws.com/prod/books";

// ✅ Keep Book interface here
export interface Book {
  id: number;
  title: string;
  author: string;
  rating: number;
  totalRatings: number;
  cover: string;
  genre: string;
  description: string;
  publishYear: number;
  reviews?: number;
  coverUrl?: string;
  isTrending?: boolean;
  ratingBreakdown?: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}

/**
 * Helper function to get auth headers - uses authService like apiService.ts
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Use the same pattern as apiService.ts
  const idToken = authService.getIdToken();
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  
  return headers;
}

/**
 * Fetch all books from backend (RDS)
 * Note: Books are publicly accessible, no authentication required
 */
export async function getAllBooks(): Promise<Book[]> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(API_URL, {
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`Failed to fetch books: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform API response to match Book interface
    return data.map((book: any) => ({
      id: book.id || book.book_id,
      title: book.title,
      author: book.author,
      rating: book.rating || book.average_rating || 0,
      totalRatings: book.totalRatings || book.total_ratings || book.reviews || 0,
      reviews: book.reviews || book.totalRatings || book.total_ratings || 0,
      cover: book.cover || book.coverUrl || book.cover_image_url || "",
      coverUrl: book.coverUrl || book.cover || book.cover_image_url || "",
      genre: book.genre || "Unknown",
      description: book.description || book.summary || "",
      publishYear: book.publishYear || book.publish_year || new Date().getFullYear(),
      isTrending: book.isTrending || book.is_trending || false,
    }));
  } catch (error) {
    console.error("Error in getAllBooks:", error);
    throw error;
  }
}

/**
 * Fetch single book by ID
 * Note: Book details are publicly accessible, no authentication required
 */
export async function getBookById(id: number | string): Promise<Book> {
  const numericId = Number(id);

  if (!Number.isInteger(numericId)) {
    console.error("❌ Invalid book ID passed to getBookById:", id);
    throw new Error("Invalid book ID");
  }

  const headers = await getAuthHeaders();

  console.log("✅ Fetching book with numeric ID:", numericId);

  const response = await fetch(`${API_URL}/${numericId}`, {
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error Response:", errorText);
    throw new Error(`Failed to fetch book: ${response.status}`);
  }

  const book = await response.json();

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    rating: book.rating || 0,
    totalRatings: book.totalRatings || 0,
    reviews: book.reviews || 0,
    cover: book.cover || book.coverUrl || "",
    coverUrl: book.coverUrl || book.cover || "",
    genre: book.genre || "Unknown",
    description: book.description || "",
    publishYear: book.publishYear || new Date().getFullYear(),
    isTrending: book.isTrending || false,
  };
}


/**
 * Fetch reviews for a specific book
 * Note: Reviews are publicly accessible, no authentication required
 */
export async function getBookReviews(bookId: number): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/${bookId}/reviews`, {
      headers,
    });

    if (!response.ok) {
      // If endpoint doesn't exist yet, return empty array
      if (response.status === 404) {
        console.warn("Reviews endpoint not implemented yet");
        return [];
      }
      throw new Error(`Failed to fetch reviews: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return []; // Return empty array on error
  }
}

/**
 * Fetch book stores/retailers for a specific book
 * Note: Store information is publicly accessible, no authentication required
 */
export async function getBookStores(bookId: number): Promise<any[]> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/${bookId}/stores`, {
      headers,
    });

    if (!response.ok) {
      // If endpoint doesn't exist yet, return empty array
      if (response.status === 404) {
        console.warn("Stores endpoint not implemented yet");
        return [];
      }
      throw new Error(`Failed to fetch stores: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching stores:", error);
    return []; // Return empty array on error
  }
}

/**
 * Submit or update a rating for a book
 * ⚠️ REQUIRES AUTHENTICATION
 */
export async function rateBook(bookId: number, rating: number): Promise<void> {
  console.log(`⭐ Rating book ${bookId} with ${rating} stars`);
  
  // Get authenticated headers
  const headers = await getAuthHeaders();
  
  // Check if we have auth token
  if (!headers.Authorization) {
    console.error("❌ No authentication token available");
    throw new Error("Authentication required. Please log in.");
  }
  
  console.log("🔑 Sending request with auth token");

  const response = await fetch(`${API_URL}/${bookId}/ratings`, {
    method: "POST",
    headers,
    body: JSON.stringify({ rating }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Rating failed:", errorText);
    
    // Parse error message
    let errorMessage = `Failed to submit rating: ${errorText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Keep the original error text
    }
    
    throw new Error(errorMessage);
  }

  console.log("✅ Rating submitted successfully");
}

// ============================================
// ADD THIS FUNCTION to booksService.ts
// Place it right AFTER the rateBook function (after line ~244)
// ============================================

/**
 * Get user's existing rating for a book
 * ⚠️ REQUIRES AUTHENTICATION
 * Returns null if user hasn't rated the book yet or if not logged in
 */
export async function getUserBookRating(bookId: number): Promise<number | null> {
  console.log(`📖 Fetching user's rating for book ${bookId}`);
  
  // Get authenticated headers
  const headers = await getAuthHeaders();
  
  // If no auth token, user is not logged in
  if (!headers.Authorization) {
    console.log("ℹ️ No auth token - user not logged in");
    return null;
  }
  
  try {
    const response = await fetch(`${API_URL}/${bookId}/ratings`, {
      method: "GET",
      headers,
    });

    // If 404, user hasn't rated this book yet
    if (response.status === 404) {
      console.log("ℹ️ User hasn't rated this book yet");
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to fetch user rating:", errorText);
      throw new Error(`Failed to fetch rating: ${response.status}`);
    }

    const data = await response.json();
    const ratingValue = data.rating?.rating_value || data.rating_value || null;
    
    if (ratingValue !== null) {
      console.log(`⭐ User's rating: ${ratingValue}`);
    }
    
    return ratingValue;
  } catch (error: any) {
    console.error("Error fetching user rating:", error);
    // Don't throw error - just return null if can't fetch
    return null;
  }
}


/**
 * Submit a review for a book
 * ⚠️ REQUIRES AUTHENTICATION
 */
export async function submitReview(
  bookId: number,
  rating: number,
  reviewText: string
): Promise<void> {
  console.log(`💬 Submitting review for book ${bookId}`);
  
  // Get authenticated headers
  const headers = await getAuthHeaders();
  
  // Check if we have auth token
  if (!headers.Authorization) {
    console.error("❌ No authentication token available");
    throw new Error("Authentication required. Please log in.");
  }
  
  console.log("🔑 Sending request with auth token");

  const response = await fetch(`${API_URL}/${bookId}/reviews`, {
    method: "POST",
    headers,
    body: JSON.stringify({ rating, reviewText }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Review submission failed:", errorText);
    
    // Parse error message
    let errorMessage = `Failed to submit review: ${errorText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Keep the original error text
    }
    
    throw new Error(errorMessage);
  }

  console.log("✅ Review submitted successfully");
}

/**
 * Delete a review
 * ⚠️ REQUIRES AUTHENTICATION - Users can only delete their own reviews
 */
export async function deleteReview(
  bookId: number,
  reviewId: number
): Promise<void> {
  console.log(`🗑️ Deleting review ${reviewId} for book ${bookId}`);
  
  // Get authenticated headers
  const headers = await getAuthHeaders();
  
  // Check if we have auth token
  if (!headers.Authorization) {
    console.error("❌ No authentication token available");
    throw new Error("Authentication required. Please log in.");
  }
  
  console.log("🔑 Sending request with auth token");

  const response = await fetch(`${API_URL}/${bookId}/reviews/${reviewId}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Review deletion failed:", errorText);
    
    // Parse error message
    let errorMessage = `Failed to delete review: ${errorText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Keep the original error text
    }
    
    throw new Error(errorMessage);
  }

  console.log("✅ Review deleted successfully");
}