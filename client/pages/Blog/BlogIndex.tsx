import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  User, 
  Tag, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SiteHeader from '@/components/SiteHeader';
import Footer from '@/components/Footer';

const BlogIndex = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [search, activeCategory, pagination.page]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/blog/categories/all');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let url = `/api/blog?page=${pagination.page}&limit=9`;
      if (search) url += `&search=${search}`;
      if (activeCategory) url += `&category=${activeCategory}`;

      const res = await fetch(url);
      const data = await res.json();
      setPosts(data.posts);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error('Failed to fetch posts', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Helmet>
        <title>Blog - Score Machine | Credit Repair Insights & Updates</title>
        <meta name="description" content="Latest news, updates, and expert insights on credit repair, financial freedom, and Score Machine platform features." />
      </Helmet>

      <SiteHeader />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative bg-[#0f182a] py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 pointer-events-none"></div>
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
              Insights & <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Resources</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Discover the latest strategies for credit repair, business growth, and getting the most out of Score Machine.
            </p>
            
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search articles..."
                className="pl-12 py-6 rounded-full bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500 w-full shadow-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Categories & Content */}
        <section className="py-16 container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Sidebar / Categories */}
            <aside className="lg:w-1/4 space-y-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-teal-500" /> Categories
                </h3>
                <div className="flex flex-wrap lg:flex-col gap-2">
                  <Button
                    variant={activeCategory === null ? 'default' : 'outline'}
                    className={`justify-start ${activeCategory === null ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                    onClick={() => setActiveCategory(null)}
                  >
                    All Articles
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={activeCategory === cat.slug ? 'default' : 'outline'}
                      className={`justify-between ${activeCategory === cat.slug ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                      onClick={() => setActiveCategory(cat.slug)}
                    >
                      {cat.name}
                      <Badge variant="secondary" className="text-black ml-2 bg-slate-200 dark:bg-slate-800 text-xs">
                        {cat.post_count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Post Grid */}
            <div className="lg:w-3/4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : posts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {posts.map((post) => (
                      <article 
                        key={post.id} 
                        className="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 flex flex-col h-full"
                      >
                        <Link to={`/blog/${post.slug}`} className="relative block overflow-hidden aspect-video">
                          {post.featured_image ? (
                            <img 
                              src={post.featured_image} 
                              alt={post.title} 
                              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                              <span className="text-slate-400 font-medium">No Image</span>
                            </div>
                          )}
                          {post.category_name && (
                            <span className="absolute top-4 left-4 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                              {post.category_name}
                            </span>
                          )}
                        </Link>
                        
                        <div className="p-6 flex flex-col flex-grow">
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(post.published_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {post.author_first_name} {post.author_last_name}
                            </span>
                          </div>
                          
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-teal-600 transition-colors line-clamp-2">
                            <Link to={`/blog/${post.slug}`}>
                              {post.title}
                            </Link>
                          </h2>
                          
                          <p className="text-slate-600 dark:text-slate-300 mb-6 line-clamp-3 text-sm flex-grow">
                            {post.excerpt}
                          </p>
                          
                          <Link 
                            to={`/blog/${post.slug}`}
                            className="inline-flex items-center text-teal-600 font-semibold text-sm hover:text-teal-700 group-hover:translate-x-1 transition-all"
                          >
                            Read Article <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-2 px-4 text-sm text-slate-600">
                        Page {pagination.page} of {pagination.pages}
                      </div>
                      <Button
                        variant="outline"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <div className="bg-slate-100 dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No articles found</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    We couldn't find any articles matching your search criteria. Try adjusting your filters or search terms.
                  </p>
                  <Button 
                    variant="link" 
                    className="mt-4 text-teal-600"
                    onClick={() => { setSearch(''); setActiveCategory(null); }}
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BlogIndex;
