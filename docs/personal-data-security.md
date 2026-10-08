# JCM personal research: data-security boundary

JCM is a **personal research tool**, not a data resale or subscription product.

## Public repository boundary

This repository and its GitHub Pages site are public. Do not commit licensed
racecards, complete runner histories, bulk historical results, API responses,
API usernames/passwords, session cookies, or access tokens. GitHub Actions
secrets protect credentials, **not** files committed to this repository or
published by GitHub Pages.

Only publish original JCM commentary, model methodology, and limited derived
research outputs where the provider's terms permit publication. Until permission
is clear, keep even derived outputs private if they reveal licensed data.

## Proposed private ingestion

1. User subscribes to an authorised API plan and stores API credentials in
   GitHub Actions secrets (never in a public file or chat).
2. A private GitHub repository runs the scheduled importer and analysis jobs.
3. Raw provider responses and historical data stay in that private repository
   or another access-controlled store, with appropriate retention limits.
4. The private pipeline validates race identities, timestamps, runner coverage,
   source provenance, and missingness before producing any model output.
5. The public JCM Pages site remains disconnected from raw licensed data.
   Publishing any derived output requires confirming the provider's licence.
6. Simulations and confidence figures remain unavailable until sufficiently
   complete data and calibration/backtests support them.

## Launch checklist

- [ ] Confirm API subscription price including VAT and account permissions.
- [ ] Establish private repository and storage/retention design.
- [ ] Store API credentials as private repository Actions secrets.
- [ ] Implement read-only authentication and single-race import.
- [ ] Test API errors, rate limits, retries and partial cards.
- [ ] Implement provenance and data-quality checks.
- [ ] Implement and backtest technical scoring.
- [ ] Enable scheduled imports only after end-to-end validation.
- [ ] Review what, if anything, may be published to the public dashboard.

**Current status:** no API credentials connected; no automated racing data
collection. The existing public workflow validates local files only.
