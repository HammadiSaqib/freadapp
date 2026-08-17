import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ConsultationBooking from '@/components/ConsultationBooking';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Meeting = { id: number; start_datetime_utc: string; timezone: string; status: string; meeting_reason: string; zoom_join_url?: string };

export default function AdminConsultations() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  useEffect(() => { api.get('/api/appointments/admin/my').then((response) => setMeetings(response.data?.data || [])).catch(() => setMeetings([])); }, []);
  return <DashboardLayout title="Book a Meeting With Us" description="Need help, onboarding, strategy, or support? Schedule a 30-minute Zoom meeting with our team."><div className="space-y-8"><ConsultationBooking mode="admin" /><Card><CardHeader><CardTitle>My Meetings</CardTitle></CardHeader><CardContent className="space-y-3">{meetings.length === 0 ? <p className="text-sm text-slate-600">You have no consultation history yet.</p> : meetings.map((meeting) => <div key={meeting.id} className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"><div><p className="font-semibold">{meeting.meeting_reason}</p><p className="text-sm text-slate-600">{new Date(meeting.start_datetime_utc).toLocaleString('en-US', { timeZone: meeting.timezone, dateStyle: 'medium', timeStyle: 'short' })} · {meeting.timezone}</p></div><div className="flex items-center gap-3"><Badge variant="outline">{meeting.status.replace('_', ' ')}</Badge>{meeting.status === 'confirmed' && meeting.zoom_join_url ? <a className="text-sm font-semibold text-emerald-700 hover:underline" href={meeting.zoom_join_url} target="_blank" rel="noreferrer">Join Zoom</a> : null}</div></div>)}</CardContent></Card></div></DashboardLayout>;
}
