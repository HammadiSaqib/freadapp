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
  HelpCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertTriangle,
  Headphones,
  MessageSquare,
  Users,
  Ticket,
  Clock,
  CheckCircle,
} from "lucide-react";

export default function SupportLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  usePortalLoginRedirect({ allowedRoles: ["support"] });

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
      savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Attempting support login with:", loginData.email);
      const response = await authApi.supportLogin(loginData);
      
      console.log("Support login response:", response);
      
      if (response.error) {
        toast({
          title: "Login Failed",
          description: response.error,
          variant: "destructive",
        });
        return;
      }
      
      if (response.data?.token) {
        console.log("Token received:", response.data.token);
        
        // Clear any existing tokens first
        localStorage.removeItem("auth_token");
        
        // Store token using the same method as other login pages
        setAuthToken(response.data.token);
        
        // Verify token was stored
        const storedToken = localStorage.getItem("auth_token");
        console.log("Token stored in localStorage:", storedToken);
        
        // Store additional user info
        localStorage.setItem("userRole", "support");
        localStorage.setItem("userId", response.data.user.id.toString());
        localStorage.setItem("userName", `${response.data.user.first_name} ${response.data.user.last_name}`);
        clearPortalReturnContext();
        
        toast({
          title: "Welcome back!",
          description: "Successfully logged in to Support Dashboard.",
        });
        
        const dashboardTarget = getPortalNavigationTarget("support", "/dashboard");
        if (dashboardTarget.external) {
          window.location.href = dashboardTarget.target;
          return;
        }
        navigate(dashboardTarget.target);
      } else {
        toast({
          title: "Login Failed",
          description: "No authentication token received",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Support login error:", error);
      toast({
        title: "Login Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-10 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20"
      >
        {isDarkMode ? "☀️" : "🌙"}
      </Button>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full shadow-2xl">
                <Headphones className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Support Team Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Access your support dashboard with enhanced tools
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              Sign In
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              Enter your support team credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="support@company.com"
                    value={loginData.email}
                    onChange={handleInputChange}
                    className="pl-10 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-200">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Headphones className="h-4 w-4 mr-2" />
                    Access Support Dashboard
                  </div>
                )}
              </Button>
            </form>

            {/* Features */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
                Support Team Features
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Ticket className="h-3 w-3 mr-2 text-blue-500" />
                  Ticket Management
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <MessageSquare className="h-3 w-3 mr-2 text-green-500" />
                  Live Chat Support
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Users className="h-3 w-3 mr-2 text-purple-500" />
                  User Management
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Clock className="h-3 w-3 mr-2 text-orange-500" />
                  24/7 Dashboard
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Need help accessing your account?{" "}
            <Link
              to="/contact"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              Contact IT Support
            </Link>
          </p>
          <div className="mt-4 flex justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <Link to="/" className="hover:text-gray-700 dark:hover:text-gray-200">
              ← Back to Main Site
            </Link>
            <span>|</span>
            <Link to="/login" className="hover:text-gray-700 dark:hover:text-gray-200">
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}