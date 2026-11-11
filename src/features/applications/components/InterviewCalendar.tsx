"use client";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";

interface InterviewCalendarProps {
  company: string;
  role: string;
  interviewDate: string;
  interviewers: string;
  meetingUrl: string;
  onChangeDate: (value: string) => void;
  onChangeInterviewers: (value: string) => void;
  onChangeMeetingUrl: (value: string) => void;
  errors: Record<string, string>;
}

/** Formats a local datetime string to iCal UTC format: 20260101T090000Z */
function toICalDate(localDatetimeStr: string): string {
  if (!localDatetimeStr) return "";
  const d = new Date(localDatetimeStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00Z"
  );
}

/** Generates a 1-hour-later iCal UTC datetime string from a local datetime string */
function toICalEndDate(localDatetimeStr: string): string {
  if (!localDatetimeStr) return "";
  const d = new Date(localDatetimeStr);
  if (isNaN(d.getTime())) return "";
  d.setTime(d.getTime() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00Z"
  );
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Generates a Google Calendar "Add to Calendar" URL */
function googleCalendarUrl(params: {
  title: string;
  start: string;
  end: string;
  details: string;
  location: string;
}) {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const p = new URLSearchParams({
    text: params.title,
    dates: `${params.start}/${params.end}`,
    details: params.details,
    location: params.location,
  });
  return `${base}&${p.toString()}`;
}

/** Generates an .ics file blob URL and triggers download */
function downloadIcs(params: {
  title: string;
  start: string;
  end: string;
  description: string;
  location: string;
}) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JobTracker//JobTracker//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `DTSTART:${params.start}`,
    `DTEND:${params.end}`,
    `SUMMARY:${escapeICalText(params.title)}`,
    `DESCRIPTION:${escapeICalText(params.description)}`,
    `LOCATION:${escapeICalText(params.location)}`,
    `UID:${Date.now()}@jobtracker`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "interview.ics";
  link.click();
  URL.revokeObjectURL(url);
}

export function InterviewCalendar({
  company,
  role,
  interviewDate,
  interviewers,
  meetingUrl,
  onChangeDate,
  onChangeInterviewers,
  onChangeMeetingUrl,
  errors,
}: InterviewCalendarProps) {
  const title = `Interview: ${role || "Role"} at ${company || "Company"}`;
  const startIcal = toICalDate(interviewDate);
  const endIcal = toICalEndDate(interviewDate);

  const descriptionParts = [
    role ? `Role: ${role}` : "",
    company ? `Company: ${company}` : "",
    interviewers ? `Interviewers: ${interviewers}` : "",
    meetingUrl ? `Meeting Link: ${meetingUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const gcalUrl =
    startIcal && endIcal
      ? googleCalendarUrl({
          title,
          start: startIcal,
          end: endIcal,
          details: descriptionParts,
          location: meetingUrl || "",
        })
      : null;

  const canExport = !!startIcal;

  return (
    <div className="interview-calendar-section">
      <div className="form-grid">
        <Input
          id="interviewDate"
          label="Interview date & time"
          type="datetime-local"
          value={interviewDate}
          onChange={(e) => onChangeDate(e.target.value)}
          error={errors.interviewDate}
        />
        <Input
          id="interviewers"
          label="Interviewer(s)"
          maxLength={500}
          value={interviewers}
          onChange={(e) => onChangeInterviewers(e.target.value)}
          error={errors.interviewers}
          placeholder="Names or emails, comma-separated"
        />
        <Input
          id="meetingUrl"
          label="Meeting / video link"
          type="url"
          maxLength={2048}
          value={meetingUrl}
          onChange={(e) => onChangeMeetingUrl(e.target.value)}
          error={errors.meetingUrl}
          placeholder="https://meet.google.com/..."
        />
      </div>

      <div className="calendar-actions">
        <button
          type="button"
          className="button button-quiet"
          disabled={!canExport}
          title={
            canExport
              ? "Download .ics file"
              : "Set an interview date & time first"
          }
          onClick={() =>
            downloadIcs({
              title,
              start: startIcal,
              end: endIcal,
              description: descriptionParts,
              location: meetingUrl || "",
            })
          }
        >
          <Icon name="download" />
          Download .ics
        </button>

        {gcalUrl ? (
          <a
            className="button button-quiet"
            href={gcalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="external" />
            Add to Google Calendar
          </a>
        ) : (
          <button
            type="button"
            className="button button-quiet"
            disabled
            title="Set an interview date & time first"
          >
            <Icon name="external" />
            Add to Google Calendar
          </button>
        )}
      </div>
    </div>
  );
}
