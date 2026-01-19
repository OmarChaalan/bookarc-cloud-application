import { useState, useEffect } from "react";
import { ArrowLeft, BookOpen, Star, Users, Calendar, MapPin, Link as LinkIcon, Lock, Globe, MessageSquare, ThumbsUp, Heart, BookCheck, Clock, Award, TrendingUp, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Separator } from "./ui/separator";
import { apiService } from "../services/apiService";
import { toast } from "sonner";
import { FollowersModal } from "./FollowersModal";

export interface UserProfile {
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
}

interface UserPublicProfilePageProps {
  user: UserProfile;
  onBack: () => void;
  onLogoClick?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  isCurrentUser: boolean;
  isUserLoggedIn: boolean;
  isAuthorLoggedIn?: boolean;
  onLoginRequired?: () => void;
  isFollowing?: boolean;
  hasRequestedFollow?: boolean;
  onFollowUser?: (userId: number) => void;
  onUnfollowUser?: (userId: number) => void;
  onCancelRequest?: () => void;
  onEditProfile?: () => void;
  onViewBookDetails?: (bookId: number) => void;
  currentUser?: { isAdmin?: boolean };
  
  onUserSelect?: (userId: number) => void;
  onAuthorSelect?: (author: { id: number; authorType: 'registered' | 'external' }) => void;
  onViewList?: (list: { id: number; name: string; count: number; icon?: any }) => void;
}

export function UserPublicProfilePage({
  user: initialUser,
  onBack,
  onLogoClick,
  theme,
  onToggleTheme,
  isCurrentUser,
  isUserLoggedIn,
  isAuthorLoggedIn = false,
  onLoginRequired,
  onEditProfile,
  onViewBookDetails,
  currentUser,
  onUserSelect,  
  onAuthorSelect,
  onViewList,
}: UserPublicProfilePageProps) {
  const [activeTab, setActiveTab] = useState("reviews");
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  
  // Follow functionality state
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialUser.stats.followers);
  const [followingCount, setFollowingCount] = useState(initialUser.stats.following);

  // ⭐ NEW: Followers modal state
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(false);


  // Load real user data from API
