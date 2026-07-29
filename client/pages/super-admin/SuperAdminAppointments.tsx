import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Plus, Save, Trash2, Video } from "lucide-react";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type AppointmentService = {
  id: number;
  name: string;
  slug: string;
  description: string;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
};

type AvailabilityRule = {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_interval_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
  team_member_name: string;
  zoom_join_url: string;
};

type BlockedDate = {
  id: number;
  blocked_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  is_active: boolean;
};

type Booking = {
  id: number;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  zoom_join_url: string | null;
  zoom_host_url: string | null;
  assigned_to: string | null;
  admin_notes: string | null;
};

const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SuperAdminAppointments() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRule[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, completed: 0, cancelled: 0 });

  const [serviceForm, setServiceForm] = useState({
    name: "",
    slug: "",
    description: "",
    duration_minutes: 30,
    is_active: true,
    sort_order: 1,
  });

  const [availabilityForm, setAvailabilityForm] = useState({
    weekday: 1,
    start_time: "09:00",
    end_time: "17:00",
    slot_interval_minutes: 30,
    buffer_minutes: 10,
    is_active: true,
    team_member_name: "CapSol Team",
    zoom_join_url: "",
  });

  const [blockedDateForm, setBlockedDateForm] = useState({
    blocked_date: "",
    start_time: "",
    end_time: "",
    reason: "Unavailable",
    is_active: true,
  });

  const [editingBooking, setEditingBooking] = useState<Record<number, { status: string; zoom_join_url: string; zoom_host_url: string; assigned_to: string; admin_notes: string }>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/appointments/admin/overview");
      const data = response.data?.data || {};
      setServices(data.services || []);
      setAvailability(data.availability || []);
      setBlockedDates(data.blocked_dates || []);
      setBookings(data.bookings || []);
      setStats({
        total: Number(data.stats?.total || 0),
        confirmed: Number(data.stats?.confirmed || 0),
        completed: Number(data.stats?.completed || 0),
        cancelled: Number(data.stats?.cancelled || 0),
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load appointment manager");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => booking.status !== "cancelled").slice(0, 20),
    [bookings],
  );

  const handleCreateService = async () => {
    try {
      setSaving(true);
      await api.post("/api/appointments/admin/services", serviceForm);
      setServiceForm({
        name: "",
        slug: "",
        description: "",
        duration_minutes: 30,
        is_active: true,
        sort_order: services.length + 1,
      });
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to create service");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAvailability = async () => {
    try {
      setSaving(true);
      await api.post("/api/appointments/admin/availability", availabilityForm);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to create availability rule");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBlockedDate = async () => {
    try {
      setSaving(true);
      await api.post("/api/appointments/admin/blocked-dates", blockedDateForm);
      setBlockedDateForm({
        blocked_date: "",
        start_time: "",
        end_time: "",
        reason: "Unavailable",
        is_active: true,
      });
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to block date");
    } finally {
      setSaving(false);
    }
  };

  const handleBookingSave = async (booking: Booking) => {
    const values = editingBooking[booking.id];
    if (!values) return;

    try {
      setSaving(true);
      await api.put(`/api/appointments/admin/bookings/${booking.id}`, values);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to update booking");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SuperAdminLayout
      title="Appointment Manager"
      description="Manage public Zoom booking services, availability, blackout dates, and booked appointments."
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading appointment manager...
        </div>
      ) : (
        <div className="space-y-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total bookings</CardDescription>
                <CardTitle className="text-3xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Confirmed</CardDescription>
                <CardTitle className="text-3xl">{stats.confirmed}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl">{stats.completed}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Cancelled</CardDescription>
                <CardTitle className="text-3xl">{stats.cancelled}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Tabs defaultValue="bookings" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="blackouts">Blackouts</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming and recent bookings</CardTitle>
                  <CardDescription>
                    Update appointment status, assign hosts, and attach Zoom links.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingBookings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                      No bookings yet.
                    </div>
                  ) : (
                    upcomingBookings.map((booking) => {
                      const currentEdit = editingBooking[booking.id] || {
                        status: booking.status,
                        zoom_join_url: booking.zoom_join_url || "",
                        zoom_host_url: booking.zoom_host_url || "",
                        assigned_to: booking.assigned_to || "",
                        admin_notes: booking.admin_notes || "",
                      };

                      return (
                        <div key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-lg font-bold text-slate-950">
                                <CalendarDays className="h-5 w-5 text-emerald-600" />
                                {booking.service_name}
                              </div>
                              <p className="text-sm text-slate-600">
                                {booking.name} • {booking.email}
                              </p>
                              <p className="text-sm text-slate-600">
                                {booking.appointment_date} at {String(booking.appointment_time).slice(0, 5)} • {booking.duration_minutes} min
                              </p>
                              {booking.notes ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                  {booking.notes}
                                </div>
                              ) : null}
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Status</Label>
                                <select
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  value={currentEdit.status}
                                  onChange={(event) =>
                                    setEditingBooking((current) => ({
                                      ...current,
                                      [booking.id]: { ...currentEdit, status: event.target.value },
                                    }))
                                  }
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                  <option value="no_show">No Show</option>
                                </select>
                              </div>

                              <div className="space-y-2">
                                <Label>Assigned to</Label>
                                <Input
                                  value={currentEdit.assigned_to}
                                  onChange={(event) =>
                                    setEditingBooking((current) => ({
                                      ...current,
                                      [booking.id]: { ...currentEdit, assigned_to: event.target.value },
                                    }))
                                  }
                                />
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                <Label>Zoom join URL</Label>
                                <Input
                                  value={currentEdit.zoom_join_url}
                                  onChange={(event) =>
                                    setEditingBooking((current) => ({
                                      ...current,
                                      [booking.id]: { ...currentEdit, zoom_join_url: event.target.value },
                                    }))
                                  }
                                />
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                <Label>Host URL</Label>
                                <Input
                                  value={currentEdit.zoom_host_url}
                                  onChange={(event) =>
                                    setEditingBooking((current) => ({
                                      ...current,
                                      [booking.id]: { ...currentEdit, zoom_host_url: event.target.value },
                                    }))
                                  }
                                />
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                <Label>Admin notes</Label>
                                <Textarea
                                  rows={3}
                                  value={currentEdit.admin_notes}
                                  onChange={(event) =>
                                    setEditingBooking((current) => ({
                                      ...current,
                                      [booking.id]: { ...currentEdit, admin_notes: event.target.value },
                                    }))
                                  }
                                />
                              </div>

                              <div className="md:col-span-2">
                                <Button
                                  onClick={() => handleBookingSave(booking)}
                                  disabled={saving}
                                  className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                                >
                                  <Save className="mr-2 h-4 w-4" />
                                  Save Booking
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create booking service</CardTitle>
                  <CardDescription>These services appear on the public booking page.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Service name</Label>
                    <Input value={serviceForm.name} onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={serviceForm.slug} onChange={(event) => setServiceForm((current) => ({ ...current, slug: event.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea rows={3} value={serviceForm.description} onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={serviceForm.duration_minutes} onChange={(event) => setServiceForm((current) => ({ ...current, duration_minutes: Number(event.target.value) || 30 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sort order</Label>
                    <Input type="number" value={serviceForm.sort_order} onChange={(event) => setServiceForm((current) => ({ ...current, sort_order: Number(event.target.value) || 1 }))} />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={handleCreateService} disabled={saving} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Service
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {services.map((service) => (
                    <div key={service.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-bold text-slate-950">{service.name}</p>
                          <p className="mt-1 text-sm text-slate-600">{service.description}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                            {service.duration_minutes} min • slug: {service.slug}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={async () => { await api.delete(`/api/appointments/admin/services/${service.id}`); await loadData(); }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="availability" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly availability</CardTitle>
                  <CardDescription>Set the days, time windows, slot spacing, host name, and recurring Zoom link.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Weekday</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={availabilityForm.weekday}
                      onChange={(event) => setAvailabilityForm((current) => ({ ...current, weekday: Number(event.target.value) }))}
                    >
                      {weekdayLabels.map((label, index) => (
                        <option key={label} value={index}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start time</Label>
                    <Input type="time" value={availabilityForm.start_time} onChange={(event) => setAvailabilityForm((current) => ({ ...current, start_time: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>End time</Label>
                    <Input type="time" value={availabilityForm.end_time} onChange={(event) => setAvailabilityForm((current) => ({ ...current, end_time: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slot interval</Label>
                    <Input type="number" value={availabilityForm.slot_interval_minutes} onChange={(event) => setAvailabilityForm((current) => ({ ...current, slot_interval_minutes: Number(event.target.value) || 30 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Buffer</Label>
                    <Input type="number" value={availabilityForm.buffer_minutes} onChange={(event) => setAvailabilityForm((current) => ({ ...current, buffer_minutes: Number(event.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Host name</Label>
                    <Input value={availabilityForm.team_member_name} onChange={(event) => setAvailabilityForm((current) => ({ ...current, team_member_name: event.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Zoom recurring URL</Label>
                    <Input value={availabilityForm.zoom_join_url} onChange={(event) => setAvailabilityForm((current) => ({ ...current, zoom_join_url: event.target.value }))} />
                  </div>
                  <div className="md:col-span-2 xl:col-span-4">
                    <Button onClick={handleCreateAvailability} disabled={saving} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                      <Video className="mr-2 h-4 w-4" />
                      Add Availability Rule
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current availability rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availability.map((rule) => (
                    <div key={rule.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-bold text-slate-950">
                            {weekdayLabels[rule.weekday]} • {String(rule.start_time).slice(0, 5)} - {String(rule.end_time).slice(0, 5)}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {rule.team_member_name} • every {rule.slot_interval_minutes} min • buffer {rule.buffer_minutes} min
                          </p>
                          {rule.zoom_join_url ? (
                            <p className="mt-2 text-xs text-slate-500 break-all">{rule.zoom_join_url}</p>
                          ) : null}
                        </div>
                        <Button variant="outline" size="sm" onClick={async () => { await api.delete(`/api/appointments/admin/availability/${rule.id}`); await loadData(); }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blackouts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Block a date or time range</CardTitle>
                  <CardDescription>Use this when your team is unavailable for all or part of a day.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={blockedDateForm.blocked_date} onChange={(event) => setBlockedDateForm((current) => ({ ...current, blocked_date: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Start time (optional)</Label>
                    <Input type="time" value={blockedDateForm.start_time} onChange={(event) => setBlockedDateForm((current) => ({ ...current, start_time: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>End time (optional)</Label>
                    <Input type="time" value={blockedDateForm.end_time} onChange={(event) => setBlockedDateForm((current) => ({ ...current, end_time: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input value={blockedDateForm.reason} onChange={(event) => setBlockedDateForm((current) => ({ ...current, reason: event.target.value }))} />
                  </div>
                  <div className="xl:col-span-4">
                    <Button onClick={handleCreateBlockedDate} disabled={saving} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Blackout
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Blackout dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {blockedDates.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-bold text-slate-950">{item.blocked_date}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.start_time && item.end_time
                              ? `${String(item.start_time).slice(0, 5)} - ${String(item.end_time).slice(0, 5)}`
                              : "Full day blocked"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{item.reason}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={async () => { await api.delete(`/api/appointments/admin/blocked-dates/${item.id}`); await loadData(); }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </SuperAdminLayout>
  );
}
