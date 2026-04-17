export const ORDERS_REQUIRED = [
  'Order ID',
  'Product Name',
  'SKU Reference No.',
  'Deal Price',
  'Quantity',
  'Order Status',
] as const;

export const INCOME_REQUIRED = [
  'View By',
  'Order ID',
  'Product Name',
  'Total Released Amount (S$)',
  'Product Price',
  'Refund Amount',
  'Rebate Provided by Shopee',
  'Voucher Sponsored by Seller',
  'Coin Cashback Sponsored by Seller',
  'Shipping Fee Paid by Buyer',
  'Shipping Fee Charged by Logistic Provider',
  'Shipping Rebate From Shopee',
  'Reverse Shipping Fee',
  'Shipping Fee Saver Program Savings',
  'Return to Seller Fee',
  'Commission fee (Incl. GST)',
  'Transaction Fee (Incl. Gst)',
  'Lost Compensation',
] as const;

export const SYNTHETIC_SKUS = ['RF', 'LC', 'TF', 'CF', 'SF'] as const;
export type SyntheticSku = (typeof SYNTHETIC_SKUS)[number];

export type OrderRow = {
  orderId: string;
  productName: string;
  sku: string;
  dealPrice: number;
  quantity: number;
  totalOrderAmount: number;
};

export type IncomeRow = {
  orderId: string;
  productName: string;
  productPrice: number;
  refundAmount: number;
  totalReleased: number;
  totalShippingFee: number;
  commissionFee: number;
  transactionFee: number;
  vouchersAndRebates: number;
  lostCompensation: number;
};

export type MergedRow = IncomeRow &
  Partial<Pick<OrderRow, 'sku' | 'quantity' | 'totalOrderAmount'>>;

export type CompiledRow = {
  sku: string;
  orderId: string;
  productName: string;
  quantity: number | null;
  totalOrderAmount: number;
};

export type PivotRow = {
  sku: string;
  totalQuantity: number;
  totalOrderAmount: number;
};

export type SummaryRow = {
  totalOrderAmount: number;
  totalReleased: number;
  commissionFee: number;
  transactionFee: number;
  totalShippingFee: number;
};
