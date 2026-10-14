# Bet Builder daily defaults — approved 14 October 2026

This version supersedes the earlier carry-forward and click-to-confirm defaults only for the separate fictional Bet Builder. All amounts remain liability, as previously established.

- £1000 a day: locked £1,000 daily opening bank and £1,000 total daily liability, split equally across included races with deterministic remainder pennies. Exclusions redistribute the £1,000 until the first race locks.
- £500 a race: locked £500 liability per included race. Daily opening bank is max(£5,000, published active selections × £500), fixed for the card; exclusions release funds without changing other stakes.
- Manual betting: £5,000 daily opening bank, automatically included £250 liability per active race. Amount edits save on change/blur/Enter or the explicit button; exclusions and odds remain independently saved. Unfunded changes are rejected. More than 20 default active entries requires a funding/amount decision and cannot settle an unfunded simulation.

No daily app visit or confirmation is required. Published dated cards plus accepted identity-matched outcomes are enough to reproduce untouched default daily closing banks on any device. Results graphs use daily closes rather than carried balances. Scheduled results maintenance remains necessary; this client does not independently fetch new race data while closed.

Device adjustments use policy-versioned `jcm-builder-v3-` keys. Prior v2 and legacy keys remain stored separately; original historical selections, prices, outcomes and prior documentation are preserved. Manual overrides still use the device clock, per-race scheduled locks and localStorage. Saving has explicit errors rather than pretending persistence succeeded. This is not cross-device sync.

## Retrospective simulations

The 12 October card is derived from existing fictional-account screenshot prices, exactly matched by course/time/horse to the published competition research and source result identities. 13 October uses its existing screenshot card. Both are labelled backfilled default simulations, approved now; no new pre-off lock or real trade is claimed. Historical observations, losses and non-runners remain present. Screenshot NR entries allocate no liability; later accepted NR refunds their allocated liability. Missing price or rejected result evidence prevents a financial close; one unresolved day does not block later independent daily banks.

Five percent commission on positive net market profit; one lay per market. Full matching at the recorded screenshot quote is an illustrative assumption. Thin liquidity, unknown capture times and missing prices stay visible. Never substitute bookmaker odds, SP or unidentified Exchange proxies for lay quotes. No change to official accuracy or selection qualification.

## Ongoing maintenance

For each newly user-approved published selection card, maintain the matching Bet Builder date card and days manifest. Only copy supplied explicit lay-price evidence with identity, timestamps and liquidity where available; absent quotes stay null. Use the same accepted identity-matched result feed as Daily Picks. Defaults need no stored device confirmation. Do not generate or publish new selections under this maintenance authority.
