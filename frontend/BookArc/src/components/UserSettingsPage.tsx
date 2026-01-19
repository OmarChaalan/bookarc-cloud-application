import { useState } from "react";
import { ChevronLeft, Lock, Globe, User, Bell, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";

interface UserSettingsPageProps {
  onBack: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  isPrivate: boolean;
  onTogglePrivacy: () => void;
  userName: string;
}

export function UserSettingsPage({ 
  onBack, 
  theme, 
  onToggleTheme, 
  isPrivate, 
  onTogglePrivacy,
  userName 
}: UserSettingsPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Back Button & Title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Logo className="w-6 h-6" />
              <span className="text-xl">Settings</span>
            </div>
          </div>

          {/* Right: Theme Toggle */}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Privacy Settings */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Privacy Settings</CardTitle>
            </div>
            <CardDescription>
              Control who can see your profile and activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Privacy Toggle */}
            <div className="flex items-start justify-between space-x-4 p-4 rounded-lg border border-border bg-card">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="profile-privacy" className="text-base font-medium cursor-pointer">
                    Profile Privacy
                  </Label>
                  <Badge variant={isPrivate ? "default" : "outline"}>
                    {isPrivate ? (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        Private
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 mr-1" />
                        Public
                      </>
                    )}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isPrivate 
                    ? "Your profile is private. Users must send you a follow request to see your activity."
                    : "Your profile is public. Anyone can see your reviews, ratings, and reading lists."
                  }
                </p>
              </div>
              <Switch
                id="profile-privacy"
                checked={isPrivate}
                onCheckedChange={onTogglePrivacy}
              />
            </div>

            <Separator />

            {/* Privacy Information */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Eye className="w-4 h-4" />
                What's visible when your profile is public?
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Your profile information (bio, location, stats)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Your book reviews and ratings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Your reading lists and favorite books</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Your followers and following lists</span>
                </li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                What happens when your profile is private?
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Users must send a follow request to see your profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>You can approve or reject follow requests</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Only approved followers can see your activity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Your profile will show as "Private Account" to non-followers</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings (Placeholder) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>
              Manage how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
              <div className="flex-1">
                <Label htmlFor="email-notifications" className="font-medium cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receive email updates about new followers, reviews, and recommendations
                </p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
              <div className="flex-1">
                <Label htmlFor="push-notifications" className="font-medium cursor-pointer">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Get instant notifications for important updates
                </p>
              </div>
              <Switch id="push-notifications" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}