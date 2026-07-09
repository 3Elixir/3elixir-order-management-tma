# Recon UAT output artifacts

Tool-generated reconciliation workbooks, one per month, produced by running the
live pipeline (`src/lib/recon`) on the sample Orders + Income files. These are
the tool's actual `/shopee-recon` download output — the equivalent of the
client's manual "(Sarah)" monthly workbooks.

Each file has three sheets:

- **Income Compiled** — per-order line items, including synthetic rows for fees
  (`RF` refund, `LC` lost comp, `TF` transaction, `CF` commission, `SF`
  shipping, `SC` service, `VR` vouchers), adjustments (`AJ`), and refund timing
  (`RT`).
- **Product Breakdown** — per-SKU totals (quantity, revenue, fees, net).
- **Income Summary** — the headline figures, including **Actual Released**
  (Shopee's payout) and **Unattributed** (how far the per-product rebuild lands
  from it).

Build: commit `2bb7608`. Summary figures and pass/fail are in
`docs/recon-UAT-results.md`.

These contain real financials — private repo only, do not share via public links.
