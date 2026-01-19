import { useState, useEffect } from "react";
import {
  BookOpen,
  Star,
  Users,
  TrendingUp,
  BookCheck,
  Heart,
  Clock,
  Pause,
  List,
  Menu,
  Bell,
  User,
  Crown,
  X,
  Search,
  PenTool,
  BookMarked,
} from "lucide-react";
import { Logo } from "./components/Logo";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./components/ui/avatar";
import { ThemeToggle } from "./components/ThemeToggle";
import { BookCard } from "./components/BookCard";
import { AdminDashboard } from "./components/AdminDashboard";
import { LoginPage } from "./components/LoginPage";
import { AuthorLoginPage } from "./components/AuthorLoginPage";
import { AuthorVerificationPage } from "./components/AuthorVerificationPage";
import { AuthorRegistrationPage } from "./components/AuthorRegistrationPage";
import { AdminLoginPage } from "./components/AdminLoginPage";
import UnifiedNotifications from './components/UnifiedNotifications';
import { AuthorEditProfilePage } from "./components/AuthorEditProfilePage";
import { Toaster } from "./components/ui/sonner";
import { UserDashboard } from "./components/UserDashboard";
import { AuthorDashboard } from "./components/AuthorDashboard";
import { BrowseBooksPage } from "./components/BrowseBooksPage";
import { BookDetailsPage } from "./components/BookDetailsPage";
import { SubscriptionPage } from "./components/SubscriptionPage";
import { ChatPage } from "./components/ChatPage";
import { AboutPage } from "./components/AboutPage";
import { ContactPage } from "./components/ContactPage";
import { EditProfilePage } from "./components/EditProfilePage";
import { AuthorPublicProfilePage } from "./components/AuthorPublicProfilePage";
import { UserPublicProfilePage } from "./components/UserPublicProfilePage";
import { ListViewPage } from "./components/ListViewPage";
import { BecomeAuthorDialog } from "./components/BecomeAuthorDialog";
import { toast } from "sonner";
import { apiService } from "./services/apiService";
import { authService } from "./services/authService";
import type { UserProfile } from "./components/UserPublicProfilePage";
import { Card } from "./components/ui/card";
import { GenresPage } from "./components/GenresPage";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './index.css'
import { AuthorProfileLoader } from './components/AuthorProfileLoader';

interface Book {
  id: number;
  title: string;
  author: string;
  cover: string;
  rating: number;
  totalRatings: number;
  genre: string;
  description: string;
  publishYear: number;
}

interface Author {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
  website?: string;
  location?: string;
  joinDate: string;
  verified: boolean;
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
  };
  books: Book[];
}

const heroImage =
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2128&auto=format&fit=crop";

export default function App() {
  // Enhanced theme with deeper dark mode and richer light mode colors
  const [currentPage, setCurrentPage] = useState<
  | "home"
  | "genres"
  | "login"
  | "register"
  | "author"
  | "author-verification"
  | "author-registration"
  | "admin"
  | "dashboard"
  | "author-dashboard"
  | "admin-dashboard"
  | "browse"
  | "book-details"
  | "notifications"
  | "about"
  | "contact"
  | "subscription"
  | "chat"
  | "edit-profile"
  | "author-profile"
  | "list-view"
  | "user-profile"
  | "author-notifications"
  | "author-edit-profile"
>("home");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [selectedBookId, setSelectedBookId] =
    useState<number | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] =
    useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] =
    useState<number | null>(null);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isAuthorLoggedIn, setIsAuthorLoggedIn] =
    useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [selectedListName, setSelectedListName] =
    useState<string>("");
  const [selectedListData, setSelectedListData] = useState<{
    id: number;
    name: string;
    count: number;
    icon: any;
    userId?: number;
    readonly?: boolean;
  } | null>(null);
  const [previousPage, setPreviousPage] = useState<string>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [initialSearchType, setInitialSearchType] = useState<"books" | "authors" | "users">("books"); 
  const [selectedAuthorType, setSelectedAuthorType] = useState<'registered' | 'external' | undefined>(undefined);
  const [currentAuthorProfile, setCurrentAuthorProfile] = useState<Author | null>(null);
const [currentUser, setCurrentUser] = useState({
  id: 0,
  username: "",
  email: "",
  avatarUrl: "",
  verificationStatus: null as null | "pending" | "approved" | "rejected",
  isAdmin: false,
  isPrivate: false,
  bio: "",
  location: "",
  joinDate: "",
  role: "normal" as 'normal' | 'premium' | 'author' | 'admin',
});

  const [currentAuthor, setCurrentAuthor] = useState({
    name: "Author Name",
    email: "author@email.com",
    avatarUrl: "",
  });

  // State for Become Author Dialog
  const [showBecomeAuthorDialog, setShowBecomeAuthorDialog] =
    useState(false);

  // State for pending author verification requests
  const [pendingVerificationRequests, setPendingVerificationRequests] = useState<
    Array<{
      id: number;
      userId: number;
      userName: string;
      userEmail: string;
      fullName: string;
      idCardPreview: string;
      selfiePreview: string;
      submittedDate: string;
      status: "pending" | "approved" | "rejected";
    }>
  >([]);

  // State for notifications
  const [userNotifications, setUserNotifications] = useState<Array<{
    id: number;
    type: "review" | "follow" | "recommendation" | "system" | "comment" | "rating" | "trending" | "author-approval";
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    bookTitle?: string;
    userName?: string;
  }>>([]);

  // State for reports
  const [reports, setReports] = useState<Array<{
    id: number;
    type: "User Report" | "Author Report" | "Review Report" | "Book Report";
    reporter: string;
    reported: string;
    reason: string;
    details?: string;
    date: string;
    status: "pending" | "resolved" | "dismissed";
  }>>([]);

  // State for followed authors
  const [followedAuthors, setFollowedAuthors] = useState<Array<{
    id: number;
    name: string;
    avatarUrl: string;
    bio: string;
    stats: {
      totalBooks: number;
      followers: number;
    };
  }>>([]);

  // State for followed users
  const [followedUsers, setFollowedUsers] = useState<Array<{
    id: number;
    username: string;
    avatarUrl: string;
    bio?: string;
    status: "following" | "requested";
    stats: {
      totalReviews: number;
      booksRead: number;
    };
  }>>([]);

  // State for follow requests (for private accounts)
  const [followRequests, setFollowRequests] = useState<Array<{
    id: number;
    fromUserId: number;
    fromUsername: string;
    fromAvatarUrl: string;
    toUserId: number;
    status: "pending" | "accepted" | "rejected";
    date: string;
  }>>([]);


  // Mock users data for search and profiles
  const [mockUsers] = useState<Array<{
    id: number;
    username: string;
    email: string;
    avatarUrl: string;
    bio?: string;
    location?: string;
    website?: string;
    joinDate: string;
    isPrivate: boolean;
    stats: {
      totalReviews: number;
      totalRatings: number;
      booksRead: number;
      followers: number;
      following: number;
    };
    lists: Array<{
      id: number;
      name: string;
      count: number;
      isPublic: boolean;
    }>;
    recentReviews: Array<{
      id: number;
      bookTitle: string;
      bookAuthor: string;
      rating: number;
      comment: string;
      date: string;
      likes: number;
    }>;
    favoriteGenres: string[];
  }>>([
    {
      id: 2,
      username: "Emma Wilson",
      email: "emma.wilson@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
      bio: "Sci-fi enthusiast and fantasy lover. Always hunting for the next epic adventure!",
      location: "London, UK",
      website: "https://emmareads.blog",
      joinDate: "March 2023",
      isPrivate: false,
      stats: {
        totalReviews: 156,
        totalRatings: 342,
        booksRead: 287,
        followers: 1243,
        following: 456,
      },
      lists: [
        { id: 1, name: "Best Sci-Fi 2024", count: 12, isPublic: true },
        { id: 2, name: "Epic Fantasy Series", count: 8, isPublic: true },
        { id: 3, name: "Personal Favorites", count: 5, isPublic: false },
      ],
      recentReviews: [
        {
          id: 1,
          bookTitle: "The Midnight Library",
          bookAuthor: "Matt Haig",
          rating: 5,
          comment: "Absolutely mind-blowing! This book made me think about life choices in a whole new way.",
          date: "2 days ago",
          likes: 45,
        },
      ],
      favoriteGenres: ["Science Fiction", "Fantasy", "Mystery"],
    },
    {
      id: 3,
      username: "David Kim",
      email: "david.kim@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
      bio: "Non-fiction reader. Psychology, business, and self-improvement are my jam.",
      location: "San Francisco, CA",
      joinDate: "July 2022",
      isPrivate: false,
      stats: {
        totalReviews: 89,
        totalRatings: 201,
        booksRead: 178,
        followers: 678,
        following: 234,
      },
      lists: [
        { id: 1, name: "Business Classics", count: 15, isPublic: true },
        { id: 2, name: "Psychology Must-Reads", count: 20, isPublic: true },
      ],
      recentReviews: [
        {
          id: 1,
          bookTitle: "Atomic Habits",
          bookAuthor: "James Clear",
          rating: 5,
          comment: "Life-changing! Applied these principles and saw immediate results.",
          date: "5 days ago",
          likes: 67,
        },
      ],
      favoriteGenres: ["Non-Fiction", "Psychology", "Business"],
    },
    {
      id: 4,
      username: "Olivia Martinez",
      email: "olivia.martinez@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia",
      bio: "Romance and contemporary fiction aficionado. Love a good love story!",
      location: "Madrid, Spain",
      joinDate: "November 2023",
      isPrivate: true,
      stats: {
        totalReviews: 64,
        totalRatings: 128,
        booksRead: 112,
        followers: 289,
        following: 167,
      },
      lists: [
        { id: 1, name: "Favorite Romance", count: 18, isPublic: false },
      ],
      recentReviews: [],
      favoriteGenres: ["Romance", "Contemporary Fiction"],
    },
  ]);

  const handleBookSelect = (book: Book) => {
  setSelectedBookId(book.id);
  setPreviousPage("browse");
  setCurrentPage("book-details");
};

