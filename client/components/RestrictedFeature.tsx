import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RestrictedFeatureProps {
  children: ReactNode;
  isRestricted: boolean;
  featureName?: string;
  className?: string;
}

export default function RestrictedFeature({ 
  children, 
  isRestricted, 
  featureName = "feature",
  className = ""
}: RestrictedFeatureProps) {
  const navigate = useNavigate();

  if (!isRestricted) {
    return <>{children}</>;
  }

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Blurred/disabled content */}
      <div className="filter blur-sm opacity-50 pointer-events-none select-none">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-lg border-2 border-dashed border-orange-300 dark:border-orange-600">
        <div className="text-center p-6 max-w-sm">
          <div className="mx-auto mb-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full w-fit">
            <Lock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
            {featureName} Locked
          </h3>
          <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
            Complete your payment to unlock this feature and access your full dashboard.
          </p>
          <Button 
            onClick={handleUpgrade}
            size="sm"
            className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Complete Payment
          </Button>
        </div>
      </div>
    </div>
  );
}