import { useState, useEffect } from "react";
import AffiliateLayout from "@/components/AffiliateLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Filter, Eye, Copy, Share2, Image, Video, FileText, Mail, Globe, Smartphone } from "lucide-react";
import { affiliateApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface MarketingMaterial {
  id: string;
  title: string;
  description: string;
  type: "banner" | "email" | "social" | "video" | "landing" | "brochure" | "infographic";
  format: string;
  size?: string;
  dimensions?: string;
  downloadUrl: string;
  previewUrl?: string;
  downloads: number;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface MaterialStats {
  totalMaterials: number;
  totalDownloads: number;
  popularMaterial: string;
  recentUploads: number;
}

export default function AffiliateMarketing() {
  const [materials, setMaterials] = useState<MarketingMaterial[]>([]);
  const [stats, setStats] = useState<MaterialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterials();
    fetchStats();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await affiliateApi.getMarketingMaterials();
      
      if (response.data && response.data.success && response.data.data) {
        setMaterials(response.data.data);
      } else {
        // Fallback to demo data
        setMaterials([
          {
            id: "mat_1",
            title: "Funding Hero Banner",
            description: "High-converting banner for website headers and landing pages",
            type: "banner",
            format: "PNG",
            size: "2.1 MB",
            dimensions: "1200x400px",
            downloadUrl: "/materials/hero-banner.png",
            previewUrl: "/materials/previews/hero-banner.jpg",
            downloads: 1247,
            category: "Web Banners",
            tags: ["hero", "banner", "conversion", "web"],
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-15T10:00:00Z"
          },
          {
            id: "mat_2",
            title: "Email Template - Welcome Series",
            description: "Professional email template for new customer onboarding",
            type: "email",
            format: "HTML",
            size: "45 KB",
            downloadUrl: "/materials/email-welcome.html",
            downloads: 892,
            category: "Email Marketing",
            tags: ["email", "welcome", "onboarding", "template"],
            createdAt: "2024-01-10T14:30:00Z",
            updatedAt: "2024-01-10T14:30:00Z"
          },
          {
            id: "mat_3",
            title: "Social Media Post Pack",
            description: "Collection of social media posts for Facebook, Instagram, and Twitter",
            type: "social",
            format: "ZIP",
            size: "15.7 MB",
            downloadUrl: "/materials/social-pack.zip",
            previewUrl: "/materials/previews/social-pack.jpg",
            downloads: 634,
            category: "Social Media",
            tags: ["social", "facebook", "instagram", "twitter", "pack"],
            createdAt: "2024-01-08T09:15:00Z",
            updatedAt: "2024-01-08T09:15:00Z"
          },
          {
            id: "mat_4",
            title: "Product Demo Video",
            description: "2-minute product demonstration video for social sharing",
            type: "video",
            format: "MP4",
            size: "87.3 MB",
            dimensions: "1920x1080px",
            downloadUrl: "/materials/demo-video.mp4",
            previewUrl: "/materials/previews/demo-video.jpg",
            downloads: 423,
            category: "Video Content",
            tags: ["video", "demo", "product", "social"],
            createdAt: "2024-01-05T16:45:00Z",
            updatedAt: "2024-01-05T16:45:00Z"
          },
          {
            id: "mat_5",
            title: "Landing Page Template",
            description: "Complete landing page template with high conversion rate",
            type: "landing",
            format: "HTML/CSS",
            size: "2.8 MB",
            downloadUrl: "/materials/landing-template.zip",
            previewUrl: "/materials/previews/landing-template.jpg",
            downloads: 756,
            category: "Landing Pages",
            tags: ["landing", "template", "conversion", "html"],
            createdAt: "2024-01-03T11:20:00Z",
            updatedAt: "2024-01-03T11:20:00Z"
          },
          {
            id: "mat_6",
            title: "Funding Infographic",
            description: "Educational infographic explaining the funding process",
            type: "infographic",
            format: "PNG",
            size: "4.2 MB",
            dimensions: "800x2400px",
            downloadUrl: "/materials/credit-infographic.png",
            previewUrl: "/materials/previews/credit-infographic.jpg",
            downloads: 1089,
            category: "Educational",
            tags: ["infographic", "education", "credit", "process"],
            createdAt: "2024-01-01T08:00:00Z",
            updatedAt: "2024-01-01T08:00:00Z"
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        title: "Error",
        description: "Failed to load marketing materials",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await affiliateApi.getMarketingStats();
      
      if (response.data && response.data.success && response.data.data) {
        setStats(response.data.data);
      } else {
        // Fallback to demo data
        setStats({
          totalMaterials: 24,
          totalDownloads: 5041,
          popularMaterial: "Funding Hero Banner",
          recentUploads: 3
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDownload = async (material: MarketingMaterial) => {
    try {
      // Track download
      await affiliateApi.trackMaterialDownload(material.id);

      // Create download link
      const link = document.createElement('a');
      link.href = material.downloadUrl;
      link.download = `${material.title}.${material.format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Update download count locally
      setMaterials(prev => prev.map(m => 
        m.id === material.id ? { ...m, downloads: m.downloads + 1 } : m
      ));

      toast({
        title: "Success",
        description: `Downloaded ${material.title}`
      });
    } catch (error) {
      console.error('Error downloading material:', error);
      toast({
        title: "Error",
        description: "Failed to download material",
        variant: "destructive"
      });
    }
  };

  const handleCopyLink = (material: MarketingMaterial) => {
    const link = `${window.location.origin}${material.downloadUrl}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Success",
      description: "Download link copied to clipboard"
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "banner": return <Image className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      case "social": return <Share2 className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "landing": return <Globe className="h-4 w-4" />;
      case "brochure": return <FileText className="h-4 w-4" />;
      case "infographic": return <Smartphone className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "banner": return "bg-blue-100 text-blue-800";
      case "email": return "bg-green-100 text-green-800";
      case "social": return "bg-purple-100 text-purple-800";
      case "video": return "bg-red-100 text-red-800";
      case "landing": return "bg-orange-100 text-orange-800";
      case "brochure": return "bg-gray-100 text-gray-800";
      case "infographic": return "bg-teal-100 text-teal-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || material.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || material.category === categoryFilter;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const categories = [...new Set(materials.map(m => m.category))];
  const types = [...new Set(materials.map(m => m.type))];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AffiliateLayout>
      <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Marketing Materials</h1>
          <p className="text-gray-600 mt-1">Download professional marketing assets to promote CreditRepairPro</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMaterials}</div>
              <p className="text-xs text-muted-foreground">Available for download</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDownloads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all materials</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold truncate">{stats.popularMaterial}</div>
              <p className="text-xs text-muted-foreground">Top performing material</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
              <Badge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentUploads}</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
            <p className="text-gray-500">
              {searchTerm || typeFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your filters"
                : "No marketing materials available at the moment"}
            </p>
          </div>
        ) : (
          filteredMaterials.map((material) => (
            <Card key={material.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                {material.previewUrl ? (
                  <img 
                    src={material.previewUrl} 
                    alt={material.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    {getTypeIcon(material.type)}
                    <p className="text-sm text-gray-500 mt-2">{material.format}</p>
                  </div>
                )}
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{material.title}</CardTitle>
                  <Badge className={`ml-2 ${getTypeColor(material.type)}`}>
                    {material.type}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {material.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{material.format}</span>
                    <span>{material.size}</span>
                  </div>
                  
                  {material.dimensions && (
                    <div className="text-sm text-gray-500">
                      Dimensions: {material.dimensions}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {material.downloads.toLocaleString()} downloads
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(material)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(material)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {material.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {material.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{material.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </AffiliateLayout>
  );
}