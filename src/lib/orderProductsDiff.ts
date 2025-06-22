// Order product diffing algorithm

export type OrderProduct = {
  brand: string;
  sku: string;
  name: string;
  price: number;
  category: string;
  quantity: number;
  productId: number;
};

export type ProductChange = {
  type: 'MODIFIED' | 'ADDED' | 'REMOVED';
  product: {
    brand: string;
    sku: string;
    name: string;
    productId: number;
  };
  lineNumber: number;
  oldValues?: {
    quantity: number;
    price: number;
    total: number;
  };
  newValues?: {
    quantity: number;
    price: number;
    total: number;
  };
  changes?: {
    quantity?: { from: number; to: number };
    price?: { from: number; to: number };
    total?: { from: number; to: number };
  };
};

type LineItem = OrderProduct & {
  lineNumber: number;
  total: number;
};

type Match = {
  index: number;
  score: number;
};

/**
 * Compare two arrays of order products and detect line-by-line differences
 * @param oldProducts Array of products from the previous order
 * @param newProducts Array of products from the updated order
 * @returns Array of product changes (added, removed, modified)
 */
export function compareOrderProducts(
  oldProducts: OrderProduct[],
  newProducts: OrderProduct[]
): ProductChange[] {
  // Handle edge cases
  if (!Array.isArray(oldProducts)) oldProducts = [];
  if (!Array.isArray(newProducts)) newProducts = [];

  // Create line items with line numbers and calculated totals
  const oldLines: LineItem[] = oldProducts.map((product, index) => ({
    ...product,
    lineNumber: index + 1,
    total: product.price * product.quantity,
  }));

  const newLines: LineItem[] = newProducts.map((product, index) => ({
    ...product,
    lineNumber: index + 1,
    total: product.price * product.quantity,
  }));

  const changes: ProductChange[] = [];
  const matchedNewLines = new Set<number>();

  // Find matching and modified lines
  oldLines.forEach((oldLine) => {
    // 1. Find best match in new lines using scoring algorithm
    const matches: Match[] = newLines
      .map((newLine, index) => {
        // Skip if product IDs don't match or already matched
        if (oldLine.productId !== newLine.productId || matchedNewLines.has(index)) {
          return { index, score: -Infinity };
        }

        let score = 0;
        // Same price: +10 points
        if (oldLine.price === newLine.price) {
          score += 10;
        }
        
        // Position scoring: +5 for same position, or subtract distance
        if (oldLine.lineNumber === newLine.lineNumber) {
          score += 5;
        } else {
          score += Math.max(0, 5 - Math.abs(oldLine.lineNumber - newLine.lineNumber));
        }

        return { index, score };
      })
      .filter((match) => match.score > -Infinity)
      .sort((a, b) => b.score - a.score);

    // No match found - this is a removed product
    if (matches.length === 0) {
      changes.push({
        type: 'REMOVED',
        product: {
          brand: oldLine.brand,
          sku: oldLine.sku,
          name: oldLine.name,
          productId: oldLine.productId,
        },
        lineNumber: oldLine.lineNumber,
        oldValues: {
          quantity: oldLine.quantity,
          price: oldLine.price,
          total: oldLine.total,
        },
      });
      return;
    }

    // Get the best match - we know matches[0] exists because we checked matches.length > 0
    const bestMatch = matches[0];
    if (!bestMatch) return
    const newLineIndex = bestMatch.index;
    const newLine = newLines[newLineIndex];
    if (!newLine) return;
    
    // Add this line to the matched set so it won't be considered again
    matchedNewLines.add(newLineIndex);

    // Check if the product was modified
    const quantityChanged = oldLine.quantity !== newLine.quantity;
    const priceChanged = oldLine.price !== newLine.price;
    
    if (quantityChanged || priceChanged) {
      const change: ProductChange = {
        type: 'MODIFIED',
        product: {
          brand: oldLine.brand,
          sku: oldLine.sku,
          name: oldLine.name,
          productId: oldLine.productId,
        },
        lineNumber: oldLine.lineNumber,
        oldValues: {
          quantity: oldLine.quantity,
          price: oldLine.price,
          total: oldLine.total,
        },
        newValues: {
          quantity: newLine.quantity,
          price: newLine.price,
          total: newLine.total,
        },
        changes: {},
      };

      if (quantityChanged) {
        change.changes!.quantity = {
          from: oldLine.quantity,
          to: newLine.quantity,
        };
      }

      if (priceChanged) {
        change.changes!.price = {
          from: oldLine.price,
          to: newLine.price,
        };
      }

      if (quantityChanged || priceChanged) {
        change.changes!.total = {
          from: oldLine.total,
          to: newLine.total,
        };
      }

      changes.push(change);
    }
  });

  // Find added products (unmatched new lines)
  newLines.forEach((newLine, index) => {
    if (!matchedNewLines.has(index)) {
      changes.push({
        type: 'ADDED',
        product: {
          brand: newLine.brand,
          sku: newLine.sku,
          name: newLine.name,
          productId: newLine.productId,
        },
        lineNumber: newLine.lineNumber,
        newValues: {
          quantity: newLine.quantity,
          price: newLine.price,
          total: newLine.total,
        },
      });
    }
  });

  // Sort changes by line number
  return changes.sort((a, b) => a.lineNumber - b.lineNumber);
}

/**
 * Format product changes to a user-friendly string representation
 */
export function formatProductChanges(changes: ProductChange[]): string {
  if (!changes.length) return '';
  
  const lines: string[] = [];
  
  changes.forEach((change) => {
    const { product, type } = change;
    const productInfo = `${product.name} (${product.sku})`;
    
    switch (type) {
      case 'ADDED':
        lines.push(`➕ Added: ${productInfo}`);
        if (change.newValues) {
          lines.push(`   ${change.newValues.quantity} x $${change.newValues.price.toFixed(2)} = $${change.newValues.total.toFixed(2)}`);
        }
        break;
        
      case 'REMOVED':
        lines.push(`❌ Removed: ${productInfo}`);
        if (change.oldValues) {
          lines.push(`   ${change.oldValues.quantity} x $${change.oldValues.price.toFixed(2)} = $${change.oldValues.total.toFixed(2)}`);
        }
        break;
        
      case 'MODIFIED':
        lines.push(`🔄 Modified: ${productInfo}`);
        
        if (change.changes?.quantity) {
          const { from, to } = change.changes.quantity;
          lines.push(`   Quantity: ${from} → ${to}`);
        }
        
        if (change.changes?.price) {
          const { from, to } = change.changes.price;
          lines.push(`   Price: $${from.toFixed(2)} → $${to.toFixed(2)}`);
        }
        
        if (change.changes?.total) {
          const { from, to } = change.changes.total;
          lines.push(`   Total: $${from.toFixed(2)} → $${to.toFixed(2)}`);
        }
        break;
    }
    
    lines.push(''); // Add a blank line between changes
  });
  
  return lines.join('\n');
}
