"""
Fetches MLB hitter splits (vs LHP/RHP, home/away) and recent streaks for all probable hitters in today's lineups.
Saves data as JSON for use in prediction pipeline.
"""
import json
import datetime
from pybaseball import playerid_lookup, statcast_batter, batting_stats_range
from pybaseball.lahman import people

# --- Config ---
SPLIT_PERIODS = ["vsLHP", "vsRHP", "home", "away"]
STREAK_WINDOWS = [7, 14, 30]

import requests
import datetime
import json
from collections import defaultdict

def get_probable_hitters():
    team_abbrev_to_id = {
        'NYY': 147, 'BOS': 111, 'TOR': 141, 'BAL': 110, 'TBR': 139,
        'CLE': 114, 'CWS': 145, 'DET': 116, 'KCR': 118, 'MIN': 142,
        'HOU': 117, 'LAA': 108, 'OAK': 133, 'SEA': 136, 'TEX': 140,
        'ATL': 144, 'MIA': 146, 'NYM': 121, 'PHI': 143, 'WSN': 120,
        'CHC': 112, 'CIN': 113, 'MIL': 158, 'PIT': 134, 'STL': 138,
        'ARI': 109, 'COL': 115, 'LAD': 119, 'SDP': 135, 'SFG': 137
    }
    teams = team_abbrev_to_id.keys()
    hitters = []
    seen_ids = set()
    for abbrev in teams:
        team_id = team_abbrev_to_id[abbrev]
        url = f"https://statsapi.mlb.com/api/v1/teams/{team_id}/roster/Active"
        try:
            resp = requests.get(url)
            data = resp.json()
            for player in data.get('roster', []):
                pos = player.get('position', {}).get('abbreviation', '')
                if pos.startswith('P'):
                    continue
                mlbam_id = player.get('person', {}).get('id')
                name = player.get('person', {}).get('fullName')
                if not mlbam_id or mlbam_id in seen_ids:
                    continue
                hitters.append({'name': name, 'mlbam_id': int(mlbam_id)})
                seen_ids.add(mlbam_id)
        except Exception as e:
            print(f"Error fetching roster for {abbrev}: {e}")
    return hitters

def fetch_game_log(mlbam_id, season):
    url = f"https://statsapi.mlb.com/api/v1/people/{mlbam_id}/stats?stats=gameLog&group=hitting&season={season}"
    resp = requests.get(url)
    data = resp.json()
    return data['stats'][0]['splits'] if data['stats'] and data['stats'][0]['splits'] else []

def parse_date(date_str):
    return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()

def aggregate_stats(games):
    total = defaultdict(float)
    for g in games:
        s = g['stat']
        for k in ['atBats','hits','homeRuns','rbi','baseOnBalls','strikeOuts','doubles','triples','plateAppearances','totalBases']:
            total[k] += float(s.get(k, 0))
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
    today = datetime.date.today()
    season = today.year
    hitters = get_probable_hitters()
    all_data = {}
    for hitter in hitters:
        mlbam_id = hitter['mlbam_id']
        name = hitter['name']
        games = fetch_game_log(mlbam_id, season)
        recent = {}
        for window in [7, 14, 30]:
            start = today - datetime.timedelta(days=window)
            recent_games = filter_games(games, start_date=start, end_date=today)
            recent[str(window)] = aggregate_stats(recent_games)
        home_games = filter_games(games, is_home=True)
        away_games = filter_games(games, is_home=False)
        splits = {
            'home': aggregate_stats(home_games),
            'away': aggregate_stats(away_games)
        }
        # --- Streaks ---
        # Go through games in reverse (most recent first)
        hit_streak = 0
        on_base_streak = 0
        multi_hit_streak = 0
        hr_streak = 0
        for g in reversed(games):
            hits = int(g['stat'].get('hits', 0))
            ob = hits + int(g['stat'].get('baseOnBalls', 0)) + int(g['stat'].get('hitByPitch', 0))
            hr = int(g['stat'].get('homeRuns', 0))
            # Hitting streak
            if hits > 0:
                hit_streak += 1
            else:
                break
        for g in reversed(games):
            hits = int(g['stat'].get('hits', 0))
            ob = hits + int(g['stat'].get('baseOnBalls', 0)) + int(g['stat'].get('hitByPitch', 0))
            if ob > 0:
                on_base_streak += 1
            else:
                break
        for g in reversed(games):
            hits = int(g['stat'].get('hits', 0))
            if hits >= 2:
                multi_hit_streak += 1
            else:
                break
        for g in reversed(games):
            hr = int(g['stat'].get('homeRuns', 0))
            if hr > 0:
                hr_streak += 1
            else:
                break
        streaks = {
            'hit': hit_streak,
            'on_base': on_base_streak,
            'multi_hit': multi_hit_streak,
            'hr': hr_streak
        }
        all_data[str(mlbam_id)] = {
            'name': name,
            'recent': recent,
            'splits': splits,
            'streaks': streaks
        }
    out_path = f"data/hitter_splits_streaks_{today.strftime('%Y-%m-%d')}.json"
    with open(out_path, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"Saved splits/streaks for {len(all_data)} hitters to {out_path}")

if __name__ == "__main__":
    main()

# --- Fetch Splits by aggregating statcast_batter ---
def fetch_hitter_splits(mlbam_id):
    today = datetime.date.today()
    season_start = datetime.date(today.year, 3, 1)
    # Always pass dates as strings to pybaseball/stat functions
    today_str = today.strftime('%Y-%m-%d')
    season_start_str = season_start.strftime('%Y-%m-%d')
    try:
        df = statcast_batter(season_start_str, today_str, player_id=mlbam_id)
        if df is None or df.empty:
            return {}
        out = {}
        # vs LHP
        vs_lhp = df[df['p_throws'] == 'L']
        out['vsLHP'] = _aggregate_stats(vs_lhp)
        # vs RHP
        vs_rhp = df[df['p_throws'] == 'R']
        out['vsRHP'] = _aggregate_stats(vs_rhp)
        # Home
        home = df[df['home_team'] == df['team']]
        out['home'] = _aggregate_stats(home)
        # Away
        away = df[df['home_team'] != df['team']]
        out['away'] = _aggregate_stats(away)
        return out
    except Exception as e:
        print(f"Error fetching splits for {mlbam_id}: {e}")
        return {}
