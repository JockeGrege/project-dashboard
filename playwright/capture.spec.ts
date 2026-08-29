import { expect, test } from "@playwright/test";

test("file an idea with the keyboard and see it in the feed", async ({ page }) => {
  await page.goto("/#/");
  await expect(
    page.getByRole("link", { name: /hypomone/i }),
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

  // Picking a project unmounts the button that had focus, so focus falls to
  // <body> — outside the panel. ⌘⏎ must still file, without a tag selected.
  await page.locator("body").press("ControlOrMeta+Enter");

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

test("bulk-delete done issues and bulk-delete dismissed issues", async ({
  page,
}) => {
  await page.goto("/#/");
  await page.locator("body").press("ControlOrMeta+k");
  await page.getByPlaceholder("Search projects and issues…").fill("core");
  await page.getByRole("button", { name: "CO core project" }).click();
  await expect(page.getByRole("heading", { name: "core" })).toBeVisible();

  await page.getByRole("button", { name: "done", exact: true }).click();
  const clearDone = page.getByRole("button", { name: /delete all done/i });
  await expect(clearDone).toBeVisible();
  await clearDone.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(clearDone).toBeHidden();
  await expect(
    page.getByText("No issues match this filter."),
  ).toBeVisible();

  await page.getByRole("button", { name: "dismissed", exact: true }).click();
  const clearDismissed = page.getByRole("button", {
    name: /delete all dismissed/i,
  });
  await expect(clearDismissed).toBeVisible();
  await clearDismissed.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(clearDismissed).toBeHidden();
});

test("paste a screenshot into the composer, file it, and open the lightbox", async ({
  page,
}) => {
  await page.goto("/#/");
  await page.locator("body").press("ControlOrMeta+k");
  await page.getByPlaceholder("Search projects and issues…").fill("core");
  await page.getByRole("button", { name: "CO core project" }).click();
  await expect(page.getByRole("heading", { name: "core" })).toBeVisible();

  const composerText = page.getByLabel("New issue text");
  await composerText.fill("layout breaks at this width");

  // Simulate pasting an image: a 1×1 PNG dropped onto the textarea as a File.
  await composerText.evaluate(async (el) => {
    const b64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const file = new File([bytes], "screenshot.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      }),
    );
  });

  // A preview shows immediately; Add is blocked until the upload settles.
  await expect(page.getByRole("list", { name: "Attached images" }).locator("img")).toBeVisible();
  const addBtn = page.getByRole("button", { name: "Add", exact: true }).last();
  await expect(addBtn).toBeDisabled();
  await expect(addBtn).toBeEnabled();

  await addBtn.click();

  // The filed issue shows a thumbnail; clicking it opens the lightbox.
  const thumb = page.getByRole("button", { name: /view image 1 of 1/i });
  await expect(thumb).toBeVisible();
  await thumb.click();
  const dialog = page.getByRole("dialog", { name: /image 1 of 1/i });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("attach an image with the file picker", async ({ page }) => {
  await page.goto("/#/");
  await page.locator("body").press("ControlOrMeta+k");
  await page.getByPlaceholder("Search projects and issues…").fill("core");
  await page.getByRole("button", { name: "CO core project" }).click();
  await expect(page.getByRole("heading", { name: "core" })).toBeVisible();

  await page.getByLabel("New issue text").fill("crash on the settings screen");

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "picked.png", mimeType: "image/png", buffer: png });

  await expect(
    page.getByRole("list", { name: "Attached images" }).locator("img"),
  ).toBeVisible();

  const addBtn = page.getByRole("button", { name: "Add", exact: true }).last();
  await expect(addBtn).toBeEnabled();
  await addBtn.click();

  await expect(
    page.getByRole("button", { name: /view image 1 of 1/i }),
  ).toBeVisible();
});

test("command search jumps to a project", async ({ page }) => {
  await page.goto("/#/");
  await page.locator("body").press("ControlOrMeta+k");

  await page.getByPlaceholder("Search projects and issues…").fill("mixer");
  await page.getByRole("button", { name: "MI mixer project" }).click();

  await expect(page).toHaveURL(/#\/project\//);
  await expect(page.getByRole("heading", { name: "mixer" })).toBeVisible();
});
