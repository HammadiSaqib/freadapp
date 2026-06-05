import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Trophy,
  Users,
  Star,
  Award,
  Target,
  Zap,
  Crown,
  Medal,
  Calendar,
  Clock,
  Play,
  CheckCircle,
  Lock,
  Plus,
  MessageSquare,
  ThumbsUp,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Sparkles,
  Flame,
  Brain,
  Lightbulb,
  Diamond,
  Shield,
  ChevronRight,
  PlayCircle,
  FileText,
  Video,
  ExternalLink,
  ChevronLeft,
  CalendarDays,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Course } from "@/lib/api";
import { useNavigate } from "react-router-dom";

type EliteCourse = Course & {
  thumbnail?: string;
  featured?: boolean;
  progress?: number;
  category?: string;
  enrolled?: number;
  isEnrolled?: boolean;
  videoUrl?: string;
  video_url?: string;
};

interface EliteSchoolProps {
  courses: EliteCourse[];
  coursesLoading: boolean;
  enrolledCourses: number[];
  userStats: any;
  leaderboard: any[];
  leaderboardLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigate: (url: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  communityTab?: React.ReactNode;
  calendarTab?: React.ReactNode;
  mapsTab?: React.ReactNode;
  businessDirectoryTab?: React.ReactNode;
  aboutTab?: React.ReactNode;
}

export default function EliteSchool(props: EliteSchoolProps) {
  const {
    courses,
    coursesLoading,
    enrolledCourses,
    userStats,
    leaderboard,
    leaderboardLoading,
    activeTab,
    setActiveTab,
    navigate,
    searchQuery,
    setSearchQuery,
    communityTab,
    calendarTab,
    mapsTab,
    businessDirectoryTab,
    aboutTab
  } = props;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enrolledCourseList = courses.filter(c => enrolledCourses.includes(c.id));
  const completedCourseList = enrolledCourseList.filter(c => c.progress >= 100);

  const getCourseVideoUrl = (course: EliteCourse) => {
    const rawVideoUrl = String(course.videoUrl || course.video_url || "").trim();

    if (!rawVideoUrl) {
      return "";
    }

    if (/^(?:[a-z]+:)?\/\//i.test(rawVideoUrl) || rawVideoUrl.startsWith("/")) {
      return rawVideoUrl;
    }

    return `https://${rawVideoUrl}`;
  };

  const handleCourseStart = (course: EliteCourse) => {
    const videoUrl = getCourseVideoUrl(course);

    if (videoUrl) {
      window.open(videoUrl, "_blank", "noopener,noreferrer");
      return;
    }

    navigate(`/course/${course.id}`);
  };

  return (
    <div className="elite-page-shell">
        {/* Background Electric Glows */}
      <div className="elite-page-glow-primary"></div>
      <div className="elite-page-glow-secondary" style={{ animationDelay: "2s" }}></div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1600px] mx-auto space-y-6 relative z-10 elite-nested-wrapper">
          
          {/* HEADER & STATS */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col justify-center">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-[#00d4ff]/20 to-[#7000ff]/20 rounded-full blur-3xl"></div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 dark:from-white via-[#7000ff] to-[#00d4ff] tracking-tight flex items-center gap-2 mb-2">
                <Crown className="h-8 w-8 text-[#7000ff]" /> Elite Academy
              </h1>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 max-w-md">Master the strategies and tools to scale your funding business to the next level.</p>
              
              <div className="flex items-center gap-4 mt-6">
                <Button className="bg-gradient-to-r from-[#00d4ff] to-[#00ffcc] text-slate-900 dark:text-slate-800 shadow-[0_0_15px_rgba(0,212,255,0.4)] border-0 text-xs font-black uppercase tracking-wider rounded-xl h-10 px-6">
                  Continue Learning <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="outline" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-sm text-xs font-bold uppercase tracking-wider rounded-xl h-10 px-6 hover:text-[#7000ff] hover:bg-purple-50 dark:bg-purple-900/50 transition-colors">
                  View Certifications
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff9900] to-[#ff00ff]"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Your Progress</span>
                <div className="p-2 rounded-xl bg-orange-50 shadow-inner"><Flame className="h-4 w-4 text-[#ff9900]" /></div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-black text-slate-800 dark:text-slate-100">{enrolledCourseList.length}</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">Enrolled</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 shadow-inner overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${enrolledCourseList.length ? (completedCourseList.length / enrolledCourseList.length) * 100 : 0}%` }} transition={{ duration: 1 }} className="bg-gradient-to-r from-[#ff9900] to-[#ff00ff] h-full rounded-full" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2">{completedCourseList.length} courses completed</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-white dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#00ffcc] to-[#00d4ff]"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Elite Points</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/50 shadow-inner"><Sparkles className="h-4 w-4 text-[#00ffcc]" /></div>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-slate-800 dark:text-slate-100">{userStats?.totalPoints || 0}</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">PTS</span>
              </div>
              <p className="text-[10px] font-bold text-emerald-600 flex items-center mt-1 bg-emerald-50 dark:bg-emerald-900/50 w-fit px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3 h-3 mr-1" /> +{userStats?.weeklyPoints || 0} this week
              </p>
            </div>
          </motion.div>

          {/* TABS & SEARCH */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto overflow-x-auto pb-2 -mb-2">
              <TabsList className="h-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-1 inline-flex whitespace-nowrap">
                <TabsTrigger value="community" className="text-[11px] font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white transition-all px-4 h-full"><Users className="w-3.5 h-3.5 mr-2" /> Community</TabsTrigger>
                <TabsTrigger value="classroom" className="text-[11px] font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white transition-all px-4 h-full"><BookOpen className="w-3.5 h-3.5 mr-2" /> Classroom</TabsTrigger>
                <TabsTrigger value="calendar" className="text-[11px] font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white transition-all px-4 h-full"><Calendar className="w-3.5 h-3.5 mr-2" /> Calendar</TabsTrigger>
                <TabsTrigger value="maps" className="text-[11px] font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white transition-all px-4 h-full"><Target className="w-3.5 h-3.5 mr-2" /> Maps</TabsTrigger>
                <TabsTrigger value="directory" className="text-[11px] font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white transition-all px-4 h-full"><Building2 className="w-3.5 h-3.5 mr-2" /> Directory</TabsTrigger>
                <TabsTrigger value="leaderboard" className="text-[11px] font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white transition-all px-4 h-full"><Trophy className="w-3.5 h-3.5 mr-2" /> Leaderboard</TabsTrigger>
                <TabsTrigger value="about" className="text-[11px] font-bold uppercase tracking-wider rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white transition-all px-4 h-full"><Shield className="w-3.5 h-3.5 mr-2" /> About</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input 
                placeholder="Search academy..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-10 h-12 border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/50 transition-all placeholder:text-slate-400 dark:text-slate-500 text-sm font-semibold"
              />
            </div>
          </motion.div>

          {/* TAB CONTENTS */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* COMMUNITY TAB */}
              {activeTab === "community" && (
                <div className="w-full">
                  {communityTab}
                </div>
              )}

              {/* CALENDAR TAB */}
              {activeTab === "calendar" && (
                <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-white dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6">
                  {calendarTab}
                </div>
              )}

              {/* MAPS TAB */}
              {activeTab === "maps" && (
                <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-white dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6">
                  {mapsTab}
                </div>
              )}

              {activeTab === "directory" && (
                <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-white dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6">
                  {businessDirectoryTab}
                </div>
              )}

              {/* ABOUT TAB */}
              {activeTab === "about" && (
                <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-white dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6">
                  {aboutTab}
                </div>
              )}

              {/* CLASSROOM TAB */}
              {activeTab === "classroom" && (
                <div className="space-y-6">
                  {coursesLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="h-12 w-12 rounded-full border-4 border-[#00d4ff] border-t-transparent animate-spin"></div>
                    </div>
                  ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">No courses found</h3>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Try adjusting your search.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredCourses.map((course) => (
                        <div key={course.id} className="group bg-white dark:bg-slate-900 rounded-3xl border border-white dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,212,255,0.15)] transition-all duration-300 overflow-hidden flex flex-col relative">
                          {course.featured && <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-[#ff00ff] to-[#7000ff] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">Featured</div>}
                          <div className="h-48 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                            <div className="absolute bottom-4 left-4 flex items-center gap-2">
                              <Badge className="bg-white dark:bg-slate-900/20 backdrop-blur-md border-white dark:border-slate-800/30 text-white text-[9px] font-bold uppercase tracking-wider">{course.category || 'General'}</Badge>
                              <Badge className="bg-white dark:bg-slate-900/20 backdrop-blur-md border-white dark:border-slate-800/30 text-white text-[9px] font-bold uppercase tracking-wider flex items-center"><Clock className="w-3 h-3 mr-1" /> {course.duration}</Badge>
                            </div>
                          </div>
                          <div className="p-6 flex flex-col flex-grow">
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${course.difficulty === 'beginner' ? 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-600' : course.difficulty === 'intermediate' ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600' : 'bg-purple-50 dark:bg-purple-900/50 text-purple-600'}`}>
                                {course.difficulty}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center"><Users className="w-3 h-3 mr-1" /> {course.enrolled}</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight mb-2 group-hover:text-[#00d4ff] transition-colors">{course.title}</h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 line-clamp-2 mb-4 flex-grow">{course.description}</p>
                            
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                              <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                                <AvatarFallback className="bg-slate-800 text-white text-[10px] font-bold">{course.instructor.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Instructor</p>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{course.instructor}</p>
                              </div>
                              <Button
                                className="h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#00d4ff] hover:text-white hover:shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all border-0 text-[10px] font-black uppercase tracking-wider"
                                onClick={() => handleCourseStart(course)}
                              >
                                {course.isEnrolled ? 'Resume' : 'Start'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LEADERBOARD TAB */}
              {activeTab === "leaderboard" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-white dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><Trophy className="w-5 h-5 text-[#ff9900]" /> Global Rankings</h2>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Compete with top Elite members</p>
                    </div>
                  </div>
                  
                  {leaderboardLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="h-12 w-12 rounded-full border-4 border-[#ff9900] border-t-transparent animate-spin"></div>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-20">
                      <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">No rankings available yet.</p>
                    </div>
                  ) : (
                    <div className="p-0">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                            <th className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest py-4 px-6 text-left w-20">Rank</th>
                            <th className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest py-4 px-6 text-left">Member</th>
                            <th className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest py-4 px-6 text-left">Tier</th>
                            <th className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest py-4 px-6 text-right">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((user, idx) => (
                            <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-800/50/50 dark:bg-slate-800/50 transition-colors">
                              <td className="py-4 px-6">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${
                                  idx === 0 ? 'bg-gradient-to-br from-[#ffcc00] to-[#ff9900] text-white shadow-[0_0_10px_rgba(255,153,0,0.4)]' :
                                  idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                  idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                                  'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500'
                                }`}>
                                  #{idx + 1}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback className="bg-gradient-to-br from-[#00d4ff] to-[#7000ff] text-white font-bold">{user.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{user.name}</div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 ${
                                  user.tier === 'diamond' ? 'border-[#00d4ff]/50 text-[#00d4ff] bg-blue-50 dark:bg-blue-900/50' :
                                  user.tier === 'platinum' ? 'border-[#7000ff]/50 text-[#7000ff] bg-purple-50 dark:bg-purple-900/50' :
                                  user.tier === 'gold' ? 'border-[#ffcc00]/50 text-amber-600 bg-amber-50 dark:bg-amber-900/50' :
                                  'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50'
                                }`}>
                                  {user.tier}
                                </Badge>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="font-black text-slate-800 dark:text-slate-100 text-lg">{user.points.toLocaleString()}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* MY LEARNING TAB */}
              {activeTab === "mylearning" && (
                <div className="space-y-6">
                  {enrolledCourseList.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">No active courses</h3>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 mb-6">Enroll in a course from the catalog to start learning.</p>
                      <Button onClick={() => setActiveTab('catalog')} className="bg-slate-800 text-white rounded-xl shadow-md text-xs font-bold uppercase tracking-wider h-10 px-6 hover:bg-slate-900">
                        Browse Catalog
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {enrolledCourseList.map((course) => (
                        <div key={course.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-lg transition-all p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                          <div className="w-full sm:w-40 h-32 rounded-2xl overflow-hidden shrink-0 relative shadow-inner">
                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                            {course.progress >= 100 && (
                              <div className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/500/20 backdrop-blur-[2px] flex items-center justify-center">
                                <div className="bg-white dark:bg-slate-900 rounded-full p-1.5 shadow-lg"><CheckCircle className="w-6 h-6 text-emerald-500" /></div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col w-full">
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight mb-1">{course.title}</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Instructor: {course.instructor}</p>
                            
                            <div className="space-y-2 mt-auto">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className={course.progress >= 100 ? "text-emerald-500" : "text-[#00d4ff]"}>
                                  {course.progress >= 100 ? 'Completed' : 'In Progress'}
                                </span>
                                <span className="text-slate-600 dark:text-slate-400">{course.progress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 shadow-inner overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${course.progress}%` }} 
                                  transition={{ duration: 1 }} 
                                  className={`h-full rounded-full ${course.progress >= 100 ? 'bg-gradient-to-r from-[#00ffcc] to-emerald-500' : 'bg-gradient-to-r from-[#00d4ff] to-[#7000ff]'}`} 
                                />
                              </div>
                            </div>
                            
                            <Button className="w-full mt-5 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-[#00d4ff] hover:text-white hover:shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all border border-slate-100 dark:border-slate-800 hover:border-transparent text-xs font-black uppercase tracking-wider rounded-xl h-10">
                              {course.progress >= 100 ? 'Review Course' : 'Continue Learning'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

        </motion.div>
      </div>
  );
}