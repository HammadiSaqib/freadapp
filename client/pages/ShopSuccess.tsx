import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import SiteHeader from '@/components/SiteHeader';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { shopApi } from '@/lib/api';
import { toast } from 'sonner';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Download, Mail, ShieldCheck, ArrowRight, Loader2, ShoppingBag } from 'lucide-react';

function triggerDownloads(urls: string[]) {
  const base = window.location.origin;
  for (const u of urls) {
    const href = u.startsWith('http') ? u : `${base}${u.startsWith('/') ? '' : '/'}${u}`;
    const a = document.createElement('a');
    a.href = href;
    a.download = '';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function useCookieId() {
  const [cookieId, setCookieId] = useState<string>('');
  useEffect(() => {
    try {
      const key = 'sm_cookie_id';
      let id = localStorage.getItem(key) || '';
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(key, id);
      }
      setCookieId(id);
    } catch {
      setCookieId(String(Date.now()));
    }
  }, []);
  return cookieId;
}

export default function ShopSuccess() {
  const [params] = useSearchParams();
  const cookieId = useCookieId();
  const [downloading, setDownloading] = useState<boolean>(false);
  const [files, setFiles] = useState<string[]>([]);
  const sessionId = params.get('session_id') || '';
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [codeRequested, setCodeRequested] = useState<boolean>(false);
  const [requesting, setRequesting] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);

  useEffect(() => {
    async function finalize() {
      if (!sessionId) return;
      try {
        setDownloading(true);
        const resp = await shopApi.finalize(sessionId);
        const urls = Array.isArray(resp.data?.files) ? resp.data.files : [];
        setFiles(urls);
        if (urls.length) {
          triggerDownloads(urls);
          toast.success('Purchase confirmed! Your download is starting.');
        } else {
          toast.error('No files found for this product');
        }
      } catch (e: any) {
        toast.error(e?.response?.data?.error || e?.message || 'Failed to finalize purchase');
      } finally {
        setDownloading(false);
      }
    }
    finalize();
  }, [sessionId]);

  const requestCode = async () => {
    if (!sessionId) return;
    if (!verificationEmail) {
      toast.error('Enter your email to receive a verification code');
      return;
    }
    try {
      setRequesting(true);
      await shopApi.successRequestCode({ session_id: sessionId, email: verificationEmail });
      setCodeRequested(true);
      toast.success('Verification code sent to your email');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Failed to send code');
    } finally {
      setRequesting(false);
    }
  };

  const verifyCode = async () => {
    if (!sessionId) return;
    if (!verificationEmail || !verificationCode) {
      toast.error('Enter the verification code sent to your email');
      return;
    }
    try {
      setVerifying(true);
      const resp = await shopApi.successVerifyCode({ session_id: sessionId, email: verificationEmail, code: verificationCode, cookie_id: cookieId });
      const urls = Array.isArray(resp.data?.files) ? resp.data.files : [];
      if (urls.length) {
        triggerDownloads(urls);
        toast.success('Verified! Your product files are downloading again.');
      } else {
        toast.error('No files available for this product');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Helmet>
        <title>Purchase Success - Score Machine</title>
        <meta name="description" content="Your purchase succeeded. Files are starting to download. Verify your email to re-download later." />
      </Helmet>
      <SiteHeader />
      
      <main className="flex-grow container max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          
          {/* Success & Download Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl bg-white ring-1 ring-gray-100">
              <div className="h-2 bg-gradient-to-r from-ocean-blue to-sea-green" />
              <CardHeader className="pb-4">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6 mx-auto lg:mx-0">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900 lg:text-left text-center">
                  Purchase Successful!
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 lg:text-left text-center mt-2">
                  Thank you for your purchase. Your files are ready.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {downloading ? (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Download Status</h3>
                      <p className="text-sm text-gray-500">
                        {downloading ? 'Preparing your files...' : files.length ? `${files.length} file(s) downloading automatically` : 'Processing...'}
                      </p>
                    </div>
                  </div>
                  {files.length > 0 && (
                    <Button 
                      onClick={() => triggerDownloads(files)}
                      variant="outline" 
                      className="w-full justify-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                    >
                      <Download className="w-4 h-4" />
                      Click here if download didn't start
                    </Button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button asChild className="flex-1 bg-gray-900 hover:bg-gray-800 text-white gap-2 h-12">
                    <Link to="/shop">
                      <ShoppingBag className="w-4 h-4" />
                      Continue Shopping
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 h-12 gap-2">
                    <Link to="/">
                      Go to Home
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Email Verification Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl bg-white ring-1 ring-gray-100 h-full">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500" />
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <ShieldCheck className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">Secure Your Access</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Verify your email to enable unlimited re-downloads anytime in the future.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verification_email" className="text-gray-700 font-medium">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="verification_email"
                          type="email"
                          placeholder="name@example.com"
                          value={verificationEmail}
                          onChange={(e) => setVerificationEmail(e.target.value)}
                          className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                          disabled={codeRequested}
                        />
                      </div>
                    </div>

                    {codeRequested && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <Label htmlFor="verification_code" className="text-gray-700 font-medium">Verification Code</Label>
                        <Input
                          id="verification_code"
                          placeholder="Enter 6-digit code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors tracking-widest text-center text-lg font-mono"
                          maxLength={6}
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          Code sent to {verificationEmail}
                        </p>
                      </motion.div>
                    )}
                  </div>

                  <div className="pt-2">
                    {!codeRequested ? (
                      <Button 
                        onClick={requestCode} 
                        disabled={requesting || !verificationEmail}
                        className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all shadow-md hover:shadow-lg"
                      >
                        {requesting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending Code...
                          </>
                        ) : (
                          'Send Verification Code'
                        )}
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <Button 
                          onClick={verifyCode} 
                          disabled={verifying || !verificationCode}
                          className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white transition-all shadow-md hover:shadow-lg"
                        >
                          {verifying ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Verify & Enable Re-downloads'
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setCodeRequested(false)}
                          className="w-full text-gray-500 hover:text-gray-700"
                        >
                          Change Email
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
