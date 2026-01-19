import { useState, useEffect } from 'react';
import { Star, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';
import { authService } from '../services/authService';

// Mock API service for demo purposes - will be replaced with actual apiService
const mockApiService = {
  rateAuthor: async (authorId: number, rating: number) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Rating submitted', rating: { rating_value: rating, avg_rating: 4.5, total_ratings: 42 } };
  },
  getUserAuthorRating: async (authorId: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { rating: { rating_value: 0 } };
  },
  deleteAuthorRating: async (authorId: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { message: 'Rating deleted' };
  },
  writeAuthorReview: async (authorId: number, text: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Review submitted', review: { review_text: text, created_at: new Date().toISOString() } };
  },
  updateAuthorReview: async (authorId: number, text: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { message: 'Review updated', review_text: text };
  },
  deleteAuthorReview: async (authorId: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { message: 'Review deleted' };
  },
  getUserAuthorReview: async (authorId: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return null;
  },
  getAuthorReviews: async (authorId: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      reviews: [
        {
          author_review_id: 1,
          user_id: 1,
          username: 'Sarah Mitchell',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
          review_text: 'An incredible author! Their writing style is captivating and the character development is outstanding.',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z'
        },
        {
          author_review_id: 2,
          user_id: 2,
          username: 'Michael Chen',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
          review_text: 'Every book is a masterpiece. The storytelling is phenomenal and keeps me hooked from start to finish.',
          created_at: '2024-01-10T14:20:00Z',
          updated_at: '2024-01-10T14:20:00Z'
        }
      ],
      total: 2
    };
  }
};

interface AuthorRatingReviewProps {
  authorId: number;        // This is author_id from authors table
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

interface Review {
  author_review_id: number;
  user_id: number;
  username: string;
  avatar_url: string;
  review_text: string;
  created_at: string;
  updated_at: string;
}

interface UserReview {
  author_review_id: number;
  username: string;
  avatar_url: string;
  review_text: string;
  created_at: string;
  updated_at: string;
}

export default function AuthorRatingReview({
  authorId,
  authorName,
  isCurrentUser,
  isUserLoggedIn,
  ratingStats,
  onRatingUpdate
}: AuthorRatingReviewProps) {
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  
  const [userReview, setUserReview] = useState<UserReview | null>(null);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);

  useEffect(() => {
    loadUserRatingAndReview();
    loadAllReviews();
  }, [authorId, isUserLoggedIn]);

  const loadUserRatingAndReview = async () => {
    if (!isUserLoggedIn || isCurrentUser) return;

    try {
      const ratingData = await apiService.getUserAuthorRating(authorId);
      setUserRating(ratingData.rating.rating_value);
    } catch (error) {
      console.log('No existing rating');
    }

    try {
      const reviewData = await apiService.getUserAuthorReview(authorId);
      if (reviewData?.review) {
        setUserReview(reviewData.review);
      }
    } catch (error) {
      console.log('No existing review');
    }
  };

