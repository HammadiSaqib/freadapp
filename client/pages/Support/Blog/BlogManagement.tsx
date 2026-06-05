import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  FileText,
  Filter,
  Tags,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SupportLayout from '@/components/SupportLayout';
import { toast } from 'sonner';

const BlogManagement = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  useEffect(() => {
    fetchPosts();
  }, [search, statusFilter, pagination.page]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let url = `/api/support/blog/posts?page=${pagination.page}&limit=10`;
      if (search) url += `&search=${search}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;

      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please log in to access blog management');
        navigate('/support/login');
        return;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          toast.error('Unauthorized access. Please log in again.');
          navigate('/support/login');
          return;
        }
        throw new Error('Failed to fetch posts');
      }

      const data = await res.json();
      setPosts(data.posts || []);
      if (data.pagination) {
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch posts', error);
      toast.error('Failed to load blog posts');
      setPosts([]); // Ensure posts is an array on error
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please log in');
        navigate('/support/login');
        return;
      }
      const res = await fetch(`/api/support/blog/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        toast.success('Post deleted successfully');
        fetchPosts();
      } else {
        if (res.status === 401 || res.status === 403) {
          toast.error('Unauthorized access. Please log in again.');
          navigate('/support/login');
          return;
        }
        toast.error('Failed to delete post');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred');
    }
  };

  return (
    <SupportLayout title="Blog Management">
      <div className="space-y-6">
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex w-full md:w-auto gap-4 items-center">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={() => navigate('/support/blog/categories')} className="w-full md:w-auto">
              <Tags className="h-4 w-4 mr-2" /> Categories
            </Button>
            <Button variant="outline" onClick={() => navigate('/support/blog/tags')} className="w-full md:w-auto">
              <Hash className="h-4 w-4 mr-2" /> Tags
            </Button>
            <Button onClick={() => navigate('/support/blog/new')} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Create New Post
            </Button>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    No posts found. Create your first blog post!
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {post.featured_image && (
                          <img src={post.featured_image} alt="" className="w-10 h-10 rounded object-cover" />
                        )}
                        <span className="truncate max-w-xs" title={post.title}>{post.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.author_first_name} {post.author_last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{post.category_name || 'Uncategorized'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          post.status === 'published' ? 'bg-green-100 text-green-800 border-green-200' :
                          post.status === 'draft' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-slate-100 text-slate-800 border-slate-200'
                        }
                      >
                        {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/blog/${post.slug}`} target="_blank">
                            <Eye className="h-4 w-4 text-slate-500" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/support/blog/edit/${post.id}`}>
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="p-4 border-t border-slate-200 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <span className="flex items-center text-sm text-slate-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </SupportLayout>
  );
};

export default BlogManagement;
