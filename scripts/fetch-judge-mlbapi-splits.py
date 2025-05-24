import requests
import datetime
from collections import defaultdict

def fetch_game_log(mlbam_id, season):
    url = f"https://statsapi.mlb.com/api/v1/people/{mlbam_id}/stats?stats=gameLog&group=hitting&season={season}"
    resp = requests.get(url)
    data = resp.json()
    return data['stats'][0]['splits'] if data['stats'] and data['stats'][0]['splits'] else []

def parse_date(date_str):
    return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()

def aggregate_stats(games):
    # Aggregate basic stats
    total = defaultdict(float)
    for g in games:
        s = g['stat']
        for k in ['atBats','hits','homeRuns','rbi','baseOnBalls','strikeOuts','doubles','triples','plateAppearances','totalBases']:
            total[k] += float(s.get(k, 0))
    # Calculate AVG, OBP, SLG, OPS
    ab = total['atBats']
    h = total['hits']
    bb = total['baseOnBalls']
    pa = total['plateAppearances']
    tb = total['totalBases']
    obp = (h + bb) / pa if pa else 0
    slg = tb / ab if ab else 0
    avg = h / ab if ab else 0
    ops = obp + slg
    return {
        'G': len(games),
        'AB': int(ab),
        'H': int(h),
        'HR': int(total['homeRuns']),
        'RBI': int(total['rbi']),
        'BB': int(bb),
        'K': int(total['strikeOuts']),
        '2B': int(total['doubles']),
        '3B': int(total['triples']),
        'PA': int(pa),
        'TB': int(tb),
        'AVG': round(avg, 3),
        'OBP': round(obp, 3),
        'SLG': round(slg, 3),
        'OPS': round(ops, 3),
    }

def filter_games(games, start_date=None, end_date=None, is_home=None):
    filtered = []
    for g in games:
        gdate = parse_date(g['date'])
        if start_date and gdate < start_date:
            continue
        if end_date and gdate > end_date:
            continue
        if is_home is not None and g.get('isHome') != is_home:
            continue
        filtered.append(g)
    return filtered

def main():
    mlbam_id = 592450  # Aaron Judge
    season = 2025
    today = datetime.date.today()
    games = fetch_game_log(mlbam_id, season)
    # Recent form
    for window in [7, 14, 30]:
        start = today - datetime.timedelta(days=window)
        recent_games = filter_games(games, start_date=start, end_date=today)
        stats = aggregate_stats(recent_games)
        print(f"Last {window} days: {stats}")
    # Home/Away splits (full season)
    home_games = filter_games(games, is_home=True)
    away_games = filter_games(games, is_home=False)
    print(f"Home games: {aggregate_stats(home_games)}")
    print(f"Away games: {aggregate_stats(away_games)}")

if __name__ == "__main__":
    main()
