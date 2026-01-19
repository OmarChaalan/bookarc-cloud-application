import { useState, useEffect } from "react";
import { Bell, ArrowLeft, Moon, Sun, Settings, Check, CheckCheck, Star, Heart, BookOpen, Users, TrendingUp, AlertCircle, MessageSquare, Award, DollarSign, Eye, BookMarked } from "lucide-react";
import { apiService } from "../services/apiService";
import { toast } from "sonner";
import { formatTimestamp } from "../utils/timeUtils";

// Mock UI components (replace with your actual shadcn/ui imports)
const Button = ({ children, variant = "default", size = "default", onClick, disabled, className = "" }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === "ghost" ? "hover:bg-gray-100 dark:hover:bg-gray-800" :
      variant === "outline" ? "border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" :
      "bg-blue-600 text-white hover:bg-blue-700"
    } ${size === "sm" ? "text-sm px-3 py-1" : ""} ${size === "icon" ? "p-2" : ""} ${className}`}
  >
    {children}
  </button>
);

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = "default", className = "" }: any) => (
  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
    variant === "secondary" ? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200" :
    variant === "outline" ? "border border-gray-300 dark:border-gray-700" :
    "bg-blue-600 text-white"
  } ${className}`}>
    {children}
  </span>
);

const Switch = ({ checked, onCheckedChange, disabled }: any) => (
  <button
    onClick={() => !disabled && onCheckedChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
      checked ? "translate-x-6" : "translate-x-1"
    }`} />
  </button>
);

const Input = ({ id, type = "text", placeholder, value, onChange, className = "" }: any) => (
  <input
    id={id}
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 ${className}`}
  />
);

const Label = ({ htmlFor, children }: any) => (
  <label htmlFor={htmlFor} className="text-sm font-medium">
    {children}
  </label>
);

const Separator = ({ orientation = "horizontal", className = "" }: any) => (
  <div className={`${orientation === "vertical" ? "w-px h-full" : "h-px w-full"} bg-gray-200 dark:bg-gray-800 ${className}`} />
);

const Tabs = ({ value, onValueChange, children }: any) => (
  <div data-value={value} onClick={(e: any) => {
    const trigger = e.target.closest('[data-tab-value]');
    if (trigger) onValueChange(trigger.dataset.tabValue);
  }}>
    {children}
  </div>
);

const TabsList = ({ children, className = "" }: any) => (
  <div className={`inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 ${className}`}>
    {children}
  </div>
);

const TabsTrigger = ({ value, children }: any) => (
  <button data-tab-value={value} className="px-4 py-2 rounded-md text-sm font-medium hover:bg-white dark:hover:bg-gray-900 transition-colors">
    {children}
  </button>
);

const TabsContent = ({ value, children }: any) => <div>{children}</div>;

const ScrollArea = ({ children, className = "" }: any) => (
  <div className={`overflow-y-auto ${className}`}>
    {children}
  </div>
);

