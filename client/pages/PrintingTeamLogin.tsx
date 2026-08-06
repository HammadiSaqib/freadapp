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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { authApi, setAuthToken } from "@/lib/api";
import { usePortalLoginRedirect } from "@/hooks/usePortalLoginRedirect";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  EyeOff,
  Lock,
  Loader2,
  Mail,
  Printer,
  FileText,
  Package,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function PrintingTeamLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  usePortalLoginRedirect({
    allowedRoles: ["printing_team"],
    redirectPath: "/dispute-letter",
    portalAlias: "printing-team",
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    // Force light mode
    document.documentElement.classList.remove("dark");
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.printingTeamLogin(loginData);

      if (response.error) {
        // Check if it's a role access denied (403)
        if (response.status === 403) {
          setAccessDeniedMessage(
            response.error || "Access denied. Only printing team members can log in here."
          );
          setShowAccessDenied(true);
        } else {
          toast({
            title: "Login Failed",
            description: response.error,
            variant: "destructive",
          });
        }
        return;
      }

      if (response.data?.token) {
        localStorage.removeItem("auth_token");
        setAuthToken(response.data.token);
        localStorage.setItem("userRole", "printing_team");

        if (response.data.user) {
          localStorage.setItem("userId", String(response.data.user.id));
          localStorage.setItem(
            "userName",
            `${response.data.user.first_name || ""} ${response.data.user.last_name || ""}`.trim()
          );
        }

        toast({
          title: "Welcome!",
          description: "Printing team login successful.",
        });

        navigate("/dispute-letter", { replace: true });
      }
    } catch (error: any) {
      console.error("Printing team login error:", error);
      if (error?.response?.status === 403) {
        setAccessDeniedMessage(
          error?.response?.data?.error || "Access denied. Only printing team members can log in here."
        );
        setShowAccessDenied(true);
      } else {
        toast({
          title: "Login Failed",
          description:
            error?.response?.data?.error || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafcff] font-sans overflow-x-hidden relative p-4">
      {/* Background Electric Glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-[#00d4ff] rounded-full mix-blend-multiply filter blur-[120px] opacity-10 pointer-events-none animate-pulse-slow"></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#ff00ff] rounded-full mix-blend-multiply filter blur-[150px] opacity-10 pointer-events-none animate-pulse-slow" style={{ animationDelay: "2s" }}></div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Logo / Header */}
        <motion.div variants={itemVariants} className="text-center">
          <div className="mx-auto w-20 h-20 bg-white p-3 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 mb-6 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 to-[#7000ff]/10 rounded-3xl"></div>
            <img src="/capsol-fav.png" alt="CapSol" className="w-full h-full object-contain relative z-10" />
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-[#7000ff] to-[#00d4ff] tracking-tight">
            Score Machine
          </h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">
            Printing Team Portal
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div variants={itemVariants}>
          <Card className="border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00d4ff] to-[#7000ff]"></div>
            <CardHeader className="space-y-1 pt-8 pb-6 px-8">
              <CardTitle className="text-2xl font-bold text-slate-800 text-center">
                Sign In
              </CardTitle>
              <CardDescription className="text-center font-medium text-slate-500">
                Enter your printing team credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#00d4ff] transition-colors" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="team@example.com"
                      value={loginData.email}
                      onChange={handleInputChange}
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#00d4ff]/30 transition-all font-medium text-slate-800 shadow-inner"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#7000ff] transition-colors" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={handleInputChange}
                      className="pl-12 pr-12 h-14 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#7000ff]/30 transition-all font-medium text-slate-800 shadow-inner"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:opacity-90 text-white font-bold text-lg shadow-md transition-all mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin h-5 w-5 text-[#00d4ff]" />
                      Authenticating...
                    </span>
                  ) : (
                    "Secure Login"
                  )}
                </Button>
              </form>

              {/* Feature highlights */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center gap-2 text-center group">
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors border border-blue-100">
                      <FileText className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Dispute Letters</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center group">
                    <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors border border-purple-100">
                      <Package className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">ZIP Downloads</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center group">
                    <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors border border-indigo-100">
                      <Printer className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Print & Mail</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.p variants={itemVariants} className="text-xs font-semibold text-center text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} Score Machine. All rights reserved.
        </motion.p>
      </motion.div>

      {/* Access Denied Popup */}
      <Dialog open={showAccessDenied} onOpenChange={setShowAccessDenied}>
        <DialogContent className="max-w-sm rounded-3xl border-0 shadow-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-red-50 border border-red-100">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-bold text-slate-800">Access Denied</DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
                  {accessDeniedMessage}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-6 sm:justify-center">
            <Button
              variant="default"
              onClick={() => setShowAccessDenied(false)}
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold h-11"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