const handleUserSelect = (userId: number) => {
  console.log(`👤 User selected: ${userId}`);
  setSelectedUserId(userId);
  setCurrentPage("user-profile");
};

    const [userStats, setUserStats] = useState<{
    total_reviews: number;
    total_ratings: number;
    books_read: number;
    followers: number;
    following: number;
  } | null>(null);

  // User's custom lists
  const listIcons = [
    Heart,
    BookOpen,
    Star,
    List,
    TrendingUp,
  ];
  const [userLists, setUserLists] = useState<
    Array<{
      id: number;
      name: string;
      count: number;
      bookIds: number[];
      icon: any;
    }>>(() => {
    // Initialize with 5 default reading status lists
    return [
      { id: -1, name: "Reading", count: 0, bookIds: [], icon: BookOpen },
      { id: -2, name: "Completed", count: 0, bookIds: [], icon: BookCheck },
      { id: -3, name: "Plan to Read", count: 0, bookIds: [], icon: Clock },
      { id: -4, name: "On-Hold", count: 0, bookIds: [], icon: Pause },
      { id: -5, name: "Dropped", count: 0, bookIds: [], icon: List },
    ];
  });

  useEffect(() => {
    // Apply theme to document root
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

// Load user profile data when logged in
useEffect(() => {
  const loadUserProfile = async () => {
    if (isUserLoggedIn && authService.isAuthenticated()) {
      try {
        const profile = await apiService.getUserProfile(); // ✅ Only call once
        
        // Format the joined date from created_at
        const joinDate = profile.created_at 
          ? new Date(profile.created_at).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })
          : "";

        const isAdmin = profile.role === 'admin';
        
        // ✅ Map "none" to null to match state type
        const verificationStatus = profile.verification_status === 'none' 
          ? null 
          : profile.verification_status || null;
        
setCurrentUser(prev => ({
  ...prev,
  id: profile.user_id,
  username: profile.display_name || profile.username || prev.username,  // ✅ FIX: display_name first
  email: profile.email || prev.email,
          avatarUrl: profile.profile_image || "",
          bio: profile.bio || "",
          location: profile.location || "",
          joinDate: joinDate,
          isAdmin: isAdmin,
          isPrivate: isAdmin ? true : !profile.is_public,
          role: profile.role || 'normal',
          verificationStatus: profile.role === 'author' ? 'approved' : verificationStatus,
        }));
      } catch (error: any) {
        console.error("Failed to load user profile:", error);
        // Keep existing user data on error
      }
    }
  };

  loadUserProfile();
}, [isUserLoggedIn]);

useEffect(() => {
  const reloadProfileOnDashboard = async () => {
    if (currentPage === "dashboard" && isUserLoggedIn && authService.isAuthenticated()) {
      try {
        console.log("🔄 Reloading profile on dashboard...");
        const profile = await apiService.getUserProfile();
        
        console.log("🔍 DEBUG: Dashboard reload - Location:", profile.location);
        
        const joinDate = profile.created_at 
          ? new Date(profile.created_at).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })
          : "";
        
        const isAdmin = profile.role === 'admin';
        
        // ✅ Map "none" to null to match state type
        const verificationStatus = profile.verification_status === 'none' 
          ? null 
          : profile.verification_status || null;
        
setCurrentUser(prev => ({
  ...prev,
  id: profile.user_id,
  username: profile.display_name || profile.username || prev.username,  // ✅ FIX: display_name first
  email: profile.email || prev.email,
          avatarUrl: profile.profile_image || "",
          bio: profile.bio || "",
          location: profile.location || "",
          joinDate: joinDate,
          isAdmin: isAdmin,
          isPrivate: isAdmin ? true : !profile.is_public,
          role: profile.role || 'normal',
          // ✅ Temporary mock for testing - remove when backend is ready
          verificationStatus: profile.role === 'author' ? 'approved' : verificationStatus,
        }));
        
        console.log("✅ Dashboard profile reload complete");
      } catch (error: any) {
        console.error("❌ Failed to reload user profile:", error);
      }
    }
  };

  reloadProfileOnDashboard();
}, [currentPage, isUserLoggedIn]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

