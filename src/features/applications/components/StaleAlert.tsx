"use client";
import { useState } from "react";
import type { Application } from "../types";
import { FollowUpTemplate } from "./FollowUpTemplate";

/** Number of days after which an APPLIED/INTERVIEWING application is "stale". */
export const STALE_DAYS = 10;

export function isStale(app: Application): boolean {
  if (app.status !== "APPLIED" && app.status !== "INTERVIEWING") return false;
  const ms = Date.now() - new Date(app.appliedAt).getTime();
  return ms >= STALE_DAYS * 24 * 60 * 60 * 1000;
}

export function staleDays(app: Application): number {
  return Math.floor(
    (Date.now() - new Date(app.appliedAt).getTime()) / (24 * 60 * 60 * 1000),
  );
}

export function StaleAlert({ application }: { application: Application }) {
  const [open, setOpen] = useState(false);

  if (!isStale(application)) return null;

  const days = staleDays(application);

  return (
    <>
      <button
        type="button"
        className="stale-badge"
        onClick={() => setOpen(true)}
        title="No response — click to generate a follow-up email"
        aria-label={`No response in ${days} days. Click to generate a follow-up email.`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        {days}d
      </button>
      {open && (
        <FollowUpTemplate
          application={application}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

