# Hub appearance change — 12 October 2026

User requested a hub with only False Favourites until other measures are ready, retaining horse views/settings, detail information and race links. Appearance work belongs in this chat; analysis mechanics remain in the other JCM chat.

Removed Live Odds Tracker, Performance and JCM Tools buttons and the separately injected Field Test hub button. Single retained tile spans the grid. Updated app version for existing refresh behavior. Horse detail renderer, race links, date navigation, dashboard settings, scoring and source records are unchanged. Field Test historical dashboard section is retained; only its hub entry was removed.

Validation: all seven inline scripts pass Node JavaScript syntax parsing; source comparison confirms the horse detail renderer is byte-for-byte unchanged and exactly one hub tile remains. Browser interaction/layout not verified. Read six main master documents: MASTER_RULES, PROJECT_STATUS, DECISIONS, HANDOVER, ARCHITECTURE and SERVICES. Public status still disables automated picks. Separate open James Test PR #6 remains untouched and must preserve this hub simplification at integration.

This is a draft, not a live deployment. Project merge/publication approval restrictions remain in force. No analytical or accuracy work is part of this change.
