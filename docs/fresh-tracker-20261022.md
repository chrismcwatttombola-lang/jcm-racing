# Fresh tracker from 21 October

User authorised replacing all older app racing data with the eight candidates discussed on 21–22 October while keeping the existing JCM app layout, styles, horse-detail cards and links.

The published data directory now contains only those two racing days, their matching result cards, Bet Builder cards and recovered discussion notes. Older embedded records and historical loaders have been removed. Previous versions remain recoverable through Git history.

Outcome controls: 21 October 2 successes / 1 failure; 22 October 5 successes / 0 failures; overall 7 / 1, 87.5%, no pending or non-runners. All eight results were retrieved from the individual Racing API result endpoints and matched by race/horse IDs. Seven entries retain Watchlist status; Red Acres Georgie retains Moderate potential selection. No numerical confidence or pre-race lock timestamp was invented during this historical import.

All eight cards have Sporting Life racecard links matched to date, course, time and runner. Verified individual result links are retained where retrieved; otherwise the existing clearly labelled dated-results fallback is used. The shared Sporting Life race-video link is unchanged.

No historical executable lay prices were supplied for this record. Bet Builder retains its layout and strategies with prices null and financial returns pending. Outcome success is not financial profit.

Validation: Python integrity checks, dedicated fresh-record browser regression, invalid result identity checks, two-date navigation, all eight detail cards, mobile overflow, and hub/Bet Builder/roundup navigation. Historical browser fixtures remain in Git history; the current CI entry point tests the replacement dataset.
