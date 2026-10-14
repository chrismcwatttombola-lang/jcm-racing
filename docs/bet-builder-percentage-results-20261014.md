# Percentage results and potential winnings — 14 October 2026

User explicitly requested larger daily data areas, unchanged strategy headers, Total Staked / Total Returned / Percentage Difference for each day and strategy, and a percentage line graph to compare long-term stability. A second instruction removes the daily/per-race total-liability controls and restores Total Potential Winnings to all three strategies.

Amounts remain fictional lay liability, not real orders or Exchange lay-stake amounts. No selection, recorded price, accepted result, opening bank, default amount, commission, saved settings or official-accuracy rule changes.

## Defined metrics

- Total Staked: included settled liability, excluding accepted NR and screenshot withdrawals. This includes both genuine winning and losing outcomes.
- Total Returned: that liability plus the existing penny-rounded net profit/loss after five-percent commission. This is a risk-account return, not a bookmaker payout.
- Percentage Difference: `(returned - staked) / staked * 100`. Zero stake is N/A and has no graph point. Missing price or invalid/pending result still prevents a completed financial close.
- Total Potential Winnings: realised net movement plus possible net profit on all remaining included horses if all are beaten. Missing required prices make it Unavailable; confirmed NR contributes zero. Completed days show actual net movement, which can be negative. Full matching is still only an illustrative assumption.

## Presentation

The graph shows daily, not compounded/cumulative, percentage returns. Break-even is 0%. Gold/cyan/violet lines retain the original strategy mapping with distinct stroke widths and dashes; concentric point sizes make overlaps visible without shifting the data. Dot colour compares the current daily percentage to the previous recorded day (first against zero), not necessarily profit versus loss. White exact numbers with red/green percentage signs and three stacked metrics make each table row taller. Strategy headers and a sticky date column remain; horizontal scrolling is available on phones without page overflow.

Equal proportional defaults have nearly identical percentage returns; stake size alone does not change ROI. Manual adjustments/exclusions may change it. Two backfilled days are not evidence of long-term stability or predictive skill. Existing 12–13 October retrospective labels remain.

## Independently reconciled examples

12 October daily: £1,000 staked, £905.54 returned, -9.45%. Manual: £3,750 staked, £3,395.75 returned, -9.45%.

13 October daily: £933.33 settled liability after NR exclusion, £723.20 returned, -22.51%. Per race: £7,000 staked, £5,423.80 returned, -22.52%. Manual: £3,500 staked, £2,711.90 returned, -22.52%. Fractional differences between defaults arise from penny allocation/rounding, not different forecasting skill.

Tests cover exact metrics, NR refunds, percentage axes, zero-denominator handling, mobile row sizing/scrolling, and live pending -> loss -> NR potential-winnings changes for all strategies. Existing accounting/persistence/result-boundary tests remain in place.
