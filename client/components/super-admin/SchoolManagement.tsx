import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  BookOpen,
  Video,
  FileText,
  Users,
  Star,
  Clock,
  DollarSign,
  Upload,
  Download,
  Play,
  PauseCircle,
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Calendar,
  Settings,
  Image,
  HelpCircle
} from 'lucide-react';
import { schoolManagementApi } from '../../lib/api';
import { useToast } from '../ui/use-toast';
import CourseFormDialog from './CourseFormDialog';

interface Course {
  id: string;
  title: string;
  description: string;
  category_id: string;
  category_name?: string;
  instructor_name: string;
  duration_hours: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  is_featured: boolean;
  is_published: boolean;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  enrollment_count?: number;
  rating?: number;
  modules_count?: number;
  videos_count?: number;
  materials_count?: number;
  quizzes_count?: number;
}

interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  is_published: boolean;
  created_at: string;
}

interface CourseVideo {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_url: string;
  duration_seconds: number;
  order_index: number;
  is_published: boolean;
  created_at: string;
}

interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  featuredCourses: number;
  freeCourses: number;
  averagePrice: number;
  totalEnrollments: number;
  uniqueStudents: number;
  completedEnrollments: number;
  activeEnrollments: number;
  totalRevenue: number;
  averageRating: number;
  totalModules: number;
  totalVideos: number;
  totalMaterials: number;
  totalQuizzes: number;
  totalQuestions: number;
  coursesCreated30d: number;
  coursesCreated7d: number;
  totalInstructors: number;
  avgCoursesPerInstructor: number;
  topCategories: Array<{
    category: string;
    course_count: number;
    published_count: number;
  }>;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

interface QuizQuestion {
  id?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank';
  options?: string[];
  correct_answers: string[];
  explanation?: string;
  points: number;
  order_index: number;
}

interface Quiz {
  id: string;
  title: string;
  course_id: number;
  course_title: string;
  description: string;
  time_limit: number;
  passing_score: number;
  max_attempts: number;
  is_published: boolean;
  questions_count: number;
  attempts_count: number;
  created_at: string;
  questions?: QuizQuestion[];
}

