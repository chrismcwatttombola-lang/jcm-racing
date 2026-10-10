#!/usr/bin/env python3
"""Fail-closed historical results feed regression checks (stdlib only)."""
import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
FEED = json.loads((ROOT / "data/unverified-results.json").read_text(encoding="utf-8"))
WATCH = [
    ("13:30", "York", "Beagle Bay"),
    ("16:10", "Newmarket", "Forty Years On"),
    ("18:00", "Dundalk (AW)", "Nazario"),
    ("18:45", "Kempton (AW)", "Havana Touch"),
    ("19:15", "Kempton (AW)", "Gunfighter"),
    ("19:30", "Dundalk (AW)", "Aiteall"),
    ("20:00", "Dundalk (AW)", "Camino Lad"),
    ("20:15", "Kempton (AW)", "Bold Shout"),
]
EXPECTED = {("2026-10-09", *item) for item in WATCH}

def accepted(payload):
    if not isinstance(payload, dict) or payload.get("schema_version") != 1:
        return {}
    if payload.get("official_accuracy_eligible") is not False or payload.get("public_picks_enabled") is not False:
        return {}
    if not isinstance(payload.get("records"), list):
        return {}
    out = {}
    for item in payload["records"]:
        if not isinstance(item, dict):
            continue
        key = (item.get("date"), item.get("time"), item.get("course"), item.get("horse"))
        url = item.get("source_url")
        place = item.get("place")
        if (key not in EXPECTED or key in out or item.get("category") != "watchlist"
            or item.get("verification_status") != "UNVERIFIED"
            or not isinstance(place, str) or not place.strip()
            or not isinstance(url, str) or not re.fullmatch(r"https://\S+", url, re.I)):
            continue
        out[key] = item
    return out

class HistoricalResultsTests(unittest.TestCase):
    def test_all_eight_match_original_watchlist(self):
        self.assertEqual(set(accepted(FEED)), EXPECTED)
        self.assertEqual(len(FEED["records"]), 8)

    def test_non_runner_not_settled(self):
        item = next(x for x in FEED["records"] if x["horse"] == "Forty Years On")
        self.assertEqual(item["place"], "NR")
        self.assertEqual(item["verification_status"], "UNVERIFIED")

    def test_wrong_identity_rejected(self):
        payload = {**FEED, "records": [{**FEED["records"][0], "horse": "Unknown Horse"}]}
        self.assertEqual(accepted(payload), {})

    def test_duplicate_rejected(self):
        payload = {**FEED, "records": [FEED["records"][0]] * 2}
        self.assertEqual(len(accepted(payload)), 1)

    def test_malformed_and_missing_data_rejected(self):
        for records in (None, {}, "bad", [None], [{"date": "2026-10-09"}]):
            self.assertEqual(accepted({**FEED, "records": records}), {})
        for url in ("http://invalid.test", "https://bad url", None, 123):
            self.assertEqual(accepted({**FEED, "records": [{**FEED["records"][0], "source_url": url}]}), {})

    def test_accuracy_and_publication_guards(self):
        for field in ("official_accuracy_eligible", "public_picks_enabled"):
            self.assertEqual(accepted({**FEED, field: True}), {})
        self.assertFalse(FEED["official_accuracy_eligible"])
        self.assertFalse(FEED["public_picks_enabled"])

    def test_fetch_failure_is_fail_closed_in_dashboard(self):
        self.assertIn("if(!response.ok) return;", HTML)
        self.assertIn("catch(_error)", HTML)
        self.assertIn("loadUnverifiedHistory();", HTML)
        self.assertIn("expected.has(key)", HTML)
        self.assertIn("official_accuracy_eligible!==false", HTML)
        self.assertIn("public_picks_enabled!==false", HTML)

    def test_display_and_scoring_separation(self):
        self.assertIn("status:'UNVERIFIED'", HTML)
        self.assertIn(".jcm-status.unverified", HTML)
        self.assertIn("watching.filter(r=>r.status==='PENDING')", HTML)
        self.assertIn("watching.filter(r=>r.status==='UNVERIFIED')", HTML)
        self.assertIn("const chosen=first?records:(oct8?todayRecords:[])", HTML)

if __name__ == "__main__":
    unittest.main(verbosity=2)
