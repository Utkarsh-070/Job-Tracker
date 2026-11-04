import { JOB_TYPE_LABELS } from "./jobTypes";
import type { Application } from "./types";
import { dateInput } from "./validation";
function escapeCsvCell(value: string) {
  // Prevent spreadsheet formulas from running when opening exported CSV.
  const safeValue = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return '"' + safeValue.replace(/"/g, '""') + '"';
}
export function applicationsCsv(applications: Application[]) {
  const rows = [
    [
      "Company",
      "Role",
      "Job type",
      "Stage",
      "Date",
      "Salary",
      "URL",
      "Source",
      "Location",
      "Notes",
    ],
    ...applications.map((application) => [
      application.company,
      application.role,
      JOB_TYPE_LABELS[application.jobType],
      application.status,
      dateInput(application.appliedAt),
      application.salary ?? "",
      application.url ?? "",
      application.source ?? "",
      application.location ?? "",
      application.notes ?? "",
    ]),
  ];
  return (
    "\uFEFF" + rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")
  );
}
