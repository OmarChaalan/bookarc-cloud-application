import { useState, useEffect } from "react";
import { ArrowLeft, Heart, BookOpen, Star, TrendingUp, Search, Filter } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { toast } from "sonner";
import { apiService } from "../services/apiService";

interface Genre {
  genre_id: number;
  genre_name: string;
  book_count: number;
  is_favorited: boolean;
}

interface GenresPageProps {
  onBack: () => void;
  onLogoClick?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  isUserLoggedIn: boolean;
  onLoginRequired?: () => void;
  onGenreClick?: (genreName: string) => void;
  currentUser?: { isAdmin?: boolean };
}

export function GenresPage({
  onBack,
  onLogoClick,
  theme,
  onToggleTheme,
  isUserLoggedIn,
  onLoginRequired,
  onGenreClick,
  currentUser,
}: GenresPageProps) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "popularity">("popularity");

  // Load genres on mount
  useEffect(() => {
    loadGenres();
  }, [isUserLoggedIn]);

  const loadGenres = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllGenres();
      setGenres(response.genres || []);
    } catch (error: any) {
      console.error("Failed to load genres:", error);
      toast.error("Failed to load genres");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (genreId: number) => {
    if (!isUserLoggedIn) {
      toast.error("Please log in to favorite genres");
      if (onLoginRequired) {
        setTimeout(() => onLoginRequired(), 1500);
      }
      return;
    }

    if (currentUser?.isAdmin) {
      toast.error("Admins cannot favorite genres");
      return;
    }

    const genre = genres.find(g => g.genre_id === genreId);
    if (!genre) return;

    try {
      if (genre.is_favorited) {
        await apiService.unfavoriteGenre(genreId);
        toast.success(`Removed ${genre.genre_name} from favorites`);
      } else {
        await apiService.favoriteGenre(genreId);
        toast.success(`Added ${genre.genre_name} to favorites!`);
      }

      // Update local state
      setGenres(genres.map(g =>
        g.genre_id === genreId
          ? { ...g, is_favorited: !g.is_favorited }
          : g
      ));
    } catch (error: any) {
      console.error("Failed to toggle favorite:", error);
      toast.error(error.message || "Failed to update favorite");
    }
  };

  // Filter and sort genres
  const filteredGenres = genres
    .filter(genre =>
      genre.genre_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.genre_name.localeCompare(b.genre_name);
      } else {
        return b.book_count - a.book_count;
      }
    });

  const favoriteGenres = filteredGenres.filter(g => g.is_favorited);
  const otherGenres = filteredGenres.filter(g => !g.is_favorited);

  // Genre color mapping for visual variety
  const getGenreColor = (index: number) => {
    const colors = [
      "from-blue-500/20 to-blue-600/20 border-blue-500/30",
      "from-purple-500/20 to-purple-600/20 border-purple-500/30",
      "from-pink-500/20 to-pink-600/20 border-pink-500/30",
      "from-green-500/20 to-green-600/20 border-green-500/30",
      "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30",
      "from-red-500/20 to-red-600/20 border-red-500/30",
      "from-indigo-500/20 to-indigo-600/20 border-indigo-500/30",
      "from-teal-500/20 to-teal-600/20 border-teal-500/30",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo className="w-6 h-6" />
            <span className="text-xl">BookArc</span>
          </button>

          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl mb-3">Explore Genres</h1>
          <p className="text-muted-foreground text-lg">
            Discover books by genre and save your favorites for personalized recommendations
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={sortBy === "popularity" ? "default" : "outline"}
              onClick={() => setSortBy("popularity")}
              className="gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Popular
            </Button>
            <Button
              variant={sortBy === "name" ? "default" : "outline"}
              onClick={() => setSortBy("name")}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              A-Z
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Favorite Genres Section */}
            {isUserLoggedIn && favoriteGenres.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  <h2 className="text-2xl">Your Favorite Genres</h2>
                  <Badge variant="secondary">{favoriteGenres.length}</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {favoriteGenres.map((genre, index) => (
                    <Card
                      key={genre.genre_id}
                      className={`group relative overflow-hidden border-2 bg-gradient-to-br ${getGenreColor(index)} hover:shadow-xl transition-all duration-300 cursor-pointer`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <BookOpen className="w-6 h-6 text-primary" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(genre.genre_id);
                            }}
                            className="transition-transform hover:scale-110"
                          >
                            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                          </button>
                        </div>

                        <button
                          onClick={() => onGenreClick && onGenreClick(genre.genre_name)}
                          className="w-full text-left"
                        >
                          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                            {genre.genre_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {genre.book_count.toLocaleString()} books
                          </p>
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* All Genres Section */}
            <div>
              <h2 className="text-2xl mb-6">
                {isUserLoggedIn && favoriteGenres.length > 0 ? "All Genres" : "Browse Genres"}
              </h2>

              {otherGenres.length === 0 ? (
                <Card className="p-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No genres found matching your search" : "No genres available"}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {otherGenres.map((genre, index) => (
                    <Card
                      key={genre.genre_id}
                      className={`group relative overflow-hidden border bg-gradient-to-br ${getGenreColor(index + favoriteGenres.length)} hover:shadow-xl hover:border-primary/40 transition-all duration-300 cursor-pointer`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <BookOpen className="w-6 h-6 text-primary" />
                          {isUserLoggedIn && !currentUser?.isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(genre.genre_id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                            >
                              <Heart className="w-5 h-5 text-muted-foreground hover:text-red-500" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => onGenreClick && onGenreClick(genre.genre_name)}
                          className="w-full text-left"
                        >
                          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                            {genre.genre_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {genre.book_count.toLocaleString()} books
                          </p>
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}