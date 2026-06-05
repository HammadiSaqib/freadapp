import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { authApi, setAuthToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertTriangle,
  CreditCard,
  CheckCircle,
  Award,
  Settings,
  TrendingUp,
  Users,
  PieChart,
  FileText,
  BarChart3,
  Target,
  Calendar,
  Bell,
} from "lucide-react";

export default function ClientLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem("auth_token");
    if (token) {
      navigate("/member/dashboard");
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.clientLogin(
        loginData.email,
        loginData.password
      );

      if (response.error) {
        toast({
          title: "Authentication Failed",
          description: response.error,
          variant: "destructive",
        });
        return;
      }

      if (response.data?.token) {
        setAuthToken(response.data.token);
        toast({
          title: "Client Access Granted",
          description: "Welcome to your Funding Dashboard.",
        });
        navigate("/member/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "System Error",
        description: error.message || "Authentication system unavailable.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clientFeatures = [
    {
      icon: CreditCard,
      title: "Credit Monitoring",
      description: "Real-time credit score tracking and report analysis",
    },
    {
      icon: FileText,
      title: "Progress Reports",
      description: "Detailed progress tracking and improvement insights",
    },
    {
      icon: BarChart3,
      title: "Score Analytics",
      description: "Comprehensive credit score history and trends",
    },
    {
      icon: Target,
      title: "Goal Tracking",
      description: "Set and monitor your credit improvement goals",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800/95 dark:to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background image overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/60 via-white/40 to-emerald-50/60 dark:from-slate-800/90 dark:via-slate-700/80 dark:to-slate-800/90"></div>

        {/* Floating credit-themed images */}
        <div className="absolute top-20 right-20 w-64 h-40 rounded-2xl overflow-hidden shadow-2xl opacity-10 rotate-12 hover:opacity-20 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/259200/pexels-photo-259200.jpeg"
            alt="Credit score improvement"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute bottom-32 left-16 w-48 h-32 rounded-2xl overflow-hidden shadow-2xl opacity-10 -rotate-12 hover:opacity-20 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/164527/pexels-photo-164527.jpeg"
            alt="Financial planning"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-green-400/20 to-emerald-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-emerald-500/20 to-teal-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left side - Branding and features */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center p-12 xl:p-16">
          <div className="max-w-2xl">
            <div className="mb-12">
              <Link to="/" className="inline-flex items-center space-x-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div>
                  <span className="text-3xl font-bold">Client Portal</span>
                  <div className="text-green-600/80 text-sm">
                    Funding Dashboard
                  </div>
                </div>
              </Link>

              <div className="space-y-10">
                <div>
                  <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
                    Your Credit
                    <span className="block bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      Improvement Journey
                    </span>
                  </h1>
                  <p className="text-lg xl:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
                    Track your progress, monitor your credit score, and achieve your financial goals with our comprehensive client dashboard.
                  </p>

                  {/* Client metrics highlight */}
                  <div className="mt-6 flex items-center space-x-6 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">
                        Real-time Monitoring
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse delay-500"></div>
                      <span className="text-sm font-medium">
                        Progress Tracking
                      </span>
                    </div>
                  </div>
                </div>

                {/* Client Features */}
                <div className="grid grid-cols-1 gap-6">
                  {clientFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                        <feature.icon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile header */}
            <div className="lg:hidden text-center mb-8">
              <Link to="/" className="inline-flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold">Client Portal</span>
              </Link>
              <p className="text-slate-600 dark:text-slate-400">
                Access your Funding Dashboard
              </p>
            </div>

            <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl">
              <CardHeader className="space-y-1 pb-8">
                <CardTitle className="text-2xl font-bold text-center">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-center text-base">
                  Sign in to your client dashboard to track your credit improvement progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginData.email}
                        onChange={handleInputChange}
                        className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-green-500 focus:ring-green-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={handleInputChange}
                        className="pl-10 pr-10 h-12 border-slate-200 dark:border-slate-700 focus:border-green-500 focus:ring-green-500/20"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Signing In...</span>
                      </div>
                    ) : (
                      "Sign In to Dashboard"
                    )}
                  </Button>
                </form>

                <div className="text-center space-y-4">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
                  >
                    Forgot your password?
                  </Link>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Need help?{" "}
                      <Link
                        to="/support"
                        className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
                      >
                        Contact Support
                      </Link>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security notice */}
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <Shield className="h-3 w-3" />
              <span>Your data is protected with enterprise-grade security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}