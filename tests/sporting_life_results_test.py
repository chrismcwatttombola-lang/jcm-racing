import copy
import importlib.util
import unittest
from datetime import datetime, timezone
from pathlib import Path
spec = importlib.util.spec_from_file_location('updater', Path(__file__).parents[1] / 'scripts/update_sporting_life_results.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class Results(unittest.TestCase):
    def setUp(self):
        self.row = dict(race_date='2026-10-27', off_time_uk='14:31', course='Newcastle', horse='Silver Hill', scheduled_off_dt='2026-10-27T14:31:00+00:00', race_id='rac_1', horse_id='hrs_1')
        self.url = 'https://www.sportinglife.com/racing/results/2026-10-27/newcastle/945555/test-race'
        self.page = {'race': {'race_summary': dict(date='2026-10-27', time='14:31', course_name='Newcastle', race_stage='WEIGHEDIN', race_summary_reference={'id':945555}, ride_count=2, name='Test'), 'rides': [dict(horse={'name':'Winner', 'horse_reference':{'id':1}},finish_position=1,ride_status='RUNNER'),dict(horse={'name':'Silver Hill', 'horse_reference':{'id':2}},finish_position=4,ride_status='RUNNER')]}}
    def parse(self):
        return m.result(self.row,self.page,self.url,datetime.now(timezone.utc))[0]
    def test_loss_success_and_nr(self):
        self.assertEqual(self.parse()['result_status'],'WIN')
        self.page['race']['rides'][1]['finish_position']=1
        self.assertEqual(self.parse()['result_status'],'LOSS')
        self.page['race']['rides'][1].update(ride_status='NONRUNNER',finish_position=0)
        self.assertEqual(self.parse()['result_status'],'NR')
    def test_wrong_date_time_course(self):
        for key,val in [('date','2026-10-26'),('time','14:32'),('course_name','Kempton')]:
            with self.subTest(key=key):
                p=copy.deepcopy(self.page);self.page['race']['race_summary'][key]=val
                with self.assertRaises(ValueError):self.parse()
                self.page=p
    def test_incomplete_and_missing_horse(self):
        self.page['race']['race_summary']['race_stage']='RESULT'
        with self.assertRaises(ValueError):self.parse()
        self.page['race']['race_summary']['race_stage']='WEIGHEDIN'
        self.page['race']['rides'].pop()
        with self.assertRaises(ValueError):self.parse()
    def test_noncompletion_not_invented(self):
        self.page['race']['rides'][1]['finish_position']=0
        with self.assertRaises(ValueError):self.parse()

if __name__=='__main__':unittest.main()
