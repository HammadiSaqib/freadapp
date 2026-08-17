import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Slot = { time: string; start_utc: string };

export default function ManageConsultation() {
  const [params] = useSearchParams();
  const cancellationToken = params.get('cancel');
  const rescheduleToken = params.get('reschedule');
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!rescheduleToken) return;
    api.get('/api/appointments/availability', { params: { date } }).then((response) => setSlots(response.data?.data?.slots || [])).catch(() => setSlots([]));
  }, [date, rescheduleToken]);

  const cancel = async () => {
    try { await api.post(`/api/appointments/cancel/${encodeURIComponent(cancellationToken || '')}`); setMessage('Your consultation has been cancelled and the time is available again.'); }
    catch (requestError: any) { setError(requestError?.response?.data?.error || 'Unable to cancel this consultation.'); }
  };
  const reschedule = async (time: string) => {
    try { await api.post(`/api/appointments/reschedule/${encodeURIComponent(rescheduleToken || '')}`, { date, time }); setMessage(`Your consultation has been moved to ${date} at ${time}.`); }
    catch (requestError: any) { setError(requestError?.response?.data?.error || 'Unable to reschedule this consultation.'); }
  };

  return <div className="min-h-screen bg-slate-50"><SiteHeader /><main className="mx-auto max-w-2xl px-4 py-16"><Card><CardHeader><CardTitle>Manage Your Consultation</CardTitle><CardDescription>Securely cancel or select a new available 30-minute time.</CardDescription></CardHeader><CardContent className="space-y-5">{message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{message}</div> : cancellationToken ? <><p>Cancel this Zoom consultation? The slot will immediately become available to others.</p><Button variant="destructive" onClick={cancel}>Cancel Consultation</Button></> : rescheduleToken ? <><Input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{slots.map((slot) => <Button key={slot.start_utc} variant="outline" onClick={() => reschedule(slot.time)}>{new Date(slot.start_utc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Button>)}</div>{slots.length === 0 && <p className="text-sm text-slate-600">No times are available on this date.</p>}</> : <p>This management link is invalid.</p>}{error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}</CardContent></Card></main><Footer /></div>;
}
