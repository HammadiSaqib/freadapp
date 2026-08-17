import { emailService } from './emailService.js';
import { formatAppointmentInTimezone } from './consultationAvailability.js';

type AppointmentEmail = {
  name: string;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  meeting_reason: string;
  notes?: string | null;
  booking_source: string;
  start_datetime_utc: string | Date;
  timezone: string;
  zoom_join_url: string;
  zoom_start_url?: string | null;
  zoom_meeting_id?: string | null;
  cancellationToken?: string;
  rescheduleToken?: string;
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char);

export async function sendConsultationEmails(appointment: AppointmentEmail) {
  const when = formatAppointmentInTimezone(appointment.start_datetime_utc, appointment.timezone);
  const baseUrl = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://thescoremachine.com').replace(/\/$/, '');
  const manageLinks = appointment.cancellationToken && appointment.rescheduleToken
    ? `<p><a href="${baseUrl}/manage-consultation?cancel=${appointment.cancellationToken}">Cancel</a> · <a href="${baseUrl}/manage-consultation?reschedule=${appointment.rescheduleToken}">Reschedule</a></p>`
    : '';
  const customerHtml = `<h2>Your Consultation Is Confirmed</h2><p>Hello ${escapeHtml(appointment.name)},</p><p>Your 30-minute Zoom consultation is scheduled.</p><ul><li><strong>Date and time:</strong> ${escapeHtml(when)}</li><li><strong>Timezone:</strong> ${escapeHtml(appointment.timezone)}</li><li><strong>Reason:</strong> ${escapeHtml(appointment.meeting_reason)}</li></ul><p><a href="${escapeHtml(appointment.zoom_join_url)}">Join Zoom Meeting</a></p>${manageLinks}`;
  const internalRecipient = process.env.CONSULTATION_NOTIFICATION_EMAIL || process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;
  const internalHtml = `<h2>New Consultation Booking</h2><ul><li><strong>Source:</strong> ${escapeHtml(appointment.booking_source)}</li><li><strong>Name:</strong> ${escapeHtml(appointment.name)}</li><li><strong>Company:</strong> ${escapeHtml(appointment.company_name)}</li><li><strong>Email:</strong> ${escapeHtml(appointment.email)}</li><li><strong>Phone:</strong> ${escapeHtml(appointment.phone)}</li><li><strong>Date and time:</strong> ${escapeHtml(when)}</li><li><strong>Timezone:</strong> ${escapeHtml(appointment.timezone)}</li><li><strong>Reason:</strong> ${escapeHtml(appointment.meeting_reason)}</li><li><strong>Notes:</strong> ${escapeHtml(appointment.notes)}</li><li><strong>Zoom meeting ID:</strong> ${escapeHtml(appointment.zoom_meeting_id)}</li><li><strong>Host link:</strong> <a href="${escapeHtml(appointment.zoom_start_url)}">Start Zoom meeting</a></li></ul>`;
  const customerSent = await emailService.sendEmail({ to: appointment.email, subject: 'Your Consultation Is Confirmed', html: customerHtml, allowDevelopmentFallback: false });
  const internalSent = internalRecipient
    ? await emailService.sendEmail({ to: internalRecipient, subject: `New Consultation – ${appointment.name}`, html: internalHtml, allowDevelopmentFallback: false })
    : false;
  return { customerSent, internalSent };
}

export async function sendConsultationChangeEmails(appointment: AppointmentEmail, change: 'cancelled' | 'rescheduled') {
  const when = formatAppointmentInTimezone(appointment.start_datetime_utc, appointment.timezone);
  const title = change === 'cancelled' ? 'Your Consultation Was Cancelled' : 'Your Consultation Was Rescheduled';
  const join = change === 'rescheduled' ? `<p><a href="${escapeHtml(appointment.zoom_join_url)}">Join Zoom Meeting</a></p>` : '';
  const customerHtml = `<h2>${title}</h2><p>Hello ${escapeHtml(appointment.name)},</p><p>Your consultation has been ${change}.</p><p><strong>Date and time:</strong> ${escapeHtml(when)}<br><strong>Timezone:</strong> ${escapeHtml(appointment.timezone)}<br><strong>Duration:</strong> 30 Minutes</p>${join}`;
  const internalRecipient = process.env.CONSULTATION_NOTIFICATION_EMAIL || process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;
  const internalHtml = `<h2>Consultation ${change}</h2><p>${escapeHtml(appointment.name)} (${escapeHtml(appointment.email)})</p><p>${escapeHtml(when)} · ${escapeHtml(appointment.timezone)}</p><p>Source: ${escapeHtml(appointment.booking_source)} · Zoom meeting ID: ${escapeHtml(appointment.zoom_meeting_id)}</p>`;
  await Promise.allSettled([
    emailService.sendEmail({ to: appointment.email, subject: title, html: customerHtml, allowDevelopmentFallback: false }),
    ...(internalRecipient ? [emailService.sendEmail({ to: internalRecipient, subject: `${title} – ${appointment.name}`, html: internalHtml, allowDevelopmentFallback: false })] : []),
  ]);
}
