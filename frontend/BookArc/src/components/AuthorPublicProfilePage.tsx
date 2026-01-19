import { useState, useEffect, useRef } from "react";
import { ArrowLeft, BookMarked, Star, Users, BookOpen, Award, MapPin, LinkIcon, Mail, Calendar, ChevronLeft, ChevronRight, MessageSquare, ThumbsUp, Lock, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { ThemeToggle } from "./ThemeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BookCard } from "./BookCard";
import { ReportDialog } from "./ReportDialog";
import { WriteReviewDialog } from "./WriteReviewDialog";
import { toast } from "sonner";
import { Book } from "../types";
import { FollowersModal } from "./FollowersModal";
import { apiService } from "../services/apiService";
import AuthorRatingReview from "./AuthorRatingAndReview";

export interface AuthorReview {
  id: string;
  reader: string;
  rating: number;
  book?: string;
  comment: string;
  date: string;
  avatarSeed: string;
}

export interface Author {
  id: number;
  authorId?: number;
  name: string;
  penName?: string;
  email?: string;
  avatarUrl: string;
  bio: string;
  website?: string;
  location?: string;
  joinDate: string;
  verified: boolean;
  authorType?: 'registered' | 'external';
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
    totalReviews?: number;  // ✅ Add this if missing
    ratingBreakdown?: {     // ✅ Add this
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  };
  books: Book[];
  reviews?: AuthorReview[];
}

interface AuthorPublicProfilePageProps {
  author: Author;
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
  // âœ… Added navigation handlers
  onUserSelect?: (userId: number) => void;
  onAuthorSelect?: (author: { id: number; authorType: 'registered' | 'external' }) => void;
}

export function AuthorPublicProfilePage({ 
  author, 
  onBack, 
  onLogoClick, 
  onBookSelect,
  theme, 
  onToggleTheme,
  isUserLoggedIn,
  onLoginRequired,
  onReportSubmit,
  isFollowing = false,
  onFollowAuthor,
  onUnfollowAuthor,
  currentUser,
  onUserSelect, // âœ… Added
  onAuthorSelect // âœ… Added
}: AuthorPublicProfilePageProps) {
  // âœ… Check if viewing own profile
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowingState, setIsFollowingState] = useState(isFollowing);
  const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(false);
  const [authorAvgRating, setAuthorAvgRating] = useState(author.stats.avgRating);
  const [authorTotalRatings, setAuthorTotalRatings] = useState(author.stats.totalRatings);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);
  const hasLoadedRatingRef = useRef(false);
  
  // âœ… Load current user ID and follow status when logged in
