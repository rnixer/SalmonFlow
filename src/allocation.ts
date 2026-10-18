import Decimal from "decimal.js";
import type { AllocationState, Inventory, Order } from "./types";

const priority = { EMERGENCY: 0, OVERDUE: 1, DAILY: 2 };
const multiplier = { EMERGENCY: "1.25", OVERDUE: "1", DAILY: "0.9" };
export function calculateUnitPrice(price: string, type: Order["type"]) {
  const unitPrice = new Decimal(price)
    .times(multiplier[type])
    .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  if (!unitPrice.isFinite() || unitPrice.lte(0)) {
    throw new Error(
      "Adjusted unit price must be finite and greater than zero.",
    );
  }
  return unitPrice;
}
export function sortOrdersByPriority(orders: Order[]) {
  return [...orders].sort(
    (a, b) =>
      priority[a.type] - priority[b.type] ||
      a.date.localeCompare(b.date) ||
      a.id.localeCompare(b.id),
  );
}
export function allocatedQuantity(state: AllocationState, orderId: string) {
  return state.allocations
    .filter((allocation) => allocation.orderId === orderId)
    .reduce((sum, allocation) => sum + allocation.quantity, 0);
}
export function findAvailableInventory(order: Order, inventory: Inventory[]) {
  return inventory
    .filter(
      (stock) =>
        stock.itemId === order.itemId &&
        (order.warehouseId === "WH-000" ||
          stock.warehouseId === order.warehouseId) &&
        (order.supplierId === "SP-000" ||
          stock.supplierId === order.supplierId) &&
        stock.quantity > 0,
    )
    .sort((a, b) => b.quantity - a.quantity || a.id.localeCompare(b.id));
}
export function allocateManually(
  state: AllocationState,
  order: Order,
  inventoryId: string,
  quantity: number,
): AllocationState {
  const stock = findAvailableInventory(order, state.inventory).find(
    (item) => item.id === inventoryId,
  );
  const customer = state.customers.find((item) => item.id === order.customerId);
  if (!Number.isSafeInteger(quantity) || quantity <= 0)
    throw new Error("Enter a positive whole quantity.");
  if (!stock) throw new Error("Choose eligible, available inventory.");
  if (!customer) throw new Error("Customer was not found.");
  if (quantity > order.quantity - allocatedQuantity(state, order.id))
    throw new Error("Quantity exceeds the remaining order request.");
  if (quantity > stock.quantity)
    throw new Error("Quantity exceeds available stock.");
  const unitPrice = calculateUnitPrice(stock.price, order.type);
  const cost = unitPrice.times(quantity);
  if (cost.gt(customer.credit))
    throw new Error("Allocation cost exceeds customer credit.");
  return {
    inventory: state.inventory.map((item) =>
      item.id === stock.id
        ? { ...item, quantity: item.quantity - quantity }
        : item,
    ),
    customers: state.customers.map((item) =>
      item.id === customer.id
        ? { ...item, credit: new Decimal(item.credit).minus(cost).toFixed(2) }
        : item,
    ),
    allocations: [
      ...state.allocations,
      {
        orderId: order.id,
        inventoryId,
        quantity,
        unitPrice: unitPrice.toFixed(2),
        cost: cost.toFixed(2),
      },
    ],
  };
}
export function releaseOrderAllocation(
  state: AllocationState,
  order: Order,
): AllocationState {
  const previous = state.allocations.filter(
    (item) => item.orderId === order.id,
  );
  const refunded = previous.reduce(
    (sum, item) => sum.plus(item.cost),
    new Decimal(0),
  );
  return {
    inventory: state.inventory.map((stock) => ({
      ...stock,
      quantity:
        stock.quantity +
        previous
          .filter((item) => item.inventoryId === stock.id)
          .reduce((sum, item) => sum + item.quantity, 0),
    })),
    customers: state.customers.map((customer) =>
      customer.id === order.customerId
        ? {
            ...customer,
            credit: new Decimal(customer.credit).plus(refunded).toFixed(2),
          }
        : customer,
    ),
    allocations: state.allocations.filter((item) => item.orderId !== order.id),
  };
}
export function replaceOrderAllocation(
  state: AllocationState,
  order: Order,
  entries: { inventoryId: string; quantity: number }[],
): AllocationState {
  let next = releaseOrderAllocation(state, order);
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.quantity) || entry.quantity < 0)
      throw new Error("Enter non-negative whole quantities.");
    if (entry.quantity > 0)
      next = allocateManually(next, order, entry.inventoryId, entry.quantity);
  }
  return next;
}
export function allocationReason(
  state: AllocationState,
  order: Order,
  allocated: number,
): string {
  if (allocated >= order.quantity) return "This order is fully allocated.";
  const eligible = findAvailableInventory(order, state.inventory);
  if (!eligible.length)
    return "No remaining stock matches this item and its source restrictions.";
  const credit =
    state.customers.find((customer) => customer.id === order.customerId)
      ?.credit ?? "0";
  if (
    eligible.every((stock) =>
      calculateUnitPrice(stock.price, order.type).gt(credit),
    )
  )
    return "Customer credit cannot cover another unit from an eligible supplier.";
  return "Eligible stock and credit are available. Allocate manually or run auto allocation.";
}
export function allocateOrders(
  orders: Order[],
  initial: AllocationState,
): AllocationState {
  const state: AllocationState = {
    inventory: initial.inventory.map((stock) => ({ ...stock })),
    customers: initial.customers.map((customer) => ({ ...customer })),
    allocations: [...initial.allocations],
  };
  const customersById = new Map(
    state.customers.map((customer) => [customer.id, customer]),
  );
  const quantities = new Map<string, number>();
  for (const allocation of state.allocations)
    quantities.set(
      allocation.orderId,
      (quantities.get(allocation.orderId) ?? 0) + allocation.quantity,
    );
  for (const order of sortOrdersByPriority(orders)) {
    const customer = customersById.get(order.customerId);
    if (!customer) continue;
    let remaining = order.quantity - (quantities.get(order.id) ?? 0);
    for (const stock of findAvailableInventory(order, state.inventory)) {
      if (remaining <= 0) break;
      const unitPrice = calculateUnitPrice(stock.price, order.type);
      const affordable = new Decimal(customer.credit)
        .div(unitPrice)
        .floor()
        .toNumber();
      const quantity = Math.min(remaining, stock.quantity, affordable);
      if (quantity <= 0) continue;
      const cost = unitPrice.times(quantity);
      stock.quantity -= quantity;
      remaining -= quantity;
      quantities.set(order.id, (quantities.get(order.id) ?? 0) + quantity);
      customer.credit = new Decimal(customer.credit).minus(cost).toFixed(2);
      state.allocations.push({
        orderId: order.id,
        inventoryId: stock.id,
        quantity,
        unitPrice: unitPrice.toFixed(2),
        cost: cost.toFixed(2),
      });
    }
  }
  return state;
}
