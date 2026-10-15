# Results maintenance — 15 October 2026, first three races

Primary provider: The Racing API Pro, connected get_results_today(detailed=true, region=gb,ire, limit=100, skip=0). Total 8 results returned; all pages covered. Three subsequent individual result requests matched exact date, Europe/London scheduled time, normalized course/horse and stable race/horse IDs. The provider country suffix was normalized only for identity matching; display evidence uses the published course/horse labels.

| Time (BST) | Course | Selection | Position / starters | Lay outcome |
| --- | --- | --- | --- | --- |
| 13:32 | Brighton | Roman Spring | 1 / 9 | LOSS |
| 13:37 | Curragh | Moltophino | 3 / 13 | WIN |
| 13:44 | Fontwell | Motazzen | 2 / 5 | WIN |

Individual source endpoints and actual retrieval times are retained in each selected-horse record. Provider acceptance is not independent official verification: official_accuracy_eligible remains false. Three settled results: 2 WIN, 1 LOSS, 66.7%; I Wish You and Magnolia pending, no confirmed NR. No new scores or picks, no NR inferred from absence, and Petersham Place remains excluded. No competition-research/fictional-account date file exists for 15 October: the current manual-research source and existing matching Bet Builder card are updated together instead. The Rated Performance manifest is unchanged; no confidence scores exist for today's manual selections.

Existing three-race Bet Builder screenshot odds 6.6 / 8 / 5.5 and allocations are unchanged. Untouched defaults for this card: daily £782.27; per-race £4,673.42; manual £4,836.71. These are fictional simulations, not global user balances, real bets or carried funds. Two later approved published picks are not yet in that card. Appending them now would invalidate existing saved v3 entry counts and redistribute locked daily stakes after the first race; that needs a separately scoped forward-safe card/settings migration, not a retrospective results-only rewrite.

Original morning Theory and recorded_at remain unchanged. A dated review includes all five current selections, including Roman Spring's genuine loss and two pending races. Possible future weighting changes remain proposals only.

Racecard URLs, website IDs, metadata timestamps and the general Sporting Life video destination are preserved. Sporting Life result destinations attempted through web retrieval were unavailable, so no unverified results URLs are added. Provider evidence supplies position, actual starters, unique winner, runner-up btn winning margin and selected runner ovr_btn beaten lengths. Embedded JSON fallback is kept in sync with the same accepted result evidence; only its cache version changes.

Checks: current public main, public PR #25 (previously inspected merged), open public PRs, six unchanged private master-document hashes, status.json, result display policy, day-close requirements and Bet Builder defaults/code inspected. Nine Python tests, data integrity, analysis validation, JS syntax and executable provider acceptance/identity rejection checks pass locally. Chromium is unavailable locally; full browser tests must pass at the exact PR head before merge. Existing pre-off browser fixtures retain Pending via evidence timestamps and are updated only to reflect the five already-published picks. No private pipeline, immutable history, paused tools, layout tiles, credentials, permissions or costs changed.
