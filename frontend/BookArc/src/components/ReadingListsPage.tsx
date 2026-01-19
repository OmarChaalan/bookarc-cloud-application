import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { BookMarked, ArrowLeft, Moon, Sun, X, Edit2, Trash2, Star } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
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
import React from "react"; // Explicitly importing React is good practice, but not strictly needed for Ref in TS

interface Book {
  id: number;
  title: string;
  author: string;
  rating: number;
  totalRatings: number;
  cover: string;
  genre: string;
  description: string;
  publishYear: number;
}

interface ReadingListsPageProps {
  onBack: () => void;
  onBookSelect?: (book: Book) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

type ListType = "wantToRead" | "completed" | "dropped";

interface DraggableBookCardProps {
  book: Book;
  listType: ListType;
  onRemove: (id: number, listType: ListType) => void;
  onMove: (bookId: number, fromList: ListType, toList: ListType) => void;
  onClick?: () => void;
}

const ItemTypes = {
  BOOK: "book",
};

function DraggableBookCard({ book, listType, onRemove, onMove, onClick }: DraggableBookCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BOOK,
    item: { bookId: book.id, fromList: listType },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <>
      <div
        // FIX: Use double assertion to satisfy strict TypeScript checking
        ref={drag as unknown as React.Ref<HTMLDivElement>} 
        className={`group relative bg-card border border-border rounded-lg overflow-hidden hover:shadow-xl hover:border-primary/40 transition-all duration-300 ${
          isDragging ? "opacity-50" : "opacity-100"
        }`}
        style={{ cursor: "move" }}
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-muted" onClick={onClick}>
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-4">
          <h3 className="mb-1 line-clamp-1" onClick={onClick}>{book.title}</h3>
          <p className="text-muted-foreground mb-3 line-clamp-1">{book.author}</p>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm">{book.rating}</span>
              <span className="text-sm text-muted-foreground">({book.totalRatings})</span>
            </div>
            <span className="text-xs text-muted-foreground">{book.genre}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from list?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{book.title}" from your reading list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRemove(book.id, listType);
                setShowDeleteDialog(false);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface DroppableListProps {
  listType: ListType;
  books: Book[];
  onRemove: (id: number, listType: ListType) => void;
  onMove: (bookId: number, fromList: ListType, toList: ListType) => void;
  onBookSelect?: (book: Book) => void;
}

function DroppableList({ listType, books, onRemove, onMove, onBookSelect }: DroppableListProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.BOOK,
    drop: (item: { bookId: number; fromList: ListType }) => {
      if (item.fromList !== listType) {
        onMove(item.bookId, item.fromList, listType);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      // FIX: Use double assertion to satisfy strict TypeScript checking
      ref={drop as unknown as React.Ref<HTMLDivElement>}
      className={`min-h-[400px] p-6 rounded-lg border-2 border-dashed transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      
      {books.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <BookMarked className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No books in this list</p>
            <p className="text-sm mt-1">Drag books here to add them</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {books.map((book) => (
            <DraggableBookCard
              key={book.id}
              book={book}
              listType={listType}
              onRemove={onRemove}
              onMove={onMove}
              onClick={() => onBookSelect?.(book)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ReadingListsPage({ onBack, onBookSelect, theme, onToggleTheme }: ReadingListsPageProps) {
  const [activeTab, setActiveTab] = useState<ListType>("wantToRead");

  // Mock data - in a real app, this would come from a backend
  const [lists, setLists] = useState<Record<ListType, Book[]>>({
    wantToRead: [
      {
        id: 1,
        title: "The Midnight Library",
        author: "Matt Haig",
        rating: 4.5,
        totalRatings: 12847,
        cover: "https://images.unsplash.com/photo-1661936901394-a993c79303c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib29rJTIwY292ZXIlMjBmaWN0aW9ufGVufDF8fHx8MTc2MTgzMTA2MHww&ixlib=rb-4.1.0&q=80&w=1080",
        genre: "Fiction",
        description: "Between life and death there is a library, and within that library, the shelves go on forever.",
        publishYear: 2020,
      },
      {
        id: 2,
        title: "Project Hail Mary",
        author: "Andy Weir",
        rating: 4.7,
        totalRatings: 18293,
        cover: "https://images.unsplash.com/photo-1711185900806-bf85e7fe7767?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxmYW50YXN5JTIwYm9vayUyMGNvdmVyfGVufDF8fHx8MTc2MTc3NDExMHww&ixlib=rb-4.1.0&q=80&w=1080",
        genre: "Sci-Fi",
        description: "A lone astronaut must save the earth from disaster in this incredible new science-based thriller.",
        publishYear: 2021,
      },
      {
        id: 5,
        title: "The Measure",
        author: "Nikki Erlick",
        rating: 4.3,
        totalRatings: 3842,
        cover: "https://images.unsplash.com/photo-1760120482171-d9d5468f75fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxjbGFzc2ljJTIwbGl0ZXJhdHVyZSUyMGJvb2t8ZW58MXx8fHwxNzYxNzQ4NDEwfDA&ixlib=rb-4.1.0&q=80&w=1080",
        genre: "Contemporary",
        description: "Eight ordinary people. One extraordinary choice.",
        publishYear: 2022,
      },
    ],
    completed: [
      {
        id: 3,
        title: "The Seven Husbands of Evelyn Hugo",
        author: "Taylor Jenkins Reid",
        rating: 4.6,
        totalRatings: 15672,
        cover: "https://images.unsplash.com/photo-1739521949473-a703e0536ddf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBib29rJTIwY292ZXJ8ZW58MXx8fHwxNzYxNzMxNjY3fDA&ixlib=rb-4.1.0&q=80&w=1080",
        genre: "Historical Fiction",
        description: "A reclusive Hollywood icon opens up about her glamorous and scandalous life.",
        publishYear: 2017,
      },
      {
        id: 6,
        title: "Happy Place",
        author: "Emily Henry",
        rating: 4.2,
        totalRatings: 5621,
        cover: "https://images.unsplash.com/photo-1661936901394-a993c79303c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxib29rJTIwY292ZXIlMjBmaWN0aW9ufGVufDF8fHx8MTc2MTgzMTA2MHww&ixlib=rb-4.1.0&q=80&w=1080",
        genre: "Romance",
        description: "A couple who broke up months ago pretend to still be together for one last week.",
        publishYear: 2023,
      },
    ],
    dropped: [
      {
        id: 4,
        title: "The Silent Patient",
        author: "Alex Michaelides",
        rating: 4.4,
        totalRatings: 21456,
        cover: "https://images.unsplash.com/photo-1760696473709-a7da66ee87a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxteXN0ZXJ5JTIwbm92ZWwlMjBjb3ZlcnxlbnwxfHx8fDE3NjE4MzE1NTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
        genre: "Mystery",
        description: "A famous painter married to an in-demand fashion photographer becomes a household name.",
        publishYear: 2019,
      },
    ],
  });

  const handleRemoveBook = (bookId: number, listType: ListType) => {
    setLists((prev) => ({
      ...prev,
      [listType]: prev[listType].filter((book) => book.id !== bookId),
    }));
  };

  const handleMoveBook = (bookId: number, fromList: ListType, toList: ListType) => {
    const book = lists[fromList].find((b) => b.id === bookId);
    if (!book) return;

    setLists((prev) => ({
      ...prev,
      [fromList]: prev[fromList].filter((b) => b.id !== bookId),
      [toList]: [...prev[toList], book],
    }));
  };

  const getListStats = () => {
    return {
      wantToRead: lists.wantToRead.length,
      completed: lists.completed.length,
      dropped: lists.dropped.length,
      total: lists.wantToRead.length + lists.completed.length + lists.dropped.length,
    };
  };

  const stats = getListStats();

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <BookMarked className="w-6 h-6 text-primary" />
                <span className="text-xl">My Reading Lists</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              className="hover:bg-accent"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Books</div>
              <div className="text-2xl">{stats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Want to Read</div>
              <div className="text-2xl text-primary">{stats.wantToRead}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Completed</div>
              <div className="text-2xl text-green-500">{stats.completed}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Dropped</div>
              <div className="text-2xl text-orange-500">{stats.dropped}</div>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="p-4 mb-6 bg-accent/10 border-accent/20">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Drag and drop books between lists to organize your reading. Click on a book to view its details.
            </p>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ListType)}>
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
              <TabsTrigger value="wantToRead" className="relative">
                Want to Read
                {stats.wantToRead > 0 && (
                  <Badge className="ml-2 bg-primary text-primary-foreground">
                    {stats.wantToRead}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="relative">
                Completed
                {stats.completed > 0 && (
                  <Badge className="ml-2 bg-green-500 text-white">
                    {stats.completed}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="dropped" className="relative">
                Dropped
                {stats.dropped > 0 && (
                  <Badge className="ml-2 bg-orange-500 text-white">
                    {stats.dropped}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wantToRead">
              <DroppableList
                listType="wantToRead"
                books={lists.wantToRead}
                onRemove={handleRemoveBook}
                onMove={handleMoveBook}
                onBookSelect={onBookSelect}
              />
            </TabsContent>

            <TabsContent value="completed">
              <DroppableList
                listType="completed"
                books={lists.completed}
                onRemove={handleRemoveBook}
                onMove={handleMoveBook}
                onBookSelect={onBookSelect}
              />
            </TabsContent>

            <TabsContent value="dropped">
              <DroppableList
                listType="dropped"
                books={lists.dropped}
                onRemove={handleRemoveBook}
                onMove={handleMoveBook}
                onBookSelect={onBookSelect}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DndProvider>
  );
}