import test from "node:test";
import assert from "node:assert/strict";
import { isStale, staleDays, STALE_DAYS } from "../src/features/applications/components/StaleAlert.tsx";
import type { Application } from "../src/features/applications/types/index.ts";

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: "test-id",
    company: "Acme",
    role: "Engineer",
    jobType: "FULL_TIME",
    status: "APPLIED",
    salary: null,
    url: null,
    source: null,
    location: null,
    notes: null,
    appliedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    interviewDate: null,
    interviewers: null,
    meetingUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    contacts: [],
    ...overrides,
  };
}

test("isStale returns true for APPLIED applications older than STALE_DAYS", () => {
  const app = makeApp({ status: "APPLIED" });
  assert.equal(isStale(app), true);
});

test("isStale returns true for INTERVIEWING applications older than STALE_DAYS", () => {
  const app = makeApp({ status: "INTERVIEWING" });
  assert.equal(isStale(app), true);
});

test("isStale returns false for recent applications", () => {
  const app = makeApp({
    appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  });
  assert.equal(isStale(app), false);
});

test("isStale returns false for SAVED status even if old", () => {
  const app = makeApp({ status: "SAVED" });
  assert.equal(isStale(app), false);
});

test("isStale returns false for OFFER status even if old", () => {
  const app = makeApp({ status: "OFFER" });
  assert.equal(isStale(app), false);
});

test("isStale returns false for REJECTED status even if old", () => {
  const app = makeApp({ status: "REJECTED" });
  assert.equal(isStale(app), false);
});

test("staleDays returns the correct number of days", () => {
  const app = makeApp({
    appliedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  });
  assert.equal(staleDays(app), 15);
});

test("exactly STALE_DAYS old application is stale", () => {
  const app = makeApp({
    appliedAt: new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000),
  });
  assert.equal(isStale(app), true);
});

test("one day before STALE_DAYS is not stale", () => {
  const app = makeApp({
    appliedAt: new Date(Date.now() - (STALE_DAYS - 1) * 24 * 60 * 60 * 1000),
  });
  assert.equal(isStale(app), false);
});
