import { useEffect, useState, type ElementType, type FormEvent } from "react";
import SupportLayout from "@/components/SupportLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  convertWeeklySchedule,
  EST_TIME_ZONE,
  formatScheduleTime,
  getCurrentTimeLabel,
  getCurrentWeekday,
  isBeforeScheduledEnd,
  KARACHI_TIME_ZONE,
  type WorkingHoursSchedule,
} from "@/lib/employeeSchedule";
import { useAuthContext } from "@/contexts/AuthContext";
import { supportEmployeeProgressApi } from "@/lib/api";
import {
  ArrowRight,
  AlertTriangle,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Coffee,
  Edit3,
  FileCheck2,
  FileText,
  GraduationCap,
  Megaphone,
  Plus,
  TimerReset,
  Trash2,
  UserRound,
} from "lucide-react";

type Tone = "purple" | "emerald" | "amber" | "rose" | "blue";
type WorkStatus = "Completed" | "In Progress" | "Pending";

interface WorkScheduleItem {
  id: number;
  workDate?: string;
  startTime: string;
  endTime: string;
  activity: string;
  assignedTaskId?: number;
  assignedTaskTitle?: string;
  assignedTaskPriority?: AssignedPriority;
  status: WorkStatus;
}

interface WorkScheduleForm {
  startTime: string;
  endTime: string;
  activity: string;
  assignedTaskId: string;
  status: WorkStatus | "";
}

type AssignedPriority = "Done" | "High" | "Required" | "Medium";

interface AssignedTask {
  id: number;
  title: string;
  description?: string;
  priority: AssignedPriority;
  today_only: boolean | number;
}

interface EmployeeAnnouncement {
  id: number;
  title: string;
  description?: string;
  label?: string;
  is_custom?: boolean | number;
}

interface AttendanceSession {
  id: number;
  workDate: string;
  clockInAt: string;
  clockOutAt?: string | null;
  breakStartedAt?: string | null;
  totalBreakSeconds: number;
  status: "clocked_in" | "on_break" | "clocked_out";
}

interface AttendanceState {
  session?: AttendanceSession | null;
  completedSessionsToday?: number;
  dailySessionLimit?: number;
  clockInLimitReached?: boolean;
}

interface WeeklyHoursSummary {
  weekStart: string;
  weekEnd: string;
  scheduledSeconds: number;
  workedSeconds: number;
}

function formatTrackedMinutes(minutes: number) {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  return `${Math.floor(safeMinutes / 60)}h ${String(safeMinutes % 60).padStart(2, "0")}m`;
}

