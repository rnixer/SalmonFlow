import { useMemo, useState, useCallback } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { DashboardSummary } from "./DashboardSummary";
import { InventoryTable } from "./InventoryTable";
import { AllocationSummary } from "./AllocationSummary";
import {
  replaceOrderAllocation,
  allocateOrders,
  calculateUnitPrice,
  findAvailableInventory,
} from "../allocation";
import { OrderTable } from "./OrderTable";
import { AllocationPanel } from "./AllocationPanel";
import { Button } from "./ui/button";
import type { AllocationData, Order } from "../types";

export function AllocationWorkspace({
  allocationData,
}: {
  allocationData: AllocationData;
}) {
  const { orders, customers, inventory } = allocationData;
  const initialState = { inventory, customers, allocations: [] };
  const [state, setState] = useState(() =>
    allocateOrders(orders, initialState),
  );
  const [selected, setSelected] = useState<Order | null>(null);
  const [tab, setTab] = useState("orders");
  const [notice, setNotice] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const closePanel = useCallback(() => setSelected(null), []);
  const rows = useMemo(() => {
    const quantities = new Map<string, number>();
    for (const allocation of state.allocations)
      quantities.set(
        allocation.orderId,
        (quantities.get(allocation.orderId) ?? 0) + allocation.quantity,
      );
    const names = new Map(
      customers.map((customer) => [customer.id, customer.name]),
    );
    return orders.map((order) => {
      const allocated = quantities.get(order.id) ?? 0;
      return {
        ...order,
        allocated,
        customer: names.get(order.customerId) ?? order.customerId,
        status:
          allocated === order.quantity
            ? "Allocated"
            : allocated > 0
              ? "Partial"
              : "Pending",
      };
    });
  }, [state, orders, customers]);
  const allocated = state.allocations.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const available = state.inventory.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const complete = rows.filter((row) => row.status === "Allocated").length;
  const partial = rows.filter((row) => row.status === "Partial").length;
  const pending = rows.length - complete - partial;
  const reasons = useMemo(() => {
    let stockLimited = 0,
      creditLimited = 0,
      ready = 0;
    const credits = new Map(
      state.customers.map((customer) => [customer.id, customer.credit]),
    );
    for (const row of rows) {
      if (row.status === "Allocated") continue;
      const eligible = findAvailableInventory(row, state.inventory);
      if (!eligible.length) stockLimited++;
      else if (
        eligible.every((stock) =>
          calculateUnitPrice(stock.price, row.type).gt(
            credits.get(row.customerId) ?? "0",
          ),
        )
      )
        creditLimited++;
      else ready++;
    }
    return { stockLimited, creditLimited, ready };
  }, [rows, state]);
  function showOrdersByStatus(status: string) {
    setOrderStatus(status);
    setTab("orders");
  }
  return (
    <>
      <AppLayout activeTab={tab} onTabChange={setTab}>
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-blue-600">
              Inventory & fulfillment
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Allocation workspace
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              The right stock, to the right orders. All in one place.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const next = allocateOrders(orders, state);
              const added = next.allocations.slice(state.allocations.length);
              const quantity = added.reduce(
                (sum, entry) => sum + entry.quantity,
                0,
              );
              const count = new Set(added.map((entry) => entry.orderId)).size;
              setState(next);
              setNotice(
                quantity
                  ? `Auto allocation added ${quantity.toLocaleString()} units to ${count} orders.`
                  : "No additional allocation: outstanding orders are limited by eligible stock or customer credit.",
              );
            }}
          >
            <RefreshCw size={15} />
            Run auto allocation
          </Button>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-5 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={19} className="text-emerald-600" />
            <p className="text-sm text-emerald-900">
              <strong className="font-medium">
                Initial auto allocation complete
              </strong>
              <span className="ml-2 text-emerald-700">
                All {orders.length.toLocaleString()} orders processed by
                priority and FIFO.
              </span>
            </p>
          </div>
          <span className="text-xs text-emerald-700">
            Credit & stock validated
          </span>
        </div>
        {notice && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 p-3 text-sm text-blue-700"
          >
            {notice}
            <Button variant="ghost" onClick={() => setNotice("")}>
              Dismiss
            </Button>
          </div>
        )}
        <DashboardSummary
          totalOrders={rows.length}
          available={available}
          allocated={allocated}
          complete={complete}
          partial={partial}
          pending={pending}
        />
        <div className="mb-5 flex gap-6 border-b border-slate-200">
          {[
            ["orders", "Customer orders"],
            ["inventory", "Inventory overview"],
            ["summary", "Allocation summary"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`border-b-2 pb-3 text-sm font-medium ${tab === id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "orders" && (
          <OrderTable
            rows={rows}
            onSelect={setSelected}
            status={orderStatus}
            onStatusChange={setOrderStatus}
          />
        )}
        {tab === "inventory" && <InventoryTable inventory={state.inventory} />}
        {tab === "summary" && (
          <AllocationSummary
            complete={complete}
            partial={partial}
            pending={pending}
            available={available}
            reasons={reasons}
            onSelectStatus={showOrdersByStatus}
          />
        )}
      </AppLayout>
      {selected && (
        <AllocationPanel
          key={selected.id}
          order={selected}
          state={state}
          onClose={closePanel}
          onAllocate={(entries) => {
            const next = replaceOrderAllocation(state, selected, entries);
            setState(next);
            setNotice(
              `Allocation updated for ${selected.id}. Inventory and credit updated.`,
            );
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
