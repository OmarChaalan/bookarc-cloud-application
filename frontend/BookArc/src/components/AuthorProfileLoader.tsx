// AuthorProfileLoader.tsx - Update these parts:

import { useState, useEffect } from "react";
import { AuthorPublicProfilePage, Author } from "./AuthorPublicProfilePage";
import { apiService } from "../services/apiService";
import { toast } from "sonner";
import { Book } from "../types";

interface AuthorProfileLoaderProps {
  authorId: number;
  authorType?: 'registered' | 'external';
  onBack: () => void;
  onLogoClick?: () => void;
  onBookSelect?: (book: Book) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  isUserLoggedIn: boolean;
  onLoginRequired?: () => void;
  onReportSubmit?: (reportType: "user" | "author" | "review" | "book", targetName: string, reason: string, details?: string) => void;
  isFollowing?: boolean;
  onFollowAuthor?: (author: Author) => void;
  onUnfollowAuthor?: (authorId: number) => void;
  currentUser?: { isAdmin?: boolean };
  onUserSelect?: (userId: number) => void;
  onAuthorSelect?: (author: { id: number; authorType: 'registered' | 'external' }) => void;
}

export function AuthorProfileLoader({
  authorId,
  authorType,  // ✅ ADD THIS
  onBack,
  onLogoClick,
  onBookSelect,
  theme,
  onToggleTheme,
  isUserLoggedIn,
  onLoginRequired,
  onReportSubmit,
  isFollowing,
  onFollowAuthor,
  onUnfollowAuthor,
  currentUser,
  onUserSelect,
  onAuthorSelect,
}: AuthorProfileLoaderProps) {
  const [author, setAuthor] = useState<Author | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAuthorProfile = async () => {
      console.log(`📖 Loading author profile for ID: ${authorId}`);
      
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`📄 Fetching author profile for user ID: ${authorId}, type: ${authorType || 'auto'}`);
        
        // ✅ FIXED: Pass authorType to API call
        const profile = await apiService.getAuthorProfile(authorId, authorType);
        
        console.log(`✅ Author profile loaded:`, profile);
        console.log(`🔑 User ID: ${profile.id}`);
        console.log(`🔑 Author ID: ${profile.authorId}`);
        
        // Convert API response to Author interface
const authorData: Author = {
  id: profile.id,
  authorId: profile.authorId,
  name: profile.name,
  email: profile.email,
  avatarUrl: profile.avatarUrl,
  bio: profile.bio || '',
  website: profile.website,
  location: profile.location,
  joinDate: profile.joinDate,
  verified: profile.verified,
  authorType: profile.authorType,
  socialLinks: {
    twitter: '',
    instagram: '',
    facebook: '',
  },
  stats: {
    ...profile.stats,
    ratingBreakdown: profile.stats.ratingBreakdown || {  // ✅ Include this
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0
    }
  },
  books: profile.books,
};
        
        setAuthor(authorData);
      } catch (error: any) {
        console.error(`❌ Failed to load author profile:`, error);
        setError(error.message || 'Failed to load author profile');
        toast.error('Failed to load author profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (authorId) {
      loadAuthorProfile();
    }
  }, [authorId, authorType]);  // ✅ ADD authorType to dependencies

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading author profile...</p>
        </div>
      </div>
    );
  }

  if (error || !author) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Failed to Load Author</h2>
          <p className="text-muted-foreground mb-4">
            {error || 'Author not found'}
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthorPublicProfilePage
      author={author}
      onBack={onBack}
      onLogoClick={onLogoClick}
      onBookSelect={onBookSelect}
      theme={theme}
      onToggleTheme={onToggleTheme}
      isUserLoggedIn={isUserLoggedIn}
      onLoginRequired={onLoginRequired}
      onReportSubmit={onReportSubmit}
      isFollowing={isFollowing}
      onFollowAuthor={onFollowAuthor}
      onUnfollowAuthor={onUnfollowAuthor}
      currentUser={currentUser}
      onUserSelect={onUserSelect}
      onAuthorSelect={onAuthorSelect}
    />
  );
}