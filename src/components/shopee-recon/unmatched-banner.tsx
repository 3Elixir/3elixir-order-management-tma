import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import type { UnmatchedRow } from '~/lib/recon/schema';

export const fmtSGD = (n: number) =>
  new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(n);

type Props = { count: number; rows?: UnmatchedRow[] };

export function UnmatchedBanner({ count, rows }: Props) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  const hasRows = !!rows && rows.length > 0;

  return (
    <Alert className="mt-4 border-yellow-300 bg-yellow-50 text-yellow-900">
      <div className="flex items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mt-0.5 h-6 w-6 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="min-w-0 flex-1">
          <AlertTitle className="text-base font-medium">
            {count} unmatched income row{count === 1 ? '' : 's'}
          </AlertTitle>
          <AlertDescription>
            Some income rows did not match any order on (Order ID, Product Name).
            They are still included in totals, but verify the Orders export covers the same period.
          </AlertDescription>

          {hasRows && (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2"
                aria-expanded={open}
              >
                {open ? 'Hide' : 'Show'} unmatched rows
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>

              {open && (
                <div className="mt-2 overflow-x-auto rounded-md border border-yellow-300 bg-white/60">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-yellow-300 text-yellow-800">
                        <th className="px-2 py-1.5 font-medium">Order ID</th>
                        <th className="px-2 py-1.5 font-medium">Product Name</th>
                        <th className="px-2 py-1.5 text-right font-medium">Released</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={`${r.orderId}-${r.productName}-${i}`} className="border-b border-yellow-200/60 last:border-0">
                          <td className="whitespace-nowrap px-2 py-1.5 font-mono">{r.orderId || '—'}</td>
                          <td className="px-2 py-1.5">{r.productName || '—'}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                            {fmtSGD(r.totalReleased)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Alert>
  );
}
