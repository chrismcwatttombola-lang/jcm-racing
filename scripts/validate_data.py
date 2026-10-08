#!/usr/bin/env python3
"""Validate the JCM research ledger; never manufacture data."""
import json
from pathlib import Path
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[1]
status = json.loads((root / "data/status.json").read_text())
ledger = json.loads((root / "data/selections.json").read_text())
assert status["schema_version"] == ledger["schema_version"] == 1
assert isinstance(ledger["selections"], list)
assert isinstance(status["automated_picks_enabled"], bool)
assert status["racecards"] in {"not_connected", "connected"}
assert status["odds"] in {"not_connected", "connected"}
assert status["results"] in {"not_connected", "connected"}
if status["automated_picks_enabled"]:
    assert all(status[k] == "connected" for k in ("racecards", "odds", "results")), "All verified feeds must be connected before enabling auto-picks"
required = {"id", "date", "course", "off_time", "horse", "locked_at", "source_url", "rationale", "market_snapshot"}
ids = set()
for record in ledger["selections"]:
    assert required <= record.keys(), "Incomplete selection record"
    assert record["id"] not in ids, "Duplicate selection id"
    ids.add(record["id"])
    assert record["source_url"].startswith("https://"), "Source URL required"
    assert record["rationale"].strip(), "Independent rationale required"
    lock = datetime.fromisoformat(record["locked_at"].replace("Z", "+00:00"))
    assert lock.tzinfo is not None, "Lock must include timezone"
    assert record["market_snapshot"]["source_url"].startswith("https://")
print(f"JCM validation passed: {len(ids)} automated locked selections; feeds: {status['mode']}")
