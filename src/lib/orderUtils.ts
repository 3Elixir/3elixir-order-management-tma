import { orderFormSchema } from "~/types/order-schema";
import { z } from "zod";

export const DEFAULT_GST_PERCENTAGE = 0.09;

/**
 * Calculates the grand total of an order and the GST cost.
 *
 * @param {Array} products - An array of product objects inferred from `orderFormSchema`,
 *                           each containing a price and quantity.
 * @param {number} deliveryFee - The delivery fee to be added to the order total.
 * @param {boolean} excludeGst - A flag indicating whether to exclude GST from the total.
 *                               If true, GST is subtracted from the total.
 *
 * @returns {Object} An object containing:
 *  - `grandTotal`: The calculated order grand total, with GST optionally excluded.
 *  - `gstCost`: The calculated GST cost based on the order total.
 *
 * @example
 * const products = [
 *   { price: 10, quantity: 2 },
 *   { price: 5, quantity: 3 }
 * ];
 * const deliveryFee = 5;
 * const excludeGst = true;
 *
 * const { grandTotal, gstCost } = calculateOrderGrandTotal(products, deliveryFee, excludeGst);
 * // grandTotal will be 33.03 (if GST is excluded)
 */
export function calculateOrderGrandTotal(
  products: z.infer<typeof orderFormSchema>["orderProducts"],
  deliveryFee: number,
  excludeGst: boolean,
  gstPercentage: number = DEFAULT_GST_PERCENTAGE, // Default value for gstPercentage
): number {
  const orderTotal = calculateTotalOrderAmount(products, deliveryFee);

  if (excludeGst) {
    return orderTotal;
  }

  return orderTotal + calculateGstCost(orderTotal, gstPercentage);
}

/**
 * Calculates the GST cost for a given amount.
 *
 * @param {number} amount - The total amount on which GST is to be calculated.
 * @param {number} gstPercentage - The GST percentage rate to be applied, defaults to 9% (0.09).
 *
 * @returns {number} The calculated GST cost.
 *
 * @example
 * const amount = 100;
 * const gstPercentage = 0.09;
 *
 * const gstCost = calculateGstCost(amount, gstPercentage);
 * // gstCost will be 9
 */
export const calculateGstCost = (
  amount: number,
  gstPercentage: number = DEFAULT_GST_PERCENTAGE,
) => {
  return amount * gstPercentage;
};

/**
 * Calculates the total order amount including delivery fee.
 *
 * @param {Array} products - An array of product objects inferred from `orderFormSchema`,
 *                           each containing a price and quantity.
 * @param {number} deliveryFee - The delivery fee to be added to the total order amount.
 *
 * @returns {number} The total order amount including delivery fee.
 *
 * @example
 * const products = [
 *   { price: 10, quantity: 2 },
 *   { price: 5, quantity: 3 }
 * ];
 * const deliveryFee = 5;
 *
 * const totalOrderAmount = calculateTotalOrderAmount(products, deliveryFee);
 * // totalOrderAmount will be 45
 */
export const calculateTotalOrderAmount = (
  products: z.infer<typeof orderFormSchema>["orderProducts"],
  deliveryFee: number,
): number => {
  return (
    products.reduce(
      (total, { quantity, price }) => total + quantity * price,
      0,
    ) + deliveryFee
  );
};
