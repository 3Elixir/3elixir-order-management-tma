import { test, expect } from 'vitest';
import { ORDERS_REQUIRED, INCOME_REQUIRED, SYNTHETIC_SKUS } from './schema';

test('ORDERS_REQUIRED contains all columns referenced by main.py', () => {
  expect(ORDERS_REQUIRED).toEqual([
    'Order ID',
    'Product Name',
    'SKU Reference No.',
    'Deal Price',
    'Quantity',
    'Order Status',
  ]);
});

test('INCOME_REQUIRED contains all columns referenced by main.py', () => {
  expect(INCOME_REQUIRED).toEqual([
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
  ]);
});

test('SYNTHETIC_SKUS are reserved row-type codes', () => {
  expect(SYNTHETIC_SKUS).toEqual(['RF', 'LC', 'TF', 'CF', 'SF', 'VR', 'SC', 'AJ', 'RT']);
});
