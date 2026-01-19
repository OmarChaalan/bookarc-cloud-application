import { useState } from "react";
import { BookMarked, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { GoogleLogo } from "./GoogleLogo";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

interface LoginPageProps {
  onBack?: () => void;
  onLogin?: (userData: { username: string; email: string }) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  defaultTab?: "login" | "register";
}

export function LoginPage({ onBack, onLogin, theme, onToggleTheme, defaultTab = "login" }: LoginPageProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Email verification state
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [registerDisplayName, setRegisterDisplayName] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleLogin = async (e: React.FormEvent) => {
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
      
      try {
        const { authService } = await import('../services/authService');
        
        const session = await authService.login({
          email: loginEmail,
          password: loginPassword,
        });

        console.log("Login successful", session);
        
        if (onLogin) {
          onLogin({
            username: session.username,
            email: session.email
          });
        }
      } catch (error: any) {
        console.error("Login error:", error);
        setErrors({
          loginPassword: error.message || "Login failed. Please check your credentials."
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  const newErrors: { [key: string]: string } = {};

  if (!registerEmail) {
    newErrors.registerEmail = "Email is required";
  } else if (!validateEmail(registerEmail)) {
    newErrors.registerEmail = "Please enter a valid email";
  }

  // NEW: Validate username
  if (!registerUsername) {
    newErrors.registerUsername = "Username is required";
  } else if (registerUsername.length < 3) {
    newErrors.registerUsername = "Username must be at least 3 characters";
  } else if (!/^[a-z0-9_]+$/.test(registerUsername)) {
    newErrors.registerUsername = "Username can only contain lowercase letters, numbers, and underscores";
  }

  // NEW: Validate display name
  if (!registerDisplayName) {
    newErrors.registerDisplayName = "Display name is required";
  } else if (registerDisplayName.length < 2) {
    newErrors.registerDisplayName = "Display name must be at least 2 characters";
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
    
    try {
      const { authService } = await import('../services/authService');
      
      const result = await authService.register({
        email: registerEmail,
        password: registerPassword,
        username: registerUsername,        // NEW: Pass username
        displayName: registerDisplayName,  // NEW: Pass display name
      });

      console.log("Registration successful", result);
      setSuccess(result.message);
      setVerificationEmail(registerEmail);
      setShowVerification(true);
      setRegisterEmail("");
      setRegisterUsername("");
      setRegisterDisplayName("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
    } catch (error: any) {
      console.error("Registration error:", error);
      setErrors({
        registerPassword: error.message || "Registration failed. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  }
};

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setSuccess("");
    
    try {
      const { authService } = await import('../services/authService');
      
      await authService.confirmSignUp(verificationEmail, verificationCode);
      
      setSuccess("Email verified successfully! You can now sign in.");
      setShowVerification(false);
      setVerificationCode("");
    } catch (error: any) {
      console.error("Verification error:", error);
      setErrors({
        verificationCode: error.message || "Verification failed. Please check your code."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle forgot password - send reset code
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setSuccess("");
    
    if (!forgotPasswordEmail) {
      setErrors({ forgotPasswordEmail: "Email is required" });
      setIsLoading(false);
      return;
    }
    
    if (!validateEmail(forgotPasswordEmail)) {
      setErrors({ forgotPasswordEmail: "Please enter a valid email" });
      setIsLoading(false);
      return;
    }
    
    try {
      const { authService } = await import('../services/authService');
      
      await authService.forgotPassword(forgotPasswordEmail);
      
      setSuccess(`Password reset code sent to ${forgotPasswordEmail}`);
      setShowResetPassword(true);
    } catch (error: any) {
      console.error("Forgot password error:", error);
      setErrors({
        forgotPasswordEmail: error.message || "Failed to send reset code. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset with code
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!resetCode) {
      newErrors.resetCode = "Verification code is required";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (!validatePassword(newPassword)) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (!confirmNewPassword) {
      newErrors.confirmNewPassword = "Please confirm your password";
    } else if (newPassword !== confirmNewPassword) {
      newErrors.confirmNewPassword = "Passwords do not match";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      
      try {
        const { authService } = await import('../services/authService');
        
        await authService.resetPassword(forgotPasswordEmail, resetCode, newPassword);
        
        setSuccess("Password reset successfully! You can now sign in with your new password.");
        setShowForgotPassword(false);
        setShowResetPassword(false);
        setForgotPasswordEmail("");
        setResetCode("");
        setNewPassword("");
        setConfirmNewPassword("");
      } catch (error: any) {
        console.error("Reset password error:", error);
        setErrors({
          resetCode: error.message || "Failed to reset password. Please check your code."
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      console.log("Google sign-in initiated");
      setIsLoading(false);
      if (onLogin) {
        onLogin({
          username: "Google User",
          email: "user@gmail.com"
        });
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-b from-background via-background to-card">
      <div className="w-full max-w-md">
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

        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo className="w-10 h-10" />
          <span className="text-3xl">BookArc</span>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* Forgot Password Flow */}
        {showForgotPassword && (
          <Card className="mb-6 border-border bg-card">
            <CardHeader>
              <CardTitle>{showResetPassword ? "Reset Password" : "Forgot Password"}</CardTitle>
              <CardDescription>
                {showResetPassword 
                  ? "Enter the code sent to your email and create a new password"
                  : "Enter your email to receive a password reset code"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showResetPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-password-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="forgot-password-email"
                        type="email"
                        placeholder="your@email.com"
                        className={`pl-10 ${errors.forgotPasswordEmail ? 'border-red-500' : ''}`}
                        value={forgotPasswordEmail}
                        onChange={(e) => {
                          setForgotPasswordEmail(e.target.value);
                          setErrors((prev) => ({ ...prev, forgotPasswordEmail: "" }));
                        }}
                      />
                    </div>
                    {errors.forgotPasswordEmail && (
                      <p className="text-sm text-red-500">{errors.forgotPasswordEmail}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordEmail("");
                        setErrors({});
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? "Sending..." : "Send Code"}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-code">Verification Code</Label>
                    <Input
                      id="reset-code"
                      type="text"
                      placeholder="Enter code from email"
                      className={errors.resetCode ? 'border-red-500' : ''}
                      value={resetCode}
                      onChange={(e) => {
                        setResetCode(e.target.value);
                        setErrors((prev) => ({ ...prev, resetCode: "" }));
                      }}
                    />
                    {errors.resetCode && (
                      <p className="text-sm text-red-500">{errors.resetCode}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        className={`pl-10 ${errors.newPassword ? 'border-red-500' : ''}`}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, newPassword: "" }));
                        }}
                      />
                    </div>
                    {errors.newPassword && (
                      <p className="text-sm text-red-500">{errors.newPassword}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirm-new-password"
                        type="password"
                        placeholder="••••••••"
                        className={`pl-10 ${errors.confirmNewPassword ? 'border-red-500' : ''}`}
                        value={confirmNewPassword}
                        onChange={(e) => {
                          setConfirmNewPassword(e.target.value);
                          setErrors((prev) => ({ ...prev, confirmNewPassword: "" }));
                        }}
                      />
                    </div>
                    {errors.confirmNewPassword && (
                      <p className="text-sm text-red-500">{errors.confirmNewPassword}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowResetPassword(false);
                        setShowForgotPassword(false);
                        setResetCode("");
                        setNewPassword("");
                        setConfirmNewPassword("");
                        setErrors({});
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? "Resetting..." : "Reset Password"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Sign in to your BookArc account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
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
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Join the BookArc community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {showVerification && (
                  <div className="p-4 border border-border rounded-lg bg-muted/50">
                    <h3 className="text-lg font-medium mb-2">Verify Your Email</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      We've sent a verification code to {verificationEmail}
                    </p>
                    <form onSubmit={handleVerifyEmail} className="space-y-4">
                      <div>
                        <Label htmlFor="verification-code">Verification Code</Label>
                        <Input
                          id="verification-code"
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={verificationCode}
                          onChange={(e) => {
                            setVerificationCode(e.target.value);
                            setErrors((prev) => ({ ...prev, verificationCode: "" }));
                          }}
                          className={errors.verificationCode ? 'border-red-500' : ''}
                        />
                        {errors.verificationCode && (
                          <p className="text-sm text-red-500 mt-1">{errors.verificationCode}</p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Verifying..." : "Verify Email"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        disabled={isLoading}
                        onClick={async () => {
                          try {
                            setIsLoading(true);
                            const { authService } = await import('../services/authService');
                            await authService.resendVerificationCode(verificationEmail);
                            setSuccess("Verification code resent!");
                          } catch (error: any) {
                            setErrors({ verificationCode: error.message });
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                      >
                        Resend Code
                      </Button>
                    </form>
                  </div>
                )}

                {!showVerification && (
                  <>
<form onSubmit={handleRegister} className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="register-email">Email</Label>
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        id="register-email"
        type="email"
        placeholder="your@email.com"
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

  {/* NEW: Username Field (Permanent) */}
  <div className="space-y-2">
    <Label htmlFor="register-username">Username</Label>
    <div className="relative">
      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        id="register-username"
        type="text"
        placeholder="username123"
        className={`pl-10 ${errors.registerUsername ? 'border-red-500' : ''}`}
        value={registerUsername}
        onChange={(e) => {
          // Convert to lowercase and remove spaces for username
          const cleanUsername = e.target.value.toLowerCase().replace(/\s/g, '');
          setRegisterUsername(cleanUsername);
          setErrors((prev) => ({ ...prev, registerUsername: "" }));
        }}
      />
    </div>
    {errors.registerUsername && (
      <p className="text-sm text-red-500">{errors.registerUsername}</p>
    )}
    <p className="text-xs text-muted-foreground">
      Your unique username - cannot be changed later
    </p>
  </div>

  {/* NEW: Display Name Field (Changeable) */}
  <div className="space-y-2">
    <Label htmlFor="register-display-name">Display Name</Label>
    <div className="relative">
      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        id="register-display-name"
        type="text"
        placeholder="DisplayName123"
        className={`pl-10 ${errors.registerDisplayName ? 'border-red-500' : ''}`}
        value={registerDisplayName}
        onChange={(e) => {
          setRegisterDisplayName(e.target.value);
          setErrors((prev) => ({ ...prev, registerDisplayName: "" }));
        }}
      />
    </div>
    {errors.registerDisplayName && (
      <p className="text-sm text-red-500">{errors.registerDisplayName}</p>
    )}
    <p className="text-xs text-muted-foreground">
      How your name appears to others (can be changed later)
    </p>
  </div>

  {/* Rest of form (password fields) stays the same */}
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

  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
    {isLoading ? "Creating account..." : "Create Account"}
  </Button>
</form>
                  </>
                )}
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