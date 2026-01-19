import { Moon, Sun, BookOpen, Users, TrendingUp, Award, Heart, Target } from "lucide-react";
import { Button } from "./ui/button";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

interface AboutPageProps {
  onBack: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogoClick: () => void;
}

export function AboutPage({ onBack, theme, onToggleTheme, onLogoClick }: AboutPageProps) {
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
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl mb-6">About BookArc</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your premier destination for discovering, rating, and reviewing books. We're building a community where readers and authors connect.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <Target className="w-8 h-8 text-primary" />
              <h2 className="text-3xl">Our Mission</h2>
            </div>
            <p className="text-lg text-muted-foreground text-center mb-12">
              At BookArc, we believe that every book has a story to tell and every reader has a voice that deserves to be heard. Our mission is to create a vibrant community where readers can discover their next favorite book and authors can share their work with passionate audiences.
            </p>

            <div className="grid md:grid-cols-3 gap-8 mt-16">
              <div className="text-center p-6 rounded-lg border bg-card">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl mb-3">Discover</h3>
                <p className="text-muted-foreground">
                  Explore millions of titles across every genre and find your next great read with personalized recommendations.
                </p>
              </div>

              <div className="text-center p-6 rounded-lg border bg-card">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl mb-3">Connect</h3>
                <p className="text-muted-foreground">
                  Join a community of passionate readers and authors. Share your thoughts, insights, and love for literature.
                </p>
              </div>

              <div className="text-center p-6 rounded-lg border bg-card">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl mb-3">Celebrate</h3>
                <p className="text-muted-foreground">
                  Recognize great writing and support authors by rating, reviewing, and recommending their work.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl text-center mb-12">BookArc by the Numbers</h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl mb-2 text-primary">10M+</div>
              <div className="text-muted-foreground">Books</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2 text-primary">5M+</div>
              <div className="text-muted-foreground">Readers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2 text-primary">100K+</div>
              <div className="text-muted-foreground">Authors</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2 text-primary">50M+</div>
              <div className="text-muted-foreground">Reviews</div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <Heart className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl mb-2">Community First</h3>
                <p className="text-muted-foreground">
                  We prioritize building a supportive, inclusive community where every voice matters and everyone feels welcome.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <TrendingUp className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl mb-2">Innovation</h3>
                <p className="text-muted-foreground">
                  We continuously improve our platform with new features and tools to enhance your reading experience.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <Award className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl mb-2">Quality</h3>
                <p className="text-muted-foreground">
                  We're committed to maintaining high standards for content, reviews, and user interactions on our platform.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <Users className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl mb-2">Transparency</h3>
                <p className="text-muted-foreground">
                  We believe in open communication and honest feedback to create trust within our community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl mb-6">Join Our Community</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Whether you're a reader looking for your next favorite book or an author wanting to share your work, BookArc is the place for you.
          </p>
          <Button size="lg" onClick={onBack}>
            Get Started
          </Button>
        </div>
      </section>
    </div>
  );
}