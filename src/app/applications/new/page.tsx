import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ApplicationEditor } from "@/features/applications/components/ApplicationEditor";
export const metadata = { title: "New application" };
export default async function NewApplicationPage() {
  await requireUser();
  return (
    <AppShell>
      <ApplicationEditor />
    </AppShell>
  );
}
