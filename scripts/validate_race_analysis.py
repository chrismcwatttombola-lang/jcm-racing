#!/usr/bin/env python3
"""Validate unified JCM race analyses without inventing metrics."""
import json
from datetime import datetime
from pathlib import Path

root = Path(__file__).resolve().parents[1]
payload = json.loads((root / "data/race-analysis.json").read_text())
assert payload["schema_version"] == 1
assert isinstance(payload["races"], list)
seen = set()
for race in payload["races"]:
    for field in ("id", "date", "course", "off_time", "runners", "sources", "analysis_status"):
        assert field in race, f"Missing {field}"
    assert race["id"] not in seen, "Duplicate race"
    seen.add(race["id"])
    assert race["analysis_status"] in {"awaiting_data", "partial", "verified"}
    assert isinstance(race["runners"], list) and isinstance(race["sources"], list)
    names = set()
    for runner in race["runners"]:
        assert runner["name"] and runner["name"] not in names
        names.add(runner["name"])
        metrics = runner.get("metrics", {})
        for metric in metrics.values():
            assert metric["status"] in {"verified", "proxy", "missing"}
            if metric["status"] == "missing":
                assert metric.get("value") is None and metric.get("reason"), "Missing metric requires null and reason"
            else:
                assert isinstance(metric.get("value"), (int, float)), "Numeric metric required"
                assert str(metric.get("source_url", "")).startswith("https://"), "Source URL required"
                assert metric.get("observed_at"), "Timestamp required"
        if runner.get("css") is not None:
            assert race["analysis_status"] == "verified", "No numerical CSS for unverified race"
    simulation = race.get("simulation")
    if simulation is not None:
        assert race["analysis_status"] == "verified"
        assert simulation["runs"] >= 1000
        assert simulation.get("method") and simulation.get("seed") is not None
    for url in race["sources"]:
        assert url.startswith("https://")
print(f"JCM unified analysis validation passed: {len(seen)} races")