useEffect(() => {
  const loadUserDataAndFollowStatus = async () => {
    if (!isUserLoggedIn) {
      setCurrentUserId(null);
      setIsOwnProfile(false);
      setIsFollowingState(false);
      return;
    }
    
    try {
      const profile = await apiService.getUserProfile();
      setCurrentUserId(profile.user_id);
 const ownProfile = author.authorType === 'registered' && profile.user_id === author.id;
setIsOwnProfile(ownProfile);
console.log('👤 Current user ID:', profile.user_id, 'Author ID:', author.id, 'Author Type:', author.authorType, 'Is own profile:', ownProfile);
      
      // Only check follow status if NOT viewing own profile
      if (!ownProfile) {
        setIsLoadingFollowStatus(true);
        try {
          // âœ… Check author type to determine which API to use
          if (author.authorType === 'external' && author.authorId) {
            // Check if following external author
            const followStatus = await apiService.checkAuthorFollowStatus(author.authorId);
            setIsFollowingState(followStatus.isFollowing);
            console.log('âœ… External author follow status loaded:', followStatus.isFollowing);
          } else {
            // Check if following registered author (as user)
            const followStatus = await apiService.checkFollowStatus(author.id);
            setIsFollowingState(followStatus.isFollowing);
            console.log('âœ… Registered author follow status loaded:', followStatus.isFollowing);
          }
        } catch (error) {
          console.error('Failed to load follow status:', error);
          setIsFollowingState(false);
        } finally {
          setIsLoadingFollowStatus(false);
        }
      }
    } catch (error) {
      console.error('Failed to load current user ID:', error);
      setCurrentUserId(null);
      setIsOwnProfile(false);
      setIsFollowingState(false);
    }
  };
  loadUserDataAndFollowStatus();
}, [isUserLoggedIn, author.id, author.authorId, author.authorType]);

  const [currentBookIndex, setCurrentBookIndex] = useState(0);
  const [booksPerPage] = useState(4);
  const [userReviewId, setUserReviewId] = useState<string | null>(null);
  const [authorReviews, setAuthorReviews] = useState<AuthorReview[]>([]);

  useEffect(() => {
  const loadAuthorReviews = async () => {
    if (!author.authorId) {
      console.log('⚠️ No authorId, skipping review load');
      setAuthorReviews([]);
      return;
    }
    
    try {
      console.log('📖 Loading reviews for author:', author.authorId);
      const data = await apiService.getAuthorReviews(author.authorId);
      
      // Convert API reviews to your AuthorReview interface format
      const formattedReviews: AuthorReview[] = data.reviews.map(review => ({
        id: review.author_review_id.toString(),
        reader: review.username,
        rating: 0, // Reviews don't have ratings in your schema
        comment: review.review_text,
        date: new Date(review.created_at).toLocaleDateString(),
        avatarSeed: review.username
      }));
      
      setAuthorReviews(formattedReviews);
      console.log('✅ Loaded reviews:', formattedReviews.length);
    } catch (error) {
      console.error('❌ Failed to load author reviews:', error);
      setAuthorReviews([]);
    }
  };
  
  if (author.authorId) {
    loadAuthorReviews();
  }
}, [author.authorId]);

  // Followers modal state
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");
  const [activeTab, setActiveTab] = useState("books");

  // Real lists data from API
  const [authorLists, setAuthorLists] = useState<Array<{
    id: number;
    name: string;
    count: number;
    isPublic: boolean;
  }>>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

  // âœ… FIXED: State for following count - now uses real data
  const [followerCount, setFollowerCount] = useState(author.stats.followers);
  const [followingCount, setFollowingCount] = useState(0); // Changed from hardcoded 145

  // âœ… NEW: Load real following count from API
useEffect(() => {
  const loadFollowingCount = async () => {
    // âœ… CRITICAL FIX: External authors don't have a user_id, so they can't follow others
    if (!author?.id || author.authorType === 'external') {
      console.log('â­ï¸ Skipping following count - external author');
      setFollowingCount(0);
      return;
    }
    
    try {
      const result = await apiService.getUserFollowing(author.id);
      console.log("âœ… Following count loaded:", result.total);
      setFollowingCount(result.total);
    } catch (error: any) {
      console.error("âŒ Failed to load following count:", error);
      setFollowingCount(0);
    }
  };

  if (author.id) {
    loadFollowingCount();
  }
}, [author.id, author.authorType]); // âœ… Add authorType to dependencies

// Replace the loadUserRating useEffect in AuthorPublicProfilePage.tsx with this:

