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
    <div className="basic-admin-page-shell">
      <div className="basic-admin-page-hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="basic-admin-page-badge">Basic learning hub</span>
            <div className="space-y-2">
              <h1 className="basic-admin-page-title">Academy & Resources</h1>
              <p className="basic-admin-page-description">
                Review lessons, keep up with your calendar, and open the core resources your team uses most.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="basic-admin-page-pill">
              Enrolled
              <span className="ml-2 text-base font-black text-slate-900 dark:text-white">{enrolledCourseList.length}</span>
            </div>
            <div className="basic-admin-page-pill">
              Completed
              <span className="ml-2 text-base font-black text-slate-900 dark:text-white">{completedCourseList.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="basic-admin-page-panel space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {['community', 'classroom', 'calendar', 'maps', 'directory', 'about'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? 'basic-admin-page-tab-active' : 'basic-admin-page-tab'}
              >
                {tab}
              </button>
            ))}
          </div>

          <label className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Courses or resources"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="mt-4">
          {activeTab === "community" && <div className="basic-admin-page-section">{communityTab}</div>}
          {activeTab === "calendar" && <div className="basic-admin-page-section">{calendarTab}</div>}
          {activeTab === "maps" && <div className="basic-admin-page-section">{mapsTab}</div>}
          {activeTab === "directory" && <div className="basic-admin-page-section">{businessDirectoryTab}</div>}
          {activeTab === "about" && <div className="basic-admin-page-section">{aboutTab}</div>}

          {activeTab === "classroom" && (
            <div className="space-y-4">
              {coursesLoading ? (
                <div className="basic-admin-page-section p-8 text-center text-slate-500 dark:text-slate-400">Loading courses...</div>
              ) : filteredCourses.length === 0 ? (
                <div className="basic-admin-page-section p-8 text-center text-slate-500 dark:text-slate-400">No courses match your search.</div>
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-sky-100/80 dark:border-slate-800">
                  <table className="w-full text-sm text-left">
                    <thead className="border-b border-sky-100/80 bg-sky-50/80 text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">Course Title</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em] hidden md:table-cell">Category</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em] hidden sm:table-cell">Instructor</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">Duration</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100/80 bg-white/90 dark:divide-slate-800 dark:bg-slate-950/70">
                      {filteredCourses.map((course) => (
                        <tr key={course.id} className="hover:bg-sky-50/70 dark:hover:bg-slate-900/70">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white">{course.title}</div>
                            <div className="mt-1 hidden line-clamp-1 text-xs text-slate-500 dark:text-slate-400 lg:block">{course.description}</div>
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-slate-800 dark:bg-slate-900 dark:text-sky-300">
                              {course.category || 'General'}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-slate-700 dark:text-slate-300 sm:table-cell">
                            {course.instructor}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {course.duration}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleCourseStart(course)}
                              className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-all ${
                                course.isEnrolled
                                  ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300'
                                  : 'border-sky-300 bg-gradient-to-r from-sky-500 to-emerald-400 text-white shadow-sm shadow-sky-200 hover:brightness-105 dark:border-sky-500/20 dark:shadow-none'
                              }`}
                            >
                              {course.isEnrolled ? 'Resume' : 'Start'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
