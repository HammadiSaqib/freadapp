import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Pin,
  Trash2,
  ThumbsUp,
  Laugh,
  Angry,
  Sad,
} from 'lucide-react';
import { ShareButton } from './ShareButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

export interface CommunityPost {
  id: number;
  user_id: number;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'document';
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
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
  user_reaction?: 'like' | 'love' | 'laugh' | 'angry' | 'sad';
}

interface PostCardProps {
  post: CommunityPost;
  currentUserId: number;
  onLike: (postId: number) => void;
  onReact: (postId: number, reaction: string) => void;
  onComment: (postId: number) => void;
  onShare?: (platform: string, postId: number) => void;
  onDelete?: (postId: number) => void;
  onPin?: (postId: number) => void;
}

const reactionEmojis = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  angry: '😠',
  sad: '😢',
};

export function PostCard({
  post,
  currentUserId,
  onLike,
  onReact,
  onComment,
  onShare,
  onDelete,
  onPin,
}: PostCardProps) {
  const [showReactions, setShowReactions] = useState(false);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Handle clicking outside reaction menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        reactionMenuRef.current &&
        !reactionMenuRef.current.contains(event.target as Node) &&
        likeButtonRef.current &&
        !likeButtonRef.current.contains(event.target as Node)
      ) {
        setShowReactions(false);
      }
    };

    if (showReactions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReactions]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const isAuthor = post.user_id === currentUserId;
  const canManage = isAuthor; // Add admin check later

  const handleReaction = (reaction: string) => {
    onReact(post.id, reaction);
    setShowReactions(false);
  };

  const renderMedia = () => {
    if (!post.media_url) return null;

    switch (post.media_type) {
      case 'image':
        return (
          <div className="mt-3 -mx-6">
            <img
              src={post.media_url}
              alt="Post media"
              className="w-full max-h-[500px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => window.open(post.media_url, '_blank')}
            />
          </div>
        );
      case 'video':
        return (
          <div className="mt-3 -mx-6">
            <video
              src={post.media_url}
              controls
              className="w-full max-h-[500px] object-cover"
            />
          </div>
        );
      case 'document':
        return (
          <div className="mt-3 flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">DOC</span>
            </div>
            <div className="flex-1 min-w-0">
              <a
                href={post.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium truncate block"
              >
                View Document
              </a>
              <p className="text-sm text-gray-500 dark:text-gray-400">Click to open</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-900 shadow-lg border-0 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl mb-6">
      <CardHeader className="pb-4 px-6 pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="w-12 h-12 ring-3 ring-blue-100 dark:ring-blue-900 shadow-md">
              <AvatarImage src={undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
                {post.user ? getInitials(post.user.first_name, post.user.last_name) : '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">
                  {post.user ? `${post.user.first_name} ${post.user.last_name}` : 'Unknown User'}
                </h3>
                {post.user?.role === 'admin' && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs px-2 py-1 rounded-full shadow-sm">
                    Admin
                  </Badge>
                )}
                {post.is_pinned && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs px-2 py-1 rounded-full shadow-sm">
                    <Pin className="w-3 h-3 mr-1" />
                    Pinned
                  </Badge>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors">
                {formatDate(post.created_at)}
              </p>
            </div>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onPin && (
                  <DropdownMenuItem onClick={() => onPin(post.id)}>
                    <Pin className="w-4 h-4 mr-2" />
                    {post.is_pinned ? 'Unpin' : 'Pin'} Post
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(post.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 px-6">
        <div className="mb-4">
          <p className="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap text-base">{post.content}</p>
        </div>
        
        {renderMedia()}
        
        {/* Engagement Stats */}
        {(post.like_count > 0 || post.comment_count > 0) && (
          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center space-x-4">
              {post.like_count > 0 && (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <div className="flex -space-x-1">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm shadow-sm">👍</div>
                    {post.like_count > 1 && (
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm shadow-sm">❤️</div>
                    )}
                  </div>
                  <span className="text-sm font-medium hover:underline cursor-pointer transition-colors hover:text-blue-600">
                    {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
                  </span>
                </div>
              )}
            </div>
            {post.comment_count > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400 hover:underline cursor-pointer transition-colors hover:text-blue-600">
                {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
              </span>
            )}
          </div>
        )}
        
        <Separator className="my-3 bg-gray-100 dark:bg-gray-700" />
        
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center w-full">
            <div className="relative flex-1">
              <Button
                ref={likeButtonRef}
                variant="ghost"
                size="sm"
                onClick={() => onLike(post.id)}
                onDoubleClick={() => setShowReactions(!showReactions)}
                onMouseEnter={() => setShowReactions(true)}
                className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-semibold ${
                  post.user_has_liked 
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600'
                }`}
              >
                {post.user_reaction ? (
                  <span className="text-lg">
                    {reactionEmojis[post.user_reaction as keyof typeof reactionEmojis]}
                  </span>
                ) : (
                  <Heart
                    className={`w-5 h-5 ${
                      post.user_has_liked ? 'fill-current' : ''
                    }`}
                  />
                )}
                <span className="font-semibold">{post.user_has_liked ? 'Liked' : 'Like'}</span>
              </Button>
              
              {showReactions && (
                <div
                  ref={reactionMenuRef}
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 flex space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-xl p-3 z-20"
                >
                  {Object.entries(reactionEmojis).map(([reaction, emoji]) => (
                    <button
                      key={reaction}
                      onClick={() => handleReaction(reaction)}
                      className="text-2xl hover:scale-125 transition-transform p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComment(post.id)}
              className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-blue-600 font-semibold"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">Comment</span>
            </Button>
            
            <div className="flex-1">
              <ShareButton
                postId={post.id}
                content={post.content}
                authorName={`${post.user.first_name} ${post.user.last_name}`}
                onShare={onShare}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}