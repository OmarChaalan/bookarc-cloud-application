import { useState, useEffect } from "react";
import { BookMarked, Bell, User, BookOpen, List, Settings, Crown, Search, LogOut, Heart, TrendingUp, Star, MessageSquare, ThumbsUp, Plus, Edit2, Trash2, BookCheck, Clock, Pause, PenTool, Shield, FileText, ShieldCheck, Users, MapPin, Link, Calendar, Award, Globe, Lock, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { ThemeToggle } from "./ThemeToggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import { apiService } from "../services/apiService";
import { FollowersModal } from "./FollowersModal";
import { ListVisibilityToggle } from "./ListVisibilityToggle";
import { authService } from "../services/authService";
import { formatShortDate } from "../utils/timeUtils";

interface UserDashboardProps {
  onLogout: () => void;
  onLogoClick?: () => void;
  onViewNotifications?: () => void;
  onViewSubscription?: () => void;
  onViewChat?: () => void;
  onEditProfile?: () => void;
  onViewBookDetails?: (bookId: number) => void;
  onBecomeAuthor?: () => void;
  onViewAdminDashboard?: () => void;
  onViewAuthorDashboard?: () => void;
  currentUser: {
    id?: number;
    username: string;
    email: string;
    avatarUrl?: string;
    bio?: string;
    location?: string;
    website?: string;
    joinDate?: string;
    isAdmin?: boolean;
    isPrivate?: boolean;
    verificationStatus?: null | "pending" | "approved" | "rejected";
    role?: 'normal' | 'premium' | 'author' | 'admin';
  };
  userLists: Array<{
    id: number; 
    name: string; 
    count: number; 
    bookIds: number[]; 
    icon: any;
    visibility?: 'public' | 'private';  // â­ ADD THIS
  }>;
  setUserLists: React.Dispatch<React.SetStateAction<Array<{
    id: number; 
    name: string; 
    count: number; 
    bookIds: number[]; 
    icon: any;
    visibility?: 'public' | 'private';  // â­ ADD THIS
  }>>>;
  listIcons: any[];  // â­ THIS LINE MUST BE HERE
  onViewList?: (list: {id: number; name: string; count: number; bookIds: number[]; icon: any}) => void;
  followedAuthors: Array<{
    id: number;
    name: string;
    avatarUrl: string;
    bio: string;
    stats: {
      totalBooks: number;
      followers: number;
    };
  }>;
  onUnfollowAuthor: (authorId: number) => void;
  onViewAuthorProfile?: (authorName: string) => void;
  followedUsers: Array<{
    id: number;
    username: string;
    avatarUrl: string;
    bio?: string;
    status: "following" | "requested";
    stats: {
      totalReviews: number;
      booksRead: number;
    };
  }>;
  onUnfollowUser: (userId: number) => void;
  onViewUserProfile?: (userId: number) => void;
  followRequests: Array<{
    id: number;
    fromUserId: number;
    fromUsername: string;
    fromAvatarUrl: string;
    toUserId: number;
    status: "pending" | "accepted" | "rejected";
    date: string;
  }>;
  onAcceptFollowRequest: (requestId: number) => void;
  onRejectFollowRequest: (requestId: number) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;

  onUserSelect?: (userId: number) => void;
  onAuthorSelect?: (author: { id: number; authorType: 'registered' | 'external' }) => void;
}

export function UserDashboard({ 
  onLogout, 
  onLogoClick, 
  onViewNotifications, 
  onViewSubscription, 
  onViewChat, 
  onEditProfile,  
  onViewBookDetails, 
  onBecomeAuthor, 
  onViewAdminDashboard, 
  onViewAuthorDashboard, 
  currentUser, 
  userLists, 
  setUserLists, 
  listIcons, 
  onViewList, 
  followedAuthors, 
  onUnfollowAuthor, 
  onViewAuthorProfile, 
  followedUsers, 
  onUnfollowUser, 
  onViewUserProfile, 
  followRequests, 
  onAcceptFollowRequest, 
  onRejectFollowRequest, 
  theme, 
  onToggleTheme,
  onUserSelect,
  onAuthorSelect
}: UserDashboardProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [editListName, setEditListName] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(false);
  const [recommendations, setRecommendations] = useState<Array<{
  book_id: number;
  title: string;
  authors: string;
  cover_image_url?: string;
  average_rating: number;
  genres: string;
  reason: string;
}>>([]);
const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);


  // Ã¢Â­Â NEW: Following users state
  const [allFollowingUsers, setAllFollowingUsers] = useState<Array<{
    id: number;
    username: string;
    avatarUrl: string;
    bio?: string;
    isPrivate: boolean;
    followedAt: string;
    stats: {
      totalReviews: number;
      booksRead: number;
    };
  }>>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [showAllFollowingDialog, setShowAllFollowingDialog] = useState(false);

const [userStats, setUserStats] = useState<{
  total_book_reviews: number;      // ✅ CHANGED
  total_author_reviews: number;    // ✅ NEW
  total_ratings: number;
  books_read: number;
  followers: number;
  following: number;
} | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);


