import { useState } from "react";
import { Star, X, AlertCircle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";

interface WriteReviewDialogProps {
  targetType: "book" | "author";
  targetName: string;
  isUserLoggedIn: boolean;
  onLoginRequired?: () => void;
  onReviewSubmit?: (rating: number, reviewText: string) => void;
  currentUser?: {
    isAdmin?: boolean;
  };
}

export function WriteReviewDialog({
  targetType,
  targetName,
  isUserLoggedIn,
  onLoginRequired,
  onReviewSubmit,
  currentUser,
}: WriteReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    // Validation
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    if (reviewText.trim().length < 10) {
      setError("Review must be at least 10 characters long");
      return;
    }

    if (reviewText.trim().length > 2000) {
      setError("Review must be less than 2000 characters");
      return;
    }

    // Submit review
    if (onReviewSubmit) {
      onReviewSubmit(rating, reviewText.trim());
    }

    // Reset and close
    setRating(0);
    setHoverRating(0);
    setReviewText("");
    setError("");
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Check authentication
      if (!isUserLoggedIn) {
        if (onLoginRequired) {
          onLoginRequired();
        }
        return;
      }

      // Check admin restriction
      if (currentUser?.isAdmin) {
        return;
      }
    }

    setOpen(newOpen);
    
    // Reset form when closing
    if (!newOpen) {
      setRating(0);
      setHoverRating(0);
      setReviewText("");
      setError("");
    }
  };

  const characterCount = reviewText.length;
  const minChars = 10;
  const maxChars = 2000;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        onClick={() => handleOpenChange(true)}
        className="gap-2"
        disabled={currentUser?.isAdmin}
      >
        <Sparkles className="w-4 h-4" />
        Write a Review
      </Button>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">Write a Review</DialogTitle>
              <DialogDescription className="text-base mt-1.5">
                Share your thoughts about <span className="font-semibold text-foreground">"{targetName}"</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-6">
          {/* Rating Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              Your Rating
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground hover:text-yellow-400/50"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-3 text-lg font-medium">
                  {rating} {rating === 1 ? "star" : "stars"}
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Review Text Section */}
          <div className="space-y-3">
            <Label htmlFor="review-text" className="text-base font-semibold flex items-center gap-2">
              Your Review
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="review-text"
              placeholder="Share your thoughts about this book. What did you like? What could be better? Would you recommend it to others?"
              value={reviewText}
              onChange={(e) => {
                setReviewText(e.target.value);
                setError("");
              }}
              className="min-h-[200px] resize-none text-base leading-relaxed"
              maxLength={maxChars}
            />
            <div className="flex items-center justify-between text-sm">
              <span className={`transition-colors ${
                characterCount < minChars
                  ? "text-muted-foreground"
                  : characterCount > maxChars * 0.9
                  ? "text-yellow-600 dark:text-yellow-500"
                  : "text-green-600 dark:text-green-500"
              }`}>
                {characterCount < minChars
                  ? `${minChars - characterCount} more characters needed`
                  : `${characterCount} / ${maxChars} characters`}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Guidelines */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Review Guidelines
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Be honest and constructive in your feedback</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Avoid spoilers or use spoiler warnings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Keep your review focused on the {targetType}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Be respectful to authors and other readers</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || reviewText.trim().length < minChars}
            className="gap-2 min-w-[140px]"
          >
            <Sparkles className="w-4 h-4" />
            Submit Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}