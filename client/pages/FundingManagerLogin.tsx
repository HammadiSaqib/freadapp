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
import { clearPortalReturnContext } from "@/lib/authStorage";
import { usePortalLoginRedirect } from "@/hooks/usePortalLoginRedirect";
import { getPortalNavigationTarget } from "@/lib/hostRouting";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertTriangle,
  DollarSign,
  Zap,
  CreditCard,
  CheckCircle,
  Award,
  Settings,
  TrendingUp,
  Users,
  PieChart,
  Banknote,
} from "lucide-react";

export default function FundingManagerLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshProfile } = useAuthContext();

  usePortalLoginRedirect({ allowedRoles: ["funding_manager"] });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

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
      const response = await authApi.fundingManagerLogin(
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
        // Ensure global auth context has the fresh profile before navigation
        try {
          await refreshProfile();
        } catch (_) {
          // Non-blocking: even if refresh fails, proceed to navigation
        }
        clearPortalReturnContext();
        toast({
          title: "Funding Manager Access Granted",
          description: "Welcome to the Funding Management Portal.",
        });
        const dashboardTarget = getPortalNavigationTarget("funding-manager", "/dashboard");
        if (dashboardTarget.external) {
          window.location.href = dashboardTarget.target;
          return;
        }
        navigate(dashboardTarget.target);
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

  const fundingFeatures = [
    {
      icon: TrendingUp,
      title: "Financial Analytics",
      description: "Advanced funding metrics and performance tracking",
    },
    {
      icon: Users,
      title: "Client Portfolio",
      description: "Comprehensive client funding status management",
    },
    {
      icon: PieChart,
      title: "Investment Control",
      description: "Strategic funding allocation and risk assessment",
    },
    {
      icon: Banknote,
      title: "Revenue Center",
      description: "Real-time funding flow and profit optimization",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800/95 dark:to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background image overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 via-white/40 to-teal-50/60 dark:from-slate-800/90 dark:via-slate-700/80 dark:to-slate-800/90"></div>

        {/* Floating funding-themed images */}
        <div className="absolute top-20 right-20 w-64 h-40 rounded-2xl overflow-hidden shadow-2xl opacity-10 rotate-12 hover:opacity-20 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg"
            alt="Financial analytics dashboard"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute bottom-32 left-16 w-48 h-32 rounded-2xl overflow-hidden shadow-2xl opacity-10 -rotate-12 hover:opacity-20 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/590022/pexels-photo-590022.jpg"
            alt="Investment portfolio"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute top-1/2 right-8 w-32 h-48 rounded-2xl overflow-hidden shadow-2xl opacity-10 rotate-45 hover:opacity-20 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/187041/pexels-photo-187041.jpeg"
            alt="Financial growth"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Animated geometric shapes */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-gradient-to-br from-teal-400/20 to-emerald-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/6 w-24 h-24 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full blur-xl animate-pulse delay-500"></div>

        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-emerald-400/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Branding and features */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 text-white relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-50" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>

          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 py-16">
            <div className="max-w-lg">
              <Link to="/" className="flex items-center space-x-3 mb-12">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-2xl">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <div>
                  <span className="text-3xl font-bold">Funding Manager Portal</span>
                  <div className="text-white/80 text-sm">
                    Financial Management Center
                  </div>
                </div>
              </Link>

              <div className="space-y-10">
                <div>
                  <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
                    Strategic Funding
                    <span className="block bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                      Management Hub
                    </span>
                  </h1>
                  <p className="text-lg xl:text-xl text-white/90 leading-relaxed max-w-lg">
                    Comprehensive funding oversight with advanced analytics and strategic investment management capabilities.
                  </p>

                  {/* Funding metrics highlight */}
                  <div className="mt-6 flex items-center space-x-6 text-white/80">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">
                        Real-time Analytics
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-teal-400 rounded-full animate-pulse delay-500"></div>
                      <span className="text-sm font-medium">
                        Strategic Control
                      </span>
                    </div>
                  </div>
                </div>

                {/* Funding Features */}
                <div className="grid grid-cols-1 gap-6">
                  {fundingFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                        <p className="text-white/80 text-sm leading-relaxed">
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
            <div className="lg:hidden text-center">
              <Link to="/" className="inline-flex items-center space-x-3 mb-8">
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    Funding Manager
                  </span>
                  <div className="text-emerald-600 dark:text-emerald-400 text-sm">
                    Financial Management
                  </div>
                </div>
              </Link>
            </div>

            <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-8">
                <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                  Funding Manager Access
                </CardTitle>
                <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                  Enter your credentials to access the funding management portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={loginData.email}
                        onChange={handleInputChange}
                        placeholder="funding.manager@company.com"
                        className="pl-10 pr-10 h-11 border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={loginData.password}
                        onChange={handleInputChange}
                        placeholder="Enter your secure password"
                        className="pl-10 pr-10 h-11 border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Authenticating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5" />
                        <span>Access Funding Portal</span>
                      </div>
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200 dark:border-slate-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-800 px-2 text-gray-500 dark:text-gray-400">
                      Secure Access
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Protected by enterprise-grade security</span>
                </div>
              </CardContent>
            </Card>

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Need assistance?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  Contact System Administrator
                </Button>
              </p>
              <div className="mt-2 flex justify-center space-x-6">
                <Button
                  variant="link"
                  onClick={() => navigate("/login")}
                  className="p-0 h-auto text-xs text-muted-foreground dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  ← Return to Standard Login
                </Button>
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-muted-foreground dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Security Policy
                </Button>
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-muted-foreground dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Funding Guidelines
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}