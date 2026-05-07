import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { DataTable } from './data-table';
import type { CompiledRow, SummaryRow, ProductBreakdownRow } from '~/lib/recon/schema';
import { fmtSGD } from './summary-cards';

type Props = {
  compiled: CompiledRow[];
  breakdown: ProductBreakdownRow[];
  summary: SummaryRow;
};

const fmt2 = (v: unknown) => (typeof v === 'number' ? v.toFixed(2) : String(v ?? ''));

export function ResultTabs({ compiled, breakdown, summary }: Props) {
  return (
    <Tabs defaultValue="compiled" className="mt-4 sm:mt-6">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <TabsList className="w-max min-w-full sm:w-auto">
          <TabsTrigger value="compiled">Income Compiled</TabsTrigger>
          <TabsTrigger value="breakdown">Product Breakdown</TabsTrigger>
          <TabsTrigger value="summary">Income Summary</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="compiled">
        <DataTable
          rows={compiled}
          columns={[
            { key: 'sku', header: 'SKU Reference No.' },
            { key: 'orderId', header: 'Order ID' },
            { key: 'productName', header: 'Product Name' },
            { key: 'quantity', header: 'Quantity', align: 'right' },
            { key: 'totalOrderAmount', header: 'Total Order Amount', format: fmt2, align: 'right' },
          ]}
          footer={{
            productName: 'Total Order Amount',
            totalOrderAmount: fmtSGD(compiled.reduce((sum, r) => sum + r.totalOrderAmount, 0)),
          }}
        />
      </TabsContent>
      <TabsContent value="breakdown">
        <DataTable
          rows={breakdown}
          columns={[
            { key: 'sku', header: 'SKU Reference No.' },
            { key: 'totalQuantity', header: 'Total Quantity', align: 'right' },
            { key: 'revenuePerUnit', header: 'Revenue per Unit', format: fmt2, align: 'right' },
            { key: 'netRevenue', header: 'Net Revenue', format: fmt2, align: 'right' },
            { key: 'totalFees', header: 'Total Fees', format: fmt2, align: 'right' },
            { key: 'totalOrderAmount', header: 'Total Order Amount', format: fmt2, align: 'right' },
          ]}
        />
      </TabsContent>
      <TabsContent value="summary">
        <DataTable
          rows={[summary]}
          columns={[
            { key: 'totalOrderAmount', header: 'Total Order Amount', format: (v) => fmtSGD(v as number), align: 'right' },
            { key: 'totalReleased', header: 'Total Released Amount (S$)', format: (v) => fmtSGD(v as number), align: 'right' },
            { key: 'commissionFee', header: 'Commission fee (Incl. GST)', format: (v) => fmtSGD(v as number), align: 'right' },
            { key: 'transactionFee', header: 'Transaction Fee (Incl. Gst)', format: (v) => fmtSGD(v as number), align: 'right' },
            { key: 'totalShippingFee', header: 'Total Shipping Fee', format: (v) => fmtSGD(v as number), align: 'right' },
            { key: 'vouchersAndRebates', header: 'Vouchers & Rebates', format: (v) => fmtSGD(v as number), align: 'right' },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}
