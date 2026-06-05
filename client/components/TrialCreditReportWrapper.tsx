import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, Crown, ArrowRight } from 'lucide-react';

interface TrialCreditReportWrapperProps {
  children: React.ReactNode;
  allowScores?: boolean; // Whether to show credit scores even for trial users
  featureName?: string; // Name of the feature being restricted
  className?: string;
}

export function TrialCreditReportWrapper({ 
  children, 
  allowScores = true, 
  featureName = "Detailed Credit Report",
  className = ""
}: TrialCreditReportWrapperProps) {
  const { hasActiveSubscription, isLoading } = useSubscriptionStatus();
  const navigate = useNavigate();

  // If user has active subscription or still loading, show full content
  if (hasActiveSubscription || isLoading) {
    return <div className={className}>{children}</div>;
  }

  // For trial users, show blurred content with upgrade prompt
  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="filter blur-sm pointer-events-none select-none">
        {children}
      </div>
      
      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <Card className="p-8 max-w-md mx-4 text-center shadow-xl border-2 border-gradient-primary">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-sea-green to-ocean-blue rounded-full">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Unlock {featureName}
          </h3>
          
          <p className="text-gray-600 mb-6">
            You're currently on a trial account. Upgrade to access detailed credit report information, 
            account summaries, personal information, and advanced analytics.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/pricing')}
              className="w-full bg-gradient-to-r from-sea-green to-ocean-blue text-white hover:from-teal-green hover:to-ocean-blue"
              size="lg"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade Now
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            
            <p className="text-sm text-gray-500">
              Start your subscription to unlock all features
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Specialized wrapper for credit scores - always visible for trial users
export function TrialScoreWrapper({ 
  children, 
  className = ""
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return <div className={className}>{children}</div>;
}

// Specialized wrapper for sensitive information - always blurred for trial users
export function TrialSensitiveWrapper({ 
  children, 
  featureName = "Personal Information",
  className = ""
}: { 
  children: React.ReactNode; 
  featureName?: string;
  className?: string; 
}) {
  const { hasActiveSubscription, isLoading } = useSubscriptionStatus();
  const navigate = useNavigate();

  // If user has active subscription or still loading, show full content
  if (hasActiveSubscription || isLoading) {
    return <div className={className}>{children}</div>;
  }

  // For trial users, show blurred content with smaller upgrade prompt
  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="filter blur-md pointer-events-none select-none opacity-50">
        {children}
      </div>
      
      {/* Compact upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm">
        <div className="text-center p-4">
          <Lock className="h-6 w-6 text-gray-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700 mb-2">
            {featureName} Locked
          </p>
          <Button 
            onClick={() => navigate('/pricing')}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Upgrade to View
          </Button>
        </div>
      </div>
    </div>
  );
}