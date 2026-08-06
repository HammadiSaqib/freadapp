import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { CalendarDays, CheckCircle2, Clock3, Loader2, PhoneCall, Video } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AppointmentService = {
  id: number;
  name: string;
  slug: string;
  description: string;
  duration_minutes: number;
};

type AppointmentSlot = {
  availability_id: number;
  date: string;
  time: string;
  end_time: string;
  label: string;
  team_member_name: string;
};

type BookingConfirmation = {
  id: number | null;
  status: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  zoom_join_url: string | null;
  assigned_to: string;
};

function getNextBusinessDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().slice(0, 10);
}

export default function BookAppointment() {
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(getNextBusinessDate);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [timezoneLabel, setTimezoneLabel] = useState("Eastern Time (ET)");
  const [bookingNotice, setBookingNotice] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoadingConfig(true);
        setError("");
        const response = await fetch("/api/appointments/public/config");
        const payload = await response.json();
        if (!payload?.success) {
          throw new Error(payload?.error || "Failed to load booking page");
        }

        const nextServices = payload.data?.services || [];
        setServices(nextServices);
        setSelectedServiceId(nextServices[0]?.id ?? null);
        setTimezoneLabel(payload.data?.timezone_label || "Eastern Time (ET)");
        setBookingNotice(payload.data?.booking_notice || "");
      } catch (err: any) {
        setError(err?.message || "Failed to load booking page");
      } finally {
        setLoadingConfig(false);
      }
    };

    void loadConfig();
  }, []);

  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedServiceId || !selectedDate) return;

      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        setError("");
        const response = await fetch(`/api/appointments/public/slots?date=${selectedDate}&serviceId=${selectedServiceId}`);
        const payload = await response.json();
        if (!payload?.success) {
          throw new Error(payload?.error || "Failed to load available slots");
        }
        setSlots(payload.data?.slots || []);
      } catch (err: any) {
        setSlots([]);
        setError(err?.message || "Failed to load available slots");
      } finally {
        setLoadingSlots(false);
      }
    };

    void loadSlots();
  }, [selectedDate, selectedServiceId]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) || null,
    [services, selectedServiceId],
  );

  const handleBook = async () => {
    if (!selectedServiceId || !selectedSlot) {
      setError("Please choose an available time slot first.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await fetch("/api/appointments/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: selectedServiceId,
          appointment_date: selectedDate,
          appointment_time: selectedSlot.time,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
          ...form,
        }),
      });

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.error || "Failed to book appointment");
      }

      setConfirmation(payload.data);
    } catch (err: any) {
      setError(err?.message || "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Helmet>
        <title>Book Appointment | CapSol</title>
        <meta
          name="description"
          content="Book a Zoom appointment with the CapSol team for a walkthrough, consultation, or funding strategy session."
        />
      </Helmet>

      <SiteHeader />

      <main className="bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.12),transparent_24%),linear-gradient(180deg,#f8fffe_0%,#ffffff_35%,#f4fbf8_100%)]">
        <section className="container mx-auto px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
                Book Appointment
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Schedule a Zoom call with the CapSol team
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Pick a service, choose an available time, and reserve your walkthrough or strategy session directly from our website.
              </p>
            </div>

            {confirmation ? (
              <Card className="border-emerald-200 bg-white shadow-xl shadow-emerald-100/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Your appointment is booked</CardTitle>
                      <CardDescription>
                        We reserved your spot and saved the meeting details below.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Service</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{confirmation.service_name}</p>
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Date & Time</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {confirmation.appointment_date} at {confirmation.appointment_time}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Duration: {confirmation.duration_minutes} minutes
                    </p>
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Assigned Team Member</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{confirmation.assigned_to}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Meeting Access</p>
                    {confirmation.zoom_join_url ? (
                      <>
                        <p className="mt-2 text-sm text-slate-600">
                          Your Zoom meeting link is ready now.
                        </p>
                        <Button className="mt-4 bg-emerald-500 text-slate-950 hover:bg-emerald-400" asChild>
                          <a href={confirmation.zoom_join_url} target="_blank" rel="noreferrer">
                            Join Zoom Meeting
                          </a>
                        </Button>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">
                        Your team will share the Zoom link shortly using the contact details you submitted.
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="mt-4 border-slate-300 bg-white"
                      onClick={() => {
                        setConfirmation(null);
                        setForm({ name: "", email: "", phone: "", company: "", notes: "" });
                      }}
                    >
                      Book another appointment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
                <Card className="border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                  <CardHeader>
                    <CardTitle className="text-2xl">Choose your appointment</CardTitle>
                    <CardDescription>
                      All times shown are based on {timezoneLabel}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {loadingConfig ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading booking options...
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <Label>Select service</Label>
                          <div className="grid gap-3">
                            {services.map((service) => (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => setSelectedServiceId(service.id)}
                                className={`rounded-2xl border p-4 text-left transition ${
                                  selectedServiceId === service.id
                                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-base font-bold text-slate-950">{service.name}</p>
                                    <p className="mt-1 text-sm text-slate-600">{service.description}</p>
                                  </div>
                                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                    {service.duration_minutes} min
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-3">
                            <Label htmlFor="appointment-date">Select date</Label>
                            <Input
                              id="appointment-date"
                              type="date"
                              min={getNextBusinessDate()}
                              value={selectedDate}
                              onChange={(event) => setSelectedDate(event.target.value)}
                            />
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center gap-3 text-sm text-slate-700">
                              <CalendarDays className="h-4 w-4 text-emerald-600" />
                              {bookingNotice || "Choose a date to see available appointment times."}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label>Available slots</Label>
                          {loadingSlots ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Checking availability...
                            </div>
                          ) : slots.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                              No open slots found for this date. Try another day.
                            </div>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {slots.map((slot) => (
                                <button
                                  key={`${slot.date}-${slot.time}-${slot.availability_id}`}
                                  type="button"
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`rounded-2xl border p-4 text-left transition ${
                                    selectedSlot?.time === slot.time && selectedSlot?.availability_id === slot.availability_id
                                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                    <Clock3 className="h-4 w-4 text-emerald-600" />
                                    {slot.label}
                                  </div>
                                  <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">Host</p>
                                  <p className="mt-1 text-sm text-slate-700">{slot.team_member_name}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                  <CardHeader>
                    <CardTitle className="text-2xl">Your details</CardTitle>
                    <CardDescription>
                      We’ll use these details to confirm the appointment and send meeting access.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="booking-name">Full name</Label>
                        <Input
                          id="booking-name"
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="booking-email">Email</Label>
                        <Input
                          id="booking-email"
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="booking-phone">Phone</Label>
                        <Input
                          id="booking-phone"
                          value={form.phone}
                          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="booking-company">Company</Label>
                        <Input
                          id="booking-company"
                          value={form.company}
                          onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="booking-notes">What would you like to cover?</Label>
                      <Textarea
                        id="booking-notes"
                        rows={5}
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Tell us about your business, deal, goals, or the walkthrough you want."
                      />
                    </div>

                    {selectedService && selectedSlot && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Selected Appointment</p>
                        <p className="mt-2 text-base font-bold text-slate-950">{selectedService.name}</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {selectedDate} at {selectedSlot.time} • {selectedService.duration_minutes} min
                        </p>
                      </div>
                    )}

                    {error ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                      </div>
                    ) : null}

                    <Button
                      onClick={handleBook}
                      disabled={submitting || loadingConfig || !selectedSlot || !form.name || !form.email}
                      className="h-12 w-full bg-emerald-500 text-base font-bold text-slate-950 hover:bg-emerald-400"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Booking appointment...
                        </>
                      ) : (
                        "Confirm Appointment"
                      )}
                    </Button>

                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <div className="flex items-start gap-3">
                        <Video className="mt-0.5 h-4 w-4 text-emerald-600" />
                        Zoom link support is built in, so your team can send or attach meeting links directly.
                      </div>
                      <div className="flex items-start gap-3">
                        <PhoneCall className="mt-0.5 h-4 w-4 text-emerald-600" />
                        Need help booking? Use the contact page or call the business line on the website.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
