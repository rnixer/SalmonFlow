import { describe, expect, it } from "vitest";
import {
  replaceOrderAllocation,
  releaseOrderAllocation,
  allocationReason,
  allocateManually,
  allocateOrders,
  calculateUnitPrice,
  findAvailableInventory,
  sortOrdersByPriority,
} from "../src/allocation";
import { customers, generateOrders, inventory } from "../src/data";
import type { AllocationState, Order } from "../src/types";

const order: Order = {
  id: "ORDER-1",
  customerId: "CT-1",
  itemId: "Item-1",
  warehouseId: "WH-000",
  supplierId: "SP-000",
  quantity: 10,
  type: "OVERDUE",
  date: "2025-01-01",
};
function fixture(): AllocationState {
  return {
    customers: [{ id: "CT-1", name: "Test customer", credit: "100.00" }],
    inventory: [
      {
        id: "ST-1",
        itemId: "Item-1",
        warehouseId: "WH-001",
        supplierId: "SP-001",
        quantity: 20,
        price: "10.00",
      },
      {
        id: "ST-2",
        itemId: "Item-1",
        warehouseId: "WH-002",
        supplierId: "SP-002",
        quantity: 30,
        price: "20.00",
      },
    ],
    allocations: [],
  };
}
describe("allocation rules", () => {
  it("rejects zero, negative and non-finite adjusted prices before allocating", () => {
    for (const price of ["0", "-1", "NaN", "Infinity", "-Infinity", "0.005"]) {
      expect(() => calculateUnitPrice(price, "OVERDUE")).toThrow(
        "greater than zero",
      );
      const state = fixture();
      state.inventory[0].price = price;
      const restricted = { ...order, warehouseId: "WH-001" };
      const snapshot = structuredClone(state);
      expect(() => allocateOrders([restricted], state)).toThrow(
        "greater than zero",
      );
      expect(() => allocateManually(state, restricted, "ST-1", 1)).toThrow(
        "greater than zero",
      );
      expect(state).toEqual(snapshot);
    }
    expect(() => calculateUnitPrice("0.005", "DAILY")).toThrow(
      "greater than zero",
    );
    expect(calculateUnitPrice("0.01", "DAILY").toFixed(2)).toBe("0.01");
  });
  it("replaces multiple sources and refunds their original costs", () => {
    const original = fixture();
    const existing = allocateManually(
      allocateManually(original, order, "ST-1", 4),
      order,
      "ST-2",
      3,
    );
    expect(releaseOrderAllocation(existing, order).customers[0].credit).toBe(
      "100.00",
    );
    const result = replaceOrderAllocation(existing, order, [
      { inventoryId: "ST-1", quantity: 5 },
      { inventoryId: "ST-2", quantity: 2 },
    ]);
    expect(result.customers[0].credit).toBe("10.00");
    expect(result.inventory.map((stock) => stock.quantity)).toEqual([15, 28]);
    expect(result.allocations.map((entry) => entry.quantity)).toEqual([5, 2]);
    expect(replaceOrderAllocation(existing, order, []).inventory).toEqual(
      original.inventory,
    );
    expect(existing.customers[0].credit).toBe("0.00");
  });
  it("rejects invalid edits atomically and leaves other orders untouched", () => {
    const existing = allocateManually(fixture(), order, "ST-1", 5);
    const other = { ...order, id: "ORDER-2" };
    const state = allocateManually(existing, other, "ST-1", 3);
    const snapshot = structuredClone(state);
    for (const entries of [
      [
        { inventoryId: "ST-1", quantity: 2 },
        { inventoryId: "ST-2", quantity: 4 },
      ],
      [{ inventoryId: "ST-1", quantity: -1 }],
      [{ inventoryId: "ST-1", quantity: 1.5 }],
      [{ inventoryId: "missing", quantity: 1 }],
      [{ inventoryId: "ST-1", quantity: 11 }],
    ])
      expect(() => replaceOrderAllocation(state, order, entries)).toThrow();
    expect(state).toEqual(snapshot);
    const result = replaceOrderAllocation(state, order, [
      { inventoryId: "ST-1", quantity: 7 },
    ]);
    expect(
      result.allocations.find((entry) => entry.orderId === other.id),
    ).toEqual(state.allocations.find((entry) => entry.orderId === other.id));
    expect(allocateOrders([order, other], result).customers[0].credit).toBe(
      "0.00",
    );
  });
  it("explains full, stock-limited, credit-limited and actionable orders", () => {
    expect(allocationReason(fixture(), order, 10)).toContain("fully allocated");
    expect(
      allocationReason(fixture(), { ...order, itemId: "missing" }, 0),
    ).toContain("No remaining stock");
    const state = fixture();
    state.customers[0].credit = "1";
    expect(allocationReason(state, order, 0)).toContain("credit cannot cover");
    expect(allocationReason(fixture(), order, 0)).toContain("available");
  });
  it("does not double count duplicate order rows in the same run", () => {
    const state = fixture();
    state.customers[0].credit = "1000";
    const result = allocateOrders([order, order], state);
    expect(
      result.allocations.reduce((sum, item) => sum + item.quantity, 0),
    ).toBe(10);
  });
  it("sorts by priority, FIFO and deterministic ID", () => {
    const orders: Order[] = [
      { ...order, id: "D", type: "DAILY" },
      { ...order, id: "O", type: "OVERDUE" },
      { ...order, id: "E2", type: "EMERGENCY" },
      { ...order, id: "E1", type: "EMERGENCY" },
      { ...order, id: "E0", type: "EMERGENCY", date: "2024-12-31" },
    ];
    expect(sortOrdersByPriority(orders).map((item) => item.id)).toEqual([
      "E0",
      "E1",
      "E2",
      "O",
      "D",
    ]);
    expect(allocateOrders(orders, fixture()).allocations[0].orderId).toBe("E0");
  });
  it("applies supplier pricing, priority multipliers and half-even rounding", () => {
    expect(calculateUnitPrice("123.49", "EMERGENCY").toFixed(2)).toBe("154.36");
    expect(calculateUnitPrice("99.75", "DAILY").toFixed(2)).toBe("89.78");
    expect(calculateUnitPrice("1.005", "OVERDUE").toFixed(2)).toBe("1.00");
    expect(calculateUnitPrice("1.015", "OVERDUE").toFixed(2)).toBe("1.02");
  });
  it("wildcards choose highest stock and charge the chosen supplier price", () => {
    const result = allocateOrders([order], fixture());
    expect(result.allocations[0]).toMatchObject({
      inventoryId: "ST-2",
      quantity: 5,
      unitPrice: "20.00",
      cost: "100.00",
    });
    expect(result.customers[0].credit).toBe("0.00");
  });
  it("respects each source restriction independently and item eligibility", () => {
    expect(
      findAvailableInventory(
        { ...order, warehouseId: "WH-001" },
        fixture().inventory,
      ).map((item) => item.id),
    ).toEqual(["ST-1"]);
    expect(
      findAvailableInventory(
        { ...order, supplierId: "SP-002" },
        fixture().inventory,
      ).map((item) => item.id),
    ).toEqual(["ST-2"]);
    expect(
      findAvailableInventory(
        { ...order, warehouseId: "WH-001", supplierId: "SP-002" },
        fixture().inventory,
      ),
    ).toEqual([]);
    expect(
      findAvailableInventory(
        { ...order, itemId: "Item-2" },
        fixture().inventory,
      ),
    ).toEqual([]);
  });
  it("allocates partial quantities when stock is insufficient and uses multiple sources", () => {
    const state = fixture();
    state.customers[0].credit = "1000";
    state.inventory[0].quantity = 2;
    state.inventory[1].quantity = 3;
    const result = allocateOrders([order], state);
    expect(result.allocations.map((item) => item.quantity)).toEqual([3, 2]);
    expect(result.inventory.every((item) => item.quantity === 0)).toBe(true);
  });
  it("shares credit between orders and prevents duplicate allocation", () => {
    const state = fixture();
    const orders = [
      { ...order, warehouseId: "WH-001", quantity: 7 },
      { ...order, id: "ORDER-2", warehouseId: "WH-001", quantity: 7 },
    ];
    const result = allocateOrders(orders, state);
    expect(result.allocations.map((item) => item.quantity)).toEqual([7, 3]);
    expect(allocateOrders(orders, result)).toEqual(result);
    expect(state).toEqual(fixture());
    expect(allocateOrders(orders, state)).toEqual(result);
  });
  it("manual allocation updates stock, credit and request consistently", () => {
    const result = allocateManually(fixture(), order, "ST-1", 4);
    expect(result.inventory[0].quantity).toBe(16);
    expect(result.customers[0].credit).toBe("60.00");
    expect(() => allocateManually(result, order, "ST-1", 7)).toThrow(
      "remaining order",
    );
    expect(allocateManually(result, order, "ST-1", 6).customers[0].credit).toBe(
      "0.00",
    );
  });
  it("rejects negative, fractional, excessive stock, credit and ineligible source", () => {
    for (const quantity of [-1, 0, 1.5, NaN, Infinity])
      expect(() =>
        allocateManually(fixture(), order, "ST-1", quantity),
      ).toThrow("positive whole");
    expect(() =>
      allocateManually(fixture(), { ...order, quantity: 50 }, "ST-1", 21),
    ).toThrow("available stock");
    expect(() => allocateManually(fixture(), order, "ST-2", 6)).toThrow(
      "customer credit",
    );
    expect(() =>
      allocateManually(
        fixture(),
        { ...order, warehouseId: "WH-001" },
        "ST-2",
        1,
      ),
    ).toThrow("eligible");
  });
  it("processes 5,200 orders with conservation of stock and credit", () => {
    const orders = generateOrders();
    const original = { inventory, customers, allocations: [] };
    const start = performance.now();
    const result = allocateOrders(orders, original);
    console.info(
      `5,200 order allocation: ${(performance.now() - start).toFixed(0)}ms`,
    );
    expect(result.inventory.every((item) => item.quantity >= 0)).toBe(true);
    expect(result.customers.every((item) => Number(item.credit) >= 0)).toBe(
      true,
    );
    const quantities = new Map<string, number>();
    for (const allocation of result.allocations)
      quantities.set(
        allocation.orderId,
        (quantities.get(allocation.orderId) ?? 0) + allocation.quantity,
      );
    expect(
      orders.every((item) => (quantities.get(item.id) ?? 0) <= item.quantity),
    ).toBe(true);
    for (const stock of inventory)
      expect(
        result.inventory.find((item) => item.id === stock.id)!.quantity +
          result.allocations
            .filter((item) => item.inventoryId === stock.id)
            .reduce((sum, item) => sum + item.quantity, 0),
      ).toBe(stock.quantity);
    const orderCustomers = new Map(
      orders.map((order) => [order.id, order.customerId]),
    );
    for (const customer of customers)
      expect(
        Math.round(
          Number(
            result.customers.find((item) => item.id === customer.id)!.credit,
          ) * 100,
        ) +
          result.allocations
            .filter((item) => orderCustomers.get(item.orderId) === customer.id)
            .reduce(
              (sum, item) => sum + Math.round(Number(item.cost) * 100),
              0,
            ),
      ).toBe(Number(customer.credit) * 100);
    expect(allocateOrders(orders, result)).toEqual(result);
  });
});
