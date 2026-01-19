import { useState, useRef } from "react";
import { ArrowLeft, BookMarked, User, Mail, Camera, Save, Check, Upload, ImagePlus, BookOpen, Award, Link as LinkIcon, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertTriangle } from "lucide-react";


interface AuthorEditProfilePageProps {
  onBack: () => void;
  onLogoClick?: () => void;
  currentAuthor: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onSave: (updatedAuthor: { name: string; email: string; avatarUrl?: string; bio?: string; website?: string; socialLinks?: any }) => void;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AuthorEditProfilePage({ onBack, onLogoClick, currentAuthor, onSave, onLogout, theme, onToggleTheme }: AuthorEditProfilePageProps) {
  const [name, setName] = useState(currentAuthor.name);
  const [email, setEmail] = useState(currentAuthor.email);
  const [avatarUrl, setAvatarUrl] = useState(currentAuthor.avatarUrl || "");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(avatarUrl);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Predefined avatar options for authors
  const avatarOptions = [
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400&h=400&fit=crop",
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name) {
      newErrors.name = "Name is required";
    } else if (name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const authorData = {
        name,
        email,
        avatarUrl,
        bio,
        website,
        socialLinks: {
          twitter,
          instagram,
          facebook
        }
      };
      
      // Save to localStorage
      localStorage.setItem("authorData", JSON.stringify({
        name,
        email,
        profilePicture: avatarUrl,
        bio,
        website,
        socialLinks: { twitter, instagram, facebook }
      }));
      
      onSave(authorData);
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setSuccessMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError("");

    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Image size must be less than 5MB");
        return;
      }

      // Read file and convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setUploadedImage(result);
        setSelectedAvatar(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    
    if (file) {
      setUploadError("");

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Image size must be less than 5MB");
        return;
      }

      // Read file and convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setUploadedImage(result);
        setSelectedAvatar(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = () => {
    setAvatarUrl(selectedAvatar);
    setShowAvatarDialog(false);
    setUploadedImage(null);
    setUploadError("");
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText.toLowerCase() === "delete") {
      // Clear author data from localStorage
      localStorage.removeItem("authorData");
      localStorage.removeItem("authorBooks");
      
      // Close dialog
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
      
      // Show success toast
      toast.success("Author account deleted successfully");
      
      // Log out and navigate away
      setTimeout(() => {
        onLogout();
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Logo className="w-6 h-6" />
              <span className="text-xl">BookArc</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">
              Author
            </Badge>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Edit Author Profile</h1>
          <p className="text-muted-foreground">
            Manage your author profile and account settings
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-600 dark:text-green-400">
            <Check className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          {/* Profile Picture Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Update your author photo</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <Avatar className="w-32 h-32">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl">{getInitials(name)}</AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAvatarDialog(true)}
              >
                <Camera className="w-4 h-4 mr-2" />
                Change Photo
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                JPG, PNG or GIF. Max size 5MB
              </p>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="space-y-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="author-info">Author Info</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Update your author name and email address
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Author / Pen Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="name"
                            placeholder="Your author name"
                            className={`pl-10 ${errors.name ? "border-red-500" : ""}`}
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              setErrors((prev) => ({ ...prev, name: "" }));
                            }}
                          />
                        </div>
                        {errors.name && (
                          <p className="text-sm text-red-500">{errors.name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="your.email@example.com"
                            className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setErrors((prev) => ({ ...prev, email: "" }));
                            }}
                          />
                        </div>
                        {errors.email && (
  <p className="text-sm text-red-500 dark:text-red-400 font-medium">
    {errors.email}
  </p>
)}
                      </div>

                      <Separator className="my-6" />

                      <Button type="submit" className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Author Info Tab */}
              <TabsContent value="author-info">
                <Card>
                  <CardHeader>
                    <CardTitle>Author Information</CardTitle>
                    <CardDescription>
                      Share more about yourself with your readers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="bio">Biography</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell readers about yourself, your writing journey, and your work..."
                          className="min-h-[120px]"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {bio.length}/500 characters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="website"
                            type="url"
                            placeholder="https://yourwebsite.com"
                            className="pl-10"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                          />
                        </div>
                      </div>

                      <Separator className="my-6" />

                      <div className="space-y-4">
                        <Label>Social Media Links</Label>
                        
                        <div className="space-y-2">
                          <Label htmlFor="twitter" className="text-sm text-muted-foreground">Twitter / X</Label>
                          <Input
                            id="twitter"
                            placeholder="@yourusername"
                            value={twitter}
                            onChange={(e) => setTwitter(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="instagram" className="text-sm text-muted-foreground">Instagram</Label>
                          <Input
                            id="instagram"
                            placeholder="@yourusername"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="facebook" className="text-sm text-muted-foreground">Facebook</Label>
                          <Input
                            id="facebook"
                            placeholder="Your Facebook page"
                            value={facebook}
                            onChange={(e) => setFacebook(e.target.value)}
                          />
                        </div>
                      </div>

                      <Separator className="my-6" />

                      <Button type="submit" className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        Save Author Info
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          placeholder="••••••••"
                          className={errors.currentPassword ? "border-red-500" : ""}
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value);
                            setErrors((prev) => ({ ...prev, currentPassword: "" }));
                          }}
                        />
                        {errors.currentPassword && (
                          <p className="text-sm text-red-500">{errors.currentPassword}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="••••••••"
                          className={errors.newPassword ? "border-red-500" : ""}
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setErrors((prev) => ({ ...prev, newPassword: "" }));
                          }}
                        />
                        {errors.newPassword && (
                          <p className="text-sm text-red-500">{errors.newPassword}</p>
                        )}
<p className="text-xs text-foreground/70 font-medium">
  Must be at least 8 characters long
</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          className={errors.confirmPassword ? "border-red-500" : ""}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                          }}
                        />
                        {errors.confirmPassword && (
                          <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                        )}
                      </div>

                      <Separator className="my-6" />

                      <Button type="submit" className="w-full">
                        Change Password
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Account Actions */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Once you delete your account, there is no going back. All your data, including reviews, ratings, and lists will be permanently deleted.
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center justify-between p-4 rounded-md bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button 
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2"
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Avatar Selection Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change Profile Picture</DialogTitle>
            <DialogDescription>
              Choose from our collection or upload your own image
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="gallery" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="gallery" className="space-y-4">
              <div className="grid grid-cols-4 gap-4 pt-4">
                {avatarOptions.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAvatar(url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                      selectedAvatar === url
                        ? "border-primary ring-2 ring-primary"
                        : "border-border"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Avatar option ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedAvatar === url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-8 h-8 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadedImage ? (
                  <div className="space-y-4">
                    <img
                      src={uploadedImage}
                      alt="Uploaded preview"
                      className="w-32 h-32 rounded-full mx-auto object-cover"
                    />
                    <p className="text-sm text-muted-foreground">
                      Click or drag to change image
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-accent rounded-full mx-auto flex items-center justify-center">
                      <ImagePlus className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Click to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG or GIF (max. 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {uploadError && (
                <p className="text-sm text-red-500 text-center">{uploadError}</p>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAvatarDialog(false);
                setSelectedAvatar(avatarUrl);
                setUploadedImage(null);
                setUploadError("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAvatar}>
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              id="deleteConfirmText"
              type="text"
              placeholder="Type 'delete' to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteConfirmText.toLowerCase() !== "delete"}
              onClick={handleDeleteAccount}
            >
              Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}