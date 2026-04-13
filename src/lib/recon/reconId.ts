import { randomBytes } from "crypto";

// Human-readable, sortable reconciliation id, e.g. "R-20260414-073645-A3F2".
// Used as the downloadStore key AND as a suffix on the output xlsx filename
// so every reconciliation can be referenced by a single short tag.
export function generateReconId(now: Date = new Date()): string {
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  const stamp =
    now.getUTCFullYear().toString() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    "-" +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds());
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `R-${stamp}-${suffix}`;
}

const RECON_ID_RE = /^R-\d{8}-\d{6}-[0-9A-F]{4}$/;

export function isReconId(s: string): boolean {
  return RECON_ID_RE.test(s);
}

export function outputFilename(reconId: string): string {
  return `Output_Updated_${reconId}.xlsx`;
}
