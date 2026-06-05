import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { schoolManagementApi } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  FileText,
  CheckCircle,
  ArrowLeft,
  Clock,
  BookOpen,
  Award,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface CourseVideo {
  id: number;
  title: string;
  url: string;
  duration: string;
  order: number;
  completed: boolean;
}

interface CourseDocument {
  id: number;
  title: string;
  url: string;
  type: 'pdf' | 'doc' | 'ppt' | 'other';
  size: string;
  downloadAllowed: boolean;
}

interface QuizQuestion {
  id: number;
  question: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  correctAnswer: number;
  explanation: string;
  points: number;
}

interface CourseData {
  id: number;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  difficulty: string;
  progress: number;
  videos: CourseVideo[];
  documents: CourseDocument[];
  quiz: {
    id: number;
    title: string;
    questions: QuizQuestion[];
    passingScore: number;
    timeLimit?: number;
  } | null;
}

const CourseLearning: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  useEffect(() => {
    if (courseId) {
      fetchCourseData(parseInt(courseId));
    }
  }, [courseId]);

  const isYouTubeUrl = (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be');
    } catch {
      return /youtube\.com|youtu\.be/.test(url);
    }
  };

  const getYouTubeEmbedUrl = (url: string): string => {
    try {
      const u = new URL(url);
      if (u.pathname.includes('/embed/')) {
        return url;
      }
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '').split('?')[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      const v = u.searchParams.get('v');
      if (v) {
        return `https://www.youtube.com/embed/${v}`;
      }
    } catch {}
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const location = useLocation();
  const navState = (location.state || {}) as any;

  const fetchCourseData = async (id: number) => {
    try {
      setLoading(true);
      
      // Fetch course details
      const courseResponse = await schoolManagementApi.getCourse(id.toString());
      const course = courseResponse.data.data;
      
      // Fetch course videos
      const videosResponse = await schoolManagementApi.getCourseVideos(id.toString());
      const videos = videosResponse.data.data;
      
      // Fetch course materials
      const materialsResponse = await schoolManagementApi.getCourseMaterials(id.toString());
      const materials = materialsResponse.data.data;
      
      // Fetch course quizzes
      const quizzesResponse = await schoolManagementApi.getCourseQuizzes(id.toString());
      const quizzes = quizzesResponse.data.data;
      
      // Transform the data to match our interface
      const courseData: CourseData = {
        id: course.id,
        title: course.title,
        description: course.description,
        instructor: course.instructor_name || course.instructor,
        duration: course.duration,
        difficulty: course.difficulty,
        progress: 0, // This would come from user progress API
        videos: videos.map((video: any) => ({
          id: video.id,
          title: video.title,
          url: video.video_url,
          duration: video.duration,
          order: video.order_index,
          completed: false // This would come from user progress API
        })),
        documents: materials.map((material: any) => ({
          id: material.id,
          title: material.title,
          url: material.file_url,
          type: material.file_type,
          size: material.file_size,
          downloadAllowed: material.is_downloadable
        })),
        quiz: quizzes.length > 0 ? {
          id: quizzes[0].id,
          title: quizzes[0].title,
          questions: [], // Would need to fetch quiz questions separately
          passingScore: quizzes[0].passing_score || 70,
          timeLimit: quizzes[0].time_limit
        } : null
      };

      if (!courseData.videos || courseData.videos.length === 0) {
        const fallbackUrl = (navState && typeof navState.videoUrl === 'string' && navState.videoUrl.trim().length > 0)
          ? navState.videoUrl
          : (typeof course?.video_url === 'string' && course.video_url.trim().length > 0 ? course.video_url : '');
        if (fallbackUrl) {
          courseData.videos = [{
            id: -1,
            title: course.title || 'Course Video',
            url: fallbackUrl,
            duration: course.duration || 'N/A',
            order: 1,
            completed: false
          }];
        }
      }

      setCourseData(courseData);
      
      if (courseData.videos.length > 0) {
        setCurrentVideoIndex(0);
      }
      
    } catch (error) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: "Failed to load course data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVideoComplete = (videoIndex: number) => {
    if (courseData) {
      const updatedVideos = [...courseData.videos];
      updatedVideos[videoIndex].completed = true;
      setCourseData({
        ...courseData,
        videos: updatedVideos
      });

      // Auto-advance to next video if available
      if (videoIndex < courseData.videos.length - 1) {
        setCurrentVideoIndex(videoIndex + 1);
      } else {
        // All videos completed, show quiz option
        toast({
          title: "Course Videos Completed!",
          description: "You can now take the quiz to complete the course.",
        });
      }
    }
  };

  const handleDocumentDownload = async (document: CourseDocument) => {
    if (!document.downloadAllowed) {
      toast({
        title: "Download Restricted",
        description: "This document is not available for download.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = document.url;
      link.download = document.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: `Downloading ${document.title}...`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleQuizAnswer = (questionId: number, answerIndex: number) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleQuizSubmit = () => {
    if (!courseData?.quiz) return;

    let correctAnswers = 0;
    const totalQuestions = courseData.quiz.questions.length;

    courseData.quiz.questions.forEach(question => {
      if (quizAnswers[question.id] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);

    const passed = score >= courseData.quiz.passingScore;
    
    toast({
      title: passed ? "Quiz Passed!" : "Quiz Failed",
      description: `You scored ${score}%. ${passed ? 'Congratulations!' : `You need ${courseData.quiz.passingScore}% to pass.`}`,
      variant: passed ? "default" : "destructive",
    });
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading Course" description="Please wait while we load the course content">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!courseData) {
    return (
      <DashboardLayout title="Course Not Found" description="The requested course could not be found">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Course Not Found</h2>
            <Button onClick={() => navigate('/school')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentVideo = courseData.videos[currentVideoIndex];
  const completedVideos = courseData.videos.filter(v => v.completed).length;
  const totalVideos = courseData.videos.length;
  const courseProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

  // If no videos exist, show a message
  if (totalVideos === 0) {
    return (
      <DashboardLayout 
        title={courseData.title} 
        description={`by ${courseData.instructor} • ${courseData.difficulty} • ${courseData.duration}`}
      >
        <div className="container mx-auto px-4 py-6">
          {/* Navigation */}
          <div className="flex items-center mb-6">
            <Button variant="ghost" onClick={() => navigate('/school')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Videos Available</h3>
              <p className="text-muted-foreground mb-4">
                This course doesn't have any video content yet. Please check back later or contact support.
              </p>
              <Button onClick={() => navigate('/school')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // If currentVideo is undefined (shouldn't happen with the check above, but safety first)
  if (!currentVideo) {
    return (
      <DashboardLayout 
        title={courseData.title} 
        description={`by ${courseData.instructor} • ${courseData.difficulty} • ${courseData.duration}`}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center mb-6">
            <Button variant="ghost" onClick={() => navigate('/school')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Video Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The requested video could not be loaded. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={courseData.title} 
      description={`by ${courseData.instructor} • ${courseData.difficulty} • ${courseData.duration}`}
    >
      <div className="container mx-auto px-4 py-6">
        {/* Navigation */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/school')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>

        {/* Course Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{courseData.title}</h1>
          <p className="text-gray-600">
            by {courseData.instructor} • {courseData.difficulty} • {courseData.duration}
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Course Progress</span>
              <span className="text-sm text-muted-foreground">{courseProgress}% Complete</span>
            </div>
            <Progress value={courseProgress} className="h-2" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {!showQuiz ? (
              <>
                {/* Video Player */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{currentVideo.title}</span>
                      <Badge variant="outline">{currentVideo.duration}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-lg relative overflow-hidden mb-4">
                      {isYouTubeUrl(currentVideo.url) ? (
                        <iframe
                          className="w-full h-full"
                          src={getYouTubeEmbedUrl(currentVideo.url)}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={currentVideo.title}
                        />
                      ) : (
                        <video
                          className="w-full h-full"
                          controls
                          src={currentVideo.url}
                          onEnded={() => handleVideoComplete(currentVideoIndex)}
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>
                    
                    {/* Video Navigation */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        disabled={currentVideoIndex === 0}
                        onClick={() => setCurrentVideoIndex(currentVideoIndex - 1)}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                      
                      <span className="text-sm text-muted-foreground">
                        Video {currentVideoIndex + 1} of {totalVideos}
                      </span>
                      
                      <Button
                        variant="outline"
                        disabled={currentVideoIndex === totalVideos - 1}
                        onClick={() => setCurrentVideoIndex(currentVideoIndex + 1)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Documents Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Course Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {courseData.documents.map((document) => (
                        <div
                          key={document.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium">{document.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {document.type.toUpperCase()} • {document.size}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDocumentDownload(document)}
                            disabled={!document.downloadAllowed}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {document.downloadAllowed ? 'Download' : 'Restricted'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quiz Section */}
                {courseData.quiz && completedVideos === totalVideos && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Award className="h-5 w-5 mr-2" />
                        Course Quiz
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        Complete the quiz to finish the course and earn your certificate.
                      </p>
                      <Button onClick={() => setShowQuiz(true)} className="w-full">
                        Start Quiz
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              /* Quiz Interface */
              <Card>
                <CardHeader>
                  <CardTitle>{courseData.quiz?.title}</CardTitle>
                  <p className="text-muted-foreground">
                    Passing Score: {courseData.quiz?.passingScore}% • 
                    Time Limit: {courseData.quiz?.timeLimit} minutes
                  </p>
                </CardHeader>
                <CardContent>
                  {!quizSubmitted ? (
                    <div className="space-y-6">
                      {courseData.quiz?.questions.map((question, index) => (
                        <div key={question.id} className="space-y-3">
                          <h3 className="font-medium">
                            {index + 1}. {question.question}
                          </h3>
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <label
                                key={optionIndex}
                                className="flex items-center space-x-2 cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  value={optionIndex}
                                  onChange={() => handleQuizAnswer(question.id, optionIndex)}
                                  className="text-blue-600"
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex space-x-4">
                        <Button onClick={handleQuizSubmit} className="flex-1">
                          Submit Quiz
                        </Button>
                        <Button variant="outline" onClick={() => setShowQuiz(false)}>
                          Back to Course
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Quiz Results */
                    <div className="text-center space-y-4">
                      <div className="text-4xl font-bold text-blue-600">{quizScore}%</div>
                      <p className="text-lg">
                        {quizScore >= (courseData.quiz?.passingScore || 70) 
                          ? "Congratulations! You passed the quiz!" 
                          : "You didn't pass this time. Please review the materials and try again."}
                      </p>
                      
                      {/* Show correct answers */}
                      <div className="text-left space-y-4 mt-6">
                        <h4 className="font-semibold">Review Answers:</h4>
                        {courseData.quiz?.questions.map((question, index) => (
                          <div key={question.id} className="p-3 border rounded-lg">
                            <p className="font-medium mb-2">{index + 1}. {question.question}</p>
                            <p className="text-sm">
                              <span className="font-medium">Your answer:</span> {question.options[quizAnswers[question.id]]}
                              {quizAnswers[question.id] === question.correctAnswer ? (
                                <CheckCircle className="inline h-4 w-4 text-green-600 ml-2" />
                              ) : (
                                <span className="text-red-600 ml-2">✗</span>
                              )}
                            </p>
                            {quizAnswers[question.id] !== question.correctAnswer && (
                              <p className="text-sm text-green-600">
                                <span className="font-medium">Correct answer:</span> {question.options[question.correctAnswer]}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">{question.explanation}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex space-x-4">
                        {quizScore < (courseData.quiz?.passingScore || 70) && (
                          <Button onClick={() => {
                            setQuizSubmitted(false);
                            setQuizAnswers({});
                            setQuizScore(0);
                          }}>
                            Retake Quiz
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => navigate('/school')}>
                          Back to Courses
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Course Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {courseData.description}
                </p>
              </CardContent>
            </Card>

            {/* Video List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Course Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {courseData.videos.map((video, index) => (
                    <div
                      key={video.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        index === currentVideoIndex
                          ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-200'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => setCurrentVideoIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {video.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Play className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm font-medium">{video.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{video.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Course Info */}
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instructor:</span>
                  <span className="font-medium">{courseData.instructor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{courseData.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty:</span>
                  <Badge variant="outline">{courseData.difficulty}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Videos:</span>
                  <span className="font-medium">{completedVideos}/{totalVideos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documents:</span>
                  <span className="font-medium">{courseData.documents.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseLearning;
