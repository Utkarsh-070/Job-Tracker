import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { googleToken, login } from "../support/firebase";

test("selected opportunity, mobile focus return, editable follow-up and keyboard dialogs", async ({
  page,
}) => {
  await page.goto("/preview");
  await page
    .getByRole("button", {
      name: "View Product Engineer at Notion",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Opportunity details for Notion" }),
  ).toContainText("Product Engineer");
  await page.setViewportSize({ width: 390, height: 844 });
  const row = page.getByRole("button", {
    name: "View Frontend Engineer at Linear",
    exact: true,
  });
  await row.click();
  const detail = page.getByRole("dialog", {
    name: "Opportunity details for Linear",
    exact: true,
  });
  await expect(detail).toBeVisible();
  await expect(
    detail.getByRole("button", { name: "Applications", exact: true }),
  ).toBeFocused();
  await detail.getByRole("button", { name: /No response in/ }).click();
  const followup = page.getByRole("dialog", {
    name: "Follow-up email",
    exact: true,
  });
  await expect(followup).toBeVisible();
  await followup.getByRole("textbox").fill("A personal follow-up.");
  await expect(followup.getByRole("textbox")).toHaveValue(
    "A personal follow-up.",
  );
  await page.keyboard.press("Escape");
  await expect(followup).not.toBeVisible();
  await expect(detail).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(detail).not.toBeVisible();
  await expect(row).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("interview exports and contact controls remain usable in the new editor", async ({
  page,
}) => {
  await page.goto("/preview?edit=sample-0");
  await expect(
    page.getByRole("button", { name: "Download .ics", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Interview date & time").fill("2026-12-01T14:00");
  await page.getByLabel("Interviewer(s)").fill("Sample interviewer");
  await page
    .getByLabel("Meeting / video link")
    .fill("https://meet.example.com/interview");
  const filePromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download .ics", exact: true })
    .click();
  const file = await filePromise;
  const filePath = await file.path();
  expect(file.suggestedFilename()).toBe("interview.ics");
  const contents = await fs.readFile(filePath!, "utf8");
  expect(contents).toContain("Frontend Engineer");
  expect(contents).toContain("Sample interviewer");
  await expect(
    page.getByRole("link", { name: "Add to Google Calendar" }),
  ).toHaveAttribute("href", /calendar.google.com/);
  await page.getByRole("button", { name: "Add contact", exact: true }).click();
  await page.getByLabel("Name *", { exact: true }).fill("Sample recruiter");
  await page
    .getByLabel("Email", { exact: true })
    .fill("recruiter@example.test");
  await expect(page.getByLabel("Name *", { exact: true })).toHaveValue(
    "Sample recruiter",
  );
  await page
    .getByRole("button", { name: "Remove contact Sample recruiter" })
    .click();
  await expect(
    page.getByText("No contacts yet.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".inline-error[role=alert]")).toContainText(
    "design preview",
  );
});

test("mobile details accessibility, reduced motion, and approved editor captures", async ({
  page,
}) => {
  const directory = path.resolve(".impeccable/review");
  await fs.mkdir(directory, { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/preview");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", {
      name: "View Frontend Engineer at Linear",
      exact: true,
    })
    .click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: path.join(directory, "mobile-detail.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  for (const [name, width, height] of [
    ["edit-desktop", 1440, 1240],
    ["edit-mobile", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/preview?edit=sample-0");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: path.join(directory, name + ".png"),
      fullPage: true,
      animations: "disabled",
    });
  }
});

test("mobile edit action stays visible with long real notes", async ({
  page,
}) => {
  const response = await page.request.post("/api/applications", {
    headers: { Authorization: "Bearer " + (await googleToken(page.request)) },
    data: {
      company: "Long Note Test",
      role: "Engineer",
      appliedAt: "2026-11-12",
      notes: "Detailed preparation notes. ".repeat(200),
    },
  });
  expect(response.status()).toBe(201);
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", {
      name: "View Engineer at Long Note Test",
      exact: true,
    })
    .click();
  const edit = page.getByRole("link", {
    name: "Edit application",
    exact: true,
  });
  const bounds = await edit.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(64);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  await page.screenshot({
    path: path.resolve(".impeccable/review/mobile-detail-long.png"),
    animations: "disabled",
  });
  await edit.click();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Detailed preparation notes. ".repeat(200).trim(),
  );
});
