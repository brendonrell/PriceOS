import { reconcile, type ReconcileSummary } from "../indexer/reconcile";

export type ReconcileOutcome =
  | { ok: true; summary: ReconcileSummary }
  | { ok: false; error: string };

// Wrapper for the cron route: never throws, so a single bad sweep can't take
// down the scheduled endpoint. Failures surface in the JSON for the logs.
export async function runReconcile(): Promise<ReconcileOutcome> {
  try {
    const summary = await reconcile();
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
