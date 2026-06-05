import React, { useState, useEffect } from 'react';
import * as helmetPkg from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { 
  Calendar, 
  User, 
  Tag, 
  Clock, 
  ArrowLeft,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Volume2,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SiteHeader from '@/components/SiteHeader';
import Footer from '@/components/Footer';
import { useBlogSsrData } from '@/contexts/BlogSsrContext';

const { Helmet } = helmetPkg as typeof import("react-helmet-async");

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const ssrData = useBlogSsrData();
  const initialNotFound = !!ssrData?.notFound;
  const initialPost = ssrData?.post && ssrData.post.slug === slug ? ssrData.post : null;
  const [post, setPost] = useState<any>(initialPost);
  const [loading, setLoading] = useState(!initialPost && !initialNotFound);
  const [error, setError] = useState(initialNotFound);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/blog/${slug}`);
        if (!res.ok) throw new Error('Post not found');
        const data = await res.json();
        setPost(data);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (slug && !initialPost && !initialNotFound) fetchPost();
  }, [slug]);

  useEffect(() => {
    const fetchRelatedPosts = async () => {
      if (!post?.id) return;
      try {
        const categoryQuery = post.category_slug ? `?category=${post.category_slug}&limit=8` : '?limit=8';
        const categoryRes = await fetch(`/api/blog${categoryQuery}`);
        if (!categoryRes.ok) throw new Error('Failed to load related posts');
        const categoryData = await categoryRes.json();
        const filtered = (categoryData.posts || []).filter((item: any) => item.id !== post.id);
        if (filtered.length >= 4) {
          setRelatedPosts(filtered.slice(0, 4));
          return;
        }

        const fallbackRes = await fetch('/api/blog?limit=12');
        if (!fallbackRes.ok) throw new Error('Failed to load fallback posts');
        const fallbackData = await fallbackRes.json();
        const fallbackFiltered = (fallbackData.posts || []).filter((item: any) => item.id !== post.id);
        const combined = [...filtered, ...fallbackFiltered.filter((item: any) => !filtered.some((p: any) => p.id === item.id))];
        setRelatedPosts(combined.slice(0, 4));
      } catch (err) {
        console.error(err);
        setRelatedPosts([]);
      }
    };

    fetchRelatedPosts();
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
        <SiteHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
        <SiteHeader />
        <div className="flex-grow container mx-auto px-4 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Post Not Found</h1>
          <p className="text-slate-600 mb-8">The article you are looking for does not exist or has been removed.</p>
          <Link to="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const canonicalUrl = ssrData?.url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const normalizeContentHTML = (raw: string) => {
    const hasTags = /<\/?[a-z][\s\S]*>/i.test(raw);
    if (hasTags) return raw;
    const paragraphs = raw
      .split(/\n{2,}/)
      .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
      .join('');
    return paragraphs || '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Helmet>
        <title>{post.seo_title || post.title} | Score Machine Blog</title>
        <meta name="description" content={post.seo_description || post.excerpt} />
        {post.seo_keywords && <meta name="keywords" content={post.seo_keywords} />}
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        
        {/* Open Graph */}
        <meta property="og:title" content={post.seo_title || post.title} />
        <meta property="og:description" content={post.seo_description || post.excerpt} />
        {post.featured_image && <meta property="og:image" content={post.featured_image} />}
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.published_at} />
        {post.author_first_name && <meta property="article:author" content={`${post.author_first_name} ${post.author_last_name}`} />}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.seo_title || post.title} />
        <meta name="twitter:description" content={post.seo_description || post.excerpt} />
        {post.featured_image && <meta name="twitter:image" content={post.featured_image} />}

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.seo_description || post.excerpt,
            image: post.featured_image ? [post.featured_image] : undefined,
            datePublished: post.published_at,
            author: {
              "@type": "Person",
              name: `${post.author_first_name || ""} ${post.author_last_name || ""}`.trim() || "Score Machine"
            },
            mainEntityOfPage: canonicalUrl || undefined
          })}
        </script>
      </Helmet>

      <SiteHeader />

      <main className="flex-grow">
        {/* Article Header */}
        <header className="bg-[#0f182a] py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 to-emerald-900/20 pointer-events-none"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
              <Link to="/blog" className="inline-flex items-center text-teal-400 hover:text-teal-300 mb-8 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Articles
              </Link>
              
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {post.category_name && (
                  <Badge className="bg-teal-600 hover:bg-teal-700 text-white border-0 px-3 py-1">
                    {post.category_name}
                  </Badge>
                )}
                <span className="text-slate-400 text-sm flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(post.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="text-slate-400 text-sm flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {Math.max(1, Math.ceil(post.content.length / 1000))} min read
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-8 leading-tight">
                {post.title}
              </h1>

              <div className="flex items-center gap-4">
                {post.author_avatar ? (
                  <img src={post.author_avatar} alt="Author" className="w-12 h-12 rounded-full border-2 border-slate-700" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                    {post.author_first_name?.[0]}{post.author_last_name?.[0]}
                  </div>
                )}
                <div>
                  <div className="text-white font-medium">{post.author_first_name} {post.author_last_name}</div>
                  <div className="text-slate-400 text-sm">Author</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Article Content */}
        <article className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            
            {/* Featured Image */}
            {post.featured_image && (
              <div className="rounded-2xl overflow-hidden shadow-2xl mb-12 -mt-32 relative z-20 border-4 border-white dark:border-slate-800">
                <img src={post.featured_image} alt={post.title} className="w-full h-auto" />
              </div>
            )}

            {/* Content Body */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 md:p-12 shadow-sm border border-slate-100 dark:border-slate-700">
              
              {/* Voice Player */}
              {post.audio_url && (
                <div className="mb-10 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                   <Button 
                     onClick={() => {
                       const audio = document.getElementById('blog-audio') as HTMLAudioElement;
                       if (audio) {
                         if (audio.paused) {
                           audio.play();
                           setIsPlaying(true);
                         } else {
                           audio.pause();
                           setIsPlaying(false);
                         }
                       }
                     }}
                     className={isPlaying 
                       ? "bg-rose-500 hover:bg-rose-600 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                       : "bg-teal-600 hover:bg-teal-700 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                     }
                   >
                     {isPlaying ? <Pause className="h-6 w-6 mr-3" /> : <Volume2 className="h-6 w-6 mr-3" />}
                     {isPlaying ? 'Pause Text Voice' : 'Play Text Voice'}
                   </Button>
                   <audio 
                     id="blog-audio" 
                     src={post.audio_url} 
                     className="hidden" 
                     onEnded={() => setIsPlaying(false)}
                     onPause={() => setIsPlaying(false)}
                     onPlay={() => setIsPlaying(true)}
                   />
                </div>
              )}

              {/* YouTube Embed */}
              {post.youtube_url && (
                <div className="mb-10 aspect-video rounded-xl overflow-hidden shadow-lg">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={post.youtube_url.replace('watch?v=', 'embed/')} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <div 
                className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-a:text-teal-600 hover:prose-a:text-teal-700 prose-img:rounded-xl whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: normalizeContentHTML(post.content) }}
              />
              
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag: any) => (
                      <Badge key={tag.id} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-1">
                        <Tag className="h-3 w-3" /> {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Share */}
              <div className="mt-12 flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Share2 className="h-5 w-5" /> Share this article
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank')}>
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${shareUrl}&text=${post.title}`, '_blank')}>
                    <Twitter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank')}>
                    <Linkedin className="h-4 w-4" />
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </article>

        {relatedPosts.length > 0 && (
          <section className="container mx-auto px-4 pb-20">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-8">
                More Articles
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedPosts.map((item) => (
                  <article
                    key={item.id}
                    className="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200 dark:border-slate-700 flex flex-col h-full"
                  >
                    <Link to={`/blog/${item.slug}`} className="relative block overflow-hidden aspect-video">
                      {item.featured_image ? (
                        <img
                          src={item.featured_image}
                          alt={item.title}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                          <span className="text-slate-400 font-medium text-xs">No Image</span>
                        </div>
                      )}
                      {item.category_name && (
                        <span className="absolute top-3 left-3 bg-teal-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                          {item.category_name}
                        </span>
                      )}
                    </Link>
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.published_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 group-hover:text-teal-600 transition-colors">
                        <Link to={`/blog/${item.slug}`}>
                          {item.title}
                        </Link>
                      </h3>
                      <Link
                        to={`/blog/${item.slug}`}
                        className="mt-auto inline-flex items-center text-teal-600 font-semibold text-xs hover:text-teal-700 group-hover:translate-x-1 transition-all"
                      >
                        Read More
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
