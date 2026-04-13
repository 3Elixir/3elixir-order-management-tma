# Custom Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement fully custom product rows in the Order Form allowing free-text names and prices without requiring pre-created Strapi products.

**Architecture:** We will adjust Zod schemas to accept missing `productId` as `0`, add an "Add Custom Product" button that injects a row with `productId: 0` and a generated pseudo-SKU, and dynamically render an input field for the Name column when `productId === 0`.

**Tech Stack:** Next.js 14, tRPC, React Hook Form, Zod, Tailwind CSS.

---

### Task 1: Update Zod Schemas

**Files:**

- Modify: `src/types/order-schema.ts`

- [ ] **Step 1: Update `orderFormStep3Schema` name validation**
      Add `.min(1, "Name is required")` to the `name` field of `orderProducts`.

- [ ] **Step 2: Commit Schema Updates**
  ```bash
  git add src/types/order-schema.ts
  git commit -m "feat(schema): add validation for custom product names"
  ```

### Task 2: Create Custom Product Generator Utility

**Files:**

- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Write `generateCustomProductSku` function**
      Create a simple function to generate a SKU like `CUSTOM-{timestamp}-{randomString}`.

  ```typescript
  export function generateCustomProductSku() {
    return `CUSTOM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }
  ```

- [ ] **Step 2: Commit Utility**
  ```bash
  git add src/lib/utils.ts
  git commit -m "feat(utils): add custom product sku generator"
  ```

### Task 3: Update React Keys Across Display/Form Pages

**Files:**

- Modify: `src/pages/products/index.tsx`
- Modify: `src/pages/orders/[id]/index.tsx`
- Modify: `src/pages/orders/create-step3.tsx`
- Modify: `src/pages/orders/[id]/edit.tsx`

- [ ] **Step 1: Fix `ProductCardOrder` and `ProductCardCustomer` keys**
      In `src/pages/products/index.tsx`, update the maps:
      `key={product.sku || product.productId}` or `key={product.productId}` is fine here since these are strictly Strapi products being listed. Wait, `parsedProducts` might need it. Since products page only lists Strapi products, `product.productId` is safe.
- [ ] **Step 2: Fix `src/pages/orders/[id]/index.tsx` keys**
      Change `<TableRow key={orderProduct.productId}>` to `<TableRow key={orderProduct.sku}>`.
- [ ] **Step 3: Fix `src/pages/orders/create-step3.tsx` and `edit.tsx` keys**
      Change `<TableRow key={\`${orderProduct.productId}-${index}\`}>`to`<TableRow key={field.id}>`(using the`useFieldArray`field id).
Ensure`fields.map((field, index) => ...)`is used instead of`orderProducts.map`. Note: `orderProducts`from`useFieldArray`might not have`id`, use `fields.map` directly.

- [ ] **Step 4: Commit Key Updates**
  ```bash
  git add src/pages/
  git commit -m "refactor: update react keys to support custom products"
  ```

### Task 4: UI Implementation for Custom Products (Create Step 3)

**Files:**

- Modify: `src/pages/orders/create-step3.tsx`

- [ ] **Step 1: Add 'Add Custom Product' Button**
      Below the table in `OrderProductList`, next to "Add More Products", add a button:

  ```tsx
  <Button
    type="button"
    className="gap-1"
    variant="outline"
    size="default"
    onClick={onAddCustomProduct}
  >
    <PlusCircle className="h-4 w-4" />
    Add Custom Product
  </Button>
  ```

- [ ] **Step 2: Implement `onAddCustomProduct`**

  ```tsx
  const onAddCustomProduct = () => {
    appendOrderProduct({
      productId: 0,
      name: "",
      sku: generateCustomProductSku(),
      category: "Custom",
      brand: "Custom",
      quantity: 1,
      price: 0,
    });
  };
  ```

- [ ] **Step 3: Render Editable Name Field**
      Inside the table row map, conditionally render the name column:

  ```tsx
  <TableCell className="font-semibold">
    {field.productId === 0 ? (
      <FormField
        control={form.control}
        name={`orderProducts.${index}.name`}
        render={({ field: { onChange, ...inputField } }) => (
          <div>
            <Label className="sr-only">Product Name</Label>
            <Input
              type="text"
              placeholder="Custom item name"
              className="text-base font-semibold"
              onChange={onChange}
              {...inputField}
            />
          </div>
        )}
      />
    ) : (
      field.name
    )}
  </TableCell>
  ```

- [ ] **Step 4: Commit Create Form UI**
  ```bash
  git add src/pages/orders/create-step3.tsx
  git commit -m "feat(ui): add custom product support to create order form"
  ```

### Task 5: UI Implementation for Custom Products (Edit Form)

**Files:**

- Modify: `src/pages/orders/[id]/edit.tsx`

- [ ] **Step 1: Replicate Step 4 changes in Edit form**
      Apply the exact same button, `onAddCustomProduct` logic, and conditional `TableCell` rendering for the name to the `OrderProductList` in `src/pages/orders/[id]/edit.tsx`.

- [ ] **Step 2: Commit Edit Form UI**
  ```bash
  git add src/pages/orders/[id]/edit.tsx
  git commit -m "feat(ui): add custom product support to edit order form"
  ```

### Task 6: Verify Backend Processing

**Files:**

- Test: `src/server/api/routers/order/createOrder.ts`
- Test: `src/server/api/routers/order/updateOrderDetails.ts`
- Test: `src/server/api/routers/telegram/sendOrderDetailsMessage.ts`

- [ ] **Step 1: Code Review Backend Routers**
      Verify that `createOrder` and `updateOrderDetails` correctly pass `productId: 0` without stripping it or failing validation. Verify Telegram routers safely print `name` and `price`.
      Since `productId` is just `z.number()` and passed as a raw array to Strapi's JSON component, it should work out of the box.

- [ ] **Step 2: Run build / typecheck**
      `pnpm tsc --noEmit`

- [ ] **Step 3: Run existing tests**
      `pnpm test`
