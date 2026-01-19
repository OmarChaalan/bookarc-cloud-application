import { useState } from "react";
import {
  ArrowLeft,
  BookMarked,
  CheckCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";

interface AuthorRegistrationPageProps {
  onBack: () => void;
  onRegister: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AuthorRegistrationPage({
  onBack,
  onRegister,
  theme,
  onToggleTheme,
}: AuthorRegistrationPageProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    penName: "",
    email: "",
    password: "",
    confirmPassword: "",
    bio: "",
    website: "",
    genre: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.password
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    toast.success(
      "Registration successful! Welcome to BookArc",
    );
    onRegister();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-primary" />
            <span className="text-xl">BookArc</span>
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6 hover:bg-accent/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-3xl md:text-4xl mb-3">
              Complete Your Registration
            </h1>
            <p className="text-muted-foreground">
              You're verified! Now let's set up your author
              profile.
            </p>
          </div>

          {/* Registration Form */}
          <Card className="p-6 md:p-8 bg-card border border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                  className="mt-2"
                />
              </div>

              {/* Pen Name */}
              <div>
                <Label htmlFor="penName">
                  Pen Name (Optional)
                </Label>
                <Input
                  id="penName"
                  name="penName"
                  value={formData.penName}
                  onChange={handleInputChange}
                  placeholder="J.D. Writer"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If you write under a different name, enter it
                  here
                </p>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="author@example.com"
                  required
                  className="mt-2"
                />
              </div>

              {/* Password */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell readers about yourself and your writing journey..."
                  rows={4}
                  className="mt-2 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.bio.length}/500 characters
                </p>
              </div>

              {/* Website */}
              <div>
                <Label htmlFor="website">
                  Website (Optional)
                </Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://yourwebsite.com"
                  className="mt-2"
                />
              </div>

              {/* Genre */}
              <div>
                <Label htmlFor="genre">Primary Genre</Label>
                <Input
                  id="genre"
                  name="genre"
                  value={formData.genre}
                  onChange={handleInputChange}
                  placeholder="Fiction, Mystery, Romance, etc."
                  className="mt-2"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary hover:bg-primary/90"
              >
                Complete Registration
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By registering, you agree to our{" "}
                <a
                  href="#"
                  className="text-primary hover:underline"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}