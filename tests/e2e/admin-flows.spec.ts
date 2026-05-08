import { expect, test, type APIRequestContext } from "@playwright/test";
import type { Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

async function resetE2EState(request: APIRequestContext) {
  const response = await request.post("/api/e2e/mock", {
    data: { action: "reset" },
  });

  expect(
    response.ok(),
    `Failed to reset e2e state: ${response.status()} ${response.statusText()}\n${await response.text()}`
  ).toBeTruthy();
}

async function getCreatedRecordId(
  request: APIRequestContext,
  model: "Theater" | "Screen",
  field: "slug" | "name",
  value: string
) {
  const response = await request.post("/api/e2e/mock", {
    data: { action: "list", model },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    data: Array<Record<string, unknown>>;
  };
  const record = body.data.find((item) => item[field] === value);

  expect(record?.id, `Unable to find ${model} with ${field}=${value}`).toBeTruthy();
  return String(record!.id);
}

async function expectRecordMissing(
  request: APIRequestContext,
  model: "Theater" | "Screen",
  field: "slug" | "name",
  value: string
) {
  const response = await request.post("/api/e2e/mock", {
    data: { action: "list", model },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    data: Array<Record<string, unknown>>;
  };
  const record = body.data.find((item) => item[field] === value);

  expect(record, `Expected ${model} with ${field}=${value} to be deleted`).toBeUndefined();
}

async function gotoFresh(page: Page, path: string) {
  const separator = path.includes("?") ? "&" : "?";
  await page.goto(`${path}${separator}e2e=${Date.now()}`);
}

test.beforeEach(async ({ request }) => {
  await resetE2EState(request);
});

test("manages theaters and screens through create and delete flows", async ({
  page,
  request,
}) => {
  const theaterName = "E2E Theater";
  const screenName = "E2E Balcony";

  await page.goto("/admin/theaters");
  await page.getByRole("link", { name: "Add Theater" }).click();
  await expect(page.locator('[data-e2e-ready="true"]')).toBeVisible();

  await page.locator('input[name="name"]').fill(theaterName);
  await page.locator('input[name="slug"]').fill("e2e-theater");
  await page.locator('input[name="city"]').fill("Austin");
  await page.locator('input[name="state"]').fill("TX");
  await page.locator('input[name="district"]').fill("Warehouse");
  await page.locator('input[name="established"]').fill("1952");
  await page.locator('input[name="phone"]').fill("(555) 010-2222");
  await page.locator('input[name="contactEmail"]').fill("e2e-theater@example.com");
  await page.locator('input[name="address"]').fill("222 Cinema Lane");
  await page.locator('input[name="manager"]').fill("Taylor Reese");
  await page.locator('textarea[name="notes"]').fill("E2E theater notes.");
  await page.getByRole("button", { name: "Create Theater" }).click();

  await expect(page).toHaveURL(/\/admin\/theaters(\?|$)/, { timeout: 20_000 });
  await expect(page.getByText("Theater created successfully.")).toBeVisible();
  await gotoFresh(page, "/admin/theaters");
  const theaterId = await getCreatedRecordId(request, "Theater", "slug", "e2e-theater");
  await gotoFresh(page, `/admin/theaters/${theaterId}`);

  await expect(page.getByRole("heading", { name: theaterName })).toBeVisible();
  const newScreenHref = await page
    .getByRole("link", { name: "Add Screen" })
    .getAttribute("href");
  await gotoFresh(page, newScreenHref!);
  await expect(page.locator('[data-e2e-ready="true"]')).toBeVisible();

  await page.locator('input[name="name"]').fill(screenName);
  await page.locator('input[name="slug"]').fill("e2e-balcony");
  await page.locator('input[name="capacity"]').fill("88");
  await page.locator('input[name="sortOrder"]').fill("2");
  await page.locator('input[name="projection"]').fill("35mm");
  await page.locator('input[name="soundFormat"]').fill("Dolby Stereo");
  await page.getByRole("button", { name: "Create Screen" }).click();

  await expect(page).toHaveURL(/\/admin\/theaters\/.*\/screens(\?|$)/, {
    timeout: 20_000,
  });
  await gotoFresh(page, `/admin/theaters/${theaterId}/screens`);
  await expect(page.getByText(screenName)).toBeVisible();
  const screenId = await getCreatedRecordId(request, "Screen", "slug", "e2e-balcony");
  await gotoFresh(page, `/admin/theaters/${theaterId}/screens/${screenId}`);

  await page.getByRole("button", { name: "Delete Screen" }).click();
  await expect(page).toHaveURL(/\/admin\/theaters\/.*\/screens(\?|$)/, {
    timeout: 20_000,
  });
  await gotoFresh(page, `/admin/theaters/${theaterId}/screens`);
  await expect(page.getByText(screenName)).toHaveCount(0);

  await page.getByRole("link", { name: "Back to Theater" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm Delete" }).click();

  await expect(page).toHaveURL(/\/admin\/theaters(\?|$)/, { timeout: 20_000 });
  await expect(page.getByText("Theater deleted successfully.")).toBeVisible();
  await expectRecordMissing(request, "Theater", "slug", "e2e-theater");
});

test("imports, edits, and deletes a movie", async ({ page }) => {
  const updatedTitle = "E2E Mario Remix";
  const syncedTitle = "The Super Mario Bros. Movie";
  const syncedTagline = "E2E Updated Tagline";

  await page.goto("/admin/movies/new?query=mario");
  await expect(page.locator('[data-e2e-ready="true"]')).toBeVisible();

  await page.getByRole("button", { name: "Import Movie" }).click();

  await expect(page).toHaveURL(/\/admin\/movies\/.+/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "The Super Mario Bros. Movie" })
  ).toBeVisible();

  await page.locator('input[name="title"]').fill(updatedTitle);
  await page.locator('input[name="slug"]').fill("e2e-mario-remix");
  await page.locator('input[name="tagline"]').fill("E2E Updated Tagline");
  await page.locator('textarea[name="synopsis"]').fill("Updated movie synopsis from e2e.");
  await page.locator('input[name="rating"]').fill("PG");
  await page.locator('select[name="status"]').selectOption("draft");
  await page.getByRole("button", { name: "Save Movie" }).click();

  await expect(page).toHaveURL(/\/admin\/movies\/.+/, { timeout: 20_000 });
  await expect(page.getByText("Movie saved successfully.")).toBeVisible();
  await expect(page.locator('input[name="title"]')).toHaveValue(updatedTitle);
  await expect(page.locator('input[name="tagline"]')).toHaveValue("E2E Updated Tagline");
  await expect(page.locator('textarea[name="synopsis"]')).toHaveValue(
    "Updated movie synopsis from e2e."
  );
  await expect(page.locator('select[name="status"]')).toHaveValue("draft");

  await page.getByRole("button", { name: "Sync from TMDB" }).click();

  await expect(page).toHaveURL(/\/admin\/movies\/.+/, { timeout: 20_000 });
  await expect(page.getByText("Movie synced from TMDB successfully.")).toBeVisible();
  await expect(page.locator('input[name="title"]')).toHaveValue(syncedTitle);
  await expect(page.locator('input[name="slug"]')).toHaveValue("e2e-mario-remix");
  await expect(page.locator('select[name="status"]')).toHaveValue("draft");
  await expect(page.locator('input[name="tagline"]')).not.toHaveValue(syncedTagline);

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm Delete" }).click();

  await expect(page).toHaveURL(/\/admin\/movies(\?|$)/, { timeout: 20_000 });
  await expect(page.getByText("Movie deleted successfully.")).toBeVisible();
  await expect(page.getByText(updatedTitle)).toHaveCount(0);
});

test("imports a movie and creates, edits, and deletes a booking", async ({
  page,
}) => {
  const expectedRunWindow = await page.evaluate(() => {
    const formatDateInputValue = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const daysSinceFriday = (dayOfWeek - 5 + 7) % 7;
    const startOffset = dayOfWeek >= 5 ? -daysSinceFriday : daysUntilFriday;

    const runStartsOn = new Date(today);
    runStartsOn.setDate(today.getDate() + startOffset);

    const runEndsOn = new Date(runStartsOn);
    runEndsOn.setDate(runStartsOn.getDate() + 2);

    return {
      runStartsOn: formatDateInputValue(runStartsOn),
      runEndsOn: formatDateInputValue(runEndsOn),
    };
  });

  await page.goto("/admin/movies/new?query=mario");
  await expect(page.locator('[data-e2e-ready="true"]')).toBeVisible();

  await expect(page.getByRole("heading", { name: "Import from TMDB" })).toBeVisible();
  await page.getByRole("button", { name: "Import Movie" }).click();

  await expect(page).toHaveURL(/\/admin\/movies\/.+/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "The Super Mario Bros. Movie" })
  ).toBeVisible();

  await page.getByRole("link", { name: "Create Booking" }).click();
  await expect(page.locator('[data-e2e-ready="true"]')).toBeVisible();
  await expect(page.locator('input[name="runStartsOn"]')).toHaveValue(
    expectedRunWindow.runStartsOn
  );
  await expect(page.locator('input[name="runEndsOn"]')).toHaveValue(
    expectedRunWindow.runEndsOn
  );
  await page.locator('input[name="runStartsOn"]').fill("2026-06-01");
  await page.locator('input[name="runEndsOn"]').fill("2026-06-07");
  await page.locator('input[name="badge"]').fill("Family Week");
  await page.locator('textarea[name="note"]').fill("E2E booking note");
  await page.locator('input[name="showtime-Monday"]').fill("7:00 PM");
  await page.getByRole("button", { name: "Create Booking" }).click();

  await expect(page).toHaveURL(/\/admin\/schedule\/.+/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Edit booking" })).toBeVisible();
  await expect(page.locator('input[name="badge"]')).toHaveValue("Family Week");
  await expect(page.locator('textarea[name="note"]')).toHaveValue("E2E booking note");

  await page.locator('input[name="badge"]').fill("Updated Week");
  await page.locator('textarea[name="note"]').fill("Updated booking note");
  await page.getByRole("button", { name: "Save Booking" }).click();

  await expect(page).toHaveURL(/\/admin\/schedule\/.+/, { timeout: 20_000 });
  await expect(page.getByText("Booking saved successfully.")).toBeVisible();
  await expect(page.locator('input[name="badge"]')).toHaveValue("Updated Week");
  await expect(page.locator('textarea[name="note"]')).toHaveValue("Updated booking note");

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm Delete" }).click();

  await expect(page).toHaveURL(/\/admin\/schedule(\?|$)/, { timeout: 20_000 });
  await expect(page.getByText("Booking deleted successfully.")).toBeVisible();
  await expect(page.getByText("The Super Mario Bros. Movie")).toHaveCount(0);
});

test("creates, edits, and deletes an event", async ({ page }) => {
  await page.goto("/admin/events");
  await page.getByRole("link", { name: "Add Event" }).click();

  await page.locator('input[name="title"]').fill("E2E Summer Gala");
  await page.locator('input[name="slug"]').fill("e2e-summer-gala");
  await page.locator('input[name="startsAt"]').fill("2026-07-10T19:00");
  await page.locator('input[name="endsAt"]').fill("2026-07-10T21:30");
  await page.locator('textarea[name="summary"]').fill("A gala created in e2e.");
  await page.locator('textarea[name="description"]').fill("Event description created in e2e.");
  await page.getByRole("button", { name: "Create Event" }).click();

  await expect(page).toHaveURL(/\/admin\/events\/.+/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "E2E Summer Gala" })).toBeVisible();

  await page.locator('textarea[name="summary"]').fill("Updated gala summary");
  await page.getByRole("button", { name: "Save Event" }).click();

  await expect(page).toHaveURL(/\/admin\/events\/.+/, { timeout: 20_000 });
  await expect(page.locator('textarea[name="summary"]')).toHaveValue(
    "Updated gala summary"
  );

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm Delete" }).click();

  await expect(page).toHaveURL(/\/admin\/events(\?|$)/, { timeout: 20_000 });
  await expect(page.getByText("E2E Summer Gala")).toHaveCount(0);
});

