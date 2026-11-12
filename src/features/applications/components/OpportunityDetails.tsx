"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { CompanyInitial } from "./ApplicationCard";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { StaleAlert } from "./StaleAlert";
import { JOB_TYPE_LABELS } from "../jobTypes";
import { formatApplicationDate, safeJobUrl } from "../validation";
import type { Application } from "../types";

export function OpportunityDetails({
  application: app,
  preview = false,
  mobileOpen,
  onClose,
}: {
  application: Application;
  preview?: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileOpen || !window.matchMedia("(max-width: 760px)").matches) return;
    const previous = document.activeElement as HTMLElement | null;
    const current = panel.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    current?.querySelector<HTMLButtonElement>(".detail-back")?.focus();
    function keyboard(event: KeyboardEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest("dialog[open]")
      )
        return;
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !current) return;
      const focusable = [
        ...current.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.getClientRects().length);
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    const viewport = window.matchMedia("(max-width: 760px)");
    const resized = () => {
      if (!viewport.matches) onClose();
    };
    viewport.addEventListener("change", resized);
    current?.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      current?.removeEventListener("keydown", keyboard);
      viewport.removeEventListener("change", resized);
      previous?.focus();
    };
  }, [mobileOpen, onClose]);
  const listing = safeJobUrl(app.url);
  return (
    <aside
      ref={panel}
      className={"opportunity-detail" + (mobileOpen ? " is-open" : "")}
      aria-label={"Opportunity details for " + app.company}
      aria-modal={mobileOpen ? true : undefined}
      role={mobileOpen ? "dialog" : undefined}
    >
      <button type="button" className="detail-back" onClick={onClose}>
        <Icon name="back" />
        Applications
      </button>
      <div className="detail-caption">
        <span>Opportunity details</span>
        <Icon name="file" />
      </div>
      <div
        className="detail-content"
        key={app.id}
        tabIndex={mobileOpen ? 0 : undefined}
        role={mobileOpen ? "region" : undefined}
        aria-label={mobileOpen ? "Application information" : undefined}
      >
        <div className="detail-company">
          <CompanyInitial company={app.company} />
          <div>
            <h2>{app.company}</h2>
            <p>
              {JOB_TYPE_LABELS[app.jobType]}
              {preview ? " · Sample data" : ""}
            </p>
          </div>
        </div>
        <h3>{app.role}</h3>
        <div className="detail-stage">
          <ApplicationStatusBadge status={app.status} />
          <StaleAlert application={app} />
        </div>
        <dl className="detail-facts">
          <div>
            <dt>Date added</dt>
            <dd>{formatApplicationDate(app.appliedAt)}</dd>
          </div>
          <div>
            <dt>Compensation</dt>
            <dd>{app.salary || "Not listed"}</dd>
          </div>
        </dl>
        <div className="detail-listing">
          <span className="detail-label">Original listing</span>
          {listing ? (
            <a href={listing} target="_blank" rel="noopener noreferrer">
              {listing.replace(/^https?:\/\//, "")}
              <Icon name="external" />
            </a>
          ) : (
            <p className="detail-muted">No listing link added.</p>
          )}
        </div>
        <div className="detail-notes">
          <span className="detail-label">Notes</span>
          <p>
            {app.notes ||
              "Keep requirements and preparation notes with this opportunity."}
          </p>
        </div>
        <dl className="detail-extras">
          <div>
            <dt>Location</dt>
            <dd>{app.location || "Not listed"}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{app.source || "Not listed"}</dd>
          </div>
          <div>
            <dt>Interview</dt>
            <dd>
              {app.interviewDate
                ? new Date(app.interviewDate).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Not scheduled"}
            </dd>
          </div>
          <div>
            <dt>Contacts</dt>
            <dd>{app.contacts.length} · Manage in Edit application</dd>
          </div>
        </dl>
      </div>
      <div className="detail-footer">
        <Link
          className="button button-primary detail-edit"
          href={preview ? "/preview?edit=" + app.id : "/applications/" + app.id}
        >
          Edit application
        </Link>
      </div>
    </aside>
  );
}
