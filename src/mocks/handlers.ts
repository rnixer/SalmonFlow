import { delay, http, HttpResponse } from "msw";
import { customers, generateOrders, inventory } from "../data";
import type { AllocationData } from "../types";

export const handlers = [
  http.get("*/api/allocation-data", async () => {
    await delay(500);
    return HttpResponse.json<AllocationData>({
      orders: generateOrders(),
      customers,
      inventory,
    });
  }),
];
