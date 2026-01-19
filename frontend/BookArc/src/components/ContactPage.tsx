import { Moon, Sun, BookOpen, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "./ui/button";
import { Toaster } from "./ui/sonner";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

interface ContactPageProps {
  onBack: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogoClick: () => void;
}

export function ContactPage({ onBack, theme, onToggleTheme, onLogoClick }: ContactPageProps) {
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
          <h1 className="text-5xl mb-6">Contact Us</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Have a question, suggestion, or just want to say hello? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Contact Information */}
            <div>
              <h2 className="text-3xl mb-6 text-center">Get in Touch</h2>
              <p className="text-muted-foreground mb-8 text-center">
                We're here to help and answer any questions you might have. We look forward to hearing from you!
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="flex flex-col items-center text-center gap-4 p-6 rounded-lg border bg-card">
                  <Mail className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="mb-2">Email</h3>
                    <p className="text-muted-foreground">supportbookarc@gmail.com</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      We'll respond within 24 hours
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center gap-4 p-6 rounded-lg border bg-card">
                  <Phone className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="mb-2">Phone</h3>
                    <p className="text-muted-foreground">+962 6 123 4567</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Mon-Fri, 9am-6pm
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center gap-4 p-6 rounded-lg border bg-card">
                  <MapPin className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="mb-2">Office</h3>
                    <p className="text-muted-foreground">
                      Jordan, Amman
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg bg-primary/5 border border-primary/20">
                  <h3 className="mb-2">For Authors</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    If you're an author interested in partnering with BookArc or have questions about our author verification process, please email us at:
                  </p>
                  <a href="mailto:supportbookarc@gmail.com" className="text-primary hover:underline">
                    supportbookarc@gmail.com
                  </a>
                </div>

                <div className="p-6 rounded-lg bg-muted/50 border">
                  <h3 className="mb-2">Report an Issue</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Found a bug or inappropriate content? Help us maintain a safe and quality platform:
                  </p>
                  <a href="mailto:supportbookarc@gmail.com" className="text-primary hover:underline">
                    supportbookarc@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Toaster />
    </div>
  );
}