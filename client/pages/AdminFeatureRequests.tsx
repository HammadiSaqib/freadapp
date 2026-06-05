import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { featureRequestsApi } from "@/lib/api";
import { 
  Loader2, 
  MessageSquare, 
  ThumbsUp, 
  X, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  Clock, 
  MoreHorizontal,
  Image as ImageIcon,
  Send,
  CheckCircle2,
  LayoutGrid,
  List
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import EliteFeatureRequests from "@/components/EliteFeatureRequests";
import { useScoreMachineEliteStatus } from "@/hooks/useScoreMachineEliteStatus";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { contractsApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

export default function AdminFeatureRequests() {
  const { toast } = useToast();
  const { userProfile } = useAuthContext();
  const Layout = userProfile?.role === 'super_admin' ? SuperAdminLayout : DashboardLayout;
  const { isEliteActive } = useScoreMachineEliteStatus();

  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");
  const [viewMode, setViewMode] = useState<"row" | "column">("row");

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
    // Optimistic update
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
      setRequests(previous); // Revert on error
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
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isEliteActive) {
    return (
      <Layout title="Feature Requests" description="Shape the future of our platform.">
        <EliteFeatureRequests />
      </Layout>
    );
  }

  return (
    <Layout title="Feature Requests" description="Shape the future of our platform.">
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Community Ideas
            </h1>
            <p className="text-muted-foreground">
              Vote on existing requests or suggest new features.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsCreateOpen(true)} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 p-4 rounded-xl border backdrop-blur-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search requests..." 
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "popular")} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-2 md:w-[240px]">
                <TabsTrigger value="newest" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Newest
                </TabsTrigger>
                <TabsTrigger value="popular" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Popular
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "row" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("row")}
                className={viewMode === "row" ? "bg-primary text-primary-foreground" : ""}
                aria-label="Row view"
              >
                <List className="w-4 h-4 mr-2" />
                Row
              </Button>
              <Button
                variant={viewMode === "column" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("column")}
                className={viewMode === "column" ? "bg-primary text-primary-foreground" : ""}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Grid
              </Button>
            </div>
          </div>
        </div>

        {/* Requests Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Loading amazing ideas...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="bg-muted/30 p-6 rounded-full">
              <Loader2 className="w-12 h-12 text-muted-foreground/50" /> 
            </div>
            <h3 className="text-xl font-semibold">No requests found</h3>
            <p className="text-muted-foreground max-w-sm">
              Be the first to submit a feature request and help us improve!
            </p>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline">
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
                  <Card className="h-full flex flex-col group hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                    {/* Card Header with User Info */}
                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                          <AvatarImage src={request.user.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-medium">
                            {getInitials(request.user.first_name, request.user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium leading-none">
                            {request.user.first_name} {request.user.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {request.status === "closed" ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700 border border-green-200">Approved</Badge>
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-200">Coming Soon</Badge>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="bg-muted/50">
                          {request.status || "Open"}
                        </Badge>
                      )}
                    </CardHeader>

                    {/* Card Content */}
                    <CardContent className="p-4 pt-2 flex-grow space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                          {request.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {request.content}
                        </p>
                      </div>

                      {request.image_url && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted/30">
                          <img 
                            src={request.image_url} 
                            alt={request.title}
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                    </CardContent>

                    {/* Card Footer */}
                    <CardFooter className="p-4 pt-0 border-t bg-muted/10 mt-auto">
                      <div className="flex items-center justify-between w-full pt-3">
                        <Button
                          variant={request.user_has_voted ? "default" : "ghost"}
                          size="sm"
                          onClick={() => toggleVote(request.id)}
                          className={`gap-2 transition-all ${
                            request.user_has_voted 
                              ? "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/20" 
                              : "hover:bg-green-50 text-muted-foreground hover:text-green-600"
                          }`}
                        >
                          <ThumbsUp className={`w-4 h-4 ${request.user_has_voted ? "fill-current" : ""}`} />
                          <span className="font-medium">Agree</span>
                          {request.votes_count > 0 && (
                            <span className="ml-1 bg-black/10 dark:bg-white/20 px-1.5 py-0.5 rounded text-xs">
                              {request.votes_count}
                            </span>
                          )}
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openComments(request.id)}
                          className="gap-2 text-muted-foreground hover:text-primary"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{request.comments_count > 0 ? request.comments_count : "Comment"}</span>
                        </Button>

                        {request.status !== "closed" && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => approveRequest(request.id)}
                            className="gap-2 text-muted-foreground hover:text-green-600"
                            title="Mark as Approved"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve</span>
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Create Request Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              Submit Feature Request
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateSubmit} className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="What's your idea?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-medium"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe how this feature would work and why it's useful..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Attachment (Optional)</label>
                <div className={`border-2 border-dashed rounded-xl p-6 transition-all ${
                  imagePreviewUrl ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}>
                  {imagePreviewUrl ? (
                    <div className="relative group">
                      <img 
                        src={imagePreviewUrl} 
                        alt="Preview" 
                        className="w-full max-h-64 object-contain rounded-lg shadow-sm" 
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={clearSelectedImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center gap-2 cursor-pointer" onClick={() => document.getElementById('image-upload')?.click()}>
                      <div className="p-3 bg-muted rounded-full">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Click to upload image</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                      </div>
                      <Input
                        id="image-upload"
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

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Submit Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-muted/10">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Comments
            </DialogTitle>
            {activeRequest && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                Re: {activeRequest.title}
              </p>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 p-6">
            {isLoadingComments ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p>Loading conversation...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground text-center">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                <p>No comments yet.</p>
                <p className="text-xs">Be the first to share your thoughts!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4 group">
                    <Avatar className="w-8 h-8 mt-1 border">
                      <AvatarImage src={comment.user.avatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.user.first_name, comment.user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {comment.user.first_name} {comment.user.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-r-xl rounded-bl-xl border">
                        {comment.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t bg-background mt-auto">
            <div className="flex gap-2 items-end">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[2.5rem] max-h-32 resize-none"
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
                className="mb-0.5 shrink-0"
              >
                {isPostingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-right">
              Press Enter to post
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
