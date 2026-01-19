import { useState, useEffect } from "react";
import { BookMarked, Search, SlidersHorizontal, Grid3x3, List, Star, X, ChevronLeft, ChevronRight, Users, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { apiService } from "../services/apiService";
import { toast } from "sonner";
import { Book } from "../types";
import { getAllBooks } from "../services/booksService";
import { BookOpen } from "lucide-react";
import { AddToListButton } from './AddToListButton'; // 🆕 ADD THIS IMPORT


interface BrowseBooksPageProps {
  onBack: () => void;
  onBookSelect: (book: Book) => void;
  
  // ✅ Updated to accept an object with id and authorType
  onAuthorSelect?: (author: { id: number; authorType: 'registered' | 'external' }) => void;
  
  onUserSelect?: (userId: number) => void;
  onGenresClick?: () => void;
  initialSearchType?: "books" | "authors" | "users";
  mockUsers?: Array<{
    id: number;
    username: string;
    avatarUrl: string;
    bio?: string;
    isPrivate: boolean;
    stats: {
      totalReviews: number;
      booksRead: number;
      followers: number;
    };
  }>;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  
  // 🆕 ADD THESE TWO PROPS
  isUserLoggedIn?: boolean;
  onLoginRequired?: () => void;
}

export function BrowseBooksPage({ 
  onBack, 
  onBookSelect, 
  onAuthorSelect, 
  onUserSelect, 
  onGenresClick, 
  initialSearchType = "books",
  mockUsers = [], 
  theme, 
  onToggleTheme,
  isUserLoggedIn = false,  // 🆕 ADD THIS with default
  onLoginRequired  // 🆕 ADD THIS
}: BrowseBooksPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"books" | "authors" | "users">(initialSearchType);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState("all");
  const [minRating, setMinRating] = useState([0]);
  const [sortBy, setSortBy] = useState("popular");
  const itemsPerPage = 12;

  const [books, setBooks] = useState<Book[]>([]);
const [loadingBooks, setLoadingBooks] = useState(true);
useEffect(() => {
  setLoadingBooks(true);
  getAllBooks()
    .then((data) => {
      setBooks(data);
    })
    .catch((error) => {
      console.error("Failed to fetch books:", error);
      toast.error("Failed to load books");
    })
    .finally(() => setLoadingBooks(false));
}, []);

  // Real users from API
  const [realUsers, setRealUsers] = useState<Array<{
    id: number;
    username: string;
    avatarUrl: string;
    bio?: string;
    isPrivate: boolean;
    stats: {
      totalReviews: number;
      booksRead: number;
      followers: number;
    };
  }>>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchDebounce, setUserSearchDebounce] =
  useState<ReturnType<typeof setTimeout> | null>(null);

    // Real authors from API
const [realAuthors, setRealAuthors] = useState<Array<{
  id: number;
  name: string;
  bio: string;
  verified: boolean;
  avatarUrl: string;
  authorType: 'registered' | 'external';  // ✅ Added this field
  stats: {
    totalBooks: number;
    followers: number;
  };
}>>([]);
const [isLoadingAuthors, setIsLoadingAuthors] = useState(false);

useEffect(() => {
  // Reset users when switching away from users tab
  if (searchType !== "users") {
    setRealUsers([]);
    setIsLoadingUsers(false);
    return;
  }

  // Clear users if query is too short
  if (searchQuery.trim().length < 2) {
    setRealUsers([]);
    setIsLoadingUsers(false);
    return;
  }

  // Set loading immediately
  setIsLoadingUsers(true);

  const timeout = setTimeout(async () => {
    try {
      const result = await apiService.searchUsers({
        q: searchQuery.trim(),
        limit: 20,
        include_private: false
      });

      // Only update if we're still on the users tab
      if (searchType === "users") {
        setRealUsers(
          result.users.map(user => ({
            id: user.id,
            username: user.displayName || user.username,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            isPrivate: user.isPrivate,
            stats: {
              totalReviews: user.stats.totalReviews,
              booksRead: user.stats.booksRead,
              followers: user.stats.followers,
            }
          }))
        );
      }
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
      setRealUsers([]);
    } finally {
      // Only update loading state if still on users tab
      if (searchType === "users") {
        setIsLoadingUsers(false);
      }
    }
  }, 500);

  return () => clearTimeout(timeout);
}, [searchQuery, searchType]);


  // Use real users for display
  const displayUsers = searchType === "users" ? realUsers : [];

  // Mock book data


  const genres = [...new Set(books.map(book => book.genre).filter(Boolean))].sort();

  const authors = [...new Set(books.map(book => book.author))].sort();

  const displayAuthors = searchType === "authors" ? realAuthors : [];

useEffect(() => {
  // Reset authors when switching away from authors tab
  if (searchType !== "authors") {
    setRealAuthors([]);
    setIsLoadingAuthors(false);
    return;
  }

  // Clear authors if query is too short
  if (searchQuery.trim().length < 2) {
    setRealAuthors([]);
    setIsLoadingAuthors(false);
    return;
  }

  // Set loading immediately
  setIsLoadingAuthors(true);

  const timeout = setTimeout(async () => {
    try {
      console.log(`🔍 Searching authors with query: "${searchQuery.trim()}"`);
      
      const result = await apiService.searchAuthors({
        q: searchQuery.trim(),
        limit: 20,
      });

      console.log(`✅ Search response:`, result);

      if (searchType === "authors") {
        // ✅ Map to ensure we have all fields including authorType
        const mappedAuthors = result.authors.map(author => ({
          id: author.id,
          name: author.name,
          bio: author.bio || 'No bio available',
          verified: author.verified,
          avatarUrl: author.avatarUrl || '/placeholder-avatar.png',
          authorType: author.authorType ? 'registered' as const : 'external' as const,
          stats: {
            totalBooks: author.stats.totalBooks,
            followers: author.stats.followers,
          }
        }));

        console.log(`📝 Mapped authors for display:`, mappedAuthors);
        setRealAuthors(mappedAuthors);
      }
    } catch (error) {
      console.error("❌ Error searching authors:", error);
      toast.error("Failed to search authors");
      setRealAuthors([]);
    } finally {
      if (searchType === "authors") {
        setIsLoadingAuthors(false);
      }
    }
  }, 500);

  return () => clearTimeout(timeout);
}, [searchQuery, searchType]);


  // Apply filters
  let filteredBooks = books;

  if (searchQuery && searchType === "books") {
    filteredBooks = filteredBooks.filter(book =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (selectedGenres.length > 0) {
    filteredBooks = filteredBooks.filter(book => selectedGenres.includes(book.genre));
  }

  if (selectedAuthor !== "all") {
    filteredBooks = filteredBooks.filter(book => book.author === selectedAuthor);
  }

  if (minRating[0] > 0) {
    filteredBooks = filteredBooks.filter(book => book.rating >= minRating[0]);
  }

  // Sort books
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.rating - a.rating;
      case "newest":
        return b.publishYear - a.publishYear;
      case "title":
        return a.title.localeCompare(b.title);
      default: // popular
        return b.rating - a.rating;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedBooks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentBooks = sortedBooks.slice(startIndex, startIndex + itemsPerPage);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedAuthor("all");
    setMinRating([0]);
    setSortBy("popular");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedGenres.length > 0 || selectedAuthor !== "all" || minRating[0] > 0 || searchQuery !== "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Logo />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Books</h1>
          <p className="text-muted-foreground">
            Explore our collection of {books.length} amazing books
          </p>
        </div>

        {/* Tabs for Books / Authors / Users / Genres */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={searchType === "books" ? "default" : "ghost"}
              onClick={() => {
                setSearchType("books");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="gap-2"
            >
              <BookMarked className="w-4 h-4" />
              Books
            </Button>
            <Button
              variant={searchType === "authors" ? "default" : "ghost"}
              onClick={() => {
                setSearchType("authors");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Authors
            </Button>
            <Button
              variant={searchType === "users" ? "default" : "ghost"}
              onClick={() => {
                setSearchType("users");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Users
            </Button>
            <Button
              variant="ghost"
              onClick={onGenresClick}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Genres
            </Button>
          </div>
        </div>

        {/* Search and Type Selection */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder={`Search by title, author, or description...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {searchType === "books" && (
              <>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Filters
                      {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-2">
                          Active
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Filter Books</SheetTitle>
                      <SheetDescription>
                        Refine your search with these filters
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      {/* Genre Filter */}
                      <div>
                        <Label className="mb-3 block">Genres</Label>
                        <div className="flex flex-wrap gap-2">
                          {genres.map(genre => (
                            <Badge
                              key={genre}
                              variant={selectedGenres.includes(genre) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleGenre(genre)}
                            >
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Author Filter */}
                      <div>
                        <Label htmlFor="author-select">Author</Label>
                        <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
                          <SelectTrigger id="author-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Authors</SelectItem>
                            {authors.map(author => (
                              <SelectItem key={author} value={author}>
                                {author}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      {/* Rating Filter */}
                      <div>
                        <Label className="mb-3 block">Minimum Rating: {minRating[0]}</Label>
                        <Slider
                          value={minRating}
                          onValueChange={setMinRating}
                          max={5}
                          step={0.5}
                          className="mb-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0</span>
                          <span>5</span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        className="w-full"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Sort Options (only for books) */}
          {searchType === "books" && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { value: "popular", label: "Popular" },
                  { value: "rating", label: "Rating" },
                  { value: "newest", label: "Newest" },
                  { value: "title", label: "Title" }
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setSortBy(option.value);
                      setCurrentPage(1);
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters Display */}
          {searchType === "books" && hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedGenres.map(genre => (
                <Badge key={genre} variant="secondary">
                  {genre}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => toggleGenre(genre)}
                  />
                </Badge>
              ))}
              {selectedAuthor !== "all" && (
                <Badge variant="secondary">
                  {selectedAuthor}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => setSelectedAuthor("all")}
                  />
                </Badge>
              )}
              {minRating[0] > 0 && (
                <Badge variant="secondary">
                  Rating: {minRating[0]}+
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => setMinRating([0])}
                  />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary">
                  Search: {searchQuery}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          )}
        </div>

        {/* Results Count */}
        {searchType === "books" && (
          <div className="mb-4 text-sm text-muted-foreground">
            {sortedBooks.length === books.length
              ? `Showing all ${books.length} books`
              : `Found ${sortedBooks.length} of ${books.length} books`}
          </div>
        )}

{/* Author Results Display */}
{searchType === "authors" && (
  <div className="space-y-4 mb-8">
    {isLoadingAuthors ? (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Searching authors...</p>
      </Card>
    ) : displayAuthors.length > 0 ? (
      displayAuthors.map((author, index) => {
        console.log(`🖱️ Author card data:`, {
          id: author.id,
          name: author.name,
          authorType: author.authorType,
          type: typeof author.id
        });

        return (
          <Card 
            key={index} 
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              console.log(`🖱️ Author card clicked:`, {
                id: author.id,
                name: author.name,
                authorType: author.authorType
              });
              
              // ✅ FIXED: Pass the object with id and authorType
              if (onAuthorSelect) {
                onAuthorSelect({
                  id: author.id,
                  authorType: author.authorType || 'registered'
                });
              }
            }}
          >
            <div className="flex items-center gap-4 p-6">
              <Avatar className="w-16 h-16">
                <AvatarImage src={author.avatarUrl} />
                <AvatarFallback>
                  {author.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl">{author.name}</h3>
                  {author.verified && (
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      Verified
                    </Badge>
                  )}
                  {author.authorType === 'external' && (
                    <Badge variant="outline" className="border-blue-500 text-blue-500">
                      External Author
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{author.bio}</p>
                <div className="mt-2 text-sm text-muted-foreground">
                  {author.stats.totalBooks} published {author.stats.totalBooks === 1 ? 'book' : 'books'} • {author.stats.followers} followers
                </div>
              </div>
              <Button variant="outline">
                View Profile
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        );
      })
    ) : searchQuery.trim().length < 2 ? (
      <Card className="p-12 text-center">
        <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-xl mb-2">Search for Authors</h3>
        <p className="text-muted-foreground">
          Enter at least 2 characters to search for authors
        </p>
      </Card>
    ) : (
      <Card className="p-12 text-center">
        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-xl mb-2">No authors found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search to find authors
        </p>
      </Card>
    )}
  </div>
)}

{/* User Results Display */}
{searchType === "users" && (
  <div className="space-y-4 mb-8">
    {isLoadingUsers ? (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Searching users...</p>
      </Card>
    ) : displayUsers.length > 0 ? (
      displayUsers.map((user, index) => {
        console.log(`👤 DEBUG: Rendering user card for:`, {
          id: user.id,
          username: user.username,
          type: typeof user.id,
        });

        return (
          <Card
            key={index}
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              console.log(`🖱️ DEBUG: User card clicked:`, {
                userId: user.id,
                username: user.username,
                type: typeof user.id,
              });
              onUserSelect?.(user.id);
            }}
          >
            <div className="flex items-center gap-4 p-6">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>
                  {user.username
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl">{user.username}</h3>
                  <Badge variant="outline">
                    {user.isPrivate ? "Private" : "Public"}
                  </Badge>
                </div>

                <p className="text-muted-foreground">
                  {user.bio || "No bio available"}
                </p>

                <div className="mt-2 text-sm text-muted-foreground">
                  {user.stats.totalReviews} reviews,{" "}
                  {user.stats.booksRead} books read,{" "}
                  {user.stats.followers} followers
                </div>
              </div>

              <Button variant="outline">
                View Profile
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        );
      })
    ) : searchQuery.trim().length < 2 ? (
      <Card className="p-12 text-center">
        <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-xl mb-2">Search for Users</h3>
        <p className="text-muted-foreground">
          Enter at least 2 characters to search for users
        </p>
      </Card>
    ) : (
      <Card className="p-12 text-center">
        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-xl mb-2">No users found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search to find users
        </p>
      </Card>
    )}
  </div>
)}

        {/* Books Display */}
        {searchType === "books" && (currentBooks.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
                {currentBooks.map(book => (
                  <Card 
                    key={book.id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onBookSelect(book)}
                  >
                    <div className="relative h-64">
                      <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                      <Badge className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm">
                        {book.genre}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{book.title}</CardTitle>
                      <CardDescription>{book.author}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">{book.description}</p>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-primary text-primary" />
                          <span className="font-medium">{book.rating}</span>
                          <span className="text-sm text-muted-foreground">({(book.reviews ?? book.totalRatings).toLocaleString()})</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{book.publishYear}</span>
                      </div>
                      
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {currentBooks.map(book => (
                  <Card 
                    key={book.id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onBookSelect(book)}
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="relative w-full md:w-48 h-48 md:h-auto flex-shrink-0">
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="mb-1">{book.title}</CardTitle>
                              <CardDescription className="text-base">{book.author}</CardDescription>
                            </div>
                            <Badge variant="outline">{book.genre}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">{book.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-primary text-primary" />
                              <span className="font-medium">{book.rating}</span>
                              <span className="text-sm text-muted-foreground">({(book.reviews ?? book.totalRatings).toLocaleString()} ratings)</span>
                            </div>
                            <span className="text-sm text-muted-foreground">Published {book.publishYear}</span>
                          </div>
                          
                          
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNumber = i + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNumber)}
                            isActive={currentPage === pageNumber}
                            className="cursor-pointer"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (
                      pageNumber === currentPage - 2 ||
                      pageNumber === currentPage + 2
                    ) {
                      return <PaginationEllipsis key={pageNumber} />;
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center">
              <Search className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-xl mb-2">No books found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Try adjusting your filters or search query
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}