const handleUserLogout = () => {
  setIsUserLoggedIn(false);
  setCurrentUser({
    id: 0,
    username: "",
    email: "",
    avatarUrl: "",
    verificationStatus: null,
    isAdmin: false,
    isPrivate: false,
    bio: "",
    location: "",
    joinDate: "",
    role: "normal",
  });
  setCurrentPage("home");
  authService.logout();
};

  const handleAuthorLogout = () => {
    setIsAuthorLoggedIn(false);
    setCurrentAuthor({
      name: "Author Name",
      email: "author@email.com",
      avatarUrl: "",
    });
    setCurrentPage("home");
  };

  // Function to handle report submission
  const handleReportSubmit = (
    reportType: "user" | "author" | "review" | "book",
    targetName: string,
    reason: string,
    details?: string
  ) => {
    // Prevent admins from submitting reports
    if (currentUser.isAdmin) {
      toast.error("Admins cannot submit reports");
      return;
    }
    
    const typeMap = {
      user: "User Report" as const,
      author: "Author Report" as const,
      review: "Review Report" as const,
      book: "Book Report" as const,
    };

    const newReport = {
      id: reports.length + 1,
      type: typeMap[reportType],
      reporter: currentUser.username,
      reported: targetName,
      reason: reason,
      details: details,
      date: new Date().toISOString().split('T')[0],
      status: "pending" as const,
    };

    setReports([...reports, newReport]);
  };

  // Function to handle report resolution
  const handleResolveReport = (reportId: number) => {
    setReports(reports.map(report =>
      report.id === reportId
        ? { ...report, status: "resolved" as const }
        : report
    ));
    toast.success("Report resolved successfully");
  };

  // Function to handle report dismissal
  const handleDismissReport = (reportId: number) => {
    setReports(reports.map(report =>
      report.id === reportId
        ? { ...report, status: "dismissed" as const }
        : report
    ));
    toast.success("Report dismissed");
  };

  // Function to follow an author
  const handleFollowAuthor = (author: any) => {
    // Prevent admins from following
    if (currentUser.isAdmin) {
      toast.error("Admins cannot follow authors");
      return;
    }
    
    // Prevent authors from following themselves
    if (isAuthorLoggedIn && author.email && author.email === currentAuthor.email) {
      toast.error("You cannot follow yourself");
      return;
    }
    
    const isAlreadyFollowing = followedAuthors.some(a => a.id === author.id);
    
    if (!isAlreadyFollowing) {
      setFollowedAuthors([...followedAuthors, {
        id: author.id,
        name: author.name,
        avatarUrl: author.avatarUrl,
        bio: author.bio,
        stats: {
          totalBooks: author.stats.totalBooks,
          followers: author.stats.followers,
        },
      }]);
      toast.success(`You are now following ${author.name}`);
    }
  };

  // Function to unfollow an author
  const handleUnfollowAuthor = (authorId: number) => {
    const author = followedAuthors.find(a => a.id === authorId);
    setFollowedAuthors(followedAuthors.filter(a => a.id !== authorId));
    if (author) {
      toast.success(`You unfollowed ${author.name}`);
    }
  };

  // Function to toggle user privacy
  const handleTogglePrivacy = () => {
    // Prevent admins from changing privacy settings
    if (currentUser.isAdmin) {
      toast.error("Admin profiles are always private and cannot be changed");
      return;
    }
    
    setCurrentUser((prev) => {
      const newPrivacy = !prev.isPrivate;
      toast.success(
        newPrivacy 
          ? "Your profile is now private. Users must send follow requests." 
          : "Your profile is now public. Anyone can see your activity."
      );
      return { ...prev, isPrivate: newPrivacy };
    });
  };

  // Function to follow a user
  const handleFollowUser = (userId: number) => {
    // Prevent admins from following
    if (currentUser.isAdmin) {
      toast.error("Admins cannot follow users");
      return;
    }
    
    // Authors can only follow other authors, not regular users
    if (isAuthorLoggedIn) {
      toast.error("Authors can only follow other authors");
      return;
    }
    
    const user = mockUsers.find(u => u.id === userId);
    
    if (!user) return;
    
    const isAlreadyFollowing = followedUsers.some(u => u.id === userId);
    
    if (isAlreadyFollowing) return;
    
    // If account is private, create a follow request and add to following list as "requested"
    if (user.isPrivate) {
      const newRequest = {
        id: Date.now(),
        fromUserId: currentUser.id,
        fromUsername: currentUser.username,
        fromAvatarUrl: currentUser.avatarUrl,
        toUserId: userId,
        status: "pending" as const,
        date: new Date().toISOString(),
      };
      setFollowRequests([...followRequests, newRequest]);
      
      // Add to following list with "requested" status
      setFollowedUsers([...followedUsers, {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: "requested",
        stats: {
          totalReviews: user.stats.totalReviews,
          booksRead: user.stats.booksRead,
        },
      }]);
      
      toast.success(`Follow request sent to ${user.username}`);
      
      // Add notification for the user
      setUserNotifications([
        {
          id: Date.now(),
          type: "follow",
          title: "New Follow Request",
          message: `${currentUser.username} wants to follow you`,
          timestamp: "Just now",
          isRead: false,
          userName: currentUser.username,
        },
        ...userNotifications,
      ]);
    } else {
      // Public account - follow immediately with "following" status
      setFollowedUsers([...followedUsers, {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: "following",
        stats: {
          totalReviews: user.stats.totalReviews,
          booksRead: user.stats.booksRead,
        },
      }]);
      toast.success(`You are now following ${user.username}`);
    }
  };

  // Function to unfollow a user
  const handleUnfollowUser = (userId: number) => {
    const user = followedUsers.find(u => u.id === userId);
    setFollowedUsers(followedUsers.filter(u => u.id !== userId));
    
    // Also remove any follow requests
    setFollowRequests(followRequests.filter(r => 
      !(r.fromUserId === currentUser.id && r.toUserId === userId)
    ));
    
    if (user) {
      if (user.status === "requested") {
        toast.success(`Follow request cancelled`);
      } else {
        toast.success(`You unfollowed ${user.username}`);
      }
    }
  };

  // Function to accept a follow request
  const handleAcceptFollowRequest = (requestId: number) => {
    const request = followRequests.find(r => r.id === requestId);
    if (!request) return;
    
    // Update request status
    setFollowRequests(followRequests.map(r => 
      r.id === requestId ? { ...r, status: "accepted" as const } : r
    ));
    
    toast.success(`You accepted ${request.fromUsername}'s follow request`);
    
    // Notify the requester
    setUserNotifications([
      {
        id: Date.now(),
        type: "follow",
        title: "Follow Request Accepted",
        message: `${currentUser.username} accepted your follow request`,
        timestamp: "Just now",
        isRead: false,
        userName: currentUser.username,
      },
      ...userNotifications,
    ]);
  };

  // Function to reject a follow request
  const handleRejectFollowRequest = (requestId: number) => {
    const request = followRequests.find(r => r.id === requestId);
    if (!request) return;
    
    // Update request status
    setFollowRequests(followRequests.map(r => 
      r.id === requestId ? { ...r, status: "rejected" as const } : r
    ));
    
    toast.success("Follow request rejected");
    
    // Note: In a real app with a backend, the requester's followedUsers list would be updated
    // to remove this user since the request was rejected
  };

  // Function to cancel a sent follow request
  const handleCancelFollowRequest = (userId: number) => {
    setFollowRequests(followRequests.filter(r => 
      !(r.fromUserId === currentUser.id && r.toUserId === userId && r.status === "pending")
    ));
    
    // Remove from followedUsers list
    setFollowedUsers(followedUsers.filter(u => u.id !== userId));
    
    toast.success("Follow request cancelled");
  };

