import { JOB_TYPES, type JobType } from "./jobTypes";
import { APPLICATION_STATUSES, type ApplicationStatus } from "./statuses";
import type { ContactInput } from "./types";

export const CONTACT_ROLES = [
  "RECRUITER",
  "HIRING_MANAGER",
  "REFERRER",
  "OTHER",
] as const;

export type ValidatedApplication = {
  company: string;
  role: string;
  jobType: JobType;
  status: ApplicationStatus;
  salary: string | null;
  url: string | null;
  source: string | null;
  location: string | null;
  notes: string | null;
  appliedAt: Date;
  interviewDate: Date | null;
  interviewers: string | null;
  meetingUrl: string | null;
  contacts: ContactInput[];
};
type ValidationResult =
  | { success: true; data: ValidatedApplication }
  | { success: false; error: string; fields: Record<string, string> };

export function safeJobUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function localDateInput(now = new Date()) {
  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0")
  );
}
export function dateInput(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
export function formatApplicationDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
export function validateApplication(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return {
      success: false,
      error: "Enter valid application details.",
      fields: {},
    };
  const inputFields = input as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};
  function readTextField(
    key: string,
    label: string,
    maxLength: number,
    required = false,
  ) {
    const value = inputFields[key];
    if (value != null && typeof value !== "string") {
      fieldErrors[key] = label + " must be text.";
      return "";
    }
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (required && !trimmed)
      fieldErrors[key] = "Enter a " + label.toLowerCase() + ".";
    if (trimmed.length > maxLength)
      fieldErrors[key] =
        label + " must be " + maxLength + " characters or fewer.";
    return trimmed;
  }
  const company = readTextField("company", "Company", 200, true);
  const role = readTextField("role", "Role", 300, true);
  const salary = readTextField("salary", "Salary", 200) || null;
  const url = readTextField("url", "Job URL", 2048) || null;
  const source =
    readTextField("source", "Job application source", 200) || null;
  const location = readTextField("location", "Location", 200) || null;
  const notes = readTextField("notes", "Notes", 10000) || null;
  const jobTypeValue = inputFields.jobType;
  const jobType =
    jobTypeValue == null
      ? "FULL_TIME"
      : JOB_TYPES.includes(jobTypeValue as JobType)
        ? (jobTypeValue as JobType)
        : "";
  if (!jobType) fieldErrors.jobType = "Choose a job type.";
  if (url && !safeJobUrl(url))
    fieldErrors.url =
      "Use a full http:// or https:// job link without credentials.";
  const status = inputFields.status ?? "APPLIED";
  if (!APPLICATION_STATUSES.includes(status as ApplicationStatus))
    fieldErrors.status = "Choose a valid application stage.";
  const sourceDate =
    inputFields.appliedAt instanceof Date
      ? dateInput(inputFields.appliedAt)
      : inputFields.appliedAt;
  const appliedAt =
    typeof sourceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sourceDate)
      ? new Date(sourceDate + "T00:00:00.000Z")
      : new Date(NaN);
  if (
    Number.isNaN(appliedAt.getTime()) ||
    dateInput(appliedAt) !== sourceDate ||
    appliedAt.getUTCFullYear() < 1900 ||
    appliedAt.getUTCFullYear() > 2100
  )
    fieldErrors.appliedAt = "Choose a valid date between 1900 and 2100.";
  // Interview date (optional)
  const interviewDateRaw = inputFields.interviewDate;
  let interviewDate: Date | null = null;
  if (interviewDateRaw && typeof interviewDateRaw === "string" && interviewDateRaw.trim()) {
    // Accept both date-only ("YYYY-MM-DD") and datetime-local ("YYYY-MM-DDTHH:mm") formats
    const raw = interviewDateRaw.trim();
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(raw + "T00:00:00.000Z")
      : new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      fieldErrors.interviewDate = "Choose a valid interview date.";
    } else {
      interviewDate = parsed;
    }
  } else if (interviewDateRaw instanceof Date) {
    interviewDate = interviewDateRaw;
  }

  const interviewers = readTextField("interviewers", "Interviewers", 500) || null;
  const meetingUrl = readTextField("meetingUrl", "Meeting URL", 2048) || null;
  if (meetingUrl && !safeJobUrl(meetingUrl))
    fieldErrors.meetingUrl =
      "Use a full http:// or https:// meeting link without credentials.";

  // Contacts (optional array)
  const rawContacts = inputFields.contacts;
  const contacts: ContactInput[] = [];
  if (Array.isArray(rawContacts)) {
    rawContacts.forEach((c: unknown, i: number) => {
      if (!c || typeof c !== "object") return;
      const contact = c as Record<string, unknown>;
      const name = typeof contact.name === "string" ? contact.name.trim() : "";
      if (!name) {
        fieldErrors[`contacts[${i}].name`] = "Contact name is required.";
        return;
      }
      const role = CONTACT_ROLES.includes(contact.role as typeof CONTACT_ROLES[number])
        ? (contact.role as ContactInput["role"])
        : "OTHER";
      const email =
        typeof contact.email === "string" && contact.email.trim()
          ? contact.email.trim()
          : null;
      const rawLinkedin =
        typeof contact.linkedinUrl === "string" ? contact.linkedinUrl.trim() : "";
      if (rawLinkedin && !safeJobUrl(rawLinkedin)) {
        fieldErrors[`contacts[${i}].linkedinUrl`] =
          "Use a full http:// or https:// LinkedIn URL.";
      }
      const linkedinUrl = rawLinkedin ? safeJobUrl(rawLinkedin) : null;

      let lastContactedAt: string | null = null;
      if (
        typeof contact.lastContactedAt === "string" &&
        contact.lastContactedAt.trim()
      ) {
        const dateStr = contact.lastContactedAt.trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          lastContactedAt = dateStr;
        } else {
          fieldErrors[`contacts[${i}].lastContactedAt`] =
            "Choose a valid date.";
        }
      } else if (
        contact.lastContactedAt instanceof Date &&
        !isNaN(contact.lastContactedAt.getTime())
      ) {
        lastContactedAt = dateInput(contact.lastContactedAt);
      }

      contacts.push({
        id: typeof contact.id === "string" ? contact.id : undefined,
        name,
        role,
        email,
        linkedinUrl,
        lastContactedAt,
      });
    });
  }

  if (Object.keys(fieldErrors).length)
    return {
      success: false,
      error: Object.values(fieldErrors)[0],
      fields: fieldErrors,
    };
  return {
    success: true,
    data: {
      company,
      role,
      jobType: jobType as JobType,
      status: status as ApplicationStatus,
      salary,
      url: safeJobUrl(url),
      source,
      location,
      notes,
      appliedAt,
      interviewDate,
      interviewers,
      meetingUrl,
      contacts,
    },
  };
}
