"use client";
import { Icon } from "@/components/ui/Icon";
import { CompanyInitial } from "./ApplicationCard";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { StaleAlert } from "./StaleAlert";
import { formatApplicationDate } from "../validation";
import type { Application } from "../types";

export function ApplicationList({
  applications,
  selectedId,
  onSelect,
}: {
  applications: Application[];
  selectedId?: string;
  onSelect: (application: Application) => void;
}) {
  return (
    <ul className="opportunity-list" aria-label="Your opportunities">
      {applications.map((app) => (
        <li
          key={app.id}
          className={
            "opportunity-row" + (selectedId === app.id ? " is-selected" : "")
          }
        >
          <button
            type="button"
            className="opportunity-select"
            aria-pressed={selectedId === app.id}
            aria-label={"View " + app.role + " at " + app.company}
            onClick={() => onSelect(app)}
          >
            <CompanyInitial company={app.company} />
            <span className="opportunity-identity">
              <strong>{app.role}</strong>
              <span>{app.company}</span>
            </span>
            <span className="opportunity-stage">
              <ApplicationStatusBadge status={app.status} />
              <time dateTime={new Date(app.appliedAt).toISOString()}>
                {formatApplicationDate(app.appliedAt)}
              </time>
            </span>
            <span className="opportunity-salary">
              {app.salary || "Not listed"}
            </span>
            <Icon name="arrow" className="opportunity-arrow" />
          </button>
          <div className="opportunity-followup">
            <StaleAlert application={app} />
          </div>
        </li>
      ))}
    </ul>
  );
}
