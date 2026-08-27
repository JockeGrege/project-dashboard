import { expect, test } from "@playwright/test";

test("file an idea with the keyboard and see it in the feed", async ({ page }) => {
  await page.goto("/#/");
  await expect(
    page.getByRole("link", { name: /improvements/i }),
  ).toBeVisible();

  // `a` from anywhere opens the capture overlay.
  await page.locator("body").press("a");

  const idea = "check the retry backoff on flaky wifi";
  await page.getByPlaceholder("What's the improvement?").fill(idea);

  await page.getByPlaceholder("project").fill("core");
  await page.getByRole("button", { name: "CO core" }).click();

  await page.getByRole("button", { name: /^File/ }).click();

  await expect(page.getByText("Filed to core")).toBeVisible();
  await expect(page.getByText(idea)).toBeVisible();
});

test("command search jumps to a project", async ({ page }) => {
  await page.goto("/#/");
  await page.locator("body").press("ControlOrMeta+k");

  await page.getByPlaceholder("Search projects and issues…").fill("mixer");
  await page.getByRole("button", { name: "MI mixer project" }).click();

  await expect(page).toHaveURL(/#\/project\//);
  await expect(page.getByRole("heading", { name: "mixer" })).toBeVisible();
});
