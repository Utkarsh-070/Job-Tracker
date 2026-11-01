import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/ui/Icon";
import { ApplicationForm } from "@/features/applications/components/ApplicationForm";
export const metadata = { title: "New application" };
export default async function NewApplicationPage() {
  await requireUser();
  return (
    <AppShell>
      <main id="main-content" className="form-page">
        <Link className="back-link" href="/">
          <Icon name="back" />
          All applications
        </Link>
        <div className="page-heading">
          <div>
            <h1>
              A new possibility<span className="heading-dot">.</span>
            </h1>
            <p>Add the details. Make the next move yours.</p>
          </div>
        </div>
        <ApplicationForm />
      </main>
    </AppShell>
  );
}
