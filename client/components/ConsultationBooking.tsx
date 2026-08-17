import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Loader2, Video } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Slot = { date: string; time: string; end_time: string; start_utc: string; end_utc: string };
type Confirmation = { appointment: { name: string; start_datetime_utc: string; timezone: string; status: string; zoom_join_url: string; meeting_reason: string } };

const nextDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function ConsultationBooking({ mode }: { mode: 'public' | 'admin' }) {
  const { userProfile } = useAuthContext();
  const [timezone, setTimezone] = useState('America/New_York');
  const [date, setDate] = useState(nextDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company_name: '', meeting_reason: '', notes: '' });

  useEffect(() => {
    if (mode === 'admin' && userProfile) {
      setForm((current) => ({
        ...current,
        name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim(),
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        company_name: userProfile.company_name || '',
      }));
    }
  }, [mode, userProfile]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelected(null);
    setError('');
    Promise.all([
      api.get('/api/appointments/config'),
      api.get('/api/appointments/availability', { params: { date } }),
    ]).then(([configResponse, slotsResponse]) => {
      if (!active) return;
      setTimezone(configResponse.data?.data?.timezone || 'America/New_York');
      setSlots(slotsResponse.data?.data?.slots || []);
    }).catch((requestError: any) => {
      if (active) setError(requestError?.response?.data?.error || 'Unable to load availability.');
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [date]);

  const localTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const scheduleLabel = useMemo(() => timezone.replace(/_/g, ' '), [timezone]);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      const common = { date, time: selected.time, meeting_reason: form.meeting_reason, notes: form.notes, idempotency_key: idempotencyKey };
      const payload = mode === 'public' ? { ...common, name: form.name, email: form.email, phone: form.phone, company_name: form.company_name } : common;
      const response = await api.post(`/api/appointments/${mode}/book`, payload);
      setConfirmation(response.data.data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'Unable to book this consultation.');
      if (requestError?.response?.status === 409) {
        setSelected(null);
        const response = await api.get('/api/appointments/availability', { params: { date } });
        setSlots(response.data?.data?.slots || []);
        setIdempotencyKey(newIdempotencyKey());
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    const appointment = confirmation.appointment;
    return (
      <Card className="mx-auto max-w-2xl border-emerald-200 shadow-xl">
        <CardContent className="space-y-5 p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <div><h2 className="text-3xl font-bold text-slate-950">{mode === 'public' ? 'Your Consultation Is Scheduled' : 'Your Meeting Is Confirmed'}</h2><p className="mt-2 text-slate-600">A confirmation has been sent to your email.</p></div>
          <div className="rounded-2xl bg-slate-50 p-5 text-left text-sm text-slate-700">
            <p><strong>Name:</strong> {appointment.name}</p>
            <p><strong>Date and time:</strong> {new Date(appointment.start_datetime_utc).toLocaleString('en-US', { timeZone: appointment.timezone, dateStyle: 'full', timeStyle: 'short' })}</p>
            <p><strong>Timezone:</strong> {appointment.timezone}</p>
            <p><strong>Duration:</strong> 30 Minutes</p>
            <p><strong>Status:</strong> Confirmed</p>
          </div>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700"><a href={appointment.zoom_join_url} target="_blank" rel="noreferrer"><Video className="mr-2 h-4 w-4" />Open Zoom Join Link</a></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <Card className="border-slate-200 shadow-lg">
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-600" />1. Select a date and time</CardTitle><CardDescription>All appointments are 30-minute Zoom consultations. Times are controlled in {scheduleLabel}.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2"><Label htmlFor="consultation-date">Date</Label><Input id="consultation-date" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><strong>Times shown in {timezone}.</strong>{localTimezone !== timezone ? ` Your local timezone is ${localTimezone}.` : ''}</div>
          {loading ? <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Checking availability…</div> : slots.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-sm text-slate-600">No available times on this date. Please select another day.</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{slots.map((slot) => {
            const local = new Date(slot.start_utc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: localTimezone });
            const scheduleTime = new Date(slot.start_utc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone });
            return <button type="button" key={slot.start_utc} onClick={() => setSelected(slot)} className={`rounded-xl border p-3 text-left transition ${selected?.start_utc === slot.start_utc ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-emerald-300'}`}><span className="flex items-center gap-1 font-semibold"><Clock3 className="h-4 w-4" />{scheduleTime}</span>{localTimezone !== timezone && <span className="mt-1 block text-xs text-slate-500">{local} local</span>}</button>;
          })}</div>}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-lg">
        <CardHeader><CardTitle>2. {mode === 'public' ? 'Your information' : 'Meeting details'}</CardTitle><CardDescription>{mode === 'admin' ? 'Your saved profile information will be used for the invitation.' : 'Tell us how to reach you and what you would like to discuss.'}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {mode === 'public' ? <><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-2"><Label>Email address</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Phone number</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div className="space-y-2"><Label>Company (optional)</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div></div></> : <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">{form.name || 'Your profile'}</p><p>{form.email}</p><p>{form.company_name}</p>{!form.phone && <p className="mt-2 text-amber-700">A valid phone number is required in your profile.</p>}</div>}
          <div className="space-y-2"><Label>Reason for meeting</Label><Input value={form.meeting_reason} onChange={(e) => setForm({ ...form, meeting_reason: e.target.value })} placeholder="Onboarding, support, strategy…" /></div>
          <div className="space-y-2"><Label>Notes (optional)</Label><Textarea rows={5} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What would you like our team to prepare for?" /></div>
          {selected && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm"><strong>Selected:</strong> {date} at {new Date(selected.start_utc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })} ({timezone}) · 30 minutes</div>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <Button className="h-12 w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitting || !selected || !form.meeting_reason || (mode === 'public' && (!form.name || !form.email || !form.phone)) || (mode === 'admin' && !form.phone)} onClick={submit}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Zoom meeting…</> : 'Book Meeting'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
