"use client";
import Link from "next/link";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { createApplication, updateApplication } from "../actions";
import { JOB_TYPES, JOB_TYPE_LABELS } from "../jobTypes";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "../statuses";
import { dateInput, localDateInput, validateApplication } from "../validation";
import { DeleteApplicationButton } from "./DeleteApplicationButton";
import { InterviewCalendar } from "./InterviewCalendar";
import { ContactsSection } from "./ContactsSection";
import type { Application, ContactInput } from "../types";

export function ApplicationForm({
  application,
  preview = false,
}: {
  application?: Application;
  preview?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fields, setFields] = useState({
    company: application?.company ?? "",
    role: application?.role ?? "",
    jobType: application?.jobType ?? "",
    status: application?.status ?? "APPLIED",
    salary: application?.salary ?? "",
    url: application?.url ?? "",
    source: application?.source ?? "",
    location: application?.location ?? "",
    notes: application?.notes ?? "",
    appliedAt: application
      ? dateInput(application.appliedAt)
      : localDateInput(),
    // Calendar fields
    interviewDate: application?.interviewDate
      ? (() => {
          const d = new Date(application.interviewDate);
          const pad = (n: number) => String(n).padStart(2, "0");
          return (
            d.getFullYear() +
            "-" +
            pad(d.getMonth() + 1) +
            "-" +
            pad(d.getDate()) +
            "T" +
            pad(d.getHours()) +
            ":" +
            pad(d.getMinutes())
          );
        })()
      : "",
    interviewers: application?.interviewers ?? "",
    meetingUrl: application?.meetingUrl ?? "",
  });

  const [contacts, setContacts] = useState<ContactInput[]>(
    (application?.contacts ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      email: c.email ?? "",
      linkedinUrl: c.linkedinUrl ?? "",
      lastContactedAt: c.lastContactedAt ? dateInput(c.lastContactedAt) : "",
    })),
  );

  function updateField(key: string, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      ...fields,
      contacts,
    };
    const validated = validateApplication(payload);
    if (!validated.success) {
      setErrors(validated.fields);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setErrors({});
    setServerError("");
    if (preview) {
      setServerError(
        "This is a design preview. Open your configured tracker to save a real application.",
      );
      return;
    }
    startTransition(async () => {
      try {
        const input = {
          ...validated.data,
          status: fields.status as ApplicationStatus,
          interviewDate: fields.interviewDate || null,
          interviewers: fields.interviewers || null,
          meetingUrl: fields.meetingUrl || null,
          contacts,
        };
        const result = application
          ? await updateApplication({ id: application.id, ...input })
          : await createApplication(input);
        if (result.success) {
          router.push("/");
          router.refresh();
        } else setServerError(result.error);
      } catch {
        setServerError(
          "The connection was interrupted. Your entries are still here; please try again.",
        );
      }
    });
  }
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="application-form"
      aria-busy={isPending}
    >
      <div className="editor-columns">
        <div className="editor-main">
          <fieldset className="opportunity-fields" disabled={isPending}>
            <legend>Opportunity details</legend>
            <p className="section-description">
              The essentials. Required fields are marked with an asterisk.
            </p>
            <div className="form-grid">
              <Input
                id="company"
                label="Company *"
                required
                maxLength={200}
                value={fields.company}
                onChange={(event) => updateField("company", event.target.value)}
                error={errors.company}
                placeholder="Company name"
                autoComplete="organization"
              />
              <Input
                id="role"
                label="Role *"
                required
                maxLength={300}
                value={fields.role}
                onChange={(event) => updateField("role", event.target.value)}
                error={errors.role}
                placeholder="Job title"
              />
              <Select
                id="jobType"
                label="Job type *"
                required
                options={[
                  { value: "", label: "Select job type" },
                  ...JOB_TYPES.map((value) => ({
                    value,
                    label: JOB_TYPE_LABELS[value],
                  })),
                ]}
                value={fields.jobType}
                onChange={(event) => updateField("jobType", event.target.value)}
                error={errors.jobType}
              />
              <Select
                id="status"
                label="Application stage"
                options={APPLICATION_STATUSES.map((value) => ({
                  value,
                  label: STATUS_LABELS[value],
                }))}
                value={fields.status}
                onChange={(event) => updateField("status", event.target.value)}
                error={errors.status}
              />
              <Input
                id="appliedAt"
                label={
                  fields.status === "SAVED"
                    ? "Date saved *"
                    : "Application date *"
                }
                required
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={fields.appliedAt}
                onChange={(event) =>
                  updateField("appliedAt", event.target.value)
                }
                error={errors.appliedAt}
              />
              <Input
                id="salary"
                label="Salary / compensation"
                maxLength={200}
                value={fields.salary}
                onChange={(event) => updateField("salary", event.target.value)}
                error={errors.salary}
                placeholder="As listed, including currency"
              />
              <Input
                id="source"
                label="Job application source"
                maxLength={200}
                value={fields.source}
                onChange={(event) => updateField("source", event.target.value)}
                error={errors.source}
                placeholder="Where you found this job"
              />
              <Input
                id="location"
                label="Location"
                maxLength={200}
                value={fields.location}
                onChange={(event) =>
                  updateField("location", event.target.value)
                }
                error={errors.location}
                placeholder="N/A if remote, otherwise fill in"
              />
              <Input
                id="url"
                label="Job listing URL"
                type="url"
                maxLength={2048}
                value={fields.url}
                onChange={(event) => updateField("url", event.target.value)}
                error={errors.url}
                placeholder="https://"
              />
            </div>
          </fieldset>
          <fieldset className="notes-fields" disabled={isPending}>
            <legend>Notes</legend>
            <Textarea
              id="notes"
              label="Notes"
              maxLength={10000}
              value={fields.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="What should you remember about this opportunity?"
              error={errors.notes}
            />
          </fieldset>
        </div>
        <div className="editor-sidebar">
          <fieldset className="interview-fields" disabled={isPending}>
            <legend>Interview &amp; calendar</legend>
            <p className="section-description">
              Keep interview details with this role.
            </p>
            <InterviewCalendar
              company={fields.company}
              role={fields.role}
              interviewDate={fields.interviewDate}
              interviewers={fields.interviewers}
              meetingUrl={fields.meetingUrl}
              onChangeDate={(v) => updateField("interviewDate", v)}
              onChangeInterviewers={(v) => updateField("interviewers", v)}
              onChangeMeetingUrl={(v) => updateField("meetingUrl", v)}
              errors={errors}
            />
          </fieldset>
          <fieldset className="contact-fields" disabled={isPending}>
            <legend>Contacts</legend>
            <ContactsSection
              contacts={contacts}
              onChange={setContacts}
              errors={errors}
            />
          </fieldset>
        </div>
      </div>

      {serverError && (
        <p className="inline-error" role="alert">
          {serverError}
        </p>
      )}
      <div className="form-actions">
        <Button type="submit" disabled={isPending}>
          <Icon name="check" />
          {isPending
            ? "Saving…"
            : application
              ? "Save changes"
              : "Add application"}
        </Button>
        <Link
          className="button button-secondary"
          href={preview ? "/preview" : "/"}
          aria-disabled={isPending}
          onClick={(event) => {
            if (isPending) event.preventDefault();
          }}
        >
          Cancel
        </Link>
        {application && !preview && (
          <DeleteApplicationButton
            id={application.id}
            company={application.company}
          />
        )}
        <span>Only your account can access this record.</span>
      </div>
    </form>
  );
}
