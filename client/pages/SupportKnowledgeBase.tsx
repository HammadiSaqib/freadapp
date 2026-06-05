import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Calendar,
  User,
  Tag,
  BarChart3,
  Filter,
  BookOpen,
  HelpCircle,
  TrendingUp,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  Download,
  Upload
} from "lucide-react";
import SupportLayout from "../components/SupportLayout";
import { useAuth } from "../hooks/useAuth";
import { API_BASE_URL } from "../lib/api";
import { toast } from "sonner";

interface KnowledgeArticle {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author_id: number;
  author_name?: string;
  created_at: string;
  updated_at: string;
  status: "published" | "draft" | "archived";
  views: number;
  likes: number;
  dislikes: number;
  rating: number;
  featured: boolean;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  order_index: number;
  views: number;
  helpful: number;
  not_helpful: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface Categories {
  articles: { category: string; count: number }[];
  faqs: { category: string; count: number }[];
}

export default function SupportKnowledgeBase() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<Categories>({ articles: [], faqs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, hasMore: false });

  const [activeTab, setActiveTab] = useState("articles");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [selectedFaq, setSelectedFaq] = useState<FAQ | null>(null);
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [isFaqDialogOpen, setIsFaqDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state for creating articles/FAQs
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    question: '',
    answer: '',
    status: 'published'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isEditArticleOpen, setIsEditArticleOpen] = useState(false);
  const [isEditFaqOpen, setIsEditFaqOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editArticleForm, setEditArticleForm] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    status: 'draft',
    featured: false as boolean
  });
  const [editFaqForm, setEditFaqForm] = useState({
    question: '',
    answer: '',
    category: '',
    order_index: 0,
    status: 'active'
  });

  // API Functions
  const fetchArticles = async (params: {
    search?: string;
    category?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    sort?: string;
    order?: string;
  } = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.category && params.category !== 'all') queryParams.append('category', params.category);
      if (params.featured) queryParams.append('featured', 'true');
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.sort) queryParams.append('sort', params.sort);
      if (params.order) queryParams.append('order', params.order);

      const response = await fetch(`${API_BASE_URL}/api/knowledge-base/articles?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch articles');
      
      const result: ApiResponse<KnowledgeArticle[]> = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }
  };

  const fetchFAQs = async (params: {
    search?: string;
    category?: string;
  } = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.category && params.category !== 'all') queryParams.append('category', params.category);

      const response = await fetch(`${API_BASE_URL}/api/knowledge-base/faqs?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch FAQs');
      
      const result: ApiResponse<FAQ[]> = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      throw error;
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge-base/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const result: ApiResponse<Categories> = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  };

  const interactWithArticle = async (articleId: number, type: 'like' | 'dislike' | 'rating', rating?: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge-base/articles/${articleId}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ type, rating })
      });
      
      if (!response.ok) throw new Error('Failed to record interaction');
      
      const result: ApiResponse<any> = await response.json();
      return result;
    } catch (error) {
      console.error('Error recording interaction:', error);
      throw error;
    }
  };

  const interactWithFAQ = async (faqId: number, type: 'helpful' | 'not_helpful' | 'view') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge-base/faqs/${faqId}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });
      
      if (!response.ok) throw new Error('Failed to record interaction');
      
      const result: ApiResponse<any> = await response.json();
      return result;
    } catch (error) {
      console.error('Error recording FAQ interaction:', error);
      throw error;
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [articlesResult, faqsResult, categoriesResult] = await Promise.all([
          fetchArticles({ limit: pagination.limit, offset: 0 }),
          fetchFAQs(),
          fetchCategories()
        ]);
        
        setArticles(articlesResult.data);
        setFaqs(faqsResult.data);
        setCategories(categoriesResult.data);
        
        if (articlesResult.pagination) {
          setPagination(articlesResult.pagination);
        }
      } catch (error) {
        setError('Failed to load knowledge base data');
        toast.error('Failed to load knowledge base data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Refresh data when filters change
  useEffect(() => {
    const refreshData = async () => {
      if (loading) return; // Don't refresh during initial load
      
      try {
        setRefreshing(true);
        
        if (activeTab === 'articles') {
          const result = await fetchArticles({
            search: searchTerm || undefined,
            category: categoryFilter,
            limit: pagination.limit,
            offset: 0
          });
          setArticles(result.data);
          if (result.pagination) {
            setPagination(result.pagination);
          }
        } else {
          const result = await fetchFAQs({
            search: searchTerm || undefined,
            category: categoryFilter
          });
          setFaqs(result.data);
        }
      } catch (error) {
        toast.error('Failed to refresh data');
      } finally {
        setRefreshing(false);
      }
    };

    const debounceTimer = setTimeout(refreshData, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, categoryFilter, statusFilter, activeTab]);

  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchTerm === "" || 
                         article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchTerm === "" || 
                         faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || faq.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const handleViewArticle = async (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setIsArticleDialogOpen(true);
    
    // Record view interaction
    try {
      // Just increment views locally, don't use 'like' for view tracking
      setArticles(prev => prev.map(a => 
        a.id === article.id ? { ...a, views: a.views + 1 } : a
      ));
    } catch (error) {
      console.error('Failed to record article view:', error);
    }
  };

  const handleViewFaq = async (faq: FAQ) => {
    setSelectedFaq(faq);
    setIsFaqDialogOpen(true);
    
    // Record view interaction
    try {
      await interactWithFAQ(faq.id, 'view');
      // Update local state to increment views
      setFaqs(prev => prev.map(f => 
        f.id === faq.id ? { ...f, views: f.views + 1 } : f
      ));
    } catch (error) {
      console.error('Failed to record FAQ view:', error);
    }
  };

  const handleDeleteArticle = async (articleId: number) => {
    if (!user || (user.role !== 'admin' && user.role !== 'support')) {
      toast.error('Only administrators or support can delete articles');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge-base/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete article');
      
      setArticles(prev => prev.filter(article => article.id !== articleId));
      toast.success('Article deleted successfully');
    } catch (error) {
      toast.error('Failed to delete article');
    }
  };

  // Create article/FAQ handler
  const handleCreateSubmit = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const endpoint = activeTab === 'articles' ? '/api/knowledge-base/articles' : '/api/knowledge-base/faqs';
      
      let payload;
      if (activeTab === 'articles') {
        if (!createForm.title || !createForm.content || !createForm.category) {
          toast.error('Please fill in all required fields');
          return;
        }
        payload = {
          title: createForm.title,
          content: createForm.content,
          category: createForm.category,
          tags: createForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          status: createForm.status || 'published'
        };
      } else {
        if (!createForm.question || !createForm.answer || !createForm.category) {
          toast.error('Please fill in all required fields');
          return;
        }
        payload = {
          question: createForm.question,
          answer: createForm.answer,
          category: createForm.category,
          status: 'active'
        };
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create item');
      }

      const result = await response.json();
      
      // Reset form
      setCreateForm({
        title: '',
        content: '',
        category: '',
        tags: '',
        question: '',
        answer: '',
        status: 'draft'
      });
      
      setIsCreateDialogOpen(false);
      toast.success(`${activeTab === 'articles' ? 'Article' : 'FAQ'} created successfully!`);
      
      // Refresh data
      await handleRefresh();
      
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create item');
    } finally {
      setIsCreating(false);
    }
  };

  // Form input handler
  const handleFormChange = (field: string, value: string) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeleteFaq = async (faqId: number) => {
    if (!user || (user.role !== 'admin' && user.role !== 'support')) {
      toast.error('Only administrators or support can delete FAQs');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge-base/faqs/${faqId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete FAQ');
      
      setFaqs(prev => prev.filter(faq => faq.id !== faqId));
      toast.success('FAQ deleted successfully');
    } catch (error) {
      toast.error('Failed to delete FAQ');
    }
  };
  
  const handleEditArticle = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setEditArticleForm({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: (article.tags || []).join(', '),
      status: article.status,
      featured: !!article.featured
    });
    setIsEditArticleOpen(true);
  };
  
  const handleEditFaq = (faq: FAQ) => {
    setSelectedFaq(faq);
    setEditFaqForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      order_index: faq.order_index,
      status: faq.status
    });
    setIsEditFaqOpen(true);
  };
  
  const handleUpdateArticle = async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'support') || !selectedArticle) {
      toast.error('Only administrators or support can update articles');
      return;
    }
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const payload = {
        title: editArticleForm.title,
        content: editArticleForm.content,
        category: editArticleForm.category,
        tags: editArticleForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: editArticleForm.status,
        featured: !!editArticleForm.featured
      };
      const response = await fetch(`${API_BASE_URL}/api/knowledge-base/articles/${selectedArticle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to update article');
      setArticles(prev => prev.map(a => a.id === selectedArticle.id ? { 
        ...a, 
        title: payload.title, 
        content: payload.content, 
        category: payload.category, 
        tags: payload.tags as any, 
        status: payload.status as any, 
        featured: payload.featured 
      } : a));
      setIsEditArticleOpen(false);
      toast.success('Article updated successfully');
    } catch (e) {
      toast.error('Failed to update article');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleUpdateFaq = async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'support') || !selectedFaq) {
      toast.error('Only administrators or support can update FAQs');
      return;
    }
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const payload = {
        question: editFaqForm.question,
        answer: editFaqForm.answer,
        category: editFaqForm.category,
        order_index: editFaqForm.order_index,
        status: editFaqForm.status
      };
      const response = await fetch(`${API_BASE_URL}/api/knowledge-base/faqs/${selectedFaq.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to update FAQ');
      setFaqs(prev => prev.map(f => f.id === selectedFaq.id ? { 
        ...f, 
        question: payload.question, 
        answer: payload.answer, 
        category: payload.category, 
        order_index: payload.order_index, 
        status: payload.status as any 
      } : f));
      setIsEditFaqOpen(false);
      toast.success('FAQ updated successfully');
    } catch (e) {
      toast.error('Failed to update FAQ');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArticleLike = async (articleId: number) => {
    try {
      await interactWithArticle(articleId, 'like');
      setArticles(prev => prev.map(a => 
        a.id === articleId ? { ...a, likes: a.likes + 1 } : a
      ));
      toast.success('Thank you for your feedback!');
    } catch (error) {
      toast.error('Failed to record your feedback');
    }
  };

  const handleArticleDislike = async (articleId: number) => {
    try {
      await interactWithArticle(articleId, 'dislike');
      setArticles(prev => prev.map(a => 
        a.id === articleId ? { ...a, dislikes: a.dislikes + 1 } : a
      ));
      toast.success('Thank you for your feedback!');
    } catch (error) {
      toast.error('Failed to record your feedback');
    }
  };

  const handleFaqHelpful = async (faqId: number) => {
    try {
      await interactWithFAQ(faqId, 'helpful');
      setFaqs(prev => prev.map(f => 
        f.id === faqId ? { ...f, helpful: f.helpful + 1 } : f
      ));
      toast.success('Thank you for your feedback!');
    } catch (error) {
      toast.error('Failed to record your feedback');
    }
  };

  const handleFaqNotHelpful = async (faqId: number) => {
    try {
      await interactWithFAQ(faqId, 'not_helpful');
      setFaqs(prev => prev.map(f => 
        f.id === faqId ? { ...f, not_helpful: f.not_helpful + 1 } : f
      ));
      toast.success('Thank you for your feedback!');
    } catch (error) {
      toast.error('Failed to record your feedback');
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      
      if (activeTab === 'articles') {
        const result = await fetchArticles({
          search: searchTerm || undefined,
          category: categoryFilter,
          limit: pagination.limit,
          offset: 0
        });
        setArticles(result.data);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        const result = await fetchFAQs({
          search: searchTerm || undefined,
          category: categoryFilter
        });
        setFaqs(result.data);
      }
      
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <SupportLayout
        title="Knowledge Base"
        description="Manage support articles and frequently asked questions"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">Loading knowledge base...</p>
          </div>
        </div>
      </SupportLayout>
    );
  }

  if (error) {
    return (
      <SupportLayout
        title="Knowledge Base"
        description="Manage support articles and frequently asked questions"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </SupportLayout>
    );
  }

  return (
    <SupportLayout
      title="Knowledge Base"
      description="Manage support articles and frequently asked questions"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search knowledge base..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={refreshing}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={refreshing}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.articles?.map(category => (
                  <SelectItem key={category.category} value={category.category}>{category.category}</SelectItem>
                )) || []}
              </SelectContent>
            </Select>
            {activeTab === "articles" && (
              <Select value={statusFilter} onValueChange={setStatusFilter} disabled={refreshing}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              disabled={refreshing}
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={refreshing}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create {activeTab === "articles" ? "Article" : "FAQ"}
            </Button>
            <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50" disabled={refreshing}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50" disabled={refreshing}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{articles.length}</div>
              <p className="text-xs text-muted-foreground">
                {articles.filter(a => a.status === "published").length} published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total FAQs</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{faqs.length}</div>
              <p className="text-xs text-muted-foreground">
                Across {categories.faqs?.length || 0} categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(articles.reduce((sum, a) => sum + a.views, 0) + faqs.reduce((sum, f) => sum + f.views, 0)).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +15% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(articles.reduce((sum, a) => sum + a.rating, 0) / articles.filter(a => a.rating > 0).length || 0).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on user feedback
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Knowledge Base Management</CardTitle>
                <CardDescription>
                  Create and manage support articles and frequently asked questions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="articles">Articles ({articles.length})</TabsTrigger>
                <TabsTrigger value="faqs">FAQs ({faqs.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="articles" className="space-y-4 mt-6">
                {refreshing && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600 mr-2" />
                    <span className="text-gray-600">Refreshing articles...</span>
                  </div>
                )}
                {!refreshing && filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg">{article.title}</h4>
                        {article.featured && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                        <Badge className={getStatusColor(article.status)}>
                          {article.status}
                        </Badge>
                        <Badge variant="outline">{article.category}</Badge>
                      </div>
                      <p className="text-gray-600 mb-2 line-clamp-2">
                        {article.content.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {article.author_name || 'Unknown'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(article.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {article.views.toLocaleString()} views
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          {article.likes}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          {Number(article.rating || 0).toFixed(1)}
                        </div>
                        <div className="flex gap-1">
                          {article.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewArticle(article)}
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArticleLike(article.id)}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {article.likes}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArticleDislike(article.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <ThumbsDown className="h-4 w-4 mr-1" />
                        {article.dislikes}
                      </Button>
                      {(user?.role === 'admin' || user?.role === 'support') && (
                        <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleEditArticle(article)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteArticle(article.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {filteredArticles.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                    <p className="text-gray-500 mb-4">
                      No articles match your current filters. Try adjusting your search criteria.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setCategoryFilter("all");
                        setStatusFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="faqs" className="space-y-4 mt-6">
                {refreshing && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600 mr-2" />
                    <span className="text-gray-600">Refreshing FAQs...</span>
                  </div>
                )}
                {!refreshing && filteredFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg">{faq.question}</h4>
                        <Badge variant="outline">{faq.category}</Badge>
                      </div>
                      <p className="text-gray-600 mb-2 line-clamp-2">
                        {faq.answer.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {faq.views.toLocaleString()} views
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          {faq.helpful} helpful
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsDown className="h-4 w-4" />
                          {faq.not_helpful} not helpful
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Updated {new Date(faq.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFaq(faq)}
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {(user?.role === 'admin' || user?.role === 'support') && (
                        <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleEditFaq(faq)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFaq(faq.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {filteredFaqs.length === 0 && (
                  <div className="text-center py-12">
                    <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No FAQs found</h3>
                    <p className="text-gray-500 mb-4">
                      No FAQs match your current filters. Try adjusting your search criteria.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setCategoryFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Article Details Dialog */}
        <Dialog open={isArticleDialogOpen} onOpenChange={setIsArticleDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            {selectedArticle && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <BookOpen className="h-6 w-6" />
                    {selectedArticle.title}
                    {selectedArticle.featured && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    <Badge className={getStatusColor(selectedArticle.status)}>
                      {selectedArticle.status}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    By {selectedArticle.author_name || 'Unknown'} • {selectedArticle.category} • {selectedArticle.views.toLocaleString()} views
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    {selectedArticle.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="prose max-w-none">
                    <p>{selectedArticle.content}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Created: {new Date(selectedArticle.created_at).toLocaleDateString()}</span>
                      <span>Updated: {new Date(selectedArticle.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{selectedArticle.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsDown className="h-4 w-4" />
                        <span>{selectedArticle.dislikes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        <span>{Number(selectedArticle.rating || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditArticleOpen} onOpenChange={setIsEditArticleOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Article</DialogTitle>
              <DialogDescription>Update article details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-article-title">Title</Label>
                <Input
                  id="edit-article-title"
                  value={editArticleForm.title}
                  onChange={(e) => setEditArticleForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-article-category">Category</Label>
                <Input
                  id="edit-article-category"
                  value={editArticleForm.category}
                  onChange={(e) => setEditArticleForm(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-article-tags">Tags (comma separated)</Label>
                <Input
                  id="edit-article-tags"
                  value={editArticleForm.tags}
                  onChange={(e) => setEditArticleForm(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-article-status">Status</Label>
                <Select value={editArticleForm.status} onValueChange={(value) => setEditArticleForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-article-content">Content</Label>
                <Textarea
                  id="edit-article-content"
                  rows={8}
                  value={editArticleForm.content}
                  onChange={(e) => setEditArticleForm(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditArticleOpen(false)}>Cancel</Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleUpdateArticle} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* FAQ Details Dialog */}
        <Dialog open={isFaqDialogOpen} onOpenChange={setIsFaqDialogOpen}>
          <DialogContent className="max-w-2xl">
            {selectedFaq && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <HelpCircle className="h-6 w-6" />
                    FAQ Details
                  </DialogTitle>
                  <DialogDescription>
                    {selectedFaq.category} • {selectedFaq.views.toLocaleString()} views
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Question</Label>
                    <p className="mt-1">{selectedFaq.question}</p>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Answer</Label>
                    <p className="mt-1 text-gray-600">{selectedFaq.answer}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Last updated: {new Date(selectedFaq.updated_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-green-600">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{selectedFaq.helpful}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600">
                        <ThumbsDown className="h-4 w-4" />
                        <span>{selectedFaq.not_helpful}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditFaqOpen} onOpenChange={setIsEditFaqOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit FAQ</DialogTitle>
              <DialogDescription>Update FAQ details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-faq-question">Question</Label>
                <Input
                  id="edit-faq-question"
                  value={editFaqForm.question}
                  onChange={(e) => setEditFaqForm(prev => ({ ...prev, question: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-faq-category">Category</Label>
                <Input
                  id="edit-faq-category"
                  value={editFaqForm.category}
                  onChange={(e) => setEditFaqForm(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-faq-status">Status</Label>
                <Select value={editFaqForm.status} onValueChange={(value) => setEditFaqForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-faq-order">Order</Label>
                <Input
                  id="edit-faq-order"
                  type="number"
                  value={editFaqForm.order_index}
                  onChange={(e) => setEditFaqForm(prev => ({ ...prev, order_index: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-faq-answer">Answer</Label>
                <Textarea
                  id="edit-faq-answer"
                  rows={6}
                  value={editFaqForm.answer}
                  onChange={(e) => setEditFaqForm(prev => ({ ...prev, answer: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditFaqOpen(false)}>Cancel</Button>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleUpdateFaq} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Create New {activeTab === "articles" ? "Article" : "FAQ"}
              </DialogTitle>
              <DialogDescription>
                Add a new {activeTab === "articles" ? "knowledge base article" : "frequently asked question"} to help your customers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {activeTab === "articles" ? (
                <>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      placeholder="Enter article title..." 
                      value={createForm.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={createForm.category} onValueChange={(value) => handleFormChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.articles?.map(category => (
                          <SelectItem key={category.category} value={category.category}>{category.category}</SelectItem>
                        )) || []}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <Input 
                      id="tags" 
                      placeholder="Enter tags separated by commas..." 
                      value={createForm.tags}
                      onChange={(e) => handleFormChange('tags', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea 
                      id="content" 
                      rows={8} 
                      placeholder="Write your article content..." 
                      value={createForm.content}
                      onChange={(e) => handleFormChange('content', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="question">Question</Label>
                    <Input 
                      id="question" 
                      placeholder="Enter the question..." 
                      value={createForm.question}
                      onChange={(e) => handleFormChange('question', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="answer">Answer</Label>
                    <Textarea 
                      id="answer" 
                      rows={6} 
                      placeholder="Enter the answer..." 
                      value={createForm.answer}
                      onChange={(e) => handleFormChange('answer', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="faq-category">Category</Label>
                    <Select value={createForm.category} onValueChange={(value) => handleFormChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.faqs?.map(category => (
                          <SelectItem key={category.category} value={category.category}>{category.category}</SelectItem>
                        )) || []}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleCreateSubmit}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    `Create ${activeTab === "articles" ? "Article" : "FAQ"}`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SupportLayout>
  );
}