// Function to get user profile by ID - UPDATED to use API
const getUserProfileById = (userId: number) => {
  console.log(`🔍 getUserProfileById called with userId: ${userId}`);
  console.log(`📊 currentUser.id: ${currentUser.id}`);
  
// For current user, return their actual profile data
if (userId === currentUser.id && isUserLoggedIn) {
  console.log("✅ Returning current user's own profile");
  
  // Note: favoriteGenres will be loaded by UserPublicProfilePage via API
  return {
    id: currentUser.id,
    username: currentUser.username, // Already contains display_name
    email: currentUser.email,
    avatarUrl: currentUser.avatarUrl || "",
    bio: currentUser.bio || "",
    location: currentUser.location || "",
    joinDate: currentUser.joinDate || "",
    isPrivate: currentUser.isPrivate || false,
      stats: {
        totalReviews: userStats?.total_reviews || 42,
        totalRatings: userStats?.total_ratings || 156,
        booksRead: userStats?.books_read || 134,
        followers: userStats?.followers || 567,
        following: userStats?.following || (followedUsers.length + followedAuthors.length),
      },
      lists: userLists.map(list => ({
        id: list.id,
        name: list.name,
        count: list.count,
        isPublic: true,
      })),
      recentReviews: [],
      favoriteGenres: [], // Will be loaded by UserPublicProfilePage
    };
  }
  
  // For mock users
  const mockUser = mockUsers.find(u => u.id === userId);
  if (mockUser) {
    console.log("📦 Returning mock user data");
    return mockUser;
  }

  // For real users - return placeholder that will be loaded by API in UserPublicProfilePage
  if (userId && userId > 0) {
    console.log(`🌐 Returning placeholder for real user ID ${userId} - will be loaded by API`);
    return {
      id: userId,
      username: "Loading...",
      email: "",
      avatarUrl: "",
      bio: "",
      location: "",
      website: "",
      joinDate: "",
      isPrivate: false,
      stats: {
        totalReviews: 0,
        totalRatings: 0,
        booksRead: 0,
        followers: 0,
        following: 0,
      },
      lists: [],
      recentReviews: [],
      favoriteGenres: [], // Will be loaded by UserPublicProfilePage
    };
  }

  console.error(`❌ Invalid userId: ${userId}`);
  return {
    id: 0,
    username: "User Not Found",
    email: "",
    avatarUrl: "",
    bio: "This user could not be loaded.",
    location: "",
    joinDate: "",
    isPrivate: false,
    stats: {
      totalReviews: 0,
      totalRatings: 0,
      booksRead: 0,
      followers: 0,
      following: 0,
    },
    lists: [],
    recentReviews: [],
    favoriteGenres: [],
  };
};
  // Book data arrays
  const trendingBooks: Book[] = [
    {
      id: 1,
      title: "The Midnight Library",
      author: "Matt Haig",
      rating: 4.5,
      totalRatings: 12847,
      cover:
        "https://images.unsplash.com/photo-1661936901394-a993c79303c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib29rJTIwY292ZXIlMjBmaWN0aW9ufGVufDF8fHx8MTc2MTgzMTA2MHww&ixlib=rb-4.1.0&q=80&w=1080",
      genre: "Fiction",
      description:
        "Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived.",
      publishYear: 2020,
    },
    {
      id: 2,
      title: "Project Hail Mary",
      author: "Andy Weir",
      rating: 4.7,
      totalRatings: 18293,
      cover:
        "https://images.unsplash.com/photo-1711185900806-bf85e7fe7767?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwYm9vayUyMGNvdmVyfGVufDF8fHx8MTc2MTc3NDExMHww&ixlib=rb-4.1.0&q=80&w=1080",
      genre: "Sci-Fi",
      description:
        "A lone astronaut must save the earth from disaster in this incredible new science-based thriller from the author of The Martian.",
      publishYear: 2021,
    },
    {
      id: 3,
      title: "The Seven Husbands of Evelyn Hugo",
      author: "Taylor Jenkins Reid",
      rating: 4.6,
      totalRatings: 15672,
      cover:
        "https://images.unsplash.com/photo-1739521949473-a703e0536ddf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBib29rJTIwY292ZXJ8ZW58MXx8fHwxNzYxNzMxNjY3fDA&ixlib=rb-4.1.0&q=80&w=1080",
      genre: "Historical Fiction",
      description:
        "A reclusive Hollywood icon opens up about her glamorous and scandalous life to an unknown magazine reporter.",
      publishYear: 2017,
    },
    {
      id: 4,
      title: "The Silent Patient",
      author: "Alex Michaelides",
      rating: 4.4,
      totalRatings: 21456,
      cover:
        "https://images.unsplash.com/photo-1760696473709-a7da66ee87a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxteXN0ZXJ5JTIwbm92ZWwlMjBjb3ZlcnxlbnwxfHx8fDE3NjE4MzE1NTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
      genre: "Mystery",
      description:
        "A famous painter married to an in-demand fashion photographer becomes a household name after shooting her husband and then never speaking another word again.",
      publishYear: 2019,
    },
  ];

  const newReleases: Book[] = [
    {
      id: 5,
      title: "The Measure",
      author: "Nikki Erlick",
      rating: 4.3,
      totalRatings: 3842,
      cover:
        "https://images.unsplash.com/photo-1760120482171-d9d5468f75fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwbGl0ZXJhdHVyZSUyMGJvb2t8ZW58MXx8fHwxNzYxNzQ4NDEwfDA&ixlib=rb-4.1.0&q=80&w=1080",
      genre: "Contemporary",
      description:
        "Eight ordinary people. One extraordinary choice. It seems like any other day when a mysterious box appears at people's doors containing a string the exact length of their lives.",
      publishYear: 2022,
    },
    {
      id: 6,
      title: "Happy Place",
      author: "Emily Henry",
      rating: 4.2,
      totalRatings: 5621,
      cover:
        "https://images.unsplash.com/photo-1661936901394-a993c79303c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib29rJTIwY292ZXIlMjBmaWN0aW9ufGVufDF8fHx8MTc2MTgzMTA2MHww&ixlib=rb-4.1.0&q=80&w=1080",
      genre: "Romance",
      description:
        "A couple who broke up months ago pretend to still be together for one last week at their annual beach vacation with their best friends.",
      publishYear: 2023,
    },
    {
      id: 7,
      title: "Holly",
      author: "Stephen King",
      rating: 4.1,
      totalRatings: 4387,
      cover:
        "https://images.unsplash.com/photo-1657550650205-a351418bbf89?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwYm9vayUyMHNwaW5lfGVufDF8fHx8MTc2MTgzMTU0OXww&ixlib=rb-4.1.0&q=80&w=1080",
      genre: "Horror",
      description:
        "Holly Gibney, one of King's most compelling characters, returns in a riveting novel about good vs. evil in a small Midwest town.",
      publishYear: 2023,
    },
    {
      id: 8,
      title: "Fourth Wing",
      author: "Rebecca Yarros",
      rating: 4.5,
      totalRatings: 8934,
      cover:
        "https://images.unsplash.com/photo-1711185900806-bf85e7fe7767?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW50YXN5JTIwYm9vayUyMGNvdmVyfGVufDF8fHx8MTc2MTc3NDExMHww&ixlib=rb-4.1.0&q=80&w=1080",
      genre: "Fantasy",
      description:
        "Twenty-year-old Violet Sorrengail was supposed to enter the Scribe Quadrant, but her mother ordered her to join the riders.",
      publishYear: 2023,
    },
  ];

const getAuthorProfileByName = (authorName: string): Author | null => {
  if (!authorName) return null;
  
  const allBooks = [...trendingBooks, ...newReleases];
  const authorBooks = allBooks.filter(
    (book) => book.author === authorName,
  );
  const totalRatings = authorBooks.reduce(
    (sum, book) => sum + book.totalRatings,
    0,
  );
  const avgRating =
    authorBooks.length > 0
      ? authorBooks.reduce(
          (sum, book) => sum + book.rating,
          0,
        ) / authorBooks.length
      : 0;

  const emailName = authorName.toLowerCase().replace(/\s+/g, ".");
  
  return {
    id: Math.floor(Math.random() * 1000000), // ✅ Changed from Math.random() to generate integer
    name: authorName,
    email: `${emailName}@bookarc.com`,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorName}`,
    bio: `${authorName} is a talented author known for captivating storytelling and deep character development. With a passion for writing that spans multiple genres, they have created works that resonate with readers worldwide.\n\nTheir books explore complex themes and emotions, offering readers both entertainment and thought-provoking narratives. Each story is crafted with care, attention to detail, and a unique voice that sets their work apart.`,
    website: `https://${authorName.toLowerCase().replace(/\s+/g, "")}.com`,
    location: "New York, USA",
    joinDate: "January 2020",
    verified: true,
    socialLinks: {
      twitter: `@${authorName.split(" ")[0].toLowerCase()}`,
      instagram: `@${authorName.split(" ")[0].toLowerCase()}writes`,
      facebook: authorName.replace(/\s+/g, ""),
    },
    stats: {
      totalBooks: authorBooks.length,
      totalReads: authorBooks.reduce(
        (sum, book) =>
          sum + Math.floor(book.totalRatings * 5),
        0,
      ),
      totalRatings: totalRatings,
      avgRating: avgRating,
      followers: Math.floor(totalRatings * 0.3),
    },
    books: authorBooks,
  };
};


