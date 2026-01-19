import { useState, useEffect } from "react";
import { BookMarked, TrendingUp, Eye, Star, MessageSquare, Upload, BarChart3, Bell, User, LogOut, Moon, Sun, Edit, Search, Book, Calendar, DollarSign, FileText, Users, Award, BadgeCheck, Settings, BookOpen, Plus, ThumbsUp, ThumbsDown, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { apiService } from "../services/apiService";
import { AlertCircle, CheckCircle, Clock, Trash2, XCircle } from "lucide-react";
import { formatShortDate } from "../utils/timeUtils";
import AuthorRatingReview from "./AuthorRatingAndReview";
import { AuthorPublicProfilePage } from "./AuthorPublicProfilePage";

interface AuthorDashboardProps {
  onLogout: () => void;
  onLogoClick: () => void;
  onViewNotifications?: () => void;
  onEditProfile?: () => void;
  onViewUserDashboard?: () => void;
  onViewBookDetails?: (bookId: number) => void;
  currentAuthor?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AuthorDashboard({ 
  onLogout, 
  onLogoClick, 
  onViewNotifications, 
  onEditProfile, 
  onViewUserDashboard,
  onViewBookDetails, 
  currentAuthor, 
  theme, 
  onToggleTheme 
}:  AuthorDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [authorData, setAuthorData] = useState({
    name: "Author Name",
    email: "author@email.com",
    avatarUrl: ""
  });
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);
  
  const [newBook, setNewBook] = useState({
    title: '',
    summary: '',
    isbn: '',
    publish_date: '',
    cover_image_url: '',
    genres: ['']
  });

  const [bookStats, setBookStats] = useState<{
    books: Array<any>;
    stats: {
      total_books: number;
      published_books: number;
      pending_books: number;
      rejected_books: number;
      total_reviews: number;
      total_ratings: number;
      overall_avg_rating: number;
    };
  } | null>(null);
  const [isLoadingBookStats, setIsLoadingBookStats] = useState(false);
  
  const [showEditBookDialog, setShowEditBookDialog] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);
  const [authorSubmittedBooks, setAuthorSubmittedBooks] = useState<Array<any>>([]);
  const [isLoadingAuthorBooks, setIsLoadingAuthorBooks] = useState(false);

  // Load author data from props
  useEffect(() => {
    if (currentAuthor) {
      setAuthorData({
        name: currentAuthor.name,
        email: currentAuthor.email,
        avatarUrl: currentAuthor.avatarUrl || ""
      });
    }
  }, [currentAuthor]);

  const authorInitials = authorData.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const loadAuthorSubmittedBooks = async () => {
    try {
      setIsLoadingAuthorBooks(true);
      const data = await apiService.getAuthorBooks();
      setAuthorSubmittedBooks(data.books);
    } catch (error: any) {
      console.error("Failed to load submitted books:", error);
      toast.error("Failed to load your submitted books");
    } finally {
      setIsLoadingAuthorBooks(false);
    }
  };

  useEffect(() => {
  const loadNotificationCount = async () => {
    try {
      setIsLoadingNotifications(true);
      const response = await apiService.getNotifications({ limit: 1 });
      setUnreadNotifications(response.unread_count);
    } catch (error: any) {
      console.error("Failed to load notification count:", error);
      setUnreadNotifications(0);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  loadNotificationCount();
  
  // Refresh every 30 seconds
  const interval = setInterval(loadNotificationCount, 30000);
  
  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    if (activeTab === "books") {
      loadAuthorSubmittedBooks();
    }
  }, [activeTab]);

  const getStatusBadge = (status: string, rejectionReason?: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const [authorRatingStats, setAuthorRatingStats] = useState<{
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
} | null>(null);

const [currentAuthorId, setCurrentAuthorId] = useState<number | null>(null);
const [authorProfileData, setAuthorProfileData] = useState<any>(null);

  // Genre handlers only (NO author handlers)
  const handleAddGenreField = () => {
    setNewBook(prev => ({
      ...prev,
      genres: [...prev.genres, '']
    }));
  };

  const handleRemoveGenreField = (index: number) => {
    setNewBook(prev => ({
      ...prev,
      genres: prev.genres.filter((_, i) => i !== index)
    }));
  };

  const handleGenreChange = (index: number, value: string) => {
    setNewBook(prev => ({
      ...prev,
      genres: prev.genres.map((genre, i) => i === index ? value : genre)
    }));
  };

  const handleSubmitBookForApproval = async () => {
    // Validation
    if (!newBook.title.trim()) {
      toast.error('Book title is required');
      return;
    }

    const validGenres = newBook.genres.filter(g => g.trim());
    if (validGenres.length === 0) {
      toast.error('At least one genre is required');
      return;
    }

    setIsSubmittingBook(true);

    try {
      // Call API to submit book - NO authors field
      await apiService.submitBook({
        title: newBook.title.trim(),
        summary: newBook.summary.trim() || null,
        isbn: newBook.isbn.trim() || null,
        publish_date: newBook.publish_date || null,
        cover_image_url: newBook.cover_image_url.trim() || null,
        genres: validGenres
      });

      toast.success('Book submitted successfully! It will be reviewed by an admin.');
      
      // Reset form
      setNewBook({
        title: '',
        summary: '',
        isbn: '',
        publish_date: '',
        cover_image_url: '',
        genres: ['']
      });

      setShowAddBookDialog(false);
      loadAuthorSubmittedBooks();
    } catch (error: any) {
      console.error('Failed to submit book:', error);
      toast.error(error.message || 'Failed to submit book');
    } finally {
      setIsSubmittingBook(false);
    }
  };

  const handleUpdateBook = async () => {
    if (!editingBook) return;

    if (!newBook.title.trim()) {
      toast.error('Book title is required');
      return;
    }

    const validGenres = newBook.genres.filter(g => g.trim());
    if (validGenres.length === 0) {
      toast.error('At least one genre is required');
      return;
    }

    setIsSubmittingBook(true);

    try {
      await apiService.updatePendingBook(editingBook.book_id, {
        title: newBook.title.trim(),
        summary: newBook.summary.trim() || null,
        isbn: newBook.isbn.trim() || null,
        publish_date: newBook.publish_date || null,
        cover_image_url: newBook.cover_image_url.trim() || null,
        genres: validGenres
      });

      toast.success('Book updated successfully!');
      
      setNewBook({
        title: '',
        summary: '',
        isbn: '',
        publish_date: '',
        cover_image_url: '',
        genres: ['']
      });

      setShowEditBookDialog(false);
      setEditingBook(null);
      loadAuthorSubmittedBooks();
    } catch (error: any) {
      console.error('Failed to update book:', error);
      toast.error(error.message || 'Failed to update book');
    } finally {
      setIsSubmittingBook(false);
    }
  };

const loadBookStats = async () => {
  console.log('ðŸš€ ===== LOADING BOOK STATS =====');
  
  try {
    setIsLoadingBookStats(true);
    
    console.log('ðŸ“¡ Calling apiService.getAuthorBookStats()...');
    const data = await apiService.getAuthorBookStats();
    
    console.log('âœ… ===== API RESPONSE RECEIVED =====');
    console.log('ðŸ“¦ Full Response Object:', data);
    console.log('ðŸ“¦ Response Type:', typeof data);
    console.log('ðŸ“¦ Response Keys:', Object.keys(data));
    
    console.log('\nðŸ“š BOOKS DATA:');
    console.log('   - books exists?', 'books' in data);
    console.log('   - books type:', typeof data.books);
    console.log('   - books length:', data.books?.length);
    console.log('   - books[0]:', data.books?.[0]);
    
    console.log('\nðŸ“ˆ STATS DATA:');
    console.log('   - stats exists?', 'stats' in data);
    console.log('   - stats:', data.stats);
    
    console.log('\nâ­ AUTHOR STATS DATA:');
    console.log('   - author_stats exists?', 'author_stats' in data);
    console.log('   - author_stats type:', typeof data.author_stats);
    console.log('   - author_stats value:', data.author_stats);
    
    if (data.author_stats) {
      console.log('   - avgRating:', data.author_stats.avgRating);
      console.log('   - totalRatings:', data.author_stats.totalRatings);
      console.log('   - totalReviews:', data.author_stats.totalReviews);
      console.log('   - ratingBreakdown:', data.author_stats.ratingBreakdown);
    } else {
      console.error('   âŒ author_stats is NULL or UNDEFINED!');
    }
    
    console.log('\nðŸ†” AUTHOR ID:');
    console.log('   - author_id exists?', 'author_id' in data);
    console.log('   - author_id type:', typeof data.author_id);
    console.log('   - author_id value:', data.author_id);
    
    // Set book stats
    console.log('\nðŸ’¾ Setting bookStats state...');
    setBookStats(data);
    console.log('âœ… bookStats state set');
    
    // Set author rating stats
    if (data.author_stats) {
      console.log('\nâ­ Setting authorRatingStats...');
      const ratingStats = {
        avgRating: data.author_stats.avgRating || 0,
        totalRatings: data.author_stats.totalRatings || 0,
        totalReviews: data.author_stats.totalReviews || 0,
        ratingBreakdown: data.author_stats.ratingBreakdown || {
          '5': 0,
          '4': 0,
          '3': 0,
          '2': 0,
          '1': 0
        }
      };
      console.log('   - Rating stats object:', ratingStats);
      setAuthorRatingStats(ratingStats);
      console.log('âœ… authorRatingStats state set');
    } else {
      console.error('âŒ Cannot set authorRatingStats - data.author_stats is missing!');
    }
    
    // Set author ID
    if (data.author_id) {
      console.log('\nðŸ†” Setting currentAuthorId...');
      console.log('   - Author ID value:', data.author_id);
      setCurrentAuthorId(data.author_id);
      console.log('âœ… currentAuthorId state set');
    } else {
      console.error('âŒ Cannot set currentAuthorId - data.author_id is missing!');
    }
    
    console.log('\nâœ… ===== BOOK STATS LOADING COMPLETE =====');
    
  } catch (error: any) {
    console.error('âŒ ===== BOOK STATS LOADING FAILED =====');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    toast.error("Failed to load book statistics");
  } finally {
    setIsLoadingBookStats(false);
  }
};

const loadAuthorProfileData = async () => {
  try {
    // Fetch author profile data for the current logged-in author
    const profile = await apiService.getUserProfile();
    
    // Fetch book stats to get the published books
    const stats = await apiService.getAuthorBookStats();
    
    // Transform the data to match AuthorPublicProfilePage's expected format
const profileData = {
  id: profile.user_id,
  authorId: stats.author_id,
  name: profile.display_name || profile.username,
  email: profile.email,
  avatarUrl: profile.profile_image || "",
  bio: profile.bio || "No biography available yet.",
  location: profile.location,
  joinDate: new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      verified: true,
      authorType: 'registered' as const,
      stats: {
        totalBooks: stats.stats.published_books,
        totalReads: 0,
        totalRatings: stats.stats.total_ratings,
        avgRating: stats.author_stats?.avgRating || 0,
        followers: 0 // This would need to be fetched from followers API
      },
      books: stats.books
        .filter(b => b.approval_status === 'approved')
        .map(book => ({
          id: book.book_id,
          title: book.title,
          author: book.authors,
          rating: book.average_rating,
          totalRatings: book.total_ratings,
          cover: book.cover_image_url,
          genre: book.genres.split(', ')[0],
          description: book.summary || ""
        }))
    };
    
    setAuthorProfileData(profileData);
  } catch (error) {
    console.error("Failed to load author profile data:", error);
    toast.error("Failed to load your public profile");
  }
};

useEffect(() => {
  if (activeTab === "overview") {
    loadBookStats();
  } else if (activeTab === "public-page") {
    loadAuthorProfileData();
  }
}, [activeTab]);

  // Mock book IDs for filtering reviews (this would normally come from your published books)
  const authorBookIds = bookStats?.books
    .filter(b => b.approval_status === 'approved')
    .map(b => b.book_id) || [];

    // CONTINUATION FROM PART 1 - This is the return statement and JSX

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <Logo className="w-6 h-6" />
            <span className="text-xl">BookArc</span>
          </button>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <Badge variant="outline" className="border-primary/40 text-primary hidden md:flex">
              Author
            </Badge>
            
            {onViewNotifications && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={onViewNotifications}
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            )}

            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={authorData.avatarUrl} alt={authorData.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {authorInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{authorData.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {authorData.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {onViewUserDashboard && (
                  <DropdownMenuItem onClick={onViewUserDashboard}>
                    <User className="mr-2 h-4 w-4" />
                    <span>User Dashboard</span>
                  </DropdownMenuItem>
                )}
                
                {onEditProfile && (
                  <DropdownMenuItem onClick={onEditProfile}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Edit Profile</span>
                  </DropdownMenuItem>
                )}
                
                {onViewNotifications && (
                  <DropdownMenuItem onClick={onViewNotifications}>
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                    {unreadNotifications > 0 && (
                      <Badge className="ml-auto bg-destructive text-destructive-foreground">
                        {unreadNotifications}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Author Dashboard</h1>
          <p className="text-muted-foreground">Manage your books, track your performance, and engage with your readers.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
<TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
  <TabsTrigger value="overview" className="gap-2">
    <BarChart3 className="w-4 h-4" />
    Overview
  </TabsTrigger>
  <TabsTrigger value="books" className="gap-2">
    <BookOpen className="w-4 h-4" />
    My Books
  </TabsTrigger>
  <TabsTrigger value="reviews" className="gap-2">
    <MessageSquare className="w-4 h-4" />
    Reviews
  </TabsTrigger>
  <TabsTrigger value="public-page" className="gap-2">
    <User className="w-4 h-4" />
    My Public Page
  </TabsTrigger>
</TabsList>

          {/* ==================== OVERVIEW TAB ==================== */}
          <TabsContent value="overview" className="space-y-6">
            {isLoadingBookStats ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2" />
                      <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Total Books Published */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Books Published</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {bookStats?.stats.published_books || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lifetime publications
                      </p>
                    </CardContent>
                  </Card>

                  {/* Published vs Pending */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Published vs Pending</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {bookStats?.stats.published_books || 0} / {bookStats?.stats.pending_books || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-green-600">{bookStats?.stats.published_books || 0} published</span> Â· <span className="text-yellow-600">{bookStats?.stats.pending_books || 0} pending</span>
                      </p>
                    </CardContent>
                  </Card>

{/* Total Author Reviews - UPDATED */}
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Author Reviews</CardTitle>
    <MessageSquare className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {authorRatingStats?.totalReviews.toLocaleString() || 0}
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      Reviews about you as an author
    </p>
  </CardContent>
</Card>

{/* Average Rating Card - SHOW AUTHOR RATING */}
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Average Author Rating</CardTitle>
    <Star className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {authorRatingStats?.avgRating.toFixed(1) || '0.0'}
    </div>
    <div className="flex items-center gap-1 mt-1">
      {[...Array(5)].map((_, i) => (
        <Star 
          key={i} 
          className={`w-3 h-3 ${i < Math.floor(authorRatingStats?.avgRating || 0) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} 
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        ({authorRatingStats?.totalRatings || 0} ratings)
      </span>
    </div>
  </CardContent>
</Card>
                </div>

                {/* My Books Section with Real Data */}
                <Card>
                  <CardHeader>
                    <CardTitle>My Books</CardTitle>
                    <CardDescription>Your published books with detailed ratings and reviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!bookStats || bookStats.books.filter(b => b.approval_status === 'approved').length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No published books yet</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {bookStats.books
                          .filter(book => book.approval_status === 'approved')
                          .map((book) => {
                            const totalRatings = Object.values(book.rating_breakdown as Record<number, number>).reduce((a, b) => a + b, 0);
                            return (
  <div 
    key={book.book_id} 
    className="border border-border rounded-lg p-4 hover:bg-accent/5 transition-colors cursor-pointer"
    onClick={() => onViewBookDetails && onViewBookDetails(book.book_id)}
  >
    <div className="flex gap-4">
                                  {/* Book Cover */}
                                  {book.cover_image_url ? (
                                    <img 
                                      src={book.cover_image_url} 
                                      alt={book.title} 
                                      className="w-24 h-36 object-cover rounded-md flex-shrink-0 shadow-md"
                                    />
                                  ) : (
                                    <div className="w-24 h-36 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  
                                  {/* Book Info */}
                                  <div className="flex-1 space-y-3">
                                    {/* Title and Genre */}
                                    <div>
                                      <h3 className="font-semibold text-lg">{book.title}</h3>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                        {book.genres && (
                                          <Badge variant="outline">{book.genres.split(', ')[0]}</Badge>
                                        )}
                                        {book.publish_date && (
                                          <span>Published {formatShortDate(book.publish_date)}</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Rating Overview */}
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                          <Star className="w-5 h-5 fill-primary text-primary" />
                                          <span className="font-bold text-lg">{book.average_rating.toFixed(1)}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                          ({book.total_reviews} reviews)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Rating Breakdown */}
                                    {totalRatings > 0 && (
                                      <div className="space-y-2">
                                        {[5, 4, 3, 2, 1].map((rating) => {
                                          const count = book.rating_breakdown[rating];
                                          const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                                          
                                          return (
                                            <div key={rating} className="flex items-center gap-2">
                                              <div className="flex items-center gap-1 w-12">
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
                                    )}

                                    {/* Stats Summary */}
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border">
                                      <div className="flex items-center gap-1">
                                        <MessageSquare className="w-4 h-4" />
                                        <span>{book.total_reviews} reviews</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4" />
                                        <span>{book.total_ratings} ratings</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ==================== MY BOOKS TAB (Submission Management) ==================== */}
          <TabsContent value="books" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">My Books</h2>
                <p className="text-muted-foreground">Submit books for admin approval and track their status</p>
              </div>
              <Dialog open={showAddBookDialog} onOpenChange={setShowAddBookDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Submit New Book
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Submit New Book</DialogTitle>
                    <DialogDescription>
                      Submit your book for admin approval. You will be automatically listed as the author.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Book Title *</Label>
                      <Input 
                        id="title" 
                        placeholder="Enter book title" 
                        value={newBook.title}
                        onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="summary">Summary</Label>
                      <Textarea 
                        id="summary" 
                        placeholder="Enter book summary" 
                        rows={4}
                        value={newBook.summary}
                        onChange={(e) => setNewBook({...newBook, summary: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="isbn">ISBN</Label>
                        <Input 
                          id="isbn" 
                          placeholder="978-1234567890"
                          value={newBook.isbn}
                          onChange={(e) => setNewBook({...newBook, isbn: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="publish_date">Publish Date</Label>
                        <Input 
                          id="publish_date" 
                          type="date"
                          value={newBook.publish_date}
                          onChange={(e) => setNewBook({...newBook, publish_date: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cover_image_url">Cover Image URL</Label>
                      <Input 
                        id="cover_image_url" 
                        placeholder="https://example.com/cover.jpg"
                        value={newBook.cover_image_url}
                        onChange={(e) => setNewBook({...newBook, cover_image_url: e.target.value})}
                      />
                      {newBook.cover_image_url && (
                        <div className="mt-2">
                          <img
                            src={newBook.cover_image_url}
                            alt="Cover preview"
                            className="w-32 h-48 object-cover rounded-md border border-border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Genres *</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddGenreField}
                        >
                          + Add Genre
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {newBook.genres.map((genre, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={genre}
                              onChange={(e) => handleGenreChange(index, e.target.value)}
                              placeholder="Genre name (e.g., Fiction, Mystery)"
                              required
                            />
                            {newBook.genres.length > 1 && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveGenreField(index)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setShowAddBookDialog(false);
                      setNewBook({
                        title: '',
                        summary: '',
                        isbn: '',
                        publish_date: '',
                        cover_image_url: '',
                        genres: ['']
                      });
                    }}>Cancel</Button>
                    <Button onClick={handleSubmitBookForApproval} disabled={isSubmittingBook}>
                      {isSubmittingBook ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Book'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {!isLoadingAuthorBooks && authorSubmittedBooks.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {authorSubmittedBooks.filter(b => b.approval_status === 'pending').length}
                    </div>
                    <p className="text-sm text-muted-foreground">Pending Review</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {authorSubmittedBooks.filter(b => b.approval_status === 'approved').length}
                    </div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {authorSubmittedBooks.filter(b => b.approval_status === 'rejected').length}
                    </div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {isLoadingAuthorBooks ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : authorSubmittedBooks.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No books submitted yet</h3>
                <p className="text-muted-foreground mb-4">Submit your first book for admin approval</p>
                <Button onClick={() => setShowAddBookDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Your First Book
                </Button>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {authorSubmittedBooks.map((book) => (
                  <Card key={book.book_id} className="overflow-hidden">
                    <div className="relative h-48">
                      {book.cover_image_url ? (
                        <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(book.approval_status, book.rejection_reason)}
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{book.title}</CardTitle>
                      <CardDescription>{book.authors}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm">
                        <div className="text-muted-foreground">Genres: {book.genres}</div>
                        {book.isbn && (
                          <div className="text-muted-foreground">ISBN: {book.isbn}</div>
                        )}
                        <div className="text-muted-foreground">
                          Submitted: {formatShortDate(book.created_at)}
                        </div>
                        {book.approved_at && (
                          <div className="text-muted-foreground">
                            Approved: {formatShortDate(book.approved_at)}
                          </div>
                        )}
                      </div>
                      
                      {book.rejection_reason && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                          <p className="text-sm text-destructive">
                            <strong>Rejection Reason:</strong> {book.rejection_reason}
                          </p>
                        </div>
                      )}
                      
                      {book.approval_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setEditingBook(book);
                              setNewBook({
                                title: book.title,
                                summary: book.summary || '',
                                isbn: book.isbn || '',
                                publish_date: book.publish_date || '',
                                cover_image_url: book.cover_image_url || '',
                                genres: book.genres.split(', ')
                              });
                              setShowEditBookDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
                                try {
                                  await apiService.deletePendingBook(book.book_id);
                                  toast.success('Book deleted successfully');
                                  loadAuthorSubmittedBooks();
                                } catch (error: any) {
                                  toast.error('Failed to delete book');
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Edit Book Dialog */}
            <Dialog open={showEditBookDialog} onOpenChange={setShowEditBookDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Book</DialogTitle>
                  <DialogDescription>Update your pending book submission</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Book Title *</Label>
                    <Input 
                      id="edit-title" 
                      placeholder="Enter book title" 
                      value={newBook.title}
                      onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-summary">Summary</Label>
                    <Textarea 
                      id="edit-summary" 
                      placeholder="Enter book summary" 
                      rows={4}
                      value={newBook.summary}
                      onChange={(e) => setNewBook({...newBook, summary: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-isbn">ISBN</Label>
                      <Input 
                        id="edit-isbn" 
                        placeholder="978-1234567890"
                        value={newBook.isbn}
                        onChange={(e) => setNewBook({...newBook, isbn: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-publish_date">Publish Date</Label>
                      <Input 
                        id="edit-publish_date" 
                        type="date"
                        value={newBook.publish_date}
                        onChange={(e) => setNewBook({...newBook, publish_date: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-cover_image_url">Cover Image URL</Label>
                    <Input 
                      id="edit-cover_image_url" 
                      placeholder="https://example.com/cover.jpg"
                      value={newBook.cover_image_url}
                      onChange={(e) => setNewBook({...newBook, cover_image_url: e.target.value})}
                    />
                    {newBook.cover_image_url && (
                      <div className="mt-2">
                        <img
                          src={newBook.cover_image_url}
                          alt="Cover preview"
                          className="w-32 h-48 object-cover rounded-md border border-border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Genres *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddGenreField}
                      >
                        + Add Genre
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {newBook.genres.map((genre, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={genre}
                            onChange={(e) => handleGenreChange(index, e.target.value)}
                            placeholder="Genre name"
                          />
                          {newBook.genres.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveGenreField(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowEditBookDialog(false);
                    setEditingBook(null);
                    setNewBook({
                      title: '',
                      summary: '',
                      isbn: '',
                      publish_date: '',
                      cover_image_url: '',
                      genres: ['']
                    });
                  }}>Cancel</Button>
                  <Button onClick={handleUpdateBook} disabled={isSubmittingBook}>
                    {isSubmittingBook ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Book'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

{/* ==================== REVIEWS TAB ==================== */}
          <TabsContent value="reviews" className="space-y-6">
            {currentAuthorId && authorRatingStats ? (
              <AuthorRatingReview
                authorId={currentAuthorId}
                authorName={authorData.name}
                isCurrentUser={true}
                isUserLoggedIn={true}
                ratingStats={authorRatingStats}
                onRatingUpdate={loadBookStats}
              />
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading review data...</p>
              </div>
            )}
          </TabsContent>

          {/* ==================== MY PUBLIC PAGE TAB ==================== */}
          <TabsContent value="public-page" className="space-y-6">
            {!authorProfileData ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading your public profile...</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute top-4 right-4 z-10">
                  <Badge variant="outline" className="border-primary/40 text-primary bg-card/95 backdrop-blur-sm">
                    <Eye className="w-3 h-3 mr-1" />
                    Preview Mode
                  </Badge>
                </div>
                <AuthorPublicProfilePage
                  author={authorProfileData}
                  onBack={() => setActiveTab("overview")}
                  onLogoClick={onLogoClick}
                  onBookSelect={(book) => onViewBookDetails?.(book.id)}
                  theme={theme}
                  onToggleTheme={onToggleTheme}
                  isUserLoggedIn={true}
                  isFollowing={false}
                  currentUser={currentAuthor as any}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}