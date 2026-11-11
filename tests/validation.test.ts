import test from "node:test";
import assert from "node:assert/strict";
import {
  validateApplication,
  safeJobUrl,
  localDateInput,
} from "../src/features/applications/validation";
import { applicationsCsv } from "../src/features/applications/export";
const valid = {
  company: " Acme ",
  role: " Engineer ",
  status: "SAVED",
  appliedAt: "2026-10-04",
  salary: "",
  notes: "",
  url: "",
  jobType: "INTERN",
  source: " Referral ",
  location: "",
};
test("valid details are trimmed and blank optional values explicitly clear old data", () => {
  const result = validateApplication(valid);
  assert.ok(result.success);
  assert.equal(result.data.company, "Acme");
  assert.equal(result.data.role, "Engineer");
  assert.equal(result.data.salary, null);
  assert.equal(result.data.notes, null);
  assert.equal(result.data.url, null);
  assert.equal(result.data.jobType, "INTERN");
  assert.equal(result.data.source, "Referral");
  assert.equal(result.data.location, null);
  assert.equal(result.data.appliedAt.toISOString(), "2026-10-04T00:00:00.000Z");
  const withoutJobType = { ...valid, jobType: undefined };
  const fallback = validateApplication(withoutJobType);
  assert.ok(fallback.success);
  if (fallback.success) assert.equal(fallback.data.jobType, "FULL_TIME");
});
test("reject invalid shapes, whitespace-only names, wrong types, dates, stages, and links", () => {
  for (const value of [
    null,
    [],
    "text",
    { ...valid, company: "  " },
    { ...valid, role: 12 },
    { ...valid, status: "UNKNOWN" },
    { ...valid, appliedAt: "2026-02-30" },
    { ...valid, appliedAt: "2101-01-01" },
    { ...valid, appliedAt: new Date(NaN) },
    { ...valid, jobType: "" },
    { ...valid, jobType: "CONTRACT" },
    { ...valid, source: 12 },
    { ...valid, location: "a".repeat(201) },
    { ...valid, url: "javascript:alert(1)" },
    { ...valid, url: "https://user:password@example.com" },
    { ...valid, notes: "a".repeat(10001) },
  ])
    assert.equal(validateApplication(value).success, false);
});
test("unsafe legacy URLs are never rendered as actionable links", () => {
  assert.equal(safeJobUrl("data:text/html,test"), null);
  assert.equal(safeJobUrl("javascript:alert(1)"), null);
  assert.equal(
    safeJobUrl("https://example.com/jobs/1"),
    "https://example.com/jobs/1",
  );
});
test("local date uses calendar components rather than a UTC conversion", () => {
  const date = new Date(2026, 9, 4, 0, 10);
  assert.equal(localDateInput(date), "2026-10-04");
});
test("CSV quotes values and neutralizes formula injection", () => {
  const now = new Date("2026-10-04");
  const output = applicationsCsv([
    {
      id: "1",
      company: "=HYPERLINK(1)",
      role: 'An "engineer"',
      status: "APPLIED",
      salary: null,
      url: null,
      jobType: "FULL_TIME",
      source: null,
      location: null,
      notes: "two, columns",
      appliedAt: now,
      createdAt: now,
      updatedAt: now,
      interviewDate: null,
      interviewers: null,
      meetingUrl: null,
      contacts: [],
    },
  ]);
  assert.ok(output.includes('"\'=HYPERLINK(1)"'));
  assert.ok(output.includes('"An ""engineer"""'));
  assert.ok(output.includes('"two, columns"'));
});

test("interview scheduling details are validated and trimmed", () => {
  const withInterview = {
    ...valid,
    interviewDate: "2026-11-20T14:30",
    interviewers: " Sarah Connor, John Smith ",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
  };
  const result = validateApplication(withInterview);
  assert.ok(result.success);
  if (result.success) {
    assert.ok(result.data.interviewDate instanceof Date);
    assert.equal(result.data.interviewers, "Sarah Connor, John Smith");
    assert.equal(
      result.data.meetingUrl,
      "https://meet.google.com/abc-defg-hij",
    );
  }

  // Reject unsafe meeting URLs
  const unsafeMeeting = {
    ...valid,
    meetingUrl: "javascript:alert('pwned')",
  };
  assert.equal(validateApplication(unsafeMeeting).success, false);
});

test("contacts section validates recruiter, hiring manager, and referrer contacts", () => {
  const withContacts = {
    ...valid,
    contacts: [
      {
        name: " Jane Recruiter ",
        role: "RECRUITER",
        email: " jane@acme.corp ",
        linkedinUrl: "https://linkedin.com/in/janerecruiter",
        lastContactedAt: "2026-11-10",
      },
      {
        name: "Alex Referrer",
        role: "REFERRER",
        email: "alex@referral.com",
        linkedinUrl: "",
        lastContactedAt: "",
      },
      {
        name: "Bob Manager",
        role: "HIRING_MANAGER",
        email: "",
        linkedinUrl: "https://linkedin.com/in/bobmanager",
        lastContactedAt: "2026-11-08",
      },
    ],
  };

  const result = validateApplication(withContacts);
  assert.ok(result.success);
  if (result.success) {
    assert.equal(result.data.contacts.length, 3);
    assert.equal(result.data.contacts[0].name, "Jane Recruiter");
    assert.equal(result.data.contacts[0].role, "RECRUITER");
    assert.equal(result.data.contacts[0].email, "jane@acme.corp");
    assert.equal(
      result.data.contacts[0].linkedinUrl,
      "https://linkedin.com/in/janerecruiter",
    );
    assert.equal(result.data.contacts[0].lastContactedAt, "2026-11-10");

    assert.equal(result.data.contacts[1].role, "REFERRER");
    assert.equal(result.data.contacts[1].linkedinUrl, null);

    assert.equal(result.data.contacts[2].role, "HIRING_MANAGER");
  }

  // Missing contact name is rejected
  const missingName = {
    ...valid,
    contacts: [{ name: "   ", role: "RECRUITER" }],
  };
  assert.equal(validateApplication(missingName).success, false);

  // Unsafe linkedin URL is rejected
  const unsafeLinkedin = {
    ...valid,
    contacts: [
      {
        name: "Bob",
        role: "RECRUITER",
        linkedinUrl: "javascript:void(0)",
      },
    ],
  };
  assert.equal(validateApplication(unsafeLinkedin).success, false);
});
