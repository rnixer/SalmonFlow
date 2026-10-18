import type { Inventory } from "../types";

export function InventoryTable({ inventory }: { inventory: Inventory[] }) {
  return (
    <section className="surface overflow-hidden">
      <div className="p-5">
        <h2 className="font-semibold text-slate-900">Inventory overview</h2>
        <p className="mt-1 text-sm text-slate-500">
          Remaining stock by warehouse, supplier and item.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {[
                "Warehouse",
                "Supplier",
                "Item",
                "Base price",
                "Remaining stock",
              ].map((label) => (
                <th key={label} className="px-5 py-3 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inventory.map((stock) => (
              <tr key={stock.id} className="border-t border-slate-100">
                <td className="px-5 py-4 font-medium">{stock.warehouseId}</td>
                <td className="px-5 py-4">{stock.supplierId}</td>
                <td className="px-5 py-4">{stock.itemId}</td>
                <td className="px-5 py-4">฿{Number(stock.price).toFixed(2)}</td>
                <td className="px-5 py-4">
                  <span
                    className={`badge ${stock.quantity ? "allocated" : "pending"}`}
                  >
                    {stock.quantity.toLocaleString()} units
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
