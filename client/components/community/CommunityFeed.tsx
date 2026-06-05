import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import { PostForm } from './PostForm';
import { PostCard, CommunityPost } from './PostCard';
import { CommentSection } from './CommentSection';
import { useToast } from '../../hooks/use-toast';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';


interface CommunityStats {
  total_posts: number;
  total_comments: number;
  total_likes: number;
  active_users: number;
}

interface CommunityFeedProps {
  currentUser?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  } | null;
}

export function CommunityFeed({ currentUser }: CommunityFeedProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPostForComments, setSelectedPostForComments] = useState<number | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'joined'>('all');
  const { toast } = useToast();

  // Early return if currentUser is not available
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Real-time updates
  const { isPolling } = useRealTimeUpdates({
    enabled: true,
    interval: 30000, // Poll every 30 seconds
    onNewPost: (newPost) => {
      setPosts(prev => [newPost, ...prev]);
      setStats(prev => prev ? {
        ...prev,
        total_posts: prev.total_posts + 1
      } : null);
    },
    onPostUpdate: (postId, updates) => {
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, ...updates } : post
      ));
    },
    onLikeUpdate: (postId, likeCount) => {
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, like_count: likeCount } : post
      ));
      setStats(prev => prev ? {
        ...prev,
        total_likes: likeCount
      } : null);
    },
  });

  const fetchPosts = async (pageNum = 1, append = false) => {
    try {
      const response = await fetch(
        `/api/community/posts?page=${pageNum}&limit=10${filterMode === 'joined' ? '&filter=joined' : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      
      if (append) {
        setPosts(prev => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts);
      }
      
      if (data.pagination && typeof data.pagination.totalPages === 'number') {
        setHasMore(pageNum < data.pagination.totalPages);
      } else {
        setHasMore(Boolean((data as any).hasMore));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load posts.',
        variant: 'destructive',
      });
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/community/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    await Promise.all([fetchPosts(), fetchStats()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchPosts(1, false);
  }, [filterMode]);

  const handleCreatePost = async (postData: { content: string; media?: File; targetGroups?: number[]; targetAudience?: 'general' | 'groups' }) => {
    const formData = new FormData();
    formData.append('content', postData.content);
    if (postData.media) {
      formData.append('media', postData.media);
    }
    if (postData.targetGroups && postData.targetGroups.length > 0) {
      formData.append('target_groups', JSON.stringify(postData.targetGroups));
    }

    const response = await fetch('/api/community/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to create post');
    }

    const responseData = await response.json();
    // If posting to groups, do not inject into 'all' feed; refetch when viewing joined
    if (postData.targetGroups && postData.targetGroups.length > 0) {
      if (filterMode === 'joined') {
        await fetchPosts(1, false);
      }
    } else {
      const newPost = responseData.post;
      if (newPost) {
        setPosts(prev => [newPost, ...prev]);
      } else {
        // Fallback: refresh
        await fetchPosts(1, false);
      }
    }

    // Refresh stats
    fetchStats();
  };

  const handleLikePost = async (postId: number) => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      const data = await response.json();
      
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              like_count: data.like_count,
              user_has_liked: data.user_has_liked 
            }
          : post
      ));
    } catch (error) {
      console.error('Error liking post:', error);
      toast({
        title: 'Error',
        description: 'Failed to like post.',
        variant: 'destructive',
      });
    }
  };

  const handleReactToPost = async (postId: number, reaction: string) => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ reactionType: reaction }),
      });

      if (!response.ok) {
        throw new Error('Failed to react to post');
      }

      const data = await response.json();
      
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              like_count: data.like_count,
              user_has_liked: data.user_has_liked,
              user_reaction: data.user_reaction
            }
          : post
      ));
    } catch (error) {
      console.error('Error reacting to post:', error);
      toast({
        title: 'Error',
        description: 'Failed to react to post.',
        variant: 'destructive',
      });
    }
  };

  const handleSharePost = async (platform: string, postId: number) => {
    try {
      // Track the share event
      const response = await fetch(`/api/community/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ platform }),
      });

      if (response.ok) {
        toast({
          title: 'Shared successfully!',
          description: `Post shared on ${platform}.`,
        });
      }
    } catch (error) {
      console.error('Error tracking share:', error);
      // Don't show error to user as sharing still works
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      setPosts(prev => prev.filter(post => post.id !== postId));
      
      toast({
        title: 'Post deleted',
        description: 'The post has been removed.',
      });
      
      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post.',
        variant: 'destructive',
      });
    }
  };

  const handlePinPost = async (postId: number) => {
    try {
      const response = await fetch(`/api/community/posts/${postId}/pin`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to pin post');
      }

      const data = await response.json();
      
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, is_pinned: data.is_pinned }
          : post
      ));
      
      toast({
        title: data.is_pinned ? 'Post pinned' : 'Post unpinned',
        description: data.is_pinned 
          ? 'The post has been pinned to the top.' 
          : 'The post has been unpinned.',
      });
    } catch (error) {
      console.error('Error pinning post:', error);
      toast({
        title: 'Error',
        description: 'Failed to pin post.',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    await Promise.all([fetchPosts(1, false), fetchStats()]);
    setIsRefreshing(false);
  };

  const loadMorePosts = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const handleCommentClick = (postId: number) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleCommentAdded = () => {
    // Update comment count for the post
    if (selectedPostForComments) {
      setPosts(prev => prev.map(post => 
        post.id === selectedPostForComments 
          ? { ...post, comment_count: post.comment_count + 1 }
          : post
      ));
    }
    
    // Refresh stats
    fetchStats();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-32">
            <div className="text-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-lg p-12">
              <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-6" />
              <p className="text-gray-700 font-semibold text-lg">Loading community feed...</p>
              <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the latest posts</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Community Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_posts}</p>
                    <p className="text-sm text-gray-400 font-medium">Posts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_comments}</p>
                    <p className="text-sm text-gray-400 font-medium">Comments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                    <ThumbsUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_likes}</p>
                    <p className="text-sm text-gray-400 font-medium">Likes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.active_users}</p>
                    <p className="text-sm text-gray-400 font-medium">Active Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Community Feed</h2>
              {isPolling && (
                <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg rounded-full px-4 py-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                  Live Updates
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue hover:shadow-lg"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
        </div>
      </div>

      {/* Feed Filter Controls */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filterMode === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterMode('all')}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filterMode === 'joined' ? 'default' : 'outline'}
            onClick={() => setFilterMode('joined')}
          >
            Joined Groups
          </Button>
        </div>
        {isRefreshing && (
          <div className="flex items-center text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Refreshing...
          </div>
        )}
      </div>

        {/* Post Form */}
        <PostForm
          currentUser={currentUser}
          onSubmit={handleCreatePost}
        />

        {/* Posts Feed */}
        <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="space-y-4">
            <PostCard
              post={post}
              currentUserId={currentUser.id}
              onLike={handleLikePost}
              onReact={handleReactToPost}
              onComment={handleCommentClick}
              onShare={handleSharePost}
              onDelete={currentUser.role === 'admin' || post.user_id === currentUser.id ? handleDeletePost : undefined}
              onPin={currentUser.role === 'admin' ? handlePinPost : undefined}
            />
            {expandedComments.has(post.id) && (
              <div className="ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                <CommentSection
                  postId={post.id}
                  currentUser={currentUser}
                  onCommentAdded={handleCommentAdded}
                />
              </div>
            )}
          </div>
        ))}
      </div>

        {/* Load More Button */}
        {hasMore && posts.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={loadMorePosts}
              disabled={isLoading}
              className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-full px-10 py-4 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load more posts'
              )}
            </Button>
          </div>
        )}

        {posts.length === 0 && (
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-lg border-0 rounded-2xl">
            <CardContent className="p-16 text-center">
              <div className="space-y-8">
                <div className="text-9xl opacity-60">📝</div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-gray-900">No posts yet</h3>
                  <p className="text-gray-600 font-medium text-lg">
                    Be the first to share something with the community!
                  </p>
                  <p className="text-gray-500 text-base">
                    Start a conversation, share your thoughts, or ask a question.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


      </div>
    </div>
  );
}