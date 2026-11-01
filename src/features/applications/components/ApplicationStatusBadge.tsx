import { STATUS_LABELS, type ApplicationStatus } from "../statuses";
export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  return (
    <span className={"status-badge status-" + status.toLowerCase()}>
      <span className="status-dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
