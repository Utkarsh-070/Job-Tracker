import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fixtureAccounts, googleToken } from "../support/firebase";
test("popup connects, recovers from AI failures, preserves a draft, and prevents double saves", async ({
  page,
}) => {
  await page.setViewportSize({ width: 376, height: 850 });
  const review = path.resolve(".impeccable/review");
  await fs.mkdir(review, { recursive: true });
  const idToken = await googleToken(page.request);
  await page.addInitScript(
    ({ idToken, account }) => {
      const stored = () =>
        JSON.parse(localStorage.getItem("test-extension-storage") || "{}");
      const area = {
        get: async (keys: string[]) =>
          Object.fromEntries(keys.map((key) => [key, stored()[key]])),
        set: async (value: object) =>
          localStorage.setItem(
            "test-extension-storage",
            JSON.stringify({ ...stored(), ...value }),
          ),
        remove: async (keys: string | string[]) => {
          const current = stored();
          for (const key of typeof keys === "string" ? [keys] : keys)
            delete current[key];
          localStorage.setItem(
            "test-extension-storage",
            JSON.stringify(current),
          );
        },
        setAccessLevel: async () => {},
      };
      Object.defineProperty(window, "chrome", {
        value: {
          runtime: {
            sendMessage: async ({
              type,
              forceRefresh,
            }: {
              type: string;
              forceRefresh?: boolean;
            }) => {
              if (type === "auth-sign-in") {
                localStorage.setItem("test-auth-user", JSON.stringify(account));
                return { user: account };
              }
              if (type === "auth-sign-out") {
                localStorage.removeItem("test-auth-user");
                await area.remove(["jobDraft", "draftOwner"]);
                return { user: null };
              }
              const user = JSON.parse(
                localStorage.getItem("test-auth-user") || "null",
              );
              if (type === "auth-token") {
                if (forceRefresh)
                  localStorage.setItem("test-refreshed", "true");
                return { token: idToken, user };
              }
              return { user };
            },
          },
          storage: {
            local: area,
            sync: { get: async () => ({}), remove: async () => {} },
          },
          permissions: {
            request: async () => true,
            contains: async () => true,
            remove: async () => true,
          },
          tabs: {
            query: async () => [{ id: 1, url: "https://example.com/jobs/123" }],
            create: async () => {},
          },
          scripting: {
            executeScript: async () => [
              {
                result:
                  "A sample job posting at Acme looking for a frontend engineer.",
              },
            ],
          },
        },
      });
    },
    {
      idToken,
      account: {
        uid: fixtureAccounts.first.uid,
        email: fixtureAccounts.first.email,
        displayName: fixtureAccounts.first.name,
      },
    },
  );
  let saveCount = 0;
  let extractCount = 0;
  await page.route("**/api/extract", (route) =>
    route.fulfill({
      status: ++extractCount === 1 ? 401 : 503,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "AI capture is not configured. Enter details manually.",
      }),
    }),
  );
  await page.route("**/api/applications", async (route) => {
    saveCount++;
    await new Promise((resolve) => setTimeout(resolve, 200));
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "Access-Control-Allow-Origin": "*" },
    });
  });
  await page.route("**/api/**", async (route) => {
    if (route.request().method() === "OPTIONS")
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
          "Access-Control-Allow-Headers": "content-type,authorization",
        },
      });
    else await route.fallback();
  });
  await page.goto("http://127.0.0.1:4047/popup.html");
  await expect(page.locator("#settings-view")).toBeVisible();
  await page.getByLabel("Tracker URL").fill("http://localhost:3037");
  await page
    .locator("body")
    .screenshot({ path: path.join(review, "popup-connection.png") });
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(page.locator(".capture-steps [aria-current='step']")).toHaveText(
    "1. Read",
  );
  await page
    .getByRole("button", { name: "Capture this job", exact: true })
    .click();
  await expect(page.locator("#capture-msg")).toContainText("not configured");
  expect(extractCount).toBe(2);
  expect(
    await page.evaluate(() => localStorage.getItem("test-refreshed")),
  ).toBe("true");
  await page
    .getByRole("button", { name: "Enter details manually", exact: true })
    .click();
  await expect(page.locator(".capture-steps [aria-current='step']")).toHaveText(
    "2. Review",
  );
  await page
    .getByLabel("Company *", { exact: true })
    .fill("Popup Integration Test");
  await page.getByLabel("Role *", { exact: true }).fill("Frontend Engineer");
  await page.waitForTimeout(350);
  await page.reload();
  await expect(page.locator(".capture-steps [aria-current='step']")).toHaveText(
    "2. Review",
  );
  await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
    "Popup Integration Test",
  );
  await page
    .locator("body")
    .screenshot({ path: path.join(review, "popup-review-active.png") });
  await page
    .getByRole("button", { name: "Save for later", exact: true })
    .click();
  await expect(page.locator("#save-applied-btn")).toBeDisabled();
  await expect(page.locator("#save-msg")).toContainText("Saved for later");
  await expect(page.locator(".capture-steps [aria-current='step']")).toHaveText(
    "3. Save",
  );
  await expect(page.locator("#save-later-btn")).toBeDisabled();
  expect(saveCount).toBe(1);
  await page.locator("body").screenshot({
    path: path.join(review, "popup-review.png"),
  });
  await page
    .getByRole("button", { name: "Clear this draft", exact: true })
    .click();
  await expect(page.locator(".capture-steps [aria-current='step']")).toHaveText(
    "1. Read",
  );
  const violations = (
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()
  ).violations;
  expect(violations).toEqual([]);
  await page.locator("body").screenshot({
    path: path.join(review, "popup.png"),
  });
  await page.getByRole("button", { name: "Connection settings" }).click();
  await expect(page.locator("#account-email")).toHaveText(
    fixtureAccounts.first.email,
  );
  await page
    .getByRole("button", { name: "Sign out of this extension" })
    .click();
  await page.reload();
  await expect(page.locator("#settings-view")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
});
