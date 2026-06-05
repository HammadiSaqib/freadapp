import { useState, useEffect } from "react";
import { affiliateApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, TrendingUp, DollarSign } from "lucide-react";

interface LeaderboardAffiliate {
  rank: number;
  id: number;
  name: string;
  totalEarnings: number;
  monthlyEarnings: number;
  totalReferrals: number;
  paidReferrals: number;
  planType: string;
  commissionRate: number;
  tier: string;
}

interface LeaderboardData {
  pro: LeaderboardAffiliate[];
  free: LeaderboardAffiliate[];
}

type SortMode = "price" | "referrals";

export default function AffiliateLeaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>({
    pro: [],
    free: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pro");
  const [sortMode, setSortMode] = useState<SortMode>("price");

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      const response = await affiliateApi.getLeaderboard();
      
      if (response.data && response.data.success) {
        setLeaderboardData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'Free - Starter':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'Pro - Advanced':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200';
      case 'Premium - Partner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getSortedList = (affiliates: LeaderboardAffiliate[]) => {
    const sorted = [...affiliates].sort((a, b) =>
      sortMode === "referrals"
        ? b.totalReferrals - a.totalReferrals
        : b.totalEarnings - a.totalEarnings
    );
    // re-rank after sort
    return sorted.map((a, i) => ({ ...a, rank: i + 1 }));
  };

  const renderLeaderboardList = (affiliates: LeaderboardAffiliate[]) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (affiliates.length === 0) {
      return (
        <div className="text-center py-8">
          <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No affiliates found in this category</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {affiliates.map((affiliate) => (
          <div
            key={affiliate.id}
            className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
              affiliate.rank <= 3 ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' : ''
            }`}
          >
            <div className="flex items-center justify-center w-8 h-8">
              {getRankIcon(affiliate.rank)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-sm truncate">{affiliate.name}</h4>
                <Badge className={getTierBadgeColor(affiliate.tier)} variant="outline">
                  {affiliate.tier}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {affiliate.totalReferrals} referrals
                </span>
                <span>{affiliate.commissionRate}% rate</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center text-sm font-bold text-green-600 mb-1">
                <DollarSign className="h-3 w-3" />
                {affiliate.totalEarnings.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                ${affiliate.monthlyEarnings.toLocaleString()} this month
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Affiliate Leaderboard
        </CardTitle>
        <CardDescription>
          Top performing affiliates by total earnings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pro" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Pro ({leaderboardData.pro.length})
            </TabsTrigger>
            <TabsTrigger value="free" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Free ({leaderboardData.free.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pro" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">Pro & Premium Affiliates</h3>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    20-25% Commission
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="pro-sort"
                    value="price"
                    checked={sortMode === "price"}
                    onChange={() => setSortMode("price")}
                    className="accent-blue-600"
                  />
                  By Price
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="pro-sort"
                    value="referrals"
                    checked={sortMode === "referrals"}
                    onChange={() => setSortMode("referrals")}
                    className="accent-blue-600"
                  />
                  By Referrals
                </label>
              </div>
              {renderLeaderboardList(getSortedList(leaderboardData.pro))}
            </div>
          </TabsContent>
          
          <TabsContent value="free" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">Free & Starter Affiliates</h3>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    10-15% Commission
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="free-sort"
                    value="price"
                    checked={sortMode === "price"}
                    onChange={() => setSortMode("price")}
                    className="accent-blue-600"
                  />
                  By Price
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="free-sort"
                    value="referrals"
                    checked={sortMode === "referrals"}
                    onChange={() => setSortMode("referrals")}
                    className="accent-blue-600"
                  />
                  By Referrals
                </label>
              </div>
              {renderLeaderboardList(getSortedList(leaderboardData.free))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}