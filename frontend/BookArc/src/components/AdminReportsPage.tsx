import { TrendingUp, Users, BookOpen, Activity, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

interface AdminReportsPageProps {
  onBack: () => void;
  onLogoClick: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AdminReportsPage({ onBack, onLogoClick, theme, onToggleTheme }: AdminReportsPageProps) {
  // Key metrics
  const keyMetrics = [
    {
      title: "Total Page Views",
      value: "2.4M",
      change: "+12.3%",
      trend: "up",
      icon: Activity,
    },
    {
      title: "Active Users",
      value: "45.2K",
      change: "+8.1%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Books Added",
      value: "1,234",
      change: "+15.2%",
      trend: "up",
      icon: BookOpen,
    },
    {
      title: "Avg. Session Time",
      value: "8m 32s",
      change: "-2.3%",
      trend: "down",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <Logo className="w-6 h-6" />
            <span className="text-xl">BookArc</span>
          </button>

          {/* Right: Icons */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <Badge variant="outline" className="border-primary/40 text-primary hidden md:flex">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <Button variant="ghost" size="sm" onClick={onLogoClick}>
              Back
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-8 space-y-8">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl mb-2">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into platform performance and user engagement
          </p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {keyMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">{metric.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{metric.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span
                      className={
                        metric.trend === "up"
                          ? "text-primary"
                          : "text-destructive"
                      }
                    >
                      {metric.change}
                    </span>{" "}
                    from last period
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}