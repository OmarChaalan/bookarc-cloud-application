import { useState, useEffect } from "react";
import { BookOpen, Search, CheckCircle, XCircle, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { apiService } from "../services/apiService"; // ✅ IMPORT REAL API SERVICE
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

export function AdminPendingBooksSection() {
  const [books, setBooks] = useState<Array<any>>([]);
  const [booksPage, setBooksPage] = useState(1);
  const [booksTotalPages, setBooksTotalPages] = useState(1);
  const [booksSearch, setBooksSearch] = useState("");
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [processingBookId, setProcessingBookId] = useState<number | null>(null);

  // State for confirmation dialogs
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

  useEffect(() => {
    loadPendingBooks();
  }, [booksPage]);

  const loadPendingBooks = async () => {
    try {
      setIsLoadingBooks(true);
      const data = await apiService.getAdminPendingBooks({
        page: booksPage,
        limit: 20,
        search: booksSearch || undefined
      });
      setBooks(data.books);
      setBooksTotalPages(data.totalPages);
    } catch (error: any) {
      console.error("Failed to load pending books:", error);
      toast.error("Failed to load pending books");
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const handleBooksSearch = () => {
    setBooksPage(1);
    loadPendingBooks();
  };

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
      setBooks(books.filter(book => book.book_id !== bookId));
      
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
      setBooks(books.filter(book => book.book_id !== bookId));
      
      toast.success(result.message || "Book rejected successfully");
    } catch (error: any) {
      console.error("Failed to reject book:", error);
      toast.error(error.message || "Failed to reject book");
    } finally {
      setProcessingBookId(null);
    }
  };

  return (
    <>
      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialog.open} onOpenChange={(open) => !open && closeApproveDialog()}>
        <AlertDialogContent className="border-border max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <AlertDialogTitle className="text-xl">
                Approve Book
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to approve the book{' '}
              <span className="font-semibold text-foreground block mt-2 text-lg">
                "{approveDialog.bookTitle}"
              </span>
              <span className="block mt-3 text-muted-foreground">
                This book will be published and visible to all users.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApprove}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white"
            >
              Approve Book
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialog.open} onOpenChange={(open) => !open && closeRejectDialog()}>
        <AlertDialogContent className="border-border max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl">
                Reject Book
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to reject the book{' '}
              <span className="font-semibold text-foreground block mt-2 text-lg">
                "{rejectDialog.bookTitle}"
              </span>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground block mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-border bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              disabled={!rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    closeDetailsDialog();
                    openRejectDialog(detailsDialog.book.book_id, detailsDialog.book.title);
                  }}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
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
                    {books.map((book) => (
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
    </>
  );
}