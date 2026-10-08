# JCM verified data contract

Research-only favourite-vulnerability dashboard. No betting recommendations.

## Selection requirements
- Race date, course, off-time, horse, source URL, observation timestamp and independent rationale.
- The favourite identification method (pre-race market snapshot) must be explicit.
- Lock selections before off; never retroactively create or modify a lock.
- A runner's defeat is not automatically a confirmed market-favourite defeat.
- Non-runners are excluded from eligible accuracy.
- Corrections are append-only and require evidence.

## Automated publishing
Until an authorised racecard/odds/results provider is configured, no automated selections or odds are published. Scheduled validation checks do not imply real-time racing research.

## Files
- `selections.json`: pre-race selection ledger (currently empty for new automated picks).
- `status.json`: feed connection and verification state.
- `scripts/validate_data.py`: validates structure and prevents unverified results from entering automated data.
