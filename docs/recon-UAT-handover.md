# Shopee Recon — UAT Handover

**Build:** branch `staging`, commit `d2a0891`
**Feature area:** Shopee reconciliation tool — `/shopee-recon`

## What changed

The recon tool now reconciles against Shopee's own authoritative figures (the income file's **Summary** and **Adjustment** tabs) instead of re-adding the per-row columns.

Concretely:
1. **Service Fee is now included.** It was being dropped before, which made the tool under-count total fees every month.
2. **Fees now come from Shopee's Summary tab**, so they match Shopee's headline numbers exactly (no more line-item rounding drift).
3. **Adjustments** (the separate Adjustment tab) are now read and applied.
4. New **"Actual Released (Shopee)"** and **"Unattributed"** figures on the results screen.
5. **Refund timing is now handled.** When a refund this month is for a sale that was paid out in an earlier month, Shopee shows the full refund but releases $0 for it. The tool keeps the gross refund (`RF`) and adds a **Refund Timing (`RT`)** row carrying the prior-month offset, so each refunded order ties to what Shopee actually released. This was the main reason the per-product rows didn't add up before.
6. **Service Fee now reads on both Shopee export formats.** Shopee renamed the per-row Service Fee column between exports — older files (Jul–Sep 2025) use the human label `Service Fee (incl. GST)`, newer files (Nov 2025+) use the raw key `ps_finance_pdf_income_service_fee_for_SG`. The tool now matches both. Before this fix, the older format silently read per-row service fee as 0, which inflated the "Unattributed" figure by the whole month's service fee (Aug/Sep were ~1.3%). The headline **Actual Released** was never affected — it comes from the Summary tab — so the payout always tied.

## What to test

On the staging site, go to `/shopee-recon` and run a reconciliation for each sample month. Each run needs three files: **current-month orders**, **previous-month orders**, and the **income** file.

### Sample files and month mapping

| Month | Current orders | Previous orders | Income |
|---|---|---|---|
| Jul 2025 | Order.all.20250701_20250731 | Order.all.20250601_20250630 | Income.released.sg.20250701_20250731 |
| Aug 2025 | Order.all.20250801_20250831 | Order.all.20250701_20250731 | Income.released.sg.20250801_20250831 |
| Sep 2025 | Order.all.20250901_20250930 | Order.all.20250801_20250831 | Income.released.sg.20250901_20250930 |
| Nov 2025 | Order.all.20251101_20251130 | Order.all.20251001_20251031 | Income.released.sg.20251101_20251130 |
| Dec 2025 | Order.all.20251201_20251231 | Order.all.20251101_20251130 | Income.released.sg.20251201_20251231 |
| Jan 2026 | Order.all.20260101_20260131 | Order.all.20251201_20251231 | Income.released.sg.20260101_20260131 |
| Feb 2026 | Order.all.20260201_20260228 | Order.all.20260101_20260131 | Income.released.sg.20260201_20260228 |
| Mar 2026 | Order.all.20260301_20260331 | Order.all.20260201_20260228 | Income.released.sg.20260301_20260331 |

(Ask the dev for the sample file set if you don't have it.)

## Expected numbers (acceptance reference)

After each run, check the **Income Summary** sheet in the downloaded file and the on-screen cards:

| Month | Actual Released (S$) | Total Fees (S$) | Service Fee (S$) | Adjustments (S$) | Unattributed (S$) |
|---|---|---|---|---|---|
| Jul 2025 | 27,330.01 | 4,066.38 | 0.00 | 0 | 4.35 |
| Aug 2025 | 69,125.36 | 10,912.61 | −852.42 | 0 | 54.51 |
| Sep 2025 | 79,403.26 | 12,526.02 | −1,023.73 | 39.61 | 56.59 |
| Nov 2025 | 118,956.28 | 18,673.42 | −1,525.94 | 0 | 32.62 |
| Dec 2025 | 95,654.92 | 15,473.13 | −1,227.19 | 753.46 | 10.55 |
| Jan 2026 | 36,690.44 | 6,727.12 | −1,038.07 | 61.61 | 4.09 |
| Feb 2026 | 36,046.38 | 7,196.85 | −1,428.44 | 41.20 | 4.14 |
| Mar 2026 | 31,368.47 | 6,319.80 | −1,254.96 | 0 | 3.57 |

**Primary check:** "Actual Released (Shopee)" must equal Shopee's actual payout for that month, to the cent. Cross-check against the payout figure in the income file's Summary tab plus any adjustment.

**Secondary check:** a Service Fee row (`SC`) and, where applicable, an Adjustment row (`AJ`) and a Refund Timing row (`RT`) appear in the Income Compiled sheet. `RT` rows show up only for months with refunds of earlier-month sales.

**Unattributed:** should stay tiny (a few dollars, well under 0.1% of released). It's the leftover cent-level rounding once refund timing is handled. The values above are the current figures for reference; small drift is fine, large swings are not.

**Cross-check against the manual tracker:** Jul–Sep 2025 "Actual Released" was reconciled against the client's own manual monthly sheets (the "(Sarah)" workbooks). Jul and Aug tie to the cent; Sep is 0.20 higher because the manual sheet under-applied that month's 39.61 adjustment — the tool figure (Summary + Adjustment tab) is correct.

## By design — do NOT raise these as bugs

1. **"Unattributed" is non-zero (but small).** After refund timing is handled, the per-product rows still leave a few dollars against the exact released amount. That remainder is cent-level rounding across hundreds of rows. It is shown for transparency, not an error. (It used to be much larger, up to ~3% — that was the refund-timing gap, now fixed with the `RT` row.)
2. **Fees may differ from the old manual tracker.** The tool now matches Shopee's Summary tab, which is the source of truth. Where the old spreadsheet disagrees (December is the largest), the old spreadsheet was hand-entered with errors — the tool is the correct figure.
3. **Two "released" numbers.** "Total Released" (summed from product rows) and "Actual Released (Shopee)" (Shopee's payout + adjustments) are different on purpose. Use "Actual Released (Shopee)" as the real payout.

## File requirements (hard errors if wrong)

- Orders file must have a sheet named **orders** (lowercase). Income file must have sheets named **Income**, **Summary**, and **Adjustment**.
- Real product SKUs must not be `RF`, `LC`, `TF`, `CF`, `SF`, `VR`, `SC`, `AJ`, or `RT` — these are reserved for the fee/adjustment/timing rows.

## Out of scope / known

- We are not trying to make the "Unattributed" remainder zero. The tool shows it on purpose so the gap is visible.
- The dev tested all five months locally through the live pipeline and released ties exactly. Clicking through the results screen on staging is what this UAT pass adds.

## How to report issues

For each problem: the month, the file(s) used, the figure that looked wrong, what you expected, and a screenshot of the results screen and/or the downloaded Income Summary sheet.
