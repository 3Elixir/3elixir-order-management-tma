// In-memory, TTL-bounded store for completed reconciliation workbooks.
// Telegram Mini App's WebApp.downloadFile requires an HTTPS URL (not data URL),
// so we stash the xlsx buffer here after reconcile and stream it from a
// separate GET endpoint.
//
// Caveat: this is per-serverless-instance. Works reliably for the common flow
// (user clicks download seconds after reconcile completes, same warm instance).
// If this ever becomes unreliable at scale, swap for Vercel Blob or KV.

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 50;

type Entry = { workbook: Buffer; expires: number };

const store: Map<string, Entry> =
  (globalThis as unknown as { __reconDownloadStore?: Map<string, Entry> })
    .__reconDownloadStore ?? new Map();
(globalThis as unknown as { __reconDownloadStore?: Map<string, Entry> })
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

export function put(id: string, workbook: Buffer): void {
  sweep();
  store.set(id, { workbook, expires: Date.now() + TTL_MS });
}

export function get(id: string): Buffer | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    store.delete(id);
    return null;
  }
  return entry.workbook;
}