useEffect(() => {
  // âœ… ULTIMATE FIX: Reset the ref when key dependencies change
  hasLoadedRatingRef.current = false;
  
  // âœ… EARLY RETURN: Skip entirely if not logged in or viewing own profile
  if (!isUserLoggedIn || isOwnProfile) {
    console.log('â­ï¸ Skipping rating load early:', { isUserLoggedIn, isOwnProfile });
    setUserRating(0);
    setHasRated(false);
    hasLoadedRatingRef.current = true; // Mark as "loaded" to prevent further attempts
    return;
  }
  
  // âœ… Skip if we've already attempted to load for this author
  if (hasLoadedRatingRef.current) {
    console.log('â­ï¸ Rating already loaded or attempted, skipping');
    return;
  }
  
  const loadUserRating = async () => {
    console.log('ðŸŽ¯ loadUserRating called with:', {
      isUserLoggedIn,
      isOwnProfile,
      authorId: author.authorId,
      authorUserId: author.id,
      currentUserId
    }); 
    
    // Mark as loading to prevent duplicate calls
    hasLoadedRatingRef.current = true;
    
    // âœ… ADDITIONAL CHECK: Verify we're not viewing our own author profile by comparing IDs
    if (currentUserId && author.id === currentUserId) {
      console.log('â­ï¸ Current user ID matches author ID, skipping rating load');
      setUserRating(0);
      setHasRated(false);
      return;
    }
    
    // âœ… Check if we have authorId
    if (!author.authorId) {
      console.log('âš ï¸ No authorId available, skipping rating load');
      setUserRating(0);
      setHasRated(false);
      return;
    }
    
    try {
      console.log('ðŸ“Š Loading user rating for author_id:', author.authorId);
      const result = await apiService.getUserAuthorRating(author.authorId);
      
      if (result.rating) {
        setUserRating(result.rating.rating_value);
        setHasRated(true);
        console.log('âœ… User rating loaded:', result.rating.rating_value);
      }
    } catch (error: any) {
  // ✅ Handle 404 (no rating found) - this is NORMAL, not an error
  if (error.message.includes('404') || error.message.includes('No rating found')) {
    console.log('ℹ️ User has not rated this author yet');
    setUserRating(0);
    setHasRated(false);
    return; // ✅ EXIT EARLY - don't log as error
  }
  
  // ✅ Handle 403 errors silently (self-rating prevention)
  if (error.message.includes('You cannot rate yourself') || 
      error.message.includes('403') ||
      error.message.includes('Forbidden')) {
    console.log('ℹ️ Cannot rate yourself - this is expected');
    setUserRating(0);
    setHasRated(false);
    return; // ✅ EXIT EARLY - don't log as error
  }
  
  // ✅ Handle 502 errors silently (endpoint issues)
  if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
    console.log('ℹ️ Rating endpoint temporarily unavailable');
    setUserRating(0);
    setHasRated(false);
    return; // ✅ EXIT EARLY - don't log as error
  }
  
  // ❌ Only log ACTUAL errors (not 404/403/502)
  console.error('Failed to load user rating:', error);
  setUserRating(0);
  setHasRated(false);
}
  };
  
  // âœ… Only call if we have all required data and passed early return checks
  if (author.id && author.authorId) {
    loadUserRating();
  }
  
}, [isUserLoggedIn, author.authorId, author.id, isOwnProfile, currentUserId]);

useEffect(() => {
  const loadAuthorStats = async () => {
    // âœ… No need to reload - we already have stats from initial load
    // Just use the stats from props
    setAuthorAvgRating(author.stats.avgRating);
    setAuthorTotalRatings(author.stats.totalRatings);
    
    console.log('ðŸ“ˆ Using author stats from props:', {
      avgRating: author.stats.avgRating,
      totalRatings: author.stats.totalRatings
    });
  };
  
  loadAuthorStats();
}, [author.stats.avgRating, author.stats.totalRatings]);

  // Load author's lists from API
