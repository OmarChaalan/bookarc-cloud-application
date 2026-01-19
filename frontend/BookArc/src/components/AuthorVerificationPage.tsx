import { useState } from "react";
import { ArrowLeft, BookMarked, Upload, CheckCircle, AlertCircle, Loader2, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";

interface AuthorVerificationPageProps {
  onBack: () => void;
  onVerified: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AuthorVerificationPage({ onBack, onVerified, theme, onToggleTheme }: AuthorVerificationPageProps) {
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "failed">("idle");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleIdCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setIdCardFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdCardPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.success("ID card uploaded successfully");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.success("Photo uploaded successfully");
    }
  };

  const handleVerification = async () => {
    if (!idCardFile || !photoFile) {
      toast.error("Please upload both ID card and photo");
      return;
    }

    setIsVerifying(true);
    setVerificationStatus("verifying");

    // Simulate verification process
    setTimeout(() => {
      setStep(2);
      toast.info("Analyzing ID card...");
    }, 1500);

    setTimeout(() => {
      setStep(3);
      toast.info("Matching face with ID...");
    }, 3000);

    setTimeout(() => {
      setIsVerifying(false);
      setVerificationStatus("success");
      toast.success("Verification successful! You can now complete your registration.");
    }, 5000);
  };

  const handleContinueToRegistration = () => {
    onVerified();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <BookMarked className="w-6 h-6 text-primary" />
            <span className="text-xl">BookArc</span>
          </div>

          {/* Right: Theme Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
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
            Back to Login
          </Button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl mb-3">Author Verification</h1>
            <p className="text-muted-foreground">
              To ensure the authenticity of our author community, we require identity verification before registration.
            </p>
          </div>

          {/* Verification Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  1
                </div>
                <span className="hidden sm:inline">Upload Documents</span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  2
                </div>
                <span className="hidden sm:inline">Verify ID</span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  3
                </div>
                <span className="hidden sm:inline">Match Face</span>
              </div>
            </div>
          </div>

          {verificationStatus === "success" ? (
            /* Success State */
            <Card className="p-8 bg-card border border-border">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl mb-2">Verification Successful!</h2>
                <p className="text-muted-foreground mb-6">
                  Your identity has been verified. You can now proceed to complete your author registration.
                </p>
                <Button
                  size="lg"
                  onClick={handleContinueToRegistration}
                  className="bg-primary hover:bg-primary/90"
                >
                  Continue to Registration
                </Button>
              </div>
            </Card>
          ) : (
            /* Upload Form */
            <Card className="p-6 md:p-8 bg-card border border-border">
              <Alert className="mb-6 bg-primary/10 border-primary/30">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  <strong>Privacy Notice:</strong> Your documents are encrypted and used only for verification purposes. They will not be shared with third parties.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                {/* ID Card Upload */}
                <div>
                  <Label className="mb-2 block">Government-issued ID Card *</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload a clear photo of your passport, driver's license, or national ID card
                  </p>
                  <div className="space-y-3">
                    {idCardPreview ? (
                      <div className="relative border-2 border-dashed border-primary/50 rounded-lg p-4 bg-primary/5">
                        <img
                          src={idCardPreview}
                          alt="ID Card Preview"
                          className="max-h-48 mx-auto rounded"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIdCardFile(null);
                            setIdCardPreview("");
                          }}
                          className="absolute top-2 right-2"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-accent/10 transition-colors">
                        <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground mb-1">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs text-muted-foreground">
                          PNG, JPG or PDF (max. 5MB)
                        </span>
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleIdCardUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Selfie Upload */}
                <div>
                  <Label className="mb-2 block">Selfie Photo *</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload a clear selfie showing your face. Make sure your face is well-lit and matches your ID
                  </p>
                  <div className="space-y-3">
                    {photoPreview ? (
                      <div className="relative border-2 border-dashed border-primary/50 rounded-lg p-4 bg-primary/5">
                        <img
                          src={photoPreview}
                          alt="Photo Preview"
                          className="max-h-48 mx-auto rounded"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview("");
                          }}
                          className="absolute top-2 right-2"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-accent/10 transition-colors">
                        <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground mb-1">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs text-muted-foreground">
                          PNG or JPG (max. 5MB)
                        </span>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Verification Status */}
                {verificationStatus === "verifying" && (
                  <Alert className="bg-blue-500/10 border-blue-500/30">
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    <AlertDescription>
                      <strong>Verifying your identity...</strong>
                      <br />
                      <span className="text-sm">
                        {step === 1 && "Processing documents..."}
                        {step === 2 && "Analyzing ID card information..."}
                        {step === 3 && "Matching face with ID photo..."}
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                {verificationStatus === "failed" && (
                  <Alert className="bg-red-500/10 border-red-500/30">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription>
                      <strong>Verification Failed</strong>
                      <br />
                      <span className="text-sm">
                        We couldn't verify your identity. Please ensure your documents are clear and your face is visible.
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  size="lg"
                  onClick={handleVerification}
                  disabled={!idCardFile || !photoFile || isVerifying}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Identity"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By uploading your documents, you agree to our{" "}
                  <a href="#" className="text-primary hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </Card>
          )}

          {/* Info Cards */}
          {verificationStatus === "idle" && (
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <Card className="p-4 bg-card border border-border">
                <h3 className="text-sm mb-2">Why do we need this?</h3>
                <p className="text-xs text-muted-foreground">
                  We verify all authors to maintain trust and prevent fraud in our community. This protects both authors and readers.
                </p>
              </Card>
              <Card className="p-4 bg-card border border-border">
                <h3 className="text-sm mb-2">How long does it take?</h3>
                <p className="text-xs text-muted-foreground">
                  Verification is instant using our automated system. In rare cases, manual review may take up to 24 hours.
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}