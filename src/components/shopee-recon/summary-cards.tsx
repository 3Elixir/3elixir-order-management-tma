import type { SummaryRow } from '~/lib/recon/schema';
import { Card } from '~/components/ui/card';

export const fmtSGD = (n: number) =>
  new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(n);

type Props = { summary: SummaryRow };

const ITEMS = [
  { key: 'totalOrderAmount' as const, label: 'Total Order Amount' },
  { key: 'totalReleased' as const, label: 'Total Released' },
  { key: 'commissionFee' as const, label: 'Commission Fee' },
  { key: 'transactionFee' as const, label: 'Transaction Fee' },
  { key: 'totalShippingFee' as const, label: 'Shipping Fee' },
];

export function SummaryCards({ summary }: Props) {
  return (
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
  );
}
