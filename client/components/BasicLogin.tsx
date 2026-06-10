import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Shield, Building, Phone } from "lucide-react";

interface BasicLoginProps {
  loginData: any;
  setLoginData: (data: any) => void;
  signupData: any;
  setSignupData: (data: any) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  isLoading: boolean;
  isGoogleLoading: boolean;
  activeTab: string;
  setActiveTab: (val: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  handleSignup: (e: React.FormEvent) => void;
  setShowForgotPassword: (val: boolean) => void;
  setForgotPasswordData: (val: any) => void;
  googleButtonRef: React.RefObject<HTMLDivElement>;
  showVerification: boolean;
  verificationData: any;
  setVerificationData: (data: any) => void;
  handleVerification: (e: React.FormEvent) => void;
}

export default function BasicLogin({
  loginData,
  setLoginData,
  signupData,
  setSignupData,
  showPassword,
  setShowPassword,
  isLoading,
  isGoogleLoading,
  activeTab,
  setActiveTab,
  handleLogin,
  handleSignup,
  setShowForgotPassword,
  setForgotPasswordData,
  googleButtonRef,
  showVerification,
  verificationData,
  setVerificationData,
  handleVerification
}: BasicLoginProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans text-gray-900">
      
      {/* Header/Logo Area */}
      <div className="mb-8 text-center">
        <Link to="/" className="inline-flex items-center space-x-3">
          <div className="w-10 h-10 bg-black flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold uppercase tracking-wider text-black">Fread App</span>
        </Link>
        <p className="mt-2 text-sm text-gray-600 uppercase font-semibold tracking-wide">Standard Access Portal</p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-gray-300 shadow-sm p-0">
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full rounded-none h-12 bg-gray-100 border-b border-gray-300 p-0">
            <TabsTrigger 
              value="login" 
              className="flex-1 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none uppercase font-bold text-xs"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup" 
              className="flex-1 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none uppercase font-bold text-xs"
            >
              Create Account
            </TabsTrigger>
          </TabsList>

          <div className="p-6 md:p-8">
            <TabsContent value="login" className="m-0 space-y-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase text-gray-700">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="enter@email.com"
                      className="pl-10 h-11 border-gray-300 rounded-none focus-visible:ring-0 focus-visible:border-black bg-gray-50"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-xs font-bold uppercase text-gray-700">Password</Label>
                    <button
                      type="button"
                      className="text-xs font-bold text-blue-600 hover:underline uppercase"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setForgotPasswordData((prev: any) => ({ ...prev, email: loginData.email }));
                      }}
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-12 h-11 border-gray-300 rounded-none focus-visible:ring-0 focus-visible:border-black bg-gray-50"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    className="border-gray-400 rounded-none data-[state=checked]:bg-black data-[state=checked]:text-white"
                    checked={loginData.remember}
                    onCheckedChange={(checked) => setLoginData({ ...loginData, remember: !!checked })}
                  />
                  <Label htmlFor="remember" className="text-xs font-semibold text-gray-600 uppercase cursor-pointer">
                    Remember me
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-black text-white hover:bg-gray-800 rounded-none uppercase font-bold tracking-wide"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-bold">
                  <span className="bg-white px-2 text-gray-500">Or Continue With</span>
                </div>
              </div>

              <div className="flex justify-center" ref={googleButtonRef}></div>
            </TabsContent>

            <TabsContent value="signup" className="m-0">
              {!showVerification ? (
                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-xs font-bold uppercase text-gray-700">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        className="h-11 border-gray-300 rounded-none focus-visible:ring-0 focus-visible:border-black bg-gray-50"
                        value={signupData.first_name}
                        onChange={(e) => setSignupData({ ...signupData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-xs font-bold uppercase text-gray-700">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        className="h-11 border-gray-300 rounded-none focus-visible:ring-0 focus-visible:border-black bg-gray-50"
                        value={signupData.last_name}
                        onChange={(e) => setSignupData({ ...signupData, last_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupEmail" className="text-xs font-bold uppercase text-gray-700">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="signupEmail"
                        type="email"
                        placeholder="enter@email.com"
                        className="pl-10 h-11 border-gray-300 rounded-none focus-visible:ring-0 focus-visible:border-black bg-gray-50"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupPhone" className="text-xs font-bold uppercase text-gray-700">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="signupPhone"
                        type="tel"
                        placeholder="+1 555 123 4567"
                        className="pl-10 h-11 border-gray-300 rounded-none focus-visible:ring-0 focus-visible:border-black bg-gray-50"
                        value={signupData.phone}
                        onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-xs font-bold uppercase text-gray-700">Company Name</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="company"
                        placeholder="Your Company"
                        className="pl-10 h-11 border-gray-300 rounded-none focus-visible:ring-0 focus-visible:border-black bg-gray-50"
                        value={signupData.company_name}
                        onChange={(e) => setSignupData({ ...signupData, company_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupPassword" className="text-xs font-bold uppercase text-gray-700">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="signupPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        className="pl-10 pr-12 h-11 border-gray-300 rounded-none focus-visible:ring-0 focus-visible:border-black bg-gray-50"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase text-gray-700">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="pl-10 h-11 border-gray-300 rounded-none focus-visible:ring-0 focus-visible:border-black bg-gray-50"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox
                      id="terms"
                      className="border-gray-400 rounded-none data-[state=checked]:bg-black data-[state=checked]:text-white mt-0.5"
                      checked={signupData.terms}
                      onCheckedChange={(checked) => setSignupData({ ...signupData, terms: !!checked })}
                    />
                    <Label htmlFor="terms" className="text-xs leading-relaxed text-gray-600">
                      I AGREE TO THE <Link to="/terms" className="font-bold text-black hover:underline">TERMS OF SERVICE</Link> AND <Link to="/privacy" className="font-bold text-black hover:underline">PRIVACY POLICY</Link>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-black text-white hover:bg-gray-800 rounded-none uppercase font-bold tracking-wide mt-2"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerification} className="space-y-6">
                  <div className="text-center space-y-2 mb-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-300">
                      <Mail className="h-6 w-6 text-black" />
                    </div>
                    <h3 className="text-lg font-bold uppercase tracking-wide">Verify Your Email</h3>
                    <p className="text-sm text-gray-600">
                      We sent a code to <br/><span className="font-bold text-black">{verificationData.email}</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-xs font-bold uppercase text-gray-700 text-center block">Verification Code</Label>
                    <Input
                      id="code"
                      placeholder="000000"
                      className="h-14 text-center text-2xl font-mono tracking-[0.5em] border-gray-300 rounded-none focus-visible:ring-0 focus-visible:border-black bg-gray-50"
                      value={verificationData.code}
                      onChange={(e) => setVerificationData({ ...verificationData, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      maxLength={6}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-black text-white hover:bg-gray-800 rounded-none uppercase font-bold tracking-wide"
                    disabled={isLoading || verificationData.code.length !== 6}
                  >
                    {isLoading ? "Verifying..." : "Verify & Complete"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500 uppercase font-semibold tracking-wide">
        &copy; {new Date().getFullYear()} Fread App. All rights reserved.
      </div>
    </div>
  );
}
