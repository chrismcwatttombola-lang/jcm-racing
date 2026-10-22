import json,re,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class FreshRecord(unittest.TestCase):
 def test_complete_fresh_dataset(self):
  manifest=json.loads((ROOT/'data/rated-performance-sources.json').read_text())
  rows=[]
  for path in manifest['sources']:
   d=json.loads((ROOT/path).read_text());self.assertIn(d['date'],['2026-10-21','2026-10-22'])
   details=json.loads((ROOT/f"data/result-card-details-{d['date']}.json").read_text())['details']
   for r in d['high_competition']+d['competition_watchlist']:
    self.assertTrue(r['selection_reason']['summary']);self.assertTrue(r['selection_reason']['counterargument'])
    self.assertEqual(r['result_horse'],r['horse']);self.assertEqual(r['result_race_id'],r['race_id'])
    self.assertEqual(r['result_date'],r['race_date']);self.assertEqual(r['result_horse_id'],r['horse_id'])
    self.assertIsNone(r['competition_confidence_percent'])
    m=next(m for m in details if m['horse_id']==r['horse_id']);self.assertEqual(m['position'],r['position'])
    self.assertIn('/racecard/',m['racecard_url']);rows.append(r)
  self.assertEqual(len(rows),8);self.assertEqual(sum(r['result_status']=='WIN' for r in rows),7)
  self.assertEqual(sum(r['result_status']=='LOSS' for r in rows),1)
  self.assertEqual(len({r['race_id'] for r in rows}),8)
 def test_no_old_published_data(self):
  for p in (ROOT/'data').glob('*.json'):
   for d in re.findall(r'2026-10-(\d\d)',p.name):self.assertGreaterEqual(int(d),21)
  s=(ROOT/'index.html').read_text()
  self.assertNotIn('const records=',s);self.assertNotIn('manual-research-2026-10-16.js',s)
if __name__=='__main__':unittest.main()
