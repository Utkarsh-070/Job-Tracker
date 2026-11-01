import type { Application } from "./types";
import { dateInput } from "./validation";
function escapeCsvCell(value: string) {
  // Prevent spreadsheet formulas from running when opening exported CSV.
  const safeValue = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return '"' + safeValue.replace(/"/g, '""') + '"';
}
export function applicationsCsv(applications: Application[]) {
  const rows = [
    ["Company", "Role", "Stage", "Date", "Salary", "URL", "Notes"],
    ...applications.map((application) => [
      application.company,
      application.role,
      application.status,
      dateInput(application.appliedAt),
      application.salary ?? "",
      application.url ?? "",
      application.notes ?? "",
    ]),
  ];
  return (
    "\uFEFF" + rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")
  );
}
