# Hub appearance change — 12 October 2026

User requested only False Favourites on the hub, retaining horse details/settings and race links. Removed Live Odds Tracker, Performance, JCM Tools and the separately injected Field Test hub button. Retained tile spans one column. Historical Field Test dashboard section remains; its hub entry is removed. Horse detail renderer and source links remain byte-for-byte unchanged; source records, scoring and analysis are untouched.

Date navigation now contains every day from the earliest existing date through the current Europe/London day, descending with today selected. Empty days remain selectable and the Daily picks panel displays No picks. Initialization runs after historical date registrations; date labels retain ordinal day, short month and two-digit year. Updated app version for refresh.

Validation: eight inline scripts pass Node syntax parsing. Executed actual date initialization in a Node VM with DOM stubs: 12th Oct-26 through 7th Oct-26 in descending order, including previously absent 10 October, with today selected. Exactly one hub tile remains. Browser interaction/layout and GitHub CI not verified.

Read six private main master documents: MASTER_RULES, PROJECT_STATUS, DECISIONS, HANDOVER, ARCHITECTURE and SERVICES. Public automated picks remain disabled. Separate open James Test PR #6 is untouched; preserve these visual/date changes at integration. No analytical work belongs in this change.

Draft only; no live deployment or merge. Existing JCM approval restrictions apply.
