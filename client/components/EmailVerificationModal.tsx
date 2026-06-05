import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailVerificationModal({ isOpen, onClose }: EmailVerificationModalProps) {
  const [step, setStep] = useState<'verify' | 'change-email' | 'enter-code'>('verify');
  const [verificationCode, setVerificationCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userProfile, refreshProfile } = useAuthContext();

  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use newEmail if we're in the enter-code step (after email change), otherwise use current email
      const emailToVerify = step === 'enter-code' ? newEmail : (userProfile?.email || '');
      
      const response = await authApi.verifyEmail({
        email: emailToVerify,
        code: verificationCode,
      });

      if (response.data?.success) {
        toast({
          title: "Success",
          description: "Email verified successfully!",
        });
        await refreshProfile();
        onClose();
        resetModal();
      } else {
        throw new Error(response.data?.message || 'Verification failed');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Verification failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a new email address",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.changeEmail({
        oldEmail: userProfile?.email || '',
        newEmail: newEmail,
      });

      if (response.data?.success) {
        toast({
          title: "Success",
          description: "Email updated! Please check your new email for verification code.",
        });
        await refreshProfile();
        setStep('enter-code');
      } else {
        throw new Error(response.data?.message || 'Failed to change email');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to change email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.resendVerificationCode({
        email: userProfile?.email || '',
      });

      if (response.data?.success) {
        toast({
          title: "Success",
          description: "Verification code sent to your email!",
        });
      } else {
        throw new Error(response.data?.message || 'Failed to resend code');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to resend verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep('verify');
    setVerificationCode('');
    setNewEmail('');
    setIsLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const renderVerifyStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Email Verification Required
        </DialogTitle>
        <DialogDescription className="text-sm sm:text-base leading-relaxed break-words">
          Your email address <strong>{userProfile?.email}</strong> is not verified. 
          Please enter the verification code sent to your email, or change your email address if needed.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verification-code">Verification Code</Label>
          <Input
            id="verification-code"
            type="text"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
            className="w-full max-w-full"
          />
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
        <Button
          variant="outline"
          onClick={() => setStep('change-email')}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          Change Email
        </Button>
        <Button
          variant="outline"
          onClick={handleResendCode}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Resend Code
        </Button>
        <Button onClick={handleVerifyEmail} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Verify Email
        </Button>
      </DialogFooter>
    </>
  );

  const renderChangeEmailStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Mail className="h-5 w-5 text-blue-500" />
          Change Email Address
        </DialogTitle>
        <DialogDescription className="text-sm sm:text-base leading-relaxed break-words">
          Enter your new email address. A verification code will be sent to the new email.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-email">Current Email</Label>
          <Input
            id="current-email"
            type="email"
            value={userProfile?.email || ''}
            disabled
            className="bg-gray-50 w-full max-w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-email">New Email Address</Label>
          <Input
            id="new-email"
            type="email"
            placeholder="Enter new email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full max-w-full"
          />
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
        <Button
          variant="outline"
          onClick={() => setStep('verify')}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          Back
        </Button>
        <Button onClick={handleChangeEmail} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Update Email
        </Button>
      </DialogFooter>
    </>
  );

  const renderEnterCodeStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Verify New Email
        </DialogTitle>
        <DialogDescription className="text-sm sm:text-base leading-relaxed break-words">
          A verification code has been sent to your new email address. Please enter it below.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-verification-code">Verification Code</Label>
          <Input
            id="new-verification-code"
            type="text"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            maxLength={6}
            className="w-full max-w-full"
          />
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
        <Button
          variant="outline"
          onClick={handleResendCode}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Resend Code
        </Button>
        <Button onClick={handleVerifyEmail} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Verify Email
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[500px] w-[92vw] max-w-[92vw] p-4 sm:p-6 max-h-[85vh] overflow-y-auto rounded-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {step === 'verify' && renderVerifyStep()}
        {step === 'change-email' && renderChangeEmailStep()}
        {step === 'enter-code' && renderEnterCodeStep()}
      </DialogContent>
    </Dialog>
  );
}