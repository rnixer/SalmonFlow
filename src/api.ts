import type { AllocationData } from "./types";

export async function loadAllocationData(
  signal: AbortSignal,
): Promise<AllocationData> {
  const response = await fetch(
    new URL(
      "api/allocation-data",
      new URL(import.meta.env.BASE_URL, window.location.origin),
    ),
    { signal },
  );
  if (!response.ok)
    throw new Error(
      `Unable to load allocation data (HTTP ${response.status}).`,
    );
  return response.json();
}
