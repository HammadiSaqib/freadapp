import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SupportLayout from '@/components/SupportLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Loader2, Hash } from 'lucide-react';

const BlogTags = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please log in to access blog tags');
        navigate('/support/login');
        return;
      }
      const res = await fetch('/api/support/blog/tags', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      } else if (res.status === 401 || res.status === 403) {
        toast.error('Unauthorized access. Please log in again.');
        navigate('/support/login');
      } else {
        toast.error('Failed to load tags');
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast.error('Error loading tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please log in');
        navigate('/support/login');
        return;
      }
      const res = await fetch('/api/support/blog/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      if (res.ok) {
        toast.success('Tag created successfully');
        setIsCreateOpen(false);
        setName('');
        fetchTags();
      } else {
        if (res.status === 401 || res.status === 403) {
          toast.error('Unauthorized access. Please log in again.');
          navigate('/support/login');
          return;
        }
        const data = await res.json();
        toast.error(data.error || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all posts.')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in');
        navigate('/support/login');
        return;
      }
      const res = await fetch(`/api/support/blog/tags/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Tag deleted successfully');
        fetchTags();
      } else {
        if (res.status === 401 || res.status === 403) {
          toast.error('Unauthorized access. Please log in again.');
          navigate('/support/login');
          return;
        }
        const data = await res.json();
        toast.error(data.error || 'Failed to delete tag');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred');
    }
  };

  return (
    <SupportLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/support/blog')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Posts
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
              <p className="text-muted-foreground">Manage blog post tags</p>
            </div>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Tag</DialogTitle>
                <DialogDescription>
                  Create a new tag for blog posts.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tips"
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Tag
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Tags</CardTitle>
            <CardDescription>
              List of all available blog tags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : tags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No tags found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        {tag.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {tag.slug}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tag.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SupportLayout>
  );
};

export default BlogTags;
