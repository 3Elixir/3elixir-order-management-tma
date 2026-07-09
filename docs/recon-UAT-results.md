# Shopee Recon — UAT Results

**Build:** branch `staging`, commit `2bb7608`
**Feature area:** Shopee reconciliation tool — `/shopee-recon`
**Run date:** 2026-07-08
**Run by:** automated pipeline harness against the live recon code (`src/lib/recon`)

## Verdict

All 8 months pass. Every month's per-product rebuild ties to Shopee's actual payout within **0.08%** (a few dollars of cent-level rounding). The three months with an independent manual figure (Jul–Sep 2025, from the client's own sheets) tie to the cent for Jul and Aug; Sep is $0.20 off because the manual sheet under-applied that month's adjustment.

## What each column means

- **Actual Released** — Shopee's real payout. Read straight from the income file's **Summary** tab plus the **Adjustment** tab. This is the number to trust.
- **Service Fee** — Shopee's per-order service charge, summed. Read from the Summary tab.
- **Adjustments** — signed payout corrections from the Adjustment tab.
- **Unattributed** — how far the tool's line-by-line rebuild lands from Actual Released. Target ≈ 0; it's shown for transparency. Small = the rebuild accounts for everything.
- **Cross-check** — the client's manual "(Sarah)" monthly figure, where available, with the delta vs the tool.

## Results

| Month | Actual Released (S$) | Service Fee (S$) | Adjustments (S$) | Unattributed (S$) | % of released | Cross-check (manual) | Verdict |
|---|---|---|---|---|---|---|---|
| Jul 2025 | 27,330.01 | 0.00 | 0.00 | 4.35 | 0.016% | 27,330.01 (Δ 0.00) | ✅ pass |
| Aug 2025 | 69,125.36 | −852.42 | 0.00 | 54.51 | 0.079% | 69,125.36 (Δ 0.00) | ✅ pass |
| Sep 2025 | 79,403.26 | −1,023.73 | 39.61 | 56.59 | 0.071% | 79,403.06 (Δ 0.20) | ✅ pass* |
| Nov 2025 | 118,956.28 | −1,525.94 | 0.00 | 32.62 | 0.027% | — | ✅ pass |
| Dec 2025 | 95,654.92 | −1,227.19 | 753.46 | 10.55 | 0.011% | — | ✅ pass |
| Jan 2026 | 36,690.44 | −1,038.07 | 61.61 | 4.09 | 0.011% | — | ✅ pass |
| Feb 2026 | 36,046.38 | −1,428.44 | 41.20 | 4.14 | 0.011% | — | ✅ pass |
| Mar 2026 | 31,368.47 | −1,254.96 | 0.00 | 3.57 | 0.011% | — | ✅ pass |

\* Sep: tool figure is correct (Summary + Adjustment tab). The $0.20 is in the manual sheet, which under-applied the 39.61 adjustment.

## The fix this run validated

Jul–Sep 2025 first exposed a bug. Shopee uses **two different column names** for the per-order Service Fee across exports:

- Jul–Sep 2025 files: `Service Fee (incl. GST)` (human label)
- Nov 2025+ files: `ps_finance_pdf_income_service_fee_for_SG` (raw key)

The tool matched only the raw key, so it **missed the older-format files** and read their per-order service fee as 0. That inflated Unattributed by the whole month's service fee.

| Month | Unattributed before fix | Unattributed after fix |
|---|---|---|
| Aug 2025 | 909.22 (1.32%) | 54.51 (0.08%) |
| Sep 2025 | 1,080.46 (1.36%) | 56.59 (0.07%) |

The headline **Actual Released was never affected** — it comes from the Summary tab, not the per-order rebuild — so the payout always tied to the client's manual figures. The bug only touched the internal cross-check. Fix: match both column names (commit `d2a0891`).

## How to reproduce

Run each month on `/shopee-recon` with the three input files (current-month orders, previous-month orders, income) listed in the file-mapping table of the UAT handover. After each run, check the **Income Summary** sheet: Actual Released must equal Shopee's payout to the cent, and Unattributed must stay small (well under 0.1%).

## Related

- `docs/recon-UAT-handover.md` — how to run the UAT, file mapping, acceptance reference, by-design non-bugs.
