import { useState, useRef } from "react";
import { ArrowLeft, BookMarked, User, Mail, Camera, Save, Check, Upload, ImagePlus, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from "sonner";
import { apiService } from "../services/apiService";
import { authService } from "../services/authService";

interface EditProfilePageProps {
  onBack: () => void;
  onLogoClick?: () => void;
  currentUser: {
    username: string;
    email: string;
    avatarUrl?: string;
    bio?: string;
    location?: string;
    website?: string;
  };
  onSave: (updatedUser: { 
    username: string; 
    email: string; 
    avatarUrl?: string;
    bio?: string;
    location?: string;
    website?: string;
  }) => void;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function EditProfilePage({ onBack, onLogoClick, currentUser, onSave, onLogout, theme, onToggleTheme }: EditProfilePageProps) {
  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);
  const [bio, setBio] = useState(currentUser.bio || "");
  const [location, setLocation] = useState(currentUser.location || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || "");
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
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Character count for bio
  const bioMaxLength = 500;
  const bioCharCount = bio.length;

  // Predefined avatar options
  const avatarOptions = [
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop",
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

  const validateWebsite = (url: string) => {
    if (!url) return true; // Optional field
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

const handleSaveProfile = async (e: React.FormEvent) => {
  e.preventDefault();
  const newErrors: { [key: string]: string } = {};

  if (!username) {
    newErrors.username = "Display name is required";
  } else if (username.length < 3) {
    newErrors.username = "Display name must be at least 3 characters";
  }

  if (!email) {
    newErrors.email = "Email is required";
  } else if (!validateEmail(email)) {
    newErrors.email = "Please enter a valid email";
  }

  if (bio.length > bioMaxLength) {
    newErrors.bio = `Bio must be ${bioMaxLength} characters or less`;
  }

  setErrors(newErrors);

  if (Object.keys(newErrors).length === 0) {
    try {
      // Reset success state before saving
      setProfileSaveSuccess(false);
      
await apiService.updateUserProfile({
  display_name: username, 
  bio: bio,
  location: location,
  profile_image: avatarUrl,
});

      // ✅ Reload the profile from database to get updated data
      const updatedProfile = await apiService.getUserProfile();
      
      // ✅ Update parent component state with fresh data from database
      onSave({ 
        username: updatedProfile.display_name || updatedProfile.username,
        email: updatedProfile.email,
        avatarUrl: updatedProfile.profile_image || "",
        bio: updatedProfile.bio || "",
        location: updatedProfile.location || "",
      });
      
      // Show success state
      setProfileSaveSuccess(true);
      toast.success("Profile updated successfully! 🎉");
      
      // Reset success state after 5 seconds
      setTimeout(() => {
        setProfileSaveSuccess(false);
      }, 5000);
    } catch (error: any) {
      console.error("Update profile error:", error);
      toast.error(error.message || "Failed to update profile");
    }
  }
};

const [isChangingPassword, setIsChangingPassword] = useState(false);
const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

const handleChangePassword = async (e: React.FormEvent) => {
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

  if (currentPassword === newPassword) {
    newErrors.newPassword = "New password must be different from current password";
  }

  setErrors(newErrors);

  if (Object.keys(newErrors).length === 0) {
    setIsChangingPassword(true);
    setPasswordChangeSuccess(false);
    
    try {
      await authService.changePassword(currentPassword, newPassword);
      
      // Show success state
      setPasswordChangeSuccess(true);
      setSuccessMessage("Password changed successfully!");
      toast.success("Password changed successfully! 🎉");
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Reset success state after 5 seconds
      setTimeout(() => {
        setPasswordChangeSuccess(false);
        setSuccessMessage("");
      }, 5000);
    } catch (error: any) {
      console.error("Change password error:", error);
      
      // Handle specific error messages
      let errorMessage = "Failed to change password. Please try again.";
      
      if (error.message.includes("Current password is incorrect")) {
        errorMessage = "Current password is incorrect";
        setErrors({ currentPassword: errorMessage });
      } else if (error.message.includes("password policy")) {
        errorMessage = "New password does not meet requirements";
        setErrors({ newPassword: errorMessage });
      } else if (error.message.includes("Too many attempts")) {
        errorMessage = "Too many attempts. Please try again later";
      }
      
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  }
};

  const handleAvatarSelect = (url: string) => {
    setSelectedAvatar(url);
  };

  const handleAvatarSave = () => {
    setAvatarUrl(selectedAvatar);
    setShowAvatarDialog(false);
    setSuccessMessage("Avatar updated! Don't forget to save your profile.");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
    setSelectedAvatar("");
    setUploadedImage(null);
    setShowAvatarDialog(false);
    setSuccessMessage("Avatar removed! Don't forget to save your profile.");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a valid image file (JPG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      setUploadError("Image size must be less than 2MB");
      return;
    }

    setUploadError("");

    try {
      // Upload to S3 using the API service
      toast.info("Uploading image...");
      const { fileUrl } = await apiService.uploadProfilePicture(file);
      
      // Set the uploaded image URL
      setUploadedImage(fileUrl);
      setSelectedAvatar(fileUrl);
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadError(error.message || "Failed to upload image");
      toast.error("Failed to upload image. Please try again.");
      
      // Fallback to local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUploadedImage(base64String);
        setSelectedAvatar(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleOpenAvatarDialog = () => {
    setShowAvatarDialog(true);
    setUploadError("");
    // If there's a current avatar, set it as selected
    if (avatarUrl) {
      setSelectedAvatar(avatarUrl);
      // Check if it's an uploaded image (base64)
      if (avatarUrl.startsWith("data:")) {
        setUploadedImage(avatarUrl);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== "delete") {
      return;
    }

    setIsDeleting(true);

    try {
      // Call the API to delete account
      await apiService.deleteUserAccount();
      
      // Clear local storage
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userLists");
      
      // Logout from Cognito
      authService.logout();
      
      // Close dialog
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
      
      // Show success toast
      toast.success("Account deleted successfully");
      
      // Navigate away after a short delay
      setTimeout(() => {
        onLogout();
      }, 1500);
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast.error(error.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
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
            <Logo className="w-6 h-6" />
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
      {/* Main Content */}
<main className="container max-w-4xl mx-auto px-4 py-8">
  <div className="mb-8">
    <h1 className="text-3xl mb-2">Edit Profile</h1>
    <p className="text-muted-foreground">Manage your account settings and preferences</p>
  </div>

  <div className="space-y-6">
    {/* Profile Information */}
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your account details and bio</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Profile Success Message Banner */}
          {profileSaveSuccess && (
            <div className="p-4 bg-green-500/10 border-2 border-green-500/50 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1">
                  Profile Updated Successfully! 🎉
                </h4>
                <p className="text-sm text-green-600/80 dark:text-green-400/80">
                  Your profile information has been saved. All changes are now live.
                </p>
              </div>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24 border-4 border-primary">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={username} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {getInitials(username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleOpenAvatarDialog}
              >
                <Camera className="w-4 h-4" />
                Change Avatar
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Upload your own or choose from our selection
              </p>
            </div>
          </div>

          <Separator />

<div className="space-y-2">
  <Label htmlFor="actual-username">Username (permanent)</Label>
  <div className="relative">
    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <Input
      id="actual-username"
      type="text"
      value={currentUser.username}
      className="pl-10 bg-muted cursor-not-allowed"
      disabled
      readOnly
    />
  </div>
  <p className="text-xs text-muted-foreground">
    Your username cannot be changed
  </p>
</div>

<Separator />

{/* Display Name - EDITABLE */}
<div className="space-y-2">
  <Label htmlFor="displayName">Display Name</Label>
  <div className="relative">
    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <Input
      id="displayName"
      type="text"
      placeholder="How you want to appear"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      className="pl-10"
    />
  </div>
  {errors.username && (
    <p className="text-sm text-red-500 dark:text-red-400 font-medium">
      {errors.username}
    </p>
  )}
  <p className="text-xs text-muted-foreground">
    This is how your name appears to other users
  </p>
</div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled
              />
            </div>
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            {errors.email && (
              <p className="text-sm text-red-500 dark:text-red-400 font-medium">
                {errors.email}
              </p>
            )}
          </div>

          <Separator />

          {/* Bio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className={`text-xs ${bioCharCount > bioMaxLength ? 'text-destructive' : 'text-muted-foreground'}`}>
                {bioCharCount}/{bioMaxLength}
              </span>
            </div>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself... What kind of books do you love? What are you currently reading?"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={bioMaxLength}
            />
            {errors.bio && (
              <p className="text-sm text-red-500 dark:text-red-400 font-medium">
                {errors.bio}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Write a brief description about yourself and your reading preferences
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              type="text"
              placeholder="e.g., New York, USA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Updated Save Changes Button */}
          <Button 
            type="submit" 
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={profileSaveSuccess}
          >
            {profileSaveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Profile Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>

    {/* Change Password Card */}
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your password to keep your account secure</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Password Success Message Banner */}
          {passwordChangeSuccess && (
            <div className="p-4 bg-green-500/10 border-2 border-green-500/50 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1">
                  Password Changed Successfully! 🎉
                </h4>
                <p className="text-sm text-green-600/80 dark:text-green-400/80">
                  Your password has been updated. You can now use your new password to log in.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isChangingPassword}
            />
            {errors.currentPassword && (
              <p className="text-sm text-red-500 dark:text-red-400 font-medium">
                {errors.currentPassword}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isChangingPassword}
            />
            {errors.newPassword && (
              <p className="text-sm text-red-500 dark:text-red-400 font-medium">
                {errors.newPassword}
              </p>
            )}
            <p className="text-xs text-foreground/70 font-medium">
              Must be at least 8 characters long
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isChangingPassword}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500 dark:text-red-400 font-medium">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isChangingPassword || passwordChangeSuccess}
          >
            {isChangingPassword ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Changing Password...
              </>
            ) : passwordChangeSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Password Changed!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Change Password
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>

    {/* Danger Zone Card */}
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription className="text-foreground/80 font-medium">
          Irreversible account actions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant="destructive" className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-foreground">
            Once you delete your account, there is no going back. All your data, including reviews, ratings, and lists will be permanently deleted.
          </AlertDescription>
        </Alert>
        
        <div className="flex items-center justify-between p-4 rounded-md bg-destructive/10 border border-destructive/30">
          <div>
            <p className="text-sm font-medium text-foreground">Delete Account</p>
            <p className="text-xs text-foreground/70">
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
  </div>
</main>

{/* Avatar Selection Dialog */}
<Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>Choose Your Avatar</DialogTitle>
      <DialogDescription>
        Upload your own image or select from our collection
      </DialogDescription>
    </DialogHeader>
    
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload">Upload Image</TabsTrigger>
        <TabsTrigger value="gallery">Choose from Gallery</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="space-y-4 py-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        {/* Upload area */}
        <div
          onClick={handleUploadClick}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <div className="flex flex-col items-center gap-3">
            {uploadedImage ? (
              <div className="space-y-4">
                <Avatar className="w-32 h-32 border-4 border-primary">
                  <AvatarImage src={uploadedImage} alt="Uploaded preview" />
                  <AvatarFallback>Preview</AvatarFallback>
                </Avatar>
                <p className="text-sm text-muted-foreground">
                  Click to upload a different image
                </p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, GIF or WebP (max 2MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        
        {uploadError && (
          <p className="text-sm text-destructive text-center">{uploadError}</p>
        )}
        
        {uploadedImage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setUploadedImage(null);
              setSelectedAvatar("");
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            className="w-full"
          >
            Clear Upload
          </Button>
        )}
      </TabsContent>
      
      <TabsContent value="gallery" className="py-4">
        <div className="grid grid-cols-4 gap-4">
          {avatarOptions.map((url, index) => (
            <button
              key={index}
              onClick={() => {
                handleAvatarSelect(url);
                setUploadedImage(null);
              }}
              className={`relative rounded-full overflow-hidden aspect-square border-4 transition-all hover:scale-105 ${
                selectedAvatar === url && !uploadedImage
                  ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <img
                src={url}
                alt={`Avatar option ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {selectedAvatar === url && !uploadedImage && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      </TabsContent>
    </Tabs>
    
    <div className="flex justify-between items-center pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={handleRemoveAvatar}
      >
        Remove Avatar
      </Button>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setShowAvatarDialog(false);
            setUploadError("");
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleAvatarSave}
          disabled={!selectedAvatar && !uploadedImage}
        >
          Save Avatar
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

{/* Delete Account Dialog */}
<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <DialogContent className="sm:max-w-[450px]">
    <DialogHeader>
      <DialogTitle className="text-destructive flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        Delete Account Permanently?
      </DialogTitle>
      <DialogDescription asChild>
        <div className="space-y-3 pt-2">
          <p>This action <strong>cannot be undone</strong>. This will permanently:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Delete your profile and all personal information</li>
            <li>Remove all your reviews and ratings</li>
            <li>Delete all your reading lists</li>
            <li>Remove your account from Cognito</li>
            <li>Delete all associated data from our servers</li>
          </ul>
        </div>
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="deleteConfirmText">
          Type <strong>delete</strong> to confirm
        </Label>
        <Input
          id="deleteConfirmText"
          type="text"
          placeholder="Type 'delete' to confirm"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          className="w-full"
          disabled={isDeleting}
        />
      </div>
    </div>
    
    <div className="flex justify-end gap-2 pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setShowDeleteDialog(false);
          setDeleteConfirmText("");
        }}
        disabled={isDeleting}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={deleteConfirmText.toLowerCase() !== "delete" || isDeleting}
        onClick={handleDeleteAccount}
      >
        {isDeleting ? "Deleting..." : "Delete My Account"}
      </Button>
    </div>
  </DialogContent>
</Dialog>
</div>
  );
}