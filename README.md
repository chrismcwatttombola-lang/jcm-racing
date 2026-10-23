# jcm-racing
JCM Information

## Pick publication requirement

Every new pick must retain its timestamped pre-race reasoning and counterargument and include a verified clickable racecard. The shared card must provide results and video access; if the exact result page is not verified or the race is pending, use an explicitly labelled date-results link, never invent an exact race URL. Run `python3 scripts/validate_data.py` and browser regressions before publishing. Keep full research outcome counts separate from narrower historical financial snapshots when a price is missing. Do not replace an original pre-race assessment with hindsight.

## Running profit/loss trial from 23 October 2026

Each fictional strategy starts at £0 and has an unlimited simulated overdraft. Carry all gains and losses forward, including negative totals. There are no deposits, top-ups, withdrawals or balance caps. Earlier outcome records remain intact, outside this priced trial.

Results contain exactly three data columns per strategy: starting tally (£0), current tally and variance against the retained £10,000 comparison benchmark. Percentage = cumulative net profit/loss / £10,000 × 100; it is not a return on zero capital. Keep Results free of explanatory paragraphs and wrap text for mobile. Keep the last fully settled daily tally visible until all selected races have finished and every outcome and price is available; then publish the daily snapshot and graph point. Never infer missing outcomes.

Today's three published plans retain both horses at user-approved assumed lay odds 4.70 and 4.20, with £500 liability each in the daily/per-race strategies and £250 each in Manual. Published plans remain locked across devices. These prices have unknown back/lay side and liquidity; they are simulation assumptions, not verified exchange fills. Run `node tests/bankroll.cjs` for wins, losses, voids, negative carry-forward, corrections, zero crossing without top-ups and final-day snapshots.
