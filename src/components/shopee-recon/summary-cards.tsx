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

const ITEMS = [
  { key: 'totalOrderAmount' as const, label: 'Total Order Amount' },
  { key: 'totalReleased' as const, label: 'Total Released' },
  { key: 'commissionFee' as const, label: 'Commission Fee' },
  { key: 'transactionFee' as const, label: 'Transaction Fee' },
  { key: 'totalShippingFee' as const, label: 'Shipping Fee' },
];

export function SummaryCards({ summary, reconciliation }: Props) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
        {ITEMS.map((it) => (
          <Card key={it.key} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {it.label}
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl">
              {fmtSGD(summary[it.key])}
            </p>
          </Card>
        ))}
      </div>

      {reconciliation && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Actual Released (Shopee)
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl">
              {fmtSGD(reconciliation.actualReleased)}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Released Gap
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl text-muted-foreground">
              {fmtSGD(reconciliation.releasedGap)}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Unattributed
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl text-muted-foreground">
              {fmtSGD(reconciliation.releasedGap)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {reconciliation.actualReleased === 0
                ? '—'
                : `(${(Math.abs(reconciliation.releasedGap / reconciliation.actualReleased) * 100).toFixed(1)}% of released)`}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