const getAuthorProfileAsync = async (
  authorIdOrName: number | string,
  authorType?: 'registered' | 'external'
) => {
  console.log(`📖 Loading author profile for: ${authorIdOrName}, type: ${authorType}`);
  
  try {
    // If it's a string (author name), use the mock function
    if (typeof authorIdOrName === 'string') {
      const profile = getAuthorProfileByName(authorIdOrName);
      if (profile) {
        setCurrentAuthorProfile(profile);
        return profile;
      }
      throw new Error('Author not found');
    }
    
    // ✅ Pass authorType to API
    const profile = await apiService.getAuthorProfile(authorIdOrName, authorType);
    
    console.log('✅ Loaded author profile:', profile);
    
    // Convert the API response to match the Author interface
    const authorProfile: Author = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio || '',
      website: profile.website,
      location: profile.location,
      joinDate: profile.joinDate,
      verified: profile.verified,
      socialLinks: {
        twitter: '',
        instagram: '',
        facebook: '',
      },
      stats: profile.stats,
      books: profile.books,
    };
    
    setCurrentAuthorProfile(authorProfile);
    setSelectedAuthorType(authorType);  // ✅ ADD THIS LINE to set the state
    
    return authorProfile;
  } catch (error: any) {
    console.error('❌ Failed to load author profile from API:', error);
    toast.error('Failed to load author profile');
    throw error;
  }
};

  // Helper function to get book by ID
  const getBookById = (bookId: number): Book => {
    const allBooks = [...trendingBooks, ...newReleases];
    
    // Also check author books from localStorage
    const storedBooks = localStorage.getItem("authorBooks");
    if (storedBooks) {
      try {
        const authorBooks = JSON.parse(storedBooks);
        allBooks.push(...authorBooks);
      } catch (e) {
        console.error("Error loading author books:", e);
      }
    }
    
    return (
      allBooks.find((book) => book.id === bookId) || allBooks[0]
    );
  };

  // Helper function to get author by ID
  const getAuthorProfileById = (authorId: number): Author | null => {
    // For now, just return a default author since we're using Math.random() for IDs
    // In a real app, this would query an actual database
    return getAuthorProfileByName("Matt Haig");
  };

  // Handle Become Author dialog submission
  const handleBecomeAuthorSubmit = (data: {
    fullName: string;
    idCard: File;
    selfie: File;
  }) => {
    // Convert files to data URLs for storage
    const idReader = new FileReader();
    const selfieReader = new FileReader();

    idReader.onloadend = () => {
      const idCardPreview = idReader.result as string;
      
      selfieReader.onloadend = () => {
        const selfiePreview = selfieReader.result as string;
        
        // Create verification request
        const newRequest = {
          id: Date.now(),
          userId: Date.now() + 1, // In real app, this would be actual user ID
          userName: currentUser.username,
          userEmail: currentUser.email,
          fullName: data.fullName,
          idCardPreview: idCardPreview,
          selfiePreview: selfiePreview,
          submittedDate: new Date().toISOString(),
          status: "pending" as const,
        };
        
        // Add to pending requests
        setPendingVerificationRequests([...pendingVerificationRequests, newRequest]);
        
        // Update user verification status
        setCurrentUser({ ...currentUser, verificationStatus: "pending" });
        
        toast.success("Verification submitted successfully!");
        setShowBecomeAuthorDialog(false);
      };
      
      selfieReader.readAsDataURL(data.selfie);
    };
    
    idReader.readAsDataURL(data.idCard);
  };

  // Handle admin approval/rejection of author verification
  const handleVerificationApproval = (requestId: number, approved: boolean) => {
    const request = pendingVerificationRequests.find(r => r.id === requestId);
    if (!request) return;

    if (approved) {
      // Add notification to the user about approval
      const approvalNotification = {
        id: Date.now(),
        type: "author-approval" as const,
        title: "Author Verification Approved! ðŸŽ‰",
        message: "Congratulations! Your author verification has been approved. You can now access your Author Dashboard and start publishing your books on BookArc.",
        timestamp: "Just now",
        isRead: false,
      };
      setUserNotifications([approvalNotification, ...userNotifications]);
      
      // Convert user to author
      if (request.userEmail === currentUser.email && isUserLoggedIn) {
        setCurrentUser({ ...currentUser, verificationStatus: "approved" });
      }
      
      // Update request status
      setPendingVerificationRequests(
        pendingVerificationRequests.map(r =>
          r.id === requestId ? { ...r, status: "approved" as const } : r
        )
      );
      
      toast.success("Author verification approved successfully!");
    } else {
      // Reject verification
      setPendingVerificationRequests(
        pendingVerificationRequests.map(r =>
          r.id === requestId ? { ...r, status: "rejected" as const } : r
        )
      );
      
      // Update user status if it's the current user
      if (request.userEmail === currentUser.email) {
        setCurrentUser({ ...currentUser, verificationStatus: "rejected" });
      }
      
      toast.error("Author verification rejected.");
    }
  };

  // Initialize user reviews from localStorage
  const [userReviews, setUserReviews] = useState<{
    bookReviews: { [bookId: number]: Array<{
      id: number;
      user: string;
      avatar: string;
      rating: number;
      date: string;
      review: string;
      helpful: number;
    }> };
    authorReviews: { [authorId: number]: Array<{
      id: number;
      user: string;
      avatar: string;
      rating: number;
      date: string;
      review: string;
      helpful: number;
      book?: string;
    }> };
  }>(() => {
    const saved = localStorage.getItem("userReviews");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading reviews:", e);
      }
    }
    return { bookReviews: {}, authorReviews: {} };
  });

  // Save reviews to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("userReviews", JSON.stringify(userReviews));
  }, [userReviews]);

  // Initialize helpful reviews tracking from localStorage
  const [helpfulReviews, setHelpfulReviews] = useState<{
    [reviewId: number]: boolean;
  }>(() => {
    const saved = localStorage.getItem("helpfulReviews");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading helpful reviews:", e);
      }
    }
    return {};
  });

  // Save helpful reviews to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("helpfulReviews", JSON.stringify(helpfulReviews));
  }, [helpfulReviews]);

  // Function to toggle helpful status for a review
  const handleToggleHelpful = (reviewId: number) => {
    setHelpfulReviews(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  

  // Function to add a book review
  const handleAddBookReview = (bookId: number, rating: number, reviewText: string) => {
    const newReview = {
      id: Date.now(),
      user: currentUser.username,
      avatar: currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`,
      rating: rating,
      date: "Just now",
      review: reviewText,
      helpful: 0,
    };

    setUserReviews(prev => ({
      ...prev,
      bookReviews: {
        ...prev.bookReviews,
        [bookId]: [newReview, ...(prev.bookReviews[bookId] || [])]
      }
    }));
  };

  // Function to add an author review
  const handleAddAuthorReview = (authorId: number, rating: number, reviewText: string, bookTitle?: string) => {
    const newReview = {
      id: Date.now(),
      user: currentUser.username,
      avatar: currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username}`,
      rating: rating,
      date: "Just now",
      review: reviewText,
      helpful: 0,
      book: bookTitle,
    };

    setUserReviews(prev => ({
      ...prev,
      authorReviews: {
        ...prev.authorReviews,
        [authorId]: [newReview, ...(prev.authorReviews[authorId] || [])]
      }
    }));
  };

if (currentPage === "login") {
  return (
    <>
      <LoginPage
        onBack={() => setCurrentPage("home")}
        onLogin={async (userData) => {
          try {
            const profile = await apiService.getUserProfile();
            
            const isAdmin = profile.role === 'admin';
            
            setCurrentUser({ 
              id: profile.user_id,
              username: profile.username || profile.display_name || userData.username,
              email: userData.email,
              avatarUrl: profile.profile_image || "",
              verificationStatus: null,
              isAdmin: isAdmin,
              isPrivate: isAdmin ? true : !profile.is_public,
              bio: profile.bio || "",
              location: profile.location || "",
              joinDate: profile.created_at 
                ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : "",
              role: profile.role || 'normal',
            });
            setIsUserLoggedIn(true);
            setCurrentPage("dashboard");
          } catch (error) {
            console.error("Error loading user profile during login:", error);
            
            setCurrentUser({ 
              id: Date.now(),
              username: userData.username,
              email: userData.email,
              avatarUrl: "",
              verificationStatus: null,
              isAdmin: false,
              isPrivate: false,
              bio: "",
              location: "",
              joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              role: 'normal',
            });
            setIsUserLoggedIn(true);
            setCurrentPage("dashboard");
            
            toast.warning("Profile loaded with limited information");
          }
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <Toaster />
    </>
  );
}

if (currentPage === "register") {
  return (
    <>
      <LoginPage
        onBack={() => setCurrentPage("home")}
        onLogin={async (userData) => {
          try {
            // Get user profile from database after registration
            const profile = await apiService.getUserProfile();
            
            const isAdmin = profile.role === 'admin';
            
            setCurrentUser({ 
              id: profile.user_id,
              username: profile.username || profile.display_name || userData.username,
              email: userData.email,
              avatarUrl: profile.profile_image || "",
              verificationStatus: null,
              isAdmin: isAdmin,
              isPrivate: isAdmin ? true : !profile.is_public,
              bio: profile.bio || "",
              location: profile.location || "",
              joinDate: profile.created_at 
                ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : "",
              role: profile.role || 'normal',
            });
            setIsUserLoggedIn(true);
            setCurrentPage("dashboard");
          } catch (error) {
            console.error("❌ Error loading user profile:", error);
            
            // Fallback
            setCurrentUser({ 
              id: Date.now(),
              username: userData.username,
              email: userData.email,
              avatarUrl: "",
              verificationStatus: null,
              isAdmin: false,
              isPrivate: false,
              bio: "",
              location: "",
              joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              role: 'normal',
            });
            setIsUserLoggedIn(true);
            setCurrentPage("dashboard");
          }
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        defaultTab="register"
      />
      <Toaster />
    </>
  );
}

  if (currentPage === "author") {
    return (
      <>
        <AuthorLoginPage
          onBack={() => setCurrentPage("home")}
          onLogin={() => {
            setIsAuthorLoggedIn(true);
            setCurrentPage("author-dashboard");
          }}
          onRegister={() =>
            setCurrentPage("author-verification")
          }
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <Toaster />
      </>
    );
  }

  if (currentPage === "author-verification") {
    return (
      <>
        <AuthorVerificationPage
          onBack={() => setCurrentPage("author")}
          onVerified={() =>
            setCurrentPage("author-registration")
          }
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <Toaster />
      </>
    );
  }

  if (currentPage === "author-registration") {
    return (
      <>
        <AuthorRegistrationPage
          onBack={() => setCurrentPage("author-verification")}
          onRegister={() => {
            setIsAuthorLoggedIn(true);
            setCurrentPage("author-dashboard");
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <Toaster />
      </>
    );
  }

  if (currentPage === "admin") {
    return (
      <>
        <AdminLoginPage
          onBack={() => setCurrentPage("home")}
          onLogin={() => setCurrentPage("admin-dashboard")}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <Toaster />
      </>
    );
  }

if (currentPage === "dashboard") {
  return (
    <>
      <UserDashboard
        onLogout={handleUserLogout}
        onLogoClick={() => setCurrentPage("home")}
        onViewNotifications={() => setCurrentPage("notifications")}
        onViewSubscription={() => setCurrentPage("subscription")}
        onViewChat={() => setCurrentPage("chat")}
        onEditProfile={() => setCurrentPage("edit-profile")}
        onViewBookDetails={(bookId) => {
          setSelectedBookId(bookId);
          setPreviousPage("home");
          setCurrentPage("book-details");
        }}
        onBecomeAuthor={() => setShowBecomeAuthorDialog(true)}
        onViewAdminDashboard={() => setCurrentPage("admin-dashboard")}
        onViewAuthorDashboard={() => setCurrentPage("author-dashboard")}
        currentUser={currentUser}
        userLists={userLists}
        setUserLists={setUserLists}
        listIcons={listIcons}
        onViewList={(list) => {
          setSelectedListName(list.name);
          setCurrentPage("list-view");
        }}
        followedAuthors={followedAuthors}
        onUnfollowAuthor={handleUnfollowAuthor}
        onViewAuthorProfile={async (authorName) => {
          const authorProfile = await getAuthorProfileAsync(authorName);
          setSelectedAuthorId(authorProfile.id);
          setCurrentPage("author-profile");
        }}
        followedUsers={followedUsers}
        onUnfollowUser={handleUnfollowUser}
        onViewUserProfile={(userId) => {
          setSelectedUserId(userId);
          setCurrentPage("user-profile");
        }}
        followRequests={followRequests.filter(r => r.toUserId === currentUser.id && r.status === "pending")}
        onAcceptFollowRequest={handleAcceptFollowRequest}
        onRejectFollowRequest={handleRejectFollowRequest}
        theme={theme}
        onToggleTheme={toggleTheme}
        
        // ✅ ADD THESE TWO HANDLERS:
        onUserSelect={(userId: number) => {
          console.log('👤 User selected from dashboard followers modal:', userId);
          setSelectedUserId(userId);
          setCurrentPage("user-profile");
        }}
        onAuthorSelect={(author: { id: number; authorType: 'registered' | 'external' }) => {
          console.log('📖 Author selected from dashboard followers modal:', author);
          setSelectedAuthorId(author.id);
          getAuthorProfileAsync(author.id, author.authorType);
          setCurrentPage("author-profile");
        }}
      />
      <Toaster />
    </>
  );
}

if (currentPage === "author-dashboard") {
  return (
    <>
      <AuthorDashboard
        onLogout={handleUserLogout}
        onLogoClick={() => setCurrentPage("home")}
        onViewNotifications={() => setCurrentPage("notifications")}
        onEditProfile={() => setCurrentPage("edit-profile")}
        onViewUserDashboard={() => setCurrentPage("dashboard")}
        onViewBookDetails={(bookId) => {
          setSelectedBookId(bookId);
          setPreviousPage("browse");
          setCurrentPage("book-details");
        }}
        currentAuthor={{
  name: currentUser.username,  // This shows the display_name (already fixed in your getUserProfile)
  email: currentUser.email,
  avatarUrl: currentUser.avatarUrl,
}}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <Toaster />
    </>
  );
}

  if (currentPage === "author-edit-profile") {
    return (
      <>
        <AuthorEditProfilePage
          onBack={() => setCurrentPage("author-dashboard")}
          onLogoClick={() => setCurrentPage("home")}
          currentAuthor={currentAuthor}
          onSave={(updatedAuthor) => {
            setCurrentAuthor({
              name: updatedAuthor.name,
              email: updatedAuthor.email,
              avatarUrl: updatedAuthor.avatarUrl || "",
            });
            setCurrentPage("author-dashboard");
          }}
          onLogout={handleAuthorLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <Toaster />
      </>
    );
  }

if (currentPage === "admin-dashboard") {
  return (
    <>
      <AdminDashboard
        currentUser={{
          name: currentUser.username,
          email: currentUser.email,
          avatarUrl: currentUser.avatarUrl,
          isAdmin: currentUser.isAdmin,
        }}
        onNavigateToProfile={() => {
          // Navigate to the user's own dashboard page
          setCurrentPage("dashboard");
        }}
        onLogout={() => {
          handleUserLogout();
          setCurrentPage("home");
        }}
      />
      <Toaster />
    </>
  );
}

if (currentPage === "browse") {
  return (
    <>
      <BrowseBooksPage
        onBack={() => setCurrentPage("home")}
        onBookSelect={handleBookSelect}
        
        onAuthorSelect={(author: { id: number; authorType: 'registered' | 'external' }) => {
          console.log('📖 Author selected:', author);
          
          setSelectedAuthorId(author.id);
          setSelectedAuthorType(author.authorType);  // ✅ ADD THIS LINE
          
          getAuthorProfileAsync(author.id, author.authorType);
          
          setCurrentPage("author-profile");
        }}
        
        onUserSelect={handleUserSelect}
        onGenresClick={() => setCurrentPage("genres")}
        initialSearchType={initialSearchType}
        mockUsers={mockUsers}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <Toaster />
    </>
  );
}

  if (currentPage === "genres") {
  return (
    <>
      <GenresPage
        onBack={() => setCurrentPage("home")}
        onLogoClick={() => setCurrentPage("home")}
        theme={theme}
        onToggleTheme={toggleTheme}
        isUserLoggedIn={isUserLoggedIn}
        onLoginRequired={() => setCurrentPage("login")}
        onGenreClick={(genreName) => {
          // Navigate to browse page filtered by this genre
          setCurrentPage("browse");
          // You can add genre filtering logic here
        }}
        currentUser={currentUser}
      />
      <Toaster />
    </>
  );
}

  if (currentPage === "book-details" && selectedBookId) {
    const book = getBookById(selectedBookId);
    const bookAuthor = getAuthorProfileByName(book.author);
    
    // Handle null case
    if (!bookAuthor) {
      return (
        <>
          <div className="container mx-auto px-4 py-8">
            <p>Error: Author not found</p>
            <Button onClick={() => setCurrentPage("home")}>Go Back</Button>
          </div>
          <Toaster />
        </>
      );
    }
    
    return (
    <>
      <BookDetailsPage
      bookId={selectedBookId}
        onBack={() => {
          const validPages = [
            "home", "login", "register", "author", "author-verification", 
            "author-registration", "admin", "dashboard", "author-dashboard", 
            "admin-dashboard", "admin-reports", "browse", "book-details", 
            "notifications", "about", "contact", "subscription", "chat", 
            "edit-profile", "author-profile", "list-view", "user-profile", 
            "settings", "author-notifications", "author-edit-profile"
          ];
          if (validPages.includes(previousPage)) {
            setCurrentPage(previousPage as typeof currentPage);
          } else {
            setCurrentPage("home");
          }
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogoClick={() => setCurrentPage("home")}
        isUserLoggedIn={isUserLoggedIn}
        onLoginRequired={() => setCurrentPage("login")}
        userReviews={userReviews.bookReviews[selectedBookId] || []}
        onAddReview={(rating, reviewText) => handleAddBookReview(selectedBookId, rating, reviewText)}
        helpfulReviews={helpfulReviews}
        onToggleHelpful={handleToggleHelpful}
        onReportSubmit={handleReportSubmit}
          onAuthorClick={async (authorName: string) => {
            const authorProfile = await getAuthorProfileAsync(authorName);
            setSelectedAuthorId(authorProfile.id);
            setCurrentPage("author-profile");
          }}
        isFollowingAuthor={followedAuthors.some(a => a.id === bookAuthor.id)}
        onFollowAuthor={handleFollowAuthor}
        onUnfollowAuthor={handleUnfollowAuthor}
        getAuthorByName={getAuthorProfileByName}
        currentUser={currentUser}
      />
      <Toaster />
    </>
  );
}

if (currentPage === "notifications") {
  return (
    <>
      <UnifiedNotifications 
        userRole={currentUser.role === 'premium' ? 'normal' : currentUser.role} // Map premium to normal
        onBack={() => setCurrentPage("dashboard")}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <Toaster />
    </>
  );
}

  if (currentPage === "contact") {
    return (
      <ContactPage
        onBack={() => setCurrentPage("home")}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogoClick={() => setCurrentPage("home")}
      />
    );
  }

  if (currentPage === "subscription") {
    return (
      <SubscriptionPage
        onBack={() => setCurrentPage("dashboard")}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (currentPage === "chat") {
    return (
      <ChatPage
        onBack={() => setCurrentPage("dashboard")}
        onLogoClick={() => setCurrentPage("home")}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

if (currentPage === "edit-profile") {
  return (
    <EditProfilePage
      onBack={() => setCurrentPage("dashboard")}
      onLogoClick={() => setCurrentPage("home")}
      currentUser={currentUser}
      onSave={(updatedUser) => {
        setCurrentUser({
          ...currentUser,
          username: updatedUser.username, 
          email: updatedUser.email,
          avatarUrl: updatedUser.avatarUrl || "",
          bio: updatedUser.bio || "",
          location: updatedUser.location || "",
        });
      }}
      onLogout={handleUserLogout}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

  if (currentPage === "list-view" && (selectedListName || selectedListData)) {
    // Use selectedListData if available (from public profile), otherwise use selectedListName (from dashboard)
    const listToShow = selectedListData || userLists.find((list) => list.name === selectedListName) || {
      id: 0,
      name: "",
      count: 0,
      icon: Heart,
    };

    return (
      <ListViewPage
        list={listToShow}
        onBack={() => {
          // Clear selectedListData when going back
          setSelectedListData(null);
          // Go back to appropriate page
          if (selectedListData?.userId) {
            setCurrentPage("user-profile");
          } else {
            setCurrentPage("dashboard");
          }
        }}
        onLogoClick={() => setCurrentPage("home")}
        onBookClick={(bookId) => {
          setSelectedBookId(bookId);
          setPreviousPage("list-view");
          setCurrentPage("book-details");
        }}
        onListUpdated={() => {
          // Reload user lists if viewing own list
          if (!selectedListData?.readonly) {
            // Trigger a refresh of userLists
            console.log('List updated, should refresh');
          }
        }}
        readonly={selectedListData?.readonly || false}
        userId={selectedListData?.userId}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

if (currentPage === "user-profile" && selectedUserId) {
  console.log(`📄 Rendering user-profile page for userId: ${selectedUserId}`);
  
  const user = getUserProfileById(selectedUserId);
  console.log("👤 User object for profile page:", user);

  if (!user) {
    console.warn("⚠️ getUserProfileById returned null");
    return (
      <>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-2xl font-semibold mb-2">User Not Found</h3>
            <p className="text-muted-foreground mb-6">
              Unable to load user profile.
            </p>
            <Button onClick={() => setCurrentPage("browse")} variant="outline">
              Go Back
            </Button>
          </Card>
        </div>
        <Toaster />
      </>
    );
  }
  
    return (
    <>
      <UserPublicProfilePage
        user={user}
        onBack={() => {
          // If admin viewing their own profile, go back to admin dashboard
          if (currentUser.isAdmin && selectedUserId === currentUser.id) {
            setCurrentPage("admin-dashboard");
          } else {
            setCurrentPage("browse");
          }
        }}
        onLogoClick={() => setCurrentPage("home")}
        theme={theme}
        onToggleTheme={toggleTheme}
        isCurrentUser={selectedUserId === currentUser.id && isUserLoggedIn}
        isUserLoggedIn={isUserLoggedIn}
        isAuthorLoggedIn={isAuthorLoggedIn}
        onLoginRequired={() => setCurrentPage("login")}
        isFollowing={followedUsers.some(u => u.id === selectedUserId && u.status === "following")}
        hasRequestedFollow={followedUsers.some(u => u.id === selectedUserId && u.status === "requested")}
        onFollowUser={handleFollowUser}
        onUnfollowUser={handleUnfollowUser}
        onCancelRequest={() => handleCancelFollowRequest(selectedUserId)}
        onEditProfile={() => setCurrentPage("edit-profile")}
        onViewBookDetails={(bookId) => {
          setSelectedBookId(bookId);
          setPreviousPage("user-profile");
          setCurrentPage("book-details");
        }}
        currentUser={currentUser}
        
        onUserSelect={(userId: number) => {
          console.log('👤 User selected from followers modal:', userId);
          setSelectedUserId(userId);
          setCurrentPage("user-profile");
        }}
        onAuthorSelect={(author: { id: number; authorType: 'registered' | 'external' }) => {
          console.log('📖 Author selected from followers modal:', author);
          setSelectedAuthorId(author.id);
          getAuthorProfileAsync(author.id, author.authorType);
          setCurrentPage("author-profile");
        }}
        onViewList={(list) => {
          console.log('📋 View list clicked:', list);
          setSelectedListData({
            id: list.id,
            name: list.name,
            count: list.count,
            icon: list.icon,
            userId: selectedUserId || undefined,
            readonly: selectedUserId !== currentUser.id
          });
          setCurrentPage("list-view");
        }}
      />
      <Toaster />
    </>
  );
}

if (currentPage === "author-profile" && selectedAuthorId) {
  console.log(`📖 Rendering author-profile page for authorId: ${selectedAuthorId}, type: ${selectedAuthorType}`);
  
  return (
    <>
      <AuthorProfileLoader
        authorId={selectedAuthorId}
        authorType={selectedAuthorType}  // ✅ ADD THIS LINE
        onBack={() => setCurrentPage("browse")}
        onLogoClick={() => setCurrentPage("home")}
        onBookSelect={(book) => {
          setSelectedBookId(book.id);
          setPreviousPage("author-profile");
          setCurrentPage("book-details");
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        isUserLoggedIn={isUserLoggedIn}
        onLoginRequired={() => setCurrentPage("login")}
        onReportSubmit={handleReportSubmit}
        isFollowing={followedAuthors.some(a => a.id === selectedAuthorId)}
        onFollowAuthor={handleFollowAuthor}
        onUnfollowAuthor={handleUnfollowAuthor}
        currentUser={currentUser}
        
        onUserSelect={handleUserSelect}
        onAuthorSelect={(author: { id: number; authorType: 'registered' | 'external' }) => {
          console.log('📖 Author selected from followers modal:', author);
          setSelectedAuthorId(author.id);
          getAuthorProfileAsync(author.id, author.authorType);
          setCurrentPage("author-profile");
        }}
      />
      <Toaster />
    </>
  );
}

  const features = [
    {
      icon: BookOpen,
      title: "Discover Books",
      description:
        "Explore millions of titles across every genre. Find your next favorite read with personalized recommendations.",
    },
    {
      icon: Star,
      title: "Rate & Review",
      description:
        "Share your thoughts and help others discover great books. Your opinion matters to our community.",
    },
    {
      icon: TrendingUp,
      title: "Follow Trends",
      description:
        "Stay up-to-date with what's popular. See what the community is reading and loving right now.",
    },
    {
      icon: Users,
      title: "Connect with Readers",
      description:
        "Join a passionate community of book lovers. Discuss, share, and grow your reading list together.",
    },
  ];

  const stats = [
    { value: "2.4M+", label: "Books Catalogued" },
    { value: "850K+", label: "Active Readers" },
    { value: "12M+", label: "Reviews Written" },
    { value: "95%", label: "Satisfaction Rate" },
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage("home")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo className="w-6 h-6" />
            <span className="text-xl">BookArc</span>
          </button>

          <div className="hidden md:flex items-center gap-6">
</div>


          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setDesktopMenuOpen(!desktopMenuOpen)
                }
                className="p-2"
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Desktop Dropdown Menu */}
              {desktopMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setCurrentPage("browse");
                      setDesktopMenuOpen(false);
                    }}
                    className="block w-full text-left py-2.5 px-4 hover:bg-accent/10 hover:text-primary transition-colors"
                  >
                    Browse Books
                  </button>
                  <button
  onClick={() => {
    setCurrentPage("genres");
    setDesktopMenuOpen(false);
  }}
  className="block w-full text-left py-2.5 px-4 hover:bg-accent/10 hover:text-primary transition-colors"
>
  Browse Genres
</button>
                  <a
                    href="#trending"
                    onClick={() => setDesktopMenuOpen(false)}
                    className="block w-full text-left py-2.5 px-4 hover:bg-accent/10 hover:text-primary transition-colors"
                  >
                    Trending
                  </a>
                  <a
                    href="#new-releases"
                    onClick={() => setDesktopMenuOpen(false)}
                    className="block w-full text-left py-2.5 px-4 hover:bg-accent/10 hover:text-primary transition-colors"
                  >
                    New Releases
                  </a>
                </div>
              )}
            </div>
            {isUserLoggedIn || isAuthorLoggedIn ? (
              <button
                onClick={() =>
                  setCurrentPage(
                    isUserLoggedIn
                      ? "dashboard"
                      : "author-dashboard",
                  )
                }
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src={
                      isUserLoggedIn
                        ? currentUser.avatarUrl
                        : currentAuthor.avatarUrl
                    }
                  />
                  <AvatarFallback className="bg-primary/10">
                    <User className="w-4 h-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              </button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage("login")}
              >
                Login
              </Button>
            )}
            {isUserLoggedIn && !isAuthorLoggedIn && !currentUser.isAdmin && (
              <>
                {!currentUser.verificationStatus && (
                  <Button
                    size="sm"
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => setShowBecomeAuthorDialog(true)}
                  >
                    <PenTool className="w-4 h-4" />
                    Become an Author
                  </Button>
                )}
                {currentUser.verificationStatus === "approved" && (
                  <Badge className="gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border-primary/20">
                    <PenTool className="w-4 h-4" />
                    Verified Author
                  </Badge>
                )}
                {currentUser.verificationStatus === "pending" && (
                  <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                    <Clock className="w-4 h-4" />
                    Pending Approval
                  </Badge>
                )}
              </>
            )}
            {(!isUserLoggedIn || !currentUser?.isAdmin) && (
              <Button
                size="sm"
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-background border-2 border-yellow-400"
                onClick={() => setCurrentPage("subscription")}
              >
                <Crown className="w-4 h-4" />
                Premium
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <div className="container mx-auto px-4 py-4 space-y-3">
              <button
                onClick={() => {
                  setCurrentPage("browse");
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left py-2 px-3 rounded hover:bg-accent/10 hover:text-primary transition-colors"
              >
                Browse Books
              </button>
              <a
                href="#trending"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left py-2 px-3 rounded hover:bg-accent/10 hover:text-primary transition-colors"
              >
                Trending
              </a>
              <a
                href="#new-releases"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left py-2 px-3 rounded hover:bg-accent/10 hover:text-primary transition-colors"
              >
                New Releases
              </a>
              <div className="pt-3 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setCurrentPage("login");
                    setMobileMenuOpen(false);
                  }}
                >
                  Login
                </Button>
                {isUserLoggedIn && !isAuthorLoggedIn && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-primary/50 hover:bg-primary/10"
                    onClick={() => {
                      setShowBecomeAuthorDialog(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <PenTool className="w-4 h-4 mr-2" />
                    Become an Author
                  </Button>
                )}
                {(!isUserLoggedIn || !currentUser?.isAdmin) && (
                  <Button
                    className="w-full justify-start bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-background border-2 border-yellow-400"
                    onClick={() => {
                      setCurrentPage("subscription");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Premium
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Enhanced Background Image with Gradient Overlay */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover opacity-25 dark:opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/75 to-background"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 backdrop-blur-sm shadow-lg">
              Join 850K+ Book Lovers
            </Badge>
            <h1 className="text-4xl md:text-6xl mb-6 drop-shadow-sm">
              Your Digital Library <br />
              Where Stories Come Alive
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto drop-shadow-sm">
              Discover, rate, and review books in the world's
              most trusted reading community. Connect with
              fellow readers and authors in a space built for
              book lovers.
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search for books, authors, or genres..."
                  className="pl-12 h-14 bg-card border-border cursor-pointer"
                  onClick={() => setCurrentPage("browse")}
                  readOnly
                />
              </div>
            </div>

<div className="flex flex-wrap items-center justify-center gap-3">
  <Button
    size="lg"
    className="bg-primary hover:bg-primary/90 text-primary-foreground"
    onClick={() => {
      setInitialSearchType("books");
      setCurrentPage("browse");
    }}
  >
    <BookMarked className="w-5 h-5 mr-2" />
    Browse Books
  </Button>
  
  <Button
    size="lg"
    className="bg-primary hover:bg-primary/90 text-primary-foreground"
    onClick={() => {
      setInitialSearchType("authors");
      setCurrentPage("browse");
    }}
  >
    <Users className="w-5 h-5 mr-2" />
    Browse Authors
  </Button>
  
  <Button
    size="lg"
    className="bg-primary hover:bg-primary/90 text-primary-foreground"
    onClick={() => {
      setInitialSearchType("users");
      setCurrentPage("browse");
    }}
  >
    <Users className="w-5 h-5 mr-2" />
    Browse Users
  </Button>
  
  <Button
    size="lg"
    className="bg-primary hover:bg-primary/90 text-primary-foreground"
    onClick={() => setCurrentPage("genres")}
  >
    <BookOpen className="w-5 h-5 mr-2" />
    Browse Genres
  </Button>
</div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-r from-secondary/30 via-accent/20 to-secondary/30 border-y border-border backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl text-primary mb-2 font-semibold">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Books Section */}
      <section id="trending" className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl mb-3">
                Trending Now
              </h2>
              <p className="text-muted-foreground">
                The most popular books in our community this
                week
              </p>
            </div>
            <Button
              variant="outline"
              className="border-border hover:bg-accent/10"
            >
              View All
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {trendingBooks.map((book, index) => (
              <BookCard
                key={index}
                title={book.title}
                author={book.author}
                rating={book.rating}
                reviews={book.totalRatings}
                coverUrl={book.cover}
                genre={book.genre}
                isTrending={true}
                onClick={() => {
                  setSelectedBookId(book.id);
                  setPreviousPage("home");
                  setCurrentPage("book-details");
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="discover" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl mb-4">
              Everything You Need for Your Reading Journey
            </h2>
            <p className="text-muted-foreground text-lg">
              A comprehensive platform designed for readers and
              writers to connect, discover, and grow
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const colors = [
                "bg-primary/20 hover:bg-primary/30",
                "bg-accent/20 hover:bg-accent/30",
                "bg-secondary/30 hover:bg-secondary/40",
                "bg-primary/15 hover:bg-primary/25",
              ];

              // Map each feature to its navigation destination
              const handleFeatureClick = () => {
                switch (feature.title) {
                  case "Discover Books":
                    setCurrentPage("browse");
                    break;
                  case "Rate & Review":
                    setCurrentPage("browse");
                    break;
                  case "Follow Trends":
                    // Scroll to trending section
                    document
                      .getElementById("trending")
                      ?.scrollIntoView({ behavior: "smooth" });
                    break;
                  case "Connect with Readers":
                    setCurrentPage("login"); // They need to login first to access chat
                    break;
                }
              };

              return (
                <button
                  key={index}
                  onClick={handleFeatureClick}
                  className="bg-card border border-border rounded-lg p-6 hover:shadow-xl hover:border-primary/40 transition-all duration-300 text-left cursor-pointer"
                >
                  <div
                    className={`w-12 h-12 rounded-lg ${colors[index]} flex items-center justify-center mb-4 transition-colors`}
                  >
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* New Releases Section */}
      <section id="new-releases" className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl mb-3">
                New Releases
              </h2>
              <p className="text-muted-foreground">
                Fresh picks from talented authors around the
                world
              </p>
            </div>
            <Button
              variant="outline"
              className="border-border hover:bg-accent/10"
            >
              View All
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {newReleases.map((book, index) => (
              <BookCard
                key={index}
                title={book.title}
                author={book.author}
                rating={book.rating}
                reviews={book.totalRatings}
                coverUrl={book.cover}
                genre={book.genre}
                onClick={() => {
                  setSelectedBookId(book.id);
                  setPreviousPage("home");
                  setCurrentPage("book-details");
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(164,135,131,0.2),transparent_50%)]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl mb-4">
              Ready to Start Your Reading Journey?
            </h2>
            <p className="text-lg mb-8 text-muted-foreground">
              Join thousands of readers and authors in building
              the world's most vibrant book community
            </p>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              onClick={() => setCurrentPage("register")}
            >
              Create Free Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="community"
        className="bg-card border-t border-border py-12"
      >
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Logo className="w-5 h-5" />
                <span className="text-lg">BookArc</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Your trusted companion for discovering, rating,
                and reviewing books in a vibrant community of
                readers and writers.
              </p>
            </div>

            <div>
              <h4 className="mb-4">Explore</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#trending"
                    className="hover:text-primary transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Trending Books
                  </a>
                </li>
                <li>
                  <a
                    href="#new-releases"
                    className="hover:text-primary transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('new-releases')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    New Releases
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#about"
                    className="hover:text-primary transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage("about");
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="hover:text-primary transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage("contact");
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; 2025 BookArc. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      {/* Become Author Dialog */}
      <BecomeAuthorDialog
        open={showBecomeAuthorDialog}
        onOpenChange={setShowBecomeAuthorDialog}
        onSubmit={handleBecomeAuthorSubmit}
        verificationStatus={currentUser.verificationStatus}
      />
      
      <Toaster />
    </div>
  );
}