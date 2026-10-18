export type OrderType = "EMERGENCY" | "OVERDUE" | "DAILY";
export type Order = {
  id: string;
  customerId: string;
  itemId: string;
  warehouseId: string;
  supplierId: string;
  quantity: number;
  type: OrderType;
  date: string;
};
export type Customer = { id: string; name: string; credit: string };
export type Inventory = {
  id: string;
  itemId: string;
  warehouseId: string;
  supplierId: string;
  quantity: number;
  price: string;
};
export type Allocation = {
  orderId: string;
  inventoryId: string;
  quantity: number;
  unitPrice: string;
  cost: string;
};
export type AllocationState = {
  inventory: Inventory[];
  customers: Customer[];
  allocations: Allocation[];
};
export type AllocationData = {
  orders: Order[];
  customers: Customer[];
  inventory: Inventory[];
};
