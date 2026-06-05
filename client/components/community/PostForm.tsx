import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Image,
  Video,
  FileText,
  X,
  Send,
  Loader2,
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface PostFormProps {
  currentUser: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  onSubmit: (postData: {
    content: string;
    media?: File;
    targetGroups?: number[];
    targetAudience?: 'general' | 'groups';
  }) => Promise<void>;
  placeholder?: string;
}

export function PostForm({ currentUser, onSubmit, placeholder = "What's on your mind?" }: PostFormProps) {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [targetAudience, setTargetAudience] = useState<'general' | 'groups'>('general');
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: number; name: string; user_role?: string }>>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load joined groups helper
  const loadGroups = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/groups', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const groups = await res.json();
        // Only allow groups where user is already a member/admin/moderator
        const joined = (groups || []).filter((g: any) => !!g.user_role);
        setAvailableGroups(joined.map((g: any) => ({ id: g.id, name: g.name, user_role: g.user_role })));
      }
    } catch (e) {
      // silently ignore
    }
  }, []);

  // Initial load on mount
  React.useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Refresh groups when audience toggles to 'groups'
  React.useEffect(() => {
    if (targetAudience === 'groups') {
      loadGroups();
    }
  }, [targetAudience, loadGroups]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image, video, or document file.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images and videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && !selectedFile) {
      toast({
        title: 'Empty post',
        description: 'Please add some content or attach a file.',
        variant: 'destructive',
      });
      return;
    }

    if (targetAudience === 'groups' && selectedGroupIds.length === 0) {
      toast({
        title: 'Select groups',
        description: 'Please select at least one group to post to.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        content: content.trim(),
        media: selectedFile || undefined,
        targetAudience,
        targetGroups: targetAudience === 'groups' ? selectedGroupIds : undefined,
      });
      
      // Reset form
      setContent('');
      removeFile();
      setTargetAudience('general');
      setSelectedGroupIds([]);
      
      toast({
        title: 'Post created',
        description: 'Your post has been shared successfully.',
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to create post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    return (
      <div className="mt-3 relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={removeFile}
          className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
        >
          <X className="w-4 h-4" />
        </Button>
        
        {selectedFile.type.startsWith('image/') && previewUrl && (
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full max-h-64 object-cover rounded-lg"
          />
        )}
        
        {selectedFile.type.startsWith('video/') && previewUrl && (
          <video
            src={previewUrl}
            controls
            className="w-full max-h-64 rounded-lg"
          />
        )}
        
        {!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-gray-500" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    const firstInitial = firstName && firstName.length > 0 ? firstName[0].toUpperCase() : '';
    const lastInitial = lastName && lastName.length > 0 ? lastName[0].toUpperCase() : '';
    return `${firstInitial}${lastInitial}` || 'U';
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-900 shadow-lg border-0 rounded-2xl overflow-hidden mb-6 hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start space-x-4">
            <Avatar className="w-12 h-12 ring-3 ring-blue-100 dark:ring-blue-900 flex-shrink-0 shadow-md">
              <AvatarImage src={undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
                {getInitials(currentUser?.first_name || '', currentUser?.last_name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder={`What's on your mind, ${currentUser?.first_name || 'there'}?`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`min-h-[100px] resize-none border-0 shadow-none focus:ring-0 text-lg placeholder:text-gray-500 dark:placeholder:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 transition-all duration-200 ${
                  isFocused ? 'bg-white dark:bg-gray-700 shadow-md min-h-[120px]' : 'hover:bg-gray-100 dark:hover:bg-gray-750'
                }`}
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          {renderFilePreview()}
          
          {/* Target audience selector */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={targetAudience === 'general' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTargetAudience('general')}
            >
              General
            </Button>
            <Button
              type="button"
              variant={targetAudience === 'groups' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTargetAudience('groups')}
            >
              Groups
            </Button>
          </div>

          {targetAudience === 'groups' && (
            <div className="border rounded-xl p-3 bg-gray-50 dark:bg-gray-800">
              {availableGroups.length === 0 ? (
                <p className="text-sm text-gray-600">You haven't joined any groups yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableGroups.map(g => {
                    const checked = selectedGroupIds.includes(g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedGroupIds(prev => {
                              if (e.target.checked) return [...prev, g.id];
                              return prev.filter(id => id !== g.id);
                            });
                          }}
                        />
                        <span className="text-sm">{g.name}</span>
                        {g.user_role && (
                          <Badge variant="secondary" className="text-xs">{g.user_role}</Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSubmitting}
              />
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl px-4 py-2 font-medium transition-all duration-200"
              >
                <Image className="w-5 h-5 mr-2" />
                Photo
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl px-4 py-2 font-medium transition-all duration-200"
              >
                <Video className="w-5 h-5 mr-2" />
                Video
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl px-4 py-2 font-medium transition-all duration-200"
              >
                <FileText className="w-5 h-5 mr-2" />
                Document
              </Button>
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !selectedFile)}
              className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-6 py-2 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}