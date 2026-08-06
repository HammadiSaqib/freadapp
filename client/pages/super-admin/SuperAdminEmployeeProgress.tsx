import { useEffect, useMemo, useState, type FormEvent } from "react";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import { superAdminApi } from "@/lib/api";
import { convertWeeklySchedule, EST_TIME_ZONE, formatScheduleTime, KARACHI_TIME_ZONE } from "@/lib/employeeSchedule";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Award,
  BellRing,
  CheckCircle2,
  CalendarClock,
  Clock3,
  Coffee,
  Edit3,
  Headphones,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  Trophy,
  UserCheck,
  UserRoundCog,
  UserX,
  Save,
} from "lucide-react";

type Priority = "Done" | "High" | "Required" | "Medium";

interface SupportUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: "active" | "inactive";
  department?: string;
  title?: string;
  last_login?: string | null;
  created_at?: string;
}

interface Announcement {
  id: number;
  title: string;
  description?: string;
  label?: string;
  created_at?: string;
}

interface EmployeeTask {
  id: number;
  title: string;
  description?: string;
  priority: Priority;
  today_only: boolean | number;
  task_date?: string | null;
}

interface AssignedAnnouncement extends Announcement {
  announcement_id?: number | null;
  is_custom: boolean | number;
}

interface EmployeeWorkHistory {
  id: number;
  workDate: string;
  startTime: string;
  endTime: string;
  activity: string;
  assignedTaskTitle?: string | null;
  status: "Completed" | "In Progress" | "Pending";
}

interface AttendanceEvent {
  id: number;
  eventType: "clock_in" | "break_start" | "break_end" | "clock_out";
  eventAt: string;
}

interface EmployeeAttendanceHistory {
  id: number;
  workDate: string;
  clockInAt: string;
  clockOutAt?: string | null;
  breakStartedAt?: string | null;
  totalBreakSeconds: number;
  status: "clocked_in" | "on_break" | "clocked_out";
  events: AttendanceEvent[];
}

interface TimeRespecterRank {
  userId: number;
  name: string;
  email: string;
  accuracy: number;
  measuredDays: number;
  perfectDays: number;
}

interface WorkRespecterRank {
  userId: number;
  name: string;
  email: string;
  completionRate: number;
  completedPriorities: number;
  totalPriorities: number;
}

interface EmployeeProgressOverview {
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  totals: {
    employees: number;
    workingSeconds: number;
    breakSeconds: number;
    attendanceDays: number;
    nonAttendanceDays: number;
    attendanceRate: number;
    timeAccuracy: number;
    completedAssignedPriorities: number;
    totalAssignedPriorities: number;
    workCompletionRate: number;
  };
  daily: Array<{
    date: string;
    day: string;
    workedHours: number;
    scheduledHours: number;
    breakHours: number;
    attendance: number;
    nonAttendance: number;
    timeAccuracy: number;
  }>;
  topTimeRespecters: TimeRespecterRank[];
  topWorkRespecters: WorkRespecterRank[];
}

const blankAnnouncement = { title: "", description: "", label: "" };
const blankTask: { title: string; description: string; priority: Priority; today_only: boolean } = {
  title: "",
  description: "",
  priority: "Medium",
  today_only: false,
};
const defaultWorkingHours = { start_time: "09:00", end_time: "17:00", off_days: ["Sunday"], break_hours: "1" };

const priorityClasses: Record<Priority, string> = {
  Done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  High: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  Required: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Medium: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
};

function initials(user: SupportUser) {
  return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "SU";
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.error || error?.message || fallback;
}

function breakHoursToSeconds(value: string) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0) return "0";
  return (hours * 3600).toLocaleString("en-US", { maximumFractionDigits: 9 });
}

function formatOverviewDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  if (safeSeconds < 60) return `${safeSeconds}s`;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatOverviewWeek(start?: string, end?: string) {
  if (!start || !end) return "Current week";
  const format = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${format(start)} – ${format(end)}`;
}

const rankTone = [
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
];

function formatAttendanceTimestamp(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatAttendanceDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function getSessionDurationSeconds(session: EmployeeAttendanceHistory) {
  const start = Date.parse(session.clockInAt);
  const end = session.clockOutAt ? Date.parse(session.clockOutAt) : Date.now();
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.floor((end - start) / 1000)) : 0;
}

function getSessionBreakSeconds(session: EmployeeAttendanceHistory) {
  const breakStartedAt = session.breakStartedAt ? Date.parse(session.breakStartedAt) : NaN;
  const activeBreakSeconds = Number.isFinite(breakStartedAt)
    ? Math.max(0, Math.floor((Date.now() - breakStartedAt) / 1000))
    : 0;
  return Number(session.totalBreakSeconds || 0) + activeBreakSeconds;
}

const attendanceEventLabels: Record<AttendanceEvent["eventType"], string> = {
  clock_in: "Clock In",
  break_start: "Break Start",
  break_end: "Break Off",
  clock_out: "Clock Out",
};

export default function SuperAdminEmployeeProgress() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<SupportUser[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [overview, setOverview] = useState<EmployeeProgressOverview | null>(null);
  const [search, setSearch] = useState("");

  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState(blankAnnouncement);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<SupportUser | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTask[]>([]);
  const [employeeAnnouncements, setEmployeeAnnouncements] = useState<AssignedAnnouncement[]>([]);
  const [employeeWorkHistory, setEmployeeWorkHistory] = useState<EmployeeWorkHistory[]>([]);
  const [employeeAttendanceHistory, setEmployeeAttendanceHistory] = useState<EmployeeAttendanceHistory[]>([]);

  const [taskForm, setTaskForm] = useState(blankTask);
  const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);
  const [savingTask, setSavingTask] = useState(false);

  const [announcementMode, setAnnouncementMode] = useState<"existing" | "custom">("existing");
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState("");
  const [customAnnouncement, setCustomAnnouncement] = useState(blankAnnouncement);
  const [assigningAnnouncement, setAssigningAnnouncement] = useState(false);
  const [workingHoursForm, setWorkingHoursForm] = useState(defaultWorkingHours);
  const [workingHoursKarachi, setWorkingHoursKarachi] = useState(false);
  const [savingWorkingHours, setSavingWorkingHours] = useState(false);

  const loadPage = async () => {
    setLoading(true);
    try {
      const [usersResponse, announcementsResponse, overviewResponse] = await Promise.all([
        superAdminApi.getSupportUsers({ page: 1, limit: 100 }),
        superAdminApi.getEmployeeAnnouncements(),
        superAdminApi.getEmployeeProgressOverview(),
      ]);
      setUsers((usersResponse.data?.data || []).map((user: any) => ({ ...user, id: Number(user.id) })));
      setAnnouncements(announcementsResponse.data?.data || []);
      setOverview(overviewResponse.data?.data || null);
    } catch (error) {
      toast({ title: "Unable to load employee progress", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user.first_name, user.last_name, user.email, user.department, user.title]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)));
  }, [search, users]);

  const openAnnouncementEditor = (announcement?: Announcement) => {
    setEditingAnnouncement(announcement || null);
    setAnnouncementForm(announcement ? {
      title: announcement.title,
      description: announcement.description || "",
      label: announcement.label || "",
    } : blankAnnouncement);
    setAnnouncementDialogOpen(true);
  };

  const saveAnnouncement = async (event: FormEvent) => {
    event.preventDefault();
    if (!announcementForm.title.trim()) return;
    setSavingAnnouncement(true);
    try {
      if (editingAnnouncement) {
        await superAdminApi.updateEmployeeAnnouncement(editingAnnouncement.id, announcementForm);
      } else {
        await superAdminApi.createEmployeeAnnouncement(announcementForm);
      }
      const response = await superAdminApi.getEmployeeAnnouncements();
      setAnnouncements(response.data?.data || []);
      setAnnouncementDialogOpen(false);
      toast({ title: editingAnnouncement ? "Announcement updated" : "Announcement created" });
    } catch (error) {
      toast({ title: "Unable to save announcement", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const deleteAnnouncement = async (announcement: Announcement) => {
    if (!window.confirm(`Delete “${announcement.title}”? It will also be removed from assigned employees.`)) return;
    try {
      await superAdminApi.deleteEmployeeAnnouncement(announcement.id);
      setAnnouncements((items) => items.filter((item) => item.id !== announcement.id));
      toast({ title: "Announcement deleted" });
    } catch (error) {
      toast({ title: "Unable to delete announcement", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    }
  };

  const loadEmployee = async (userId: number) => {
    setEmployeeLoading(true);
    try {
      const response = await superAdminApi.getEmployeeProgress(userId);
      setEmployeeTasks(response.data?.data?.tasks || []);
      setEmployeeAnnouncements(response.data?.data?.announcements || []);
      setEmployeeWorkHistory(response.data?.data?.work_history || []);
      setEmployeeAttendanceHistory(response.data?.data?.attendance_history || []);
      const hours = response.data?.data?.working_hours;
      setWorkingHoursForm(hours ? {
        start_time: hours.start_time,
        end_time: hours.end_time,
        off_days: Array.isArray(hours.off_days) ? hours.off_days : [],
        break_hours: String(hours.break_hours ?? ""),
      } : defaultWorkingHours);
    } catch (error) {
      toast({ title: "Unable to load employee", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setEmployeeLoading(false);
    }
  };

  const openEmployee = (user: SupportUser) => {
    setSelectedEmployee(user);
    setTaskForm(blankTask);
    setEditingTask(null);
    setAnnouncementMode("existing");
    setSelectedAnnouncementId("");
    setCustomAnnouncement(blankAnnouncement);
    setWorkingHoursKarachi(false);
    setManageOpen(true);
    loadEmployee(user.id);
  };

  const saveTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedEmployee || !taskForm.title.trim()) return;
    setSavingTask(true);
    try {
      if (editingTask) {
        await superAdminApi.updateEmployeeProgressTask(selectedEmployee.id, editingTask.id, taskForm);
      } else {
        await superAdminApi.createEmployeeProgressTask(selectedEmployee.id, taskForm);
      }
      await loadEmployee(selectedEmployee.id);
      setTaskForm(blankTask);
      setEditingTask(null);
      toast({ title: editingTask ? "Task updated" : "Task assigned" });
    } catch (error) {
      toast({ title: "Unable to save task", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setSavingTask(false);
    }
  };

  const editTask = (task: EmployeeTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      today_only: Boolean(task.today_only),
    });
  };

  const deleteTask = async (task: EmployeeTask) => {
    if (!selectedEmployee || !window.confirm(`Remove “${task.title}” from this employee?`)) return;
    try {
      await superAdminApi.deleteEmployeeProgressTask(selectedEmployee.id, task.id);
      setEmployeeTasks((items) => items.filter((item) => item.id !== task.id));
      if (editingTask?.id === task.id) {
        setEditingTask(null);
        setTaskForm(blankTask);
      }
      toast({ title: "Task removed" });
    } catch (error) {
      toast({ title: "Unable to remove task", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    }
  };

  const assignAnnouncement = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedEmployee) return;
    if (announcementMode === "existing" && !selectedAnnouncementId) return;
    if (announcementMode === "custom" && !customAnnouncement.title.trim()) return;
    setAssigningAnnouncement(true);
    try {
      await superAdminApi.assignEmployeeAnnouncement(
        selectedEmployee.id,
        announcementMode === "existing"
          ? { announcement_id: Number(selectedAnnouncementId) }
          : customAnnouncement,
      );
      await loadEmployee(selectedEmployee.id);
      setSelectedAnnouncementId("");
      setCustomAnnouncement(blankAnnouncement);
      toast({ title: "Announcement assigned" });
    } catch (error) {
      toast({ title: "Unable to assign announcement", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setAssigningAnnouncement(false);
    }
  };

  const removeAssignedAnnouncement = async (assignment: AssignedAnnouncement) => {
    if (!selectedEmployee || !window.confirm(`Remove “${assignment.title}” from this employee?`)) return;
    try {
      await superAdminApi.removeEmployeeAnnouncement(selectedEmployee.id, assignment.id);
      setEmployeeAnnouncements((items) => items.filter((item) => item.id !== assignment.id));
      toast({ title: "Announcement removed" });
    } catch (error) {
      toast({ title: "Unable to remove announcement", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    }
  };

  const toggleOffDay = (day: string) => {
    setWorkingHoursForm((form) => ({
      ...form,
      off_days: form.off_days.includes(day) ? form.off_days.filter((value) => value !== day) : [...form.off_days, day],
    }));
  };

  const saveWorkingHours = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedEmployee || !workingHoursForm.start_time || !workingHoursForm.end_time || workingHoursForm.break_hours === "") return;
    setSavingWorkingHours(true);
    try {
      const response = await superAdminApi.updateEmployeeWorkingHours(selectedEmployee.id, {
        start_time: workingHoursForm.start_time,
        end_time: workingHoursForm.end_time,
        off_days: workingHoursForm.off_days,
        break_hours: Number(workingHoursForm.break_hours),
      });
      const hours = response.data?.data;
      if (hours) setWorkingHoursForm({ ...hours, break_hours: String(hours.break_hours) });
      toast({ title: "Weekly working hours saved" });
    } catch (error) {
      toast({ title: "Unable to save working hours", description: getErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setSavingWorkingHours(false);
    }
  };

  const previewSchedule = convertWeeklySchedule(
    {
      start_time: workingHoursForm.start_time,
      end_time: workingHoursForm.end_time,
      off_days: workingHoursForm.off_days,
      break_hours: Number(workingHoursForm.break_hours || 0),
    },
    workingHoursKarachi ? KARACHI_TIME_ZONE : EST_TIME_ZONE,
  );

  const overviewCards = [
    { label: "Total Working Hours", value: overview ? formatOverviewDuration(overview.totals.workingSeconds) : "—", helper: "Net tracked time across all support employees", icon: Clock3, tone: "from-purple-500 to-violet-600", iconTone: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
    { label: "Total Break Hours", value: overview ? formatOverviewDuration(overview.totals.breakSeconds) : "—", helper: "All recorded breaks during this week", icon: Coffee, tone: "from-blue-500 to-cyan-500", iconTone: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
    { label: "Weekly Attendance", value: overview ? String(overview.totals.attendanceDays) : "—", helper: overview ? `${overview.totals.attendanceRate}% of elapsed scheduled shifts` : "Recorded employee attendance days", icon: UserCheck, tone: "from-emerald-500 to-teal-500", iconTone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
    { label: "Non-Attendance", value: overview ? String(overview.totals.nonAttendanceDays) : "—", helper: "Elapsed scheduled shifts with no clock-in", icon: UserX, tone: "from-rose-500 to-orange-500", iconTone: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
    { label: "Time Accuracy", value: overview ? `${overview.totals.timeAccuracy}%` : "—", helper: "Scheduled hours covered without late-in or early-out", icon: Target, tone: "from-amber-500 to-orange-500", iconTone: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
    { label: "Work Completion", value: overview ? `${overview.totals.workCompletionRate}%` : "—", helper: overview ? `${overview.totals.completedAssignedPriorities} of ${overview.totals.totalAssignedPriorities} assigned priorities completed` : "Completed assigned priorities this week", icon: CheckCircle2, tone: "from-fuchsia-500 to-purple-600", iconTone: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300" },
  ];

  return (
    <SuperAdminLayout title="Employee Progress" description="Manage support-team tasks and employee announcements.">
      <div className="space-y-6 pb-8">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-slate-950 via-purple-950 to-violet-900 px-5 py-6 text-white shadow-xl shadow-purple-950/10 dark:border-purple-900 sm:px-7">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge className="border border-white/15 bg-white/10 text-white hover:bg-white/10">Live team analytics</Badge>
                  <span className="text-xs text-purple-200">{formatOverviewWeek(overview?.weekStart, overview?.weekEnd)}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Support Team Performance Overview</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-purple-100">A real-time weekly view built from employee schedules, clock activity, recorded breaks, and dated work progress.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm"><p className="text-xs text-purple-200">Support employees</p><p className="mt-1 text-xl font-bold">{overview?.totals.employees ?? users.length}</p></div>
                <Button type="button" variant="outline" onClick={loadPage} disabled={loading} className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {overviewCards.map(({ label, value, helper, icon: Icon, tone, iconTone }) => (
              <Card key={label} className="group relative overflow-hidden border-purple-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-purple-900/50 dark:bg-slate-900">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone}`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{loading && !overview ? "Loading…" : value}</p></div><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconTone}`}><Icon className="h-5 w-5" /></span></div>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">{helper}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
              <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5 text-amber-500" /> Top Time Respecters</CardTitle><p className="mt-1 text-sm text-muted-foreground">Top five employees covering their scheduled time most accurately.</p></div><Badge variant="outline">Top 5</Badge></div></CardHeader>
              <CardContent>
                {!overview || overview.topTimeRespecters.length === 0 ? <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">Time accuracy will appear after scheduled shifts are completed.</p> : (
                  <div className="space-y-3">{overview.topTimeRespecters.map((employee, index) => <div key={employee.userId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><div className="flex items-center gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${rankTone[index]}`}>{index + 1}</span><Avatar className="h-9 w-9"><AvatarFallback className="bg-purple-100 text-xs font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300">{employee.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{employee.name}</p><span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{employee.accuracy}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${employee.accuracy}%` }} /></div><p className="mt-1.5 text-[11px] text-muted-foreground">{employee.perfectDays} perfect of {employee.measuredDays} measured day{employee.measuredDays === 1 ? "" : "s"}</p></div></div></div>)}</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
              <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-lg"><Award className="h-5 w-5 text-purple-600" /> Top Work Respecters</CardTitle><p className="mt-1 text-sm text-muted-foreground">Top five employees completing their recorded daily work.</p></div><Badge variant="outline">Top 5</Badge></div></CardHeader>
              <CardContent>
                {!overview || overview.topWorkRespecters.length === 0 ? <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">Work rankings will appear when employees add progress entries.</p> : (
                  <div className="space-y-3">{overview.topWorkRespecters.map((employee, index) => <div key={employee.userId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><div className="flex items-center gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${rankTone[index]}`}>{index + 1}</span><Avatar className="h-9 w-9"><AvatarFallback className="bg-purple-100 text-xs font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300">{employee.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{employee.name}</p><span className="text-sm font-bold text-purple-600 dark:text-purple-400">{employee.completionRate}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500" style={{ width: `${employee.completionRate}%` }} /></div><p className="mt-1.5 text-[11px] text-muted-foreground">{employee.completedPriorities} completed of {employee.totalPriorities} assigned priorit{employee.totalPriorities === 1 ? "y" : "ies"}</p></div></div></div>)}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-purple-600" /><h2 className="text-xl font-bold text-slate-950 dark:text-white">Weekly Analytics</h2></div><p className="mt-1 text-sm text-muted-foreground">Daily movement from the current week’s actual employee-progress records.</p></div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
              <CardHeader><CardTitle className="text-base">Working Hours by Day</CardTitle><p className="text-sm text-muted-foreground">Net worked hours compared with the complete scheduled capacity.</p></CardHeader>
              <CardContent><div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={overview?.daily || []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="workedHoursGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} /></linearGradient><linearGradient id="scheduledHoursGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#cbd5e1" stopOpacity={0.28} /><stop offset="95%" stopColor="#cbd5e1" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.18} /><XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} /><YAxis tickLine={false} axisLine={false} fontSize={12} unit="h" /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Area type="monotone" dataKey="scheduledHours" name="Scheduled hours" stroke="#94a3b8" strokeWidth={2} fill="url(#scheduledHoursGradient)" /><Area type="monotone" dataKey="workedHours" name="Worked hours" stroke="#7c3aed" strokeWidth={3} fill="url(#workedHoursGradient)" /><Line type="monotone" dataKey="breakHours" name="Break hours" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer></div></CardContent>
            </Card>

            <Card className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
              <CardHeader><CardTitle className="text-base">Attendance & Time Accuracy</CardTitle><p className="text-sm text-muted-foreground">Attendance days, non-attendance, and schedule-coverage accuracy.</p></CardHeader>
              <CardContent><div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={overview?.daily || []} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.18} /><XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} /><YAxis yAxisId="count" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} /><YAxis yAxisId="accuracy" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} unit="%" /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Bar yAxisId="count" dataKey="attendance" name="Attendance" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} /><Bar yAxisId="count" dataKey="nonAttendance" name="Non-attendance" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} /><Line yAxisId="accuracy" type="monotone" dataKey="timeAccuracy" name="Time accuracy %" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4, fill: "#7c3aed" }} /></ComposedChart></ResponsiveContainer></div></CardContent>
            </Card>
          </div>
        </section>

        <Card className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"><BellRing className="h-5 w-5" /></span>
              <div><CardTitle className="text-lg">Announcements For The Employee</CardTitle><p className="mt-1 text-sm text-muted-foreground">Create reusable announcements and assign them to support employees.</p></div>
            </div>
            <Button onClick={() => openAnnouncementEditor()} className="bg-purple-600 hover:bg-purple-700"><Plus className="mr-2 h-4 w-4" /> Create Announcement</Button>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <button type="button" onClick={() => openAnnouncementEditor()} className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-purple-200 px-5 py-8 text-center hover:bg-purple-50/50 dark:border-purple-800 dark:hover:bg-purple-950/20"><Plus className="mb-2 h-6 w-6 text-purple-600" /><span className="font-medium">Create your first employee announcement</span></button>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0">{announcement.label && <Badge className="mb-2 border-0 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">{announcement.label}</Badge>}<h3 className="font-semibold text-slate-900 dark:text-white">{announcement.title}</h3></div><div className="flex shrink-0"><Button variant="ghost" size="icon" onClick={() => openAnnouncementEditor(announcement)} aria-label={`Edit ${announcement.title}`}><Edit3 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteAnnouncement(announcement)} className="text-rose-600 hover:text-rose-700" aria-label={`Delete ${announcement.title}`}><Trash2 className="h-4 w-4" /></Button></div></div>
                    {announcement.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{announcement.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-purple-100 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
          <CardHeader>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><CardTitle className="flex items-center gap-2 text-lg"><Headphones className="h-5 w-5 text-purple-600" /> Support Employees</CardTitle><p className="mt-1 text-sm text-muted-foreground">Select an employee to manage tasks and announcements.</p></div><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, department, or title..." className="pl-9 focus-visible:ring-purple-500" /></div></div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="py-10 text-center text-muted-foreground">Loading support employees...</p> : filteredUsers.length === 0 ? <p className="py-10 text-center text-muted-foreground">No support employees found.</p> : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredUsers.map((user) => (
                  <button key={user.id} type="button" onClick={() => openEmployee(user)} className="rounded-xl border border-slate-200 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md dark:border-slate-800 dark:hover:border-purple-700">
                    <div className="flex items-start gap-3"><Avatar className="h-11 w-11"><AvatarFallback className="bg-purple-100 font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300">{initials(user)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-semibold text-slate-900 dark:text-white">{user.first_name} {user.last_name}</p><Badge className={`border-0 ${user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{user.status}</Badge></div><p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" />{user.email}</p><p className="mt-2 text-xs text-muted-foreground">{user.title || "Support Agent"} · {user.department || "Support Team"}</p><p className="mt-1 text-xs text-muted-foreground">Last login: {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}</p></div></div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
        <DialogContent className="dark:bg-slate-900">
          <form onSubmit={saveAnnouncement}>
            <DialogHeader><DialogTitle>{editingAnnouncement ? "Edit Announcement" : "Create Announcement"}</DialogTitle><DialogDescription>Only the title is required. Description and label are optional.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-6"><div className="space-y-2"><Label htmlFor="announcement-title">Title *</Label><Input id="announcement-title" value={announcementForm.title} onChange={(event) => setAnnouncementForm((form) => ({ ...form, title: event.target.value }))} placeholder="Announcement title" required /></div><div className="space-y-2"><Label htmlFor="announcement-description">Description</Label><Textarea id="announcement-description" value={announcementForm.description} onChange={(event) => setAnnouncementForm((form) => ({ ...form, description: event.target.value }))} placeholder="Write the announcement details..." className="min-h-28" /></div><div className="space-y-2"><Label htmlFor="announcement-label">Label</Label><Input id="announcement-label" value={announcementForm.label} onChange={(event) => setAnnouncementForm((form) => ({ ...form, label: event.target.value }))} placeholder="Example: Important, Reminder, Update" /></div></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setAnnouncementDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={savingAnnouncement || !announcementForm.title.trim()} className="bg-purple-600 hover:bg-purple-700">{savingAnnouncement ? "Saving..." : editingAnnouncement ? "Save Changes" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto dark:bg-slate-900 sm:max-w-4xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserRoundCog className="h-5 w-5 text-purple-600" /> Manage Employee</DialogTitle><DialogDescription>{selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name} · ${selectedEmployee.email}` : "Manage employee tasks and announcements."}</DialogDescription></DialogHeader>
          {employeeLoading ? <p className="py-16 text-center text-muted-foreground">Loading employee details...</p> : (
            <Tabs defaultValue="tasks" className="mt-2">
              <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4"><TabsTrigger value="tasks">Assigned Tasks</TabsTrigger><TabsTrigger value="announcements">Announcements</TabsTrigger><TabsTrigger value="hours">Weekly Hours</TabsTrigger><TabsTrigger value="history">Work History</TabsTrigger></TabsList>
              <TabsContent value="tasks" className="space-y-5 pt-4">
                <form onSubmit={saveTask} className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 dark:border-purple-900 dark:bg-purple-950/10">
                  <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">{editingTask ? "Edit Assigned Task" : "Add Daily Assigned/Task"}</h3>{editingTask && <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingTask(null); setTaskForm(blankTask); }}>Cancel edit</Button>}</div>
                  <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="task-title">Task title *</Label><Input id="task-title" value={taskForm.title} onChange={(event) => setTaskForm((form) => ({ ...form, title: event.target.value }))} placeholder="Enter the assigned task" required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="task-description">Description</Label><Textarea id="task-description" value={taskForm.description} onChange={(event) => setTaskForm((form) => ({ ...form, description: event.target.value }))} placeholder="Add instructions or details..." /></div><div className="space-y-2"><Label>Priority</Label><Select value={taskForm.priority} onValueChange={(value) => setTaskForm((form) => ({ ...form, priority: value as Priority }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["Done", "High", "Required", "Medium"] as Priority[]).map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"><div><Label htmlFor="today-only">Add task for today only</Label><p className="text-xs text-muted-foreground">Automatically hidden after today.</p></div><Switch id="today-only" checked={taskForm.today_only} onCheckedChange={(checked) => setTaskForm((form) => ({ ...form, today_only: checked }))} /></div></div>
                  <div className="mt-4 flex justify-end"><Button type="submit" disabled={savingTask || !taskForm.title.trim()} className="bg-purple-600 hover:bg-purple-700"><Plus className="mr-2 h-4 w-4" />{savingTask ? "Saving..." : editingTask ? "Save Task" : "Assign Task"}</Button></div>
                </form>
                <div className="space-y-3"><h3 className="font-semibold">All Employee Tasks</h3>{employeeTasks.length === 0 ? <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">No tasks assigned yet.</p> : employeeTasks.map((task) => <div key={task.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium">{task.title}</h4><Badge className={`border-0 ${priorityClasses[task.priority]}`}>{task.priority}</Badge>{Boolean(task.today_only) && <Badge variant="outline" className="gap-1 border-blue-200 text-blue-700"><CalendarClock className="h-3 w-3" /> Today Only</Badge>}</div>{task.description && <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>}</div><div className="flex shrink-0"><Button type="button" variant="ghost" size="icon" onClick={() => editTask(task)} aria-label={`Edit ${task.title}`}><Edit3 className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => deleteTask(task)} className="text-rose-600" aria-label={`Delete ${task.title}`}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>
              </TabsContent>
              <TabsContent value="announcements" className="space-y-5 pt-4">
                <form onSubmit={assignAnnouncement} className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 dark:border-purple-900 dark:bg-purple-950/10">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Add Announcement For Employee</h3><div className="flex rounded-lg border bg-background p-1"><Button type="button" size="sm" variant={announcementMode === "existing" ? "default" : "ghost"} onClick={() => setAnnouncementMode("existing")} className={announcementMode === "existing" ? "bg-purple-600 hover:bg-purple-700" : ""}>Choose Existing</Button><Button type="button" size="sm" variant={announcementMode === "custom" ? "default" : "ghost"} onClick={() => setAnnouncementMode("custom")} className={announcementMode === "custom" ? "bg-purple-600 hover:bg-purple-700" : ""}>Create Custom</Button></div></div>
                  {announcementMode === "existing" ? <div className="space-y-2"><Label>Existing announcement</Label><Select value={selectedAnnouncementId} onValueChange={setSelectedAnnouncementId}><SelectTrigger><SelectValue placeholder="Choose an announcement" /></SelectTrigger><SelectContent>{announcements.map((announcement) => <SelectItem key={announcement.id} value={String(announcement.id)}>{announcement.title}</SelectItem>)}</SelectContent></Select>{announcements.length === 0 && <p className="text-xs text-amber-700">Create an announcement in the page card first.</p>}</div> : <div className="grid gap-4"><div className="space-y-2"><Label htmlFor="custom-title">Title *</Label><Input id="custom-title" value={customAnnouncement.title} onChange={(event) => setCustomAnnouncement((form) => ({ ...form, title: event.target.value }))} placeholder="Custom announcement title" required /></div><div className="space-y-2"><Label htmlFor="custom-description">Description</Label><Textarea id="custom-description" value={customAnnouncement.description} onChange={(event) => setCustomAnnouncement((form) => ({ ...form, description: event.target.value }))} placeholder="Optional description..." /></div><div className="space-y-2"><Label htmlFor="custom-label">Label</Label><Input id="custom-label" value={customAnnouncement.label} onChange={(event) => setCustomAnnouncement((form) => ({ ...form, label: event.target.value }))} placeholder="Optional label" /></div></div>}
                  <div className="mt-4 flex justify-end"><Button type="submit" disabled={assigningAnnouncement || (announcementMode === "existing" ? !selectedAnnouncementId : !customAnnouncement.title.trim())} className="bg-purple-600 hover:bg-purple-700"><Plus className="mr-2 h-4 w-4" />{assigningAnnouncement ? "Assigning..." : "Assign Announcement"}</Button></div>
                </form>
                <div className="space-y-3"><h3 className="font-semibold">Employee Announcements</h3>{employeeAnnouncements.length === 0 ? <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">No announcements assigned yet.</p> : employeeAnnouncements.map((announcement) => <div key={announcement.id} className="flex items-start justify-between gap-3 rounded-xl border p-4"><div>{announcement.label && <Badge className="mb-2 border-0 bg-purple-100 text-purple-700">{announcement.label}</Badge>}<div className="flex flex-wrap items-center gap-2"><h4 className="font-medium">{announcement.title}</h4>{Boolean(announcement.is_custom) && <Badge variant="outline">Custom</Badge>}</div>{announcement.description && <p className="mt-2 text-sm text-muted-foreground">{announcement.description}</p>}</div><Button type="button" variant="ghost" size="icon" onClick={() => removeAssignedAnnouncement(announcement)} className="shrink-0 text-rose-600" aria-label={`Remove ${announcement.title}`}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
              </TabsContent>
              <TabsContent value="hours" className="pt-4">
                <form onSubmit={saveWorkingHours} className="space-y-5 rounded-xl border border-purple-100 bg-purple-50/30 p-4 dark:border-purple-900 dark:bg-purple-950/10">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div><h3 className="font-semibold">Weekly Working Hours</h3><p className="mt-1 text-xs text-muted-foreground">EST is the saved source schedule. Toggle on to preview the exact Karachi/Islamabad day and time.</p></div>
                    <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"><Label htmlFor="working-hours-timezone" className="cursor-pointer">Karachi/Islamabad Time</Label><Switch id="working-hours-timezone" checked={workingHoursKarachi} onCheckedChange={setWorkingHoursKarachi} /></div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2"><Label htmlFor="employee-in-time">In Time (EST)</Label><Input id="employee-in-time" type="time" value={workingHoursForm.start_time} onChange={(event) => setWorkingHoursForm((form) => ({ ...form, start_time: event.target.value }))} required /></div>
                    <div className="space-y-2"><Label htmlFor="employee-out-time">Out Time (EST)</Label><Input id="employee-out-time" type="time" value={workingHoursForm.end_time} onChange={(event) => setWorkingHoursForm((form) => ({ ...form, end_time: event.target.value }))} required /></div>
                    <div className="space-y-2"><Label htmlFor="employee-break-hours">Break Hours</Label><Input id="employee-break-hours" type="text" inputMode="decimal" value={workingHoursForm.break_hours} onChange={(event) => { if (/^\d*\.?\d{0,12}$/.test(event.target.value)) setWorkingHoursForm((form) => ({ ...form, break_hours: event.target.value })); }} placeholder="Example: 0.002777777778" required /><p className="text-xs text-muted-foreground">Up to 12 digits after the decimal. Current value ≈ <span className="font-medium text-slate-700 dark:text-slate-200">{breakHoursToSeconds(workingHoursForm.break_hours)} seconds</span>.</p></div>
                  </div>

                  <div className="space-y-2"><Label>Choose Weekly Off Days</Label><div className="flex flex-wrap gap-2">{previewSchedule.map((row) => <Button key={row.sourceDay} type="button" size="sm" variant={workingHoursForm.off_days.includes(row.sourceDay) ? "default" : "outline"} onClick={() => toggleOffDay(row.sourceDay)} className={workingHoursForm.off_days.includes(row.sourceDay) ? "bg-purple-600 hover:bg-purple-700" : ""}>{row.day}</Button>)}</div><p className="text-xs text-muted-foreground">Multiple off days can be selected. Day names follow the timezone toggle.</p></div>

                  <div className="overflow-hidden rounded-xl border bg-background">
                    <div className="border-b bg-slate-50 px-4 py-3 text-sm font-semibold dark:bg-slate-800">{workingHoursKarachi ? "Karachi/Islamabad schedule" : "Eastern Time schedule"}</div>
                    <div className="divide-y dark:divide-slate-800">{previewSchedule.map((row) => <div key={row.sourceDay} className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><div className="flex items-center gap-2"><span className="w-24 font-medium">{row.day}</span>{row.isOff && <Badge className="border-0 bg-rose-100 text-rose-700">Off Day</Badge>}</div><span className="text-muted-foreground">{row.isOff ? "No scheduled shift" : `${formatScheduleTime(row.startTime)} – ${row.endDay !== row.day ? `${row.endDay} ` : ""}${formatScheduleTime(row.endTime)}`}</span></div>)}</div>
                  </div>

                  <div className="flex justify-end"><Button type="submit" disabled={savingWorkingHours} className="bg-purple-600 hover:bg-purple-700"><Save className="mr-2 h-4 w-4" />{savingWorkingHours ? "Saving..." : "Save Working Hours"}</Button></div>
                </form>
              </TabsContent>
              <TabsContent value="history" className="pt-4">
                <div className="space-y-7">
                  <section className="space-y-4">
                    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">Attendance Timeline</h3><p className="mt-1 text-xs text-muted-foreground">Every clock in, break start, break off, and clock out is recorded in Eastern Time.</p></div>{selectedEmployee && <Button type="button" size="sm" variant="outline" onClick={() => loadEmployee(selectedEmployee.id)}>Refresh</Button>}</div>
                    {employeeAttendanceHistory.length === 0 ? (
                      <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">No attendance has been recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {employeeAttendanceHistory.map((session) => (
                          <div key={session.id} className="rounded-xl border border-purple-100 p-4 dark:border-purple-900/60">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div><p className="font-semibold text-slate-900 dark:text-white">{new Date(`${session.workDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><p className="mt-1 text-xs text-muted-foreground">Attendance session #{session.id}</p></div>
                              <Badge className={`border-0 ${session.status === "on_break" ? "bg-blue-100 text-blue-700" : session.status === "clocked_in" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{session.status === "on_break" ? "On Break" : session.status === "clocked_in" ? "Clocked In" : "Clocked Out"}</Badge>
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                              <div className="rounded-lg bg-purple-50/70 p-3 dark:bg-purple-950/20"><p className="text-xs text-muted-foreground">Clock In</p><p className="mt-1 text-sm font-medium">{formatAttendanceTimestamp(session.clockInAt)}</p></div>
                              <div className="rounded-lg bg-purple-50/70 p-3 dark:bg-purple-950/20"><p className="text-xs text-muted-foreground">Clock Out</p><p className="mt-1 text-sm font-medium">{session.clockOutAt ? formatAttendanceTimestamp(session.clockOutAt) : "Still active"}</p></div>
                              <div className="rounded-lg bg-purple-50/70 p-3 dark:bg-purple-950/20"><p className="text-xs text-muted-foreground">Shift Time</p><p className="mt-1 text-sm font-medium">{formatAttendanceDuration(getSessionDurationSeconds(session))}</p></div>
                              <div className="rounded-lg bg-purple-50/70 p-3 dark:bg-purple-950/20"><p className="text-xs text-muted-foreground">Break Time</p><p className="mt-1 text-sm font-medium">{formatAttendanceDuration(getSessionBreakSeconds(session))}</p></div>
                              <div className="rounded-lg bg-purple-50/70 p-3 dark:bg-purple-950/20"><p className="text-xs text-muted-foreground">Worked Time</p><p className="mt-1 text-sm font-medium">{formatAttendanceDuration(Math.max(0, getSessionDurationSeconds(session) - getSessionBreakSeconds(session)))}</p></div>
                            </div>
                            <div className="mt-4 border-l-2 border-purple-200 pl-4 dark:border-purple-800">
                              {session.events.map((event) => (
                                <div key={event.id} className="relative flex items-center justify-between gap-4 py-2 text-sm before:absolute before:-left-[21px] before:h-2.5 before:w-2.5 before:rounded-full before:bg-purple-500"><span className="font-medium text-slate-800 dark:text-slate-100">{attendanceEventLabels[event.eventType]}</span><span className="text-right text-xs text-muted-foreground">{formatAttendanceTimestamp(event.eventAt)}</span></div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-4 border-t pt-6 dark:border-slate-800">
                  <div><h3 className="font-semibold">Employee Work History</h3><p className="mt-1 text-xs text-muted-foreground">Dated schedule entries saved by this employee, newest first.</p></div>
                  {employeeWorkHistory.length === 0 ? (
                    <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">No work progress has been saved yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-800"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Activity</th><th className="px-4 py-3">Assigned Task</th><th className="px-4 py-3">Status</th></tr></thead>
                        <tbody className="divide-y dark:divide-slate-800">
                          {employeeWorkHistory.map((entry) => (
                            <tr key={entry.id}>
                              <td className="whitespace-nowrap px-4 py-3 font-medium">{new Date(`${entry.workDate}T12:00:00`).toLocaleDateString()}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatScheduleTime(entry.startTime)} – {formatScheduleTime(entry.endTime)}</td>
                              <td className="max-w-xs px-4 py-3">{entry.activity}</td>
                              <td className="px-4 py-3 text-muted-foreground">{entry.assignedTaskTitle || "—"}</td>
                              <td className="px-4 py-3"><Badge className={`border-0 ${entry.status === "Completed" ? "bg-emerald-100 text-emerald-700" : entry.status === "In Progress" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>{entry.status}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  </section>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
