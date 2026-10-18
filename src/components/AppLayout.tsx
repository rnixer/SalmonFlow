import type { ReactNode } from "react";
import {
  Fish,
  LayoutDashboard,
  Boxes,
  ArrowUpRight,
  CircleHelp,
} from "lucide-react";

type AppLayoutProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
};

export function AppLayout({
  activeTab,
  onTabChange,
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-700">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 p-7">
          <div className="rounded-xl bg-blue-600 p-2 text-white">
            <Fish size={23} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Salmon<span className="text-blue-600">Flow</span>
          </span>
        </div>
        <div className="px-5 pt-7">
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[.16em] text-slate-400">
            WORKSPACE
          </p>
          <button
            onClick={() => onTabChange("orders")}
            className={`nav ${activeTab === "orders" ? "active" : ""}`}
          >
            <LayoutDashboard size={18} />
            Order allocation
          </button>
          <button
            onClick={() => onTabChange("inventory")}
            className={`nav ${activeTab === "inventory" ? "active" : ""}`}
          >
            <Boxes size={18} />
            Inventory overview
          </button>
        </div>
        <div className="mx-5 mt-auto mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CircleHelp size={16} />
            Allocation rules
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Emergency → Overdue → Daily
            <br />
            Oldest orders are allocated first.
            <br />
            Stock and credit limits apply.
          </p>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-100 p-5">
          <div className="rounded-full bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700">
            OP
          </div>
          <div>
            <p className="text-sm font-medium">Operations team</p>
            <p className="text-xs text-slate-400">Demo workspace</p>
          </div>
        </div>
      </aside>
      <div className="lg:ml-60">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-9">
          <div className="text-sm text-slate-400">
            <span className="text-slate-700">Workspace</span>
            <span className="mx-3">/</span>Allocation management
          </div>
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Local demo
          </span>
        </header>
        <main className="mx-auto max-w-[1600px] p-5 md:p-9">
          {children}
          <footer className="mt-6 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
            <span>SalmonFlow · Allocation management</span>
            <span className="flex items-center gap-1">
              Deterministic demo data <ArrowUpRight size={12} /> Changes reset
              on refresh
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
