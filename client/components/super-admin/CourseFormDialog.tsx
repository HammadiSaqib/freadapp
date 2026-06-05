import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Category {
  id: number;
  name: string;
  description: string;
}

interface FormData {
  title: string;
  description: string;
  category_id: string;
  instructor_name: string;
  duration_hours: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  price_type?: 'free' | 'paid';
  is_featured: boolean;
  is_published: boolean;
  thumbnail_url: string;
  thumbnail_file?: File | null;
  youtube_embed_url?: string;
  video_source_type?: 'embed' | 'upload';
  initial_video_file?: File | null;
  initial_video_title?: string;
  initial_video_description?: string;
  additional_videos?: Array<{ source_type: 'embed' | 'upload'; youtube_url?: string; file?: File | null; title?: string; description?: string; thumbnail_file?: File | null }>;
}

interface CourseFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  isEdit?: boolean;
  formData: FormData;
  categories: Category[];
  handleFormChange: (field: string, value: any) => void;
}

const CourseFormDialog: React.FC<CourseFormDialogProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  title,
  isEdit = false,
  formData,
  categories,
  handleFormChange
}) => {
  // Debug logging
  console.log('CourseFormDialog - categories prop:', categories);
  console.log('CourseFormDialog - categories type:', typeof categories);
  console.log('CourseFormDialog - categories isArray:', Array.isArray(categories));
  console.log('CourseFormDialog - categories length:', categories?.length);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update course information' : 'Create a new course for the school management system'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                placeholder="Enter course title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor Name *</Label>
              <Input
                id="instructor"
                value={formData.instructor_name}
                onChange={(e) => handleFormChange('instructor_name', e.target.value)}
                placeholder="Enter instructor name"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              placeholder="Enter course description"
              rows={3}
              required
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(value) => handleFormChange('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(categories) ? categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select 
                value={formData.difficulty_level} 
                onValueChange={(value) => 
                  handleFormChange('difficulty_level', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_hours}
                onChange={(e) => handleFormChange('duration_hours', parseFloat(e.target.value) || 0)}
                placeholder="Enter duration"
                min="0"
                step="0.5"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_type">Pricing Type</Label>
              <Select 
                value={formData.price_type || 'free'}
                onValueChange={(value) => handleFormChange('price_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => handleFormChange('price', parseFloat(e.target.value) || 0)}
                placeholder="Enter price"
                min="0"
                step="0.01"
                disabled={(formData.price_type || 'free') === 'free'}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail Image</Label>
              <div className="space-y-2">
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleFormChange('thumbnail_file', file);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Upload a thumbnail image (JPG, PNG, GIF - Max 5MB)
                </p>
                {formData.thumbnail_url && (
                  <div className="text-xs text-muted-foreground">
                    Current: {formData.thumbnail_url}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video_source_type">Video Content</Label>
              <Select 
                value={formData.video_source_type || 'embed'}
                onValueChange={(value) => handleFormChange('video_source_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="embed">Embed YouTube</SelectItem>
                  <SelectItem value="upload">Upload File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.video_source_type || 'embed') === 'embed' ? (
              <div className="space-y-2">
                <Label htmlFor="youtube_embed_url">YouTube Embed Link</Label>
                <Input
                  id="youtube_embed_url"
                  value={formData.youtube_embed_url || ''}
                  onChange={(e) => handleFormChange('youtube_embed_url', e.target.value)}
                  placeholder="e.g., https://www.youtube.com/embed/VIDEO_ID"
                />
                {formData.youtube_embed_url ? (
                  <div className="mt-2">
                    <div className="aspect-video w-full">
                      <iframe
                        src={formData.youtube_embed_url}
                        title="YouTube video preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full rounded-md border"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const raw = formData.youtube_embed_url || '';
                          let url = raw;
                          const m = raw.match(/src=\"([^\"]+)\"/i);
                          if (m && m[1]) url = m[1];
                          let id = '';
                          try {
                            const u = new URL(url);
                            const host = u.hostname.replace('www.', '');
                            if (host.includes('youtu.be')) {
                              id = u.pathname.replace('/', '').split('?')[0];
                            } else if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
                              if (u.pathname.includes('/embed/')) id = u.pathname.split('/embed/')[1].split('?')[0];
                              else if (u.pathname.includes('/shorts/')) id = u.pathname.split('/shorts/')[1].split('?')[0];
                              else id = u.searchParams.get('v') || '';
                            }
                          } catch {}
                          if (!id) {
                            const r = url.match(/(?:v=|\/embed\/|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
                            id = r ? r[1] : '';
                          }
                          if (id) {
                            handleFormChange('thumbnail_url', `https://img.youtube.com/vi/${id}/hqdefault.jpg`);
                          }
                        }}
                      >
                        Get Thumbnail from YouTube
                      </Button>
                      {formData.thumbnail_url ? (
                        <img
                          src={formData.thumbnail_url}
                          alt="Thumbnail preview"
                          className="h-16 w-28 rounded border object-cover"
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="initial_video_title">Initial Video Title</Label>
                <Input
                  id="initial_video_title"
                  value={formData.initial_video_title || ''}
                  onChange={(e) => handleFormChange('initial_video_title', e.target.value)}
                  placeholder="Enter video title"
                />
                <Label htmlFor="initial_video_description">Initial Video Description</Label>
                <Textarea
                  id="initial_video_description"
                  value={formData.initial_video_description || ''}
                  onChange={(e) => handleFormChange('initial_video_description', e.target.value)}
                  placeholder="Enter video description (optional)"
                  rows={3}
                />
                <Label htmlFor="initial_video_file">Upload Video File</Label>
                <Input
                  id="initial_video_file"
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleFormChange('initial_video_file', file);
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Additional Videos</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const next = [
                    ...(formData.additional_videos || []),
                    { source_type: 'embed', youtube_url: '', file: null, title: '', description: '', thumbnail_file: null }
                  ];
                  handleFormChange('additional_videos', next);
                }}
              >
                Add Video
              </Button>
            </div>
            {(formData.additional_videos || []).map((v: any, idx: number) => (
              <div key={idx} className="border rounded-md p-3 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={v.source_type || 'embed'}
                      onValueChange={(val) => {
                        const next = [...(formData.additional_videos || [])];
                        next[idx] = { ...next[idx], source_type: val };
                        handleFormChange('additional_videos', next);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="embed">Embed YouTube</SelectItem>
                        <SelectItem value="upload">Upload File</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={v.title || ''}
                      onChange={(e) => {
                        const next = [...(formData.additional_videos || [])];
                        next[idx] = { ...next[idx], title: e.target.value };
                        handleFormChange('additional_videos', next);
                      }}
                      placeholder="Enter title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={v.description || ''}
                      onChange={(e) => {
                        const next = [...(formData.additional_videos || [])];
                        next[idx] = { ...next[idx], description: e.target.value };
                        handleFormChange('additional_videos', next);
                      }}
                      placeholder="Enter description"
                    />
                  </div>
                </div>
                {(v.source_type || 'embed') === 'embed' ? (
                  <div className="space-y-2">
                    <Label>YouTube URL</Label>
                    <Input
                      value={v.youtube_url || ''}
                      onChange={(e) => {
                        const next = [...(formData.additional_videos || [])];
                        next[idx] = { ...next[idx], youtube_url: e.target.value };
                        handleFormChange('additional_videos', next);
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    {v.youtube_url ? (
                      <div className="aspect-video w-full">
                        <iframe
                          src={v.youtube_url.includes('/embed/') ? v.youtube_url : v.youtube_url}
                          title="Preview"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full rounded-md border"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Video File</Label>
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          const next = [...(formData.additional_videos || [])];
                          next[idx] = { ...next[idx], file };
                          handleFormChange('additional_videos', next);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Thumbnail (optional)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          const next = [...(formData.additional_videos || [])];
                          next[idx] = { ...next[idx], thumbnail_file: file };
                          handleFormChange('additional_videos', next);
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      const next = [...(formData.additional_videos || [])];
                      next.splice(idx, 1);
                      handleFormChange('additional_videos', next);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.is_featured}
                onChange={(e) => handleFormChange('is_featured', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="featured">Featured Course</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="published"
                checked={formData.is_published}
                onChange={(e) => handleFormChange('is_published', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="published">Publish Course</Label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            {isEdit ? 'Update Course' : 'Create Course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

CourseFormDialog.displayName = 'CourseFormDialog';

export default CourseFormDialog;