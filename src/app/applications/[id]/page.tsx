import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getApplication } from "@/features/applications/actions";
import { ApplicationForm } from "@/features/applications/components/ApplicationForm";
import { DeleteApplicationButton } from "@/features/applications/components/DeleteApplicationButton";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/ui/Icon";
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
      <main id="main-content" className="form-page">
        <Link className="back-link" href="/">
          <Icon name="back" />
          All applications
        </Link>
        <div className="page-heading edit-heading">
          <div>
            <h1>
              {result.data.company}
              <span className="heading-dot">.</span>
            </h1>
            <p>Update the details of your next move.</p>
          </div>
          <DeleteApplicationButton
            id={result.data.id}
            company={result.data.company}
          />
        </div>
        <ApplicationForm application={result.data} />
      </main>
    </AppShell>
  );
}
