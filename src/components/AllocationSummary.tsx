type AllocationSummaryProps = {
  complete: number;
  partial: number;
  pending: number;
  available: number;
  reasons: { stockLimited: number; creditLimited: number; ready: number };
  onSelectStatus: (status: string) => void;
};

export function AllocationSummary({
  complete,
  partial,
  pending,
  available,
  reasons,
  onSelectStatus,
}: AllocationSummaryProps) {
  return (
    <section className="surface p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        Allocation summary
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Automatic allocation respects priority, available inventory and shared
        customer credit.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Fully allocated", complete],
          ["Partially allocated", partial],
          ["Unallocated", pending],
        ].map(([label, value]) => (
          <button
            key={label}
            className="rounded-xl bg-slate-50 p-5 text-left hover:bg-blue-50 focus-visible:outline-blue-600"
            onClick={() => {
              onSelectStatus(
                label === "Fully allocated"
                  ? "Allocated"
                  : label === "Partially allocated"
                    ? "Partial"
                    : "Pending",
              );
            }}
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold">
              {Number(value).toLocaleString()}
            </p>
          </button>
        ))}
      </div>
      <h3 className="mt-7 font-medium">Why orders remain incomplete</h3>
      <div className="mt-3 space-y-3 text-sm text-slate-500">
        <p>
          {reasons.stockLimited.toLocaleString()} orders: no remaining inventory
          matches the item and source restrictions.
        </p>
        <p>
          {reasons.creditLimited.toLocaleString()} orders: customer credit
          cannot cover another unit from an eligible supplier.
        </p>
        <p>Remaining inventory: {available.toLocaleString()} units.</p>
        {reasons.ready > 0 && (
          <p>
            {reasons.ready.toLocaleString()} orders: eligible stock and credit
            are available. Allocate manually or run auto allocation.
          </p>
        )}
      </div>
    </section>
  );
}
