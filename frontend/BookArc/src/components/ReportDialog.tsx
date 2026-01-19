import { useState } from "react";
import { Flag, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

interface ReportDialogProps {
  reportType: "user" | "author" | "review" | "book";
  targetName: string;
  onSubmit?: (reason: string, details: string) => void;
  isUserLoggedIn: boolean;
  onLoginRequired?: () => void;
}

export function ReportDialog({ reportType, targetName, onSubmit, isUserLoggedIn, onLoginRequired }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !isUserLoggedIn) {
      toast.error("Please log in to report content");
      if (onLoginRequired) {
        setTimeout(() => onLoginRequired(), 1500);
      }
      return;
    }
    setOpen(newOpen);
  };

  const reportReasons = {
    user: [
      "Harassment or bullying",
      "Spam or promotional content",
      "Inappropriate profile content",
      "Impersonation",
      "Abusive behavior",
      "Other"
    ],
    author: [
      "Fraudulent author claims",
      "Inappropriate content",
      "Copyright violation",
      "Impersonation",
      "Spam or promotional abuse",
      "Other"
    ],
    review: [
      "Spam or promotional content",
      "Harassment or hate speech",
      "Spoilers without warning",
      "Inappropriate language",
      "Fake or misleading review",
      "Other"
    ],
    book: [
      "Copyright violation",
      "Inappropriate content",
      "Misleading information",
      "Plagiarism",
      "Offensive material",
      "Other"
    ]
  };

  const handleSubmit = () => {
    if (!selectedReason) {
      toast.error("Please select a reason for reporting");
      return;
    }

    // Call the optional onSubmit callback if provided
    if (onSubmit) {
      onSubmit(selectedReason, additionalDetails);
    }

    // Show success message
    toast.success("Report submitted successfully", {
      description: "Our team will review this report shortly."
    });

    // Reset and close
    setSelectedReason("");
    setAdditionalDetails("");
    setOpen(false);
  };

  const getDialogTitle = () => {
    switch (reportType) {
      case "user":
        return "Report User";
      case "author":
        return "Report Author";
      case "review":
        return "Report Review";
      case "book":
        return "Report Book";
      default:
        return "Report";
    }
  };

  const getDialogDescription = () => {
    return `You are reporting ${reportType === "user" || reportType === "author" ? "" : "a "}${reportType} "${targetName}". Please select the reason for your report.`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Flag className="w-4 h-4" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Reason for reporting *</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {reportReasons[reportType].map((reason, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason} id={`reason-${index}`} />
                  <Label 
                    htmlFor={`reason-${index}`} 
                    className="cursor-pointer"
                  >
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              placeholder="Provide any additional context that might help us review this report..."
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              rows={4}
            />
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> False reports may result in action against your account. 
              All reports are reviewed by our moderation team.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="destructive"
            disabled={!selectedReason}
          >
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}