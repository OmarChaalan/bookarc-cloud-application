import { useState } from "react";
import { BookMarked, Crown, Check, X, CreditCard, Lock, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

interface SubscriptionPageProps {
  onBack: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function SubscriptionPage({ onBack, theme, onToggleTheme }: SubscriptionPageProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "premium">("premium");

  // Form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const freeFeatures = [
    { name: "Access to book ratings and reviews", included: true },
    { name: "Create unlimited reading lists", included: true },
    { name: "Basic recommendations", included: true },
    { name: "Join book discussions", included: true },
    { name: "Follow favorite authors", included: true },
    { name: "Advanced AI-powered recommendations", included: false },
    { name: "Exclusive author Q&A sessions", included: false },
    { name: "Early access to new releases", included: false },
    { name: "Ad-free experience", included: false },
    { name: "Priority customer support", included: false },
    { name: "Download reading statistics", included: false },
    { name: "Custom reading goals & tracking", included: false },
  ];

  const premiumFeatures = [
    { name: "Access to book ratings and reviews", included: true },
    { name: "Create unlimited reading lists", included: true },
    { name: "Basic recommendations", included: true },
    { name: "Join book discussions", included: true },
    { name: "Follow favorite authors", included: true },
    { name: "Advanced AI-powered recommendations", included: true },
    { name: "Exclusive author Q&A sessions", included: true },
    { name: "Early access to new releases", included: true },
    { name: "Ad-free experience", included: true },
    { name: "Priority customer support", included: true },
    { name: "Download reading statistics", included: true },
    { name: "Custom reading goals & tracking", included: true },
  ];

  const handleUpgrade = () => {
    setSelectedPlan("premium");
    setShowPaymentModal(true);
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock payment processing
    console.log("Processing payment...");
    // In a real app, this would integrate with a payment processor
    setTimeout(() => {
      setShowPaymentModal(false);
      // Show success message
      alert("Successfully upgraded to Premium! 🎉");
    }, 1000);
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
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
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <Badge className="mb-4 bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-600/30">
            <Crown className="w-3 h-3 mr-1" />
            Premium Membership
          </Badge>
          <h1 className="text-4xl md:text-5xl mb-4">
            Unlock the Full BookArc Experience
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upgrade to Premium and get exclusive access to advanced features, personalized recommendations, and a completely ad-free reading experience.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>Perfect for casual readers</CardDescription>
              <div className="mt-4">
                <span className="text-4xl">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {freeFeatures.slice(0, 5).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardFooter>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 border-yellow-500 shadow-xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-background px-4 py-1">
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                <CardTitle>Premium</CardTitle>
              </div>
              <CardDescription>For avid readers who want more</CardDescription>
              <div className="mt-4">
                <span className="text-4xl">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Everything in Free, plus:</span>
                </li>
                {premiumFeatures.slice(5).map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-background"
                onClick={handleUpgrade}
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Features Comparison Table */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl text-center mb-8">Compare Plans</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left p-4 font-medium">Features</th>
                      <th className="text-center p-4 font-medium w-32">Free</th>
                      <th className="text-center p-4 font-medium w-32 bg-yellow-500/10">
                        <div className="flex items-center justify-center gap-1">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          <span>Premium</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {freeFeatures.map((feature, index) => (
                      <tr key={index} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                        <td className="p-4 text-sm">{feature.name}</td>
                        <td className="p-4 text-center">
                          {feature.included ? (
                            <Check className="w-5 h-5 text-primary mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                          )}
                        </td>
                        <td className="p-4 text-center bg-yellow-500/5">
                          <Check className="w-5 h-5 text-yellow-500 mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="mt-12 text-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-background"
              onClick={handleUpgrade}
            >
              <Crown className="w-5 h-5 mr-2" />
              Start Your Premium Journey
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Cancel anytime. No questions asked.
            </p>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              Complete your payment to unlock all premium features
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePayment}>
            <div className="space-y-4 py-4">
              {/* Plan Summary */}
              <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Premium Plan</span>
                  <span className="text-sm">$9.99/month</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span>Total</span>
                  <span className="text-xl">$9.99</span>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardName">Cardholder Name</Label>
                  <Input
                    id="cardName"
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <div className="relative">
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      required
                      maxLength={19}
                    />
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                      required
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 4))}
                      required
                      maxLength={4}
                      type="password"
                    />
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Your payment information is encrypted and secure. We never store your full card details.
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-auto bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-background"
              >
                <Crown className="w-4 h-4 mr-2" />
                Confirm Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}