"use client";
import { useState } from "react";
import { formatApplicationDate } from "../validation";
import type { Application } from "../types";

function buildTemplate(app: Application): string {
  const dateStr = formatApplicationDate(app.appliedAt);
  return [
    `Subject: Following up on my ${app.role} application – ${app.company}`,
    ``,
    `Hi [Hiring Manager's name],`,
    ``,
    `I hope this message finds you well. I wanted to follow up on my application for the ${app.role} position at ${app.company}, which I submitted on ${dateStr}.`,
    ``,
    `I remain very enthusiastic about this opportunity and would love to learn more about next steps in the process. Please let me know if there is any additional information I can provide.`,
    ``,
    `Thank you for your time and consideration. I look forward to hearing from you.`,
    ``,
    `Best regards,`,
    `[Your name]`,
  ].join("\n");
}

export function FollowUpTemplate({
  application,
  onClose,
}: {
  application: Application;
  onClose: () => void;
}) {
  const template = buildTemplate(application);
  const [copied, setCopied] = useState(false);

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* Fallback: select text */
      const el = document.getElementById("followup-textarea") as HTMLTextAreaElement | null;
      el?.select();
    }
  }

  return (
    <div
      className="followup-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="followup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="followup-modal">
        <div className="followup-header">
          <h2 id="followup-title" className="followup-title">
            Follow-up email
          </h2>
          <button
            type="button"
            className="followup-close"
            onClick={onClose}
            aria-label="Close follow-up template"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="followup-hint">
          Edit the template below, then copy it into your email client.
        </p>
        <textarea
          id="followup-textarea"
          className="followup-textarea"
          value={template}
          readOnly
          rows={16}
          aria-label="Follow-up email template"
        />
        <div className="followup-actions">
          <button
            type="button"
            className={copied ? "button button-primary copied" : "button button-primary"}
            onClick={copyTemplate}
          >
            {copied ? (
              <>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy to clipboard
              </>
            )}
          </button>
          <button type="button" className="button button-secondary" onClick={onClose}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