  const loadAllReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const data = await apiService.getAuthorReviews(authorId);
      setAllReviews(data.reviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

// Add this to your AuthorRatingReview component or wherever you're calling the rating

const handleRatingClick = async (rating: number) => {
  console.log('🌟 ===== RATING CLICK START =====');
  console.log('📍 Rating value:', rating);
  console.log('📍 Author ID:', authorId);
  
  try {
    // Check if user is logged in
    const token = authService.getIdToken();
    console.log('🔑 Token exists?', !!token);
    console.log('🔑 Token preview:', token ? token.substring(0, 50) + '...' : 'NO TOKEN');
    
    // Make the API call
    console.log('📡 Calling apiService.rateAuthor...');
    const result = await apiService.rateAuthor(authorId, rating);
    
    console.log('✅ ===== RATING SUCCESS =====');
    console.log('📦 Result:', result);
    
    toast.success(`You rated this author ${rating} stars!`);
    
    // Update local state
    setUserRating(rating);
    
    // Refresh stats if callback provided
    if (onRatingUpdate) {
      onRatingUpdate();
    }
    
  } catch (error: any) {
    console.error('❌ ===== RATING ERROR =====');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    toast.error(error.message || 'Failed to submit rating');
  }
};


  const handleDeleteRating = async () => {
    if (!isUserLoggedIn) return;

    setIsSubmittingRating(true);
    try {
      await apiService.deleteAuthorRating(authorId);
      setUserRating(0);
      toast.success('Rating deleted successfully!');
      if (onRatingUpdate) onRatingUpdate();
    } catch (error: any) {
      console.error('Failed to delete rating:', error);
      toast.error(error.message || 'Failed to delete rating');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim() || reviewText.trim().length < 10) {
      toast.error('Review must be at least 10 characters long');
      return;
    }

    setIsSubmittingReview(true);
    try {
      if (isEditingReview) {
        await apiService.updateAuthorReview(authorId, reviewText);
        setUserReview({ ...userReview!, review_text: reviewText });
        toast.success('Review updated successfully!');
      } else {
        const data = await apiService.writeAuthorReview(authorId, reviewText);
        setUserReview({
          author_review_id: data.review.author_review_id,
          username: data.review.username,
          avatar_url: data.review.avatar_url,
          review_text: data.review.review_text,
          created_at: data.review.created_at,
          updated_at: data.review.created_at
        });
        toast.success('Review submitted successfully!');
      }
      
      setShowReviewDialog(false);
      setReviewText('');
      setIsEditingReview(false);
      loadAllReviews();
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEditReview = () => {
    if (!userReview) return;
    setReviewText(userReview.review_text);
    setIsEditingReview(true);
    setShowReviewDialog(true);
  };

  const handleDeleteReview = async () => {
    if (!confirm('Are you sure you want to delete your review?')) return;

    try {
      await apiService.deleteAuthorReview(authorId);
      setUserReview(null);
      toast.success('Review deleted successfully!');
      loadAllReviews();
    } catch (error: any) {
      console.error('Failed to delete review:', error);
      toast.error(error.message || 'Failed to delete review');
    }
  };

  const totalRatings = Object.values(ratingStats.ratingBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-primary text-primary" />
            Author Ratings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Average Rating Display */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">{ratingStats.avgRating.toFixed(1)}</div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= Math.round(ratingStats.avgRating)
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {ratingStats.totalRatings} {ratingStats.totalRatings === 1 ? 'rating' : 'ratings'}
                </p>
              </div>

              {/* User's Rating */}
              {!isCurrentUser && isUserLoggedIn && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Your Rating:</p>
                  <div className="flex items-center gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRatingClick(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        disabled={isSubmittingRating}
                        className="transition-transform hover:scale-110 disabled:opacity-50"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= (hoverRating || userRating)
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {userRating > 0 && (
                    <div className="text-center mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteRating}
                        disabled={isSubmittingRating}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove Rating
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rating Breakdown */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingStats.ratingBreakdown[rating.toString() as keyof typeof ratingStats.ratingBreakdown];
                const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

                return (
                  <div key={rating} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium">{rating}</span>
                      <Star className="w-3 h-3 fill-primary text-primary" />
                    </div>
                    <Progress value={percentage} className="h-2 flex-1" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Reviews ({ratingStats.totalReviews})
              </CardTitle>
              <CardDescription>What readers are saying about {authorName}</CardDescription>
            </div>
            {!isCurrentUser && isUserLoggedIn && !userReview && (
              <Button onClick={() => setShowReviewDialog(true)}>
                Write a Review
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* User's Review */}
          {userReview && (
            <div className="mb-6 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline">Your Review</Badge>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleEditReview}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDeleteReview}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm">{userReview.review_text}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(userReview.created_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* All Reviews */}
          {isLoadingReviews ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : allReviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allReviews.map((review) => (
                <div
                  key={review.author_review_id}
                  className="p-4 rounded-lg border border-border hover:border-primary transition-colors"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <Avatar>
                      <AvatarImage src={review.avatar_url} />
                      <AvatarFallback>{review.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{review.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">{review.review_text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingReview ? 'Edit Review' : 'Write a Review'}</DialogTitle>
            <DialogDescription>
              Share your thoughts about {authorName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write your review here (minimum 10 characters)..."
              rows={6}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {reviewText.length} / 5000 characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewDialog(false);
                setReviewText('');
                setIsEditingReview(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmittingReview || reviewText.trim().length < 10}
            >
              {isSubmittingReview ? 'Submitting...' : isEditingReview ? 'Update Review' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}