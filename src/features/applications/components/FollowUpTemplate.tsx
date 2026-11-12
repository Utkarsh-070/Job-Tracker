"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatApplicationDate } from "../validation";
import type { Application } from "../types";

function buildTemplate(app: Application) {
  return [
    `Subject: Following up on my ${app.role} application – ${app.company}`,
    "",
    "Hi [Hiring Manager's name],",
    "",
    `I wanted to follow up on my application for the ${app.role} position at ${app.company}, submitted on ${formatApplicationDate(app.appliedAt)}.`,
    "",
    "I’m still interested in the opportunity and would appreciate any update on next steps. Please let me know if I can provide anything else.",
    "",
    "Thank you for your time.",
    "",
    "Best regards,",
    "[Your name]",
  ].join("\n");
}
export function FollowUpTemplate({
  application,
  onClose,
}: {
  application: Application;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => buildTemplate(application));
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setMessage("Copied to clipboard.");
    } catch {
      document
        .querySelector<HTMLTextAreaElement>("#followup-textarea")
        ?.select();
      setMessage(
        "Select and copy the text using Ctrl+C or your device’s Copy action.",
      );
    }
  }
  return (
    <Modal open onClose={onClose} title="Follow-up email">
      <p className="followup-hint">
        Edit this draft, then copy it into your email client.
      </p>
      <textarea
        id="followup-textarea"
        className="form-control followup-textarea"
        rows={13}
        aria-label="Follow-up email template"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setMessage("");
        }}
      />
      <p className="copy-status" role="status">
        {message}
      </p>
      <div className="dialog-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={onClose}
        >
          Dismiss
        </button>
        <button className="button button-primary" type="button" onClick={copy}>
          Copy to clipboard
        </button>
      </div>
    </Modal>
  );
}
