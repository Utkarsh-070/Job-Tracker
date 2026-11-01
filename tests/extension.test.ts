import test from "node:test";
import assert from "node:assert/strict";
import {
  validateSettings,
  permissionPattern,
  validateDraft,
} from "../extension/shared.ts";
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
  const draft = {
    company: "Acme",
    role: "Developer",
    salary: "",
    notes: "",
    url: "",
    appliedAt: "2026-10-04",
  };
  assert.equal(validateDraft(draft).salary, null);
  assert.throws(() => validateDraft({ ...draft, appliedAt: "2026-02-30" }));
  assert.throws(() => validateDraft({ ...draft, url: "javascript:alert(1)" }));
});
