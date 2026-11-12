import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ApplicationsView } from "@/features/applications/components/ApplicationsView";
import { ApplicationEditor } from "@/features/applications/components/ApplicationEditor";
import type { Application } from "@/features/applications/types";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/features/applications/statuses";
const examples: [string, string, ApplicationStatus, string | null, string][] = [
  ["Linear", "Frontend Engineer", "INTERVIEWING", "₹18–24 LPA", "2026-10-03"],
  [
    "Figma",
    "Software Engineering Intern",
    "APPLIED",
    "Not disclosed",
    "2026-10-02",
  ],
  ["Razorpay", "Full Stack Developer", "SAVED", "₹12–18 LPA", "2026-10-01"],
  ["Notion", "Product Engineer", "APPLIED", null, "2026-09-29"],
  ["Stripe", "Software Engineer", "OFFER", "₹24–32 LPA", "2026-09-28"],
  ["Vercel", "Developer Experience Intern", "INTERVIEWING", null, "2026-09-26"],
  [
    "PostHog",
    "Junior Full Stack Engineer",
    "SAVED",
    "₹10–16 LPA",
    "2026-09-25",
  ],
  ["Atlassian", "Graduate Software Engineer", "REJECTED", null, "2026-09-23"],
];
const sampleApplications: Application[] = examples.map(
  ([company, role, status, salary, date], index) => ({
    id: "sample-" + index,
    company,
    role,
    status,
    salary,
    url: "https://careers.example.com/" + company.toLowerCase(),
    jobType: /intern/i.test(role) ? "INTERN" : "FULL_TIME",
    source: "Career site",
    location: null,
    notes:
      "Sample notes: review the role requirements and keep interview preparation here.",
    appliedAt: new Date(date),
    createdAt: new Date(date),
    updatedAt: new Date(date),
    interviewDate: null,
    interviewers: null,
    meetingUrl: null,
    contacts: [],
  }),
);
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    edit?: string;
    status?: string;
    state?: string;
  }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const application = params.edit
    ? sampleApplications.find((app) => app.id === params.edit)
    : undefined;
  if (params.edit && !application) notFound();
  const status = APPLICATION_STATUSES.includes(
    params.status as ApplicationStatus,
  )
    ? (params.status as ApplicationStatus)
    : undefined;
  return (
    <AppShell preview>
      {params.view === "new" || application ? (
        <ApplicationEditor application={application} preview />
      ) : (
        <ApplicationsView
          applications={
            params.state === "empty" || params.state === "error"
              ? []
              : sampleApplications
          }
          initialStatus={status}
          error={
            params.state === "error"
              ? "We couldn’t load your applications. Check the database connection and try again."
              : undefined
          }
          preview
        />
      )}
    </AppShell>
  );
}
