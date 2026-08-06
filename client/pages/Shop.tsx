import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import SiteHeader from '@/components/SiteHeader';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { shopApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { ShoppingBag, Download, ShieldCheck, Zap, Star, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShopProductFile {
  id: number;
  url: string;
  type?: string;
  source?: string;
}

interface ShopProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  thumbnail_url?: string | null;
  stripe_billing_link?: string | null;
  files: ShopProductFile[];
}

function useCookieId() {
  const [cookieId, setCookieId] = useState<string>('');
  useEffect(() => {
    try {
      const key = 'sm_cookie_id';
      let id = localStorage.getItem(key) || '';
      if (!id) {
        id = uuidv4();
        localStorage.setItem(key, id);
      }
      setCookieId(id);
    } catch {
      setCookieId(uuidv4());
    }
  }, []);
  return cookieId;
}

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

interface ShopProps {
  embed?: boolean;
}

export default function Shop({ embed = false }: ShopProps) {
  const cookieId = useCookieId();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [reDownloadDialogOpen, setReDownloadDialogOpen] = useState<boolean>(false);
  const [activeProduct, setActiveProduct] = useState<ShopProduct | null>(null);

  const [requestingCode, setRequestingCode] = useState<boolean>(false);
  const [verifyingCode, setVerifyingCode] = useState<boolean>(false);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [codeRequested, setCodeRequested] = useState<boolean>(false);
  const [checkingOut, setCheckingOut] = useState<boolean>(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const resp = await shopApi.getProducts();
      const list = Array.isArray(resp.data?.products) ? resp.data.products : [];
      setProducts(list);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load products');
      toast.error('Unable to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!embed || typeof window === 'undefined' || window.parent === window) {
      return;
    }

    const postEmbedHeight = () => {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );

      window.parent.postMessage(
        {
          type: 'scoremachine:shop-embed-resize',
          height,
        },
        '*',
      );
    };

    postEmbedHeight();

    const frameId = window.requestAnimationFrame(postEmbedHeight);
    const resizeObserver = new ResizeObserver(() => {
      postEmbedHeight();
    });

    resizeObserver.observe(document.body);
    window.addEventListener('resize', postEmbedHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', postEmbedHeight);
    };
  }, [embed, loading, error, products.length, reDownloadDialogOpen, codeRequested]);

  const formatPrice = useMemo(() => (p: number) => {
    const n = Number(p);
    return isFinite(n) ? `$${n.toFixed(2)}` : '$0.00';
  }, []);

  const redirectToCheckout = (url: string) => {
    if (!embed) {
      window.location.href = url;
      return;
    }

    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
        return;
      }
    } catch {}

    const redirected = window.open(url, '_top');
    if (!redirected) {
      window.location.href = url;
    }
  };

  const openPurchase = async (product: ShopProduct) => {
    try {
      setCheckingOut(true);
      const billingLink = product.stripe_billing_link?.trim();
      if (billingLink) {
        redirectToCheckout(billingLink);
        return;
      }
      const resp = await shopApi.createCheckout({
        product_id: product.id,
        purchaser_name: '',
        email: '',
        cookie_id: cookieId,
      });
      const url = resp.data?.url;
      if (url) {
        redirectToCheckout(url);
      } else {
        toast.error('Unable to start checkout');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const openReDownload = (product: ShopProduct) => {
    setActiveProduct(product);
    setVerificationEmail('');
    setVerificationCode('');
    setCodeRequested(false);
    setReDownloadDialogOpen(true);
  };

  const handleRequestCode = async () => {
    if (!activeProduct) return;
    if (!verificationEmail) {
      toast.error('Enter the email used for purchase');
      return;
    }
    try {
      setRequestingCode(true);
      await shopApi.requestCode({ product_id: activeProduct.id, email: verificationEmail });
      setCodeRequested(true);
      toast.success('Verification code sent to your email');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Failed to send code');
    } finally {
      setRequestingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!activeProduct) return;
    if (!verificationEmail || !verificationCode) {
      toast.error('Enter the verification code sent to your email');
      return;
    }
    try {
      setVerifyingCode(true);
      const resp = await shopApi.verifyCode({
        product_id: activeProduct.id,
        email: verificationEmail,
        code: verificationCode,
        cookie_id: cookieId,
      });
      const urls = Array.isArray(resp.data?.files) ? resp.data.files : [];
      if (urls.length) {
        triggerDownloads(urls);
        toast.success('Verified. Your product files are downloading.');
        setReDownloadDialogOpen(false);
      } else {
        toast.error('No files available for this product');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Verification failed');
    } finally {
      setVerifyingCode(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const mainClassName = 'flex-grow container mx-auto px-4 py-12 sm:px-6 lg:px-8 -mt-10 relative z-10';
  const rootClassName = embed
    ? 'min-h-screen bg-gray-50/50 font-sans pt-10'
    : 'min-h-screen bg-gray-50/50 flex flex-col font-sans';

  return (
    <div className={rootClassName}>
      <Helmet>
        <title>{embed ? 'Shop Embed - Score Machine' : 'Shop - Score Machine'}</title>
        <meta name="description" content="Browse premium shop products, purchase instantly, and re-download using email verification." />
        {embed ? (
          <>
            <meta name="robots" content="noindex,nofollow" />
            <link rel="canonical" href="https://thescoremachine.com/shop" />
          </>
        ) : (
          <link rel="canonical" href="https://thescoremachine.com/shop" />
        )}
      </Helmet>
      {!embed && <SiteHeader />}

      {!embed && (
        <section className="relative bg-white overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-60" />
          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto"
            >
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
                Premium Digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-ocean-blue to-sea-green">Resources</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Elevate your credit repair business with our professionally crafted templates, guides, and tools.
                Secure checkout and instant delivery.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <Badge variant="secondary" className="px-4 py-2 bg-white border border-blue-100 shadow-sm text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500 fill-blue-500" /> Instant Access
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 bg-white border border-green-100 shadow-sm text-green-700 rounded-full text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500 fill-green-500" /> Secure Payment
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 bg-white border border-purple-100 shadow-sm text-purple-700 rounded-full text-sm font-medium flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-500 fill-purple-500" /> Premium Quality
                </Badge>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      <main className={mainClassName}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-ocean-blue animate-spin mb-4" />
            <p className="text-gray-500 text-lg">Loading amazing products...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={loadProducts} variant="outline">Try Again</Button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No products available yet</h3>
            <p className="text-gray-600">Check back soon for new digital resources!</p>
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {products.map((p) => (
              <motion.div key={p.id} variants={item}>
                <Card className="h-full flex flex-col overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 ring-1 ring-gray-100 hover:ring-ocean-blue/20 bg-white group">
                  <div className="relative aspect-video overflow-hidden bg-gray-100">
                    {p.thumbnail_url ? (
                      <img 
                        src={p.thumbnail_url} 
                        alt={p.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                        <ShoppingBag className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-white/90 backdrop-blur-sm text-gray-900 font-bold shadow-sm hover:bg-white text-base px-3 py-1">
                        {formatPrice(p.price)}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-ocean-blue transition-colors">
                      {p.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-sm text-gray-600 mt-1">
                      {p.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-grow">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span>{p.files.length} file{p.files.length !== 1 ? 's' : ''} included</span>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-0 pb-6 px-6 gap-3">
                    <Button 
                      className="flex-1 bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90 text-white font-medium shadow-md hover:shadow-lg transition-all h-10"
                      disabled={checkingOut} 
                      onClick={() => openPurchase(p)}
                    >
                      {checkingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ShoppingBag className="w-4 h-4 mr-2" />
                      )}
                      Purchase Now
                    </Button>
                    <Button 
                      variant="outline" 
                      className="px-3 border-gray-200 text-gray-600 hover:text-ocean-blue hover:bg-blue-50 hover:border-blue-100 transition-colors h-10"
                      onClick={() => openReDownload(p)}
                      title="Already Purchased? Redownload"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
      {!embed && <Footer />}

      <Dialog open={reDownloadDialogOpen} onOpenChange={setReDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-ocean-blue" />
            </div>
            <DialogTitle className="text-center text-xl">Re-Download Product</DialogTitle>
            <DialogDescription className="text-center">
              Enter the email you used for purchase. We'll send you a verification code to access your files.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verification_email">Email Address</Label>
              <Input
                id="verification_email"
                type="email"
                placeholder="name@example.com"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                disabled={codeRequested}
                className="h-10"
              />
            </div>
            {codeRequested && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <Label htmlFor="verification_code">Verification Code</Label>
                <Input
                  id="verification_code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="text-center tracking-widest font-mono text-lg h-10"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground text-center">Check your email for the code.</p>
              </motion.div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!codeRequested ? (
              <Button 
                onClick={handleRequestCode} 
                disabled={requestingCode || !verificationEmail}
                className="w-full bg-ocean-blue hover:bg-ocean-blue/90"
              >
                {requestingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <Button 
                  onClick={handleVerifyCode} 
                  disabled={verifyingCode || !verificationCode}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {verifyingCode ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
                    </>
                  ) : (
                    'Verify & Download'
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setCodeRequested(false)}
                  className="w-full text-sm text-gray-500"
                >
                  Use a different email
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
