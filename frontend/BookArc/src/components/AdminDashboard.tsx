import { useState, useEffect } from "react";
import { User, LogOut, Users, BookOpen, FileText, Search, TrendingUp, AlertTriangle, AlertCircle, CheckCircle, XCircle, Eye, Loader2, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { apiService } from "../services/apiService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { BookMarked, Star, MessageSquare, Upload, BarChart3, Bell, Moon, Sun, Edit,  Book, Calendar, DollarSign, Award, BadgeCheck, Settings, Plus, ThumbsUp, ThumbsDown } from "lucide-react";


interface AdminDashboardProps {
  currentUser: {
    name: string;
    email: string;
    avatarUrl?: string;
    isAdmin: boolean;
  };
  onNavigateToProfile: () => void;
  onLogout: () => void;
}

export default function AuthorDashboardOverview() {
  // Mock data for the cards
  const analyticsData = {
    totalBooksPublished: 8,
    publishedBooks: 5,
    pendingBooks: 3,
    totalReviews: 342,
    avgRating: 4.6,
  };
}

export function AdminDashboard({ currentUser, onNavigateToProfile, onLogout }: AdminDashboardProps) {
type ActiveSection =
  | "overview"
  | "users"
  | "authors"
  | "books"
  | "reports"
  | "add-book"
  | "pending-books"
  | "verification-requests";

const [activeSection, setActiveSection] = useState<ActiveSection>("overview");
const [unreadCount, setUnreadCount] = useState(0);
  
  // State for stats
  const [stats, setStats] = useState({
  totalUsers: 0,
  totalAuthors: 0,
  totalBooks: 0,
  pendingReports: 0,
  pendingVerifications: 0,
  pendingBooks: 0,           
  usersGrowth: "+0%",
  authorsGrowth: "+0%",
  booksGrowth: "+0%"
});
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // State for users
  const [users, setUsers] = useState<Array<any>>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // State for authors
  const [authors, setAuthors] = useState<Array<any>>([]);
  const [authorsPage, setAuthorsPage] = useState(1);
  const [authorsTotalPages, setAuthorsTotalPages] = useState(1);
  const [authorsSearch, setAuthorsSearch] = useState("");
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(false);

  // State for books
  const [books, setBooks] = useState<Array<any>>([]);
  const [booksPage, setBooksPage] = useState(1);
  const [booksTotalPages, setBooksTotalPages] = useState(1);
  const [booksSearch, setBooksSearch] = useState("");
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

  // State for reports
  const [reports, setReports] = useState<Array<any>>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const [isTogglingUser, setIsTogglingUser] = useState<number | null>(null);

  const [verificationRequests, setVerificationRequests] = useState<Array<any>>([]);
const [verificationPage, setVerificationPage] = useState(1);
const [verificationTotalPages, setVerificationTotalPages] = useState(1);
const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
const [isLoadingVerifications, setIsLoadingVerifications] = useState(false);
const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

// Dialog states
const [viewDetailsDialog, setViewDetailsDialog] = useState<{
  open: boolean;
  request: any | null;
}>({
  open: false,
  request: null
});

const [approveVerificationDialog, setApproveVerificationDialog] = useState<{
  open: boolean;
  requestId: number | null;
  username: string;
}>({
  open: false,
  requestId: null,
  username: ''
});

const [rejectVerificationDialog, setRejectVerificationDialog] = useState<{
  open: boolean;
  requestId: number | null;
  username: string;
}>({
  open: false,
  requestId: null,
  username: ''
});

const [verificationRejectionReason, setVerificationRejectionReason] = useState("");

// Load function (add to useEffect):
const loadVerificationRequests = async () => {
  try {
    setIsLoadingVerifications(true);
    const data = await apiService.getAdminVerificationRequests({
      status: verificationStatus,
      page: verificationPage,
      limit: 20
    });
    setVerificationRequests(data.requests);
    setVerificationTotalPages(data.total_pages);
  } catch (error: any) {
    console.error("Failed to load verification requests:", error);
    toast.error("Failed to load verification requests");
  } finally {
    setIsLoadingVerifications(false);
  }
};

// Dialog handlers:
const openViewDetailsDialog = (request: any) => {
  setViewDetailsDialog({
    open: true,
    request
  });
};

const closeViewDetailsDialog = () => {
  setViewDetailsDialog({
    open: false,
    request: null
  });
};

const openApproveVerificationDialog = (requestId: number, username: string) => {
  setApproveVerificationDialog({
    open: true,
    requestId,
    username
  });
};

const closeApproveVerificationDialog = () => {
  setApproveVerificationDialog({
    open: false,
    requestId: null,
    username: ''
  });
};

const openRejectVerificationDialog = (requestId: number, username: string) => {
  setRejectVerificationDialog({
    open: true,
    requestId,
    username
  });
  setVerificationRejectionReason("");
};

const closeRejectVerificationDialog = () => {
  setRejectVerificationDialog({
    open: false,
    requestId: null,
    username: ''
  });
  setVerificationRejectionReason("");
};

const handleConfirmApproveVerification = async () => {
  if (!approveVerificationDialog.requestId) return;

  const requestId = approveVerificationDialog.requestId;
  setProcessingRequestId(requestId);
  closeApproveVerificationDialog();

  try {
    const result = await apiService.approveAuthorVerification(requestId);
    
    // Remove from list
    setVerificationRequests(verificationRequests.filter(req => req.request_id !== requestId));
    
    toast.success(result.message || "Verification approved successfully!");
  } catch (error: any) {
    console.error("Failed to approve verification:", error);
    toast.error(error.message || "Failed to approve verification");
  } finally {
    setProcessingRequestId(null);
  }
};

const handleConfirmRejectVerification = async () => {
  if (!rejectVerificationDialog.requestId) return;

  if (!verificationRejectionReason.trim()) {
    toast.error("Please provide a rejection reason");
    return;
  }

  const requestId = rejectVerificationDialog.requestId;
  setProcessingRequestId(requestId);
  closeRejectVerificationDialog();

  try {
    const result = await apiService.rejectAuthorVerification(
      requestId,
      verificationRejectionReason
    );
    
    // Remove from list
    setVerificationRequests(verificationRequests.filter(req => req.request_id !== requestId));
    
    toast.success(result.message || "Verification rejected");
  } catch (error: any) {
    console.error("Failed to reject verification:", error);
    toast.error(error.message || "Failed to reject verification");
  } finally {
    setProcessingRequestId(null);
  }
};

  // State for confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: number | null;
    username: string;
    action: 'activate' | 'deactivate';
  }>({
    open: false,
    userId: null,
    username: '',
    action: 'activate'
  });

  // State for pending books section
  const [pendingBooks, setPendingBooks] = useState<Array<any>>([]);
  const [pendingBooksPage, setPendingBooksPage] = useState(1);
  const [pendingBooksTotalPages, setPendingBooksTotalPages] = useState(1);
  const [pendingBooksSearch, setPendingBooksSearch] = useState("");
  const [isLoadingPendingBooks, setIsLoadingPendingBooks] = useState(false);
  const [processingBookId, setProcessingBookId] = useState<number | null>(null);

  // State for book approval/rejection dialogs
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    bookId: number | null;
    bookTitle: string;
  }>({
    open: false,
    bookId: null,
    bookTitle: ''
  });

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    bookId: number | null;
    bookTitle: string;
  }>({
    open: false,
    bookId: null,
    bookTitle: ''
  });

  const [rejectionReason, setRejectionReason] = useState("");

  // State for book details dialog
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    book: any | null;
  }>({
    open: false,
    book: null
  });

   const [bookForm, setBookForm] = useState({
    title: '',
    summary: '',
    isbn: '',
    publish_date: '',
    cover_image_url: '',
    source_name: 'Manual',
    authors: [''],
    genres: ['']
  });
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

