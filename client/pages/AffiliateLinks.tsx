import React, { useState, useEffect } from "react";
import AffiliateLayout from "@/components/AffiliateLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Link2, Copy, Edit, Trash2, Eye, BarChart3, ExternalLink, Search, Filter, Calendar, TrendingUp, MousePointer, Users, Share2, Facebook, Twitter, Linkedin, MessageCircle, Check, X, AlertCircle, DollarSign } from "lucide-react";
import { affiliateApi, authApi } from "@/lib/api";
import { buildAffiliateInviteReferralUrl, buildReferralLandingUrl } from "@/lib/hostRouting";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ReferralLink {
  id: string;
  name: string;
  description?: string;
  originalUrl: string;
  shortUrl: string;
  trackingCode: string;
  campaign: string;
  source: string;
  medium: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  status: "active" | "paused" | "expired";
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

interface GeneratedLinks {
  productLink?: string;
  affiliateOnlyLink?: string;
  trackingCode: string;
  campaign: string;
}

interface LinkStats {
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  totalConversions: number;
  avgConversionRate: number;
  totalRevenue: number;
}

export default function AffiliateLinks() {
  const [loading, setLoading] = useState(true);
  const [affiliateInfo, setAffiliateInfo] = useState<any>(null);
  

  

  
  // Performance analytics states
  const [performanceData, setPerformanceData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchAffiliateInfo(),
        fetchPerformanceData()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);



  const fetchAffiliateInfo = async () => {
    try {
      let info: any = null;
      try {
        const statusResp = await authApi.getAffiliateStatus();
        if (statusResp.data && statusResp.data.success) {
          info = {
            id: statusResp.data.affiliate_id,
            affiliate_id: statusResp.data.affiliate_id,
            referral_slug: statusResp.data.referral_slug,
            status: statusResp.data.status
          };
        }
      } catch {}
      if (!info) {
        const profileResp = await authApi.getProfile();
        if (profileResp.data && profileResp.data.user) {
          info = profileResp.data.user;
        }
      }
      if (info) setAffiliateInfo(info);
    } catch (error) {
      console.error('Error fetching affiliate info:', error);
    }
  };



  // Social sharing functions
  const shareOnPlatform = (platform: string, url: string, message?: string) => {
    const encodedUrl = encodeURIComponent(url);
    const text = encodeURIComponent(message || "Check out this amazing funding service!");
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}%20${encodedUrl}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };



  // Fetch performance analytics
  const fetchPerformanceData = async () => {
    try {
      const response = await affiliateApi.getStats();
      console.log('Performance API response:', response);
      if (response.data && response.data.success) {
        setPerformanceData(response.data.data);
      } else if (response.data) {
        // Handle direct data response
        setPerformanceData(response.data);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  const generatePersonalizedLink = () => {
    if (affiliateInfo && affiliateInfo.referral_slug) {
      return buildReferralLandingUrl(affiliateInfo.referral_slug);
    }
    if (affiliateInfo && (affiliateInfo.id || affiliateInfo.affiliate_id)) {
      const id = String(affiliateInfo.id ?? affiliateInfo.affiliate_id);
      return buildReferralLandingUrl(id);
    }
    return buildReferralLandingUrl(`affiliate${Date.now()}`);
  };

  const generateAffiliateInviteLink = () => {
    const refValue = affiliateInfo?.referral_slug
      ? String(affiliateInfo.referral_slug)
      : affiliateInfo && (affiliateInfo.id || affiliateInfo.affiliate_id)
        ? String(affiliateInfo.id ?? affiliateInfo.affiliate_id)
        : "";

    if (refValue) {
      return buildAffiliateInviteReferralUrl(refValue);
    }

    return buildAffiliateInviteReferralUrl(`affiliate${Date.now()}`);
  };

  const copyPersonalizedLink = async () => {
    const link = generatePersonalizedLink();
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        toast({
          title: "Success",
          description: "Personalized referral link copied to clipboard!"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link to clipboard",
          variant: "destructive"
        });
      }
    }
  };

  const copyAffiliateInviteLink = async () => {
    const link = generateAffiliateInviteLink();
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        toast({
          title: "Success",
          description: "Affiliate invite link copied to clipboard!"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link to clipboard",
          variant: "destructive"
        });
      }
    }
  };



  if (loading) {
    return (
      <AffiliateLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading affiliate dashboard...</p>
          </div>
        </div>
      </AffiliateLayout>
    );
  }

  // Debug: Show what data we have
  console.log('Current affiliateInfo:', affiliateInfo);
  console.log('Current performanceData:', performanceData);

  return (
    <AffiliateLayout>
      <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your Referral Links</h1>
          <p className="text-gray-600 mt-1">Share your product link or invite new affiliates under you</p>
        </div>
      </div>

      {/* Single Affiliate Link Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Your Referral Links
          </CardTitle>
          <CardDescription>
            Share your product link to earn commissions or invite new affiliates under you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Main Affiliate Link */}
            <div className="space-y-3">
              {!affiliateInfo ? (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800">Loading your personalized affiliate link...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Product Referral Link</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <code className="text-blue-800 font-mono text-lg break-all">
                        {generatePersonalizedLink()}
                      </code>
                    </div>
                  </div>
                </div>
              )}
              {affiliateInfo && (
                 <div className="flex justify-end gap-2">
                   <Button
                     size="lg"
                     onClick={copyPersonalizedLink}
                     className="flex items-center gap-2"
                   >
                     <Copy className="h-5 w-5" />
                     Copy Link
                   </Button>
                   <Button
                     size="lg"
                     variant="outline"
                     onClick={() => window.open(generatePersonalizedLink(), '_blank')}
                     className="flex items-center gap-2"
                   >
                     <ExternalLink className="h-5 w-5" />
                     Preview
                   </Button>
                 </div>
               )}
            </div>

            <div className="space-y-3">
              {!affiliateInfo ? (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800">Loading your affiliate invite link...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Affiliate Invite Link</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <code className="text-emerald-800 font-mono text-lg break-all">
                        {generateAffiliateInviteLink()}
                      </code>
                    </div>
                  </div>
                </div>
              )}
              {affiliateInfo && (
                <div className="flex justify-end gap-2">
                  <Button
                    size="lg"
                    onClick={copyAffiliateInviteLink}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-5 w-5" />
                    Copy Invite Link
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => window.open(generateAffiliateInviteLink(), '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Preview
                  </Button>
                </div>
              )}
            </div>

            {/* Social Sharing */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Share Product Link</Label>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => shareOnPlatform('facebook', generatePersonalizedLink())}
                  className="flex items-center gap-2"
                >
                  <Facebook className="h-5 w-5" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareOnPlatform('twitter', generatePersonalizedLink())}
                  className="flex items-center gap-2"
                >
                  <Twitter className="h-5 w-5" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareOnPlatform('linkedin', generatePersonalizedLink())}
                  className="flex items-center gap-2"
                >
                  <Linkedin className="h-5 w-5" />
                  LinkedIn
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareOnPlatform('whatsapp', generatePersonalizedLink())}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Share Affiliate Invite Link</Label>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => shareOnPlatform('facebook', generateAffiliateInviteLink(), "Join our affiliate program")}
                  className="flex items-center gap-2"
                >
                  <Facebook className="h-5 w-5" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareOnPlatform('twitter', generateAffiliateInviteLink(), "Join our affiliate program")}
                  className="flex items-center gap-2"
                >
                  <Twitter className="h-5 w-5" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareOnPlatform('linkedin', generateAffiliateInviteLink(), "Join our affiliate program")}
                  className="flex items-center gap-2"
                >
                  <Linkedin className="h-5 w-5" />
                  LinkedIn
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareOnPlatform('whatsapp', generateAffiliateInviteLink(), "Join our affiliate program")}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp
                </Button>
              </div>
            </div>

            {/* Performance Stats */}
            {performanceData && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Your Performance</Label>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <div className="text-3xl font-bold text-purple-600">${performanceData.totalEarnings || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Earnings</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border">
                    <div className="text-3xl font-bold text-green-600">{performanceData.paidReferralsCount ?? performanceData.conversions ?? 0}</div>
                    <div className="text-sm text-muted-foreground">Total Perched</div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600 border-t pt-4">
              <p><strong>How it works:</strong> Share your affiliate link with potential customers. When they sign up using your link, you'll earn a commission.</p>
              {affiliateInfo && affiliateInfo.commissionRate && (
                <p className="mt-2"><strong>Your Commission Rate:</strong> {affiliateInfo.commissionRate}% per successful referral</p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </AffiliateLayout>
  );
}
