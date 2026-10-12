# Betfair results reconciliation — 12 October 2026

Scope: existing published horses only; unattended results updates explicitly authorised by the user. No selections, confidence scores, source-manifest dates, private pipeline, costs or permissions changed.

Seven 9 October research rows now consume identity-matched Betfair outcomes from `data/betfair-results.json`: Beagle Bay 5th, Nazario 7th, Havana Touch 1st, Gunfighter 3rd, Aiteall 3rd, Camino Lad 7th and Bold Shout 2nd. Their exact full-result URLs and retrieval timestamps are recorded. Havana Touch is LOSS/Failure; the other six are WIN/Success. These descriptive counts are excluded from official accuracy because pre-race lock provenance remains unauthenticated.

Forty Years On stays Pending: absent from the retrieved Newmarket 16:10 full result; absence cannot establish NR. The original Racing Post reported-history feed is preserved as historical evidence, including its unconfirmed NR report, but does not override confirmed outcomes or create a settled outcome. Missing, malformed, conflicting and duplicate Betfair evidence fails closed.

Today's 15 horses are unchanged and pending; earliest listed off time is 15:37 UK. The four 11 October Field Test rows remain unchanged: retrieved pages had contradictory “To Take Place” status or transient access errors, so no settlement was inferred. Existing settled 7/8 October outcomes were not rewritten. Margins are not recorded because the Dist column's semantics have not been established; no gap is presented as total beaten distance.

Read current public app, data/status.json, rated-performance sources, results-display-policy-20261012.md and all private JCM documents (Architecture, Decisions, Handover, Master Rules, Project Status, Services and Results Verification Interface). Inspected main/open PRs/recent Actions in all three repositories. Current user authorisation and dated Betfair display policy supersede older second-source/approval requirements for these results only. Private/public automated-picks flag remains false. Prior unrelated draft PRs remain untouched.

Validation: historical-feed tests preserve archive identity and scoring separation; browser checks cover seven supported results, the genuine loss, source links, missing evidence, malformed payloads, identity mismatch, outcome mismatch, duplicate evidence, fetch failure, mobile layout, original confidence and all 15 current selections. Publication is only completed after exact-head checks, merge and successful Pages deployment.