useEffect(() => {
  const loadUserStats = async () => {
    try {
      setIsLoadingStats(true);
      const stats = await apiService.getUserStats();
      setUserStats(stats);
    } catch (error: any) {
      console.error("Failed to load user stats:", error);
      setUserStats({
        total_book_reviews: 42,      // ✅ CHANGED from total_reviews
        total_author_reviews: 15,    // ✅ NEW
        total_ratings: 156,
        books_read: 134,
        followers: 567,
        following: followedUsers.length + followedAuthors.length,
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  if (!currentUser.isAdmin) {
    loadUserStats();
  }
}, [currentUser.isAdmin, followedUsers.length, followedAuthors.length]);

useEffect(() => {
  const loadAllUserData = async () => {
    if (currentUser.isAdmin || !currentUser?.id) return;
    
    try {
      setIsLoadingStats(true);
      setIsLoadingAuthorRatings(true);
      setIsLoadingBookRatings(true);
      setIsLoadingAuthorReviews(true);
      setIsLoadingBookReviews(true);
      
      // ONE API call gets everything!
      const stats = await apiService.getUserStats();
      
      // ✅ ADD THIS DEBUG SECTION RIGHT AFTER THE API CALL
      console.log('🔍 ===== DEBUGGING AUTHOR RATINGS DATA =====');
      console.log('📊 Full stats response:', stats);
      console.log('📝 Author ratings count:', stats.author_ratings?.length || 0);
      
      if (stats.author_ratings && stats.author_ratings.length > 0) {
        console.log('🎯 Author Ratings Details:');
        stats.author_ratings.forEach((rating, index) => {
          console.log(`\n  Author ${index + 1}:`, {
            author_id: rating.author_id,
            author_name: rating.author_name,
            user_id: rating.user_id,
            has_user_id: rating.user_id != null && rating.user_id !== undefined,
            user_id_type: typeof rating.user_id,
            user_id_value: rating.user_id,
            is_registered: rating.user_id != null && rating.user_id > 0,
            type: (rating.user_id != null && rating.user_id > 0) ? '✅ REGISTERED' : '🌐 EXTERNAL'
          });
        });
        
        // Find the problematic author (ID 35)
        const author35 = stats.author_ratings.find(r => r.author_id === 35);
        if (author35) {
          console.log('\n🔍 FOUND AUTHOR 35:');
          console.log('  Full object:', author35);
          console.log('  author_id:', author35.author_id);
          console.log('  user_id:', author35.user_id);
          console.log('  user_id is null?', author35.user_id === null);
          console.log('  user_id is undefined?', author35.user_id === undefined);
          console.log('  Should use user_id?', author35.user_id != null && author35.user_id > 0);
        } else {
          console.log('\n⚠️ Author 35 not found in ratings');
        }
      } else {
        console.log('⚠️ No author ratings found');
      }
      console.log('✅ ===== END DEBUG =====\n');
      
      // Set all the states (existing code)
      setUserStats({
        total_book_reviews: stats.total_book_reviews,
        total_author_reviews: stats.total_author_reviews,
        total_ratings: stats.total_ratings,
        books_read: stats.books_read,
        followers: stats.followers,
        following: stats.following,
      });
      
      setAuthorRatings(stats.author_ratings);
      setBookRatings(stats.book_ratings);
      setAuthorReviews(stats.author_reviews);
      setBookReviews(stats.book_reviews);
      
    } catch (error: any) {
      console.error("Failed to load user data:", error);
    } finally {
      setIsLoadingStats(false);
      setIsLoadingAuthorRatings(false);
      setIsLoadingBookRatings(false);
      setIsLoadingAuthorReviews(false);
      setIsLoadingBookReviews(false);
    }
  };

  loadAllUserData();
}, [currentUser.isAdmin, currentUser?.id]);

 const [authorRatings, setAuthorRatings] = useState<Array<{
  author_id: number;
  author_name: string;
  author_avatar: string;
  rating_value: number;
  rated_at: string;
  user_id: number;
}>>([]);
  const [isLoadingAuthorRatings, setIsLoadingAuthorRatings] = useState(false);

  const [bookRatings, setBookRatings] = useState<Array<{
    book_id: number;
    book_title: string;
    book_cover: string;
    book_author: string;
    rating_value: number;
    rated_at: string;
  }>>([]);
  const [isLoadingBookRatings, setIsLoadingBookRatings] = useState(false);

  const [authorReviews, setAuthorReviews] = useState<Array<{
    author_review_id: number;
    author_id: number;
    author_name: string;
    author_avatar: string;
    review_text: string;
    created_at: string;
    updated_at: string;
  }>>([]);
  const [isLoadingAuthorReviews, setIsLoadingAuthorReviews] = useState(false);

  const [bookReviews, setBookReviews] = useState<Array<{
    review_id: number;
    book_id: number;
    book_title: string;
    book_cover: string;
    book_author: string;
    review_text: string;
    rating_value: number;
    created_at: string;
    updated_at: string;
  }>>([]);
  const [isLoadingBookReviews, setIsLoadingBookReviews] = useState(false);
  
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");

// Load book ratings




  // Load favorite genres
useEffect(() => {
  const loadFavoriteGenres = async () => {
    if (currentUser.isAdmin) {
      console.log("â­ï¸ Skipping genre load - user is admin");
      return;
    }
    
    // Add a guard to prevent multiple simultaneous loads
    if (isLoadingGenres) {
      console.log("â­ï¸ Already loading genres, skipping...");
      return;
    }
    
    try {
      setIsLoadingGenres(true);
      console.log("ðŸ”„ Loading favorite genres...");
      
      const response = await apiService.getUserFavoriteGenres();
      console.log("âœ… Favorite genres response:", response);
      console.log("ðŸ“Š Total favorite genres:", response.total);
      console.log("ðŸ“‹ Genre names:", response.genres.map(g => g.genre_name));
      
      const genreNames = response.genres.map(g => g.genre_name);
      setFavoriteGenres(genreNames);
      console.log("âœ… State updated with genres:", genreNames);
    } catch (error: any) {
      console.error("âŒ Failed to load favorite genres:", error);
      setFavoriteGenres([]);
    } finally {
      setIsLoadingGenres(false);
      console.log("âœ… Genre loading complete");
    }
  };

  if (!currentUser.isAdmin) {
    loadFavoriteGenres();
  }
}, []);

useEffect(() => {
  const loadUserLists = async () => {
    if (currentUser.isAdmin || !currentUser?.id) return;
    
    try {
      const response = await apiService.getUserLists();
      
      // Map default lists with correct icons
      const listIconMap: { [key: string]: any } = {
        'Reading': BookOpen,
        'Completed': BookCheck,
        'Plan to Read': Clock,
        'On-Hold': Pause,
        'Dropped': List,
      };

      const defaultLists = response.defaultLists.map(list => ({
        id: list.id,
        name: list.name,
        count: list.count,
        bookIds: [],
        icon: listIconMap[list.name] || BookOpen,
        visibility: (list.visibility as 'public' | 'private') || 'private',
      }));

      const customLists = response.customLists.map((list, index) => ({
        id: list.id,
        name: list.name,
        count: list.count,
        bookIds: [],
        icon: listIcons[index % listIcons.length],
        visibility: (list.visibility as 'public' | 'private') || 'private',
      }));

      setUserLists([...defaultLists, ...customLists]);
    } catch (error: any) {
      console.error("Failed to load user lists:", error);
      toast.error("Failed to load your lists");
    }
  };

  loadUserLists();
  
  // âœ… CRITICAL: Empty dependency array - only run once on mount
}, []); // âŒ REMOVED: currentUser.isAdmin, currentUser?.id, listIcons, setUserList

  // Ã¢Â­Â NEW: Handle unfollow from modal
  const handleUnfollowFromModal = async (userId: number) => {
    try {
      await apiService.unfollowUser(userId);
      
      // Remove from local state
      setAllFollowingUsers(prev => prev.filter(u => u.id !== userId));
      
      // Update stats
      if (userStats) {
        setUserStats({
          ...userStats,
          following: userStats.following - 1
        });
      }
      
      toast.success("Unfollowed successfully");
    } catch (error: any) {
      console.error("Failed to unfollow user:", error);
      toast.error("Failed to unfollow user");
    }
  };

  useState<"followers" | "following">("followers");

  const defaultLists = userLists.filter(list => list.id < 0);
  const customLists = userLists.filter(list => list.id > 0);

const displayName = currentUser.username || "User";
const userInitials = displayName
  .split(" ")
  .map((n) => n[0])
  .join("")
  .toUpperCase()
  .slice(0, 2);

  const handleNotificationClick = async () => {
  if (onViewNotifications) {
    onViewNotifications();
  }
};


const handleCreateList = async () => {
  if (currentUser.isAdmin) {
    toast.error("Admins cannot create reading lists");
    return;
  }
  
  if (!newListName.trim()) {
    toast.error("Please enter a list name");
    return;
  }
  
  try {
    console.log("ðŸš€ Creating list with name:", newListName);
    
    // Call the API to create the list
    const response = await apiService.createList({
      name: newListName.trim(),
      visibility: 'private' // or let user choose
    });
    
    console.log("âœ… List created successfully:", response);
    
    // Add to local state with the real ID from the database
    const newList = {
      id: response.list.id, // Use the ID from the database
      name: response.list.name,
      count: 0,
      bookIds: [],
      icon: listIcons[Math.floor(Math.random() * listIcons.length)]
    };
    
    setUserLists([...userLists, newList]);
    setNewListName("");
    setIsCreateListOpen(false);
    
    toast.success(`List "${newList.name}" created successfully!`);
  } catch (error: any) {
    console.error("âŒ Failed to create list:", error);
    toast.error(error.message || "Failed to create list");
  }
};

  const handleEditList = async (listId: number) => {
    if (!editListName.trim()) return;
    
    try {
      // Call API to update list
      await apiService.updateList(listId, {
        name: editListName
      });

      // Update local state
      setUserLists(userLists.map(list => 
        list.id === listId ? { ...list, name: editListName } : list
      ));
      
      setEditingListId(null);
      setEditListName("");
      
      toast.success("List renamed successfully!");
    } catch (error: any) {
      console.error("Failed to update list:", error);
      toast.error(error.message || "Failed to update list");
    }
  };

  const handleDeleteList = async (listId: number) => {
    try {
      // Call API to delete list
      await apiService.deleteList(listId);

      // Remove from local state
      setUserLists(userLists.filter(list => list.id !== listId));
      
      toast.success("List deleted successfully!");
    } catch (error: any) {
      console.error("Failed to delete list:", error);
      toast.error(error.message || "Failed to delete list");
    }
  };

  const handleToggleListVisibility = async (listId: number, visibility: 'public' | 'private') => {
  try {
    await apiService.toggleListVisibility(listId, visibility);
    
    setUserLists(userLists.map(list => 
      list.id === listId ? { ...list, visibility } : list
    ));
    
    toast.success(`List is now ${visibility}!`);
  } catch (error: any) {
    console.error("Failed to toggle list visibility:", error);
    toast.error(error.message || "Failed to update list visibility");
  }
};

useEffect(() => {
  const loadRecommendations = async () => {
    if (currentUser.isAdmin || !currentUser?.id) return;
    
    try {
      setIsLoadingRecommendations(true);
      const response = await apiService.getRecommendations({ num_results: 10 });
      setRecommendations(response.recommendations);
    } catch (error: any) {
      console.error("Failed to load recommendations:", error);
      // Don't show error toast, just fail silently
      setRecommendations([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  loadRecommendations();
}, [currentUser.isAdmin, currentUser?.id]);

  // Show first 5 users
  const displayedFollowingUsers = allFollowingUsers.slice(0, 5);
  const hasMoreFollowing = allFollowingUsers.length > 5;

  const openFollowersModal = (tab: "followers" | "following") => {
  setFollowersModalTab(tab);
  setIsFollowersModalOpen(true);
};

const handleFollowerUserClick = (userId: number, userRole?: string) => {
  console.log(`ðŸ”„ Navigation triggered from UserDashboard FollowersModal:`, {
    userId,
    userRole,
    hasUserSelect: !!onUserSelect,
    hasAuthorSelect: !!onAuthorSelect
  });

  // Close the modal
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

useEffect(() => {
  const loadNotificationCount = async () => {
    if (currentUser.isAdmin) return; // Admins don't have notifications in this system
    
    try {
      setIsLoadingNotifications(true);
      const response = await apiService.getNotifications({ limit: 1 }); // Just get count
      setUnreadCount(response.unread_count);
    } catch (error: any) {
      console.error("Failed to load notification count:", error);
      setUnreadCount(0);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  loadNotificationCount();
  const interval = setInterval(loadNotificationCount, 30000);
  
  return () => clearInterval(interval);
}, [currentUser.isAdmin]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
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
            {!currentUser.isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNotificationClick}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            )}

            <ThemeToggle theme={theme} onToggle={onToggleTheme} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.username} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-3 p-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.username} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{currentUser.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
                <Separator className="my-2" />
                <DropdownMenuItem onClick={onEditProfile}>
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </DropdownMenuItem>
                {currentUser.isAdmin && (
                  <>
                    <Separator className="my-2" />
                    <DropdownMenuItem onClick={onViewAdminDashboard}>
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )}
{(currentUser.verificationStatus === "approved" || currentUser.role === "author") && !currentUser.isAdmin && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={onViewAuthorDashboard}>
      <PenTool className="mr-2 h-4 w-4" />
      <span>Author Dashboard</span>
    </DropdownMenuItem>
  </>
)}
                <Separator className="my-2" />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 border-r border-border bg-card min-h-[calc(100vh-4rem)] sticky top-16">
          <div className="flex flex-col w-full">
            <ScrollArea className="flex-1 py-6 px-4">
              <div className="space-y-1">
                <div className="w-full flex items-center px-3 py-2 rounded-lg bg-secondary text-secondary-foreground cursor-default">
                  <User className="w-4 h-4 mr-3" />
                  My Profile
                </div>
                
                {!currentUser.isAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={onViewNotifications}
                    >
                      <Bell className="w-4 h-4 mr-3" />
                      Notifications
                      {unreadCount > 0 && (
                        <Badge className="ml-auto bg-destructive">{unreadCount}</Badge>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={onViewSubscription}
                    >
                      <Crown className="w-4 h-4 mr-3" />
                      Subscription
                    </Button>
                  </>
                )}
              </div>

              <Separator className="my-6" />

              <div className="space-y-1">
                
                {currentUser.isAdmin && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={onViewAdminDashboard}
                  >
                    <Shield className="w-4 h-4 mr-3" />
                    Admin Dashboard
                  </Button>
                )}
                
{(currentUser.verificationStatus === "approved" || currentUser.role === "author") && !currentUser.isAdmin && (
  <Button
    variant="ghost"
    className="w-full justify-start"
    onClick={onViewAuthorDashboard}
  >
    <PenTool className="w-4 h-4 mr-3" />
    Author Dashboard
  </Button>
)}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-accent/10 hover:text-destructive"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Profile Header Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <Avatar className="w-32 h-32 border-4 border-primary/20">
                      <AvatarImage src={currentUser.avatarUrl} alt={currentUser.username} />
                      <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h1 className="text-3xl font-bold">{currentUser.username}</h1>
                          {currentUser.isPrivate ? (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="w-3 h-3" />
                              Private
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Globe className="w-3 h-3" />
                              Public
                            </Badge>
                          )}
                        </div>
                        {currentUser.bio && (
                          <p className="text-muted-foreground mb-3">{currentUser.bio}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {currentUser.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {currentUser.location}
                            </span>
                          )}
                          {currentUser.joinDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Joined {currentUser.joinDate}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button variant="outline" onClick={onEditProfile}>
                        Edit Profile
                      </Button>
                    </div>

{!currentUser.isAdmin && (
  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
    {isLoadingStats ? (
      <div className="col-span-6 text-center py-4 text-muted-foreground text-sm">
        Loading stats...
      </div>
    ) : (
      <>
        <div className="text-center p-3 rounded-lg bg-accent/10">
          <div className="text-2xl font-semibold mb-1">{userStats?.books_read || 0}</div>
          <div className="text-xs text-muted-foreground">Books Read</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-accent/10">
<div className="text-2xl font-semibold mb-1">{userStats?.total_book_reviews || 0}</div>
<div className="text-xs text-muted-foreground">Book Reviews</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-accent/10">
<div className="text-2xl font-semibold mb-1">{userStats?.total_author_reviews || 0}</div>
<div className="text-xs text-muted-foreground">Author Reviews</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-accent/10">
          <div className="text-2xl font-semibold mb-1">{userStats?.total_ratings || 0}</div>
          <div className="text-xs text-muted-foreground">Total Ratings</div>
        </div>
        <button
          onClick={() => openFollowersModal("followers")}
          className="text-center p-3 rounded-lg bg-accent/10 hover:bg-accent/20 transition"
        >
          <div className="text-2xl font-semibold mb-1">
            {userStats?.followers || 0}
          </div>
          <div className="text-xs text-muted-foreground">Followers</div>
        </button>
        <button
          onClick={() => openFollowersModal("following")}
          className="text-center p-3 rounded-lg bg-accent/10 hover:bg-accent/20 transition"
        >
          <div className="text-2xl font-semibold mb-1">
            {userStats?.following || 0}
          </div>
          <div className="text-xs text-muted-foreground">Following</div>
        </button>
      </>
    )}
  </div>
)}
                  </div>
                </div>
              </CardContent>
            </Card>

{/* Favorite Genres */}
            {!currentUser.isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Favorite Genres
                  </CardTitle>
                  <CardDescription>
                    Your preferred book genres
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingGenres ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-pulse flex space-x-2">
                        <div className="h-6 w-20 bg-muted rounded"></div>
                        <div className="h-6 w-24 bg-muted rounded"></div>
                        <div className="h-6 w-16 bg-muted rounded"></div>
                      </div>
                    </div>
                  ) : favoriteGenres.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {favoriteGenres.map((genre, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="mb-2">No favorite genres yet</p>
                      <p className="text-sm mb-4">
                        Visit the Genres page to add your favorites
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (onLogoClick) {
                            onLogoClick();
                          }
                        }}
                      >
                        Browse Genres
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recommended For You */}
            {!currentUser.isAdmin && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Recommended For You
                    </CardTitle>
                    <CardDescription>
                      Personalized book recommendations based on your preferences
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingRecommendations ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="aspect-[2/3] bg-muted rounded-lg mb-2"></div>
                          <div className="h-4 bg-muted rounded mb-1"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <h4 className="text-lg font-medium mb-2">No Recommendations Yet</h4>
                      <p className="text-sm mb-6 max-w-md mx-auto">
                        {favoriteGenres.length === 0 
                          ? "Add your favorite genres to get personalized recommendations!"
                          : "Start rating and reviewing books to improve your recommendations."}
                      </p>
                      {favoriteGenres.length === 0 && (
                        <Button 
                          variant="outline"
                          onClick={() => {
                            if (onLogoClick) {
                              onLogoClick();
                            }
                          }}
                        >
                          Browse Genres
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {recommendations.map((book) => (
                          <div
                            key={book.book_id}
                            className="group cursor-pointer"
                            onClick={() => {
                              apiService.recordInteraction({
                                book_id: book.book_id,
                                event_type: 'view'
                              }).catch(err => console.error('Failed to record interaction:', err));
                              
                              if (onViewBookDetails) {
                                onViewBookDetails(book.book_id);
                              }
                            }}
                          >
                            <div className="relative aspect-[2/3] mb-3 rounded-lg overflow-hidden border border-border group-hover:border-primary transition-all duration-300 group-hover:shadow-lg">
                              {book.cover_image_url ? (
                                <img
                                  src={book.cover_image_url}
                                  alt={book.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <BookOpen className="w-12 h-12 text-muted-foreground opacity-20" />
                                </div>
                              )}
                              
                              {book.average_rating > 0 && (
                                <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-current" />
                                  {book.average_rating.toFixed(1)}
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              <h4 className="font-medium line-clamp-2 text-sm group-hover:text-primary transition-colors">
                                {book.title}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {book.authors}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-primary">
                                <TrendingUp className="w-3 h-3" />
                                <span className="line-clamp-1">{book.reason}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {recommendations.length >= 10 && (
                        <div className="text-center">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              if (onLogoClick) {
                                onLogoClick();
                              }
                            }}
                          >
                            Discover More Books
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* My Lists */}
            {!currentUser.isAdmin && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <List className="w-5 h-5" />
                      My Lists
                    </CardTitle>
                    <CardDescription>Organize your reading journey with custom collections</CardDescription>
                  </div>
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={() => setIsCreateListOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create List
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Default Lists */}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Default Lists</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {defaultLists.map((list) => {
                          const ListIcon = list.icon;
                          return (
                            <div key={list.id} className="relative group">
                              <button
                                onClick={() => onViewList && onViewList(list)}
                                className="w-full p-4 rounded-xl border-2 border-border hover:border-primary hover:shadow-md transition-all duration-200 text-left bg-gradient-to-br from-card to-card/50"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    <ListIcon className="w-5 h-5 text-primary" />
                                  </div>
                                  <Badge variant={list.visibility === 'public' ? 'default' : 'secondary'} className="text-xs">
                                    {list.visibility === 'public' ? (
                                      <><Globe className="w-3 h-3 mr-1" />Public</>
                                    ) : (
                                      <><Lock className="w-3 h-3 mr-1" />Private</>
                                    )}
                                  </Badge>
                                </div>
                                <h4 className="font-semibold mb-1 text-sm">{list.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {list.count} {list.count === 1 ? "book" : "books"}
                                </p>
                              </button>
                              
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <ListVisibilityToggle
                                  listId={list.id}
                                  isPublic={list.visibility === 'public'}
                                  onToggle={handleToggleListVisibility}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Lists */}
                    {customLists.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Custom Lists</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {customLists.map((list) => {
                            const ListIcon = list.icon;
                            return (
                              <div key={list.id} className="relative group">
                                <button
                                  onClick={() => onViewList && onViewList(list)}
                                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary hover:shadow-md transition-all duration-200 text-left bg-gradient-to-br from-card to-card/50"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                      <ListIcon className="w-5 h-5 text-primary" />
                                    </div>
                                    <Badge variant={list.visibility === 'public' ? 'default' : 'secondary'} className="text-xs">
                                      {list.visibility === 'public' ? (
                                        <><Globe className="w-3 h-3 mr-1" />Public</>
                                      ) : (
                                        <><Lock className="w-3 h-3 mr-1" />Private</>
                                      )}
                                    </Badge>
                                  </div>
                                  <h4 className="font-semibold mb-1 text-sm">{list.name}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {list.count} {list.count === 1 ? "book" : "books"}
                                  </p>
                                </button>
                                
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                  <ListVisibilityToggle
                                    listId={list.id}
                                    isPublic={list.visibility === 'public'}
                                    onToggle={handleToggleListVisibility}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 bg-background/90 backdrop-blur-sm hover:bg-background shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingListId(list.id);
                                      setEditListName(list.name);
                                    }}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 bg-background/90 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteList(list.id);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {customLists.length === 0 && (
                      <div className="text-center py-12 px-4">
                        <div className="max-w-md mx-auto">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                            <List className="w-8 h-8 text-primary" />
                          </div>
                          <h4 className="text-lg font-semibold mb-2">Create Your First Custom List</h4>
                          <p className="text-sm text-muted-foreground mb-6">
                            Organize your books into personalized collections like "Summer Reading", "Gift Ideas", or "Books to Re-read"
                          </p>
                          <Button 
                            onClick={() => setIsCreateListOpen(true)}
                            className="gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Create Custom List
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Authors You Rated */}
            {!currentUser.isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Authors You Rated
                  </CardTitle>
                  <CardDescription>
                    Show your appreciation for the authors you love
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAuthorRatings ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="aspect-square bg-muted rounded-full mb-2"></div>
                          <div className="h-4 bg-muted rounded mb-1"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : authorRatings.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Star className="w-10 h-10 text-yellow-500" />
                      </div>
                      <h4 className="text-lg font-semibold mb-2">No Author Ratings Yet</h4>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        Rate your favorite authors to show your support and help others discover talented writers
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          if (onLogoClick) {
                            onLogoClick();
                          }
                        }}
                      >
                        Discover Authors
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {authorRatings.slice(0, 8).map((rating) => (
  <div
    key={rating.author_id}
    className="group cursor-pointer text-center"
    onClick={() => {
      // ✅ ADD DETAILED DEBUG LOGGING HERE
      console.log('\n🖱️ ===== AUTHOR CLICK DEBUG =====');
      console.log('Clicked author:', rating.author_name);
      console.log('Rating object:', rating);
      console.log('author_id:', rating.author_id);
      console.log('user_id:', rating.user_id);
      console.log('user_id type:', typeof rating.user_id);
      console.log('user_id == null?', rating.user_id == null);
      console.log('user_id === null?', rating.user_id === null);
      console.log('user_id === undefined?', rating.user_id === undefined);
      console.log('user_id > 0?', rating.user_id > 0);
      
      const isRegistered = rating.user_id != null && rating.user_id > 0;
      console.log('isRegistered?', isRegistered);
      
      if (onAuthorSelect) {
        if (isRegistered) {
          console.log('✅ Calling onAuthorSelect with:', {
            id: rating.user_id,
            authorType: 'registered'
          });
          onAuthorSelect({
            id: rating.user_id,
            authorType: 'registered'
          });
        } else {
          console.log('🌐 Calling onAuthorSelect with:', {
            id: rating.author_id,
            authorType: 'external'
          });
          onAuthorSelect({
            id: rating.author_id,
            authorType: 'external'
          });
        }
      } else {
        console.log('⚠️ onAuthorSelect is not defined!');
      }
      console.log('===== END CLICK DEBUG =====\n');
    }}
  >
                          <div className="relative inline-block mb-3">
                            <Avatar className="w-24 h-24 border-4 border-border group-hover:border-primary transition-all duration-200 shadow-lg">
                              <AvatarImage src={rating.author_avatar} />
                              <AvatarFallback className="text-lg">{rating.author_name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              {rating.rating_value}
                            </div>
                          </div>
                          <h4 className="font-semibold text-sm group-hover:text-primary transition line-clamp-1 mb-1">
                            {rating.author_name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(rating.rated_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {authorRatings.length > 8 && (
                    <div className="text-center mt-6">
                      <Button variant="outline" size="sm">
                        View All {authorRatings.length} Rated Authors
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Books You Rated */}
            {!currentUser.isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Books You Rated
                  </CardTitle>
                  <CardDescription>
                    Your rated books collection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingBookRatings ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="aspect-[2/3] bg-muted rounded-lg mb-2"></div>
                          <div className="h-4 bg-muted rounded mb-1"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : bookRatings.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Star className="w-10 h-10 text-yellow-500" />
                      </div>
                      <h4 className="text-lg font-semibold mb-2">No Book Ratings Yet</h4>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        Start rating books to help others discover great reads and track your reading journey
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          if (onLogoClick) {
                            onLogoClick();
                          }
                        }}
                      >
                        Browse Books
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {bookRatings.slice(0, 10).map((rating) => (
                        <div
                          key={rating.book_id}
                          className="group cursor-pointer"
                          onClick={() => {
                            if (onViewBookDetails) {
                              onViewBookDetails(rating.book_id);
                            }
                          }}
                        >
                          <div className="relative aspect-[2/3] mb-3 rounded-xl overflow-hidden border-2 border-border group-hover:border-primary transition-all duration-300 group-hover:shadow-xl">
                            {rating.book_cover ? (
                              <img
                                src={rating.book_cover}
                                alt={rating.book_title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <BookOpen className="w-12 h-12 text-muted-foreground opacity-20" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              {rating.rating_value}
                            </div>
                          </div>
                          <h4 className="font-semibold text-sm group-hover:text-primary transition line-clamp-2 mb-1">
                            {rating.book_title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {rating.book_author}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Rated {new Date(rating.rated_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {bookRatings.length > 10 && (
                    <div className="text-center mt-6">
                      <Button variant="outline" size="sm">
                        View All {bookRatings.length} Rated Books
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* My Author Reviews */}
            {!currentUser.isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    My Author Reviews
                  </CardTitle>
                  <CardDescription>
                    Your thoughts and opinions about authors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAuthorReviews ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : authorReviews.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="w-10 h-10 text-primary" />
                      </div>
                      <h4 className="text-lg font-semibold mb-2">No Author Reviews Yet</h4>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        Share your insights about authors and help readers learn more about their favorite writers
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          if (onLogoClick) {
                            onLogoClick();
                          }
                        }}
                      >
                        Discover Authors
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {authorReviews.slice(0, 5).map((review) => (
                        <div
                          key={review.author_review_id}
                          className="group p-5 rounded-xl border-2 border-border hover:border-primary transition-all duration-200 cursor-pointer bg-gradient-to-br from-card to-card/50 hover:shadow-md"
                          onClick={() => {
                            if (onAuthorSelect) {
                              onAuthorSelect({
                                id: review.author_id,
                                authorType: 'registered'
                              });
                            }
                          }}
                        >
                          <div className="flex items-start gap-4 mb-3">
                            <Avatar className="w-12 h-12 border-2 border-border">
                              <AvatarImage src={review.author_avatar} />
                              <AvatarFallback>{review.author_name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-semibold text-base group-hover:text-primary transition">{review.author_name}</h4>
                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {new Date(review.created_at).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed line-clamp-3">{review.review_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {authorReviews.length > 5 && (
                    <div className="text-center mt-6">
                      <Button variant="outline" size="sm">
                        View All {authorReviews.length} Author Reviews
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* My Book Reviews */}
            {!currentUser.isAdmin && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      My Book Reviews
                    </CardTitle>
                    <CardDescription>Your book reviews and ratings</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onViewChat}
                  >
                    View All
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingBookReviews ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : bookReviews.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="w-10 h-10 text-primary" />
                      </div>
                      <h4 className="text-lg font-semibold mb-2">No Book Reviews Yet</h4>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        Start reviewing books to share your thoughts with the community and help others discover great reads
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          if (onLogoClick) {
                            onLogoClick();
                          }
                        }}
                      >
                        Browse Books
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookReviews.slice(0, 5).map((review) => (
                        <div
                          key={review.review_id}
                          className="group p-5 rounded-xl border-2 border-border hover:border-primary transition-all duration-200 cursor-pointer bg-gradient-to-br from-card to-card/50 hover:shadow-md"
                          onClick={() => {
                            if (onViewBookDetails) {
                              onViewBookDetails(review.book_id);
                            }
                          }}
                        >
                          <div className="flex items-start gap-4 mb-3">
                            <div className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                              {review.book_cover ? (
                                <img 
                                  src={review.book_cover} 
                                  alt={review.book_title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <BookOpen className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                              </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base group-hover:text-primary transition truncate">{review.book_title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{review.book_author}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating_value
                                      ? "fill-yellow-500 text-yellow-500"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(review.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed line-clamp-3 pl-20">{review.review_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  </div>

  {/* Create List Dialog */}
  <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New List</DialogTitle>
        <DialogDescription>
          Create a custom list to organize your books
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Input
          placeholder="List name (e.g., Summer Reading, Favorites)"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleCreateList();
            }
          }}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setIsCreateListOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleCreateList} disabled={!newListName.trim()}>
          Create List
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  {/* Edit List Dialog */}
  <Dialog open={editingListId !== null} onOpenChange={(open) => {
    if (!open) {
      setEditingListId(null);
      setEditListName("");
    }
  }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit List Name</DialogTitle>
        <DialogDescription>
          Rename your custom reading list
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Input
          placeholder="List name"
          value={editListName}
          onChange={(e) => setEditListName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && editingListId) {
              handleEditList(editingListId);
            }
          }}
        />
      </div>
      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={() => {
            setEditingListId(null);
            setEditListName("");
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={() => editingListId && handleEditList(editingListId)} 
          disabled={!editListName.trim()}
        >
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <FollowersModal
    isOpen={isFollowersModalOpen}
    onClose={() => setIsFollowersModalOpen(false)}
    userId={currentUser.id!}
    username={currentUser.username}
    defaultTab={followersModalTab}
    onUserClick={handleFollowerUserClick}
  />
</div>)}