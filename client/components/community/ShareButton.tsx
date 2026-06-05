import React, { useState } from 'react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  Mail,
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface ShareButtonProps {
  postId: number;
  content: string;
  authorName: string;
  onShare?: (platform: string, postId: number) => void;
}

export function ShareButton({ postId, content, authorName, onShare }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/community/post/${postId}`;
  const shareText = `Check out this post by ${authorName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=600,height=400');
    onShare?.('facebook', postId);
    setIsOpen(false);
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    onShare?.('twitter', postId);
    setIsOpen(false);
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    onShare?.('linkedin', postId);
    setIsOpen(false);
  };

  const shareViaEmail = () => {
    const subject = `Check out this community post`;
    const body = `${shareText}\n\nView the full post: ${shareUrl}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    onShare?.('email', postId);
    setIsOpen(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied!',
        description: 'The post link has been copied to your clipboard.',
      });
      onShare?.('copy', postId);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy the link to clipboard.',
        variant: 'destructive',
      });
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center space-x-2 py-3 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600"
        >
          <Share2 className="w-5 h-5" />
          <span className="font-semibold">Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={shareToFacebook} className="cursor-pointer">
          <Facebook className="w-4 h-4 mr-2 text-blue-600" />
          Share on Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTwitter} className="cursor-pointer">
          <Twitter className="w-4 h-4 mr-2 text-blue-400" />
          Share on Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToLinkedIn} className="cursor-pointer">
          <Linkedin className="w-4 h-4 mr-2 text-blue-700" />
          Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareViaEmail} className="cursor-pointer">
          <Mail className="w-4 h-4 mr-2 text-gray-600" />
          Share via Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer">
          <Copy className="w-4 h-4 mr-2 text-gray-600" />
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}