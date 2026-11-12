import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";
const firstKey = "first-test-workspace-access-key-32-characters";
import { googleToken, login } from "../support/firebase";
test("bearer APIs work without cookies and reject malformed requests", async ({
  request,
}) => {
  const noKey = await request.post("/api/applications", { data: {} });
  expect(noKey.status()).toBe(401);
  expect(noKey.headers()["content-type"]).toContain("application/json");
  expect(
    (
      await request.post("/api/applications", {
        headers: { Authorization: "Bearer " + firstKey },
        data: {},
      })
    ).status(),
  ).toBe(401);
  const headers = { Authorization: "Bearer " + (await googleToken(request)) };
  const valid = {
    company: "API Test",
    role: "Engineer",
    appliedAt: "2026-10-04",
    status: "SAVED",
  };
  const saved = await request.post("/api/applications", {
    headers,
    data: valid,
  });
  expect(saved.status()).toBe(201);
  const record = await saved.json();
  expect(record.userId).toBe("11111111-1111-4111-8111-111111111111");
  expect(record.salary).toBeNull();
  for (const data of [
    { ...valid, company: " " },
    { ...valid, appliedAt: "2026-02-30" },
    { ...valid, status: "INVALID" },
    { ...valid, url: "javascript:alert(1)" },
    { ...valid, role: { text: "role" } },
  ])
    expect(
      (await request.post("/api/applications", { headers, data })).status(),
    ).toBe(400);
  expect(
    (
      await request.post("/api/applications", {
        headers: { ...headers, "Content-Type": "application/json" },
        data: "{",
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/extract", {
        headers,
        data: { pageText: "A valid job posting" },
      })
    ).status(),
  ).toBe(503);
});
test("forged browser identities cannot open the tracker", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "jt_session",
      value: "11111111-1111-4111-8111-111111111111",
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
test("create, search, edit, clear optional fields, and delete an application", async ({
  page,
}) => {
  await login(page);
  await page
    .locator(".page-heading")
    .getByRole("link", { name: "Add application", exact: true })
    .click();
  await page
    .getByLabel("Company *", { exact: true })
    .fill("Northstar Browser Test");
  await page.getByLabel("Role *", { exact: true }).fill("Frontend Intern");
  await page.getByLabel("Job type *", { exact: true }).selectOption("INTERN");
  await page.getByLabel("Salary / compensation").fill("₹25,000 / month");
  await page.getByLabel("Job listing URL").fill("https://example.com/job");
  await page.getByLabel("Job application source").fill("Campus board");
  await page.getByLabel("Location").fill("N/A");
  await page
    .getByLabel("Notes", { exact: true })
    .fill("A temporary integration test.");
  await page
    .getByRole("button", { name: "Add application", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3037/");
  await page.getByRole("searchbox").fill("northstar");
  await expect(page.locator(".opportunity-list > li")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "View Frontend Intern at Northstar Browser Test",
      exact: true,
    })
    .click();
  await page
    .getByRole("link", { name: "Edit application", exact: true })
    .click();
  await page.getByLabel("Salary / compensation").fill("");
  await page.getByLabel("Job listing URL").fill("");
  await page.getByLabel("Job application source").fill("");
  await page.getByLabel("Location").fill("");
  await page.getByLabel("Notes", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3037/");
  await page
    .getByRole("button", {
      name: "View Frontend Intern at Northstar Browser Test",
      exact: true,
    })
    .click();
  await page
    .getByRole("link", { name: "Edit application", exact: true })
    .click();
  await expect(page.getByLabel("Salary / compensation")).toHaveValue("");
  await expect(page.getByLabel("Job listing URL")).toHaveValue("");
  await expect(page.getByLabel("Job application source")).toHaveValue("");
  await expect(page.getByLabel("Location")).toHaveValue("");
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue("");
  await page
    .getByRole("button", { name: "Delete application", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Delete application", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete application", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3037/");
  await expect(
    page.getByRole("link", { name: "Northstar Browser Test", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
test("one workspace cannot read another workspace's records", async ({
  request,
  page,
}) => {
  const response = await request.post("/api/applications", {
    headers: { Authorization: "Bearer " + (await googleToken(request)) },
    data: {
      company: "Private First Workspace",
      role: "Engineer",
      status: "APPLIED",
      appliedAt: "2026-10-04",
    },
  });
  const record = await response.json();
  await login(page, "second");
  await expect(
    page.getByRole("link", { name: "Private First Workspace", exact: true }),
  ).toHaveCount(0);
  await page.goto("/applications/" + record.id);
  await expect(
    page.getByRole("heading", { name: /This page moved on/ }),
  ).toBeVisible();
});
test("preview filters, sorting, export, mobile layout, and accessibility", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const review = path.resolve(".impeccable/review");
  await fs.mkdir(review, { recursive: true });
  await page.goto("/preview");
  await page.getByRole("button", { name: "Saved 2", exact: true }).click();
  await expect(page.locator(".opportunity-list > li")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Clear filters", exact: true }),
  ).toBeVisible();
  for (const [name, width] of [
    ["filters-desktop", 1440],
    ["filters-mobile", 390],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: path.join(review, name + ".png"),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("searchbox").fill("razorpay");
  await expect(page.locator(".opportunity-list > li")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "All 8", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".opportunity-list > li")).toHaveCount(8);
  await page.getByRole("button", { name: "Saved 2", exact: true }).click();
  await page.getByRole("searchbox").fill("no-such-role");
  await expect(
    page.getByRole("heading", { name: "No matches, yet." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByLabel("Sort applications").selectOption("company");
  await expect(page.locator(".opportunity-list > li").first()).toContainText(
    "Atlassian",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await download).suggestedFilename()).toBe(
    "job-tracker-applications.csv",
  );
  await page.getByLabel("Sort applications").selectOption("recent");
  const accessibility: Record<string, unknown> = {};
  for (const [name, width] of [
    ["desktop", 1440],
    ["mobile", 390],
    ["user-1280", 1280],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    accessibility[name] = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations;
    expect(accessibility[name]).toEqual([]);
    await page.screenshot({
      path: path.join(review, name + ".png"),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/preview?view=new");
  await page
    .getByRole("button", { name: "Add application", exact: true })
    .click();
  await expect(page.locator("#company")).toBeFocused();
  await expect(page.locator("#company-error")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/preview?view=new");
  accessibility.form = (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
  expect(accessibility.form).toEqual([]);
  await page.screenshot({
    path: path.join(review, "form-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({
    path: path.join(review, "form-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/preview?state=empty");
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts here." }),
  ).toBeVisible();
  await page.goto("/preview?state=error");
  await expect(page.locator(".error-state[role='alert']")).toContainText(
    "couldn’t connect",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login");
  accessibility.login = (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
  expect(accessibility.login).toEqual([]);
  await page.screenshot({
    path: path.join(review, "login-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({
    path: path.join(review, "login-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await fs.writeFile(
    path.join(review, "accessibility.json"),
    JSON.stringify(accessibility, null, 2),
  );
  expect(errors).toEqual([]);
});
