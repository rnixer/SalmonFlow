import { useEffect, useMemo, useRef, useState } from "react";
import Decimal from "decimal.js";
import { X } from "lucide-react";
import {
  allocatedQuantity,
  allocationReason,
  calculateUnitPrice,
  findAvailableInventory,
  releaseOrderAllocation,
  replaceOrderAllocation,
} from "../allocation";
import type { AllocationState, Order } from "../types";
import { Button } from "./ui/button";

type DraftEntry = { inventoryId: string; quantity: string };
export function AllocationPanel({
  order,
  state,
  onClose,
  onAllocate,
}: {
  order: Order;
  state: AllocationState;
  onClose: () => void;
  onAllocate: (entries: { inventoryId: string; quantity: number }[]) => void;
}) {
  const previous = state.allocations.filter(
    (entry) => entry.orderId === order.id,
  );
  const released = useMemo(
    () => releaseOrderAllocation(state, order),
    [state, order],
  );
  const eligible = findAvailableInventory(order, released.inventory);
  const customer = state.customers.find(
    (item) => item.id === order.customerId,
  )!;
  const editingCredit = released.customers.find(
    (item) => item.id === order.customerId,
  )!.credit;
  const [draft, setDraft] = useState<DraftEntry[]>(() =>
    previous.length
      ? previous.map((entry) => ({
          inventoryId: entry.inventoryId,
          quantity: String(entry.quantity),
        }))
      : [{ inventoryId: eligible[0]?.id ?? "", quantity: "0" }],
  );
  const [error, setError] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const elements = panel.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input, select",
      );
      if (!elements?.length) return;
      const first = elements[0],
        last = elements[elements.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      focused?.focus();
    };
  }, [onClose]);
  const entries = draft.map((entry) => ({
    inventoryId: entry.inventoryId,
    quantity: entry.quantity.trim() ? Number(entry.quantity) : NaN,
  }));
  let validation = "",
    totalCost = new Decimal(0),
    totalQuantity = 0;
  try {
    const preview = replaceOrderAllocation(state, order, entries);
    const allocations = preview.allocations.filter(
      (entry) => entry.orderId === order.id,
    );
    totalCost = allocations.reduce(
      (sum, entry) => sum.plus(entry.cost),
      new Decimal(0),
    );
    totalQuantity = allocations.reduce((sum, entry) => sum + entry.quantity, 0);
  } catch (failure) {
    validation =
      failure instanceof Error ? failure.message : "Invalid allocation.";
  }
  const positiveEntries = entries.filter((entry) => entry.quantity > 0);
  const unchanged =
    previous.length === positiveEntries.length &&
    previous.every(
      (entry, index) =>
        entry.inventoryId === positiveEntries[index]?.inventoryId &&
        entry.quantity === positiveEntries[index]?.quantity,
    );
  function update(index: number, changes: Partial<DraftEntry>) {
    setDraft((current) =>
      current.map((entry, position) =>
        position === index ? { ...entry, ...changes } : entry,
      ),
    );
    setError("");
  }
  const allocated = allocatedQuantity(state, order.id);
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="allocation-title"
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl outline-none"
      >
        <header className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
              Manual allocation
            </p>
            <h2 id="allocation-title" className="mt-2 text-xl font-semibold">
              {order.id}
            </h2>
          </div>
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Close allocation panel"
          >
            <X size={20} />
          </Button>
        </header>
        <div className="space-y-6 p-6">
          <div>
            <span className={`badge ${order.type.toLowerCase()}`}>
              {order.type}
            </span>
            <h3 className="mt-3 font-semibold">{customer.name}</h3>
            <p className="text-sm text-slate-500">
              {customer.id} / {order.itemId} / {order.date}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Source restrictions:{" "}
              {order.warehouseId === "WH-000"
                ? "Any warehouse"
                : order.warehouseId}{" "}
              /{" "}
              {order.supplierId === "SP-000"
                ? "Any supplier"
                : order.supplierId}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4">
            {[
              ["Requested", order.quantity],
              ["Allocated", allocated],
              ["Remaining", order.quantity - allocated],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {allocationReason(state, order, allocated)}
          </p>
          <section>
            <h3 className="mb-3 font-medium">Current allocation sources</h3>
            {!previous.length ? (
              <p className="text-sm text-slate-500">No allocation yet.</p>
            ) : (
              previous.map((entry, index) => {
                const stock = state.inventory.find(
                  (item) => item.id === entry.inventoryId,
                )!;
                return (
                  <div
                    key={index}
                    className="mb-2 rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    <p className="font-medium">
                      {stock.warehouseId} / {stock.supplierId}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {entry.quantity} units × THB {entry.unitPrice} = THB{" "}
                      {entry.cost}
                    </p>
                  </div>
                );
              })
            )}
          </section>
          <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
            <p>
              Customer remaining credit: <strong>THB {customer.credit}</strong>
            </p>
            <p className="mt-2">
              Credit available for this edit:{" "}
              <strong>THB {editingCredit}</strong>
            </p>
            <p className="mt-2 text-xs">
              Includes credit returned from this order's current allocation.
              Other orders keep their allocations.
            </p>
          </div>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                onAllocate(entries);
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "Allocation failed.",
                );
              }
            }}
          >
            <div>
              <h3 className="font-medium">Edit total allocation</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                These quantities replace this order's existing allocation. Stock
                shown includes units returned from this order. Use 0 or remove a
                source to release its units. Changes apply only when saved.
              </p>
            </div>
            {draft.map((entry, index) => {
              const stock = eligible.find(
                (item) => item.id === entry.inventoryId,
              );
              return (
                <div
                  key={index}
                  className="space-y-3 rounded-xl border border-slate-200 p-4"
                >
                  <label className="block text-sm font-medium">
                    Warehouse & supplier
                    <select
                      className="field mt-2 w-full"
                      value={entry.inventoryId}
                      onChange={(event) =>
                        update(index, { inventoryId: event.target.value })
                      }
                    >
                      {!eligible.length && (
                        <option value="">No eligible stock</option>
                      )}
                      {eligible.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.warehouseId} / {item.supplierId} ·{" "}
                          {item.quantity} units
                        </option>
                      ))}
                    </select>
                  </label>
                  {stock && (
                    <p className="text-xs text-slate-500">
                      THB{" "}
                      {calculateUnitPrice(stock.price, order.type).toFixed(2)} /
                      unit
                    </p>
                  )}
                  <label className="block text-sm font-medium">
                    Total quantity from this source
                    <input
                      className="field mt-2 w-full"
                      type="number"
                      min="0"
                      step="1"
                      value={entry.quantity}
                      onChange={(event) =>
                        update(index, { quantity: event.target.value })
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDraft((current) =>
                        current.filter((_, position) => position !== index),
                      );
                      setError("");
                    }}
                  >
                    Remove source
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              disabled={!eligible.length}
              onClick={() =>
                setDraft((current) => [
                  ...current,
                  { inventoryId: eligible[0].id, quantity: "0" },
                ])
              }
            >
              Add source
            </Button>
            <div className="flex justify-between border-t border-slate-100 pt-4 text-sm">
              <span>New total: {validation ? "—" : totalQuantity} units</span>
              <strong>THB {validation ? "—" : totalCost.toFixed(2)}</strong>
            </div>
            {(validation || error) && (
              <p role="alert" className="text-sm text-red-600">
                {error || validation}
              </p>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={!!validation || unchanged}>
                Save allocation
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
