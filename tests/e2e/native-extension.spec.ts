import { test, expect, chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { login } from "../support/firebase";

test("bundled Chrome extension signs in through Firebase and restores its account", async () => {
  test.setTimeout(150000);
  const root = path.resolve("test-results");
  await fs.mkdir(root, { recursive: true });
  const fixture = await fs.mkdtemp(path.join(root, "native-extension-"));
  const extension = path.join(fixture, "extension");
  await fs.cp(path.resolve("extension"), extension, { recursive: true });
  const manifest = JSON.parse(
    await fs.readFile(path.join(extension, "manifest.json"), "utf8"),
  );
  // Pregrant loopback hosts in this test-only copy so no native permission dialog blocks automation.
  manifest.host_permissions.push("http://localhost/*", "http://127.0.0.1/*");
  await fs.writeFile(
    path.join(extension, "manifest.json"),
    JSON.stringify(manifest),
  );
  const id = [
    ...createHash("sha256")
      .update(Buffer.from(manifest.key, "base64"))
      .digest("hex")
      .slice(0, 32),
  ]
    .map((n) => String.fromCharCode(97 + parseInt(n, 16)))
    .join("");
  const context = await chromium.launchPersistentContext(
    path.join(fixture, "profile"),
    {
      channel: "chromium",
      headless: true,
      baseURL: "http://localhost:3037",
      args: [
        "--disable-extensions-except=" + extension,
        "--load-extension=" + extension,
      ],
    },
  );
  try {
    const errors: string[] = [];
    context.on("weberror", (event) => errors.push(event.error().message));
    let popup = await context.newPage();
    await popup.goto("chrome-extension://" + id + "/popup.html");
    await popup.getByLabel("Tracker URL").fill("http://localhost:3037");
    const providerPage = context.waitForEvent("page", {
      predicate: (page) => page !== popup,
    });
    await popup
      .getByRole("button", { name: "Continue with Google", exact: true })
      .click();
    const google = await providerPage;
    await google.waitForLoadState();
    await fs.writeFile(
      path.join(fixture, "provider-page.html"),
      await google.content(),
    );
    // The action popup may close while Google is open; the worker must finish independently.
    await popup.close();
    await google.getByText("first@example.test", { exact: false }).click();
    popup = await context.newPage();
    await popup.goto("chrome-extension://" + id + "/popup.html");
    await expect(popup.locator("#main-view")).toBeVisible({ timeout: 20000 });
    await popup.reload();
    await expect(popup.locator("#main-view")).toBeVisible();
    await popup
      .getByRole("button", {
        name: "Or enter the details yourself",
        exact: true,
      })
      .click();
    await popup
      .getByLabel("Company *", { exact: true })
      .fill("First account private draft");
    await popup.getByLabel("Role *", { exact: true }).fill("Engineer");
    await popup.waitForTimeout(350);
    await popup.getByRole("button", { name: "Connection settings" }).click();
    await expect(popup.locator("#account-email")).toHaveText(
      "first@example.test",
    );
    const nextProvider = context.waitForEvent("page", {
      predicate: (page) => page !== popup,
    });
    await popup
      .getByRole("button", { name: "Switch Google account", exact: true })
      .click();
    const secondGoogle = await nextProvider;
    await secondGoogle.waitForLoadState();
    await secondGoogle
      .getByText("second@example.test", { exact: false })
      .click();
    await expect(popup.locator("#main-view")).toBeVisible({ timeout: 20000 });
    await expect(popup.locator("#form-section")).toBeHidden();
    await popup
      .getByRole("button", {
        name: "Or enter the details yourself",
        exact: true,
      })
      .click();
    await expect(popup.getByLabel("Company *", { exact: true })).toHaveValue(
      "",
    );
    await popup
      .getByLabel("Company *", { exact: true })
      .fill("Native Chrome Google Save");
    await popup.getByLabel("Role *", { exact: true }).fill("Engineer");
    await popup
      .getByRole("button", { name: "Save for later", exact: true })
      .click();
    await expect(popup.locator("#save-msg")).toContainText("Saved for later");
    const site = await context.newPage();
    await login(site, "second");
    await expect(
      site.getByRole("link", {
        name: "Native Chrome Google Save",
        exact: true,
      }),
    ).toBeVisible();
    await login(site, "first");
    await expect(
      site.getByRole("link", {
        name: "Native Chrome Google Save",
        exact: true,
      }),
    ).toHaveCount(0);
    await popup.getByRole("button", { name: "Connection settings" }).click();
    await expect(popup.locator("#account-email")).toHaveText(
      "second@example.test",
    );
    await context.route("**/api/auth/config", (route) => route.abort());
    await popup
      .getByRole("button", { name: "Sign out of this extension" })
      .click();
    await popup.reload();
    await expect(popup.locator("#settings-view")).toBeVisible();
    await expect(popup.locator("#signed-in-account")).toBeHidden();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
