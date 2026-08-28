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

test("issue text is multi-line and expands to full screen", async ({ page }) => {
  await page.goto("/#/");
  await page.locator("body").press("a");

  const field = page.getByLabel("Issue text");
  await field.fill("line one\nline two");
  await expect(field).toHaveValue("line one\nline two");

  await page.getByRole("button", { name: "Expand editor to full screen" }).click();
  const full = page.getByRole("dialog", { name: "Issue text" });
  await expect(full).toBeVisible();
  await full.getByRole("textbox").fill("line one\nline two\nline three");
  await page.getByRole("button", { name: "Done" }).click();

  await expect(field).toHaveValue("line one\nline two\nline three");
});

test("⌘⏎ files the idea even when focus has left the textarea", async ({
  page,
}) => {
  await page.goto("/#/");
  await page.locator("body").press("a");

  const idea = "harden the offline cache eviction";
  await page.getByPlaceholder("What's the improvement?").fill(idea);
  await page.getByPlaceholder("project").fill("core");
  await page.getByRole("button", { name: "CO core" }).click();

  // Focus now sits on the picked-project chip, not the textarea — the reported
  // repro, where ⌘⏎ used to just toggle the chip.
  const chip = page.getByRole("button", { name: "CO core" });
  await chip.focus();
  await chip.press("ControlOrMeta+Enter");

  await expect(page.getByText("Filed to core")).toBeVisible();
  await expect(page.getByText(idea)).toBeVisible();
});

test("deleting an issue asks to confirm first", async ({ page }) => {
  await page.goto("/#/");
  await page.locator("body").press("ControlOrMeta+k");
  await page.getByPlaceholder("Search projects and issues…").fill("core");
  await page.getByRole("button", { name: "CO core project" }).click();
  await expect(page.getByRole("heading", { name: "core" })).toBeVisible();

  const actions = page.getByRole("button", { name: "Issue actions" }).first();
  await actions.click();
  await page.getByRole("menuitem", { name: "Delete" }).click();

  const dialog = page.getByRole("alertdialog", { name: "Delete this issue?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  // Confirming this time actually removes the row.
  const before = await page.getByRole("listitem").count();
  await actions.click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByRole("listitem")).toHaveCount(before - 1);
});

test("command search jumps to a project", async ({ page }) => {
  await page.goto("/#/");
  await page.locator("body").press("ControlOrMeta+k");

  await page.getByPlaceholder("Search projects and issues…").fill("mixer");
  await page.getByRole("button", { name: "MI mixer project" }).click();

  await expect(page).toHaveURL(/#\/project\//);
  await expect(page.getByRole("heading", { name: "mixer" })).toBeVisible();
});
