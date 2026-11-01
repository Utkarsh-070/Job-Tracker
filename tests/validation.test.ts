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
};
test("valid details are trimmed and blank optional values explicitly clear old data", () => {
  const result = validateApplication(valid);
  assert.ok(result.success);
  assert.equal(result.data.company, "Acme");
  assert.equal(result.data.role, "Engineer");
  assert.equal(result.data.salary, null);
  assert.equal(result.data.notes, null);
  assert.equal(result.data.url, null);
  assert.equal(result.data.appliedAt.toISOString(), "2026-10-04T00:00:00.000Z");
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
      notes: "two, columns",
      appliedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  assert.ok(output.includes('"\'=HYPERLINK(1)"'));
  assert.ok(output.includes('"An ""engineer"""'));
  assert.ok(output.includes('"two, columns"'));
});
