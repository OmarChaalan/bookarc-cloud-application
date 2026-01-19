import { Star } from "lucide-react";
import { Badge } from "./ui/badge";

interface BookCardProps {
  title: string;
  author: string;
  rating: number;
  reviews: number;
  coverUrl: string;
  genre?: string;
  isTrending?: boolean;
  onClick?: () => void;
}

export function BookCard({ title, author, rating, reviews, coverUrl, genre, isTrending, onClick }: BookCardProps) {
  return (
    <div 
      className="group relative bg-card border border-border rounded-lg overflow-hidden hover:shadow-xl hover:border-primary/40 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isTrending && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-accent text-background">Trending</Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="mb-1 line-clamp-1">{title}</h3>
        <p className="text-muted-foreground mb-3 line-clamp-1">{author}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="text-sm">{rating}</span>
            <span className="text-sm text-muted-foreground">({reviews})</span>
          </div>
          {genre && (
            <span className="text-xs text-muted-foreground">{genre}</span>
          )}
        </div>
      </div>
    </div>
  );
}
