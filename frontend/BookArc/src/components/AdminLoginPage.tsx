import { useState } from "react";
import { BookMarked, Mail, Lock, ArrowLeft, Shield, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

interface AdminLoginPageProps {
  onBack?: () => void;
  onLogin?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AdminLoginPage({ onBack, onLogin, theme, onToggleTheme }: AdminLoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!email) {
      newErrors.email = "Admin email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid admin email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        console.log("Admin login attempt", { email });
        setIsLoading(false);
        onLogin?.();
      }, 1500);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!forgotPasswordEmail) {
      newErrors.forgotPasswordEmail = "Admin email is required";
    } else if (!validateEmail(forgotPasswordEmail)) {
      newErrors.forgotPasswordEmail = "Please enter a valid admin email";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        console.log("Password reset requested for admin:", forgotPasswordEmail);
        setResetEmailSent(true);
        setIsLoading(false);
      }, 1500);
    }
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
        
        {/* Admin Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-destructive" />
          <span className="text-muted-foreground">Admin Access Only</span>
        </div>

        {/* Security Alert */}
        <Alert className="mb-6 border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">
            This area is restricted to authorized administrators only. All access attempts are logged.
          </AlertDescription>
        </Alert>

        {!showForgotPassword ? (
          // Login Form
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>Enter your administrator credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@bookhub.com"
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors((prev) => ({ ...prev, email: "" }));
                      }}
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="••••••••"
                      className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: "" }));
                      }}
                      autoComplete="current-password"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90" 
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Sign In as Admin"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          // Forgot Password Form
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Reset Admin Password</CardTitle>
              <CardDescription>
                Password reset requests are sent to your registered admin email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resetEmailSent ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <AlertCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-sm">
                      If an admin account exists with this email, password reset instructions have been sent.
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                      setForgotPasswordEmail("");
                    }}
                  >
                    Back to Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Admin Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="admin@bookhub.com"
                        className={`pl-10 ${errors.forgotPasswordEmail ? 'border-red-500' : ''}`}
                        value={forgotPasswordEmail}
                        onChange={(e) => {
                          setForgotPasswordEmail(e.target.value);
                          setErrors((prev) => ({ ...prev, forgotPasswordEmail: "" }));
                        }}
                        autoComplete="email"
                      />
                    </div>
                    {errors.forgotPasswordEmail && (
                      <p className="text-sm text-red-500">{errors.forgotPasswordEmail}</p>
                    )}
                  </div>

                  <Alert className="border-border">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Password reset links are only sent to verified admin email addresses. Contact the system administrator if you need assistance.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordEmail("");
                        setErrors({});
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-primary hover:bg-primary/90" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Not an admin? <a href="#" onClick={onBack} className="text-primary hover:underline">Return to main site</a>
        </p>
      </div>
    </div>
  );
}