const Dialog = ({ open, onOpenChange, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

const DialogTrigger = ({ asChild, children }: any) => children;
const DialogContent = ({ children }: any) => <div className="p-6">{children}</div>;
const DialogHeader = ({ children }: any) => <div className="mb-4">{children}</div>;
const DialogTitle = ({ children }: any) => <h2 className="text-xl font-semibold">{children}</h2>;
const DialogDescription = ({ children }: any) => <p className="text-sm text-gray-600 dark:text-gray-400">{children}</p>;

// Notification type definition
interface Notification {
  notification_id: number;
  user_id: number;
  message: string;
  type: string;
  audience_type: string;
  is_read: boolean;
  created_at: string;
}

// Role-based notification configurations
const ROLE_CONFIGS = {
  normal: {
    badge: null,
    title: "Your Notifications",
    subtitle: "Stay updated with your reading community",
    emailSettings: {
      newReviews: "New Reviews",
      newReviewsDesc: "When people you follow post reviews",
      newFollowers: "New Followers",
      newFollowersDesc: "When someone starts following you",
      bookRecommendations: "Book Recommendations",
      bookRecommendationsDesc: "Personalized book suggestions",
      systemUpdates: "System Updates",
      systemUpdatesDesc: "Platform updates and new features",
      weeklyDigest: "Weekly Digest",
      weeklyDigestDesc: "Weekly summary of reading activity",
    },
    inAppSettings: {
      newReviews: "New Reviews",
      newReviewsDesc: "Show notifications for new reviews",
      newFollowers: "New Followers",
      newFollowersDesc: "Show notifications for new followers",
      bookRecommendations: "Book Recommendations",
      bookRecommendationsDesc: "Show book suggestions",
      systemUpdates: "System Updates",
      systemUpdatesDesc: "Show system announcements",
      comments: "Comments",
      commentsDesc: "Show notifications for review comments",
      ratings: "Ratings",
      ratingsDesc: "Show notifications for book ratings",
    },
  },
  author: {
    badge: { text: "Author", variant: "outline" },
    title: "Your Notifications",
    subtitle: "Stay updated with your book performance and reader engagement",
    emailSettings: {
      newReviews: "New Reviews",
      newReviewsDesc: "When readers review your books",
      bookSales: "Book Sales",
      bookSalesDesc: "Sales and revenue notifications",
      milestones: "Milestones",
      milestonesDesc: "Book achievements and milestones",
      readerEngagement: "Reader Engagement",
      readerEngagementDesc: "Comments, ratings, and interactions",
      systemUpdates: "System Updates",
      systemUpdatesDesc: "Platform updates and new features",
      weeklyReport: "Weekly Report",
      weeklyReportDesc: "Weekly summary of your book performance",
    },
    inAppSettings: {
      newReviews: "New Reviews",
      newReviewsDesc: "Show notifications for new book reviews",
      bookSales: "Book Sales",
      bookSalesDesc: "Show sales notifications",
      milestones: "Milestones",
      milestonesDesc: "Show achievement notifications",
      readerEngagement: "Reader Engagement",
      readerEngagementDesc: "Show notifications for reader interactions",
      systemUpdates: "System Updates",
      systemUpdatesDesc: "Show system announcements",
      comments: "Comments",
      commentsDesc: "Show notifications for review comments",
      ratings: "Ratings",
      ratingsDesc: "Show notifications for new book ratings",
    },
  },
  admin: {
    badge: { text: "Admin", variant: "outline" },
    title: "Admin Notifications",
    subtitle: "Monitor platform activity and system alerts",
    emailSettings: {
      userReports: "User Reports",
      userReportsDesc: "Flagged content and user reports",
      systemAlerts: "System Alerts",
      systemAlertsDesc: "Critical system notifications",
      contentModeration: "Content Moderation",
      contentModerationDesc: "Content requiring review",
      platformUpdates: "Platform Updates",
      platformUpdatesDesc: "Platform changes and updates",
      weeklyAnalytics: "Weekly Analytics",
      weeklyAnalyticsDesc: "Weekly platform performance summary",
    },
    inAppSettings: {
      userReports: "User Reports",
      userReportsDesc: "Show flagged content notifications",
      systemAlerts: "System Alerts",
      systemAlertsDesc: "Show critical system alerts",
      contentModeration: "Content Moderation",
      contentModerationDesc: "Show moderation queue notifications",
      platformUpdates: "Platform Updates",
      platformUpdatesDesc: "Show platform update notifications",
      userActivity: "User Activity",
      userActivityDesc: "Show user activity alerts",
    },
  },
};

interface UnifiedNotificationsProps {
  onBack: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  userRole: "normal" | "author" | "admin";
}

export default function UnifiedNotifications({ 
  onBack, 
  theme, 
  onToggleTheme,
  userRole = "normal"
}: UnifiedNotificationsProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "read">("all");
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Email settings
  const [notificationEmail, setNotificationEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSaveSuccess, setEmailSaveSuccess] = useState(false);
  
  // Get role configuration
  const config = ROLE_CONFIGS[userRole];
  
  // Initialize notification settings based on role
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const settings: Record<string, boolean> = {};
    Object.keys(config.emailSettings).forEach((key) => {
      if (!key.endsWith('Desc')) {
        settings[key] = key !== 'systemUpdates';
      }
    });
    return settings;
  });

  const [inAppNotifications, setInAppNotifications] = useState(() => {
    const settings: Record<string, boolean> = {};
    Object.keys(config.inAppSettings).forEach((key) => {
      if (!key.endsWith('Desc')) {
        settings[key] = true;
      }
    });
    return settings;
  });

  // Real notifications from API
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from API
  useEffect(() => {
    loadNotifications();
    loadNotificationPreferences();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotifications();
      console.log("📬 Loaded notifications:", response);
      setNotifications(response.notifications);
    } catch (error: any) {
      console.error("❌ Failed to load notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const prefs = await apiService.getNotificationPreferences();
      console.log("⚙️ Loaded preferences:", prefs);
      
      // Map API preferences to UI state
      setEmailNotifications(prev => ({
        ...prev,
        systemUpdates: prefs.allow_email,
        // Map other settings as needed
      }));
    } catch (error: any) {
      console.error("❌ Failed to load notification preferences:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "review":
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case "sale":
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case "milestone":
        return <Award className="w-5 h-5 text-yellow-500" />;
      case "comment":
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case "rating":
        return <Star className="w-5 h-5 text-orange-500" />;
      case "trending":
        return <TrendingUp className="w-5 h-5 text-pink-500" />;
      case "follower":
      case "follow":
        return <Users className="w-5 h-5 text-indigo-500" />;
      case "recommendation":
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case "system":
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await apiService.markNotificationAsRead(id);
      setNotifications(notifications.map(notif =>
        notif.notification_id === id ? { ...notif, is_read: true } : notif
      ));
      toast.success("Notification marked as read");
    } catch (error: any) {
      console.error("❌ Failed to mark as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      setNotifications(notifications.map(notif => ({ ...notif, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (error: any) {
      console.error("❌ Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await apiService.deleteNotification(id);
      setNotifications(notifications.filter(notif => notif.notification_id !== id));
      toast.success("Notification deleted");
    } catch (error: any) {
      console.error("❌ Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSaveEmail = () => {
    setEmailError("");
    setEmailSaveSuccess(false);

    if (!notificationEmail) {
      setEmailError("Email address is required");
      return;
    }

    if (!validateEmail(notificationEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setSavedEmail(notificationEmail);
    setEmailSaveSuccess(true);
    
    setTimeout(() => {
      setEmailVerified(true);
    }, 2000);

    setTimeout(() => {
      setEmailSaveSuccess(false);
    }, 3000);
  };

  const handleSendVerification = () => {
    setEmailSaveSuccess(true);
    setTimeout(() => {
      setEmailSaveSuccess(false);
    }, 3000);
  };

  const handleUpdatePreferences = async (updates: Partial<typeof emailNotifications>) => {
    try {
      await apiService.updateNotificationPreferences({
        allow_email: emailNotifications.systemUpdates,
        // Add other mappings as needed
      });
      toast.success("Preferences updated");
    } catch (error: any) {
      console.error("❌ Failed to update preferences:", error);
      toast.error("Failed to update preferences");
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (activeFilter === "unread") return !notif.is_read;
    if (activeFilter === "read") return notif.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className={`min-h-screen ${theme === "dark" ? "dark bg-gray-950 text-white" : "bg-white"}`}>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Badge className="bg-red-600">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.badge && (
              <Badge variant={config.badge.variant} className="border-blue-600 text-blue-600">
                {config.badge.text}
              </Badge>
            )}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Notification Settings</DialogTitle>
                  <DialogDescription>
                    Manage how you receive notifications
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Email Address Section */}
                  <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">Email Address for Notifications</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Enter your email address to receive notifications
                    </p>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="notification-email">Email Address</Label>
                        <div className="flex gap-2">
                          <Input
                            id="notification-email"
                            type="email"
                            placeholder="your.email@example.com"
                            value={notificationEmail}
                            onChange={(e: any) => {
                              setNotificationEmail(e.target.value);
                              setEmailError("");
                            }}
                            className={emailError ? "border-red-500" : ""}
                          />
                          <Button 
                            onClick={handleSaveEmail}
                            disabled={!notificationEmail}
                          >
                            Save Email
                          </Button>
                        </div>
                        {emailError && (
                          <p className="text-sm text-red-600">{emailError}</p>
                        )}
                        {emailSaveSuccess && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <Check className="w-4 h-4" />
                            <span>Email saved successfully!</span>
                          </div>
                        )}
                      </div>

                      {savedEmail && (
                        <div className="pt-2 space-y-2">
                          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center gap-2 ${emailVerified ? "text-green-600" : "text-gray-500"}`}>
                                {emailVerified ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    <span className="text-sm">Verified</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm">Not verified</span>
                                  </>
                                )}
                              </div>
                              <Separator orientation="vertical" />
                              <span className="text-sm">{savedEmail}</span>
                            </div>
                            {!emailVerified && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleSendVerification}
                              >
                                Verify Email
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Email Notifications */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Email Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Choose which notifications you want to receive via email
                      {!savedEmail && " (Email address required)"}
                    </p>
                    <div className={`space-y-4 ${!savedEmail ? "opacity-50 pointer-events-none" : ""}`}>
                      {Object.entries(config.emailSettings).map(([key, value], index) => {
                        if (key.endsWith('Desc')) return null;
                        const descKey = `${key}Desc` as keyof typeof config.emailSettings;
                        return (
                          <div key={key}>
                            {index > 0 && <Separator />}
                            <div className="flex items-center justify-between py-2">
                              <div>
                                <div className="font-medium">{value as string}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {config.emailSettings[descKey]}
                                </div>
                              </div>
                              <Switch
                                checked={emailNotifications[key]}
                                onCheckedChange={(checked: boolean) => {
                                  const newSettings = { ...emailNotifications, [key]: checked };
                                  setEmailNotifications(newSettings);
                                  handleUpdatePreferences(newSettings);
                                }}
                                disabled={!savedEmail}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* In-App Notifications */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">In-App Notifications</h3>
                    <div className="space-y-4">
                      {Object.entries(config.inAppSettings).map(([key, value], index) => {
                        if (key.endsWith('Desc')) return null;
                        const descKey = `${key}Desc` as keyof typeof config.inAppSettings;
                        return (
                          <div key={key}>
                            {index > 0 && <Separator />}
                            <div className="flex items-center justify-between py-2">
                              <div>
                                <div className="font-medium">{value as string}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {config.inAppSettings[descKey]}
                                </div>
                              </div>
                              <Switch
                                checked={inAppNotifications[key]}
                                onCheckedChange={(checked: boolean) =>
                                  setInAppNotifications({ ...inAppNotifications, [key]: checked })
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">{config.title}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {config.subtitle}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeFilter} onValueChange={(value: any) => setActiveFilter(value)}>
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-600">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">
              Read
              <Badge variant="secondary" className="ml-2">
                {notifications.length - unreadCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeFilter}>
            <ScrollArea className="h-[calc(100vh-300px)]">
              {loading ? (
                <Card className="p-12 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
                </Card>
              ) : filteredNotifications.length === 0 ? (
                <Card className="p-12 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No notifications</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {activeFilter === "unread"
                      ? "You're all caught up! No unread notifications."
                      : "You don't have any notifications yet."}
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => (
                    <Card
                      key={notification.notification_id}
                      className={`p-4 transition-all hover:border-blue-400 ${
                        !notification.is_read ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900" : ""
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-1">
                            <h3 className={!notification.is_read ? "font-semibold" : ""}>
                              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)} Notification
                            </h3>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(notification.created_at)}
                            </span>
                            <div className="flex gap-2">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.notification_id)}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Mark as Read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => deleteNotification(notification.notification_id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}