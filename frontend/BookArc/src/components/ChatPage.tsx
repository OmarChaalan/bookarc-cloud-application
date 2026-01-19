import { useState } from "react";
import { ArrowLeft, BookMarked, Search, MessageSquare, ThumbsUp, Flag, Reply, Send, MoreVertical, BookOpen, Users, TrendingUp, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
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
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface ChatPost {
  id: number;
  userId: string;
  userName: string;
  userInitials: string;
  bookId: number;
  bookTitle: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies: ChatReply[];
}

interface ChatReply {
  id: number;
  userId: string;
  userName: string;
  userInitials: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
}

interface ChatPageProps {
  onBack: () => void;
  onLogoClick?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function ChatPage({ onBack, onLogoClick, theme, onToggleTheme }: ChatPageProps) {
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [replyToPost, setReplyToPost] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [reportPostId, setReportPostId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");

  // Mock data for chat posts
  const [chatPosts, setChatPosts] = useState<ChatPost[]>([
    {
      id: 1,
      userId: "user1",
      userName: "Emma Wilson",
      userInitials: "EW",
      bookId: 1,
      bookTitle: "The Midnight Library",
      content: "Just finished this book and I'm still processing! The concept of exploring different life paths is so fascinating. What did you all think about Nora's journey?",
      timestamp: "2 hours ago",
      likes: 24,
      isLiked: false,
      replies: [
        {
          id: 101,
          userId: "user2",
          userName: "Alex Chen",
          userInitials: "AC",
          content: "I loved it! The way Matt Haig explores regret and second chances really resonated with me. That ending though...",
          timestamp: "1 hour ago",
          likes: 8,
          isLiked: true,
        },
        {
          id: 102,
          userId: "user3",
          userName: "Sarah Johnson",
          userInitials: "SJ",
          content: "Agreed! The philosophical aspects were so well done. Made me think about my own life choices.",
          timestamp: "45 minutes ago",
          likes: 5,
          isLiked: false,
        }
      ]
    },
    {
      id: 2,
      userId: "user4",
      userName: "Michael Torres",
      userInitials: "MT",
      bookId: 1,
      bookTitle: "The Midnight Library",
      content: "Can we talk about the librarian character? Mrs. Elm was such a powerful presence in the story. Who else felt emotionally connected to her?",
      timestamp: "5 hours ago",
      likes: 15,
      isLiked: true,
      replies: [
        {
          id: 201,
          userId: "user5",
          userName: "Lisa Parker",
          userInitials: "LP",
          content: "Mrs. Elm reminded me of my own high school librarian! Such a touching character.",
          timestamp: "4 hours ago",
          likes: 3,
          isLiked: false,
        }
      ]
    },
    {
      id: 3,
      userId: "user6",
      userName: "David Kim",
      userInitials: "DK",
      bookId: 2,
      bookTitle: "Project Hail Mary",
      content: "The science in this book is AMAZING! Andy Weir really did his research. Rocky is my favorite character ever! 🎵",
      timestamp: "3 hours ago",
      likes: 42,
      isLiked: true,
      replies: [
        {
          id: 301,
          userId: "user7",
          userName: "Rachel Green",
          userInitials: "RG",
          content: "Rocky! The relationship between Ryland and Rocky was so heartwarming. Best sci-fi buddy story!",
          timestamp: "2 hours ago",
          likes: 18,
          isLiked: true,
        }
      ]
    },
    {
      id: 4,
      userId: "user8",
      userName: "James Anderson",
      userInitials: "JA",
      bookId: 2,
      bookTitle: "Project Hail Mary",
      content: "Anyone else reading this for the second time? I'm catching so many details I missed the first time around.",
      timestamp: "1 day ago",
      likes: 31,
      isLiked: false,
      replies: []
    },
    {
      id: 5,
      userId: "user9",
      userName: "Olivia Martinez",
      userInitials: "OM",
      bookId: 3,
      bookTitle: "The Seven Husbands of Evelyn Hugo",
      content: "This book absolutely destroyed me (in the best way). Evelyn and Celia's story... I'm not crying, you're crying! 😭",
      timestamp: "6 hours ago",
      likes: 56,
      isLiked: true,
      replies: [
        {
          id: 401,
          userId: "user10",
          userName: "Sophia Lee",
          userInitials: "SL",
          content: "SAME! This book had me sobbing at 2am. Taylor Jenkins Reid is a master storyteller.",
          timestamp: "5 hours ago",
          likes: 22,
          isLiked: true,
        }
      ]
    }
  ]);

  // Books with active discussions
  const booksWithChats = [
    { id: 1, title: "The Midnight Library", author: "Matt Haig", posts: 12, participants: 45 },
    { id: 2, title: "Project Hail Mary", author: "Andy Weir", posts: 28, participants: 89 },
    { id: 3, title: "The Seven Husbands of Evelyn Hugo", author: "Taylor Jenkins Reid", posts: 34, participants: 102 },
    { id: 4, title: "The Silent Patient", author: "Alex Michaelides", posts: 19, participants: 67 },
  ];

  const filteredBooks = booksWithChats.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPosts = selectedBook 
    ? chatPosts.filter(post => post.bookId === selectedBook)
    : chatPosts;

  const handleLikePost = (postId: number) => {
    setChatPosts(chatPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
          isLiked: !post.isLiked
        };
      }
      return post;
    }));
  };

  const handleLikeReply = (postId: number, replyId: number) => {
    setChatPosts(chatPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          replies: post.replies.map(reply => {
            if (reply.id === replyId) {
              return {
                ...reply,
                likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1,
                isLiked: !reply.isLiked
              };
            }
            return reply;
          })
        };
      }
      return post;
    }));
  };

  const handleSubmitPost = () => {
    if (!newPostContent.trim() || !selectedBook) return;

    const selectedBookData = booksWithChats.find(b => b.id === selectedBook);
    if (!selectedBookData) return;

    const newPost: ChatPost = {
      id: Date.now(),
      userId: "currentUser",
      userName: "You",
      userInitials: "YO",
      bookId: selectedBook,
      bookTitle: selectedBookData.title,
      content: newPostContent,
      timestamp: "Just now",
      likes: 0,
      isLiked: false,
      replies: []
    };

    setChatPosts([newPost, ...chatPosts]);
    setNewPostContent("");
  };

  const handleSubmitReply = () => {
    if (!replyContent.trim() || replyToPost === null) return;

    setChatPosts(chatPosts.map(post => {
      if (post.id === replyToPost) {
        const newReply: ChatReply = {
          id: Date.now(),
          userId: "currentUser",
          userName: "You",
          userInitials: "YO",
          content: replyContent,
          timestamp: "Just now",
          likes: 0,
          isLiked: false
        };
        return {
          ...post,
          replies: [...post.replies, newReply]
        };
      }
      return post;
    }));

    setReplyContent("");
    setReplyToPost(null);
  };

  const handleReportPost = () => {
    if (!reportReason.trim()) return;
    // In a real app, this would send a report to the backend
    console.log(`Reporting post ${reportPostId} for: ${reportReason}`);
    setReportPostId(null);
    setReportReason("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <BookMarked className="w-6 h-6 text-primary" />
            <span className="text-xl">BookArc</span>
          </button>

          {/* Right: Icons */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <Button variant="ghost" size="sm" onClick={onLogoClick}>
              Back
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl mb-2 flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-primary" />
              Book Discussions
            </h1>
            <p className="text-muted-foreground">
              Join book-specific conversations, share your thoughts, and connect with fellow readers
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar - Books List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Discussions</CardTitle>
                  <CardDescription>Select a book to join the conversation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search books..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Separator />

                  {/* Books List */}
                  <ScrollArea className="h-[calc(100vh-28rem)]">
                    <div className="space-y-2">
                      <Button
                        variant={selectedBook === null ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setSelectedBook(null)}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        All Books
                        <Badge variant="secondary" className="ml-auto">
                          {chatPosts.length}
                        </Badge>
                      </Button>
                      {filteredBooks.map((book) => (
                        <Button
                          key={book.id}
                          variant={selectedBook === book.id ? "secondary" : "ghost"}
                          className="w-full justify-start text-left h-auto py-3"
                          onClick={() => setSelectedBook(book.id)}
                        >
                          <BookOpen className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{book.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {book.author}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {book.posts}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {book.participants}
                              </span>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Main Content - Chat Posts */}
            <div className="lg:col-span-2 space-y-6">
              {/* New Post Form */}
              {selectedBook && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Start a Discussion</CardTitle>
                    <CardDescription>
                      Share your thoughts about {booksWithChats.find(b => b.id === selectedBook)?.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="What would you like to discuss about this book?"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSubmitPost}
                        disabled={!newPostContent.trim()}
                        className="gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Post
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Posts List */}
              <div className="space-y-4">
                {filteredPosts.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <h3 className="mb-2">No discussions yet</h3>
                      <p className="text-muted-foreground text-sm">
                        {selectedBook 
                          ? "Be the first to start a discussion about this book!"
                          : "Select a book to view and join discussions"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredPosts.map((post) => (
                    <Card key={post.id}>
                      <CardContent className="pt-6">
                        {/* Post Header */}
                        <div className="flex items-start gap-3 mb-4">
                          <Avatar className="w-10 h-10 border-2 border-primary/20">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {post.userInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span>{post.userName}</span>
                                  {!selectedBook && (
                                    <Badge variant="secondary" className="text-xs">
                                      {post.bookTitle}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {post.timestamp}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setReportPostId(post.id)}
                                  >
                                    <Flag className="w-4 h-4 mr-2" />
                                    Report Post
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>

                        {/* Post Content */}
                        <p className="mb-4 text-foreground">{post.content}</p>

                        {/* Post Actions */}
                        <div className="flex items-center gap-4 mb-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLikePost(post.id)}
                            className={post.isLiked ? "text-primary" : ""}
                          >
                            <ThumbsUp className={`w-4 h-4 mr-1 ${post.isLiked ? "fill-current" : ""}`} />
                            {post.likes}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyToPost(post.id)}
                          >
                            <Reply className="w-4 h-4 mr-1" />
                            Reply
                          </Button>
                        </div>

                        {/* Replies */}
                        {post.replies.length > 0 && (
                          <>
                            <Separator className="my-4" />
                            <div className="space-y-4">
                              {post.replies.map((reply) => (
                                <div key={reply.id} className="flex items-start gap-3 pl-4 border-l-2 border-border">
                                  <Avatar className="w-8 h-8 border border-primary/20">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {reply.userInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm">{reply.userName}</span>
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {reply.timestamp}
                                      </span>
                                    </div>
                                    <p className="text-sm text-foreground mb-2">{reply.content}</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleLikeReply(post.id, reply.id)}
                                      className={reply.isLiked ? "text-primary" : ""}
                                    >
                                      <ThumbsUp className={`w-3 h-3 mr-1 ${reply.isLiked ? "fill-current" : ""}`} />
                                      {reply.likes}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Reply Form */}
                        {replyToPost === post.id && (
                          <>
                            <Separator className="my-4" />
                            <div className="flex gap-3 pl-4">
                              <Avatar className="w-8 h-8 border border-primary/20">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  YO
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-2">
                                <Textarea
                                  placeholder="Write your reply..."
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  rows={2}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setReplyToPost(null);
                                      setReplyContent("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSubmitReply}
                                    disabled={!replyContent.trim()}
                                    className="gap-2"
                                  >
                                    <Send className="w-3 h-3" />
                                    Reply
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={reportPostId !== null} onOpenChange={(open) => !open && setReportPostId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
            <DialogDescription>
              Help us keep BookArc safe by reporting inappropriate content. Your report will be reviewed by our moderation team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Please describe why you're reporting this post..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setReportPostId(null);
                setReportReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReportPost}
              disabled={!reportReason.trim()}
            >
              <Flag className="w-4 h-4 mr-2" />
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}