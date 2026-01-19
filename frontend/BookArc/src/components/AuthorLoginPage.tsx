import { useState } from "react";
import { BookMarked, Mail, Lock, User, ArrowLeft, Pen, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { GoogleLogo } from "./GoogleLogo";
import { ThemeToggle } from "./ThemeToggle";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from "sonner";
import { Logo } from "./Logo";

interface AuthorLoginPageProps {
  onBack?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AuthorLoginPage({ onBack, onLogin, onRegister, theme, onToggleTheme }: AuthorLoginPageProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPenName, setRegisterPenName] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [requestVerification, setRequestVerification] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!loginEmail) {
      newErrors.loginEmail = "Email is required";
    } else if (!validateEmail(loginEmail)) {
      newErrors.loginEmail = "Please enter a valid email";
    }

    if (!loginPassword) {
      newErrors.loginPassword = "Password is required";
    } else if (!validatePassword(loginPassword)) {
      newErrors.loginPassword = "Password must be at least 8 characters";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      
      toast.loading("Signing in...");
      
      // Simulate API call
      setTimeout(() => {
        toast.dismiss();
        
        const authorData = {
          email: loginEmail,
          name: loginEmail.split('@')[0],
          profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
        };
        
        // Store author data
        localStorage.setItem("authorData", JSON.stringify(authorData));
        localStorage.setItem("isAuthorLoggedIn", "true");
        localStorage.setItem("loginMethod", "email");
        
        console.log("Author login successful", { email: loginEmail });
        
        toast.success("Welcome back!", {
          description: "You have successfully signed in.",
        });
        
        setIsLoading(false);
        
        setTimeout(() => {
          onLogin?.();
        }, 500);
      }, 1500);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!registerEmail) {
      newErrors.registerEmail = "Email is required";
    } else if (!validateEmail(registerEmail)) {
      newErrors.registerEmail = "Please enter a valid email";
    }

    if (!registerPenName) {
      newErrors.registerPenName = "Pen name is required";
    } else if (registerPenName.length < 2) {
      newErrors.registerPenName = "Pen name must be at least 2 characters";
    }

    if (!registerPassword) {
      newErrors.registerPassword = "Password is required";
    } else if (!validatePassword(registerPassword)) {
      newErrors.registerPassword = "Password must be at least 8 characters";
    }

    if (!registerConfirmPassword) {
      newErrors.registerConfirmPassword = "Please confirm your password";
    } else if (registerPassword !== registerConfirmPassword) {
      newErrors.registerConfirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      
      toast.loading("Creating your author account...");
      
      // Simulate API call
      setTimeout(() => {
        toast.dismiss();
        
        const authorData = {
          email: registerEmail,
          name: registerPenName,
          profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
          verified: requestVerification,
        };
        
        // Store author data
        localStorage.setItem("authorData", JSON.stringify(authorData));
        localStorage.setItem("isAuthorLoggedIn", "true");
        localStorage.setItem("loginMethod", "email");
        
        console.log("Author registration successful", { 
          email: registerEmail, 
          penName: registerPenName,
          requestVerification 
        });
        
        toast.success("Account created successfully!", {
          description: requestVerification 
            ? "Your verification request has been submitted." 
            : `Welcome to BookArc, ${registerPenName}!`,
        });
        
        setIsLoading(false);
        
        setTimeout(() => {
          onRegister?.();
        }, 500);
      }, 1500);
    }
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setGoogleAuthInProgress(true);
    setErrors({});
    
    // Show loading toast
    toast.loading("Opening Google Sign-In...", {
      description: "Please wait while we redirect you to Google",
    });
    
    // Simulate Google OAuth flow with multiple steps
    setTimeout(() => {
      toast.dismiss();
      toast.loading("Authenticating with Google...");
      
      // Second step - authentication
      setTimeout(() => {
        toast.dismiss();
        
        // Simulate successful Google authentication
        const googleUserData = {
          email: "author@gmail.com",
          name: "Google Author",
          profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
          googleId: "google_" + Math.random().toString(36).substr(2, 9),
        };
        
        console.log("Google sign-in successful for author:", googleUserData);
        
        // Store author data
        localStorage.setItem("authorData", JSON.stringify(googleUserData));
        localStorage.setItem("isAuthorLoggedIn", "true");
        localStorage.setItem("loginMethod", "google");
        
        // Show success toast
        toast.success("Successfully signed in with Google!", {
          description: `Welcome, ${googleUserData.name}!`,
          duration: 3000,
        });
        
        setIsLoading(false);
        setGoogleAuthInProgress(false);
        
        // Navigate to author dashboard after a brief delay
        setTimeout(() => {
          onLogin?.();
        }, 800);
      }, 1000);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-b from-background via-background to-card">
      <div className="w-full max-w-md">
        {/* Top Bar with Back and Theme Toggle */}
        <div className="flex items-center justify-between mb-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          )}
          <div className={onBack ? "" : "ml-auto"}>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Logo className="w-10 h-10" />
          <span className="text-3xl">BookArc</span>
        </div>
        
        {/* Author Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Pen className="w-5 h-5 text-accent" />
          <span className="text-muted-foreground">Author Portal</span>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Welcome Back, Author</CardTitle>
                <CardDescription>Sign in to manage your books and profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Google Auth Progress Indicator */}
                {googleAuthInProgress && (
                  <Alert className="border-primary/50 bg-primary/10">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Connecting to Google... Please wait while we authenticate your account.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full relative overflow-hidden group hover:border-primary/50 transition-all"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  {isLoading && googleAuthInProgress ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <GoogleLogo className="w-5 h-5 mr-2" />
                  )}
                  {isLoading && googleAuthInProgress ? "Connecting..." : "Continue with Google"}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </Button>

                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground">
                    or
                  </span>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="author@email.com"
                        className={`pl-10 ${errors.loginEmail ? 'border-red-500' : ''}`}
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          setErrors((prev) => ({ ...prev, loginEmail: "" }));
                        }}
                      />
                    </div>
                    {errors.loginEmail && (
                      <p className="text-sm text-red-500">{errors.loginEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className={`pl-10 ${errors.loginPassword ? 'border-red-500' : ''}`}
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, loginPassword: "" }));
                        }}
                      />
                    </div>
                    {errors.loginPassword && (
                      <p className="text-sm text-red-500">{errors.loginPassword}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-end">
                    <a href="#forgot" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </a>
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Join as an Author</CardTitle>
                <CardDescription>Share your work with the BookArc community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Google Auth Progress Indicator */}
                {googleAuthInProgress && (
                  <Alert className="border-primary/50 bg-primary/10">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Connecting to Google... Please wait while we authenticate your account.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full relative overflow-hidden group hover:border-primary/50 transition-all"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  {isLoading && googleAuthInProgress ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <GoogleLogo className="w-5 h-5 mr-2" />
                  )}
                  {isLoading && googleAuthInProgress ? "Connecting..." : "Sign up with Google"}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </Button>

                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground">
                    or
                  </span>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="author@email.com"
                        className={`pl-10 ${errors.registerEmail ? 'border-red-500' : ''}`}
                        value={registerEmail}
                        onChange={(e) => {
                          setRegisterEmail(e.target.value);
                          setErrors((prev) => ({ ...prev, registerEmail: "" }));
                        }}
                      />
                    </div>
                    {errors.registerEmail && (
                      <p className="text-sm text-red-500">{errors.registerEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-penname">Pen Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-penname"
                        type="text"
                        placeholder="J.K. Rowling"
                        className={`pl-10 ${errors.registerPenName ? 'border-red-500' : ''}`}
                        value={registerPenName}
                        onChange={(e) => {
                          setRegisterPenName(e.target.value);
                          setErrors((prev) => ({ ...prev, registerPenName: "" }));
                        }}
                      />
                    </div>
                    {errors.registerPenName && (
                      <p className="text-sm text-red-500">{errors.registerPenName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        className={`pl-10 ${errors.registerPassword ? 'border-red-500' : ''}`}
                        value={registerPassword}
                        onChange={(e) => {
                          setRegisterPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, registerPassword: "" }));
                        }}
                      />
                    </div>
                    {errors.registerPassword && (
                      <p className="text-sm text-red-500">{errors.registerPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        className={`pl-10 ${errors.registerConfirmPassword ? 'border-red-500' : ''}`}
                        value={registerConfirmPassword}
                        onChange={(e) => {
                          setRegisterConfirmPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, registerConfirmPassword: "" }));
                        }}
                      />
                    </div>
                    {errors.registerConfirmPassword && (
                      <p className="text-sm text-red-500">{errors.registerConfirmPassword}</p>
                    )}
                  </div>

                  {/* Verification Badge Request */}
                  <div className="flex items-start space-x-3 rounded-md border border-border p-4 bg-muted/30">
                    <Checkbox
                      id="verification"
                      checked={requestVerification}
                      onCheckedChange={(checked) => setRequestVerification(checked as boolean)}
                    />
                    <div className="space-y-1 leading-none">
                      <Label
                        htmlFor="verification"
                        className="cursor-pointer"
                      >
                        Request verification badge
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get a verified author badge after our team reviews your credentials
                      </p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Author Account"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Need help? <a href="#support" className="text-primary hover:underline">Contact Support</a>
        </p>
      </div>
    </div>
  );
}