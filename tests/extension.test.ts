import test from "node:test";
import assert from "node:assert/strict";
import {
  validateSettings,
  permissionPattern,
  validateDraft,
} from "../extension/shared.ts";

const baseDraft = {
  company: "Acme",
  role: "Developer",
  salary: "",
  notes: "",
  url: "",
  appliedAt: "2026-10-04",
  location: "",
  jobType: "FULL_TIME",
  source: "",
};

test("extension permits secure roots and localhost, and rejects credential leaks", () => {
  assert.deepEqual(validateSettings("https://tracker.example/"), {
    appUrl: "https://tracker.example",
  });
  assert.equal(
    permissionPattern("http://localhost:3000"),
    "http://localhost/*",
  );
  for (const url of [
    "http://example.com",
    "javascript:alert(1)",
    "https://user:password@example.com",
    "https://example.com/path",
    "https://example.com?secret=1",
  ])
    assert.throws(() => validateSettings(url));
});
test("extension rejects malformed dates and links before a save", () => {
  assert.equal(validateDraft(baseDraft).salary, null);
  assert.throws(() => validateDraft({ ...baseDraft, appliedAt: "2026-02-30" }));
  assert.throws(() => validateDraft({ ...baseDraft, url: "javascript:alert(1)" }));
});
test("extension validates new location, jobType, source fields", () => {
  const withFields = {
    ...baseDraft,
    location: "New York, NY",
    jobType: "INTERN",
    source: "LinkedIn",
  };
  const result = validateDraft(withFields);
  assert.equal(result.location, "New York, NY");
  assert.equal(result.jobType, "INTERN");
  assert.equal(result.source, "LinkedIn");
});
test("extension trims and nulls empty optional fields", () => {
  const result = validateDraft(baseDraft);
  assert.equal(result.location, null);
  assert.equal(result.source, null);
  assert.equal(result.jobType, "FULL_TIME");
});
test("extension rejects invalid jobType values", () => {
  assert.throws(() =>
    validateDraft({ ...baseDraft, jobType: "PART_TIME" }),
  );
});
test("extension rejects location over 200 chars", () => {
  assert.throws(() =>
    validateDraft({ ...baseDraft, location: "a".repeat(201) }),
  );
});
