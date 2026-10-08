# JCM Unified Racing Research — Model Specification v1

Research dashboard only. Never present simulated outputs as certain outcomes or betting advice.

## One race, one evidence record
Record race identity, scheduled off-time and timezone, jurisdiction, going, distance, surface, field size, runners, draw where applicable, non-runners, timestamps, provenance URLs and source licences. Every runner is included, including missing-data cases.

## Layer A — Independent technical performance (NO market inputs)
Assess verified recent form/speed ratings, consistency, distance/surface/going suitability, trainer form, recency, available pace/sectionals, stamina and draw/course bias. Use sources only where authorised: BHA, Racing Post, Timeform, Racing TV, Turftrax, Met Office or similarly reliable sources. Missing data = N/A with reason. Do not claim stride, cadence, energy retention or sectionals unless actually measured. Finishing position is not a valid measurement of energy retention.

For each metric store: raw value, units, source URL, observed time, sample size, method/version and status verified/proxy/missing. Explicitly specify directionality before z-scoring. Compute per-race z-scores only with sufficient comparable observations; avoid treating N/A as zero. FCI, SDI, pace proxy, trainer and recency must be defined, tested and versioned before publishing numerical CSS.

Suggested initial weighted CSS = 0.35 FCI + 0.15 pace proxy + 0.15 RI + 0.25 SDI + 0.10 TI. Weights are hypotheses, not calibrated probabilities. Do not produce CSS when critical inputs are absent or incomparable. Data Quality Index = weighted coverage of *verified* core inputs; report proxy coverage separately, and distinguish missingness from weakness.

## Layer B — Model simulation
If sufficient measured data exist, simulate 1,000 field outcomes using a documented score-to-performance model; show average placing, simulated win share and bottom-three share, random seed, variance assumption, number of runners and confidence limitations. An assumed Normal(CSS, 1.0) is an illustrative heuristic until validated against held-out historical results. A 150-run weakest-three head-to-head may be included as a sensitivity illustration, never as confirmation of an 'absolute no-win' horse. Do not simulate absent core data or claim probabilities are calibrated. Never describe any horse as guaranteed to lose.

## Layer C — Market comparison (SEPARATE)
Only after Layer A is frozen, compare technical weakness to independently verified pre-race market favourite at a specified timestamp, market type and source. Record odds snapshots and movement only when comparable, timestamped and licensed. Do not allow odds to enter Layer A or retroactively change its ranking. Distinguish market favourite at lock from starting-price favourite.

## Research lifecycle and audit
DRAFT -> WATCHLIST -> LOCKED PRE-RACE -> RESULT VERIFIED -> SETTLED. Watchlist entries are removable from the live UI but retain an auditable history; never count toward locked-pick accuracy. LOCKED records cannot be edited or backdated. Changes/corrections are append-only with reason, author/time and evidence. Preserve original 7 Oct 2026 records and separate selected-horse defeat from actual favourite-beaten accuracy. Never score non-runners as wins.

## Dashboard — mobile-first
Single race detail view: racecard/conditions; all-runner metrics table with verified/proxy/N/A markers; technical ranking and weakest three; simulation when defensible; market-favourite overlay and timestamp; watchlist with qualitative vulnerability flags; locked selections and results; evidence links and freshness. On iPhone show cards or horizontally scrollable table with accessible date selector. Display source freshness and status, never fake 'LIVE'.

## Deployment
Static GitHub Pages reads validated versioned JSON. GitHub Actions can validate and publish authorised data on a schedule; no data feed is connected currently. Secrets belong in GitHub Actions Secrets. Never scrape contrary to provider terms. No automatic predictions until source licensing, race identity, scoring, pre-off locking and results validation are tested.

## Next engineering steps
1. Define and validate JSON schemas for races, runners, observations, technical assessments, simulations and watchlist.
2. Build the read-only mobile race detail view with explicit N/A states.
3. Identify permitted/free racing data sources and connect them.
4. Implement deterministic metrics with unit tests and minimum-data thresholds.
5. Backtest scoring/simulation on out-of-sample historical races before displaying model probabilities.
6. Add immutable selection lock, results settlement and independently audited accuracy.