useEffect(() => {
  const loadAuthorLists = async () => {
    // âœ… CRITICAL FIX: Only load lists for REGISTERED authors (those with user accounts)
    if (!author.id || author.authorType === 'external') {
      console.log('â­ï¸ Skipping list load - external author has no lists');
      setAuthorLists([]);
      setIsLoadingLists(false);
      return;
    }
    
    try {
      setIsLoadingLists(true);
      
      console.log('ðŸ“‹ Loading lists for registered author:', author.id);
      console.log('ðŸ‘¤ Is user logged in?', isUserLoggedIn);
      console.log('ðŸ“ Author type:', author.authorType);
      
      let data;
      
      // Try to load public lists for the author
      try {
        console.log('ðŸ“¡ Fetching public lists for author ID:', author.id);
        data = await apiService.getUserListsById(author.id);
        console.log('âœ… Public lists loaded:', data);
      } catch (error: any) {
        console.error('âŒ Failed to load public lists:', error);
        
        // If not logged in, just show empty lists
        if (!isUserLoggedIn) {
          console.log('âš ï¸ User not logged in, showing no lists');
          setAuthorLists([]);
          return;
        }
        
        // If logged in, this might be our own profile, try getUserLists
        console.log('ðŸ”„ Trying authenticated endpoint for own profile...');
        data = await apiService.getUserLists();
        console.log('âœ… Own lists loaded:', data);
      }
      
      console.log('ðŸ“‹ Default lists:', data.defaultLists);
      console.log('ðŸ“‹ Custom lists:', data.customLists);
      
      // Combine default and custom lists
      const defaultListsFormatted = (data.defaultLists || []).map(list => {
        console.log('  ðŸ”¹ Formatting default list:', list);
        return {
          id: list.id,
          name: list.name,
          count: list.count,
          isPublic: list.visibility === 'public'
        };
      });
      
      const customListsFormatted = (data.customLists || []).map(list => {
        console.log('  ðŸ”¸ Formatting custom list:', list);
        return {
          id: list.id,
          name: list.name,
          count: list.count,
          isPublic: list.visibility === 'public'
        };
      });
      
      const allLists = [...defaultListsFormatted, ...customListsFormatted];
      
      console.log('ðŸ“Š Total lists formatted:', allLists.length);
      console.log('ðŸ“¦ Final lists array:', allLists);
      
      setAuthorLists(allLists);
      
    } catch (error: any) {
      console.error('âŒ Failed to load author lists:', error);
      console.error('âŒ Error details:', {
        message: error.message,
        stack: error.stack
      });
      // Don't show toast for non-logged-in users
      if (isUserLoggedIn) {
        toast.error('Failed to load reading lists');
      }
      setAuthorLists([]);
    } finally {
      setIsLoadingLists(false);
      console.log('âœ… Lists loading complete');
    }
  };

  // âœ… FIXED: Add authorType to condition check
  if (author.id && author.authorType) {
    console.log('ðŸš€ Starting list load for author.id:', author.id, 'type:', author.authorType);
    loadAuthorLists();
  } else {
    console.log('â­ï¸ Skipping list load. Author ID:', author.id, 'Type:', author.authorType);
    setAuthorLists([]);
    setIsLoadingLists(false);
  }
}, [author.id, author.authorType, isUserLoggedIn]);

