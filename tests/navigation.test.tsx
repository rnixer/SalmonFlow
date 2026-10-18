import { act, Profiler } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { handlers } from "../src/mocks/handlers";
import App from "../src/App";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | undefined;
let container: HTMLDivElement;
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

async function waitForWorkspace() {
  await vi.waitFor(
    async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(container.querySelector("tbody")).toBeTruthy();
    },
    { timeout: 3000 },
  );
}

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  server.resetHandlers();
});

describe("workspace navigation", () => {
  it("shows loading, handles HTTP failure and retries before auto allocation", async () => {
    server.use(
      http.get(
        "*/api/allocation-data",
        () => new HttpResponse(null, { status: 500 }),
        { once: true },
      ),
    );
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(<App />));
    await vi.waitFor(async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        "HTTP 500",
      );
    });
    expect(container.querySelector("tbody")).toBeNull();
    await act(async () =>
      container.querySelector<HTMLButtonElement>("button")!.click(),
    );
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Loading allocation data",
    );
    await waitForWorkspace();
    expect(container.textContent).toContain("Initial auto allocation complete");
    expect(container.textContent).toContain("Page 1 of 208");
  });
  it("links summary filters and supports cancel, release, save and rerun auto", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(<App />));
    await waitForWorkspace();
    async function click(label: string) {
      const button = Array.from(container.querySelectorAll("button")).find(
        (button) =>
          button.textContent?.trim().startsWith(label) ||
          button.getAttribute("aria-label") === label,
      )!;
      expect(button).toBeTruthy();
      await act(async () => button.click());
    }
    await click("Run auto allocation");
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "No additional allocation",
    );
    await click("Allocation summary");
    await click("Fully allocated");
    expect(
      container.querySelector<HTMLSelectElement>(
        '[aria-label="Allocation status"]',
      )!.value,
    ).toBe("Allocated");
    for (const row of container.querySelectorAll("tbody tr"))
      expect(row.textContent).toContain("Allocated");
    const orderButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label^="Manage ORDER-"]',
    )!;
    const orderLabel = orderButton.getAttribute("aria-label")!;
    await act(async () => orderButton.click());
    expect(container.textContent).toContain("Current allocation sources");
    expect(container.textContent).toContain("Credit available for this edit");
    await click("Remove source");
    await click("Cancel");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await click(orderLabel);
    expect(container.querySelector('[role="dialog"]')!.textContent).toContain(
      "units × THB",
    );
    while (
      Array.from(container.querySelectorAll("button")).some(
        (button) => button.textContent === "Remove source",
      )
    )
      await click("Remove source");
    await click("Save allocation");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Allocation updated",
    );
    await click("Run auto allocation");
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Auto allocation added",
    );
    await click("Clear");
    expect(container.textContent).toContain("Page 1 of 208");
  });
  it("paginates, filters, sorts and switches tabs without a render loop", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    let commits = 0;
    const checkRenderCount = () => {
      commits++;
      if (commits > 40) throw new Error("Table entered a render loop");
    };
    await act(async () => {
      root!.render(
        <Profiler id="workspace" onRender={checkRenderCount}>
          <App />
        </Profiler>,
      );
    });
    await waitForWorkspace();
    async function clickButton(label: string) {
      const button = Array.from(container.querySelectorAll("button")).find(
        (button) =>
          button.getAttribute("aria-label") === label ||
          button.textContent?.trim() === label,
      );
      expect(button, `Button ${label} exists`).toBeTruthy();
      await act(async () => button!.click());
    }
    expect(container.textContent).toContain("Page 1 of 208");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(25);
    await clickButton("Next page");
    expect(container.textContent).toContain("Page 2 of 208");
    await clickButton("Next page");
    expect(container.textContent).toContain("Page 3 of 208");
    await clickButton("Previous page");
    expect(container.textContent).toContain("Page 2 of 208");
    await clickButton("Oldest first");
    expect(container.textContent).toContain("Newest first");
    expect(container.textContent).toContain("Page 1 of 208");
    const priority = container.querySelector<HTMLSelectElement>(
      '[aria-label="Order priority"]',
    )!;
    await act(async () => {
      priority.value = "EMERGENCY";
      priority.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.querySelectorAll("tbody tr")).toHaveLength(25);
    for (const row of container.querySelectorAll("tbody tr"))
      expect(row.textContent).toContain("EMERGENCY");
    await clickButton("Next page");
    expect(container.textContent).toMatch(/Page 2 of/);
    await clickButton("Clear");
    expect(container.textContent).toContain("Page 1 of 208");
    const inventoryTab = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Inventory overview",
    )!;
    await act(async () => inventoryTab.click());
    expect(container.textContent).toContain("Remaining stock by warehouse");
    await clickButton("Allocation summary");
    expect(container.textContent).toContain("Why orders remain incomplete");
    await clickButton("Customer orders");
    expect(container.textContent).toContain("Page 1 of 208");
    const manage = container.querySelector<HTMLButtonElement>(
      'button[aria-label^="Manage ORDER-"]',
    )!;
    await act(async () => manage.click());
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    await clickButton("Close allocation panel");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(commits).toBeLessThan(40);
  });
});
