"use client";
import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { ApplicationList } from "./ApplicationList";
import { OpportunityDetails } from "./OpportunityDetails";
import { isStale } from "./StaleAlert";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "../statuses";
import { applicationsCsv } from "../export";
import type { Application } from "../types";
type FilterValue = ApplicationStatus | "STALE" | undefined;
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
  const [status, setStatus] = useState<FilterValue>(initialStatus);
  const staleCount = useMemo(
    () => applications.filter(isStale).length,
    [applications],
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
        (status === undefined ||
          (status === "STALE" ? isStale(app) : app.status === status)) &&
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
  const stages: { label: string; value: FilterValue; count: number }[] = [
    { label: "All", value: undefined, count: applications.length },
    ...APPLICATION_STATUSES.map((stage) => ({
      label: STATUS_LABELS[stage],
      value: stage as FilterValue,
      count: counts[stage],
    })),
    {
      label: "Needs attention",
      value: "STALE" as FilterValue,
      count: staleCount,
    },
  ];
  const add = preview ? "/preview?view=new" : "/applications/new";
  const [selectedId, setSelectedId] = useState(applications[0]?.id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeDetail = useCallback(() => setMobileOpen(false), []);
  const selected =
    visibleApplications.find((app) => app.id === selectedId) ||
    visibleApplications[0];
  const filtersActive = Boolean(status || query.trim());
  function clearFilters() {
    setQuery("");
    setStatus(undefined);
  }
  function selectApplication(app: Application) {
    setSelectedId(app.id);
    setMobileOpen(window.matchMedia("(max-width: 760px)").matches);
  }
  return (
    <main id="main-content" className="dashboard">
      <div className="page-heading">
        <h1>Applications</h1>
        <Link className="button button-primary add-application" href={add}>
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
              "stage-tab" + (status === stage.value ? " is-active" : "")
            }
            aria-pressed={status === stage.value}
            onClick={() => setStatus(stage.value)}
          >
            <span>{stage.label}</span>
            <strong>{error ? "—" : stage.count}</strong>
          </button>
        ))}
      </div>
      <section className="ledger" aria-label="Application workspace">
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
              className="button button-secondary"
              type="button"
              onClick={exportCsv}
              disabled={!visibleApplications.length || !!error}
            >
              Export
            </button>
          </div>
        </div>
        {error ? (
          <div className="empty-state error-state" role="alert">
            <Icon name="browser" />
            <h2>Your tracker couldn’t connect.</h2>
            <p>{error}</p>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : visibleApplications.length ? (
          <div className="opportunity-workspace">
            <div className="opportunity-index">
              <div className="index-caption">
                <span>Your opportunities</span>
                <span aria-live="polite">
                  {visibleApplications.length} opportunities
                  {preview ? " · Sample data" : ""}
                </span>
              </div>
              <ApplicationList
                applications={visibleApplications}
                selectedId={selected?.id}
                onSelect={selectApplication}
              />
              <footer className="ledger-footer">
                <span>
                  {visibleApplications.length} of {applications.length}{" "}
                  applications{preview ? " · Sample data" : ""}
                </span>
                {filtersActive && (
                  <button
                    className="button button-quiet"
                    type="button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </footer>
            </div>
            {selected && (
              <OpportunityDetails
                application={selected}
                preview={preview}
                mobileOpen={mobileOpen}
                onClose={closeDetail}
              />
            )}
          </div>
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
                : "Add your first application, or capture a posting with the browser extension."}
            </p>
            {applications.length ? (
              <button
                className="button button-secondary"
                type="button"
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
      </section>
    </main>
  );
}
