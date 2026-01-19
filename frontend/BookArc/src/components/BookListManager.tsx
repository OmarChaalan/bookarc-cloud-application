// src/components/BookListManager.tsx
import { useState, useEffect } from 'react';
import { Trash2, Loader2, BookOpen, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import { listBookService } from '../services/listBookService';

interface Book {
  book_id: number;
  title: string;
  cover_image_url?: string;
  added_at: string;
  authors?: string[];
  average_rating?: number;
}

interface BookListManagerProps {
  listId: number;
  listName: string;
  onViewBook?: (bookId: number) => void;
  onBookRemoved?: () => void;
}

export function BookListManager({
  listId,
  listName,
  onViewBook,
  onBookRemoved,
}: BookListManagerProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingBookId, setRemovingBookId] = useState<number | null>(null);
  const [bookToRemove, setBookToRemove] = useState<Book | null>(null);

  useEffect(() => {
    loadBooks();
  }, [listId]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await listBookService.getListById(listId);
      setBooks(response.list.books || []);
    } catch (error: any) {
      console.error('Failed to load books:', error);
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBook = async (book: Book) => {
    setBookToRemove(book);
  };

  const confirmRemoveBook = async () => {
    if (!bookToRemove) return;

    setRemovingBookId(bookToRemove.book_id);
    
    try {
      await listBookService.removeBookFromList(listId, bookToRemove.book_id);
      setBooks(prev => prev.filter(b => b.book_id !== bookToRemove.book_id));
      toast.success(`Removed "${bookToRemove.title}" from ${listName}`);
      onBookRemoved?.();
    } catch (error: any) {
      console.error('Failed to remove book:', error);
      toast.error(error.message || 'Failed to remove book');
    } finally {
      setRemovingBookId(null);
      setBookToRemove(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No books in this list</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start adding books to your "{listName}" list
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {books.map((book) => (
          <Card key={book.book_id} className="group hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="relative aspect-[2/3] mb-3 rounded-md overflow-hidden bg-muted">
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {onViewBook && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onViewBook(book.book_id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveBook(book)}
                    disabled={removingBookId === book.book_id}
                  >
                    {removingBookId === book.book_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                {book.title}
              </h3>
              
              {book.authors && book.authors.length > 0 && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                  {book.authors.join(', ')}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                {book.average_rating !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    ⭐ {book.average_rating.toFixed(1)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Added {new Date(book.added_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!bookToRemove} onOpenChange={(open) => !open && setBookToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Book from List?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{bookToRemove?.title}" from your {listName} list? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveBook}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}