import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getApiUrl } from "@/config";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

const AuthDialog = ({ open, onClose, onAuthenticated }: AuthDialogProps) => {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(getApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setLoading(false);
      setStep("otp");
      toast.success("OTP sent to your email!");
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : 'Failed to send OTP');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(getApiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      // Store the access token
      console.log("Storing auth token:", data.accessToken.substring(0, 20) + "...");
      localStorage.setItem("auth_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);
      
      console.log("Token stored in localStorage. Verifying...");
      const storedToken = localStorage.getItem("auth_token");
      console.log("Retrieved token:", storedToken ? storedToken.substring(0, 20) + "..." : "null");
      
      setLoading(false);
      toast.success("Successfully authenticated!");
      onAuthenticated();
      onClose();
      
      // Reset form
      setEmail("");
      setOtp("");
      setStep("email");
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : 'Failed to verify OTP');
    }
  };

  const handleBack = () => {
    setStep("email");
    setOtp("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[hsl(var(--ikon-navy))] border-[hsl(var(--ikon-yellow))] border-2">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-[hsl(var(--ikon-yellow))] uppercase">
            {step === "email" ? "Welcome!" : "Enter OTP"}
          </DialogTitle>
          <DialogDescription className="text-white/80">
            {step === "email" 
              ? "Enter your Kindred email to get started. You'll need to have a Kindred account to search." 
              : "Kindred sent a code to your email"}
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-bold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[hsl(var(--ikon-yellow))] to-[hsl(35_100%_50%)] text-[hsl(var(--ikon-navy))] font-black uppercase hover:shadow-[var(--shadow-yellow)]"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-white font-bold">
                One-Time Password
              </Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center text-xl tracking-widest"
                maxLength={6}
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-[hsl(var(--ikon-yellow))] text-[hsl(var(--ikon-yellow))] hover:bg-[hsl(var(--ikon-yellow))]/10 hover:text-[hsl(var(--ikon-yellow))] font-bold"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[hsl(var(--ikon-yellow))] to-[hsl(35_100%_50%)] text-[hsl(var(--ikon-navy))] font-black uppercase hover:shadow-[var(--shadow-yellow)]"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