useEffect(() => {
  const loadUserData = async () => {
    if (isCurrentUser && initialUser.username !== "Loading...") {
      return;
    }
    
    if (initialUser.id === 0) {
      return;
    }
    
    try {
      setIsLoading(true);
      const userData = await apiService.getUserById(initialUser.id);
      
setUser({
  id: userData.id,
  username: userData.username,
  email: userData.email,
  avatarUrl: userData.avatarUrl,
  bio: userData.bio,
  location: userData.location,
  website: userData.website,
  joinDate: userData.joinDate,
  isPrivate: userData.isPrivate,
        stats: {
          totalReviews: userData.stats.totalReviews,
          totalRatings: userData.stats.totalRatings,
          booksRead: userData.stats.booksRead,
          followers: userData.stats.followers,
          following: userData.stats.following,
        },
        lists: userData.lists,
        recentReviews: userData.recentReviews,
        favoriteGenres: userData.favoriteGenres,
      });
      
      setFollowerCount(userData.stats.followers);
      setFollowingCount(userData.stats.following);
      
      // Load favorite genres if viewing own profile
      if (isCurrentUser) {
        setIsLoadingGenres(true);
        try {
          const genresResponse = await apiService.getUserFavoriteGenres();
          setFavoriteGenres(genresResponse.genres.map(g => g.genre_name));
        } catch (error: any) {
          console.error("Failed to load favorite genres:", error);
          setFavoriteGenres(userData.favoriteGenres || []);
        } finally {
          setIsLoadingGenres(false);
        }
      } else {
        // For other users, use the genres from their profile
        setFavoriteGenres(userData.favoriteGenres || []);
      }
      
    } catch (error: any) {
      console.error("Error loading user profile:", error);
      toast.error(`Failed to load user profile: ${error.message}`);
      
      setUser({
        id: initialUser.id,
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
      });
    } finally {
      setIsLoading(false);
    }
  };

  loadUserData();
}, [initialUser.id, isCurrentUser]);

  // Check follow status when viewing someone else's profile
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (isCurrentUser || !isUserLoggedIn || isAuthorLoggedIn || currentUser?.isAdmin) {
        return;
      }

      try {
        const status = await apiService.checkFollowStatus(initialUser.id);
        setIsFollowing(status.isFollowing);
      } catch (error: any) {
        console.error("Error checking follow status:", error);
      }
    };

    checkFollowStatus();
  }, [initialUser.id, isCurrentUser, isUserLoggedIn, isAuthorLoggedIn, currentUser?.isAdmin]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!isUserLoggedIn) {
      if (onLoginRequired) {
        onLoginRequired();
      }
      return;
    }

    if (currentUser?.isAdmin || isAuthorLoggedIn) {
      return;
    }

    setIsLoadingFollow(true);

    try {
      if (isFollowing) {
        await apiService.unfollowUser(user.id);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast.success(`Unfollowed ${user.username}`);
      } else {
        await apiService.followUser(user.id);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast.success(`Now following ${user.username}`);
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      toast.error(error.message || "Failed to update follow status");
    } finally {
      setIsLoadingFollow(false);
    }
  };

  // ⭐ NEW: Open followers modal
  const handleOpenFollowersModal = (tab: "followers" | "following") => {
    setFollowersModalTab(tab);
    setIsFollowersModalOpen(true);
  };

  const handleFollowerUserClick = (userId: number, userRole?: string) => {
  console.log(`🔄 Navigation triggered from FollowersModal:`, {
    userId,
    userRole,
    hasUserSelect: !!onUserSelect,
    hasAuthorSelect: !!onAuthorSelect
  });

  // Close the modal first
  setIsFollowersModalOpen(false);

  // Navigate based on role
  if (userRole === 'author' && onAuthorSelect) {
    console.log(`📖 Navigating to author profile for user ${userId}`);
    onAuthorSelect({
      id: userId,
      authorType: 'registered'
    });
  } else if (onUserSelect) {
    console.log(`👤 Navigating to user profile for user ${userId}`);
    onUserSelect(userId);
  } else {
    console.warn('⚠️ No navigation handler available');
  }
};

  const isProfileLocked = user.isPrivate && !isCurrentUser && !isFollowing;

  const userInitials = user.username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Logo className="w-6 h-6" />
            <span className="text-xl">BookArc</span>
          </button>

          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </nav>

      {isLoading ? (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Card className="p-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-32 w-32 bg-muted rounded-full mx-auto"></div>
              <div className="h-6 bg-muted rounded w-48 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-64 mx-auto"></div>
            </div>
            <p className="text-muted-foreground mt-4">Loading user profile...</p>
          </Card>
        </div>
      ) : user.username === "User Not Found" ? (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-2xl font-semibold mb-2">User Not Found</h3>
            <p className="text-muted-foreground mb-6">
              This user profile could not be loaded. The user may not exist or there was an error connecting to the database.
            </p>
            <Button onClick={onBack} variant="outline">
              Go Back
            </Button>
          </Card>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="w-32 h-32 border-4 border-primary/20">
                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                    <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-3xl">{user.username}</h1>
                        {user.isPrivate && (
                          <Badge variant="outline" className="gap-1">
                            <Lock className="w-3 h-3" />
                            Private
                          </Badge>
                        )}
                        {!user.isPrivate && (
                          <Badge variant="outline" className="gap-1">
                            <Globe className="w-3 h-3" />
                            Public
                          </Badge>
                        )}
                      </div>
                      {user.bio && <p className="text-muted-foreground mb-3">{user.bio}</p>}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {user.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {user.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Joined {user.joinDate}
                        </span>
                        {user.website && (
                          <a
                            href={user.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <LinkIcon className="w-4 h-4" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons with Follow/Unfollow */}
                    <div className="flex gap-2">
                      {isCurrentUser ? (
                        <Button onClick={onEditProfile}>Edit Profile</Button>
                      ) : !isAuthorLoggedIn && !currentUser?.isAdmin ? (
                        <Button
                          onClick={handleFollow}
                          variant={isFollowing ? "outline" : "default"}
                          disabled={isLoadingFollow}
                        >
                          {isLoadingFollow ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              Loading...
                            </>
                          ) : isFollowing ? (
                            "Unfollow"
                          ) : (
                            "Follow"
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* ⭐ UPDATED: Stats with clickable followers/following */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 rounded-lg bg-accent/10">
                      <div className="text-2xl mb-1">{user.stats.booksRead}</div>
                      <div className="text-xs text-muted-foreground">Books Read</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-accent/10">
                      <div className="text-2xl mb-1">{user.stats.totalReviews}</div>
                      <div className="text-xs text-muted-foreground">Reviews</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-accent/10">
                      <div className="text-2xl mb-1">{user.stats.totalRatings}</div>
                      <div className="text-xs text-muted-foreground">Ratings</div>
                    </div>
                    <button 
                      className="text-center p-3 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer" 
                      onClick={() => handleOpenFollowersModal("followers")}
                    >
                      <div className="text-2xl mb-1">{followerCount}</div>
                      <div className="text-xs text-muted-foreground">Followers</div>
                    </button>
                    <button 
                      className="text-center p-3 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer" 
                      onClick={() => handleOpenFollowersModal("following")}
                    >
                      <div className="text-2xl mb-1">{followingCount}</div>
                      <div className="text-xs text-muted-foreground">Following</div>
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Private Profile Message */}
          {isProfileLocked ? (
            <Card>
              <CardContent className="text-center py-12">
                <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-xl mb-2">This Account is Private</h3>
                <p className="text-muted-foreground mb-4">
                  {isAuthorLoggedIn
                    ? `This account is private. Only regular users can follow other users.`
                    : `Follow ${user.username} to see their reviews, ratings, and reading lists.`
                  }
                </p>
                {!isAuthorLoggedIn && !isUserLoggedIn && (
                  <Button onClick={onLoginRequired}>Log In to Follow</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
{/* Favorite Genres */}
{!isProfileLocked && (
  <>
    {isLoadingGenres ? (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Favorite Genres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse flex space-x-2">
              <div className="h-6 w-20 bg-muted rounded"></div>
              <div className="h-6 w-24 bg-muted rounded"></div>
              <div className="h-6 w-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    ) : favoriteGenres && favoriteGenres.length > 0 ? (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Favorite Genres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {favoriteGenres.map((genre, index) => (
              <Badge key={index} variant="secondary">
                {genre}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    ) : null}
  </>
)}
              {/* Tabs for Content */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="reviews">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Reviews ({user.stats.totalReviews})
                  </TabsTrigger>
                  <TabsTrigger value="lists">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Lists ({user.lists.filter(l => l.isPublic || isCurrentUser).length})
                  </TabsTrigger>
                  <TabsTrigger value="activity">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Reviews Tab */}
                <TabsContent value="reviews">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Reviews</CardTitle>
                      <CardDescription>
                        Reviews written by {isCurrentUser ? "you" : user.username}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {user.recentReviews.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p>No reviews yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {user.recentReviews.map((review) => (
                            <div
                              key={review.id}
                              className="p-4 rounded-lg border border-border hover:border-primary transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="mb-1">{review.bookTitle}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    by {review.bookAuthor}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < review.rating
                                          ? "fill-yellow-500 text-yellow-500"
                                          : "text-muted-foreground"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm mb-3">{review.comment}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{review.date}</span>
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3" />
                                  {review.likes} helpful
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Lists Tab */}
                <TabsContent value="lists">
                  <Card>
                    <CardHeader>
                      <CardTitle>Reading Lists</CardTitle>
                      <CardDescription>
                        {isCurrentUser ? "Your" : `${user.username}'s`} curated book collections
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {user.lists.filter(l => l.isPublic || isCurrentUser).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p>No public lists yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {user.lists
                            .filter(l => l.isPublic || isCurrentUser)
                            .map((list) => (
                              <button
                                key={list.id}
                                className="p-4 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer text-left w-full"
                                onClick={() => {
                                  console.log('📋 List clicked:', list);
                                  console.log('📋 onViewList exists?', !!onViewList);
                                  if (onViewList) {
                                    onViewList({
                                      id: list.id,
                                      name: list.name,
                                      count: list.count,
                                      icon: BookOpen
                                    });
                                  } else {
                                    console.warn('⚠️ onViewList callback not provided!');
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <BookOpen className="w-5 h-5 text-primary" />
                                  {!list.isPublic && (
                                    <Badge variant="outline" className="text-xs">
                                      <Lock className="w-3 h-3 mr-1" />
                                      Private
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="mb-1">{list.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {list.count} {list.count === 1 ? "book" : "books"}
                                </p>
                              </button>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>
                        Latest actions by {isCurrentUser ? "you" : user.username}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Mock activity data */}
                        <div className="flex gap-3 p-3 rounded-lg bg-accent/10">
                          <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm">
                              Rated <span className="font-medium">The Midnight Library</span> 5 stars
                            </p>
                            <p className="text-xs text-muted-foreground">2 days ago</p>
                          </div>
                        </div>
                        <div className="flex gap-3 p-3 rounded-lg bg-accent/10">
                          <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm">
                              Reviewed <span className="font-medium">Project Hail Mary</span>
                            </p>
                            <p className="text-xs text-muted-foreground">3 days ago</p>
                          </div>
                        </div>
                        <div className="flex gap-3 p-3 rounded-lg bg-accent/10">
                          <BookCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm">
                              Finished reading <span className="font-medium">Atomic Habits</span>
                            </p>
                            <p className="text-xs text-muted-foreground">1 week ago</p>
                          </div>
                        </div>
                        <div className="flex gap-3 p-3 rounded-lg bg-accent/10">
                          <Heart className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm">
                              Added <span className="font-medium">The Seven Husbands of Evelyn Hugo</span> to Want to Read
                            </p>
                            <p className="text-xs text-muted-foreground">1 week ago</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      )}

      {/* ⭐ NEW: Followers/Following Modal */}
<FollowersModal
  isOpen={isFollowersModalOpen}
  onClose={() => setIsFollowersModalOpen(false)}
  userId={user.id}
  username={user.username}
  defaultTab={followersModalTab}
  onUserClick={handleFollowerUserClick}
/>
    </div>
  );
}