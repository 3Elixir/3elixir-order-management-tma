import type { CompiledRow, ProductBreakdownRow, SummaryRow } from "./schema";

// In-memory, TTL-bounded store for completed reconciliations. Holds the
// xlsx workbook plus the structured previews/unmatched so the Telegram
// send endpoint can build an executive summary without re-parsing.
//
// Caveat: this is per-serverless-instance. Works reliably for the common
// flow (user triggers send seconds after reconcile completes on the same
// warm instance). Swap for Vercel Blob/KV if that stops being true.

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 50;

export type ReconEntry = {
  workbook: Buffer;
  previews: {
    compiled: CompiledRow[];
    breakdown: ProductBreakdownRow[];
    summary: SummaryRow;
  };
  unmatched: { count: number };
};

type StoredEntry = ReconEntry & { expires: number };

const store: Map<string, StoredEntry> =
  (globalThis as unknown as { __reconDownloadStore?: Map<string, StoredEntry> })
    .__reconDownloadStore ?? new Map();
(globalThis as unknown as { __reconDownloadStore?: Map<string, StoredEntry> })
  .__reconDownloadStore = store;

function sweep() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expires < now) store.delete(k);
  }
  while (store.size > MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey === undefined) break;
    store.delete(firstKey);
  }
}

export function put(id: string, entry: ReconEntry): void {
  sweep();
  store.set(id, { ...entry, expires: Date.now() + TTL_MS });
}

export function get(id: string): ReconEntry | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    store.delete(id);
    return null;
  }
  const { expires: _expires, ...rest } = entry;
  return rest;
}