test("creates, edits, and deletes a concessions item", async ({ page }) => {
  await page.goto("/admin/concessions");
  await expect(page.locator('[data-e2e-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Add Item" }).click();

  await page.getByLabel("Item Name").fill("E2E Nachos");
  await page.getByLabel("Description").fill("Fresh chips and queso.");
  await page.getByRole("textbox", { name: "Category", exact: true }).fill("Snacks");
  await page.getByRole("spinbutton", { name: "Base Price", exact: true }).fill("9.5");
  await page.getByRole("textbox", { name: "SKU", exact: true }).fill("E2E-NACHO");
  await page
    .getByRole("textbox", { name: "Taxable Category", exact: true })
    .fill("prepared-food");
  await page.getByRole("button", { name: "Create Item" }).click();

  await expect(page.getByText("E2E Nachos")).toBeVisible();
  await page.getByText("E2E Nachos").click();

  await page.getByLabel("Description").fill("Fresh chips, queso, and jalapenos.");
  await page.getByRole("spinbutton", { name: "Base Price", exact: true }).fill("10.25");
  await page.getByRole("button", { name: "Save Changes" }).click();

  const catalogTable = page.locator("tbody");
  await expect(catalogTable.getByText("E2E Nachos")).toBeVisible();
  await expect(
    catalogTable.getByText("Fresh chips, queso, and jalapenos.")
  ).toBeVisible();
  await expect(catalogTable.getByText("$10.25")).toBeVisible();

  await page.getByText("E2E Nachos").click();
  await page.getByRole("button", { name: "Delete Item" }).click();
  await page.getByRole("button", { name: "Confirm Delete" }).click();

  await expect(catalogTable.getByText("E2E Nachos")).toHaveCount(0);
});
