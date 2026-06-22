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

// Source of each figure: 'shopee' = taken straight from Shopee's authoritative
// Summary/Adjustment tabs; 'computed' = derived by this tool (per-row sum, join,
// attribution). Keeping this visible is the whole point of the reconciliation.
type Source = 'shopee' | 'computed';

function SourceTag({ source }: { source: Source }) {
  const isShopee = source === 'shopee';
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        isShopee
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
          : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
      }`}
    >
      {isShopee ? 'From Shopee' : 'Computed'}
    </span>
  );
}

function FigureCard({
  label,
  value,
  source,
  note,
}: {
  label: string;
  value: number;
  source: Source;
  note?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <SourceTag source={source} />
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl">{fmtSGD(value)}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </Card>
  );
}

// Fee / figure cards, each tagged by where the number comes from.
const FIGURES: { key: keyof SummaryRow; label: string; source: Source }[] = [
  { key: 'totalReleased', label: 'Total Released (row sum)', source: 'computed' },
  { key: 'commissionFee', label: 'Commission Fee', source: 'shopee' },
  { key: 'transactionFee', label: 'Transaction Fee', source: 'shopee' },
  { key: 'totalShippingFee', label: 'Shipping Fee', source: 'shopee' },
  { key: 'serviceFee', label: 'Service Fee', source: 'shopee' },
  { key: 'vouchersAndRebates', label: 'Vouchers & Rebates', source: 'computed' },
  { key: 'adjustments', label: 'Adjustments', source: 'shopee' },
  { key: 'totalExpenses', label: 'Total Expenses', source: 'shopee' },
];

export function SummaryCards({ summary, reconciliation }: Props) {
  // Attributed (per-product compiled sum) vs Shopee's actual payout.
  const attributed = summary.totalOrderAmount;
  const actualReleased = reconciliation?.actualReleased ?? 0;
  const unattributed = attributed - actualReleased;
  const pct =
    actualReleased === 0 ? null : `${(Math.abs(unattributed / actualReleased) * 100).toFixed(2)}% of released`;

  return (
    <div className="space-y-4">
      {reconciliation && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Reconciliation</p>
            <p className="text-xs text-muted-foreground">
              Does the per-product breakdown add up to Shopee&apos;s payout?
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <FigureCard
              label="Attributed (per-product)"
              value={attributed}
              source="computed"
              note="sum of the Income Compiled rows"
            />
            <FigureCard
              label="Actual Released (Shopee)"
              value={actualReleased}
              source="shopee"
              note="Summary tab payout + adjustments"
            />
            <FigureCard
              label="Unattributed"
              value={unattributed}
              source="computed"
              note={pct ? `${pct} · target ≈ 0` : 'target ≈ 0'}
            />
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-3">
          <p className="text-sm font-semibold">Fees &amp; figures</p>
          <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <SourceTag source="shopee" /> authoritative
            <SourceTag source="computed" /> derived by tool
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {FIGURES.map((f) => (
            <FigureCard key={f.key} label={f.label} value={summary[f.key]} source={f.source} />
          ))}
        </div>
      </div>
    </div>
  );
}
