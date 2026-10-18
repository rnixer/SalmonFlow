import type { Customer, Inventory, Order, OrderType } from "./types";

export const customers: Customer[] = Array.from(
  { length: 160 },
  (_, index) => ({
    id: `CT-${String(index + 1).padStart(4, "0")}`,
    name: `${["Ocean Table", "Hokkaido Kitchen", "Fresh Market", "Nordic Foods", "Bluefin Bistro", "Sakura Dining", "Coastal Kitchen", "Harbor Wholesale"][index % 8]} ${Math.floor(index / 8) + 1}`,
    credit: String(19000 + (index % 9) * 9500),
  }),
);
export const inventory: Inventory[] = Array.from(
  { length: 12 },
  (_, index) => ({
    id: `ST-${index + 1}`,
    itemId: index < 6 ? "Item-1" : "Item-2",
    warehouseId: `WH-00${(index % 3) + 1}`,
    supplierId: `SP-00${(Math.floor(index / 3) % 2) + 1}`,
    quantity: 9000 + index * 1100,
    price: String(
      index < 6 ? 123.49 + (index % 2) * 8 : 99.75 + (index % 2) * 6,
    ),
  }),
);
export function generateOrders(count = 5200): Order[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `ORDER-${String(index + 1).padStart(5, "0")}`,
    customerId: customers[(index * 37) % customers.length].id,
    itemId: index % 2 ? "Item-2" : "Item-1",
    warehouseId: index % 4 === 0 ? "WH-000" : `WH-00${(index % 3) + 1}`,
    supplierId: index % 3 === 0 ? "SP-000" : `SP-00${(index % 2) + 1}`,
    quantity: 11 + ((index * 17) % 290),
    type: (["EMERGENCY", "OVERDUE", "DAILY"] as OrderType[])[
      index % 7 < 1 ? 0 : index % 7 < 3 ? 1 : 2
    ],
    date: new Date(Date.UTC(2025, 0, 1 + (index % 180)))
      .toISOString()
      .slice(0, 10),
  }));
}
