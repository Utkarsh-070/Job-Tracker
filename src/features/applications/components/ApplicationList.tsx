import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ApplicationCard, CompanyInitial } from "./ApplicationCard";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { formatApplicationDate } from "../validation";
import type { Application } from "../types";
export function ApplicationList({
  applications,
  preview = false,
}: {
  applications: Application[];
  preview?: boolean;
}) {
  return (
    <>
      <div className="desktop-ledger">
        <table className="applications-table">
          <caption className="sr-only">Your job applications</caption>
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Role</th>
              <th scope="col">Stage</th>
              <th scope="col">Date</th>
              <th scope="col">Salary</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                preview={preview}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-ledger">
        {applications.map((app) => (
          <article key={app.id} className="mobile-record">
            <div className="mobile-record-heading">
              <div className="company-cell">
                <CompanyInitial company={app.company} />
                <Link
                  className="company-name"
                  href={
                    preview
                      ? "/preview?edit=" + app.id
                      : "/applications/" + app.id
                  }
                >
                  {app.company}
                </Link>
              </div>
              <ApplicationStatusBadge status={app.status} />
            </div>
            <p className="mobile-role">{app.role}</p>
            <div className="mobile-record-footer">
              <span>
                {formatApplicationDate(app.appliedAt)}
                <span className="date-separator"> / </span>
                {app.salary || "Salary not listed"}
              </span>
              <Link
                className="icon-button"
                href={
                  preview
                    ? "/preview?edit=" + app.id
                    : "/applications/" + app.id
                }
                aria-label={"Edit " + app.company + " application"}
              >
                <Icon name="arrow" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
