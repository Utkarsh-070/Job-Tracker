import { redirect } from "next/navigation";
import { getApplications } from "@/features/applications/actions";
import { ApplicationsView } from "@/features/applications/components/ApplicationsView";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/features/applications/statuses";
import { AppShell } from "@/components/AppShell";
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = APPLICATION_STATUSES.includes(
    params.status as ApplicationStatus,
  )
    ? (params.status as ApplicationStatus)
    : undefined;
  const result = await getApplications();
  if (!result.success && result.error === "Unauthorized") redirect("/login");
  return (
    <AppShell>
      <ApplicationsView
        applications={result.success ? result.data : []}
        initialStatus={status}
        error={result.success ? undefined : result.error}
      />
    </AppShell>
  );
}
