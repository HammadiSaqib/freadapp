import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Lock,
  Star,
  CheckCircle,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PaymentPromptProps {
  planName?: string;
  className?: string;
}

export default function PaymentPrompt({ planName, className }: PaymentPromptProps) {
  const navigate = useNavigate();

  const handleCompletePayment = () => {
    // Redirect to subscription page to complete payment
    navigate('/subscription');
  };

  const handleViewPlans = () => {
    navigate('/subscription');
  };

  return (
    <Card className={`border-2 border-dashed border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full w-fit">
          <Lock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
        </div>
        <CardTitle className="text-xl font-bold text-orange-800 dark:text-orange-200">
          Complete Your Payment
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          {planName ? (
            <>You've selected the <strong>{planName}</strong> plan. Complete your payment to unlock all features.</>
          ) : (
            "Complete your subscription payment to access all dashboard features."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-300">
            <Clock className="h-3 w-3 mr-1" />
            Payment Pending
          </Badge>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-orange-800 dark:text-orange-200 flex items-center">
            <Star className="h-4 w-4 mr-2" />
            What you'll unlock:
          </h4>
          <ul className="space-y-2 text-sm text-orange-700 dark:text-orange-300">
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Full client management system
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Advanced dispute tracking
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Detailed analytics and reports
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              AI-powered credit coaching
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Automated workflow tools
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            onClick={handleCompletePayment}
            className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Complete Payment
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button 
            variant="outline" 
            onClick={handleViewPlans}
            className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:border-orange-600 dark:hover:bg-orange-950/20"
          >
            View Plans
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}