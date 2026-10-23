# jcm-racing
JCM Information

## Pick publication requirement

Every new pick must retain its timestamped pre-race reasoning and counterargument and include a verified clickable racecard. The shared card must provide results and video access; if the exact result page is not verified or the race is pending, use an explicitly labelled date-results link, never invent an exact race URL. Run `python3 scripts/validate_data.py` and browser regressions before publishing. Keep full research outcome counts separate from narrower historical financial snapshots when a price is missing. Do not replace an original pre-race assessment with hindsight.

## Running bank trial from 23 October 2026

Each of the three fictional strategies starts with a £10,000 deposit. Carry settled gains, losses and unresolved liabilities forward; never reset daily. A bank reaching exactly zero with no reserved liability receives another recorded £10,000 simulated deposit. Earlier outcome records remain intact, outside this financial trial because prices were not recorded.

Main performance = (balance + withdrawals − total deposits) / £10,000 × 100. Deposits never count as profit. Results show each date's closing bank, cumulative cash in/out and percentage; pending dates are provisional. The chart plots completed daily closing snapshots of that cumulative percentage. Totals are recalculated from dated plans and validated horse results, so repeated refreshes do not double-count settlement and corrections flow through later balances.

Today's three published plans include both horses at user-approved assumed lay odds 4.70 and 4.20, with £500 liability each in the daily/per-race strategies and £250 each in Manual. Published plans take precedence over local settings and are locked. These prices have unknown back/lay side and liquidity; they are simulation assumptions, not verified exchange fills. Run `node tests/bankroll.cjs` for settlement, carry-forward, voids, corrections, top-ups and percentage checks.
