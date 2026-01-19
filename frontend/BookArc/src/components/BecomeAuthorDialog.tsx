import { useState } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2, Shield, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";
import { apiService } from "../services/apiService";

interface BecomeAuthorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: { fullName: string; idCard: File; selfie: File }) => void;
  verificationStatus: null | "pending" | "approved" | "rejected";
}

export function BecomeAuthorDialog({
  open,
  onOpenChange,
  verificationStatus,
}: BecomeAuthorDialogProps) {
  const [fullName, setFullName] = useState("");
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string>("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    }
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setSelfieFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelfiePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFullName("");
    setIdCardFile(null);
    setIdCardPreview("");
    setSelfieFile(null);
    setSelfiePreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!idCardFile) {
      toast.error("Please upload your ID card");
      return;
    }

    if (!selfieFile) {
      toast.error("Please upload your selfie");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert files to base64
      const idCardBase64 = idCardPreview;
      const selfieBase64 = selfiePreview;

      // Submit verification request
      await apiService.submitAuthorVerification({
        full_name: fullName.trim(),
        id_card_image: idCardBase64,
        selfie_image: selfieBase64,
      });

      toast.success("Verification request submitted successfully!");
      resetForm();
      onOpenChange(false);

      // Reload the page to update verification status
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Failed to submit verification:", error);
      toast.error(error.message || "Failed to submit verification request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user already has approved verification
  if (verificationStatus === "approved") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Already Verified
            </DialogTitle>
            <DialogDescription>
              You are already a verified author! You can access your author dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If user has pending verification
  if (verificationStatus === "pending") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              Verification Pending
            </DialogTitle>
            <DialogDescription>
              Your verification request is currently being reviewed by our admin team. You'll
              be notified once it's approved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main verification form
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Shield className="w-6 h-6 text-primary" />
            Become an Author
          </DialogTitle>
          <DialogDescription>
            Submit your verification documents to become a verified author on BookArc
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-primary/10 border-primary/30">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Privacy Notice:</strong> Your documents are encrypted and used only for
            verification purposes. They will not be shared with third parties.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <Label htmlFor="fullName" className="mb-2 block">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="Enter your full legal name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must match the name on your ID card
            </p>
          </div>

          {/* ID Card Upload */}
          <div>
            <Label className="mb-2 block">
              Government-issued ID Card <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Upload a clear photo of your passport, driver's license, or national ID card
            </p>
            {idCardPreview ? (
              <div className="relative border-2 border-dashed border-primary/50 rounded-lg p-4 bg-primary/5">
                <img
                  src={idCardPreview}
                  alt="ID Card Preview"
                  className="max-h-48 mx-auto rounded"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIdCardFile(null);
                    setIdCardPreview("");
                  }}
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-accent/10 transition-colors">
                <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground mb-1">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG (max. 5MB)
                </span>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleIdCardUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Selfie Upload */}
          <div>
            <Label className="mb-2 block">
              Selfie Photo <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Upload a clear selfie showing your face. Make sure your face is well-lit and
              matches your ID
            </p>
            {selfiePreview ? (
              <div className="relative border-2 border-dashed border-primary/50 rounded-lg p-4 bg-primary/5">
                <img
                  src={selfiePreview}
                  alt="Selfie Preview"
                  className="max-h-48 mx-auto rounded"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelfieFile(null);
                    setSelfiePreview("");
                  }}
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4" />
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
                  onChange={handleSelfieUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {verificationStatus === "rejected" && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription>
                Your previous verification request was rejected. Please review your documents
                and submit again.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !fullName.trim() || !idCardFile || !selfieFile}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Verification"
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By submitting, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}