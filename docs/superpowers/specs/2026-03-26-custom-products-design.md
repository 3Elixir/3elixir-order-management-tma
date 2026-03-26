# Custom Product Integration for Order Management TMA

## Purpose

Allow users to add fully custom products (name, quantity, price) directly to an order without needing to pre-create them in the Strapi product catalog. This solves the issue of users placing product orders in the "remarks" field, which disrupts downstream AI processing.

## Current State & Constraints

- Orders are stored in Strapi. The `orderProducts` field is a JSON component array on the Order model.
- Each `orderProduct` currently expects: `productId`, `name`, `sku`, `category`, `brand`, `quantity`, `price`.
- `productId` is currently required and typed as `z.number()` across the application.
- The UI currently relies on picking from a pre-defined list of products.

## Design Approach

We will implement **Option C** from our brainstorming: Adding a custom row inline in Step 3 of the Order Form where the Name column is editable only for custom products.

### 1. Data Model Updates (Strapi Payload & Schemas)

To accommodate custom products that do not exist in the Strapi `Product` collection:

- `productId`: We will pass `0` to keep type changes minimal and satisfy Strapi component constraints while reserving `0` for custom products. The Zod schemas will remain `productId: z.number()`.
  - _Note: We must ensure no logic in the codebase uses truthy checks `if (product.productId)` that would inadvertently filter out `0`._
- `sku`: Generate a unique SKU when adding the custom product to the form, e.g., `CUSTOM-{timestamp}-{random}`.
- `brand`: Default to `"Custom"`.
- `category`: Default to `"Custom"`.

### 2. User Interface (Step 3 - Order Form)

- Add an "Add Custom Product" button next to the existing "Add More Products" button in `src/pages/orders/create-step3.tsx` and `src/pages/orders/[id]/edit.tsx`.
- When clicked, it appends a new product object to the `useFieldArray` (`orderProducts`):
  ```json
  {
    "productId": 0,
    "name": "",
    "sku": "CUSTOM-1715629381-XYZ",
    "category": "Custom",
    "brand": "Custom",
    "quantity": 1,
    "price": 0
  }
  ```
- **Editable Name Field:** In the `orderProducts.map` loop rendering the table rows, check if `productId === 0`.
  - If it is a custom product, render an `<Input>` bound to `orderProducts.${index}.name`.
  - If it is a regular product, render the normal text `orderProduct.name`.
- **Price Field:** The `<Input>` for price is already present and editable in Step 3 for all products. It will function as normal.
- **React Keys:** Update all instances of `.map` rendering order products to use safe keys.
  - In form pages (`create-step3.tsx`, `edit.tsx`), we are already using the index in the key `key={`${orderProduct.productId}-${index}`}`. We will change this to `key={`${orderProduct.sku}-${index}`}` or `key={field.id}` if mapping over `fields`.
  - In display pages (`src/pages/orders/[id]/index.tsx`), we will use `key={`${orderProduct.sku}-${index}`}` to prevent duplicate key warnings.

### 3. Telegram Message Updates

- Ensure `sendOrderCreationMessage.ts`, `sendOrderDetailsMessage.ts`, and update variants can handle custom products. Since they just iterate over `orderProducts` and print `name`, `quantity`, and `price`, they should work seamlessly as long as the custom product has a valid `name`.

### 4. Validation

- The `orderFormStep3Schema` must enforce that `name` is not empty.
  - Add `.min(1, "Name is required")` to the `name` field in `orderProducts`.
- The `price` field in `orderProducts` already validates `.min(0, "Price cannot be negative")`.

## Trade-offs

- **Reporting:** Custom products won't map back to a master product ID for analytics. This is acceptable as they are ad-hoc items.

## Testing

- Ensure standard products can still be added and modified.
- Add a custom product, fill out name and price, submit order, and verify the payload reaches Strapi successfully.
- Verify the Telegram bot outputs the custom product name correctly.
- Ensure adding multiple custom products works correctly without UI warnings (React key collisions).