const SchoolManagement: React.FC = () => {
  const { toast } = useToast();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStats>({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    featuredCourses: 0,
    freeCourses: 0,
    averagePrice: 0,
    totalEnrollments: 0,
    uniqueStudents: 0,
    completedEnrollments: 0,
    activeEnrollments: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalModules: 0,
    totalVideos: 0,
    totalMaterials: 0,
    totalQuizzes: 0,
    totalQuestions: 0,
    coursesCreated30d: 0,
    coursesCreated7d: 0,
    totalInstructors: 0,
    avgCoursesPerInstructor: 0,
    topCategories: []
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  // Video management states
  const [videos, setVideos] = useState<CourseVideo[]>([]);
  const [isVideoUploadDialogOpen, setIsVideoUploadDialogOpen] = useState(false);
  const [isVideoEditDialogOpen, setIsVideoEditDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<CourseVideo | null>(null);
  const [videoUploadData, setVideoUploadData] = useState({
    title: '',
    course_id: '',
    module_id: '',
    description: '',
    video_file: null as File | null,
    thumbnail_file: null as File | null
  });
  const [videoEditData, setVideoEditData] = useState({
    title: '',
    description: '',
    is_published: false
  });
  const [videoUploadLoading, setVideoUploadLoading] = useState(false);

  // Document management states
  const [materials, setMaterials] = useState<any[]>([]);
  const [isDocumentUploadDialogOpen, setIsDocumentUploadDialogOpen] = useState(false);
  const [isDocumentEditDialogOpen, setIsDocumentEditDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [documentUploadData, setDocumentUploadData] = useState({
    title: '',
    course_id: '',
    module_id: '',
    description: '',
    file: null as File | null,
    is_downloadable: true
  });
  const [documentEditData, setDocumentEditData] = useState({
    title: '',
    description: '',
    is_downloadable: true
  });
  const [documentUploadLoading, setDocumentUploadLoading] = useState(false);

  // Quiz management states
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isQuizCreateDialogOpen, setIsQuizCreateDialogOpen] = useState(false);
  const [isQuizEditDialogOpen, setIsQuizEditDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [quizFormData, setQuizFormData] = useState({
    title: '',
    course_id: '',
    module_id: '',
    description: '',
    time_limit: 30,
    passing_score: 70,
    max_attempts: 3,
    is_published: false,
    questions: [] as any[]
  });
  const [quizLoading, setQuizLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    instructor_name: '',
    duration_hours: 0,
    difficulty_level: 'beginner' as const,
    price: 0,
    price_type: 'free' as 'free' | 'paid',
    is_featured: false,
    is_published: false,
    thumbnail_url: '',
    thumbnail_file: null as File | null,
    youtube_embed_url: '',
    video_source_type: 'embed' as 'embed' | 'upload',
    initial_video_file: null as File | null,
    initial_video_title: '',
    initial_video_description: '',
    additional_videos: [] as any[]
  });

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [activeTab, setActiveTab] = useState('overview');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Form input handlers to prevent unnecessary re-renders
  const handleFormChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const extractYouTubeId = (raw: string): string => {
    let url = raw;
    if (/\<iframe[\s\S]*?src=\"([^\"]+)\"/i.test(raw)) {
      const m = raw.match(/src=\"([^\"]+)\"/i);
      if (m && m[1]) url = m[1];
    }
    try {
      const u = new URL(url);
      const host = u.hostname.replace('www.', '');
      if (host.includes('youtu.be')) {
        return u.pathname.replace('/', '').split('?')[0];
      }
      if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
        if (u.pathname.includes('/embed/')) {
          return u.pathname.split('/embed/')[1].split('?')[0];
        }
        if (u.pathname.includes('/shorts/')) {
          return u.pathname.split('/shorts/')[1].split('?')[0];
        }
        const v = u.searchParams.get('v');
        if (v) return v;
      }
    } catch {}
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : '';
  };

  const getYouTubeThumbnailUrl = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  };

  // Memoized API functions to prevent unnecessary re-renders
  const fetchCategories = useCallback(async () => {
    try {
      console.log('Fetching categories...');
      const response = await schoolManagementApi.getCategories();
      console.log('Categories API response:', response);
      console.log('Categories response.data:', response.data);
      console.log('Categories response.data.data:', response.data.data);
      console.log('Categories data type:', typeof response.data.data);
      console.log('Categories data isArray:', Array.isArray(response.data.data));
      
      // Fix: Extract categories from the nested data structure
      const categoriesData = response.data.data || [];
      setCategories(categoriesData);
      console.log('Set categories to:', categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {
        search: debouncedSearchTerm,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
        page: currentPage,
        limit: itemsPerPage
      };
      
      const response = await schoolManagementApi.getCourses(params);
      
      // Handle the response structure properly
      if (response.data && response.data.success) {
        const coursesData = response.data.data?.courses || [];
        setCourses(coursesData);
        
        // Set pagination info
        const pagination = response.data.data?.pagination;
        if (pagination) {
          setTotalPages(pagination.pages || 1);
        }
      } else {
        // Fallback for different response structure
        const coursesData = Array.isArray(response.data) ? response.data : 
                           Array.isArray(response.data?.courses) ? response.data.courses : [];
        setCourses(coursesData);
        setTotalPages(Math.ceil((response.total || response.data?.total || 0) / itemsPerPage));
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch courses",
        variant: "destructive",
      });
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, statusFilter, difficultyFilter, currentPage, itemsPerPage, toast]);

  const fetchCourseStats = useCallback(async () => {
    try {
      const response = await schoolManagementApi.getSchoolStatistics();
      if (response.data && response.data.success) {
        const data = response.data.data;
        setCourseStats({
          totalCourses: data.courses?.total_courses || 0,
          publishedCourses: data.courses?.published_courses || 0,
          draftCourses: data.courses?.draft_courses || 0,
          featuredCourses: data.courses?.featured_courses || 0,
          freeCourses: data.courses?.free_courses || 0,
          averagePrice: parseFloat(data.courses?.average_price || 0),
          totalEnrollments: data.enrollments?.total_enrollments || 0,
          uniqueStudents: data.enrollments?.unique_students || 0,
          completedEnrollments: data.enrollments?.completed_enrollments || 0,
          activeEnrollments: data.enrollments?.active_enrollments || 0,
          totalRevenue: 0, // Calculate from course prices and enrollments
          averageRating: 4.5, // This would come from course reviews
          totalModules: data.content?.total_modules || 0,
          totalVideos: data.content?.total_videos || 0,
          totalMaterials: data.content?.total_materials || 0,
          totalQuizzes: data.content?.total_quizzes || 0,
          totalQuestions: data.content?.total_questions || 0,
          coursesCreated30d: data.recent_activity?.courses_created_30d || 0,
          coursesCreated7d: data.recent_activity?.courses_created_7d || 0,
          totalInstructors: data.instructors?.total_instructors || 0,
          avgCoursesPerInstructor: parseFloat(data.instructors?.avg_courses_per_instructor || 0),
          topCategories: data.top_categories || []
        });
      }
    } catch (error) {
      console.error('Error fetching school statistics:', error);
      // Keep default values on error
    }
  }, []);

  const fetchVideos = useCallback(async () => {
    try {
      const response = await schoolManagementApi.getVideos();
      if (response.data && response.data.success) {
        setVideos(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Error",
        description: "Failed to fetch videos",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchMaterials = useCallback(async () => {
    try {
      const response = await schoolManagementApi.getMaterials();
      if (response.data && response.data.success) {
        setMaterials(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        title: "Error",
        description: "Failed to fetch materials",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchQuizzes = useCallback(async () => {
    try {
      // For now, we'll use mock data since the API endpoint might not exist yet
      const mockQuizzes = [
        {
          id: 1,
          title: "Credit Score Basics Quiz",
          course_id: 1,
          course_title: "Funding Fundamentals",
          description: "Test your knowledge of funding score fundamentals",
          questions_count: 5,
          attempts_count: 127,
          is_published: true,
          passing_score: 70,
          time_limit: 30,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          title: "Dispute Letter Writing",
          course_id: 2,
          course_title: "Advanced Dispute Strategies",
          description: "Assessment on dispute letter writing techniques",
          questions_count: 8,
          attempts_count: 89,
          is_published: true,
          passing_score: 75,
          time_limit: 45,
          created_at: new Date().toISOString()
        }
      ];
      setQuizzes(mockQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quizzes",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleVideoUpload = async () => {
    if (!videoUploadData.title || !videoUploadData.course_id || !videoUploadData.video_file) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select a video file",
        variant: "destructive",
      });
      return;
    }

    setVideoUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', videoUploadData.title);
      formData.append('course_id', videoUploadData.course_id);
      if (videoUploadData.module_id) {
        formData.append('module_id', videoUploadData.module_id);
      }
      if (videoUploadData.description) {
        formData.append('description', videoUploadData.description);
      }
      formData.append('video', videoUploadData.video_file);
      if (videoUploadData.thumbnail_file) {
        formData.append('thumbnail', videoUploadData.thumbnail_file);
      }

      // Use the schoolManagementApi which includes authentication headers
      const response = await schoolManagementApi.uploadVideo(formData);
      
      toast({
        title: "Success",
        description: "Video uploaded successfully",
      });
      setIsVideoUploadDialogOpen(false);
      setVideoUploadData({
        title: '',
        course_id: '',
        module_id: '',
        description: '',
        video_file: null,
        thumbnail_file: null
      });
      fetchVideos(); // Refresh video list
      fetchCourseStats(); // Update stats
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setVideoUploadLoading(false);
    }
  };

  const handleVideoEdit = (video: CourseVideo) => {
    setSelectedVideo(video);
    setVideoEditData({
      title: video.title,
      description: video.description,
      is_published: video.is_published
    });
    setIsVideoEditDialogOpen(true);
  };

  const handleVideoUpdate = async () => {
    if (!selectedVideo) return;

    try {
      await schoolManagementApi.updateVideo(selectedVideo.id, videoEditData);
      
      toast({
        title: "Success",
        description: "Video updated successfully",
      });
      setIsVideoEditDialogOpen(false);
      setSelectedVideo(null);
      fetchVideos(); // Refresh video list
    } catch (error) {
      console.error('Error updating video:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to update video",
        variant: "destructive",
      });
    }
  };

  const handleVideoDelete = async (video: CourseVideo) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await schoolManagementApi.deleteVideo(video.id);
      
      toast({
        title: "Success",
        description: "Video deleted successfully",
      });
      fetchVideos(); // Refresh video list
      fetchCourseStats(); // Update stats
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to delete video",
        variant: "destructive",
      });
    }
  };

  // Document management functions
  const handleDocumentUpload = async () => {
    console.log('🔍 DEBUG: Starting document upload process');
    console.log('📋 DEBUG: Document upload data:', documentUploadData);
    
    if (!documentUploadData.title || !documentUploadData.course_id || !documentUploadData.file) {
      console.log('❌ DEBUG: Missing required fields:', {
        title: !!documentUploadData.title,
        course_id: !!documentUploadData.course_id,
        file: !!documentUploadData.file
      });
      toast({
        title: "Error",
        description: "Please fill in all required fields and select a file",
        variant: "destructive",
      });
      return;
    }

    try {
      setDocumentUploadLoading(true);
      
      console.log('📦 DEBUG: Creating FormData with the following data:');
      const formData = new FormData();
      formData.append('title', documentUploadData.title);
      formData.append('course_id', documentUploadData.course_id);
      formData.append('module_id', documentUploadData.module_id || '');
      formData.append('description', documentUploadData.description);
      formData.append('file', documentUploadData.file);
      formData.append('is_downloadable', documentUploadData.is_downloadable.toString());

      // Debug FormData contents
      console.log('📋 DEBUG: FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      console.log('🚀 DEBUG: Calling API with courseId:', documentUploadData.course_id);
      console.log('🚀 DEBUG: API call: schoolManagementApi.uploadMaterial(courseId, formData)');
      
      const response = await schoolManagementApi.uploadMaterial(documentUploadData.course_id, formData);
      console.log('✅ DEBUG: API response:', response);
      
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      
      setIsDocumentUploadDialogOpen(false);
      setDocumentUploadData({
        title: '',
        course_id: '',
        module_id: '',
        description: '',
        file: null,
        is_downloadable: true
      });
      fetchMaterials(); // Refresh materials list
      fetchCourseStats(); // Update stats
    } catch (error) {
      console.error('❌ DEBUG: Error uploading document:', error);
      console.error('❌ DEBUG: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setDocumentUploadLoading(false);
    }
  };

  const handleDocumentEdit = (document: any) => {
    setSelectedDocument(document);
    setDocumentEditData({
      title: document.title,
      description: document.description || '',
      is_downloadable: document.is_downloadable
    });
    setIsDocumentEditDialogOpen(true);
  };

  const handleDocumentUpdate = async () => {
    if (!selectedDocument || !documentEditData.title) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await schoolManagementApi.updateMaterial(selectedDocument.id, documentEditData);
      
      toast({
        title: "Success",
        description: "Document updated successfully",
      });
      
      setIsDocumentEditDialogOpen(false);
      setSelectedDocument(null);
      fetchMaterials(); // Refresh materials list
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to update document",
        variant: "destructive",
      });
    }
  };

  const handleDocumentDelete = async (document: any) => {
    if (!confirm(`Are you sure you want to delete "${document.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await schoolManagementApi.deleteMaterial(document.id);
      
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      fetchMaterials(); // Refresh materials list
      fetchCourseStats(); // Update stats
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  // Fetch categories only once on component mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Fetch courses, stats, and videos when filters change
  useEffect(() => {
    fetchCourses();
    fetchCourseStats();
    fetchVideos();
    fetchMaterials();
    fetchQuizzes();
  }, [fetchCourses, fetchCourseStats, fetchVideos, fetchMaterials, fetchQuizzes]);

  // Debug: Log courses state changes
  useEffect(() => {
    console.log('🔄 Courses state changed:', courses);
    console.log('🔄 Courses length:', courses.length);
    console.log('🔄 Courses array check:', Array.isArray(courses));
  }, [courses]);

  // Course CRUD Operations
  const handleCreateCourse = async () => {
    try {
      setLoading(true);
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Add all form fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      {
        const categoryValue = String((formData as any).category_id || '').trim();
        const defaultCategoryId = Array.isArray(categories)
          ? (categories.find((c: any) => (c.name || '').toLowerCase() === 'general')?.id?.toString()
              || categories[0]?.id?.toString()
              || '1')
          : '1';
        const finalCategory = categoryValue.length ? categoryValue : defaultCategoryId;
        formDataToSend.append('category', finalCategory);
      }
      formDataToSend.append('instructor_name', formData.instructor_name);
      {
        const priceValue = (formData.price_type === 'free') ? 0 : (parseFloat(formData.price as any) || 0);
        formDataToSend.append('price', priceValue.toString());
      }
      formDataToSend.append('duration_hours', (parseFloat(formData.duration_hours) || 0).toString());
      formDataToSend.append('difficulty_level', formData.difficulty_level);
      formDataToSend.append('is_featured', String(formData.is_featured));
      formDataToSend.append('is_published', String(formData.is_published));
      if ((formData as any).youtube_embed_url) {
        formDataToSend.append('youtube_embed_url', (formData as any).youtube_embed_url);
      }
      
      // Add thumbnail file if selected
      if (formData.thumbnail_file) {
        formDataToSend.append('thumbnail', formData.thumbnail_file);
      } else if (formData.thumbnail_url) {
        formDataToSend.append('thumbnail_url', formData.thumbnail_url);
      } else if ((formData.video_source_type === 'embed') && formData.youtube_embed_url) {
        const vidAuto = extractYouTubeId(formData.youtube_embed_url);
        if (vidAuto) {
          formDataToSend.append('thumbnail_url', getYouTubeThumbnailUrl(vidAuto));
        }
      }
      
      const response = await schoolManagementApi.createCourse(formDataToSend);
      const createdCourse = response?.data?.data || {};
      const courseId = String(createdCourse.id || createdCourse.course_id || '');

      if (courseId) {
        if ((formData.video_source_type === 'embed') && (formData.youtube_embed_url)) {
          const vid = extractYouTubeId(formData.youtube_embed_url);
          const thumb = vid ? getYouTubeThumbnailUrl(vid) : undefined;
          const videoPayload: any = {
            course_id: parseInt(courseId),
            title: formData.initial_video_title || formData.title,
            description: formData.initial_video_description || '',
            video_url: formData.youtube_embed_url,
            video_type: 'youtube'
          };
          if (vid) videoPayload.video_id = vid;
          if (thumb) videoPayload.thumbnail_url = thumb;
          try {
            await schoolManagementApi.createCourseVideo(courseId, videoPayload);
          } catch {}
        } else if ((formData.video_source_type === 'upload') && formData.initial_video_file) {
          const videoForm = new FormData();
          videoForm.append('course_id', courseId);
          videoForm.append('title', formData.initial_video_title || formData.title);
          if (formData.initial_video_description) {
            videoForm.append('description', formData.initial_video_description);
          }
          videoForm.append('video', formData.initial_video_file);
          if (formData.thumbnail_file) {
            videoForm.append('thumbnail', formData.thumbnail_file);
          }
          try {
            await schoolManagementApi.uploadVideo(videoForm);
          } catch {}
        }
        const baseIndex = 1;
        const extras = Array.isArray(formData.additional_videos) ? formData.additional_videos : [];
        for (let i = 0; i < extras.length; i++) {
          const item = extras[i] || {};
          if (item.source_type === 'embed' && item.youtube_url) {
            const vid = extractYouTubeId(item.youtube_url);
            const thumb = vid ? getYouTubeThumbnailUrl(vid) : undefined;
            const payload: any = {
              course_id: parseInt(courseId),
              title: item.title || formData.title,
              description: item.description || '',
              video_url: item.youtube_url,
              video_type: 'youtube',
              order_index: baseIndex + i
            };
            if (vid) payload.video_id = vid;
            if (thumb) payload.thumbnail_url = thumb;
            try {
              await schoolManagementApi.createCourseVideo(courseId, payload);
            } catch {}
          } else if (item.source_type === 'upload' && item.file) {
            const f = new FormData();
            f.append('course_id', courseId);
            f.append('title', item.title || formData.title);
            if (item.description) f.append('description', item.description);
            f.append('video', item.file);
            if (item.thumbnail_file) f.append('thumbnail', item.thumbnail_file);
            f.append('order_index', String(baseIndex + i));
            try {
              await schoolManagementApi.uploadVideo(f);
            } catch {}
          }
        }
      }
      
      toast({
        title: "Success",
        description: "Course created successfully!",
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
      fetchCourses();
      fetchCourseStats();
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = async () => {
    try {
      if (!selectedCourse) return;
      
      setLoading(true);
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Add all form fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category_id', formData.category_id);
      formDataToSend.append('instructor_name', formData.instructor_name);
      {
        const priceValue = (formData.price_type === 'free') ? 0 : (parseFloat(formData.price as any) || 0);
        formDataToSend.append('price', priceValue.toString());
      }
      formDataToSend.append('duration_hours', (parseFloat(formData.duration_hours) || 0).toString());
      formDataToSend.append('difficulty_level', formData.difficulty_level);
      formDataToSend.append('is_featured', String(formData.is_featured));
      formDataToSend.append('is_published', String(formData.is_published));
      if ((formData as any).youtube_embed_url) {
        formDataToSend.append('youtube_embed_url', (formData as any).youtube_embed_url);
      }
      
      // Add thumbnail file if selected
      if (formData.thumbnail_file) {
        formDataToSend.append('thumbnail', formData.thumbnail_file);
      } else if (formData.thumbnail_url) {
        formDataToSend.append('thumbnail_url', formData.thumbnail_url);
      } else if ((formData.video_source_type === 'embed') && formData.youtube_embed_url) {
        const vidAuto = extractYouTubeId(formData.youtube_embed_url);
        if (vidAuto) {
          formDataToSend.append('thumbnail_url', getYouTubeThumbnailUrl(vidAuto));
        }
      }
      
      const updateResponse = await schoolManagementApi.updateCourse(selectedCourse.id, formDataToSend);
      if (selectedCourse?.id) {
        const courseId = String(selectedCourse.id);
        if ((formData.video_source_type === 'embed') && (formData.youtube_embed_url)) {
          const vid = extractYouTubeId(formData.youtube_embed_url);
          const thumb = vid ? getYouTubeThumbnailUrl(vid) : undefined;
          const videoPayload: any = {
            course_id: parseInt(courseId),
            title: formData.initial_video_title || formData.title,
            description: formData.initial_video_description || '',
            video_url: formData.youtube_embed_url,
            video_type: 'youtube'
          };
          if (vid) videoPayload.video_id = vid;
          if (thumb) videoPayload.thumbnail_url = thumb;
          try {
            await schoolManagementApi.createCourseVideo(courseId, videoPayload);
          } catch {}
        } else if ((formData.video_source_type === 'upload') && formData.initial_video_file) {
          const videoForm = new FormData();
          videoForm.append('course_id', courseId);
          videoForm.append('title', formData.initial_video_title || formData.title);
          if (formData.initial_video_description) {
            videoForm.append('description', formData.initial_video_description);
          }
          videoForm.append('video', formData.initial_video_file);
          if (formData.thumbnail_file) {
            videoForm.append('thumbnail', formData.thumbnail_file);
          }
          try {
            await schoolManagementApi.uploadVideo(videoForm);
          } catch {}
        }
        const baseIndex = 1;
        const extras = Array.isArray(formData.additional_videos) ? formData.additional_videos : [];
        for (let i = 0; i < extras.length; i++) {
          const item = extras[i] || {};
          if (item.source_type === 'embed' && item.youtube_url) {
            const vid = extractYouTubeId(item.youtube_url);
            const thumb = vid ? getYouTubeThumbnailUrl(vid) : undefined;
            const payload: any = {
              course_id: parseInt(courseId),
              title: item.title || formData.title,
              description: item.description || '',
              video_url: item.youtube_url,
              video_type: 'youtube',
              order_index: baseIndex + i
            };
            if (vid) payload.video_id = vid;
            if (thumb) payload.thumbnail_url = thumb;
            try {
              await schoolManagementApi.createCourseVideo(courseId, payload);
            } catch {}
          } else if (item.source_type === 'upload' && item.file) {
            const f = new FormData();
            f.append('course_id', courseId);
            f.append('title', item.title || formData.title);
            if (item.description) f.append('description', item.description);
            f.append('video', item.file);
            if (item.thumbnail_file) f.append('thumbnail', item.thumbnail_file);
            f.append('order_index', String(baseIndex + i));
            try {
              await schoolManagementApi.uploadVideo(f);
            } catch {}
          }
        }
      }
      
      toast({
        title: "Success",
        description: "Course updated successfully!",
      });
      
      setIsEditDialogOpen(false);
      setSelectedCourse(null);
      resetForm();
      fetchCourses();
      fetchCourseStats();
    } catch (error) {
      console.error('Error updating course:', error);
      toast({
        title: "Error",
        description: "Failed to update course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      setLoading(true);
      await schoolManagementApi.deleteCourse(courseId);
      
      toast({
        title: "Success",
        description: "Course deleted successfully!",
      });
      
      fetchCourses();
      fetchCourseStats();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!validateCategoryForm(newCategoryName, newCategoryDescription)) return;

    try {
      setLoading(true);
      await schoolManagementApi.createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim()
      });
      
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      
      setIsCategoryDialogOpen(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
      fetchCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      
      let errorMessage = "Failed to create category";
      
      if (error?.response?.status === 409) {
        errorMessage = `Category "${newCategoryName.trim()}" already exists. Please choose a different name.`;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory || !validateCategoryForm(newCategoryName, newCategoryDescription)) return;

    try {
      setLoading(true);
      await schoolManagementApi.updateCategory(selectedCategory.id, {
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim()
      });
      
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      
      setIsEditCategoryDialogOpen(false);
      setSelectedCategory(null);
      setNewCategoryName('');
      setNewCategoryDescription('');
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await schoolManagementApi.deleteCategory(categoryId);
      
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || '');
    setIsEditCategoryDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: '',
      instructor_name: '',
      duration_hours: 0,
      difficulty_level: 'beginner',
      price: 0,
      price_type: 'free',
      is_featured: false,
      is_published: false,
      thumbnail_url: '',
      thumbnail_file: null,
      youtube_embed_url: '',
      video_source_type: 'embed',
      initial_video_file: null,
      initial_video_title: '',
      initial_video_description: '',
      additional_videos: []
    });
    setSelectedCourse(null);
  };

  const openEditDialog = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      category_id: course.category_id,
      instructor_name: course.instructor_name,
      duration_hours: course.duration_hours,
      difficulty_level: course.difficulty_level,
      price: course.price,
      price_type: (course.price && course.price > 0) ? 'paid' : 'free',
      is_featured: course.is_featured,
      is_published: course.is_published,
      thumbnail_url: course.thumbnail_url || '',
      thumbnail_file: null,
      youtube_embed_url: '',
      video_source_type: 'embed',
      initial_video_file: null,
      initial_video_title: '',
      initial_video_description: '',
      additional_videos: []
    });
    setIsEditDialogOpen(true);
  };

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (isPublished: boolean) => {
    return isPublished 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  // Enhanced form validation for courses
  const validateCourseForm = () => {
    const errors: string[] = [];
    
    if (!formData.title.trim()) errors.push('Course title is required');
    if (!formData.instructor_name.trim()) errors.push('Instructor name is required');
    if (!formData.description.trim()) errors.push('Course description is required');
    // Optional: category, difficulty, and duration are not required
    if (formData.price < 0) errors.push('Price cannot be negative');
    
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(', '),
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  // Enhanced form validation for categories
  const validateCategoryForm = (name: string, description: string) => {
    const errors: string[] = [];
    
    if (!name.trim()) errors.push('Category name is required');
    if (name.trim().length < 2) errors.push('Category name must be at least 2 characters');
    // Description is optional, but if provided, it should be at least 3 characters
    if (description.trim() && description.trim().length < 3) {
      errors.push('Category description must be at least 3 characters if provided');
    }
    
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(', '),
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue" }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <p className="text-xs text-muted-foreground mt-1">{trend}</p>
            )}
          </div>
          <Icon className={`h-8 w-8 text-${color}-600`} />
        </div>
      </CardContent>
    </Card>
  );



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">School Management</h1>
          <p className="text-muted-foreground">
            Manage courses, videos, quizzes, and educational content
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="videos">Video Management</TabsTrigger>
          <TabsTrigger value="quizzes">Quiz System</TabsTrigger>
          <TabsTrigger value="materials">Documents</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Courses"
              value={courseStats.totalCourses}
              icon={BookOpen}
              trend={`+${courseStats.coursesCreated30d} this month`}
              color="blue"
            />
            <StatCard
              title="Total Enrollments"
              value={courseStats.totalEnrollments.toLocaleString()}
              icon={Users}
              trend={`${courseStats.uniqueStudents} unique students`}
              color="green"
            />
            <StatCard
              title="Average Price"
              value={`$${courseStats.averagePrice.toFixed(2)}`}
              icon={DollarSign}
              trend={`${courseStats.freeCourses} free courses`}
              color="yellow"
            />
            <StatCard
              title="Average Rating"
              value={courseStats.averageRating.toFixed(1)}
              icon={Star}
              trend="4.7/5.0 stars"
              color="purple"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Published</p>
                    <p className="text-2xl font-bold">{courseStats.publishedCourses}</p>
                    <p className="text-xs text-muted-foreground">{courseStats.featuredCourses} featured</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Draft</p>
                    <p className="text-2xl font-bold">{courseStats.draftCourses}</p>
                    <p className="text-xs text-muted-foreground">In development</p>
                  </div>
                  <PauseCircle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Videos</p>
                    <p className="text-2xl font-bold">{courseStats.totalVideos}</p>
                    <p className="text-xs text-muted-foreground">{courseStats.totalModules} modules</p>
                  </div>
                  <Video className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Quizzes</p>
                    <p className="text-2xl font-bold">{courseStats.totalQuizzes}</p>
                    <p className="text-xs text-muted-foreground">{courseStats.totalQuestions} questions</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                    <p className="text-2xl font-bold">{courseStats.activeEnrollments}</p>
                    <p className="text-xs text-muted-foreground">{courseStats.completedEnrollments} completed</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Materials</p>
                    <p className="text-2xl font-bold">{courseStats.totalMaterials}</p>
                    <p className="text-xs text-muted-foreground">Documents & resources</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Instructors</p>
                    <p className="text-2xl font-bold">{courseStats.totalInstructors}</p>
                    <p className="text-xs text-muted-foreground">{courseStats.avgCoursesPerInstructor} avg courses</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
                    <p className="text-2xl font-bold">{courseStats.coursesCreated7d}</p>
                    <p className="text-xs text-muted-foreground">Courses this week</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Categories */}
          {courseStats.topCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>Most popular course categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courseStats.topCategories.slice(0, 5).map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{category.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.published_count} published of {category.course_count} total
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{category.course_count}</p>
                        <p className="text-sm text-muted-foreground">courses</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseStats.coursesCreated7d > 0 && (
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{courseStats.coursesCreated7d} new courses created this week</p>
                      <p className="text-xs text-muted-foreground">Last 7 days</p>
                    </div>
                  </div>
                )}
                {courseStats.coursesCreated30d > 0 && (
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{courseStats.coursesCreated30d} courses created this month</p>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </div>
                  </div>
                )}
                {courseStats.totalVideos > 0 && (
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{courseStats.totalVideos} videos available across all courses</p>
                      <p className="text-xs text-muted-foreground">Content library</p>
                    </div>
                  </div>
                )}
                {courseStats.totalQuestions > 0 && (
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{courseStats.totalQuestions} quiz questions created</p>
                      <p className="text-xs text-muted-foreground">Assessment content</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Array.isArray(categories) ? categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Courses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Courses ({courses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrollments</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Loading courses...
                      </TableCell>
                    </TableRow>
                  ) : courses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        No courses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium">{course.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {course.duration_hours}h • {course.modules_count} modules
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{course.category_name}</Badge>
                        </TableCell>
                        <TableCell>{course.instructor_name}</TableCell>
                        <TableCell>
                          <Badge className={getDifficultyBadgeColor(course.difficulty_level)}>
                            {course.difficulty_level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(course.is_published)}>
                            {course.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell>{course.enrollment_count}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span>{course.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell>${course.price}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCourse(course);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(course)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCourse(course.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Course Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Funding Fundamentals</span>
                    <span className="text-sm text-muted-foreground">245 enrollments</span>
                  </div>
                  <Progress value={85} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Advanced Dispute Strategies</span>
                    <span className="text-sm text-muted-foreground">156 enrollments</span>
                  </div>
                  <Progress value={65} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Legal Knowledge Basics</span>
                    <span className="text-sm text-muted-foreground">98 enrollments</span>
                  </div>
                  <Progress value={40} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">This Month</span>
                    <span className="text-sm font-bold">$4,250</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Month</span>
                    <span className="text-sm text-muted-foreground">$3,890</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Growth</span>
                    <span className="text-sm text-green-600">+9.3%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Video Management Tab */}
        <TabsContent value="videos" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Video Management</h2>
              <p className="text-muted-foreground">Upload and manage course videos</p>
            </div>
            <Button onClick={() => setIsVideoUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Video
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Course Videos</CardTitle>
              <CardDescription>Manage videos for all courses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Video Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Video className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Upload Course Videos</h3>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop video files here, or click to browse
                  </p>
                  <Button variant="outline" onClick={() => setIsVideoUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose Videos
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported formats: MP4, AVI, MOV (Max 500MB per file)
                  </p>
                </div>

                {/* Video List */}
                <div className="space-y-2">
                  <h4 className="font-medium">Recent Videos</h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {videos.length > 0 ? (
                      videos.map((video) => (
                        <Card key={video.id}>
                          <CardContent className="p-4">
                            <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                              {video.thumbnail_url ? (
                                <img 
                                  src={video.thumbnail_url} 
                                  alt={video.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Video className="h-8 w-8 text-gray-400" />
                              )}
                            </div>
                            <h5 className="font-medium mb-1">{video.title}</h5>
                            <p className="text-sm text-muted-foreground mb-2">
                              Course: {courses.find(c => c.id === video.course_id)?.title || 'Unknown'}
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">
                                {video.duration || 'N/A'}
                              </span>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => handleVideoEdit(video)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleVideoDelete(video)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-8">
                        <Video className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-muted-foreground">No videos uploaded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz System Tab */}
        <TabsContent value="quizzes" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Quiz System</h2>
              <p className="text-muted-foreground">Create and manage course quizzes</p>
            </div>
            <Button onClick={() => setIsQuizCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Quiz
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Course Quizzes</CardTitle>
              <CardDescription>Manage quizzes and assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quiz Creation Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Quiz Creator</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quiz Title</Label>
                        <Input 
                          placeholder="Enter quiz title"
                          value={quizFormData.title}
                          onChange={(e) => setQuizFormData(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Course</Label>
                        <Select 
                          value={quizFormData.course_id} 
                          onValueChange={(value) => setQuizFormData(prev => ({ ...prev, course_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map((course) => (
                              <SelectItem key={course.id} value={course.id.toString()}>
                                {course.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Time Limit (minutes)</Label>
                        <Input 
                          type="number"
                          placeholder="30"
                          value={quizFormData.time_limit}
                          onChange={(e) => setQuizFormData(prev => ({ ...prev, time_limit: parseInt(e.target.value) || 30 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Passing Score (%)</Label>
                        <Input 
                          type="number"
                          placeholder="70"
                          value={quizFormData.passing_score}
                          onChange={(e) => setQuizFormData(prev => ({ ...prev, passing_score: parseInt(e.target.value) || 70 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Attempts</Label>
                        <Input 
                          type="number"
                          placeholder="3"
                          value={quizFormData.max_attempts}
                          onChange={(e) => setQuizFormData(prev => ({ ...prev, max_attempts: parseInt(e.target.value) || 3 }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea 
                        placeholder="Quiz description" 
                        rows={2}
                        value={quizFormData.description}
                        onChange={(e) => setQuizFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <Button onClick={() => setIsQuizCreateDialogOpen(true)}>Create Quiz</Button>
                  </CardContent>
                </Card>

                {/* Quiz List */}
                <div className="space-y-2">
                  <h4 className="font-medium">Existing Quizzes ({quizzes.length})</h4>
                  <div className="space-y-2">
                    {quizzes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <HelpCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No quizzes created yet</p>
                        <p className="text-sm">Create your first quiz to get started</p>
                      </div>
                    ) : (
                      quizzes.map((quiz) => (
                        <Card key={quiz.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium">{quiz.title}</h5>
                                <p className="text-sm text-muted-foreground">Course: {quiz.course_title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{quiz.description}</p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {quiz.questions_count} Questions
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    quiz.is_published 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {quiz.is_published ? 'Active' : 'Draft'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {quiz.attempts_count} attempts
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {quiz.time_limit}min • {quiz.passing_score}% to pass
                                  </span>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setSelectedQuiz(quiz);
                                  // Add view quiz logic here
                                }}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setSelectedQuiz(quiz);
                                  setQuizFormData({
                                    title: quiz.title,
                                    course_id: quiz.course_id.toString(),
                                    module_id: '',
                                    description: quiz.description,
                                    time_limit: quiz.time_limit,
                                    passing_score: quiz.passing_score,
                                    max_attempts: quiz.max_attempts || 3,
                                    is_published: quiz.is_published,
                                    questions: (quiz as any).questions || []
                                  });
                                  setIsQuizEditDialogOpen(true);
                                }}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => {
                                  // Add delete quiz logic here
                                  if (confirm('Are you sure you want to delete this quiz?')) {
                                    setQuizzes(prev => prev.filter(q => q.id !== quiz.id));
                                    toast({
                                      title: "Success",
                                      description: "Quiz deleted successfully",
                                    });
                                  }
                                }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents/Materials Tab */}
        <TabsContent value="materials" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Document Management</h2>
              <p className="text-muted-foreground">Upload and manage course materials</p>
            </div>
            <Button onClick={() => setIsDocumentUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Course Materials</CardTitle>
              <CardDescription>Manage PDFs, images, and other course resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Document Upload Area */}
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length > 0) {
                      const file = files[0];
                      setDocumentUploadData(prev => ({ ...prev, file }));
                      setIsDocumentUploadDialogOpen(true);
                    }
                  }}
                  onClick={() => setIsDocumentUploadDialogOpen(true)}
                >
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Upload Course Materials</h3>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop documents here, or click to browse
                  </p>
                  <Button variant="outline" onClick={(e) => {
                    e.stopPropagation();
                    setIsDocumentUploadDialogOpen(true);
                  }}>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose Files
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 50MB per file)
                  </p>
                </div>

                {/* Document List */}
                <div className="space-y-2">
                  <h4 className="font-medium">Course Materials</h4>
                  <div className="space-y-2">
                    {materials.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No materials uploaded yet</p>
                        <p className="text-sm">Upload your first document to get started</p>
                      </div>
                    ) : (
                      materials.map((material) => (
                        <Card key={material.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  material.file_type?.includes('pdf') ? 'bg-red-100' :
                                  material.file_type?.includes('image') ? 'bg-blue-100' :
                                  'bg-green-100'
                                }`}>
                                  {material.file_type?.includes('pdf') ? (
                                    <FileText className="h-5 w-5 text-red-600" />
                                  ) : material.file_type?.includes('image') ? (
                                    <Image className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-green-600" />
                                  )}
                                </div>
                                <div>
                                  <h5 className="font-medium">{material.title}</h5>
                                  <p className="text-sm text-muted-foreground">
                                    Course: {material.course_title || 'Unknown'} • 
                                    {material.file_name} • 
                                    {material.is_downloadable ? 'Downloadable' : 'View Only'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => window.open(material.file_url, '_blank')}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                                {material.is_downloadable && (
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = material.file_url;
                                    link.download = material.file_name;
                                    link.click();
                                  }}>
                                    <Download className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleDocumentEdit(material)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDocumentDelete(material)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {/* Analytics Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {courseStats.totalEnrollments > 0 
                        ? Math.round((courseStats.completedEnrollments / courseStats.totalEnrollments) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {courseStats.completedEnrollments} of {courseStats.totalEnrollments}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg. Course Rating</p>
                    <p className="text-2xl font-bold">{courseStats.averageRating.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Out of 5.0 stars</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Content Engagement</p>
                    <p className="text-2xl font-bold">
                      {courseStats.totalVideos > 0 
                        ? Math.round((courseStats.totalQuizzes / courseStats.totalVideos) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Quiz to video ratio</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Revenue per Course</p>
                    <p className="text-2xl font-bold">
                      ${courseStats.totalCourses > 0 
                        ? (courseStats.averagePrice).toFixed(0)
                        : '0'}
                    </p>
                    <p className="text-xs text-muted-foreground">Average price</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Course Distribution</CardTitle>
                <CardDescription>Breakdown of course status and types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium">Published Courses</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{courseStats.publishedCourses}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({courseStats.totalCourses > 0 
                          ? Math.round((courseStats.publishedCourses / courseStats.totalCourses) * 100)
                          : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium">Draft Courses</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{courseStats.draftCourses}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({courseStats.totalCourses > 0 
                          ? Math.round((courseStats.draftCourses / courseStats.totalCourses) * 100)
                          : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">Featured Courses</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{courseStats.featuredCourses}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({courseStats.publishedCourses > 0 
                          ? Math.round((courseStats.featuredCourses / courseStats.publishedCourses) * 100)
                          : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm font-medium">Free Courses</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{courseStats.freeCourses}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({courseStats.totalCourses > 0 
                          ? Math.round((courseStats.freeCourses / courseStats.totalCourses) * 100)
                          : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Engagement</CardTitle>
                <CardDescription>Enrollment and completion metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Students</span>
                    <span className="font-bold">{courseStats.uniqueStudents.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Enrollments</span>
                    <span className="font-bold text-green-600">{courseStats.activeEnrollments.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completed Enrollments</span>
                    <span className="font-bold text-blue-600">{courseStats.completedEnrollments.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="font-bold">
                      {courseStats.totalEnrollments > 0 
                        ? Math.round((courseStats.completedEnrollments / courseStats.totalEnrollments) * 100)
                        : 0}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avg. Enrollments per Course</span>
                    <span className="font-bold">
                      {courseStats.publishedCourses > 0 
                        ? Math.round(courseStats.totalEnrollments / courseStats.publishedCourses)
                        : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Analytics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Content Overview</CardTitle>
                <CardDescription>Total content across all courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Video className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Videos</span>
                    </div>
                    <span className="font-bold">{courseStats.totalVideos}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Materials</span>
                    </div>
                    <span className="font-bold">{courseStats.totalMaterials}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Modules</span>
                    </div>
                    <span className="font-bold">{courseStats.totalModules}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <HelpCircle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Quiz Questions</span>
                    </div>
                    <span className="font-bold">{courseStats.totalQuestions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instructor Metrics</CardTitle>
                <CardDescription>Teaching staff performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Instructors</span>
                    <span className="font-bold">{courseStats.totalInstructors}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg. Courses per Instructor</span>
                    <span className="font-bold">{courseStats.avgCoursesPerInstructor}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Course Load Distribution</span>
                    <span className="text-sm text-muted-foreground">
                      {courseStats.totalInstructors > 0 ? 'Balanced' : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Metrics</CardTitle>
                <CardDescription>Recent activity and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Courses This Week</span>
                    <span className="font-bold text-green-600">+{courseStats.coursesCreated7d}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Courses This Month</span>
                    <span className="font-bold text-blue-600">+{courseStats.coursesCreated30d}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Growth Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {courseStats.coursesCreated30d > 0 ? 'Growing' : 'Stable'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Categories */}
          {courseStats.topCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Most popular and active course categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courseStats.topCategories.slice(0, 8).map((category, index) => {
                    const publishedRate = category.course_count > 0 
                      ? Math.round((category.published_count / category.course_count) * 100)
                      : 0;
                    
                    return (
                      <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{category.category}</p>
                            <p className="text-sm text-muted-foreground">
                              {category.published_count} published • {publishedRate}% completion rate
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{category.course_count}</p>
                          <p className="text-sm text-muted-foreground">total courses</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>Key insights and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium text-green-600">Strengths</h4>
                  <ul className="space-y-2 text-sm">
                    {courseStats.averageRating >= 4.0 && (
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>High course ratings ({courseStats.averageRating.toFixed(1)}/5.0)</span>
                      </li>
                    )}
                    {courseStats.publishedCourses > courseStats.draftCourses && (
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>More published than draft courses</span>
                      </li>
                    )}
                    {courseStats.totalEnrollments > 0 && (
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Active student enrollment</span>
                      </li>
                    )}
                    {courseStats.coursesCreated7d > 0 && (
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Recent content creation activity</span>
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-orange-600">Opportunities</h4>
                  <ul className="space-y-2 text-sm">
                    {courseStats.draftCourses > 0 && (
                      <li className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span>{courseStats.draftCourses} courses ready to publish</span>
                      </li>
                    )}
                    {courseStats.totalEnrollments > 0 && courseStats.completedEnrollments / courseStats.totalEnrollments < 0.7 && (
                      <li className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span>Improve course completion rates</span>
                      </li>
                    )}
                    {courseStats.totalQuizzes === 0 && (
                      <li className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span>Add quizzes to increase engagement</span>
                      </li>
                    )}
                    {courseStats.featuredCourses === 0 && courseStats.publishedCourses > 0 && (
                      <li className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span>Feature top-performing courses</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Categories</CardTitle>
              <CardDescription>
                Manage course categories and organize your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(categories) ? categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{category.name}</h4>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditCategoryDialog(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )) : null}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsCategoryDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CourseFormDialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          resetForm();
        }}
        onSubmit={handleCreateCourse}
        title="Create New Course"
        formData={formData}
        categories={categories}
        handleFormChange={handleFormChange}
      />

      <CourseFormDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          resetForm();
        }}
        onSubmit={handleEditCourse}
        title="Edit Course"
        isEdit={true}
        formData={formData}
        categories={categories}
        handleFormChange={handleFormChange}
      />

      {/* View Course Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Course Details</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedCourse.title}</h3>
                  <p className="text-muted-foreground">{selectedCourse.description}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Instructor:</span>
                    <span>{selectedCourse.instructor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Duration:</span>
                    <span>{selectedCourse.duration_hours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Price:</span>
                    <span>${selectedCourse.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Enrollments:</span>
                    <span>{selectedCourse.enrollment_count}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">{selectedCourse.modules_count}</p>
                    <p className="text-sm text-muted-foreground">Modules</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Video className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold">{selectedCourse.videos_count}</p>
                    <p className="text-sm text-muted-foreground">Videos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold">{selectedCourse.materials_count}</p>
                    <p className="text-sm text-muted-foreground">Materials</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <p className="text-2xl font-bold">{selectedCourse.quizzes_count}</p>
                    <p className="text-sm text-muted-foreground">Quizzes</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize your courses
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Enter category description (optional)"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} disabled={loading}>
              {loading ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category information
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editCategoryName">Category Name *</Label>
              <Input
                id="editCategoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editCategoryDescription">Description</Label>
              <Textarea
                id="editCategoryDescription"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Enter category description (optional)"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory} disabled={loading}>
              {loading ? 'Updating...' : 'Update Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Upload Dialog */}
      <Dialog open={isVideoUploadDialogOpen} onOpenChange={setIsVideoUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload Video</DialogTitle>
            <DialogDescription>
              Upload a new video and assign it to a course
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="videoTitle">Video Title *</Label>
              <Input
                id="videoTitle"
                value={videoUploadData.title}
                onChange={(e) => setVideoUploadData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter video title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="videoCourse">Course *</Label>
              <Select 
                value={videoUploadData.course_id} 
                onValueChange={(value) => setVideoUploadData(prev => ({ ...prev, course_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="videoDescription">Description</Label>
              <Textarea
                id="videoDescription"
                value={videoUploadData.description}
                onChange={(e) => setVideoUploadData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter video description (optional)"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="videoFile">Video File *</Label>
              <Input
                id="videoFile"
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setVideoUploadData(prev => ({ ...prev, video_file: file }));
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: MP4, AVI, MOV (Max 500MB)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="thumbnailFile">Thumbnail (Optional)</Label>
              <Input
                id="thumbnailFile"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setVideoUploadData(prev => ({ ...prev, thumbnail_file: file }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Upload a custom thumbnail image (JPG, PNG)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVideoUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVideoUpload} disabled={videoUploadLoading}>
              {videoUploadLoading ? 'Uploading...' : 'Upload Video'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Edit Dialog */}
      <Dialog open={isVideoEditDialogOpen} onOpenChange={setIsVideoEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
            <DialogDescription>
              Update video information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-video-title">Title</Label>
              <Input
                id="edit-video-title"
                value={videoEditData.title}
                onChange={(e) => setVideoEditData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter video title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-video-description">Description</Label>
              <Textarea
                id="edit-video-description"
                value={videoEditData.description}
                onChange={(e) => setVideoEditData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter video description"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-video-published"
                checked={videoEditData.is_published}
                onChange={(e) => setVideoEditData(prev => ({ ...prev, is_published: e.target.checked }))}
              />
              <Label htmlFor="edit-video-published">Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVideoEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVideoUpdate}>
              Update Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={isDocumentUploadDialogOpen} onOpenChange={setIsDocumentUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload course materials like PDFs, images, and other resources
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document-title">Title *</Label>
                <Input
                  id="document-title"
                  value={documentUploadData.title}
                  onChange={(e) => setDocumentUploadData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter document title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document-course">Course *</Label>
                <select
                  id="document-course"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={documentUploadData.course_id}
                  onChange={(e) => setDocumentUploadData(prev => ({ ...prev, course_id: e.target.value }))}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="document-description">Description</Label>
              <Textarea
                id="document-description"
                value={documentUploadData.description}
                onChange={(e) => setDocumentUploadData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter document description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-file">Document File *</Label>
              <Input
                id="document-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setDocumentUploadData(prev => ({ ...prev, file }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF (Max 50MB per file)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="document-downloadable"
                checked={documentUploadData.is_downloadable}
                onChange={(e) => setDocumentUploadData(prev => ({ ...prev, is_downloadable: e.target.checked }))}
              />
              <Label htmlFor="document-downloadable">Allow downloads</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDocumentUpload} disabled={documentUploadLoading}>
              {documentUploadLoading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Edit Dialog */}
      <Dialog open={isDocumentEditDialogOpen} onOpenChange={setIsDocumentEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update document information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-document-title">Title</Label>
              <Input
                id="edit-document-title"
                value={documentEditData.title}
                onChange={(e) => setDocumentEditData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter document title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-document-description">Description</Label>
              <Textarea
                id="edit-document-description"
                value={documentEditData.description}
                onChange={(e) => setDocumentEditData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter document description"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-document-downloadable"
                checked={documentEditData.is_downloadable}
                onChange={(e) => setDocumentEditData(prev => ({ ...prev, is_downloadable: e.target.checked }))}
              />
              <Label htmlFor="edit-document-downloadable">Allow downloads</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDocumentUpdate}>
              Update Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Create Dialog */}
      <Dialog open={isQuizCreateDialogOpen} onOpenChange={setIsQuizCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Quiz</DialogTitle>
            <DialogDescription>
              Create a new quiz for your course
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiz-title">Quiz Title</Label>
                <Input
                  id="quiz-title"
                  value={quizFormData.title}
                  onChange={(e) => setQuizFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter quiz title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiz-course">Course</Label>
                <Select 
                  value={quizFormData.course_id} 
                  onValueChange={(value) => setQuizFormData(prev => ({ ...prev, course_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiz-time-limit">Time Limit (minutes)</Label>
                <Input
                  id="quiz-time-limit"
                  type="number"
                  value={quizFormData.time_limit}
                  onChange={(e) => setQuizFormData(prev => ({ ...prev, time_limit: parseInt(e.target.value) || 30 }))}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiz-passing-score">Passing Score (%)</Label>
                <Input
                  id="quiz-passing-score"
                  type="number"
                  value={quizFormData.passing_score}
                  onChange={(e) => setQuizFormData(prev => ({ ...prev, passing_score: parseInt(e.target.value) || 70 }))}
                  placeholder="70"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiz-max-attempts">Max Attempts</Label>
                <Input
                  id="quiz-max-attempts"
                  type="number"
                  value={quizFormData.max_attempts}
                  onChange={(e) => setQuizFormData(prev => ({ ...prev, max_attempts: parseInt(e.target.value) || 3 }))}
                  placeholder="3"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiz-description">Description</Label>
              <Textarea
                id="quiz-description"
                value={quizFormData.description}
                onChange={(e) => setQuizFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter quiz description"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="quiz-published"
                checked={quizFormData.is_published}
                onChange={(e) => setQuizFormData(prev => ({ ...prev, is_published: e.target.checked }))}
              />
              <Label htmlFor="quiz-published">Publish immediately</Label>
            </div>

            {/* Questions Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Quiz Questions ({quizFormData.questions.length})</h4>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newQuestion: QuizQuestion = {
                      question_text: '',
                      question_type: 'multiple_choice',
                      options: ['', '', '', ''],
                      correct_answers: [''],
                      explanation: '',
                      points: 1,
                      order_index: quizFormData.questions.length
                    };
                    setQuizFormData(prev => ({ 
                      ...prev, 
                      questions: [...prev.questions, newQuestion] 
                    }));
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Question
                </Button>
              </div>

              {quizFormData.questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No questions added yet</p>
                  <p className="text-sm">Click "Add Question" to get started</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {quizFormData.questions.map((question, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Label className="text-xs">Question {index + 1}</Label>
                                <Textarea
                                  value={question.question_text}
                                  onChange={(e) => {
                                    const updatedQuestions = [...quizFormData.questions];
                                    updatedQuestions[index].question_text = e.target.value;
                                    setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                  }}
                                  placeholder="Enter your question"
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                              <div className="w-32">
                                <Label className="text-xs">Type</Label>
                                <Select 
                                  value={question.question_type}
                                  onValueChange={(value: QuizQuestion['question_type']) => {
                                    const updatedQuestions = [...quizFormData.questions];
                                    updatedQuestions[index].question_type = value;
                                    // Reset options based on question type
                                    if (value === 'multiple_choice') {
                                      updatedQuestions[index].options = ['', '', '', ''];
                                      updatedQuestions[index].correct_answers = [''];
                                    } else if (value === 'true_false') {
                                      updatedQuestions[index].options = ['True', 'False'];
                                      updatedQuestions[index].correct_answers = ['True'];
                                    } else {
                                      updatedQuestions[index].options = undefined;
                                      updatedQuestions[index].correct_answers = [''];
                                    }
                                    setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                  }}
                                >
                                  <SelectTrigger className="text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                    <SelectItem value="true_false">True/False</SelectItem>
                                    <SelectItem value="short_answer">Short Answer</SelectItem>
                                    <SelectItem value="essay">Essay</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-16">
                                <Label className="text-xs">Points</Label>
                                <Input
                                  type="number"
                                  value={question.points}
                                  onChange={(e) => {
                                    const updatedQuestions = [...quizFormData.questions];
                                    updatedQuestions[index].points = parseInt(e.target.value) || 1;
                                    setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                  }}
                                  min="1"
                                  className="text-xs"
                                />
                              </div>
                            </div>

                            {/* Options for multiple choice and true/false */}
                            {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && question.options && (
                              <div className="space-y-2">
                                <Label className="text-xs">Options</Label>
                                {question.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex items-center gap-2">
                                    <input
                                      type={question.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                                      name={`question-${index}-correct`}
                                      checked={question.correct_answers.includes(option)}
                                      onChange={(e) => {
                                        const updatedQuestions = [...quizFormData.questions];
                                        if (question.question_type === 'multiple_choice') {
                                          if (e.target.checked) {
                                            updatedQuestions[index].correct_answers = [...question.correct_answers, option];
                                          } else {
                                            updatedQuestions[index].correct_answers = question.correct_answers.filter(ans => ans !== option);
                                          }
                                        } else {
                                          updatedQuestions[index].correct_answers = [option];
                                        }
                                        setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                      }}
                                      className="w-3 h-3"
                                    />
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const updatedQuestions = [...quizFormData.questions];
                                        const oldOption = updatedQuestions[index].options![optionIndex];
                                        updatedQuestions[index].options![optionIndex] = e.target.value;
                                        // Update correct answers if this option was selected
                                        if (question.correct_answers.includes(oldOption)) {
                                          const correctIndex = updatedQuestions[index].correct_answers.indexOf(oldOption);
                                          updatedQuestions[index].correct_answers[correctIndex] = e.target.value;
                                        }
                                        setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                      }}
                                      placeholder={`Option ${optionIndex + 1}`}
                                      className="text-xs"
                                    />
                                    {question.question_type === 'multiple_choice' && question.options!.length > 2 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const updatedQuestions = [...quizFormData.questions];
                                          updatedQuestions[index].options = question.options!.filter((_, i) => i !== optionIndex);
                                          updatedQuestions[index].correct_answers = question.correct_answers.filter(ans => ans !== option);
                                          setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                {question.question_type === 'multiple_choice' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const updatedQuestions = [...quizFormData.questions];
                                      updatedQuestions[index].options = [...(question.options || []), ''];
                                      setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Option
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Correct answer for short answer and essay */}
                            {(question.question_type === 'short_answer' || question.question_type === 'essay') && (
                              <div className="space-y-2">
                                <Label className="text-xs">Sample Correct Answer</Label>
                                <Textarea
                                  value={question.correct_answers[0] || ''}
                                  onChange={(e) => {
                                    const updatedQuestions = [...quizFormData.questions];
                                    updatedQuestions[index].correct_answers = [e.target.value];
                                    setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                  }}
                                  placeholder="Enter a sample correct answer"
                                  rows={question.question_type === 'essay' ? 3 : 1}
                                  className="text-xs"
                                />
                              </div>
                            )}

                            {/* Explanation */}
                            <div className="space-y-2">
                              <Label className="text-xs">Explanation (Optional)</Label>
                              <Textarea
                                value={question.explanation || ''}
                                onChange={(e) => {
                                  const updatedQuestions = [...quizFormData.questions];
                                  updatedQuestions[index].explanation = e.target.value;
                                  setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                }}
                                placeholder="Explain the correct answer"
                                rows={2}
                                className="text-xs"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedQuestions = quizFormData.questions.filter((_, i) => i !== index);
                              setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuizCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Create quiz logic
              const newQuiz = {
                id: Date.now(),
                title: quizFormData.title,
                course_id: parseInt(quizFormData.course_id),
                course_title: courses.find(c => c.id.toString() === quizFormData.course_id)?.title || 'Unknown Course',
                description: quizFormData.description,
                time_limit: quizFormData.time_limit,
                passing_score: quizFormData.passing_score,
                max_attempts: quizFormData.max_attempts,
                is_published: quizFormData.is_published,
                questions_count: quizFormData.questions.length,
                attempts_count: 0,
                created_at: new Date().toISOString(),
                questions: quizFormData.questions
              };
              
              setQuizzes(prev => [...prev, newQuiz]);
              setQuizFormData({
                title: '',
                course_id: '',
                module_id: '',
                description: '',
                time_limit: 30,
                passing_score: 70,
                max_attempts: 3,
                is_published: false,
                questions: []
              });
              setIsQuizCreateDialogOpen(false);
              
              toast({
                title: "Success",
                description: `Quiz created successfully with ${quizFormData.questions.length} questions`,
              });
            }}>
              Create Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Edit Dialog */}
      <Dialog open={isQuizEditDialogOpen} onOpenChange={setIsQuizEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Quiz</DialogTitle>
            <DialogDescription>
              Update quiz information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quiz-title">Quiz Title</Label>
                <Input
                  id="edit-quiz-title"
                  value={quizFormData.title}
                  onChange={(e) => setQuizFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter quiz title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quiz-course">Course</Label>
                <Select 
                  value={quizFormData.course_id} 
                  onValueChange={(value) => setQuizFormData(prev => ({ ...prev, course_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quiz-time-limit">Time Limit (minutes)</Label>
                <Input
                  id="edit-quiz-time-limit"
                  type="number"
                  value={quizFormData.time_limit}
                  onChange={(e) => setQuizFormData(prev => ({ ...prev, time_limit: parseInt(e.target.value) || 30 }))}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quiz-passing-score">Passing Score (%)</Label>
                <Input
                  id="edit-quiz-passing-score"
                  type="number"
                  value={quizFormData.passing_score}
                  onChange={(e) => setQuizFormData(prev => ({ ...prev, passing_score: parseInt(e.target.value) || 70 }))}
                  placeholder="70"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quiz-max-attempts">Max Attempts</Label>
                <Input
                  id="edit-quiz-max-attempts"
                  type="number"
                  value={quizFormData.max_attempts}
                  onChange={(e) => setQuizFormData(prev => ({ ...prev, max_attempts: parseInt(e.target.value) || 3 }))}
                  placeholder="3"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-quiz-description">Description</Label>
              <Textarea
                id="edit-quiz-description"
                value={quizFormData.description}
                onChange={(e) => setQuizFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter quiz description"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-quiz-published"
                checked={quizFormData.is_published}
                onChange={(e) => setQuizFormData(prev => ({ ...prev, is_published: e.target.checked }))}
              />
              <Label htmlFor="edit-quiz-published">Published</Label>
            </div>

            {/* Questions Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Quiz Questions ({quizFormData.questions.length})</h4>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newQuestion: QuizQuestion = {
                      question_text: '',
                      question_type: 'multiple_choice',
                      options: ['', '', '', ''],
                      correct_answers: [''],
                      explanation: '',
                      points: 1,
                      order_index: quizFormData.questions.length
                    };
                    setQuizFormData(prev => ({ 
                      ...prev, 
                      questions: [...prev.questions, newQuestion] 
                    }));
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Question
                </Button>
              </div>

              {quizFormData.questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No questions added yet</p>
                  <p className="text-sm">Click "Add Question" to get started</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {quizFormData.questions.map((question, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Label className="text-xs">Question {index + 1}</Label>
                                <Textarea
                                  value={question.question_text}
                                  onChange={(e) => {
                                    const updatedQuestions = [...quizFormData.questions];
                                    updatedQuestions[index].question_text = e.target.value;
                                    setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                  }}
                                  placeholder="Enter your question"
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                              <div className="w-32">
                                <Label className="text-xs">Type</Label>
                                <Select 
                                  value={question.question_type}
                                  onValueChange={(value: QuizQuestion['question_type']) => {
                                    const updatedQuestions = [...quizFormData.questions];
                                    updatedQuestions[index].question_type = value;
                                    // Reset options based on question type
                                    if (value === 'multiple_choice') {
                                      updatedQuestions[index].options = ['', '', '', ''];
                                      updatedQuestions[index].correct_answers = [''];
                                    } else if (value === 'true_false') {
                                      updatedQuestions[index].options = ['True', 'False'];
                                      updatedQuestions[index].correct_answers = ['True'];
                                    } else {
                                      updatedQuestions[index].options = undefined;
                                      updatedQuestions[index].correct_answers = [''];
                                    }
                                    setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                  }}
                                >
                                  <SelectTrigger className="text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                    <SelectItem value="true_false">True/False</SelectItem>
                                    <SelectItem value="short_answer">Short Answer</SelectItem>
                                    <SelectItem value="essay">Essay</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-16">
                                <Label className="text-xs">Points</Label>
                                <Input
                                  type="number"
                                  value={question.points}
                                  onChange={(e) => {
                                    const updatedQuestions = [...quizFormData.questions];
                                    updatedQuestions[index].points = parseInt(e.target.value) || 1;
                                    setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                  }}
                                  min="1"
                                  className="text-xs"
                                />
                              </div>
                            </div>

                            {/* Options for multiple choice and true/false */}
                            {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && question.options && (
                              <div className="space-y-2">
                                <Label className="text-xs">Options</Label>
                                {question.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex items-center gap-2">
                                    <input
                                      type={question.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                                      name={`question-${index}-correct`}
                                      checked={question.correct_answers.includes(option)}
                                      onChange={(e) => {
                                        const updatedQuestions = [...quizFormData.questions];
                                        if (question.question_type === 'multiple_choice') {
                                          if (e.target.checked) {
                                            updatedQuestions[index].correct_answers = [...question.correct_answers, option];
                                          } else {
                                            updatedQuestions[index].correct_answers = question.correct_answers.filter(ans => ans !== option);
                                          }
                                        } else {
                                          updatedQuestions[index].correct_answers = [option];
                                        }
                                        setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                      }}
                                      className="w-3 h-3"
                                    />
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const updatedQuestions = [...quizFormData.questions];
                                        const oldOption = updatedQuestions[index].options![optionIndex];
                                        updatedQuestions[index].options![optionIndex] = e.target.value;
                                        // Update correct answers if this option was selected
                                        if (question.correct_answers.includes(oldOption)) {
                                          const correctIndex = updatedQuestions[index].correct_answers.indexOf(oldOption);
                                          updatedQuestions[index].correct_answers[correctIndex] = e.target.value;
                                        }
                                        setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                      }}
                                      placeholder={`Option ${optionIndex + 1}`}
                                      className="text-xs"
                                    />
                                    {question.question_type === 'multiple_choice' && question.options!.length > 2 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const updatedQuestions = [...quizFormData.questions];
                                          updatedQuestions[index].options = question.options!.filter((_, i) => i !== optionIndex);
                                          updatedQuestions[index].correct_answers = question.correct_answers.filter(ans => ans !== option);
                                          setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                {question.question_type === 'multiple_choice' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const updatedQuestions = [...quizFormData.questions];
                                      updatedQuestions[index].options = [...(question.options || []), ''];
                                      setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Option
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Correct answer for short answer and essay */}
                            {(question.question_type === 'short_answer' || question.question_type === 'essay') && (
                              <div className="space-y-2">
                                <Label className="text-xs">Sample Correct Answer</Label>
                                <Textarea
                                  value={question.correct_answers[0] || ''}
                                  onChange={(e) => {
                                    const updatedQuestions = [...quizFormData.questions];
                                    updatedQuestions[index].correct_answers = [e.target.value];
                                    setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                  }}
                                  placeholder="Enter a sample correct answer"
                                  rows={question.question_type === 'essay' ? 3 : 1}
                                  className="text-xs"
                                />
                              </div>
                            )}

                            {/* Explanation */}
                            <div className="space-y-2">
                              <Label className="text-xs">Explanation (Optional)</Label>
                              <Textarea
                                value={question.explanation || ''}
                                onChange={(e) => {
                                  const updatedQuestions = [...quizFormData.questions];
                                  updatedQuestions[index].explanation = e.target.value;
                                  setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                                }}
                                placeholder="Explain the correct answer"
                                rows={2}
                                className="text-xs"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedQuestions = quizFormData.questions.filter((_, i) => i !== index);
                              setQuizFormData(prev => ({ ...prev, questions: updatedQuestions }));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuizEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Update quiz logic
              if (selectedQuiz) {
                setQuizzes(prev => prev.map(quiz => 
                  quiz.id === selectedQuiz.id 
                    ? {
                        ...quiz,
                        title: quizFormData.title,
                        course_id: parseInt(quizFormData.course_id),
                        course_title: courses.find(c => c.id.toString() === quizFormData.course_id)?.title || 'Unknown Course',
                        description: quizFormData.description,
                        time_limit: quizFormData.time_limit,
                        passing_score: quizFormData.passing_score,
                        max_attempts: quizFormData.max_attempts,
                        is_published: quizFormData.is_published,
                        questions_count: quizFormData.questions.length,
                        questions: quizFormData.questions
                      }
                    : quiz
                ));
                
                setIsQuizEditDialogOpen(false);
                setSelectedQuiz(null);
                
                toast({
                  title: "Success",
                  description: `Quiz updated successfully with ${quizFormData.questions.length} questions`,
                });
              }
            }}>
              Update Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolManagement;