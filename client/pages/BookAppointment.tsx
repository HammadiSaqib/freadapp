import ConsultationBooking from '@/components/ConsultationBooking';
import Footer from '@/components/Footer';
import SiteHeader from '@/components/SiteHeader';

export default function BookAppointment() {
  return <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white"><SiteHeader /><main className="mx-auto max-w-7xl px-4 py-16 sm:px-6"><div className="mx-auto mb-10 max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-600">Talk with our team</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Book a Consultation</h1><p className="mt-4 text-lg text-slate-600">Choose an available time for a focused 30-minute Zoom conversation.</p></div><ConsultationBooking mode="public" /></main><Footer /></div>;
}
