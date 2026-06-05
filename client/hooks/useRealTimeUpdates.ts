import { useEffect, useRef, useState } from 'react';
import { useToast } from './use-toast';

interface UseRealTimeUpdatesOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onNewPost?: (post: any) => void;
  onPostUpdate?: (postId: number, updates: any) => void;
  onNewComment?: (postId: number, comment: any) => void;
  onLikeUpdate?: (postId: number, likeCount: number) => void;
}

interface RealTimeData {
  lastPostId?: number;
  lastCommentId?: number;
  postUpdates?: Record<number, { like_count: number; comment_count: number }>;
}

export function useRealTimeUpdates({
  enabled = true,
  interval = 30000, // 30 seconds
  onNewPost,
  onPostUpdate,
  onNewComment,
  onLikeUpdate,
}: UseRealTimeUpdatesOptions = {}) {
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<RealTimeData>({});
  const { toast } = useToast();

  const pollForUpdates = async () => {
    if (!enabled) return;

    try {
      setIsPolling(true);
      
      // Get auth token
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Poll for new posts
      const postsResponse = await fetch('/api/community/posts?page=1&limit=5', {
        headers
      });
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        const posts = postsData.posts || [];
        
        if (posts.length > 0) {
          const latestPost = posts[0];
          
          // Check for new posts
          if (lastDataRef.current.lastPostId && latestPost.id > lastDataRef.current.lastPostId) {
            const newPosts = posts.filter(post => post.id > lastDataRef.current.lastPostId!);
            newPosts.reverse().forEach(post => {
              onNewPost?.(post);
              toast({
                title: "New Post",
                description: `${post.user.first_name} ${post.user.last_name} shared a new post`,
                duration: 3000,
              });
            });
          }
          
          lastDataRef.current.lastPostId = latestPost.id;
        }
      }

      // Poll for post updates (likes, comments)
      const statsResponse = await fetch('/api/community/stats', {
        headers
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        
        // Check for like/comment count updates
        if (lastDataRef.current.postUpdates) {
          Object.entries(statsData.postStats || {}).forEach(([postIdStr, stats]: [string, any]) => {
            const postId = parseInt(postIdStr);
            const lastStats = lastDataRef.current.postUpdates?.[postId];
            
            if (lastStats) {
              // Check for like updates
              if (stats.like_count > lastStats.like_count) {
                onLikeUpdate?.(postId, stats.like_count);
              }
              
              // Check for comment updates
              if (stats.comment_count > lastStats.comment_count) {
                onPostUpdate?.(postId, { comment_count: stats.comment_count });
              }
            }
          });
        }
        
        lastDataRef.current.postUpdates = statsData.postStats || {};
      }

    } catch (error) {
      console.error('Real-time polling error:', error);
    } finally {
      setIsPolling(false);
    }
  };

  const startPolling = () => {
    if (intervalRef.current) return;
    
    // Initial poll
    pollForUpdates();
    
    // Set up interval
    intervalRef.current = setInterval(pollForUpdates, interval);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetLastData = () => {
    lastDataRef.current = {};
  };

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, interval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    isPolling,
    startPolling,
    stopPolling,
    resetLastData,
    pollForUpdates,
  };
}

export default useRealTimeUpdates;