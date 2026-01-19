import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Search, CheckCircle, XCircle, Clock, Eye, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../services/apiService";

export function AdminPendingBooksSection() {
  const [pendingBooks, setPendingBooks] = useState<Array<any>>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPendingBooks();
  }, [page]);

  const loadPendingBooks = async () => {
    try {
      setIsLoadingBooks(true);
      const data = await apiService.getAdminPendingBooks({
        page,
        limit: 20,
        search: searchQuery || undefined
      });
      setPendingBooks(data.books);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      console.error("Failed to load pending books:", error);
      toast.error("Failed to load pending books");
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadPendingBooks();
  };

  const handleApprove = async (book: any) => {
    if (!confirm(`Are you sure you want to approve "${book.title}"?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await apiService.approveBook(book.book_id);
      toast.success(`"${book.title}" has been approved!`);
      loadPendingBooks();
    } catch (error: any) {
      console.error("Failed to approve book:", error);
      toast.error(error.message || "Failed to approve book");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBook) return;

    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsProcessing(true);
    try {
      await apiService.rejectBook(selectedBook.book_id, rejectionReason.trim());
      toast.success(`"${selectedBook.title}" has been rejected`);
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedBook(null);
      loadPendingBooks();
    } catch (error: any) {
      console.error("Failed to reject book:", error);
      toast.error(error.message || "Failed to reject book");
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectDialog = (book: any) => {
    setSelectedBook(book);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const openDetailsDialog = (book: any) => {
    setSelectedBook(book);
    setShowDetailsDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Pending Book Approvals</h1>
        <p className="text-muted-foreground">Review and approve books submitted by authors</p>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Details</DialogTitle>
            <DialogDescription>Review complete book information</DialogDescription>
          </DialogHeader>
          {selectedBook && (
            <div className="space-y-6">
              <div className="flex gap-6">
                {selectedBook.cover_image_url ? (
                  <img
                    src={selectedBook.cover_image_url}
                    alt={selectedBook.title}
                    className="w-40 h-60 object-cover rounded-lg border border-border"
                  />
                ) : (
                  <div className="w-40 h-60 bg-muted rounded-lg border border-border flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedBook.title}</h3>
                    <p className="text-muted-foreground">{selectedBook.authors}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Genres:</span>
                      <p className="font-medium">{selectedBook.genres}</p>
                    </div>
                    {selectedBook.isbn && (
                      <div>
                        <span className="text-muted-foreground">ISBN:</span>
                        <p className="font-medium">{selectedBook.isbn}</p>
                      </div>
                    )}
                    {selectedBook.publish_date && (
                      <div>
                        <span className="text-muted-foreground">Publish Date:</span>
                        <p className="font-medium">
                          {new Date(selectedBook.publish_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Source:</span>
                      <p className="font-medium">{selectedBook.source_name}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedBook.summary && (
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedBook.summary}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Submission Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Submitted By:</span>
                    <p className="font-medium">{selectedBook.submitted_by?.username}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedBook.submitted_by?.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted At:</span>
                    <p className="font-medium">
                      {new Date(selectedBook.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              Close
            </Button>
            {selectedBook && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    openRejectDialog(selectedBook);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleApprove(selectedBook);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Book</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedBook?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this book is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
                setSelectedBook(null);
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Book
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Books</CardTitle>
          <CardDescription>Books awaiting approval from authors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Search books by title, author, or email..."
              className="max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {isLoadingBooks ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : pendingBooks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending books to review</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Author(s)</TableHead>
                    <TableHead>Genre(s)</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingBooks.map((book) => (
                    <TableRow key={book.book_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {book.cover_image_url ? (
                            <img
                              src={book.cover_image_url}
                              alt={book.title}
                              className="w-10 h-14 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{book.title}</div>
                            {book.isbn && (
                              <div className="text-xs text-muted-foreground">
                                ISBN: {book.isbn}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{book.authors}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{book.genres}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{book.submitted_by?.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {book.submitted_by?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(book.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsDialog(book)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(book)}
                            disabled={isProcessing}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openRejectDialog(book)}
                            disabled={isProcessing}
                          >
                            <XCircle className="w-4 h-4" />
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
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
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
  );
}