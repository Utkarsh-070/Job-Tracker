import type { JobDraft, ValidatedDraft, TrackerSettings } from "./types.ts";

export function today(now = new Date()) {
  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0")
  );
}
export function validateSettings(appUrl: string): TrackerSettings {
  let url;
  try {
    url = new URL(appUrl.trim());
  } catch {
    throw new Error(
      "Enter a full app URL, such as https://your-tracker.vercel.app.",
    );
  }
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    throw new Error("Use HTTPS, or HTTP for a local development tracker.");
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  )
    throw new Error(
      "Use the app’s root URL without a path, credentials, query, or fragment.",
    );
  return { appUrl: url.origin };
}
export function permissionPattern(appUrl: string): string {
  const url = new URL(appUrl);
  return url.protocol + "//" + url.hostname + "/*";
}
export function validateDraft(draft: JobDraft): ValidatedDraft {
  if (!draft.company.trim() || draft.company.length > 200)
    throw new Error("Enter a company name of 200 characters or fewer.");
  if (!draft.role.trim() || draft.role.length > 300)
    throw new Error("Enter a role of 300 characters or fewer.");
  if (draft.salary.length > 200 || draft.notes.length > 10000)
    throw new Error("Shorten the salary or notes before saving.");
  if (draft.location && draft.location.length > 200)
    throw new Error("Shorten the location to 200 characters or fewer.");
  if (draft.source && draft.source.length > 200)
    throw new Error("Shorten the source to 200 characters or fewer.");
  if (draft.jobType && !["INTERN", "FULL_TIME"].includes(draft.jobType))
    throw new Error("Job type must be Intern or Full-Time.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.appliedAt))
    throw new Error("Choose a valid date.");
  const date = new Date(draft.appliedAt + "T00:00:00Z");
  if (
    Number.isNaN(+date) ||
    date.toISOString().slice(0, 10) !== draft.appliedAt ||
    date.getUTCFullYear() < 1900 ||
    date.getUTCFullYear() > 2100
  )
    throw new Error("Choose a valid date between 1900 and 2100.");
  if (draft.url) {
    let url;
    try {
      url = new URL(draft.url);
    } catch {
      throw new Error("Use a full http:// or https:// job link.");
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      draft.url.length > 2048
    )
      throw new Error(
        "Use a full http:// or https:// job link without credentials.",
      );
  }
  return {
    company: draft.company.trim(),
    role: draft.role.trim(),
    appliedAt: draft.appliedAt,
    salary: draft.salary.trim() || null,
    notes: draft.notes.trim() || null,
    url: draft.url.trim() || null,
    location: draft.location.trim() || null,
    jobType: draft.jobType || "FULL_TIME",
    source: draft.source.trim() || null,
  };
}