useEffect(() => {
  switch (activeSection) {
    case "users":
      loadUsers();
      break;
    case "authors":
      loadAuthors();
      break;
    case "books":
      loadBooks();
      break;
    case "pending-books":
      loadPendingBooks();
      break;
    case "reports":
      loadReports();
      break;
    case "verification-requests":
      loadVerificationRequests();
      break;
    case "add-book":
      setBookForm({
        title: '',
        summary: '',
        isbn: '',
        publish_date: '',
        cover_image_url: '',
        source_name: 'Manual',
        authors: [''],
        genres: ['']
      });
      break;
  }
}, [activeSection, usersPage, authorsPage, booksPage, pendingBooksPage, verificationPage]);

useEffect(() => {
  if (activeSection === "verification-requests") {
    loadVerificationRequests();
  }
}, [verificationStatus]); // Reload when status filter changes

useEffect(() => {
  const loadNotificationCount = async () => {
    try {
      const response = await apiService.getNotifications({ limit: 1 });
      setUnreadCount(response.unread_count);
    } catch (error: any) {
      console.error("Failed to load notification count:", error);
      setUnreadCount(0);
    }
  };

  loadNotificationCount();
  
  // Refresh every 30 seconds
  const interval = setInterval(loadNotificationCount, 30000);
  
  return () => clearInterval(interval);
}, []);

