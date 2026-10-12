# Fictional account — user agreed 12 October 2026

Opening bank £5,000. Retain all net profits and losses between days. Daily maximum liability £1,000 split evenly by published horse; allocate remainder pennies deterministically. Never book real wagers.

Statement requirement: date, opening balance, per-horse publication-time lay quote and timestamp, liability, lay stake (liability / (odds - 1)), gross profit/loss, commission, net movement, closing balance carried to next day. Non-runners have zero profit/loss. Pending events remain unsettled. Commission must follow the selected exchange account rate on net market winnings, not blindly on each winning lay. Insufficient bank must block unfunded liability, not create a fictional deposit.

Current implementation is a presentation foundation: opening bank entry and horse list with missing-odds indicators only. No historical lay odds captured; no commission rate agreed; no automatic fictional settlement/ledger implemented. Do not infer odds from SP, invent transactions, or describe the opening entry as settled daily performance. Results, ratings, and official accuracy are unchanged.
