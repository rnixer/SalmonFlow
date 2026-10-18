import { ClipboardList, Package, CheckCircle2, Clock3 } from "lucide-react";

type DashboardSummaryProps = {
  totalOrders: number;
  available: number;
  allocated: number;
  complete: number;
  partial: number;
  pending: number;
};

export function DashboardSummary({
  totalOrders,
  available,
  allocated,
  complete,
  partial,
  pending,
}: DashboardSummaryProps) {
  return (
    <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
      {[
        {
          title: "Total orders",
          value: totalOrders,
          detail: "Across 160 customers",
          icon: ClipboardList,
          color: "blue",
        },
        {
          title: "Available stock",
          value: available,
          detail: "Units across 3 warehouses",
          icon: Package,
          color: "violet",
        },
        {
          title: "Allocated quantity",
          value: allocated,
          detail: `${complete.toLocaleString()} orders fully allocated`,
          icon: CheckCircle2,
          color: "emerald",
        },
        {
          title: "Pending orders",
          value: pending + partial,
          detail: `${partial} partial · ${pending.toLocaleString()} unallocated`,
          icon: Clock3,
          color: "amber",
        },
      ].map((card) => (
        <div key={card.title} className="surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{card.title}</span>
            <card.icon size={18} className={`metric-${card.color}`} />
          </div>
          <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            {card.value.toLocaleString()}
          </div>
          <p className="mt-2 text-xs text-slate-400">{card.detail}</p>
        </div>
      ))}
    </div>
  );
}
