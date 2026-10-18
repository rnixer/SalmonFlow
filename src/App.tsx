import { useEffect, useState } from "react";
import { loadAllocationData } from "./api";
import { AllocationWorkspace } from "./components/AllocationWorkspace";
import { Button } from "./components/ui/button";
import type { AllocationData } from "./types";

export default function App() {
  const [data, setData] = useState<AllocationData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        if (import.meta.env.MODE !== "test") {
          const { startMockApi } = await import("./mocks/browser");
          await startMockApi();
        }
        if (controller.signal.aborted) return;
        const result = await loadAllocationData(controller.signal);
        if (!controller.signal.aborted) setData(result);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load allocation data.",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  if (data) return <AllocationWorkspace allocationData={data} />;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="surface w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">SalmonFlow</h1>
        {error ? (
          <>
            <h2 className="mt-5 font-medium">Could not load allocation data</h2>
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
            <Button
              className="mt-6"
              onClick={() => {
                setError("");
                setAttempt((current) => current + 1);
              }}
            >
              Retry
            </Button>
          </>
        ) : (
          <>
            <p role="status" className="mt-5 text-slate-600">
              Loading allocation data...
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Orders, inventory and customer credit will be allocated
              automatically.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