function formatMetricHours(seconds: number) {
  const hours = Math.max(0, seconds) / 3600;
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`;
}

const emptyWorkScheduleForm: WorkScheduleForm = {
  startTime: "",
  endTime: "",
  activity: "",
  assignedTaskId: "",
  status: "",
};

const toneClasses: Record<Tone, { icon: string; progress: string }> = {
  purple: { icon: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300", progress: "bg-purple-600" },
  emerald: { icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", progress: "bg-emerald-500" },
  amber: { icon: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", progress: "bg-amber-500" },
  rose: { icon: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300", progress: "bg-rose-500" },
  blue: { icon: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", progress: "bg-blue-500" },
};

const metrics: Array<{ label: string; value: string; helper: string; progress: number; icon: ElementType; tone: Tone }> = [
  { label: "Hours This Week", value: "31.5h", helper: "of 40 hours", progress: 79, icon: Clock3, tone: "purple" },
  { label: "Assigned Tasks", value: "7", helper: "4 completed", progress: 64, icon: ClipboardList, tone: "amber" },
];

const priorityTones: Record<AssignedPriority, Tone> = {
  Done: "emerald",
  High: "rose",
  Required: "amber",
  Medium: "purple",
};

const statusStyles: Record<string, string> = {
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "In Progress": "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  Pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function formatWorkTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <CardTitle className="text-base text-slate-900 dark:text-white">{title}</CardTitle>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function SupportMyProgress() {
  const { userProfile } = useAuthContext();
  const [now, setNow] = useState(() => new Date());
  const [clockedIn, setClockedIn] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [workSchedule, setWorkSchedule] = useState<WorkScheduleItem[]>([]);
  const [workScheduleForm, setWorkScheduleForm] = useState<WorkScheduleForm>(emptyWorkScheduleForm);
  const [workScheduleError, setWorkScheduleError] = useState("");
  const [editingWorkScheduleId, setEditingWorkScheduleId] = useState<number | null>(null);
  const [currentWorkDate, setCurrentWorkDate] = useState("");
  const [savingWorkSchedule, setSavingWorkSchedule] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [employeeAnnouncements, setEmployeeAnnouncements] = useState<EmployeeAnnouncement[]>([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [workingHours, setWorkingHours] = useState<WorkingHoursSchedule | null>(null);
  const [attendanceKarachi, setAttendanceKarachi] = useState(false);
  const [timesheetOpen, setTimesheetOpen] = useState(false);
  const [timesheetKarachi, setTimesheetKarachi] = useState(false);
  const [clockInAt, setClockInAt] = useState<Date | null>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartedAt, setBreakStartedAt] = useState<Date | null>(null);
  const [accumulatedBreakMinutes, setAccumulatedBreakMinutes] = useState(0);
  const [breakLimitDialogOpen, setBreakLimitDialogOpen] = useState(false);
  const [earlyClockOutDialogOpen, setEarlyClockOutDialogOpen] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [dailyClockInLimitReached, setDailyClockInLimitReached] = useState(false);
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const [weeklyHoursSummary, setWeeklyHoursSummary] = useState<WeeklyHoursSummary>({ weekStart: "", weekEnd: "", scheduledSeconds: 0, workedSeconds: 0 });
  const [weeklySummaryCapturedAt, setWeeklySummaryCapturedAt] = useState(() => Date.now());
  const [breakLimitAcknowledged, setBreakLimitAcknowledged] = useState(false);
  const [ignoreBreakLimitDate, setIgnoreBreakLimitDate] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const applyAttendanceData = (attendance: AttendanceState | null | undefined) => {
    const session = attendance?.session || null;
    const active = Boolean(session && !session.clockOutAt);
    setClockedIn(active);
    setClockInAt(active && session?.clockInAt ? new Date(session.clockInAt) : null);
    setOnBreak(active && session?.status === "on_break");
    setBreakStartedAt(active && session?.breakStartedAt ? new Date(session.breakStartedAt) : null);
    setAccumulatedBreakMinutes(active ? Number(session?.totalBreakSeconds || 0) / 60 : 0);
    setDailyClockInLimitReached(Boolean(attendance?.clockInLimitReached));
  };

  const applyProgressData = (data: any) => {
    setAssignedTasks(data?.tasks || []);
    setEmployeeAnnouncements(data?.announcements || []);
    setWorkingHours(data?.working_hours || null);
    setWorkSchedule(data?.work_schedule || []);
    setCurrentWorkDate(data?.work_date || "");
    applyAttendanceData(data?.attendance);
    const preferredTimezone = data?.preferred_timezone || EST_TIME_ZONE;
    const prefersKarachi = preferredTimezone === KARACHI_TIME_ZONE;
    setAttendanceKarachi(prefersKarachi);
    setTimesheetKarachi(prefersKarachi);
    setWeeklyHoursSummary(data?.weekly_summary || { weekStart: "", weekEnd: "", scheduledSeconds: 0, workedSeconds: 0 });
    setWeeklySummaryCapturedAt(Date.now());
  };

  const reloadProgress = async () => {
    const response = await supportEmployeeProgressApi.getMyProgress();
    applyProgressData(response.data?.data);
  };

  useEffect(() => {
    let active = true;
    supportEmployeeProgressApi.getMyProgress()
      .then((response) => {
        if (!active) return;
        applyProgressData(response.data?.data);
      })
      .catch((error) => console.error("Unable to load employee progress:", error))
      .finally(() => {
        if (active) setProgressLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const firstName = userProfile?.first_name?.trim() || "Jordan";
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
  const attendanceTimeZone = attendanceKarachi ? KARACHI_TIME_ZONE : EST_TIME_ZONE;
  const timeLabel = getCurrentTimeLabel(attendanceTimeZone, now);
  const attendanceSchedule = workingHours ? convertWeeklySchedule(workingHours, attendanceTimeZone, now) : [];
  const timesheetTimeZone = timesheetKarachi ? KARACHI_TIME_ZONE : EST_TIME_ZONE;
  const timesheetSchedule = workingHours ? convertWeeklySchedule(workingHours, timesheetTimeZone, now) : [];
  const currentAttendanceDay = getCurrentWeekday(attendanceTimeZone, now);
  const currentScheduleDay = attendanceSchedule.find((row) => row.day === currentAttendanceDay);
  const isOffDay = Boolean(currentScheduleDay?.isOff);
  const currentBreakMinutes = onBreak && breakStartedAt ? (now.getTime() - breakStartedAt.getTime()) / 60_000 : 0;
  const totalBreakMinutes = accumulatedBreakMinutes + currentBreakMinutes;
  const breakLimitMinutes = (workingHours?.break_hours || 0) * 60;
  const clockedMinutes = clockedIn && clockInAt ? (now.getTime() - clockInAt.getTime()) / 60_000 : 0;
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: EST_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const breakIgnoreStorageKey = userProfile?.id ? `support-break-limit-ignore-${userProfile.id}` : "";
  const completedTaskCount = assignedTasks.filter((task) => task.priority === "Done").length;
  const liveWorkedSeconds = weeklyHoursSummary.workedSeconds + (clockedIn ? Math.max(0, (now.getTime() - weeklySummaryCapturedAt) / 1000) : 0);
  const dashboardMetrics = metrics.map((metric) => {
    if (metric.label === "Hours This Week") return {
      ...metric,
      value: formatMetricHours(liveWorkedSeconds),
      helper: workingHours ? `of ${formatMetricHours(weeklyHoursSummary.scheduledSeconds)} scheduled` : "Weekly schedule not set",
      progress: weeklyHoursSummary.scheduledSeconds ? Math.min(100, Math.round((liveWorkedSeconds / weeklyHoursSummary.scheduledSeconds) * 100)) : 0,
    };
    if (metric.label === "Assigned Tasks") return {
      ...metric,
      value: String(assignedTasks.length),
      helper: `${completedTaskCount} completed`,
      progress: assignedTasks.length ? Math.round((completedTaskCount / assignedTasks.length) * 100) : 0,
    };
    return metric;
  });

  useEffect(() => {
    if (!onBreak || !workingHours || ignoreBreakLimitDate === todayKey || breakLimitAcknowledged) return;
    if (totalBreakMinutes >= breakLimitMinutes) setBreakLimitDialogOpen(true);
  }, [onBreak, workingHours, totalBreakMinutes, breakLimitMinutes, ignoreBreakLimitDate, todayKey, breakLimitAcknowledged]);

  useEffect(() => {
    if (breakIgnoreStorageKey) setIgnoreBreakLimitDate(localStorage.getItem(breakIgnoreStorageKey) || "");
  }, [breakIgnoreStorageKey]);

  const handleTimezonePreferenceChange = async (showKarachi: boolean) => {
    const previousValue = attendanceKarachi;
    setAttendanceKarachi(showKarachi);
    setTimesheetKarachi(showKarachi);
    setTimezoneSaving(true);
    setAttendanceError("");
    try {
      await supportEmployeeProgressApi.updateTimezonePreference(showKarachi ? KARACHI_TIME_ZONE : EST_TIME_ZONE);
    } catch (error: any) {
      setAttendanceKarachi(previousValue);
      setTimesheetKarachi(previousValue);
      setAttendanceError(error?.response?.data?.error || "Unable to save your timezone preference.");
    } finally {
      setTimezoneSaving(false);
    }
  };

  const completeClockOut = async () => {
    setAttendanceBusy(true);
    setAttendanceError("");
    try {
      await supportEmployeeProgressApi.clockOut();
      await reloadProgress();
      setEarlyClockOutDialogOpen(false);
    } catch (error: any) {
      const message = error?.response?.data?.error || "Unable to clock out. Please try again.";
      setAttendanceError(message);
    } finally {
      setAttendanceBusy(false);
    }
  };

  const handleClockToggle = async () => {
    if (!clockedIn) {
      setAttendanceBusy(true);
      setAttendanceError("");
      try {
        await supportEmployeeProgressApi.clockIn();
        await reloadProgress();
      } catch (error: any) {
        if (error?.response?.data?.data) applyAttendanceData(error.response.data.data);
        setAttendanceError(error?.response?.data?.error || "Unable to clock in. Please try again.");
      } finally {
        setAttendanceBusy(false);
      }
      return;
    }

    if (workingHours && isBeforeScheduledEnd(now, workingHours)) {
      setEarlyClockOutDialogOpen(true);
      return;
    }
    await completeClockOut();
  };

  const handleBreakToggle = async () => {
    setAttendanceBusy(true);
    setAttendanceError("");
    try {
      onBreak
        ? await supportEmployeeProgressApi.endBreak()
        : await supportEmployeeProgressApi.startBreak();
      await reloadProgress();
      setBreakLimitDialogOpen(false);
      setBreakLimitAcknowledged(false);
    } catch (error: any) {
      setAttendanceError(error?.response?.data?.error || `Unable to ${onBreak ? "end" : "start"} your break. Please try again.`);
    } finally {
      setAttendanceBusy(false);
    }
  };

  const ignoreBreakLimitForToday = () => {
    setIgnoreBreakLimitDate(todayKey);
    if (breakIgnoreStorageKey) localStorage.setItem(breakIgnoreStorageKey, todayKey);
    setBreakLimitDialogOpen(false);
  };

  const openScheduleDialog = () => {
    setEditingWorkScheduleId(null);
    setWorkScheduleForm(emptyWorkScheduleForm);
    setWorkScheduleError("");
    setScheduleDialogOpen(true);
  };

  const editWorkSchedule = (item: WorkScheduleItem) => {
    setEditingWorkScheduleId(item.id);
    setWorkScheduleForm({
      startTime: item.startTime,
      endTime: item.endTime,
      activity: item.activity,
      assignedTaskId: item.assignedTaskId ? String(item.assignedTaskId) : "",
      status: item.status,
    });
    setWorkScheduleError("");
    setScheduleDialogOpen(true);
  };

  const deleteWorkSchedule = async (item: WorkScheduleItem) => {
    if (!window.confirm(`Delete the work schedule entry “${item.activity}”?`)) return;
    try {
      await supportEmployeeProgressApi.deleteWorkSchedule(item.id);
      await reloadProgress();
    } catch (error: any) {
      window.alert(error?.response?.data?.error || "Unable to delete this work schedule entry.");
    }
  };

  const updateWorkScheduleStatus = async (itemId: number, status: WorkStatus) => {
    const item = workSchedule.find((scheduleItem) => scheduleItem.id === itemId);
    if (!item || item.status === status) return;
    const previousStatus = item.status;
    setWorkSchedule((items) => items.map((scheduleItem) => scheduleItem.id === itemId ? { ...scheduleItem, status } : scheduleItem));
    try {
      await supportEmployeeProgressApi.updateWorkSchedule(item.id, {
        work_date: item.workDate || currentWorkDate || undefined,
        start_time: item.startTime,
        end_time: item.endTime,
        activity: item.activity,
        assigned_task_id: item.assignedTaskId || null,
        status,
      });
      await reloadProgress();
    } catch (error: any) {
      setWorkSchedule((items) => items.map((scheduleItem) => scheduleItem.id === itemId ? { ...scheduleItem, status: previousStatus } : scheduleItem));
      window.alert(error?.response?.data?.error || "Unable to update this work status.");
    }
  };

  const handleScheduleDialogOpenChange = (open: boolean) => {
    setScheduleDialogOpen(open);
    if (!open) {
      setEditingWorkScheduleId(null);
      setWorkScheduleForm(emptyWorkScheduleForm);
      setWorkScheduleError("");
    }
  };

  const handleAddWorkSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!workScheduleForm.startTime || !workScheduleForm.endTime || !workScheduleForm.activity.trim() || !workScheduleForm.status) {
      setWorkScheduleError("Please complete the start time, end time, activity, and status.");
      return;
    }

    if (workScheduleForm.endTime <= workScheduleForm.startTime) {
      setWorkScheduleError("End time must be later than start time.");
      return;
    }

    setSavingWorkSchedule(true);
    setWorkScheduleError("");
    const payload = {
      work_date: currentWorkDate || undefined,
      start_time: workScheduleForm.startTime,
      end_time: workScheduleForm.endTime,
      activity: workScheduleForm.activity.trim(),
      assigned_task_id: workScheduleForm.assignedTaskId ? Number(workScheduleForm.assignedTaskId) : null,
      status: workScheduleForm.status as WorkStatus,
    };

    try {
      if (editingWorkScheduleId === null) {
        await supportEmployeeProgressApi.createWorkSchedule(payload);
      } else {
        await supportEmployeeProgressApi.updateWorkSchedule(editingWorkScheduleId, payload);
      }
      await reloadProgress();
      setWorkScheduleForm(emptyWorkScheduleForm);
      setEditingWorkScheduleId(null);
      setScheduleDialogOpen(false);
    } catch (error: any) {
      setWorkScheduleError(error?.response?.data?.error || "Unable to save this work schedule entry. Please try again.");
    } finally {
      setSavingWorkSchedule(false);
    }
  };

  return (
    <SupportLayout
      title="My Progress"
      description="Track your attendance, daily priorities, schedule, reports, and company activity."
    >
      <div className="space-y-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Employee Dashboard</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your workday at a glance.</p>
          </div>
          <Badge variant="outline" className="gap-2 border-purple-200 bg-white px-3 py-2 text-purple-700 shadow-sm dark:border-purple-800 dark:bg-slate-900 dark:text-purple-300">
            <CalendarDays className="h-4 w-4" /> {dateLabel}
          </Badge>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.7fr)]">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-purple-700 via-purple-600 to-violet-600 text-white shadow-lg shadow-purple-200/50 dark:shadow-none">
            <CardContent className="relative p-6 sm:p-8">
              <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
              <div className="absolute -bottom-24 right-24 h-44 w-44 rounded-full bg-violet-300/10" />
              <div className="relative">
                <p className="text-sm font-medium text-purple-100">Welcome back</p>
                <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{greeting}, {firstName}.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-purple-100 sm:text-base">
                  You have {assignedTasks.filter((task) => task.priority !== "Done").length} active priorities and {employeeAnnouncements.length} employee announcements.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    [BriefcaseBusiness, workingHours ? `Shift: ${formatScheduleTime(workingHours.start_time)} – ${formatScheduleTime(workingHours.end_time)} EST` : "Shift: Not configured"],
                    [UserRound, "Manager: Rey Anderson"],
                  ].map(([Icon, label]) => {
                    const ChipIcon = Icon as ElementType;
                    return <span key={label as string} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm"><ChipIcon className="h-3.5 w-3.5" />{label as string}</span>;
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
            <CardContent className="flex h-full flex-col justify-between p-6">
              <div className="flex items-start justify-between gap-3">
                <SectionTitle icon={Clock3} title="Attendance Status" subtitle={isOffDay ? "Off Day" : onBreak ? "On Break" : clockedIn ? "Clocked in" : "Not clocked in"} />
                <div className="flex items-center gap-2 rounded-lg border border-purple-100 px-2 py-1.5 dark:border-purple-900"><span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">PK Time</span><Switch checked={attendanceKarachi} disabled={timezoneSaving} onCheckedChange={handleTimezonePreferenceChange} aria-label="Show attendance in Karachi Islamabad time" /></div>
              </div>
              <div className="my-5">
                <div className="flex items-center gap-2"><p className="text-2xl font-bold text-slate-900 dark:text-white">{timeLabel}</p><span className={`h-2.5 w-2.5 rounded-full ${isOffDay ? "bg-amber-500" : onBreak ? "bg-blue-500" : clockedIn ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} /></div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5 dark:border-purple-900 dark:bg-purple-950/20"><p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">In Time</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{currentScheduleDay && !currentScheduleDay.isOff ? formatScheduleTime(currentScheduleDay.startTime) : isOffDay ? "Off Day" : "Not set"}</p></div>
                  <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-3 py-2.5 dark:border-purple-900 dark:bg-purple-950/20"><p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Out Time</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{currentScheduleDay && !currentScheduleDay.isOff ? `${currentScheduleDay.endDay !== currentScheduleDay.day ? `${currentScheduleDay.endDay} ` : ""}${formatScheduleTime(currentScheduleDay.endTime)}` : isOffDay ? "Off Day" : "Not set"}</p></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400"><p>Tracked: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTrackedMinutes(clockedMinutes)}</span></p><p>Break used: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTrackedMinutes(totalBreakMinutes)}</span></p><p>Break allowed: <span className="font-semibold text-slate-700 dark:text-slate-200">{workingHours ? `${workingHours.break_hours}h` : "Not set"}</span></p><p>Day: <span className="font-semibold text-slate-700 dark:text-slate-200">{currentAttendanceDay}</span></p></div>
              </div>
              {!clockedIn && dailyClockInLimitReached && <p role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">You have already clocked out twice for the day. If you have any issue, please contact your manager.</p>}
              {attendanceError && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{attendanceError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleClockToggle} disabled={isOffDay || attendanceBusy || (!clockedIn && dailyClockInLimitReached)} className="bg-purple-600 text-white hover:bg-purple-700"><TimerReset className="mr-2 h-4 w-4" />{attendanceBusy ? "Saving..." : isOffDay ? "Off Day" : clockedIn ? "Clock Out" : dailyClockInLimitReached ? "Day Completed" : "Clock In"}</Button>
                <Button onClick={handleBreakToggle} disabled={!clockedIn || isOffDay || attendanceBusy} variant={onBreak ? "default" : "outline"} className={onBreak ? "bg-blue-600 text-white hover:bg-blue-700" : "border-blue-200 text-blue-700 hover:bg-blue-500 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"}><Coffee className="mr-2 h-4 w-4" />{attendanceBusy ? "Saving..." : onBreak ? "Off Break" : "Start Break"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p><span className="font-semibold">Break reminder:</span> When you take a break, make sure you select “Start Break.” If you do not record your break and work is delayed or left pending, management may need to take action.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {dashboardMetrics.map(({ label, value, helper, progress, icon: Icon, tone }) => (
            <Card key={label} className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                  </div>
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${toneClasses[tone].icon}`}><Icon className="h-5 w-5" /></span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${toneClasses[tone].progress}`} style={{ width: `${progress}%` }} /></div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)]">
          <div className="space-y-6">
            <Card className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
              <CardHeader className="pb-4"><SectionTitle icon={CalendarDays} title="Today’s Work Schedule" subtitle="Monday’s scheduled activities" /></CardHeader>
              <CardContent className="px-0 pb-2">
                {workSchedule.length === 0 ? (
                  <button
                    type="button"
                    onClick={openScheduleDialog}
                    className="group mx-6 mb-4 flex min-h-48 w-[calc(100%-3rem)] flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/40 px-6 py-10 text-center transition-colors hover:border-purple-400 hover:bg-purple-50 dark:border-purple-800 dark:bg-purple-950/10 dark:hover:border-purple-600 dark:hover:bg-purple-950/30"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-purple-100 text-purple-700 transition-transform group-hover:scale-105 dark:bg-purple-950 dark:text-purple-300">
                      <Plus className="h-6 w-6" />
                    </span>
                    <span className="mt-4 font-semibold text-slate-900 dark:text-white">Add Your Work Progress</span>
                    <span className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add the time, activity, assigned task, and current status for today’s work.</span>
                  </button>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[840px] text-left text-sm">
                      <thead className="border-y border-purple-100 bg-purple-50/70 text-xs uppercase tracking-wide text-slate-500 dark:border-purple-900/50 dark:bg-purple-950/20 dark:text-slate-400">
                        <tr><th className="px-6 py-3 font-semibold">Time</th><th className="px-4 py-3 font-semibold">Activity</th><th className="px-4 py-3 font-semibold">Assigned Task</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-6 py-3 text-right font-semibold">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {workSchedule.map((item) => (
                          <tr key={item.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/10">
                            <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700 dark:text-slate-200">{formatWorkTime(item.startTime)} – {formatWorkTime(item.endTime)}</td>
                            <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">{item.activity}</td>
                            <td className="px-4 py-4">
                              {item.assignedTaskTitle ? (
                                <p className="max-w-56 font-medium text-slate-800 dark:text-slate-100">{item.assignedTaskTitle}</p>
                              ) : <span className="text-slate-400">—</span>}
                            </td>
                            <td className="px-4 py-4">
                              <Select value={item.status} onValueChange={(value) => updateWorkScheduleStatus(item.id, value as WorkStatus)}>
                                <SelectTrigger aria-label={`Update status for ${item.activity}`} className={`h-8 w-36 border-0 px-3 text-xs font-semibold shadow-none focus:ring-2 focus:ring-purple-500 ${statusStyles[item.status]}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Completed">Completed</SelectItem>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-1">
                                <Button type="button" variant="ghost" size="icon" onClick={() => editWorkSchedule(item)} aria-label={`Edit ${item.activity}`} className="h-8 w-8 text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:text-purple-300 dark:hover:bg-purple-950"><Edit3 className="h-4 w-4" /></Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => deleteWorkSchedule(item)} aria-label={`Delete ${item.activity}`} className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
              <CardHeader><SectionTitle icon={ClipboardCheck} title="My Assigned Priorities" subtitle="Tasks that need your attention" /></CardHeader>
              <CardContent className="space-y-3">
                {progressLoading ? (
                  <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading assigned tasks...</p>
                ) : assignedTasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">No tasks have been assigned to you.</p>
                ) : assignedTasks.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 transition-colors hover:border-purple-200 hover:bg-purple-50/30 dark:border-slate-800 dark:hover:border-purple-800 dark:hover:bg-purple-950/10 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      {item.priority === "Done" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-purple-300 dark:text-purple-700" />}
                      <div><p className="font-medium text-slate-900 dark:text-white">{item.title}</p>{item.description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>}{Boolean(item.today_only) && <Badge variant="outline" className="mt-2 border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">Today Only</Badge>}</div>
                    </div>
                    <Badge className={`w-fit border-0 ${toneClasses[priorityTones[item.priority]].icon}`}>{item.priority}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
              <CardHeader><SectionTitle icon={BriefcaseBusiness} title="Quick Actions" /></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { icon: FileText, label: "Add Today’s Work Schedule", onClick: openScheduleDialog },
                  { icon: Clock3, label: "View Timesheet", onClick: () => setTimesheetOpen(true) },
                ].map(({ icon: ActionIcon, label, onClick }) => {
                  return <button key={label} type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left text-sm font-medium text-slate-700 transition-all hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 dark:border-slate-800 dark:text-slate-200 dark:hover:border-purple-800 dark:hover:bg-purple-950/30 dark:hover:text-purple-300"><span className="grid h-9 w-9 place-items-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"><ActionIcon className="h-4 w-4" /></span><span className="flex-1">{label}</span><ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-purple-500" /></button>;
                })}
              </CardContent>
            </Card>

            <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50/70 shadow-sm dark:border-purple-900/50 dark:from-slate-900 dark:to-purple-950/20">
              <CardHeader><SectionTitle icon={Megaphone} title="Company Announcements" /></CardHeader>
              <CardContent className="space-y-4">
                {progressLoading ? (
                  <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading announcements...</p>
                ) : employeeAnnouncements.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-purple-200 py-6 text-center text-sm text-slate-500 dark:border-purple-800 dark:text-slate-400">No announcements for you right now.</p>
                ) : employeeAnnouncements.map((announcement, index) => (
                  <div key={announcement.id} className={index > 0 ? "border-t border-purple-100 pt-4 dark:border-purple-900/50" : ""}>
                    {announcement.label && <Badge className="border-0 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">{announcement.label}</Badge>}
                    <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{announcement.title}</p>
                    {announcement.description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{announcement.description}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={timesheetOpen} onOpenChange={setTimesheetOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-purple-100 dark:border-purple-900 dark:bg-slate-900 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">My Weekly Working Hours</DialogTitle>
            <DialogDescription>Review your scheduled in time, out time, weekly off days, and allowed break hours.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50/50 p-3 dark:border-purple-900 dark:bg-purple-950/20">
            <div><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Karachi/Islamabad Time</p><p className="text-xs text-slate-500 dark:text-slate-400">Toggle to convert both the day and time from EST.</p></div>
            <Switch checked={timesheetKarachi} disabled={timezoneSaving} onCheckedChange={handleTimezonePreferenceChange} aria-label="Show timesheet in Karachi Islamabad time" />
          </div>
          {!workingHours ? (
            <p className="rounded-xl border border-dashed py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">Your weekly working hours have not been configured yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3"><p className="text-xs text-slate-500 dark:text-slate-400">Schedule timezone</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{timesheetKarachi ? "Karachi / Islamabad" : "Eastern Time"}</p></div>
                <div className="rounded-xl border p-3"><p className="text-xs text-slate-500 dark:text-slate-400">Allowed break</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{workingHours.break_hours} hours</p></div>
              </div>
              <div className="overflow-hidden rounded-xl border">
                <div className="divide-y dark:divide-slate-800">
                  {timesheetSchedule.map((row) => {
                    const currentDay = row.day === getCurrentWeekday(timesheetTimeZone, now);
                    return <div key={row.sourceDay} className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${currentDay ? "bg-purple-50 dark:bg-purple-950/20" : ""}`}><div className="flex items-center gap-2"><span className="w-24 font-semibold text-slate-800 dark:text-slate-100">{row.day}</span>{currentDay && <Badge variant="outline" className="border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">Today</Badge>}{row.isOff && <Badge className="border-0 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Off Day</Badge>}</div><span className="text-right text-slate-500 dark:text-slate-400">{row.isOff ? "No scheduled shift" : `${formatScheduleTime(row.startTime)} – ${row.endDay !== row.day ? `${row.endDay} ` : ""}${formatScheduleTime(row.endTime)}`}</span></div>;
                  })}
                </div>
              </div>
            </>
          )}
          <DialogFooter><Button type="button" onClick={() => setTimesheetOpen(false)} className="bg-purple-600 hover:bg-purple-700">Got It</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={earlyClockOutDialogOpen} onOpenChange={setEarlyClockOutDialogOpen}>
        <DialogContent className="overflow-hidden border-purple-100 p-0 dark:border-purple-900 dark:bg-slate-900 sm:max-w-md">
          <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-violet-600 px-6 py-6 text-white">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm"><AlertTriangle className="h-6 w-6" /></div>
            <DialogHeader className="mt-4 text-left">
              <DialogTitle className="text-xl text-white">Clock Out Early?</DialogTitle>
              <DialogDescription className="text-purple-100">You are attempting to clock out before your scheduled out time.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-5 px-6 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-3 dark:border-purple-900 dark:bg-purple-950/20"><p className="text-xs text-slate-500 dark:text-slate-400">Current time</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{timeLabel}</p></div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-3 dark:border-purple-900 dark:bg-purple-950/20"><p className="text-xs text-slate-500 dark:text-slate-400">Scheduled out</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{currentScheduleDay && !currentScheduleDay.isOff ? `${currentScheduleDay.endDay !== currentScheduleDay.day ? `${currentScheduleDay.endDay} ` : ""}${formatScheduleTime(currentScheduleDay.endTime)}` : workingHours ? formatScheduleTime(workingHours.end_time) : "Not set"}</p></div>
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Do you still want to end your attendance session now? Your tracked time and any active break will stop immediately.</p>
            {attendanceError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{attendanceError}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" disabled={attendanceBusy} onClick={() => setEarlyClockOutDialogOpen(false)}>Keep Working</Button>
              <Button type="button" disabled={attendanceBusy} onClick={completeClockOut} className="bg-purple-600 text-white hover:bg-purple-700"><TimerReset className="mr-2 h-4 w-4" />{attendanceBusy ? "Clocking Out..." : "Clock Out Anyway"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={breakLimitDialogOpen} onOpenChange={setBreakLimitDialogOpen}>
        <DialogContent className="border-rose-200 dark:border-rose-900 dark:bg-slate-900 sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"><AlertTriangle className="h-6 w-6" /></div>
            <DialogTitle className="text-center text-rose-700 dark:text-rose-300">Your Break Time Is Out of the Limit</DialogTitle>
            <DialogDescription className="text-center">Your allowed break is {workingHours?.break_hours || 0} hours and you have used {formatTrackedMinutes(totalBreakMinutes)}. Please select “Off Break” and return to work.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3 sm:justify-center">
            <Button type="button" variant="outline" onClick={ignoreBreakLimitForToday}>Ignore For Today</Button>
            <Button type="button" onClick={() => { setBreakLimitAcknowledged(true); setBreakLimitDialogOpen(false); }} className="bg-rose-600 text-white hover:bg-rose-700">Got It</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialogOpen} onOpenChange={handleScheduleDialogOpenChange}>
        <DialogContent className="border-purple-100 dark:border-purple-900 dark:bg-slate-900 sm:max-w-xl">
          <form onSubmit={handleAddWorkSchedule}>
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{editingWorkScheduleId === null ? "Add Today’s Work Schedule" : "Edit Today’s Work Schedule"}</DialogTitle>
              <DialogDescription>
                {editingWorkScheduleId === null ? "Record when the work started and ended, what you worked on, and its current status." : "Update the time, activity, assigned task, or status for this work entry."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="work-start-time">Start time</Label>
                  <Input
                    id="work-start-time"
                    type="time"
                    value={workScheduleForm.startTime}
                    onChange={(event) => setWorkScheduleForm((form) => ({ ...form, startTime: event.target.value }))}
                    className="focus-visible:ring-purple-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work-end-time">End time</Label>
                  <Input
                    id="work-end-time"
                    type="time"
                    value={workScheduleForm.endTime}
                    onChange={(event) => setWorkScheduleForm((form) => ({ ...form, endTime: event.target.value }))}
                    className="focus-visible:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work-activity">Activity</Label>
                <Textarea
                  id="work-activity"
                  value={workScheduleForm.activity}
                  onChange={(event) => setWorkScheduleForm((form) => ({ ...form, activity: event.target.value }))}
                  placeholder="Describe the work you completed or are currently working on..."
                  className="min-h-28 resize-y focus-visible:ring-purple-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="work-assigned-task">Choose Assigned Task <span className="font-normal text-slate-400">(optional)</span></Label>
                <Select
                  value={workScheduleForm.assignedTaskId || "not-assigned"}
                  onValueChange={(value) => setWorkScheduleForm((form) => ({ ...form, assignedTaskId: value === "not-assigned" ? "" : value }))}
                  disabled={progressLoading || assignedTasks.length === 0}
                >
                  <SelectTrigger id="work-assigned-task" className="focus:ring-purple-500">
                    <SelectValue placeholder="Choose the assigned task you are working on" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-assigned">Not working on an assigned task</SelectItem>
                    {assignedTasks.map((task) => (
                      <SelectItem key={task.id} value={String(task.id)}>{task.title} · {task.priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!progressLoading && assignedTasks.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400">You do not have any assigned priorities yet.</p>}
                {assignedTasks.length > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">Select this when the work schedule entry relates to a task assigned by Super Admin.</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="work-status">Status</Label>
                <Select
                  value={workScheduleForm.status}
                  onValueChange={(value) => setWorkScheduleForm((form) => ({ ...form, status: value as WorkStatus }))}
                >
                  <SelectTrigger id="work-status" className="focus:ring-purple-500">
                    <SelectValue placeholder="Choose a work status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {workScheduleError && (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  {workScheduleError}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleScheduleDialogOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={savingWorkSchedule} className="bg-purple-600 text-white hover:bg-purple-700">
                {editingWorkScheduleId === null ? <Plus className="mr-2 h-4 w-4" /> : <Edit3 className="mr-2 h-4 w-4" />} {savingWorkSchedule ? "Saving..." : editingWorkScheduleId === null ? "Add Work Progress" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SupportLayout>
  );
}
