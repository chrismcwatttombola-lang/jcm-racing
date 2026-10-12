# Results failure audit — 12 October 2026

Read all six current private master documents: rules, status, decisions, architecture, services and handover; public source policy, app, daily selection and fictional-account sources; current open PRs. Older private master documents do not yet reflect the user's approved 12 October Betfair/display policy. Explicit dated user instructions take precedence.

Automation peek: JCM Betfair Results enabled, last_run_time 2026-10-12T16:30:56.344958+00:00 (17:30 BST), next_run_time null. This records invocation, not completion or publication; execution logs were not exposed. Public main's latest commit at inspection was 21ffc5adefa80602e0e924385745da91784b7d48, 13:50 BST display fix; all 15 daily and account outcomes remain pending. No later result commit was returned.

Retrieval: web opens of today's Worcester and Musselburgh result URLs failed. Direct HTTP request for Worcester returned HTTP 200 with a 195-byte Site Unavailable HTML body. Status 200 alone must never count as a result. Search did not provide correctly matched completed race evidence. No actual result was settled in this audit.

Display defect: today's separate Daily Picks renderer hardcoded Pending in both rows and horse details regardless of result_status. This PR renders supplied WIN/LOSS/NR outcomes with a Betfair full-result source link; unsupported or missing source stays Pending. It does not authenticate source contents or change settlement/official-accuracy logic. Synthetic browser regression covers Success/Failure, placing/link and unsupported source remaining Pending. All 15 selections/confidences retained. Version bump updates home-screen shortcuts.

Outstanding: reliable unattended Betfair retrieval and a proven retrieval-to-publication run. This repair alone cannot supply missing results. Scheduler execution time is not result retrieval or deployment success. Do not claim the full automation works until a real matched result is published and deployment verified.