const loadStats = async () => {
  try {
    setIsLoadingStats(true);
    const data = await apiService.getAdminStats();

    setStats(prev => ({
      ...prev,
      ...data
    }));
  } catch (error: any) {
    console.error("Failed to load stats:", error);
    toast.error("Failed to load statistics");
  } finally {
    setIsLoadingStats(false);
  }
};

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const data = await apiService.getAdminUsers({
        page: usersPage,
        limit: 20,
        search: usersSearch || undefined
      });
      setUsers(data.users);
      setUsersTotalPages(data.totalPages);
    } catch (error: any) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadAuthors = async () => {
    try {
      setIsLoadingAuthors(true);
      const data = await apiService.getAdminAuthors({
        page: authorsPage,
        limit: 20,
        search: authorsSearch || undefined
      });
      setAuthors(data.authors);
      setAuthorsTotalPages(data.totalPages);
    } catch (error: any) {
      console.error("Failed to load authors:", error);
      toast.error("Failed to load authors");
    } finally {
      setIsLoadingAuthors(false);
    }
  };

  const loadBooks = async () => {
    try {
      setIsLoadingBooks(true);
      const data = await apiService.getAdminBooks({
        page: booksPage,
        limit: 20,
        search: booksSearch || undefined,
        status: 'approved'
      });
      setBooks(data.books);
      setBooksTotalPages(data.totalPages);
    } catch (error: any) {
      console.error("Failed to load books:", error);
      toast.error("Failed to load books");
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const loadReports = async () => {
    try {
      setIsLoadingReports(true);
      const data = await apiService.getAdminReports({ status: 'pending' });
      setReports(data.reports);
    } catch (error: any) {
      console.error("Failed to load reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setIsLoadingReports(false);
    }
  };

  const loadPendingBooks = async () => {
    try {
      setIsLoadingPendingBooks(true);
      const data = await apiService.getAdminPendingBooks({
        page: pendingBooksPage,
        limit: 20,
        search: pendingBooksSearch || undefined
      });
      setPendingBooks(data.books);
      setPendingBooksTotalPages(data.totalPages);
    } catch (error: any) {
      console.error("Failed to load pending books:", error);
      toast.error("Failed to load pending books");
    } finally {
      setIsLoadingPendingBooks(false);
    }
  };

  const handleUsersSearch = () => {
    setUsersPage(1);
    loadUsers();
  };

  const handleAuthorsSearch = () => {
    setAuthorsPage(1);
    loadAuthors();
  };

  const handleBooksSearch = () => {
    setBooksPage(1);
    loadBooks();
  };

  const handlePendingBooksSearch = () => {
    setPendingBooksPage(1);
    loadPendingBooks();
  };

  const openConfirmDialog = (userId: number, username: string, isCurrentlyActive: boolean) => {
    setConfirmDialog({
      open: true,
      userId,
      username,
      action: isCurrentlyActive ? 'deactivate' : 'activate'
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      userId: null,
      username: '',
      action: 'activate'
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmDialog.userId) return;

    const userId = confirmDialog.userId;
    const action = confirmDialog.action;
    
    setIsTogglingUser(userId);
    closeConfirmDialog();
    
    try {
      const result = await apiService.toggleUserStatus(userId, action);
      
      // Update the user in the local state
      setUsers(users.map(user => 
        user.user_id === userId 
          ? { ...user, is_active: result.user.is_active }
          : user
      ));
      
      toast.success(result.message);
    } catch (error: any) {
      console.error(`Failed to ${action} user:`, error);
      toast.error(error.message || `Failed to ${action} user`);
    } finally {
      setIsTogglingUser(null);
    }
  };

  // Pending books dialog handlers
  const openApproveDialog = (bookId: number, bookTitle: string) => {
    setApproveDialog({
      open: true,
      bookId,
      bookTitle
    });
  };

  const closeApproveDialog = () => {
    setApproveDialog({
      open: false,
      bookId: null,
      bookTitle: ''
    });
  };

  const openRejectDialog = (bookId: number, bookTitle: string) => {
    setRejectDialog({
      open: true,
      bookId,
      bookTitle
    });
    setRejectionReason("");
  };

  const closeRejectDialog = () => {
    setRejectDialog({
      open: false,
      bookId: null,
      bookTitle: ''
    });
    setRejectionReason("");
  };

  const openDetailsDialog = (book: any) => {
    setDetailsDialog({
      open: true,
      book
    });
  };

  const closeDetailsDialog = () => {
    setDetailsDialog({
      open: false,
      book: null
    });
  };

  const handleConfirmApprove = async () => {
    if (!approveDialog.bookId) return;

    const bookId = approveDialog.bookId;
    setProcessingBookId(bookId);
    closeApproveDialog();

    try {
      const result = await apiService.approveBook(bookId);
      
      // Remove the approved book from the list
      setPendingBooks(pendingBooks.filter(book => book.book_id !== bookId));
      
      toast.success(result.message || "Book approved successfully!");
    } catch (error: any) {
      console.error("Failed to approve book:", error);
      toast.error(error.message || "Failed to approve book");
    } finally {
      setProcessingBookId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectDialog.bookId) return;

    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    const bookId = rejectDialog.bookId;
    setProcessingBookId(bookId);
    closeRejectDialog();

    try {
      const result = await apiService.rejectBook(bookId, rejectionReason);
      
      // Remove the rejected book from the list
      setPendingBooks(pendingBooks.filter(book => book.book_id !== bookId));
      
      toast.success(result.message || "Book rejected successfully");
    } catch (error: any) {
      console.error("Failed to reject book:", error);
      toast.error(error.message || "Failed to reject book");
    } finally {
      setProcessingBookId(null);
    }
  };

   const handleAddAuthorField = () => {
    setBookForm(prev => ({
      ...prev,
      authors: [...prev.authors, '']
    }));
  };

  const handleRemoveAuthorField = (index: number) => {
    setBookForm(prev => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index)
    }));
  };

  const handleAuthorChange = (index: number, value: string) => {
    setBookForm(prev => ({
      ...prev,
      authors: prev.authors.map((author, i) => i === index ? value : author)
    }));
  };

  const handleAddGenreField = () => {
    setBookForm(prev => ({
      ...prev,
      genres: [...prev.genres, '']
    }));
  };

  const handleRemoveGenreField = (index: number) => {
    setBookForm(prev => ({
      ...prev,
      genres: prev.genres.filter((_, i) => i !== index)
    }));
  };

  const handleGenreChange = (index: number, value: string) => {
    setBookForm(prev => ({
      ...prev,
      genres: prev.genres.map((genre, i) => i === index ? value : genre)
    }));
  };

  const handleSubmitBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!bookForm.title.trim()) {
      toast.error('Book title is required');
      return;
    }

    const validAuthors = bookForm.authors.filter(a => a.trim());
    if (validAuthors.length === 0) {
      toast.error('At least one author is required');
      return;
    }

    const validGenres = bookForm.genres.filter(g => g.trim());
    if (validGenres.length === 0) {
      toast.error('At least one genre is required');
      return;
    }

    setIsSubmittingBook(true);

    try {
      // Call API to add book
      await apiService.addBook({
        title: bookForm.title.trim(),
        summary: bookForm.summary.trim() || null,
        isbn: bookForm.isbn.trim() || null,
        publish_date: bookForm.publish_date || null,
        cover_image_url: bookForm.cover_image_url.trim() || null,
        source_name: bookForm.source_name,
        authors: validAuthors,
        genres: validGenres
      });

      toast.success('Book added successfully!');
      
      // Reset form
      setBookForm({
        title: '',
        summary: '',
        isbn: '',
        publish_date: '',
        cover_image_url: '',
        source_name: 'Manual',
        authors: [''],
        genres: ['']
      });

      // Refresh books list if we're also showing it
      if (activeSection === 'books') {
        loadBooks();
      }
    } catch (error: any) {
      console.error('Failed to add book:', error);
      toast.error(error.message || 'Failed to add book');
    } finally {
      setIsSubmittingBook(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* User Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && closeConfirmDialog()}>
        <AlertDialogContent className="border-border">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {confirmDialog.action === 'deactivate' ? (
                <div className="w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              )}
              <AlertDialogTitle className="text-xl">
                {confirmDialog.action === 'deactivate' ? 'Deactivate Account' : 'Activate Account'}
              </AlertDialogTitle>
            </div>
<div className="space-y-2 pt-2">
  <p className="text-sm text-muted-foreground">
    Are you sure you want to <span className="font-semibold text-foreground">{confirmDialog.action}</span> the account for{' '}
    <span className="font-semibold text-foreground">{confirmDialog.username}</span>?
  </p>
  {confirmDialog.action === 'deactivate' && (
    <p className="text-sm text-red-600 dark:text-red-400">
      This user will not be able to log in until their account is reactivated.
    </p>
  )}
</div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
              className={
                confirmDialog.action === 'deactivate'
                  ? "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white"
              }
            >
              {confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Book Confirmation Dialog */}
      <AlertDialog open={approveDialog.open} onOpenChange={(open) => !open && closeApproveDialog()}>
        <AlertDialogContent className="border-border max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-start gap-4 mb-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 dark:from-green-500/30 dark:to-green-600/30 flex items-center justify-center flex-shrink-0 ring-4 ring-green-500/10">
                <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 pt-1">
                <AlertDialogTitle className="text-2xl mb-2">
                  Approve Book
                </AlertDialogTitle>
<div className="space-y-3">
  <p className="text-sm text-muted-foreground">
    Are you sure you want to approve:
  </p>
  <div className="bg-secondary/50 dark:bg-secondary/20 rounded-lg p-4 border border-border">
    <p className="font-semibold text-foreground text-lg leading-relaxed">
      "{approveDialog.bookTitle}"
    </p>
  </div>
  <div className="flex items-start gap-2 text-sm bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
    <p className="text-green-700 dark:text-green-300">
      This book will be published and become visible to all users in the BookArc library.
    </p>
  </div>
</div>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="border-border hover:bg-secondary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApprove}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg shadow-green-500/20 border-0"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Book
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Book Confirmation Dialog */}
      <AlertDialog open={rejectDialog.open} onOpenChange={(open) => !open && closeRejectDialog()}>
        <AlertDialogContent className="border-border max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-start gap-4 mb-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-500/30 dark:to-red-600/30 flex items-center justify-center flex-shrink-0 ring-4 ring-red-500/10">
                <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 pt-1">
                <AlertDialogTitle className="text-2xl mb-2">
                  Reject Book
                </AlertDialogTitle>
<div className="space-y-3">
  <p className="text-sm text-muted-foreground">
    Are you sure you want to reject:
  </p>
  <div className="bg-secondary/50 dark:bg-secondary/20 rounded-lg p-4 border border-border">
    <p className="font-semibold text-foreground text-lg leading-relaxed">
      "{rejectDialog.bookTitle}"
    </p>
  </div>
  <div className="space-y-2">
    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
      <span>Rejection Reason</span>
      <span className="text-red-500">*</span>
    </label>
    <textarea
      value={rejectionReason}
      onChange={(e) => setRejectionReason(e.target.value)}
      placeholder="Please explain why this book is being rejected..."
      className="w-full min-h-[120px] px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
      autoFocus
    />
    {rejectionReason.trim() && (
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <CheckCircle className="w-3 h-3 text-green-500" />
        {rejectionReason.length} characters
      </p>
    )}
  </div>
  <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
    <p className="text-red-700 dark:text-red-300">
      The author will be notified with your feedback. This action cannot be undone.
    </p>
  </div>
</div>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="border-border hover:bg-secondary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              disabled={!rejectionReason.trim()}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-lg shadow-red-500/20 border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Book
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Book Details Dialog */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => !open && closeDetailsDialog()}>
        <DialogContent className="border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Book Details</DialogTitle>
            <DialogDescription>
              Review complete information about this book
            </DialogDescription>
          </DialogHeader>
          
          {detailsDialog.book && (
            <div className="space-y-6 pt-4">
              {/* Cover Image */}
              {detailsDialog.book.cover_image_url && (
                <div className="flex justify-center">
                  <img
                    src={detailsDialog.book.cover_image_url}
                    alt={detailsDialog.book.title}
                    className="w-48 h-72 object-cover rounded-lg border border-border shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Book Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Title</h3>
                  <p className="text-lg font-semibold">{detailsDialog.book.title}</p>
                </div>

                {detailsDialog.book.authors && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Author(s)</h3>
                    <p>{detailsDialog.book.authors}</p>
                  </div>
                )}

                {detailsDialog.book.genres && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Genre(s)</h3>
                    <p>{detailsDialog.book.genres}</p>
                  </div>
                )}

                {detailsDialog.book.summary && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Summary</h3>
                    <p className="text-sm leading-relaxed">{detailsDialog.book.summary}</p>
                  </div>
                )}

                {detailsDialog.book.isbn && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">ISBN</h3>
                    <p className="font-mono text-sm">{detailsDialog.book.isbn}</p>
                  </div>
                )}

                {detailsDialog.book.publish_date && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Publish Date</h3>
                    <p>{new Date(detailsDialog.book.publish_date).toLocaleDateString()}</p>
                  </div>
                )}

                {detailsDialog.book.source_name && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Source</h3>
                    <Badge variant="outline">{detailsDialog.book.source_name}</Badge>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Submitted By</h3>
                  <p className="text-sm">{detailsDialog.book.submitted_by?.username || 'N/A'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Submitted</h3>
                  <p className="text-sm">{new Date(detailsDialog.book.submitted_at || detailsDialog.book.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={() => {
                    closeDetailsDialog();
                    openApproveDialog(detailsDialog.book.book_id, detailsDialog.book.title);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    closeDetailsDialog();
                    openRejectDialog(detailsDialog.book.book_id, detailsDialog.book.title);
                  }}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ ADD THESE THREE DIALOGS BELOW: */}

{/* View Verification Details Dialog */}
<Dialog open={viewDetailsDialog.open} onOpenChange={(open) => !open && closeViewDetailsDialog()}>
  <DialogContent className="border-border max-w-3xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-2xl flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        Verification Request Details
      </DialogTitle>
      <DialogDescription>
        Review the submitted identity documents
      </DialogDescription>
    </DialogHeader>
    
    {viewDetailsDialog.request && (
      <div className="space-y-6 pt-4">
        {/* User Information */}
        <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-lg">
          <Avatar className="w-16 h-16">
            <AvatarImage src={viewDetailsDialog.request.profile_image} />
            <AvatarFallback className="text-lg">
              {viewDetailsDialog.request.username[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{viewDetailsDialog.request.username}</h3>
            <p className="text-sm text-muted-foreground">{viewDetailsDialog.request.email}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Submitted: {new Date(viewDetailsDialog.request.submitted_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Full Legal Name</h3>
          <p className="text-lg font-semibold">{viewDetailsDialog.request.full_name}</p>
        </div>

        {/* ID Card Image */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Government-Issued ID Card</h3>
          <div className="border border-border rounded-lg overflow-hidden bg-secondary/10">
            <img
              src={viewDetailsDialog.request.id_image_url}
              alt="ID Card"
              className="w-full h-auto"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
              }}
            />
          </div>
        </div>

        {/* Selfie Image */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Selfie Photo</h3>
          <div className="border border-border rounded-lg overflow-hidden bg-secondary/10">
            <img
              src={viewDetailsDialog.request.selfie_image_url}
              alt="Selfie"
              className="w-full h-auto"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
              }}
            />
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Status</h3>
          <Badge 
            variant={
              viewDetailsDialog.request.status === 'approved' 
                ? 'default' 
                : viewDetailsDialog.request.status === 'rejected' 
                ? 'destructive' 
                : 'secondary'
            }
            className="text-sm px-3 py-1"
          >
            {viewDetailsDialog.request.status.toUpperCase()}
          </Badge>
        </div>

        {/* Rejection Reason (if rejected) */}
        {viewDetailsDialog.request.status === 'rejected' && viewDetailsDialog.request.rejection_reason && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Rejection Reason</h3>
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                {viewDetailsDialog.request.rejection_reason}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons (only for pending requests) */}
        {viewDetailsDialog.request.status === 'pending' && (
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={() => {
                closeViewDetailsDialog();
                openApproveVerificationDialog(
                  viewDetailsDialog.request.request_id,
                  viewDetailsDialog.request.username
                );
              }}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => {
                closeViewDetailsDialog();
                openRejectVerificationDialog(
                  viewDetailsDialog.request.request_id,
                  viewDetailsDialog.request.username
                );
              }}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </div>
    )}
  </DialogContent>
</Dialog>

{/* Approve Verification Confirmation Dialog */}
<AlertDialog open={approveVerificationDialog.open} onOpenChange={(open) => !open && closeApproveVerificationDialog()}>
  <AlertDialogContent className="border-border max-w-lg">
    <AlertDialogHeader>
      <div className="flex items-start gap-4 mb-2">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 dark:from-green-500/30 dark:to-green-600/30 flex items-center justify-center flex-shrink-0 ring-4 ring-green-500/10">
          <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 pt-1">
          <AlertDialogTitle className="text-2xl mb-2">
            Approve Author Verification
          </AlertDialogTitle>
<div className="space-y-3">
  <p className="text-sm text-muted-foreground">
    Are you sure you want to approve the verification request for:
  </p>
  <div className="bg-secondary/50 dark:bg-secondary/20 rounded-lg p-4 border border-border">
    <p className="font-semibold text-foreground text-lg leading-relaxed">
      {approveVerificationDialog.username}
    </p>
  </div>
  <div className="flex items-start gap-2 text-sm bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
    <p className="text-green-700 dark:text-green-300">
      This user will be granted author status and can start publishing books on BookArc.
    </p>
  </div>
</div>
        </div>
      </div>
    </AlertDialogHeader>
    <AlertDialogFooter className="gap-2 sm:gap-2">
      <AlertDialogCancel className="border-border hover:bg-secondary">
        Cancel
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirmApproveVerification}
        className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg shadow-green-500/20 border-0"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Approve Verification
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* Reject Verification Confirmation Dialog */}
<AlertDialog open={rejectVerificationDialog.open} onOpenChange={(open) => !open && closeRejectVerificationDialog()}>
  <AlertDialogContent className="border-border max-w-lg">
    <AlertDialogHeader>
      <div className="flex items-start gap-4 mb-2">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-500/30 dark:to-red-600/30 flex items-center justify-center flex-shrink-0 ring-4 ring-red-500/10">
          <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 pt-1">
          <AlertDialogTitle className="text-2xl mb-2">
            Reject Verification
          </AlertDialogTitle>
<div className="space-y-3">
  <p className="text-sm text-muted-foreground">
    Are you sure you want to reject the verification request for:
  </p>
  <div className="bg-secondary/50 dark:bg-secondary/20 rounded-lg p-4 border border-border">
    <p className="font-semibold text-foreground text-lg leading-relaxed">
      {rejectVerificationDialog.username}
    </p>
  </div>
  <div className="space-y-2">
    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
      <span>Rejection Reason</span>
      <span className="text-red-500">*</span>
    </label>
    <textarea
      value={verificationRejectionReason}
      onChange={(e) => setVerificationRejectionReason(e.target.value)}
      placeholder="Please explain why this verification is being rejected..."
      className="w-full min-h-[120px] px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
      autoFocus
    />
    {verificationRejectionReason.trim() && (
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <CheckCircle className="w-3 h-3 text-green-500" />
        {verificationRejectionReason.length} characters
      </p>
    )}
  </div>
  <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
    <p className="text-red-700 dark:text-red-300">
      The user will be notified with your feedback. They can resubmit a new verification request.
    </p>
  </div>
</div>
        </div>
      </div>
    </AlertDialogHeader>
    <AlertDialogFooter className="gap-2 sm:gap-2">
      <AlertDialogCancel className="border-border hover:bg-secondary">
        Cancel
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirmRejectVerification}
        disabled={!verificationRejectionReason.trim()}
        className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-lg shadow-red-500/20 border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        <XCircle className="w-4 h-4 mr-2" />
        Reject Verification
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-6">
        <div className="flex flex-col h-full">
          {/* Profile Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Avatar className="w-12 h-12">
                <AvatarImage src={currentUser.avatarUrl} />
                <AvatarFallback className="bg-primary/10">
                  <User className="w-6 h-6 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate">{currentUser.name}</p>
                <p className="text-sm text-muted-foreground truncate">{currentUser.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            <button
              onClick={onNavigateToProfile}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent/10 hover:text-primary transition-colors text-left"
            >
              <User className="w-5 h-5" />
              My Profile
            </button>
          </nav>

          {/* Logout Button */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent/10 hover:text-destructive transition-colors text-left"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header with Section Navigation */}
          <div className="mb-8">
            <h1 className="text-3xl mb-6">Admin Dashboard</h1>
            <div className="flex gap-2 border-b border-border overflow-x-auto">
              <button
                onClick={() => setActiveSection("overview")}
                className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === "overview"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveSection("users")}
                className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === "users"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveSection("authors")}
                className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === "authors"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Authors
              </button>
              <button
  onClick={() => setActiveSection("verification-requests")}
  className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
    activeSection === "verification-requests"
      ? "border-primary text-primary"
      : "border-transparent text-muted-foreground hover:text-foreground"
  }`}
>
  Author Verification Requests
</button>
              <button
                onClick={() => setActiveSection("books")}
                className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === "books"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Books
              </button>
              <button
                onClick={() => setActiveSection("pending-books")}
                className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === "pending-books"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Pending Books
              </button>
              <button
                onClick={() => setActiveSection("reports")}
                className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === "reports"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Reports
              </button>
              <button
                onClick={() => setActiveSection("add-book")}
                className={`px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === "add-book"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Add Book
              </button>
            </div>
          </div>

          {/* Pending Books Section */}
          {activeSection === "pending-books" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl mb-2">Pending Books</h1>
                <p className="text-muted-foreground">Review and approve books submitted by authors</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Books Awaiting Approval</CardTitle>
                  <CardDescription>Review books and approve or reject them</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-2">
                    <Input 
                      placeholder="Search pending books..." 
                      className="max-w-sm"
                      value={pendingBooksSearch}
                      onChange={(e) => setPendingBooksSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePendingBooksSearch()}
                    />
                    <Button onClick={handlePendingBooksSearch} variant="outline">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>

                  {isLoadingPendingBooks ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : pendingBooks.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No pending books</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Author(s)</TableHead>
                            <TableHead>Submitted By</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingBooks.map((book) => (
                            <TableRow key={book.book_id}>
                              <TableCell className="font-medium">{book.title}</TableCell>
                              <TableCell>{book.authors || 'Unknown'}</TableCell>
                              <TableCell>{book.submitted_by?.username || book.uploaded_by_username || 'N/A'}</TableCell>
                              <TableCell>{new Date(book.submitted_at || book.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDetailsDialog(book)}
                                    disabled={processingBookId === book.book_id}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => openApproveDialog(book.book_id, book.title)}
                                    disabled={processingBookId === book.book_id}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {processingBookId === book.book_id ? (
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => openRejectDialog(book.book_id, book.title)}
                                    disabled={processingBookId === book.book_id}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {pendingBooksPage} of {pendingBooksTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingBooksPage(p => Math.max(1, p - 1))}
                            disabled={pendingBooksPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingBooksPage(p => Math.min(pendingBooksTotalPages, p + 1))}
                            disabled={pendingBooksPage === pendingBooksTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

{/* Overview Section */}
{activeSection === "overview" && (
  <div className="space-y-6">
    {/* Stats Grid */}
    {isLoadingStats ? (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {stats.usersGrowth} from last month
            </p>
          </CardContent>
        </Card>

        {/* Total Authors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Authors</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalAuthors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {stats.authorsGrowth} from last month
            </p>
          </CardContent>
        </Card>

        {/* Total Books */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Books</CardTitle>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalBooks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {stats.booksGrowth} from last month
            </p>
          </CardContent>
        </Card>

        {/* Pending Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pending Reports</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.pendingReports}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        {/* ✅ NEW: Pending Author Verifications */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveSection("verification-requests")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pending Verifications</CardTitle>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.pendingVerifications || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Author verification requests
            </p>
          </CardContent>
        </Card>

        {/* ✅ NEW: Pending Books */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveSection("pending-books")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pending Books</CardTitle>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.pendingBooks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Books awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>
    )}

              {/* Recent Reports */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Reports</CardTitle>
                  <CardDescription>Latest reports that need review</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingReports ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : reports.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No pending reports</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Reporter</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.slice(0, 5).map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <Badge variant="outline">{report.type}</Badge>
                            </TableCell>
                            <TableCell>{report.reported}</TableCell>
                            <TableCell>{report.reporter}</TableCell>
                            <TableCell>{report.reason}</TableCell>
                            <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant={report.status === "pending" ? "secondary" : "default"}>
                                {report.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Section */}
          {activeSection === "users" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl mb-2">User Management</h1>
                <p className="text-muted-foreground">Manage registered users and their accounts</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>View and manage user accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-2">
                    <Input 
                      placeholder="Search users..." 
                      className="max-w-sm"
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUsersSearch()}
                    />
                    <Button onClick={handleUsersSearch} variant="outline">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>

                  {isLoadingUsers ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : users.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No users found</p>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.user_id}>
                              <TableCell>{user.username}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(user.join_date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant={user.is_active ? "default" : "destructive"}>
                                    {user.is_active ? 'Active' : 'Deactivated'}
                                  </Badge>
                                  {user.role !== 'admin' && (
                                    <Button
                                      variant={user.is_active ? "destructive" : "default"}
                                      size="sm"
                                      onClick={() => openConfirmDialog(user.user_id, user.username, user.is_active)}
                                      disabled={isTogglingUser === user.user_id}
                                      className={
                                        user.is_active 
                                          ? "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white border-0 shadow-sm" 
                                          : "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white border-0 shadow-sm"
                                      }
                                    >
                                      {isTogglingUser === user.user_id ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        user.is_active ? 'Deactivate' : 'Activate'
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {usersPage} of {usersTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                            disabled={usersPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                            disabled={usersPage === usersTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Authors Section */}
          {activeSection === "authors" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl mb-2">Author Management</h1>
                <p className="text-muted-foreground">View and manage registered authors</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Authors</CardTitle>
                  <CardDescription>Browse verified and unverified authors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-2">
                    <Input 
                      placeholder="Search authors..." 
                      className="max-w-sm"
                      value={authorsSearch}
                      onChange={(e) => setAuthorsSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAuthorsSearch()}
                    />
                    <Button onClick={handleAuthorsSearch} variant="outline">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>

                  {isLoadingAuthors ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : authors.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No authors found</p>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Books</TableHead>
                            <TableHead>Verified</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {authors.map((author) => (
                            <TableRow key={author.author_id}>
                              <TableCell>{author.name}</TableCell>
                              <TableCell>{author.email}</TableCell>
                              <TableCell>{author.book_count || 0}</TableCell>
                              <TableCell>
                                <Badge variant={author.verified ? "default" : "secondary"}>
                                  {author.verified ? 'Verified' : 'Unverified'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {authorsPage} of {authorsTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAuthorsPage(p => Math.max(1, p - 1))}
                            disabled={authorsPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAuthorsPage(p => Math.min(authorsTotalPages, p + 1))}
                            disabled={authorsPage === authorsTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "verification-requests" && (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl mb-2">Author Verification Requests</h1>
      <p className="text-muted-foreground">Review and approve author verification requests</p>
    </div>

    {/* Status Filter */}
    <div className="flex gap-2">
      <Button
        variant={verificationStatus === 'pending' ? 'default' : 'outline'}
        onClick={() => {
          setVerificationStatus('pending');
          setVerificationPage(1);
        }}
      >
        Pending
      </Button>
      <Button
        variant={verificationStatus === 'approved' ? 'default' : 'outline'}
        onClick={() => {
          setVerificationStatus('approved');
          setVerificationPage(1);
        }}
      >
        Approved
      </Button>
      <Button
        variant={verificationStatus === 'rejected' ? 'default' : 'outline'}
        onClick={() => {
          setVerificationStatus('rejected');
          setVerificationPage(1);
        }}
      >
        Rejected
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Verification Requests ({verificationStatus})</CardTitle>
        <CardDescription>Review identity documents and approve authors</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingVerifications ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : verificationRequests.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No {verificationStatus} requests</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Submitted</TableHead>
                  {verificationStatus !== 'pending' && <TableHead>Reviewed</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verificationRequests.map((request) => (
                  <TableRow key={request.request_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={request.profile_image} />
                          <AvatarFallback>{request.username[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{request.username}</div>
                          <div className="text-sm text-muted-foreground">{request.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{request.full_name}</TableCell>
                    <TableCell>
                      {new Date(request.submitted_at).toLocaleDateString()}
                    </TableCell>
                    {verificationStatus !== 'pending' && (
                      <TableCell>
                        {request.reviewed_at && new Date(request.reviewed_at).toLocaleDateString()}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openViewDetailsDialog(request)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {verificationStatus === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openApproveVerificationDialog(
                                request.request_id,
                                request.username
                              )}
                              disabled={processingRequestId === request.request_id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {processingRequestId === request.request_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openRejectVerificationDialog(
                                request.request_id,
                                request.username
                              )}
                              disabled={processingRequestId === request.request_id}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {verificationPage} of {verificationTotalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVerificationPage(p => Math.max(1, p - 1))}
                  disabled={verificationPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVerificationPage(p => Math.min(verificationTotalPages, p + 1))}
                  disabled={verificationPage === verificationTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  </div>
)}

          {/* Books Section */}
          {activeSection === "books" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl mb-2">Book Management</h1>
                <p className="text-muted-foreground">View and manage approved books</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Books</CardTitle>
                  <CardDescription>Browse approved books in the library</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-2">
                    <Input 
                      placeholder="Search books..." 
                      className="max-w-sm"
                      value={booksSearch}
                      onChange={(e) => setBooksSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleBooksSearch()}
                    />
                    <Button onClick={handleBooksSearch} variant="outline">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>

                  {isLoadingBooks ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : books.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No books found</p>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Author(s)</TableHead>
                            <TableHead>Genre(s)</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {books.map((book) => (
                            <TableRow key={book.book_id}>
                              <TableCell className="font-medium">{book.title}</TableCell>
                              <TableCell>{book.authors || 'Unknown'}</TableCell>
                              <TableCell>{book.genres || 'N/A'}</TableCell>
                              <TableCell>{book.average_rating?.toFixed(1) || '0.0'}</TableCell>
                              <TableCell>
                                <Badge variant="default">{book.approval_status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Page {booksPage} of {booksTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBooksPage(p => Math.max(1, p - 1))}
                            disabled={booksPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBooksPage(p => Math.min(booksTotalPages, p + 1))}
                            disabled={booksPage === booksTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reports Section */}
          {activeSection === "reports" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl mb-2">Report Management</h1>
                <p className="text-muted-foreground">Review and handle user reports</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Reports</CardTitle>
                  <CardDescription>Reports that require action</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingReports ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : reports.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No pending reports</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Reporter</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <Badge variant="outline">{report.type}</Badge>
                            </TableCell>
                            <TableCell>{report.reported}</TableCell>
                            <TableCell>{report.reporter}</TableCell>
                            <TableCell>{report.reason}</TableCell>
                            <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant={report.status === "pending" ? "secondary" : "default"}>
                                {report.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add Book Section */}
          {activeSection === "add-book" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl mb-2">Add New Book</h1>
                <p className="text-muted-foreground">Manually add a book to the library</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Book Information</CardTitle>
                  <CardDescription>Enter the details for the new book</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitBook} className="space-y-6">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={bookForm.title}
                        onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                        placeholder="Enter book title"
                        required
                      />
                    </div>

                    {/* Summary */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Summary</label>
                      <textarea
                        value={bookForm.summary}
                        onChange={(e) => setBookForm({ ...bookForm, summary: e.target.value })}
                        placeholder="Enter book summary or description"
                        className="w-full min-h-[100px] px-3 py-2 rounded-md border border-border bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* ISBN */}
                    <div>
                      <label className="block text-sm font-medium mb-2">ISBN</label>
                      <Input
                        value={bookForm.isbn}
                        onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                        placeholder="Enter ISBN"
                      />
                    </div>

                    {/* Publish Date */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Publish Date</label>
                      <Input
                        type="date"
                        value={bookForm.publish_date}
                        onChange={(e) => setBookForm({ ...bookForm, publish_date: e.target.value })}
                      />
                    </div>

                    {/* Cover Image URL */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Cover Image URL</label>
                      <Input
                        value={bookForm.cover_image_url}
                        onChange={(e) => setBookForm({ ...bookForm, cover_image_url: e.target.value })}
                        placeholder="https://example.com/cover.jpg"
                        type="url"
                      />
                    </div>

                    {/* Authors */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Authors <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        {bookForm.authors.map((author, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={author}
                              onChange={(e) => handleAuthorChange(index, e.target.value)}
                              placeholder={`Author ${index + 1}`}
                            />
                            {bookForm.authors.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveAuthorField(index)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddAuthorField}
                        >
                          Add Another Author
                        </Button>
                      </div>
                    </div>

                    {/* Genres */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Genres <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        {bookForm.genres.map((genre, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={genre}
                              onChange={(e) => handleGenreChange(index, e.target.value)}
                              placeholder={`Genre ${index + 1}`}
                            />
                            {bookForm.genres.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveGenreField(index)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddGenreField}
                        >
                          Add Another Genre
                        </Button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmittingBook}
                        className="flex-1"
                      >
                        {isSubmittingBook ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Adding Book...
                          </>
                        ) : (
                          'Add Book'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setBookForm({
                            title: '',
                            summary: '',
                            isbn: '',
                            publish_date: '',
                            cover_image_url: '',
                            source_name: 'Manual',
                            authors: [''],
                            genres: ['']
                          });
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
