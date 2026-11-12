import { notFound, redirect } from "next/navigation";
import { getApplication } from "@/features/applications/actions";
import { ApplicationEditor } from "@/features/applications/components/ApplicationEditor";
import { AppShell } from "@/components/AppShell";
export const metadata = { title: "Edit application" };
export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getApplication(id);
  if (!result.success) {
    if (result.error === "Unauthorized") redirect("/login");
    if (result.error === "Not found") notFound();
    throw new Error(result.error);
  }
  return (
    <AppShell>
      <ApplicationEditor application={result.data} />
    </AppShell>
  );
}
