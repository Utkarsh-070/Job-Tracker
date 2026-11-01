"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ApplicationList } from "./ApplicationList";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "../statuses";
import { applicationsCsv } from "../export";
import type { Application } from "../types";
type Props = {
  applications: Application[];
  initialStatus?: ApplicationStatus;
  error?: string;
  preview?: boolean;
};
export function ApplicationsView({
  applications,
  initialStatus,
  error,
  preview = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [status, setStatus] = useState<ApplicationStatus | undefined>(
    initialStatus,
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        APPLICATION_STATUSES.map((stage) => [
          stage,
          applications.filter((app) => app.status === stage).length,
        ]),
      ),
    [applications],
  );
  const visibleApplications = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase();
    const matchingApplications = applications.filter(
      (app) =>
        (!status || app.status === status) &&
        (!searchTerm ||
          app.company.toLocaleLowerCase().includes(searchTerm) ||
          app.role.toLocaleLowerCase().includes(searchTerm)),
    );
    return [...matchingApplications].sort((a, b) =>
      sort === "company"
        ? a.company.localeCompare(b.company)
        : sort === "oldest"
          ? +new Date(a.appliedAt) - +new Date(b.appliedAt)
          : +new Date(b.appliedAt) - +new Date(a.appliedAt),
    );
  }, [applications, query, status, sort]);
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob([applicationsCsv(visibleApplications)], {
        type: "text/csv;charset=utf-8;",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "job-tracker-applications.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  const stages = [
    { label: "All applications", value: undefined, count: applications.length },
    ...APPLICATION_STATUSES.map((stage) => ({
      label: STATUS_LABELS[stage],
      value: stage,
      count: counts[stage],
    })),
  ];
  const add = preview ? "/preview?view=new" : "/applications/new";
  const filtersActive = Boolean(status || query.trim());
  function clearFilters() {
    setQuery("");
    setStatus(undefined);
  }
  return (
    <main id="main-content" className="dashboard">
      <div className="page-heading">
        <div>
          <h1>
            Applications<span className="heading-dot">.</span>
          </h1>
          <p>A little clarity for your next big move.</p>
        </div>
        <Link className="button button-primary" href={add}>
          <Icon name="plus" />
          Add application
        </Link>
      </div>
      <div
        className="stage-index"
        role="group"
        aria-label="Filter by application stage"
      >
        {stages.map((stage) => (
          <button
            key={stage.label}
            type="button"
            className={
              status === stage.value ? "stage-tab is-active" : "stage-tab"
            }
            aria-pressed={status === stage.value}
            onClick={() => setStatus(stage.value)}
          >
            <span>{stage.label}</span>
            <strong>{error ? "—" : stage.count}</strong>
          </button>
        ))}
      </div>
      <section className="ledger" aria-label="Application ledger">
        <div className="ledger-toolbar">
          <div className="search-control">
            <Icon name="search" />
            <input
              id="search"
              type="search"
              aria-label="Search company or role"
              placeholder="Search company or role"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="toolbar-actions">
            <label className="sort-control">
              <span className="sr-only">Sort applications</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="company">Company A–Z</option>
              </select>
            </label>
            <button
              className="button button-quiet"
              onClick={exportCsv}
              disabled={!visibleApplications.length || !!error}
            >
              <Icon name="download" />
              <span>Export</span>
            </button>
          </div>
        </div>
        {error ? (
          <div className="empty-state error-state" role="alert">
            <Icon name="browser" />
            <h2>Your tracker couldn’t connect.</h2>
            <p>{error}</p>
            <button
              className="button button-secondary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : visibleApplications.length ? (
          <ApplicationList
            applications={visibleApplications}
            preview={preview}
          />
        ) : (
          <div className="empty-state">
            <Icon name={applications.length ? "search" : "file"} />
            <h2>
              {applications.length
                ? "No matches, yet."
                : "Your next chapter starts here."}
            </h2>
            <p>
              {applications.length
                ? "Try a different company or role, or clear the stage filter."
                : "Add your first application, or capture a job posting with the Chrome extension."}
            </p>
            {applications.length ? (
              <button
                className="button button-secondary"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : (
              <Link className="button button-primary" href={add}>
                <Icon name="plus" />
                Add your first application
              </Link>
            )}
          </div>
        )}
        <footer className="ledger-footer" aria-live="polite">
          <span>
            {error
              ? "Applications unavailable"
              : visibleApplications.length +
                " of " +
                applications.length +
                " applications"}
          </span>
          {filtersActive && visibleApplications.length > 0 ? (
            <button
              className="button button-quiet"
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          ) : (
            <span>Keep the details. See the possibilities.</span>
          )}
        </footer>
      </section>
      <div className="workspace-footnote">
        <span className="small-asterisk" aria-hidden="true">
          <Icon name="plus" />
        </span>
        <p>
          Found something worth pursuing?
          <br />
          <strong>Save it now. Decide when you’re ready.</strong>
        </p>
        <span>
          Built for the search.
          <br />
          And what comes next.
        </span>
      </div>
    </main>
  );
}
