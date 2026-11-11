"use client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/Icon";
import type { ContactInput, ContactRole } from "../types";

const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  RECRUITER: "Recruiter",
  HIRING_MANAGER: "Hiring Manager",
  REFERRER: "Referrer",
  OTHER: "Other",
};

const CONTACT_ROLE_OPTIONS = (
  Object.entries(CONTACT_ROLE_LABELS) as [ContactRole, string][]
).map(([value, label]) => ({ value, label }));

interface ContactsProps {
  contacts: ContactInput[];
  onChange: (contacts: ContactInput[]) => void;
  errors: Record<string, string>;
}

function emptyContact(): ContactInput {
  return {
    name: "",
    role: "OTHER",
    email: "",
    linkedinUrl: "",
    lastContactedAt: "",
  };
}

export function ContactsSection({ contacts, onChange, errors }: ContactsProps) {
  function addContact() {
    onChange([...contacts, emptyContact()]);
  }

  function removeContact(index: number) {
    onChange(contacts.filter((_, i) => i !== index));
  }

  function updateContact(
    index: number,
    field: keyof ContactInput,
    value: string,
  ) {
    onChange(contacts.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  return (
    <div className="contacts-section">
      {contacts.length === 0 && (
        <p className="contacts-empty">
          No contacts yet. Track recruiters, hiring managers, or referrers for
          this application.
        </p>
      )}

      {contacts.map((contact, i) => (
        <div key={i} className="contact-card">
          <div className="contact-card-header">
            <span className="contact-label">
              {contact.name || `Contact ${i + 1}`}
              {contact.role !== "OTHER" && (
                <span className="contact-role-badge">
                  {CONTACT_ROLE_LABELS[contact.role]}
                </span>
              )}
            </span>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Remove contact ${contact.name || i + 1}`}
              onClick={() => removeContact(i)}
            >
              <Icon name="trash" />
            </button>
          </div>
          <div className="form-grid contact-grid">
            <Input
              id={`contact-${i}-name`}
              label="Name *"
              required
              maxLength={200}
              value={contact.name}
              onChange={(e) => updateContact(i, "name", e.target.value)}
              error={errors[`contacts[${i}].name`]}
              placeholder="Full name"
            />
            <Select
              id={`contact-${i}-role`}
              label="Role"
              options={CONTACT_ROLE_OPTIONS}
              value={contact.role}
              onChange={(e) =>
                updateContact(i, "role", e.target.value as ContactRole)
              }
            />
            <Input
              id={`contact-${i}-email`}
              label="Email"
              type="email"
              maxLength={320}
              value={contact.email ?? ""}
              onChange={(e) => updateContact(i, "email", e.target.value)}
              placeholder="email@example.com"
            />
            <Input
              id={`contact-${i}-linkedin`}
              label="LinkedIn URL"
              type="url"
              maxLength={500}
              value={contact.linkedinUrl ?? ""}
              onChange={(e) => updateContact(i, "linkedinUrl", e.target.value)}
              error={errors[`contacts[${i}].linkedinUrl`]}
              placeholder="https://linkedin.com/in/..."
            />
            <Input
              id={`contact-${i}-lastContacted`}
              label="Last contacted"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              value={
                contact.lastContactedAt
                  ? contact.lastContactedAt.slice(0, 10)
                  : ""
              }
              onChange={(e) =>
                updateContact(i, "lastContactedAt", e.target.value)
              }
              error={errors[`contacts[${i}].lastContactedAt`]}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        className="button button-quiet add-contact-btn"
        onClick={addContact}
      >
        <Icon name="plus" />
        Add contact
      </button>
    </div>
  );
}
