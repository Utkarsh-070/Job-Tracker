import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { StaleAlert } from "./StaleAlert";
import { formatApplicationDate, safeJobUrl } from "../validation";
import type { Application } from "../types";
export function CompanyInitial({ company }: { company: string }) {
  const value = Array.from(company.trim())[0]?.toLocaleUpperCase() || "?";
  const tone =
    Array.from(company).reduce(
      (total, letter) => total + letter.charCodeAt(0),
      0,
    ) % 4;
  return (
    <span aria-hidden="true" className={"company-initial tone-" + tone}>
      {value}
    </span>
  );
}
export function ApplicationCard({
  application: app,
  preview = false,
}: {
  application: Application;
  preview?: boolean;
}) {
  const detail = preview
    ? "/preview?edit=" + app.id
    : "/applications/" + app.id;
  const url = safeJobUrl(app.url);
  return (
    <tr>
      <td>
        <div className="company-cell">
          <CompanyInitial company={app.company} />
          <Link className="company-name" href={detail}>
            {app.company}
          </Link>
        </div>
      </td>
      <td className="role-cell">{app.role}</td>
      <td>
        <ApplicationStatusBadge status={app.status} />
      </td>
      <td className="date-cell">
        <time dateTime={new Date(app.appliedAt).toISOString()}>
          {formatApplicationDate(app.appliedAt)}
        </time>
        <StaleAlert application={app} />
      </td>
      <td className="salary-cell">{app.salary || "Not listed"}</td>
      <td>
        <div className="row-actions">
          {url && (
            <a
              className="icon-button"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={"Open " + app.company + " job listing"}
            >
              <Icon name="external" />
            </a>
          )}
          <Link
            className="icon-button"
            href={detail}
            aria-label={"Edit " + app.company + " application"}
          >
            <Icon name="arrow" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
