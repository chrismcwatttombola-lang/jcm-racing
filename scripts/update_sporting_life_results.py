"""Update only fresh-project selections from explicit Sporting Life full results."""
import argparse
import copy
import json
import re
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
HOST = 'https://www.sportinglife.com'


def normal(value):
    value = re.sub(r'\s*\((?:AW|IRE|GB|FR|USA|GER|DEN|AUS|NZ)\)\s*$', '', value, flags=re.I)
    return re.sub(r'[^a-z0-9]', '', value.lower())


def fetch(url):
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname != 'www.sportinglife.com':
        raise ValueError('Unexpected source host')
    request = urllib.request.Request(url, headers={'User-Agent': 'JCM-Results-Checker/1.0', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=25) as response:
        if urlsplit(response.url).hostname != parsed.hostname:
            raise ValueError('Unexpected redirect')
        html = response.read(5_000_000).decode('utf-8')
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.S)
    for script in scripts:
        try:
            data = json.loads(script)
        except ValueError:
            continue
        if isinstance(data, dict) and 'pageProps' in data.get('props', {}):
            return data['props']['pageProps'], html
    raise ValueError('Sporting Life page structure unavailable')


def result(row, page, url, now):
    race = page['race']
    summary = race['race_summary']
    ref = str(summary['race_summary_reference']['id'])
    path = urlsplit(url).path
    if not re.fullmatch(r'/racing/results/' + re.escape(row['race_date']) + r'/[a-z0-9-]+/' + ref + r'/[a-z0-9-]+', path):
        raise ValueError('Result URL identity mismatch')
    if summary['date'] != row['race_date'] or summary['time'] != row['off_time_uk'] or normal(summary['course_name']) != normal(row['course']):
        raise ValueError('Result race identity mismatch')
    if summary['race_stage'] != 'WEIGHEDIN':
        raise ValueError('Awaiting weighed-in full result')
    rides = race['rides']
    matches = [r for r in rides if normal(r['horse']['name']) == normal(row['horse'])]
    if len(matches) != 1:
        raise ValueError('Selected horse missing or ambiguous')
    ride = matches[0]
    non_runners = [r['horse']['name'] for r in rides if r.get('ride_status') in ('NONRUNNER', 'NON_RUNNER')]
    if ride.get('ride_status') in ('NONRUNNER', 'NON_RUNNER'):
        position, status = 'NR', 'NR'
    else:
        position = str(ride.get('finish_position', ''))
        if not position.isdigit() or int(position) < 1:
            raise ValueError('Non-numeric finish needs manual review; left pending')
        status = 'LOSS' if position == '1' else 'WIN'
    winners = [r['horse']['name'] for r in rides if r.get('finish_position') == 1 and r.get('ride_status') == 'RUNNER']
    if not winners:
        raise ValueError('Winner not explicit')
    stamp = now.isoformat().replace('+00:00', 'Z')
    update = dict(position=position, result_status=status, result_source='SPORTING_LIFE', verification_status='WEBSITE_CONFIRMED', official_accuracy_eligible=False,
                  result_date=row['race_date'], result_off_time_uk=row['off_time_uk'], result_course=row['course'], result_horse=row['horse'],
                  result_off_dt=row['scheduled_off_dt'], result_retrieved_at=stamp, result_race_id=row['race_id'], result_horse_id=row['horse_id'],
                  result_website_race_id=ref, result_source_url=url, result_non_runners=non_runners,
                  result_website_horse_id=str(ride['horse']['horse_reference']['id']), result_stage='WEIGHEDIN')
    n = int(position) if position.isdigit() else 0
    suffix = 'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')
    update['placing'] = str(n) + suffix if n else position
    detail = dict(position=position, placing=update['placing'], result_status=status, winner=' / '.join(winners),
                  field_size=summary['ride_count'], results_url=url, race_name=summary['name'],
                  winning_margin_lengths=None, selected_beaten_lengths=None)
    return update, detail


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--probe', action='store_true')
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    if args.probe:
        page, _ = fetch(HOST + '/racing/results/2026-10-27/newcastle/945555/sunday-lunch-at-the-border-minstrel-novices-limited-handicap-chase-gbb-race')
        sample = dict(race_date='2026-10-27', off_time_uk='14:31', course='Newcastle', horse='Silver Hill', race_id='rac_32302523266', horse_id='hrs_44975042', scheduled_off_dt='2026-10-27T14:31:00+00:00')
        update, _ = result(sample, page, HOST + '/racing/results/2026-10-27/newcastle/945555/sunday-lunch-at-the-border-minstrel-novices-limited-handicap-chase-gbb-race', now)
        assert update['position'] == '4'
        print('Sporting Life network probe passed: exact Silver Hill race, fourth, weighed in')
        return
    today = now.astimezone(ZoneInfo('Europe/London')).date()
    changes = 0
    pending = []
    issues = []
    for path in sorted((ROOT / 'data').glob('competition-research-*.json')):
        day = path.stem.removeprefix('competition-research-')
        if day < '2026-10-21' or not (str(today - timedelta(days=3)) <= day <= str(today)):
            continue
        research = json.loads(path.read_text())
        if not research['high_competition'] and not research['competition_watchlist']:
            continue
        details_path = ROOT / 'data' / f'result-card-details-{day}.json'
        builder_path = ROOT / 'data' / f'bet-builder-{day}.json'
        if not details_path.exists() or not builder_path.exists():
            issues.append(day + ': missing companion files')
            continue
        details = json.loads(details_path.read_text())
        builder = json.loads(builder_path.read_text())
        dirty = False
        links = None
        for row in research['high_competition'] + research['competition_watchlist']:
            off = datetime.fromisoformat(row['scheduled_off_dt'])
            if now < off + timedelta(minutes=15):
                continue
            # Existing provider results stay untouched. Recheck our own results for corrections.
            if row.get('result_status') in ('WIN', 'LOSS', 'NR') and row.get('result_source') != 'SPORTING_LIFE':
                continue
            try:
                companions = [x for x in details['details'] if x['horse'] == row['horse'] and x['race_id'] == row['race_id'] and x['horse_id'] == row['horse_id'] and x['off_time_uk'] == row['off_time_uk'] and x['course'] == row['course']]
                booked = [x for x in builder['rows'] if all(x.get(k) == row.get(k) for k in ('horse', 'race_id', 'horse_id', 'race_date', 'course', 'off_time_uk', 'scheduled_off_dt'))]
                if len(companions) != 1 or len(booked) != 1:
                    raise ValueError('Companion identity mismatch')
                if links is None:
                    _, html = fetch(HOST + '/racing/results/' + day)
                    links = sorted(set(re.findall(r'href="(/racing/results/' + day + r'/[a-z0-9-]+/\d+/[a-z0-9-]+)"', html)))
                card = urlsplit(companions[0].get('racecard_url') or '')
                match = re.fullmatch(r'/racing/racecards/' + day + r'/([a-z0-9-]+)/racecard/(\d+)/[a-z0-9-]+', card.path)
                if card.hostname != 'www.sportinglife.com' or not match:
                    raise ValueError('Exact Sporting Life racecard not recorded')
                candidates = [link for link in links if link.split('/')[4:6] == list(match.groups())]
                if len(candidates) != 1:
                    raise ValueError('Full result link not available or ambiguous')
                url = HOST + candidates[0]
                page, _ = fetch(url)
                update, detail = result(row, page, url, now)
                if all(row.get(k) == update[k] for k in ('position', 'result_status', 'result_source_url', 'result_stage')):
                    continue
                old = {k: v for k, v in row.items() if k.startswith('result_') or k in ('position', 'placing', 'verification_status')}
                if row.get('result_source') == 'SPORTING_LIFE':
                    row.setdefault('result_history', []).append(old)
                    booked[0].setdefault('result_history', []).append(copy.deepcopy(old))
                row.update(update)
                booked[0].update(update)
                companions[0].update(update)
                companions[0].update(detail)
                dirty = True
                changes += 1
                print(day, row['horse'], update['placing'], update['result_status'])
            except (ValueError, KeyError, OSError) as error:
                message = str(error)
                expected_waits = (
                    'Full result link not available or ambiguous',
                    'Awaiting weighed-in full result',
                    'Non-numeric finish needs manual review; left pending',
                    'Winner not explicit',
                )
                item = day + ' ' + row['horse'] + ': ' + message
                if isinstance(error, OSError) or message in expected_waits:
                    pending.append(item)
                else:
                    issues.append(item)
        if dirty and args.write:
            for target, data in ((path, research), (details_path, details), (builder_path, builder)):
                target.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print(f'{changes} supported changes; write={args.write}')
    for item in pending:
        print('PENDING:', item)
    for issue in issues:
        print('ERROR:', issue)
    if issues:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
