import { useState, useEffect } from "react";
import { BookMarked, Star, Share2, ShoppingCart, ExternalLink, Plus, Check, ChevronLeft, TrendingUp, Award, Clock, BookOpen, ChevronDown, BookCheck, Pause, X as XIcon, UserPlus, UserMinus } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Progress } from "./ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import { ReportDialog } from "./ReportDialog";
import { WriteReviewDialog } from "./WriteReviewDialog";
import { getBookById, getBookReviews, getBookStores, rateBook, submitReview, Book } from "../services/booksService";
import BookRatingReview from "./BookRatingReview";
import { AddToListButton } from "./AddToListButton";
import {getUserBookRating} from "../services/booksService";

interface Author {
  id: number;
  name: string;
  bio: string;
  avatarUrl: string;
  coverImageUrl?: string;
  books: Array<{
    id: number;
    title: string;
    cover: string;
    rating: number;
    publishYear: number;
  }>;
  stats: {
    totalBooks: number;
    followers: number;
    avgRating: number;
    totalRatings: number;
  };
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
  };
  verified: boolean;
}

interface Review {
  id: number;
  user: string;
  avatar: string;
  rating: number;
  date: string;
  review: string;
  helpful: number;
}

interface BookDetailsPageProps {
  bookId: number;
  onBack: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogoClick: () => void;
  isUserLoggedIn: boolean;
  onLoginRequired?: () => void;
  userReviews?: Review[];
  onAddReview?: (rating: number, reviewText: string) => void;
  helpfulReviews?: { [reviewId: number]: boolean };
  onToggleHelpful?: (reviewId: number) => void;
  onReportSubmit?: (reportType: "user" | "author" | "review" | "book", targetName: string, reason: string, details?: string) => void;
  onAuthorClick?: (authorName: string) => void;
  isFollowingAuthor?: boolean;
  onFollowAuthor?: (author: Author) => void;
  onUnfollowAuthor?: (authorId: number) => void;
  getAuthorByName?: (name: string) => Author | null;
  currentUser?: { isAdmin?: boolean };
}

export function BookDetailsPage(props: BookDetailsPageProps) {
  const { 
    bookId, 
    onBack, 
    theme, 
    onToggleTheme, 
    onLogoClick, 
    isUserLoggedIn, 
    onLoginRequired, 
    userReviews = [], 
    onAddReview, 
    helpfulReviews = {}, 
    onToggleHelpful, 
    onReportSubmit, 
    onAuthorClick, 
    isFollowingAuthor = false, 
    onFollowAuthor, 
    onUnfollowAuthor, 
    getAuthorByName, 
    currentUser 
  } = props;
  
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);
  const [userReviewId, setUserReviewId] = useState<number | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [ratingDistribution, setRatingDistribution] = useState<any[]>([]);

  // Fetch detailed book data on mount
