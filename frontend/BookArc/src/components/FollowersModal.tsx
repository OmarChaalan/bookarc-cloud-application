import { useState, useEffect } from "react";
import { Users, X, MessageSquare, BookOpen, Loader2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { apiService } from "../services/apiService";
import { toast } from "sonner";

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  username: string;
  defaultTab?: "followers" | "following";
  onUserClick?: (userId: number, userRole?: string) => void; // ✅ Added userRole parameter
}

interface UserItem {
  id: number;
  authorId?: number;  
  username: string;
  avatarUrl: string;
  bio?: string;
  isPrivate: boolean;
  followedAt: string;
  role?: string;
  type?: 'user' | 'author';  
  authorType?: 'registered' | 'external';  
  verified?: boolean;
  stats: {
    totalReviews: number;
    booksRead: number;
  };
}

export function FollowersModal({
  isOpen,
  onClose,
  userId,
  username,
  defaultTab = "followers",
  onUserClick,
}: FollowersModalProps) {
  const [activeTab, setActiveTab] = useState<"followers" | "following">(defaultTab);
  const [followers, setFollowers] = useState<UserItem[]>([]);
  const [following, setFollowing] = useState<UserItem[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);

  // Reset to default tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Load followers when tab is active
  useEffect(() => {
    if (isOpen && activeTab === "followers") {
      loadFollowers();
    }
  }, [isOpen, activeTab, userId]);

  // Load following when tab is active
  useEffect(() => {
    if (isOpen && activeTab === "following") {
      loadFollowing();
    }
  }, [isOpen, activeTab, userId]);

  const loadFollowers = async () => {
    if (isLoadingFollowers || followers.length > 0) return;
    
    setIsLoadingFollowers(true);
    try {
      console.log(`🔍 Loading followers for user ${userId}`);
      const result = await apiService.getUserFollowers(userId);
      console.log(`✅ Loaded ${result.followers.length} followers:`, result);
      setFollowers(result.followers);
    } catch (error: any) {
      console.error("Error loading followers:", error);
      toast.error(error.message || "Failed to load followers");
      setFollowers([]);
    } finally {
      setIsLoadingFollowers(false);
    }
  };

  const loadFollowing = async () => {
    if (isLoadingFollowing || following.length > 0) return;
    
    setIsLoadingFollowing(true);
    try {
      console.log(`🔍 Loading following for user ${userId}`);
      const result = await apiService.getUserFollowing(userId);
      console.log(`✅ Loaded ${result.following.length} following users:`, result);
      setFollowing(result.following);
    } catch (error: any) {
      console.error("Error loading following:", error);
      toast.error(error.message || "Failed to load following");
      setFollowing([]);
    } finally {
      setIsLoadingFollowing(false);
    }
  };

  // Reset data when modal closes
  const handleClose = () => {
    setFollowers([]);
    setFollowing([]);
    onClose();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

const handleUserClick = (clickedUserId: number, itemType?: string, userRole?: string) => {
  console.log(`🖱️ User clicked in FollowersModal:`, {
    userId: clickedUserId,
    type: itemType,
    role: userRole,
    hasOnUserClick: !!onUserClick
  });
  
  if (onUserClick) {
    // ✅ If it's an author type, pass the role as 'author'
    const effectiveRole = itemType === 'author' ? 'author' : userRole;
    onUserClick(clickedUserId, effectiveRole);
    handleClose();
  } else {
    console.warn('⚠️ onUserClick handler not provided to FollowersModal');
  }
};

  const renderUserList = (users: UserItem[], isLoading: boolean, type: "followers" | "following") => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 mb-3 text-muted-foreground opacity-20" />
          <p className="text-muted-foreground mb-1">
            {type === "followers"
              ? "No followers yet"
              : "Not following anyone yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {type === "followers"
              ? `${username} doesn't have any followers yet`
              : `${username} isn't following anyone yet`}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary transition-colors"
          >
            <Avatar className="w-12 h-12 border-2 border-primary/20 flex-shrink-0">
              <AvatarImage src={user.avatarUrl} alt={user.username} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getUserInitials(user.username)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{user.username}</h4>
                {user.isPrivate && (
                  <Badge variant="secondary" className="text-xs gap-1 flex-shrink-0">
                    <Lock className="w-3 h-3" />
                    Private
                  </Badge>
                )}
                {/* ✅ Show role badge if user is an author */}
                {user.role === 'author' && (
                  <Badge variant="outline" className="text-xs gap-1 flex-shrink-0 border-primary/40 text-primary">
                    Author
                  </Badge>
                )}
              </div>

              {user.bio && (
                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                  {user.bio}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {user.stats.totalReviews} reviews
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {user.stats.booksRead} books
                </span>
              </div>
            </div>

            <Button 
  variant="ghost" 
  size="sm" 
  className="flex-shrink-0"
  onClick={() => handleUserClick(user.id, user.type, user.role)}
>
  View Profile
</Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {username}'s Connections
          </DialogTitle>
          <DialogDescription>
            See who follows {username} and who they follow
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "followers" | "following")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({following.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {renderUserList(followers, isLoadingFollowers, "followers")}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {renderUserList(following, isLoadingFollowing, "following")}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}