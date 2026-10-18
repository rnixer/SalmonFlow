import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Order } from "../types";
import { Button } from "./ui/button";

export type OrderRow = Order & {
  customer: string;
  allocated: number;
  status: string;
};
export function OrderTable({
  rows,
  onSelect,
  status,
  onStatusChange,
}: {
  rows: OrderRow[];
  onSelect: (order: Order) => void;
  status: string;
  onStatusChange: (status: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: false },
  ]);
  const columnFilters = useMemo(
    () => [
      { id: "id", value: search },
      { id: "type", value: type },
      { id: "status", value: status },
    ],
    [search, type, status],
  );
  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Order / Created",
        cell: ({ row }) => (
          <>
            <button
              className="font-semibold text-slate-800 hover:text-blue-600"
              onClick={() => onSelect(row.original)}
            >
              {row.original.id}
            </button>
            <div className="mt-1 text-xs text-slate-400">
              {row.original.date} · {row.original.itemId}
            </div>
          </>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <>
            <span className="font-medium">{row.original.customer}</span>
            <div className="mt-1 text-xs text-slate-400">
              {row.original.customerId}
            </div>
          </>
        ),
      },
      {
        accessorKey: "type",
        header: "Priority",
        cell: ({ getValue }) => (
          <span className={`badge ${String(getValue()).toLowerCase()}`}>
            {String(getValue())}
          </span>
        ),
      },
      {
        accessorKey: "warehouseId",
        header: "Allowed source",
        cell: ({ row }) => (
          <>
            <div>
              {row.original.warehouseId === "WH-000"
                ? "Any warehouse"
                : row.original.warehouseId}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {row.original.supplierId === "SP-000"
                ? "Any supplier"
                : row.original.supplierId}
            </div>
          </>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Requested",
        cell: ({ getValue }) => (
          <span className="tabular-nums">
            {Number(getValue()).toLocaleString()}{" "}
            <span className="text-xs text-slate-400">units</span>
          </span>
        ),
      },
      {
        accessorKey: "allocated",
        header: "Allocated",
        cell: ({ row }) => (
          <>
            <div className="font-medium tabular-nums">
              {row.original.allocated}{" "}
              <span className="font-normal text-slate-400">
                / {row.original.quantity}
              </span>
            </div>
            <div className="mt-2 h-1 w-20 rounded bg-slate-100">
              <div
                className="h-1 rounded bg-blue-500"
                style={{
                  width: `${(row.original.allocated / row.original.quantity) * 100}%`,
                }}
              />
            </div>
          </>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => (
          <span className={`badge ${String(getValue()).toLowerCase()}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {String(getValue())}
          </span>
        ),
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            onClick={() => onSelect(row.original)}
            aria-label={`Manage ${row.original.id}`}
          >
            <ChevronRight size={16} />
          </Button>
        ),
      },
      { accessorKey: "date", header: "Date" },
    ],
    [onSelect],
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: { pageSize: 25 },
      columnVisibility: { date: false },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  const count = table.getFilteredRowModel().rows.length;
  const page = table.getState().pagination.pageIndex;
  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-semibold text-slate-900">
            Customer orders{" "}
            <span className="ml-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
              {rows.length.toLocaleString()}
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review allocations and manage individual orders.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSorting([{ id: "date", desc: !sorting[0]?.desc }])}
        >
          <ArrowDownUp size={14} />
          {sorting[0]?.desc ? "Newest first" : "Oldest first"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 border-y border-slate-100 bg-slate-50/50 px-5 py-4">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className="field w-full pl-9"
            placeholder="Search by order ID…"
            aria-label="Search order ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="field"
          aria-label="Order priority"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="">All priorities</option>
          <option>EMERGENCY</option>
          <option>OVERDUE</option>
          <option>DAILY</option>
        </select>
        <select
          className="field"
          aria-label="Allocation status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="">All statuses</option>
          <option>Allocated</option>
          <option>Partial</option>
          <option>Pending</option>
        </select>
        {(search || type || status) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setType("");
              onStatusChange("");
            }}
          >
            Clear
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    className="whitespace-nowrap px-5 py-3 font-medium"
                    key={header.id}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                className="border-t border-slate-100 hover:bg-blue-50/30"
                key={row.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <td className="whitespace-nowrap px-5 py-4" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!count && (
          <div className="p-14 text-center text-slate-500">
            No orders match your filters. Try a different order ID or clear the
            filters.
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm text-slate-500">
        <span>
          {count ? `${page * 25 + 1}–${Math.min((page + 1) * 25, count)}` : "0"}{" "}
          of {count.toLocaleString()} orders
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </Button>
          <span>
            Page {count ? page + 1 : 0} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}
