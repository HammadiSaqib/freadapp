import React from "react";

type EliteCourse = {
  id: number;
  title: string;
  description: string;
  instructor?: string;
  duration?: string;
  thumbnail?: string;
  featured?: boolean;
  progress?: number;
  category?: string;
  enrolled?: number;
  isEnrolled?: boolean;
  videoUrl?: string;
  video_url?: string;
};

interface BasicSchoolProps {
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

export default function BasicSchool(props: BasicSchoolProps) {
  const {
    courses,
    coursesLoading,
    enrolledCourses,
    activeTab,
    setActiveTab,
    navigate,
    searchQuery,
    setSearchQuery,
    communityTab,
    calendarTab,
    mapsTab,
    businessDirectoryTab,
    aboutTab,
  } = props;

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enrolledCourseList = courses.filter((c) => enrolledCourses.includes(c.id));
  const completedCourseList = enrolledCourseList.filter((c) => (c.progress || 0) >= 100);

  const getCourseVideoUrl = (course: EliteCourse) => {
    const rawVideoUrl = String(course.videoUrl || course.video_url || "").trim();
    if (!rawVideoUrl) return "";
    if (/^(?:[a-z]+:)?\/\//i.test(rawVideoUrl) || rawVideoUrl.startsWith("/")) return rawVideoUrl;
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
    <div className="max-w-7xl mx-auto p-4 space-y-6 bg-white border border-gray-300">
      
      {/* Header */}
      <div className="border-b border-gray-300 pb-4 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-gray-900 uppercase">Academy & Resources</h1>
          <p className="text-sm text-gray-600">Standard Learning Center</p>
        </div>
        <div className="text-sm border border-gray-300 bg-gray-50 px-3 py-1 font-mono">
          Enrolled: {enrolledCourseList.length} | Completed: {completedCourseList.length}
        </div>
      </div>

      {/* Tabs & Search Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-300 pb-4">
        <div className="flex flex-wrap gap-2">
          {['community', 'classroom', 'calendar', 'maps', 'directory', 'about'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1 text-sm font-semibold uppercase border ${
                activeTab === tab 
                  ? 'bg-gray-800 text-white border-gray-800' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="w-full lg:w-64 flex">
          <span className="bg-gray-200 border border-r-0 border-gray-300 px-3 py-1 text-sm font-semibold uppercase text-gray-600">Search</span>
          <input 
            type="text"
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="flex-1 border border-gray-300 p-1 text-sm bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-4">
        {activeTab === "community" && <div className="border border-gray-300 p-4">{communityTab}</div>}
        {activeTab === "calendar" && <div className="border border-gray-300 p-4">{calendarTab}</div>}
        {activeTab === "maps" && <div className="border border-gray-300 p-4">{mapsTab}</div>}
        {activeTab === "directory" && <div className="border border-gray-300 p-4">{businessDirectoryTab}</div>}
        {activeTab === "about" && <div className="border border-gray-300 p-4">{aboutTab}</div>}

        {activeTab === "classroom" && (
          <div className="space-y-4">
            {coursesLoading ? (
              <div className="p-8 text-center text-gray-500 border border-gray-300">Loading courses...</div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-8 text-center text-gray-500 border border-gray-300">No courses match your search.</div>
            ) : (
              <table className="w-full text-sm text-left border border-gray-300">
                <thead className="bg-gray-100 border-b border-gray-300 text-gray-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold uppercase">Course Title</th>
                    <th className="px-4 py-3 font-semibold uppercase hidden md:table-cell">Category</th>
                    <th className="px-4 py-3 font-semibold uppercase hidden sm:table-cell">Instructor</th>
                    <th className="px-4 py-3 font-semibold uppercase">Duration</th>
                    <th className="px-4 py-3 font-semibold uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{course.title}</div>
                        <div className="text-gray-500 text-xs mt-1 hidden lg:block line-clamp-1">{course.description}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs border border-gray-300 bg-white px-2 py-1">{course.category || 'General'}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-700">
                        {course.instructor}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {course.duration}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleCourseStart(course)}
                          className={`text-xs uppercase font-semibold px-3 py-1 border ${
                            course.isEnrolled 
                              ? 'border-gray-400 bg-gray-100 hover:bg-gray-200 text-black' 
                              : 'border-black bg-black text-white hover:bg-gray-800'
                          }`}
                        >
                          {course.isEnrolled ? 'Resume' : 'Start'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
