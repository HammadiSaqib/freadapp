import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Heart,
  Send,
  Loader2,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '../../hooks/use-toast';

export interface PostComment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  like_count: number;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  user_has_liked: boolean;
}

interface CommentSectionProps {
  postId: number;
  currentUser: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  onCommentAdded?: () => void;
}

export function CommentSection({ postId, currentUser, onCommentAdded }: CommentSectionProps) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
const { toast } = useToast();

  const getInitials = (user?: { first_name?: string; last_name?: string }) => {
    const first = (user?.first_name || '').trim();
    const last = (user?.last_name || '').trim();
    const firstInitial = first ? first[0] : '';
    const lastInitial = last ? last[0] : '';
    const initials = `${firstInitial}${lastInitial}`.trim();
    return initials || 'U';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const fetchComments = async (pageNum = 1, append = false) => {
    try {
      const response = await fetch(
        `/api/community/posts/${postId}/comments?page=${pageNum}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      
      if (append) {
        setComments(prev => [...prev, ...data.comments]);
      } else {
        setComments(data.comments);
      }
      
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast({
        title: 'Empty comment',
        description: 'Please enter a comment.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to create comment');
      }

      const data = await response.json();
      setComments(prev => [data.comment, ...prev]);
      setNewComment('');
      
      if (onCommentAdded) {
        onCommentAdded();
      }
      
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted.',
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: number) => {
    try {
      const response = await fetch(`/api/community/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to like comment');
      }

      const data = await response.json();
      
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              like_count: data.like_count,
              user_has_liked: data.user_has_liked 
            }
          : comment
      ));
    } catch (error) {
      console.error('Error liking comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to like comment.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const response = await fetch(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      toast({
        title: 'Comment deleted',
        description: 'The comment has been removed.',
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment.',
        variant: 'destructive',
      });
    }
  };

  const loadMoreComments = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-100">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Loading comments...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-0">
        {/* Comment Form */}
        <form onSubmit={handleSubmitComment} className="mb-4">
          <div className="flex items-start space-x-3 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <Avatar className="w-8 h-8 ring-2 ring-blue-50">
              <AvatarImage src={undefined} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                {getInitials(currentUser)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="min-h-[60px] resize-none border-gray-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl bg-gray-50 placeholder:text-gray-500"
                disabled={isSubmitting}
              />
              <div className="flex justify-end mt-3">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !newComment.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-3">
          {comments.map((comment) => {
            const isAuthor = comment.user_id === currentUser.id;
            const canDelete = isAuthor; // Add admin check later

            return (
              <div key={comment.id} className="flex items-start space-x-3 bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <Avatar className="w-8 h-8 ring-2 ring-gray-100">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-blue-600 text-white font-medium">
                    {getInitials(comment.user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-2xl p-3 relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-gray-900">
                          {comment.user ? `${comment.user.first_name} ${comment.user.last_name}` : 'Unknown User'}
                        </span>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {comment.user?.role || 'User'}
                        </Badge>
                      </div>
                      {canDelete && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-200 rounded-full">
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="shadow-lg border-gray-200">
                            <DropdownMenuItem
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
                      {comment.content}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 px-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLikeComment(comment.id)}
                      className={`h-7 text-xs px-2 rounded-full transition-all duration-200 ${
                        comment.user_has_liked 
                          ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                          : 'text-gray-500 hover:bg-gray-100 hover:text-red-500'
                      }`}
                    >
                      <Heart
                        className={`w-3 h-3 mr-1 transition-all duration-200 ${
                          comment.user_has_liked ? 'fill-current scale-110' : ''
                        }`}
                      />
                      {comment.like_count > 0 && (
                        <span className="font-medium">{comment.like_count}</span>
                      )}
                    </Button>
                    <span className="text-xs text-gray-500 font-medium">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        {hasMore && comments.length > 0 && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={loadMoreComments}
              disabled={isLoading}
              className="border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 rounded-full px-6 py-2 font-medium transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load more comments'
              )}
            </Button>
          </div>
        )}

        {comments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
            <div className="text-gray-400 mb-2">
              <Heart className="w-8 h-8 mx-auto mb-3 opacity-50" />
            </div>
            <p className="text-gray-500 font-medium">No comments yet</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to share your thoughts!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
