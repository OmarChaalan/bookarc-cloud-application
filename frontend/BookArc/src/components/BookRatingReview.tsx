import { useState, useEffect, useRef } from 'react';
import { Star, MessageSquare, Sparkles, TrendingUp, Flag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { WriteReviewDialog } from './WriteReviewDialog';
import { ReportDialog } from './ReportDialog';
import { toast } from 'sonner';
import { getBookReviews, submitReview } from '../services/booksService';

interface BookRatingReviewProps {
  bookId: number;
  bookTitle: string;
  isUserLoggedIn: boolean;
  onLoginRequired?: () => void;
  currentUser?: { isAdmin?: boolean };
  ratingStats: {
    avgRating: number;
    totalRatings: number;
    ratingBreakdown?: {
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  };
  onReportSubmit?: (reportType: "user" | "author" | "review" | "book", targetName: string, reason: string, details?: string) => void;
}

interface Review {
  id: number;
  userId: number;
  user: string;
  avatar: string;
  rating: number;
  date: string;
  review: string;
  helpful: number;
  isOwner?: boolean;
}

export default function BookRatingReview({
  bookId,
  bookTitle,
  isUserLoggedIn,
  onLoginRequired,
  currentUser,
  ratingStats,
  onReportSubmit,
}: BookRatingReviewProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [userRating, setUserRating] = useState<number>(0);
  const [userReviewText, setUserReviewText] = useState<string>('');
  const [hasReviewed, setHasReviewed] = useState(false);
  const hasLoadedReviewsRef = useRef(false);

  // Load reviews from backend
  useEffect(() => {
    if (hasLoadedReviewsRef.current) return;
    
    const loadReviews = async () => {
      try {
        setIsLoadingReviews(true);
        const fetchedReviews = await getBookReviews(bookId);
        
        console.log('✅ Reviews loaded:', fetchedReviews);
        setReviews(fetchedReviews || []);
        
        // Check if current user has already reviewed
        if (isUserLoggedIn) {
          const userReview = fetchedReviews.find((r: Review) => r.isOwner);
          if (userReview) {
            setUserRating(userReview.rating);
            setUserReviewText(userReview.review);
            setHasReviewed(true);
          }
        }
        
        hasLoadedReviewsRef.current = true;
      } catch (error) {
        console.error('Failed to load reviews:', error);
        setReviews([]);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    loadReviews();
  }, [bookId, isUserLoggedIn]);

  const handleReviewSubmit = async (rating: number, reviewText: string) => {
    if (!isUserLoggedIn) {
      toast.error('Please log in to write a review');
      if (onLoginRequired) onLoginRequired();
      return;
    }

    if (currentUser?.isAdmin) {
      toast.error('Admins cannot write reviews');
      return;
    }

    try {
      console.log('📝 Submitting review...');
      
      // Submit to backend
      await submitReview(bookId, rating, reviewText);
      
      // Reload reviews from backend (this prevents duplicates)
      const updatedReviews = await getBookReviews(bookId);
      setReviews(updatedReviews);
      
      // Update user's review state
      setUserRating(rating);
      setUserReviewText(reviewText);
      setHasReviewed(true);
      
      toast.success(hasReviewed ? 'Review updated!' : 'Review submitted!');
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      toast.error(error.message || 'Failed to submit review');
    }
  };

  const handleHelpfulClick = (reviewId: number) => {
    if (!isUserLoggedIn) {
      toast.error('Please log in to mark reviews as helpful');
      if (onLoginRequired) onLoginRequired();
      return;
    }

    // TODO: Implement helpful API call
    toast.success('Marked as helpful!');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Reader Reviews</CardTitle>
            <CardDescription>
              {ratingStats.totalRatings} {ratingStats.totalRatings === 1 ? 'rating' : 'ratings'} • {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </CardDescription>
          </div>
          {isUserLoggedIn && !currentUser?.isAdmin && (
            <WriteReviewDialog
              targetType="book"
              targetName={bookTitle}
              isUserLoggedIn={isUserLoggedIn}
              onLoginRequired={onLoginRequired}
              onReviewSubmit={handleReviewSubmit}
              currentUser={currentUser}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Rating Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/30 rounded-lg">
          {/* Average Rating */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <div className="text-5xl font-bold">
                {ratingStats.avgRating.toFixed(1)}
              </div>
              <div className="flex flex-col">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(ratingStats.avgRating)
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground mt-1">
                  {ratingStats.totalRatings} {ratingStats.totalRatings === 1 ? 'rating' : 'ratings'}
                </span>
              </div>
            </div>
          </div>

          {/* Rating Breakdown with Counts */}
          {ratingStats.ratingBreakdown && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-3 text-center md:text-left uppercase tracking-wide">
                Rating Distribution
              </p>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingStats.ratingBreakdown?.[rating.toString() as '5' | '4' | '3' | '2' | '1'] || 0;
                const percentage = ratingStats.totalRatings > 0 ? (count / ratingStats.totalRatings) * 100 : 0;

                return (
                  <div key={rating} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 w-12 flex-shrink-0">
                      <span className="text-sm font-semibold">{rating}</span>
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    </div>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-foreground w-10 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Reviews List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            All Reviews ({reviews.length})
          </h3>

          {isLoadingReviews ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="pb-6 border-b border-border last:border-0">
                  <div className="flex gap-4">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={review.avatar} alt={review.user} />
                      <AvatarFallback>
                        {review.user.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      {/* Review Header */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{review.user}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'fill-yellow-500 text-yellow-500'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {review.date}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Review Text */}
                      <p className="text-muted-foreground leading-relaxed mb-3">
                        {review.review}
                      </p>

                      {/* Review Actions */}
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => handleHelpfulClick(review.id)}
                        >
                          <TrendingUp className="w-4 h-4" />
                          Helpful ({review.helpful})
                        </Button>

                        <ReportDialog
                          reportType="review"
                          targetName={`${review.user}'s review`}
                          isUserLoggedIn={isUserLoggedIn}
                          onLoginRequired={onLoginRequired}
                          onSubmit={(reason, details) => {
                            if (onReportSubmit) {
                              onReportSubmit('review', `${review.user}'s review`, reason, details);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground mb-2">No reviews yet</p>
              {isUserLoggedIn && !currentUser?.isAdmin && (
                <p className="text-sm text-muted-foreground">
                  Be the first to share your thoughts about this book!
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}