const handleFollow = async () => {
  // Check if user is logged in
  if (!isUserLoggedIn) {
    toast.error("Please log in to follow authors");
    if (onLoginRequired) {
      setTimeout(() => onLoginRequired(), 1500);
    }
    return;
  }
  
  // âœ… Prevent following yourself
  if (isOwnProfile) {
    toast.error("You cannot follow yourself");
    return;
  }
  
  // Prevent admins from following
  if (currentUser?.isAdmin) {
    toast.error("Admins cannot follow authors");
    return;
  }
  
  // âœ… CRITICAL FIX: Check if this is an external author or registered user
  const isExternalAuthor = author.authorType === 'external';
  
  console.log('ðŸ”„ Follow action:', {
    authorType: author.authorType,
    isExternal: isExternalAuthor,
    authorId: author.authorId,
    userId: author.id
  });
  
  try {
    if (isExternalAuthor) {
      // âœ… External author - use followAuthor API
      if (!author.authorId) {
        toast.error("Cannot follow: Author ID missing");
        return;
      }
      
      if (isFollowingState) {
        // Unfollow external author
        await apiService.unfollowAuthor(author.authorId, 'external');
        setIsFollowingState(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast.success(`Unfollowed ${author.name}`);
      } else {
        // Follow external author
        await apiService.followAuthor(author.authorId, 'external');
        setIsFollowingState(true);
        setFollowerCount(prev => prev + 1);
        toast.success(`Following ${author.name}!`);
      }
    } else {
      // âœ… Registered author - use followUser API
      if (isFollowingState) {
        // Unfollow registered author (user)
        await apiService.unfollowUser(author.id);
        setIsFollowingState(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast.success(`Unfollowed ${author.name}`);
      } else {
        // Follow registered author (user)
        await apiService.followUser(author.id);
        setIsFollowingState(true);
        setFollowerCount(prev => prev + 1);
        toast.success(`Following ${author.name}!`);
      }
    }
    
    // Also call parent handlers if provided (for backwards compatibility)
    if (isFollowingState && onUnfollowAuthor) {
      onUnfollowAuthor(author.id);
    } else if (!isFollowingState && onFollowAuthor) {
      onFollowAuthor(author);
    }
  } catch (error: any) {
    console.error('Failed to follow/unfollow:', error);
    toast.error(error.message || 'Failed to update follow status');
  }
};

const handleRating = async (rating: number) => {
  console.log('ðŸŒŸ ===== RATING CLICK START =====');
  console.log('ðŸ“Š Rating value:', rating);
  console.log('ðŸ†” User ID:', author.id);
  console.log('ðŸ†” Author ID:', author.authorId); // âœ… NEW: Log author_id
  
  // Check if user is logged in
  if (!isUserLoggedIn) {
    console.log('âŒ User not logged in');
    toast.error("Please log in to rate this author");
    if (onLoginRequired) {
      setTimeout(() => onLoginRequired(), 1500);
    }
    return;
  }
  
  // Prevent rating yourself
  if (isOwnProfile) {
    console.log('âŒ Cannot rate own profile');
    toast.error("You cannot rate yourself");
    return;
  }
  
  // Prevent admins from rating
  if (currentUser?.isAdmin) {
    console.log('âŒ Admin cannot rate');
    toast.error("Admins cannot rate authors");
    return;
  }

  // âœ… CRITICAL: Check if we have authorId
  if (!author.authorId) {
    console.error('âŒ No author_id available!');
    toast.error('Cannot rate: Author profile incomplete');
    return;
  }
  
  try {
    console.log('ðŸ“¡ Calling apiService.rateAuthor...');
    const previousRating = userRating;
    
    // âœ… CRITICAL: Use author.authorId (from authors table) NOT author.id (user_id)
    const result = await apiService.rateAuthor(author.authorId, rating);
    
    console.log('âœ… ===== RATING SUCCESS =====');
    console.log('ðŸ“¦ API Result:', result);
    
    if (!result.rating) {
      console.error('âŒ No rating object in response!');
      toast.error('Rating saved but response incomplete');
      return;
    }
    
    // âœ… UPDATE LOCAL STATE
    setUserRating(rating);
    setHasRated(true);
    
    // âœ… UPDATE AUTHOR STATS FROM API RESPONSE
    const newAvgRating = result.rating.avg_rating;
    const newTotalRatings = result.rating.total_ratings;
    
    console.log('ðŸ“Š New average rating:', newAvgRating);
    console.log('ðŸ“Š New total ratings:', newTotalRatings);
    
    setAuthorAvgRating(newAvgRating);
    setAuthorTotalRatings(newTotalRatings);
    
    // âœ… Show success message
    const message = previousRating > 0 
      ? `Rating updated to ${rating} stars! New average: ${newAvgRating.toFixed(1)}â­`
      : `Rated ${author.name} ${rating} stars! Average: ${newAvgRating.toFixed(1)}â­`;
    
    toast.success(message);
    
    console.log('âœ… Rating update complete');
    
  } catch (error: any) {
    console.error('âŒ ===== RATING ERROR =====');
    console.error('Error:', error.message);
    toast.error(error.message || 'Failed to submit rating');
  }
};

// Add authorId prop:
interface AuthorRatingReviewProps {
  authorId: number;        // âœ… KEEP THIS: Should be author_id from authors table
  userId?: number;         // âœ… NEW: Add user_id for reference
  authorName: string;
  isCurrentUser: boolean;
  isUserLoggedIn: boolean;
  ratingStats: {
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
  onRatingUpdate?: () => void;
}


  const handleReviewSubmit = (rating: number, reviewText: string) => {
    // Check if user already has a review
    if (userReviewId) {
      // Update existing review
      setAuthorReviews(prevReviews =>
        prevReviews.map(review =>
          review.id === userReviewId
            ? { ...review, rating, comment: reviewText, date: "Just now" }
            : review
        )
      );
      toast.success("Your review has been updated!");
    } else {
      // Create a new review
      const newReview: AuthorReview = {
        id: Date.now().toString(),
        reader: "Current User",
        rating: rating,
        book: author.books[0]?.title || "General Review",
        comment: reviewText,
        date: "Just now",
        avatarSeed: "CurrentUser"
      };

      setAuthorReviews([newReview, ...authorReviews]);
      setUserReviewId(newReview.id);
    }

    setUserRating(rating);
    setHasRated(true);
  };

const [currentAuthorId, setCurrentAuthorId] = useState<number | null>(null);

  // Open followers modal
  const handleOpenFollowersModal = (tab: "followers" | "following") => {
    setFollowersModalTab(tab);
    setIsFollowersModalOpen(true);
  };

  // âœ… NEW: Handle navigation from followers modal
  const handleFollowerUserClick = (userId: number, userRole?: string) => {
    console.log(`ðŸ”„ Navigation triggered from FollowersModal:`, {
      userId,
      userRole,
      hasUserSelect: !!onUserSelect,
      hasAuthorSelect: !!onAuthorSelect
    });

    // Close the modal first
    setIsFollowersModalOpen(false);

    // Navigate based on role
    if (userRole === 'author' && onAuthorSelect) {
      console.log(`ðŸ“– Navigating to author profile for user ${userId}`);
      onAuthorSelect({
        id: userId,
        authorType: 'registered'
      });
    } else if (onUserSelect) {
      console.log(`ðŸ‘¤ Navigating to user profile for user ${userId}`);
      onUserSelect(userId);
    } else {
      console.warn('âš ï¸ No navigation handler available');
    }
  };

  // Carousel navigation
  const nextBooks = () => {
    if (currentBookIndex + booksPerPage < author.books.length) {
      setCurrentBookIndex(currentBookIndex + booksPerPage);
    }
  };

  const prevBooks = () => {
    if (currentBookIndex > 0) {
      setCurrentBookIndex(currentBookIndex - booksPerPage);
    }
  };

  const visibleBooks = author.books.slice(currentBookIndex, currentBookIndex + booksPerPage);
  const canGoNext = currentBookIndex + booksPerPage < author.books.length;
  const canGoPrev = currentBookIndex > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <BookMarked className="w-6 h-6 text-primary" />
            <span className="text-xl">BookArc</span>
          </button>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <Button variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Author Header Section */}
        <div className="mb-8">
          <Card className="overflow-hidden">
            {/* Cover Background */}
            <div className="h-32 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(164,135,131,0.3),transparent_70%)]"></div>
            </div>

            <CardContent className="relative -mt-16 pb-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-card">
                    <AvatarImage src={author.avatarUrl} />
                    <AvatarFallback className="text-2xl">
                      {author.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {author.verified && (
                    <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2">
                      <Award className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Author Info */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl">{author.name}</h1>
                        {author.verified && (
                          <Badge variant="outline" className="border-primary/40 text-primary">
                            <Award className="w-3 h-3 mr-1" />
                            Verified Author
                          </Badge>
                        )}
                      </div>
                      {author.penName && author.penName !== author.name && (
                        <p className="text-muted-foreground mb-2">Pen Name: {author.penName}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {author.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {author.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Joined {author.joinDate}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!currentUser?.isAdmin && !isOwnProfile && (
                        <Button
                          variant={isFollowingState ? "outline" : "default"}
                          onClick={handleFollow}
                          disabled={isLoadingFollowStatus}
                          className="min-w-[120px]"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          {isLoadingFollowStatus ? "Loading..." : isFollowingState ? "Following" : "Follow"}
                        </Button>
                      )}
                      {isOwnProfile && (
                        <Button
                          variant="outline"
                          disabled
                          className="min-w-[120px] cursor-not-allowed"
                          title="You cannot follow yourself"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Your Profile
                        </Button>
                      )}
                      {author.email && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          asChild
                        >
                          <a 
                            href={`mailto:${author.email}`}
                            title={`Send email to ${author.name}`}
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <ReportDialog 
                        reportType="author" 
                        targetName={author.name}
                        isUserLoggedIn={isUserLoggedIn}
                        onLoginRequired={onLoginRequired}
                        onSubmit={(reason, details) => {
                          if (onReportSubmit) {
                            onReportSubmit("author", author.name, reason, details);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats Cards - Books, Avg Rating, Followers, Following */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-accent/30 rounded-lg">
                      <div className="text-2xl mb-1">{author.stats.totalBooks}</div>
                      <div className="text-xs text-muted-foreground">Books</div>
                    </div>
<div className="text-center p-3 bg-accent/30 rounded-lg">
  <div className="text-2xl mb-1 flex items-center justify-center gap-1">
    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
    {authorAvgRating.toFixed(1)}  {/* âœ… Using state */}
  </div>
  <div className="text-xs text-muted-foreground">Avg Rating</div>
</div>
                    <button 
                      className="text-center p-3 bg-accent/30 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
                      onClick={() => handleOpenFollowersModal("followers")}
                    >
                      <div className="text-2xl mb-1">{followerCount}</div>
                      <div className="text-xs text-muted-foreground">Followers</div>
                    </button>
                    <button 
                      className="text-center p-3 bg-accent/30 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer"
                      onClick={() => handleOpenFollowersModal("following")}
                    >
                      <div className="text-2xl mb-1">{followingCount}</div>
                      <div className="text-xs text-muted-foreground">Following</div>
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle>About the Author</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {author.bio || "No biography available yet."}
                </p>
              </CardContent>
            </Card>

            {/* Tabs for Books, Lists, and Reviews */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="books">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Books ({author.stats.totalBooks})
                </TabsTrigger>
                <TabsTrigger value="lists">
                  <BookMarked className="w-4 h-4 mr-2" />
                  Lists ({authorLists.length})
                </TabsTrigger>
<TabsTrigger value="reviews">
  <MessageSquare className="w-4 h-4 mr-2" />
  Reviews ({author.stats.totalReviews || 0})  {/* ✅ Use real count from API */}
</TabsTrigger>
              </TabsList>

              {/* Books Tab */}
              <TabsContent value="books">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Published Books</CardTitle>
                        <CardDescription>
                          {author.stats.totalBooks} {author.stats.totalBooks === 1 ? 'book' : 'books'} published
                        </CardDescription>
                      </div>
                      {author.books.length > booksPerPage && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={prevBooks}
                            disabled={!canGoPrev}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={nextBooks}
                            disabled={!canGoNext}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {author.books.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No books published yet</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {visibleBooks.map((book) => (
                            <BookCard
                              key={book.id}
                              title={book.title}
                              author={book.author}
                              rating={book.rating}
                              reviews={book.totalRatings}
                              coverUrl={book.cover}
                              genre={book.genre}
                              onClick={() => onBookSelect?.(book)}
                            />
                          ))}
                        </div>
                        {author.books.length > booksPerPage && (
                          <div className="mt-4 text-center text-sm text-muted-foreground">
                            Showing {currentBookIndex + 1}-{Math.min(currentBookIndex + booksPerPage, author.books.length)} of {author.books.length} books
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Lists Tab */}
<TabsContent value="lists">
  <Card>
    <CardHeader>
      <CardTitle>Reading Lists</CardTitle>
      <CardDescription>
        {author.authorType === 'external' 
          ? `${author.name} is not a registered user and doesn't have reading lists`
          : `${author.name}'s curated book collections`
        }
      </CardDescription>
    </CardHeader>
    <CardContent>
      {isLoadingLists ? (
        <div className="text-center py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="h-20 bg-muted rounded-lg"></div>
          </div>
          <p className="text-muted-foreground mt-4">Loading lists...</p>
        </div>
      ) : authorLists.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          {author.authorType === 'external' ? (
            <>
              <p className="mb-2">This author is not a registered BookArc user</p>
              <p className="text-sm">Only registered authors can create and share reading lists</p>
            </>
          ) : (
            <p>No public lists yet</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {authorLists.map((list) => (
            <div
              key={list.id}
              className="p-4 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <Badge variant="outline" className="text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  Public
                </Badge>
              </div>
              <h4 className="mb-1 font-semibold">{list.name}</h4>
              <p className="text-sm text-muted-foreground">
                {list.count} {list.count === 1 ? "book" : "books"}
              </p>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>

{/* Reviews Tab */}
<TabsContent value="reviews">
  {author.authorId ? (
    <AuthorRatingReview
      authorId={author.authorId}
      authorName={author.name}
      isCurrentUser={isOwnProfile}
      isUserLoggedIn={isUserLoggedIn}
      ratingStats={{
        avgRating: authorAvgRating,           // ✅ Use state
        totalRatings: authorTotalRatings,     // ✅ Use state
        totalReviews: author.stats.totalReviews || 0,
        ratingBreakdown: author.stats.ratingBreakdown || {  // ✅ Pass real data
          '5': 0,
          '4': 0,
          '3': 0,
          '2': 0,
          '1': 0
        }
      }}
      onRatingUpdate={() => {
        console.log('Rating updated');
      }}
    />
  ) : (
    <Card>
      <CardContent className="text-center py-12">
        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
        <p className="text-muted-foreground">Unable to load reviews</p>
      </CardContent>
    </Card>
  )}
</TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Rate This Author Section */}
{/* Rate This Author Section */}
<Card>
  <CardHeader>
    <CardTitle>Rate This Author</CardTitle>
    <CardDescription>Share your experience with their work</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Star Rating Input */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
            disabled={isOwnProfile || !isUserLoggedIn || currentUser?.isAdmin}
          >
            <Star 
              className={`w-10 h-10 cursor-pointer transition-colors ${
                star <= (hoverRating || userRating)
                  ? "fill-primary text-primary" 
                  : "text-muted-foreground hover:text-primary/50"
              }`}
            />
          </button>
        ))}
      </div>
      
      {/* User's Rating Display */}
      {userRating > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          You rated this author {userRating} star{userRating !== 1 ? 's' : ''}
        </p>
      )}
      
      <Separator />
      
      {/* Average Rating Display */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <span className="text-2xl font-bold">
            {authorAvgRating.toFixed(1)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Average from {authorTotalRatings.toLocaleString()} rating{authorTotalRatings !== 1 ? 's' : ''}
        </p>
      </div>
      
      <Separator />
      
      {/* ✅ NEW: Rating Breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground mb-3 text-center">
          Rating Distribution
        </p>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = author.stats.ratingBreakdown?.[rating.toString() as '5' | '4' | '3' | '2' | '1'] || 0;
          const percentage = authorTotalRatings > 0 ? (count / authorTotalRatings) * 100 : 0;

          return (
            <div key={rating} className="flex items-center gap-2">
              <div className="flex items-center gap-1 w-12">
                <span className="text-xs font-medium">{rating}</span>
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  </CardContent>
</Card>
          </div>
        </div>
      </div>

      {/* Followers/Following Modal */}
      <FollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        userId={author.id}
        username={author.name}
        defaultTab={followersModalTab}
        onUserClick={handleFollowerUserClick} // âœ… Use the new handler
      />
    </div>
  );
}