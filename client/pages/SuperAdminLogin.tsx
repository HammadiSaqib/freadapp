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
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertTriangle,
  Crown,
  Zap,
  CreditCard,
  CheckCircle,
  Award,
  Settings,
  Database,
  Users,
} from "lucide-react";

export default function SuperAdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  usePortalLoginRedirect({ allowedRoles: ["super_admin"] });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Check for existing theme and apply it
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const shouldBeDark =
      savedTheme === "dark" || (savedTheme === "system" && prefersDark);

    setIsDarkMode(shouldBeDark);

    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (shouldBeDark) {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.superAdminLogin(
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
        clearPortalReturnContext();
        toast({
          title: "Super Admin Access Granted",
          description: "Welcome to the Super Admin Portal.",
        });
        const dashboardTarget = getPortalNavigationTarget("super-admin", "/dashboard");
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

  const adminFeatures = [
    {
      icon: Database,
      title: "System Management",
      description: "Complete database and server administration",
    },
    {
      icon: Users,
      title: "User Oversight",
      description: "Comprehensive user and role management",
    },
    {
      icon: Settings,
      title: "Platform Control",
      description: "Advanced configuration and system settings",
    },
    {
      icon: Shield,
      title: "Security Center",
      description: "Enhanced security monitoring and controls",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800/95 dark:to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background image overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-white/40 to-emerald-50/60 dark:from-slate-800/90 dark:via-slate-700/80 dark:to-slate-800/90"></div>

        {/* Floating admin-themed images */}
        <div className="absolute top-20 right-20 w-64 h-40 rounded-2xl overflow-hidden shadow-2xl opacity-10 rotate-12 hover:opacity-20 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/577195/pexels-photo-577195.jpeg"
            alt="System analytics dashboard"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute bottom-32 left-20 w-56 h-36 rounded-2xl overflow-hidden shadow-2xl opacity-10 -rotate-12 hover:opacity-20 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/7821529/pexels-photo-7821529.jpeg"
            alt="Administrative professional"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute top-1/3 left-1/3 w-48 h-32 rounded-2xl overflow-hidden shadow-2xl opacity-5 rotate-45 hover:opacity-15 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/5816286/pexels-photo-5816286.jpeg"
            alt="System administration"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Animated gradient orbs with admin theme colors */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-red-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-300/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left Side - Super Admin Branding & Features */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-orange-600 to-red-700 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 p-8 xl:p-12 text-white relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 dark:from-slate-600/20 to-transparent"></div>

          {/* Admin hero image overlay */}
          <div className="absolute top-0 right-0 w-1/2 h-1/2 opacity-20 rounded-bl-3xl overflow-hidden">
            <img
              src="https://images.pexels.com/photos/577195/pexels-photo-577195.jpeg"
              alt="Admin control dashboard"
              className="w-full h-full object-cover scale-110 hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-red-600/20 dark:via-slate-600/30 to-orange-600/40 dark:to-slate-500/40"></div>
          </div>

          <div className="absolute bottom-0 left-0 w-1/2 h-1/3 opacity-15 rounded-tr-3xl overflow-hidden">
            <img
              src="https://images.pexels.com/photos/5816286/pexels-photo-5816286.jpeg"
              alt="System administration"
              className="w-full h-full object-cover scale-110 hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-orange-600/20 dark:via-slate-600/30 to-red-600/40 dark:to-slate-500/40"></div>
          </div>

          <div
            className={
              'absolute inset-0 bg-[url(\'data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\')] opacity-10'
            }
          ></div>

          <div className="relative z-10 flex flex-col justify-between w-full">
            {/* Header */}
            <div>
              <Link to="/" className="flex items-center space-x-3 mb-12">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-2xl">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <div>
                  <span className="text-3xl font-bold">Super Admin Portal</span>
                  <div className="text-white/80 text-sm">
                    System Administration Center
                  </div>
                </div>
              </Link>

              <div className="space-y-10">
                <div>
                  <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
                    Advanced System
                    <span className="block bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent">
                      Control Center
                    </span>
                  </h1>
                  <p className="text-lg xl:text-xl text-white/90 leading-relaxed max-w-lg">
                    Comprehensive platform administration with advanced security and complete system oversight capabilities.
                  </p>

                  {/* Admin metrics highlight */}
                  <div className="mt-6 flex items-center space-x-6 text-white/80">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">
                        Secure Access
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse delay-500"></div>
                      <span className="text-sm font-medium">
                        Full Control
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Features */}
                <div className="grid grid-cols-1 gap-6">
                  {adminFeatures.map((feature, index) => (
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

            {/* Security Notice */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-orange-300" />
                <span className="font-semibold text-orange-100">Security Notice</span>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                This is a restricted administrative area. All access attempts are logged and monitored. 
                Unauthorized access is strictly prohibited and may result in legal action.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Super Admin Portal</h1>
              <p className="text-gray-600 dark:text-gray-300">System Administration Access</p>
            </div>

            <Card className="border-0 bg-white/80 dark:bg-gradient-to-br dark:from-slate-800/80 dark:to-slate-700/80 dark:border-slate-600/50 backdrop-blur-sm shadow-2xl">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Administrator Login
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Enter your super admin credentials to access the control panel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@company.com"
                        value={loginData.email}
                        onChange={(e) =>
                          setLoginData({ ...loginData, email: e.target.value })
                        }
                        className="pl-10 h-11 border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white focus:border-red-500 focus:ring-red-500 dark:focus:border-red-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({ ...loginData, password: e.target.value })
                        }
                        className="pl-10 pr-10 h-11 border-gray-200 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white focus:border-red-500 focus:ring-red-500 dark:focus:border-red-400"
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
                    className="w-full h-11 text-base bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg"
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
                        <span>Access Control Panel</span>
                      </div>
                    )}
                  </Button>
                </form>

                {/* Trust Indicators */}
                <div className="mt-6 p-4 bg-gradient-light dark:bg-gradient-to-r dark:from-slate-700/70 dark:to-slate-600/70 dark:border dark:border-slate-600 rounded-xl">
                  <div className="flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-red-600" />
                      <span className="text-muted-foreground dark:text-gray-300">Enhanced Security</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-red-600" />
                      <span className="text-muted-foreground dark:text-gray-300">
                        Monitored Access
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-red-600" />
                      <span className="text-muted-foreground dark:text-gray-300">
                        Admin Only
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-300">Security Notice</span>
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    This system is for authorized personnel only. All login attempts are monitored and logged.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Links */}
            <div className="text-center text-xs text-muted-foreground dark:text-gray-400">
              <p>
                Need assistance?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Contact System Administrator
                </Button>
              </p>
              <div className="mt-2 flex justify-center space-x-6">
                <Button
                  variant="link"
                  onClick={() => navigate("/login")}
                  className="p-0 h-auto text-xs text-muted-foreground dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  ← Return to Standard Login
                </Button>
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-muted-foreground dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  Security Policy
                </Button>
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-muted-foreground dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  Admin Guidelines
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}