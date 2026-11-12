import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ApplicationForm } from "./ApplicationForm";
import type { Application } from "../types";

export function ApplicationEditor({
  application,
  preview = false,
}: {
  application?: Application;
  preview?: boolean;
}) {
  return (
    <main id="main-content" className="form-page">
      <Link className="back-link" href={preview ? "/preview" : "/"}>
        <Icon name="back" />
        All applications{application ? " / " + application.company : ""}
      </Link>
      <div className="page-heading">
        <div>
          <h1>
            {application ? "Keep the details together." : "Add an application."}
          </h1>
          <p>
            {application ? "Edit application" : "A new opportunity"}
            {preview ? " · Sample data" : ""} · Required fields are marked *
          </p>
        </div>
      </div>
      <ApplicationForm application={application} preview={preview} />
    </main>
  );
}
