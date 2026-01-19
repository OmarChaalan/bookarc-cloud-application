// src/types.ts
import { Book } from './services/booksService'; // ✅ Import Book first

// Now re-export it so other files can import from types.ts
export { Book };

export interface Author {
  id: number;
  name: string;
  penName?: string;
  email?: string;
  avatarUrl: string;
  bio: string;
  website?: string;
  location?: string;
  joinDate: string;
  verified: boolean;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  stats: {
    totalBooks: number;
    totalReads: number;
    totalRatings: number;
    avgRating: number;
    followers: number;
  };
  books: Book[]; // ✅ Now Book is available
  reviews?: AuthorReview[];
}

export interface AuthorReview {
  id: string;
  reader: string;
  rating: number;
  book?: string;
  comment: string;
  date: string;
  avatarSeed: string;
}

export interface UserProfile {
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
    bookTitle: string;
    bookAuthor: string;
    rating: number;
    comment: string;
    date: string;
    likes: number;
  }>;
  favoriteGenres: string[];
}