useEffect(() => {
  let isMounted = true;

  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const numericBookId = Number(bookId);

      if (!Number.isInteger(numericBookId)) {
        console.error("❌ Invalid bookId:", bookId);
        setError("Invalid book ID");
        setLoading(false);
        return;
      }

      console.log("📡 Fetching book details for ID:", numericBookId);
      const detailedBook = await getBookById(numericBookId);

      if (!isMounted) return;

      console.log("✅ Book details fetched:", detailedBook);
      setBook(detailedBook);

      // ✅ USE REAL RATING BREAKDOWN FROM BACKEND
      if (detailedBook.ratingBreakdown) {
        console.log("📊 Real rating breakdown:", detailedBook.ratingBreakdown);
        
        const breakdown = [
          { stars: 5, count: detailedBook.ratingBreakdown['5'] || 0 },
          { stars: 4, count: detailedBook.ratingBreakdown['4'] || 0 },
          { stars: 3, count: detailedBook.ratingBreakdown['3'] || 0 },
          { stars: 2, count: detailedBook.ratingBreakdown['2'] || 0 },
          { stars: 1, count: detailedBook.ratingBreakdown['1'] || 0 },
        ].map(item => ({
          ...item,
          percentage: detailedBook.totalRatings > 0 
            ? (item.count / detailedBook.totalRatings) * 100 
            : 0
        }));
        
        console.log("📊 Formatted breakdown:", breakdown);
        setRatingDistribution(breakdown);
      } else {
        setRatingDistribution([]);
      }

      // ✅ NEW: Load user's existing rating if logged in
      if (isUserLoggedIn && !currentUser?.isAdmin) {
        console.log("📖 Loading user's rating for book:", numericBookId);
        
        try {
          const existingRating = await getUserBookRating(numericBookId);
          
          if (existingRating !== null && isMounted) {
            console.log("⭐ User has already rated this book:", existingRating);
            setUserRating(existingRating);
            setHasRated(true);
          } else {
            console.log("ℹ️ User hasn't rated this book yet");
            setUserRating(0);
            setHasRated(false);
          }
        } catch (err) {
          console.warn("⚠️ Could not fetch user rating:", err);
          // Don't show error to user, just leave rating as 0
        }
      } else {
        // User not logged in or is admin - reset rating state
        setUserRating(0);
        setHasRated(false);
      }

      // Fetch reviews
      getBookReviews(numericBookId)
        .then((fetchedReviews) => {
          if (isMounted && fetchedReviews?.length) {
            setReviews(fetchedReviews);
          }
        })
        .catch((err) => console.warn("⚠️ Could not fetch reviews:", err));

      // Fetch stores
      getBookStores(numericBookId)
        .then((fetchedStores) => {
          if (isMounted && fetchedStores?.length) {
            setRetailers(fetchedStores);
          }
        })
        .catch((err) => console.warn("⚠️ Could not fetch stores:", err));

      setLoading(false);
    } catch (error: any) {
      if (!isMounted) return;

      console.error("❌ Error fetching book details:", error);
      setError(error.message || "Failed to load book details");
      toast.error("Failed to load book details.");
      setLoading(false);
    }
  };

  fetchBookDetails();

  return () => {
    isMounted = false;
  };
}, [bookId, isUserLoggedIn, currentUser?.isAdmin]);


  // Combine user reviews with fetched reviews
  const allReviews = [...userReviews, ...reviews];

  const handleShare = () => {
    // Copy current URL to clipboard
    if (navigator.clipboard && window.location.href) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } else {
      toast.success("Link copied to clipboard!");
    }
  };

  const handleRating = async (rating: number) => {
    if (!book) return;
    
    // Check if user is logged in
    if (!isUserLoggedIn) {
      toast.error("Please log in to rate this book");
      if (onLoginRequired) {
        setTimeout(() => onLoginRequired(), 1500);
      }
      return;
    }
    
    // Prevent admins from rating
    if (currentUser?.isAdmin) {
      toast.error("Admins cannot rate books");
      return;
    }
    
    try {
      const previousRating = userRating;
      
      // Send rating to API
      await rateBook(book.id, rating);

      const updatedBook = await getBookById(book.id);
      setBook(updatedBook);

      
      setUserRating(rating);
      setHasRated(true);
      
      if (previousRating > 0) {
        toast.success(`You updated your rating to ${rating} stars!`);
      } else {
        toast.success(`You rated this book ${rating} stars!`);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating. Please try again.");
    }
  };

const handleReviewSubmit = async (rating: number, reviewText: string) => {
  if (!book) return;
  
  try {
    // Send review to API
    await submitReview(book.id, rating, reviewText);
    
    // Sync the rating with the "Rate This Book" section
    setUserRating(rating);
    setHasRated(true);
    
    // ❌ REMOVE THIS - Don't call onAddReview as it adds duplicate
    // if (onAddReview) {
    //   onAddReview(rating, reviewText);
    // }
    
    // ✅ Instead, refresh the reviews from the backend
    const updatedReviews = await getBookReviews(book.id);
    setReviews(updatedReviews);
    
    // Also refresh the book data to get updated rating count
    const updatedBook = await getBookById(book.id);
    setBook(updatedBook);
    
    toast.success("Review submitted successfully!");
  } catch (error) {
    console.error("Error submitting review:", error);
    toast.error("Failed to submit review. Please try again.");
  }
};

  const handleFollowAuthor = () => {
    if (!book) return;
    
    if (!isUserLoggedIn) {
      toast.error("Please log in to follow authors");
      if (onLoginRequired) {
        setTimeout(() => onLoginRequired(), 1500);
      }
      return;
    }
    
    // Prevent admins from following
    if (currentUser?.isAdmin) {
      toast.error("Admins cannot follow authors");
      return;
    }
    
    const author = getAuthorByName?.(book.author);
    if (author) {
      // TODO: Send API request to follow author
      // Example: POST /authors/{authorId}/follow
      
      onFollowAuthor?.(author);
      toast.success(`You are now following ${author.name}!`);
    }
  };

  const handleUnfollowAuthor = () => {
    if (!book) return;
    
    if (!isUserLoggedIn) {
      toast.error("Please log in to unfollow authors");
      if (onLoginRequired) {
        setTimeout(() => onLoginRequired(), 1500);
      }
      return;
    }
    
    const author = getAuthorByName?.(book.author);
    if (author) {
      // TODO: Send API request to unfollow author
      // Example: DELETE /authors/{authorId}/follow
      
      onUnfollowAuthor?.(author.id);
      toast.success(`You have unfollowed ${author.name}!`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <XIcon className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Failed to Load Book</h2>
          <p className="text-muted-foreground mb-6">
            {error || "We couldn't load the book details. Please try again."}
          </p>
          <Button onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <Logo className="w-6 h-6" />
            <span className="text-xl">BookArc</span>
          </button>

          {/* Right: Icons */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <Button variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Book Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Book Cover */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <img 
                src={book.cover || book.coverUrl || "https://via.placeholder.com/400x600?text=No+Cover"} 
                alt={book.title}
                className="w-full max-w-sm mx-auto rounded-lg shadow-2xl mb-4"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://via.placeholder.com/400x600?text=No+Cover";
                }}
              />
              
              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Add to List Button - Full Width */}
                <AddToListButton
                  bookId={bookId}
                  bookTitle={book.title}
                  isUserLoggedIn={isUserLoggedIn}
                  onLoginRequired={onLoginRequired}
                  variant="default"
                  size="default"
                  className="w-full"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
                
                {/* Report Book Button */}
                <div className="pt-2">
                  <ReportDialog 
                    reportType="book" 
                    targetName={book.title}
                    isUserLoggedIn={isUserLoggedIn}
                    onLoginRequired={onLoginRequired}
                    onSubmit={(reason, details) => {
                      if (onReportSubmit) {
                        onReportSubmit("book", book.title, reason, details);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <Card className="mt-4">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Published</span>
                    <span className="font-medium">{book.publishYear}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Genre</span>
                    <span className="font-medium">{book.genre}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Ratings</span>
                    <span className="font-medium">{book.totalRatings.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Book Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Author */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl mb-2">{book.title}</h1>
                  <div className="flex items-center gap-3 mb-3">
                    <button 
                      onClick={() => onAuthorClick?.(book.author)}
                      className="text-xl text-muted-foreground hover:text-primary transition-colors"
                    >
                      by {book.author}
                    </button>
                  </div>
                  
                  {/* Genre Badge */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="default">{book.genre}</Badge>
                    {book.isTrending && (
                      <Badge variant="outline" className="gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Trending
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Rating Summary */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <div className="text-5xl font-bold">{book.rating.toFixed(1)}</div>
                        <div className="flex flex-col">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-5 h-5 ${i < Math.floor(book.rating) ? "fill-primary text-primary" : "text-muted-foreground"}`} 
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {book.totalRatings.toLocaleString()} ratings
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {ratingDistribution.length > 0 && (
                      <>
                        <Separator orientation="vertical" className="hidden md:block" />
                        
                        <div className="flex-1 space-y-2">
                          {ratingDistribution.map((dist) => (
                            <div key={dist.stars} className="flex items-center gap-3">
                              <span className="text-sm w-12">{dist.stars} star</span>
                              <Progress value={dist.percentage} className="flex-1" />
                              <span className="text-sm text-muted-foreground w-16 text-right">
                                {dist.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Rate This Book Section */}
                  {isUserLoggedIn && !currentUser?.isAdmin && (
                    <>
                      <Separator className="my-6" />
                      <div className="space-y-3">
                        <p className="font-medium text-center md:text-left">Rate this book</p>
                        <div className="flex items-center justify-center md:justify-start gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="transition-transform hover:scale-110 focus:outline-none"
                            >
                              <Star 
                                className={`w-8 h-8 cursor-pointer transition-colors ${
                                  star <= (hoverRating || userRating)
                                    ? "fill-primary text-primary" 
                                    : "text-muted-foreground hover:text-primary/50"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        {userRating > 0 && (
                          <p className="text-sm text-muted-foreground text-center md:text-left">
                            You rated this book {userRating} star{userRating !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Price Comparison - Only show if retailers exist */}
            {retailers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Price Comparison
                  </CardTitle>
                  <CardDescription>Find the best deal from trusted retailers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {retailers.map((retailer, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{retailer.store_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {retailer.availability_status === 'in_stock' ? 'In stock' : 'Out of stock'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold">
                              {retailer.currency === 'USD' ? '$' : retailer.currency}
                              {retailer.price}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            disabled={retailer.availability_status !== 'in_stock'}
                            className="gap-2"
                            onClick={() => window.open(retailer.url, '_blank')}
                          >
                            Buy Now
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Description and Reviews */}
            <Tabs defaultValue="description" className="w-full">
<TabsList className="grid w-full grid-cols-2">
  <TabsTrigger value="description">Description</TabsTrigger>
  <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
</TabsList>
              
              <TabsContent value="description" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>About this book</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                      {book.description || "No description available for this book."}
                    </p>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-primary mt-1" />
                        <div>
                          <p className="font-medium mb-1">Publication Year</p>
                          <p className="text-sm text-muted-foreground">{book.publishYear}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <BookOpen className="w-5 h-5 text-primary mt-1" />
                        <div>
                          <p className="font-medium mb-1">Genre</p>
                          <p className="text-sm text-muted-foreground">{book.genre}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
 <TabsContent value="reviews" className="mt-6 space-y-4">
  <BookRatingReview
    bookId={book.id}
    bookTitle={book.title}
    isUserLoggedIn={isUserLoggedIn}
    onLoginRequired={onLoginRequired}
    currentUser={currentUser}
    ratingStats={{
      avgRating: book.rating,
      totalRatings: book.totalRatings,
      ratingBreakdown: book.ratingBreakdown
    }}
    onReportSubmit={onReportSubmit}
  />
</TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}