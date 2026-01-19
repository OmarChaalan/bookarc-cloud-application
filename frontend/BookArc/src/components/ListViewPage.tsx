import { useState, useEffect } from "react";
import { BookMarked, ChevronLeft, Star, Plus, Trash2, BookOpen, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { listBookService } from "../services/listBookService";
import { toast } from "sonner";

interface Book {
  book_id: number;
  title: string;
  cover_image_url?: string;
  added_at: string;
  authors?: string[];
  average_rating?: number;
  genre?: string;
}

interface ListViewPageProps {
  list: {
    id: number;
    name: string;
    count: number;
    icon: any;
  };
  onBack: () => void;
  onLogoClick: () => void;
  onBookClick: (bookId: number) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onListUpdated?: () => void;
  readonly?: boolean; // New: if true, hide delete buttons
  userId?: number; // New: specific user's list to view
}

export function ListViewPage({
  list,
  onBack,
  onLogoClick,
  onBookClick,
  theme,
  onToggleTheme,
  onListUpdated,
  readonly = false,
  userId,
}: ListViewPageProps) {
  const ListIcon = list.icon;
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingBookId, setRemovingBookId] = useState<number | null>(null);

  useEffect(() => {
    loadBooks();
  }, [list.id]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      console.log('📚 Loading books for list:', list.id);
      
      const response = await listBookService.getListById(list.id);
      
      console.log('✅ Books loaded:', response);
      setBooks(response.list.books || []);
    } catch (error: any) {
      console.error('❌ Failed to load books:', error);
      toast.error('Failed to load books from this list');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBook = async (book: Book) => {
    try {
      setRemovingBookId(book.book_id);
      
      await listBookService.removeBookFromList(list.id, book.book_id);
      
      // Update local state
      setBooks(prev => prev.filter(b => b.book_id !== book.book_id));
      
      toast.success(`Removed "${book.title}" from ${list.name}`);
      
      // Notify parent to update list count
      onListUpdated?.();
    } catch (error: any) {
      console.error('Failed to remove book:', error);
      toast.error('Failed to remove book from list');
    } finally {
      setRemovingBookId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <BookMarked className="w-6 h-6 text-primary" />
            <span className="text-xl">BookArc</span>
          </button>

          {/* Right: Icons */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <Button variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* List Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <ListIcon className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl mb-2">{list.name}</h1>
              <p className="text-muted-foreground">
                {books.length} {books.length === 1 ? "book" : "books"} in this list
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : books.length > 0 ? (
          /* Books Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => (
              <Card key={book.book_id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="relative">
                    <div 
                      className="aspect-[2/3] overflow-hidden cursor-pointer bg-muted"
                      onClick={() => onBookClick(book.book_id)}
                    >
                      {book.cover_image_url ? (
                        <img
                          src={book.cover_image_url}
                          alt={book.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                      onClick={() => handleRemoveBook(book)}
                      disabled={removingBookId === book.book_id}
                      style={{ display: readonly ? 'none' : 'flex' }}
                    >
                      {removingBookId === book.book_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="p-4">
                    <h3 
                      className="font-semibold line-clamp-2 mb-1 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => onBookClick(book.book_id)}
                    >
                      {book.title}
                    </h3>
                    
                    {book.authors && book.authors.length > 0 && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                        {book.authors.join(', ')}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      {book.average_rating !== undefined && book.average_rating !== null && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm">{Number(book.average_rating).toFixed(1)}</span>
                        </div>
                      )}
                      {book.genre && (
                        <Badge variant="outline" className="text-xs">
                          {book.genre}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      Added {new Date(book.added_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">No books yet</CardTitle>
              <CardDescription className="text-center max-w-md mb-6">
                This list is empty. Browse books and add them to this list to start building your collection!
              </CardDescription>
              <Button onClick={onLogoClick} className="gap-2">
                <Plus className="w-4 h-4" />
                Browse Books
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}