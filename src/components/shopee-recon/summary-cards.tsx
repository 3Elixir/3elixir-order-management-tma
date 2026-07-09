import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SummaryRow } from '~/lib/recon/schema';
import { Card } from '~/components/ui/card';

export const fmtSGD = (n: number) =>
  new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(n);

type ReconciliationStats = {
  actualReleased: number;
  releasedGap: number;
  reconciliationFlagged: boolean;
};

type Props = {
  summary: SummaryRow;
  reconciliation?: ReconciliationStats;
};

// One figure line: label (with a light source hint) on the left, value on the
// right. Replaces the old per-card layout + coloured source pill on every item.
function StatRow({
  label,
  value,
  source,
  strong,
}: {
  label: string;
  value: number;
  source?: 'shopee' | 'computed';
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-muted-foreground">
        {label}
        {source && (
          <span className="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground/60">
            {source === 'shopee' ? 'Shopee' : 'computed'}
          </span>
        )}
      </span>
      <span
        className={`tabular-nums ${strong ? 'text-base font-semibold' : 'text-sm font-medium'}`}
      >
        {fmtSGD(value)}
      </span>
    </div>
  );
}

// Fee / figure lines grouped by source, so the source is stated once per group
// instead of on every card.
const SHOPEE_FIGURES: { key: keyof SummaryRow; label: string }[] = [
  { key: 'commissionFee', label: 'Commission Fee' },
  { key: 'transactionFee', label: 'Transaction Fee' },
  { key: 'totalShippingFee', label: 'Shipping Fee' },
  { key: 'serviceFee', label: 'Service Fee' },
  { key: 'adjustments', label: 'Adjustments' },
  { key: 'totalExpenses', label: 'Total Expenses' },
];
const COMPUTED_FIGURES: { key: keyof SummaryRow; label: string }[] = [
  { key: 'totalReleased', label: 'Total Released (row sum)' },
  { key: 'vouchersAndRebates', label: 'Vouchers & Rebates' },
];

const FEE_COUNT = SHOPEE_FIGURES.length + COMPUTED_FIGURES.length;

export function SummaryCards({ summary, reconciliation }: Props) {
  const [showFees, setShowFees] = useState(false);

  // Attributed (per-product compiled sum) vs Shopee's actual payout.
  const attributed = summary.totalOrderAmount;
  const actualReleased = reconciliation?.actualReleased ?? 0;
  const unattributed = attributed - actualReleased;
  const flagged = reconciliation?.reconciliationFlagged ?? false;
  const pct =
    actualReleased === 0
      ? null
      : `${(Math.abs(unattributed / actualReleased) * 100).toFixed(2)}%`;

  return (
    <div className="space-y-3">
      {reconciliation && (
        <Card className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-semibold">Reconciliation</p>
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ${
                flagged
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              {flagged ? 'Gap — review' : 'Ties ✓'}
            </span>
          </div>
          <StatRow label="Attributed" value={attributed} source="computed" />
          <StatRow label="Actual Released" value={actualReleased} source="shopee" strong />
          <div className="mt-1 border-t pt-1">
            <StatRow
              label={`Unattributed${pct ? ` · ${pct}` : ''}`}
              value={unattributed}
              source="computed"
            />
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFees((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-left"
          aria-expanded={showFees}
        >
          <span className="text-sm font-semibold">Fee breakdown</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {FEE_COUNT} items
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showFees ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {showFees && (
          <div className="space-y-3 border-t px-4 pb-4 pt-3">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                From Shopee
              </p>
              {SHOPEE_FIGURES.map((f) => (
                <StatRow key={f.key} label={f.label} value={summary[f.key]} />
              ))}
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Computed by tool
              </p>
              {COMPUTED_FIGURES.map((f) => (
                <StatRow key={f.key} label={f.label} value={summary[f.key]} />
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
