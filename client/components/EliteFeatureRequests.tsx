import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { featureRequestsApi } from "@/lib/api";
import { 
  Loader2, 
  MessageSquare, 
  ThumbsUp, 
  X, 
  Plus, 
  Search, 
  TrendingUp, 
  Clock, 
  Image as ImageIcon,
  Send,
  CheckCircle2,
  LayoutGrid,
  List,
  Sparkles,
  Zap
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

type FeatureRequest = {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  status: "open" | "closed";
  votes_count: number;
  comments_count: number;
  user_has_voted: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
};

type FeatureRequestComment = {
  id: number;
  request_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
};

export default function EliteFeatureRequests() {
  const { toast } = useToast();

  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");
  const [viewMode, setViewMode] = useState<"row" | "column">("column");

  // Create Request State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Comments State
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [comments, setComments] = useState<FeatureRequestComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  const activeRequest = useMemo(
    () => requests.find((r) => r.id === activeRequestId) ?? null,
    [requests, activeRequestId]
  );

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await featureRequestsApi.getRequests({ page: 1, limit: 100 });
      const nextRequests = (res.data?.requests || []) as FeatureRequest[];
      setRequests(nextRequests);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to load feature requests.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    let filtered = [...requests];
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(lowerQuery) || 
        r.content.toLowerCase().includes(lowerQuery) ||
        r.user.first_name.toLowerCase().includes(lowerQuery) ||
        r.user.last_name.toLowerCase().includes(lowerQuery)
      );
    }

    if (sortBy === "popular") {
      filtered.sort((a, b) => b.votes_count - a.votes_count);
    } else {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  }, [requests, searchQuery, sortBy]);

  const clearSelectedImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

  const onSelectImage = (file: File | null) => {
    clearSelectedImage();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Only image files are allowed.",
        variant: "destructive",
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setSelectedImage(file);
    setImagePreviewUrl(url);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeTitle = title.trim();
    const safeContent = content.trim();
    
    if (!safeTitle || !safeContent) {
      toast({
        title: "Missing fields",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append("title", safeTitle);
      formData.append("content", safeContent);
      if (selectedImage) formData.append("image", selectedImage);

      const res = await featureRequestsApi.createRequest(formData);
      const created = res.data?.request as FeatureRequest | undefined;
      
      if (created) {
        setRequests((prev) => [created, ...prev]);
        setTitle("");
        setContent("");
        clearSelectedImage();
        setIsCreateOpen(false);
        toast({ 
          title: "Request Submitted", 
          description: "Your feature request has been posted successfully." 
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to create feature request.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleVote = async (requestId: number) => {
    const previous = requests;
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        const nextHasVoted = !r.user_has_voted;
        const nextVotes = Math.max(0, (r.votes_count || 0) + (nextHasVoted ? 1 : -1));
        return { ...r, user_has_voted: nextHasVoted, votes_count: nextVotes };
      })
    );

    try {
      const res = await featureRequestsApi.toggleVote(requestId);
      const votesCount = res.data?.votes_count;
      const userHasVoted = res.data?.user_has_voted;
      
      if (typeof votesCount === "number" && typeof userHasVoted === "boolean") {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, votes_count: votesCount, user_has_voted: userHasVoted } : r))
        );
      }
    } catch (error: any) {
      setRequests(previous);
      toast({
        title: "Error",
        description: "Failed to update vote.",
        variant: "destructive",
      });
    }
  };

  const openComments = async (requestId: number) => {
    setActiveRequestId(requestId);
    setIsCommentsOpen(true);
    setIsLoadingComments(true);
    setComments([]);
    try {
      const res = await featureRequestsApi.getComments(requestId);
      setComments((res.data?.comments || []) as FeatureRequestComment[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load comments.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingComments(false);
    }
  };

  const postComment = async () => {
    if (!activeRequestId) return;
    const safe = newComment.trim();
    if (!safe) return;

    setIsPostingComment(true);
    try {
      const res = await featureRequestsApi.addComment(activeRequestId, safe);
      const created = res.data?.comment as FeatureRequestComment | undefined;
      const commentsCount = res.data?.comments_count as number | undefined;
      
      if (created) {
        setComments((prev) => [...prev, created]);
        setNewComment("");
        if (typeof commentsCount === "number") {
          setRequests((prev) =>
            prev.map((r) => (r.id === activeRequestId ? { ...r, comments_count: commentsCount } : r))
          );
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to post comment.",
        variant: "destructive",
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  const approveRequest = async (requestId: number) => {
    try {
      const res = await featureRequestsApi.approveRequest(requestId);
      const status = (res.data?.status as FeatureRequest["status"]) || "closed";
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)));
      toast({ title: "Approved", description: "Marked as approved. Coming Soon badge added." });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to approve request.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <div className="elite-page-shell">
        {/* Background Electric Glows */}
        <div className="elite-page-glow-primary"></div>
        <div className="elite-page-glow-secondary" style={{ animationDelay: "2s" }}></div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1600px] mx-auto space-y-6 relative z-10 elite-nested-wrapper">
          
          {/* Header Section */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 pb-4 bg-white rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] gap-4">
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-[#7000ff] to-[#00d4ff] tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-[#7000ff]" /> Feature Requests
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Vote on community ideas or suggest your own</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search ideas..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-10 h-10 border-slate-100 rounded-xl bg-slate-50 text-slate-800 shadow-inner focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/50 transition-all placeholder:text-slate-400 text-xs font-semibold"
                />
              </div>
              <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "popular")} className="w-full sm:w-auto">
                <TabsList className="h-10 bg-slate-50 border border-slate-100 rounded-xl shadow-inner p-1">
                  <TabsTrigger value="newest" className="text-[10px] font-bold uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#00d4ff] data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 transition-all"><Clock className="w-3 h-3 mr-1" /> Newest</TabsTrigger>
                  <TabsTrigger value="popular" className="text-[10px] font-bold uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#ff00ff] data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 transition-all"><TrendingUp className="w-3 h-3 mr-1" /> Popular</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
                <Button variant={viewMode === "row" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("row")} className={`h-8 w-8 p-0 rounded-lg ${viewMode === "row" ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}><List className="w-4 h-4" /></Button>
                <Button variant={viewMode === "column" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("column")} className={`h-8 w-8 p-0 rounded-lg ${viewMode === "column" ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4" /></Button>
              </div>
              <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-10 w-full sm:w-auto px-4 bg-gradient-to-r from-[#00d4ff] to-[#00ffcc] hover:opacity-90 text-slate-900 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.4)] border-0 text-xs font-black uppercase tracking-wider shrink-0">
                <Plus className="h-4 w-4 mr-2" /> New Idea
              </Button>
            </div>
          </motion.div>

          {/* Requests Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-12 w-12 rounded-full border-4 border-[#00d4ff] border-t-transparent animate-spin mb-4"></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Innovation Hub...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-white rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="p-6 bg-slate-50 rounded-full shadow-inner">
                <Zap className="w-12 h-12 text-slate-300" /> 
              </div>
              <h3 className="text-xl font-black text-slate-800">No ideas found</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-sm">
                Be the first to submit a feature request and shape the future!
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="mt-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md text-xs font-bold uppercase tracking-wider">
                Submit Idea
              </Button>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className={viewMode === "column" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-6"}
            >
              <AnimatePresence>
                {filteredRequests.map((request) => (
                  <motion.div key={request.id} variants={itemVariants} layout>
                    <Card className={`h-full flex flex-col group hover:shadow-[0_8px_30px_rgba(112,0,255,0.12)] transition-all duration-300 border-white bg-white/80 backdrop-blur-xl overflow-hidden rounded-3xl relative ${request.status === 'closed' ? 'opacity-80' : ''}`}>
                      {request.status === "closed" && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00ffcc] to-emerald-500"></div>}
                      
                      {/* Card Header */}
                      <CardHeader className="p-6 pb-4 flex flex-row items-start justify-between space-y-0 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                            <AvatarImage src={request.user.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-[#00d4ff] to-[#7000ff] text-white font-black">
                              {getInitials(request.user.first_name, request.user.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">
                              {request.user.first_name} {request.user.last_name}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Card Content */}
                      <CardContent className="p-6 pt-4 flex-grow space-y-4">
                        <div className="space-y-2">
                          <h3 className="font-black text-lg text-slate-800 leading-tight group-hover:text-[#7000ff] transition-colors line-clamp-2">
                            {request.title}
                          </h3>
                          <p className="text-xs font-medium text-slate-500 line-clamp-4 leading-relaxed">
                            {request.content}
                          </p>
                        </div>

                        {request.image_url && (
                          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-inner">
                            <img 
                              src={request.image_url} 
                              alt={request.title}
                              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        )}
                      </CardContent>

                      {/* Card Footer */}
                      <CardFooter className="p-4 pt-4 border-t border-slate-50 bg-slate-50/50 mt-auto">
                        <div className="flex items-center justify-between w-full">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleVote(request.id)}
                            className={`gap-2 h-9 px-4 rounded-xl transition-all text-xs font-bold uppercase tracking-wider ${
                              request.user_has_voted 
                                ? "bg-gradient-to-r from-[#00ffcc] to-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(0,255,204,0.4)] border-0" 
                                : "bg-white border border-slate-200 text-slate-600 hover:text-[#00ffcc] hover:border-[#00ffcc]/50 shadow-sm"
                            }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${request.user_has_voted ? "fill-slate-900" : ""}`} />
                            <span>{request.user_has_voted ? "Voted" : "Vote"}</span>
                            {request.votes_count > 0 && (
                              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${request.user_has_voted ? 'bg-slate-900/10' : 'bg-slate-100'}`}>
                                {request.votes_count}
                              </span>
                            )}
                          </Button>

                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openComments(request.id)}
                              className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#00d4ff] hover:border-[#00d4ff]/50 shadow-sm text-xs font-bold uppercase tracking-wider"
                            >
                              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                              <span>{request.comments_count}</span>
                            </Button>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Create Request Dialog (Elite Styled) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl border-0 dark:border dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_20px_60px_-15px_rgba(2,6,23,0.7)] p-0 overflow-hidden bg-white dark:bg-slate-950 dark:text-slate-100 elite-nested-wrapper">
          <div className="h-1 w-full bg-gradient-to-r from-[#00d4ff] via-[#7000ff] to-[#ff00ff]"></div>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-xl shadow-inner">
                <Sparkles className="w-5 h-5 text-[#00d4ff]" />
              </div>
              Submit New Idea
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateSubmit} className="p-6 pt-2 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Idea Title</label>
                <Input
                  placeholder="What should we build next?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 border-slate-100 rounded-xl bg-slate-50 text-slate-800 shadow-inner focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/50 text-sm font-semibold"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detailed Description</label>
                <Textarea
                  placeholder="Describe how this feature would work and why it's useful..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="resize-none border-slate-100 rounded-xl bg-slate-50 text-slate-800 shadow-inner focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/50 text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attachment (Optional)</label>
                <div className={`border-2 border-dashed rounded-2xl p-6 transition-all ${
                  imagePreviewUrl ? 'border-[#00d4ff]/50 bg-blue-50/50' : 'border-slate-200 bg-slate-50 hover:border-[#00d4ff]/50 hover:bg-blue-50/30 cursor-pointer'
                }`}>
                  {imagePreviewUrl ? (
                    <div className="relative group flex justify-center">
                      <img 
                        src={imagePreviewUrl} 
                        alt="Preview" 
                        className="max-h-48 object-contain rounded-xl shadow-sm border border-white" 
                      />
                      <Button
                        type="button"
                        size="icon"
                        className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white text-rose-500 shadow-md border border-slate-100 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); clearSelectedImage(); }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center gap-2" onClick={() => document.getElementById('image-upload-elite')?.click()}>
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                        <ImageIcon className="w-5 h-5 text-[#00d4ff]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Click to upload image</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">PNG, JPG up to 10MB</p>
                      </div>
                      <Input
                        id="image-upload-elite"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onSelectImage(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-50 pt-4 sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 rounded-xl h-10 px-4">
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="bg-gradient-to-r from-[#00d4ff] to-[#00ffcc] text-slate-900 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.4)] hover:shadow-[0_0_25px_rgba(0,212,255,0.6)] border-0 text-xs font-black uppercase tracking-wider h-10 px-6">
                {isCreating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Submit Idea</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog (Elite Styled) */}
      <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border-0 dark:border dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_20px_60px_-15px_rgba(2,6,23,0.7)] bg-white dark:bg-slate-950 dark:text-slate-100 elite-nested-wrapper">
          <div className="h-1 w-full bg-gradient-to-r from-[#ff9900] to-[#ff00ff]"></div>
          <DialogHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-800">
              <MessageSquare className="w-5 h-5 text-[#ff00ff]" />
              Discussion
            </DialogTitle>
            {activeRequest && (
              <p className="text-xs font-semibold text-slate-500 line-clamp-1 mt-1">
                Re: {activeRequest.title}
              </p>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 p-6 bg-[#fafcff] dark:bg-slate-950/60">
            {isLoadingComments ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <div className="h-8 w-8 rounded-full border-4 border-[#ff00ff] border-t-transparent animate-spin"></div>
                <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Loading thread...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100 mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-600">No comments yet.</p>
                <p className="text-xs font-medium text-slate-400 mt-1">Be the first to share your thoughts!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4 group">
                    <Avatar className="w-8 h-8 mt-1 ring-2 ring-white shadow-sm shrink-0">
                      <AvatarImage src={comment.user.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-[#00d4ff] to-[#7000ff] text-white text-[10px] font-black">
                        {getInitials(comment.user.first_name, comment.user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {comment.user.first_name} {comment.user.last_name}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-700 bg-white p-3.5 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm leading-relaxed">
                        {comment.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t border-slate-100 bg-white mt-auto">
            <div className="flex gap-2 items-end bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner focus-within:ring-2 focus-within:ring-[#ff00ff]/30 focus-within:border-[#ff00ff]/50 transition-all">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[2.5rem] max-h-32 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    postComment();
                  }
                }}
              />
              <Button 
                size="icon" 
                onClick={postComment} 
                disabled={isPostingComment || !newComment.trim()}
                className="mb-0.5 shrink-0 h-9 w-9 rounded-xl bg-gradient-to-r from-[#ff00ff] to-[#7000ff] text-white shadow-md border-0 hover:opacity-90 disabled:opacity-50"
              >
                {isPostingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </Button>
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-2 text-right uppercase tracking-widest mr-2">
              Press Enter to post
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
