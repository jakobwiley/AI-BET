#!/usr/bin/env python3
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import traceback
import time
from datetime import datetime, timedelta

# nba_api imports
from nba_api.stats.endpoints import leaguedashteamstats, playercareerstats, commonteamroster
from nba_api.stats.static import teams, players

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# In-memory cache
cache = {}
CACHE_TTL = {
    'teams': 24 * 60 * 60,  # 24 hours for static team data
    'team_stats': 6 * 60 * 60,  # 6 hours for team stats
    'advanced_stats': 6 * 60 * 60,  # 6 hours for advanced stats
    'player_stats': 12 * 60 * 60,  # 12 hours for player stats
    'h2h': 6 * 60 * 60,  # 6 hours for head to head data
}

def get_cache(key, cache_type):
    """Get data from cache if it exists and is not expired"""
    if key in cache:
        timestamp, data = cache[key]
        if time.time() - timestamp < CACHE_TTL.get(cache_type, 3600):
            return data
    return None

def set_cache(key, data, cache_type):
    """Set data in cache with timestamp"""
    cache[key] = (time.time(), data)
    return data

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "api_version": "1.0.0"
    })

@app.route('/teams', methods=['GET'])
def get_teams():
    """Get all NBA teams"""
    cache_key = 'all_teams'
    cached_data = get_cache(cache_key, 'teams')
    if cached_data:
        return jsonify(cached_data)
    
    try:
        all_teams = teams.get_teams()
        return jsonify(set_cache(cache_key, all_teams, 'teams'))
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/teams/<team_id>/stats', methods=['GET'])
def get_team_stats(team_id):
    """Get team stats by team ID"""
    cache_key = f'team_stats_{team_id}'
    season = request.args.get('season', datetime.now().year)
    
    cached_data = get_cache(cache_key, 'team_stats')
    if cached_data:
        return jsonify(cached_data)
    
    try:
        # Basic team stats
        team_stats = leaguedashteamstats.LeagueDashTeamStats(
            team_id_nullable=team_id,
            season=f"{season}-{str(int(season) + 1)[-2:]}",
            per_mode_detailed='PerGame'
        )
        basic_stats = team_stats.get_dict()
        
        # Advanced stats
        advanced_stats = leaguedashteamstats.LeagueDashTeamStats(
            team_id_nullable=team_id,
            season=f"{season}-{str(int(season) + 1)[-2:]}",
            per_mode_detailed='PerGame',
            measure_type_detailed_defense='Advanced'
        )
        adv_stats = advanced_stats.get_dict()
        
        result = {
            "basic": basic_stats,
            "advanced": adv_stats
        }
        
        return jsonify(set_cache(cache_key, result, 'team_stats'))
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/advanced-stats/<team_id>', methods=['GET'])
def get_advanced_team_stats(team_id):
    """Get advanced stats for a team"""
    cache_key = f'advanced_stats_{team_id}'
    season = request.args.get('season', datetime.now().year)
    
    cached_data = get_cache(cache_key, 'advanced_stats')
    if cached_data:
        return jsonify(cached_data)
    
    try:
        # Get advanced team stats
        stats = leaguedashteamstats.LeagueDashTeamStats(
            team_id_nullable=team_id,
            measure_type_detailed_defense='Advanced',
            per_mode_detailed='PerGame',
            season=f"{season}-{str(int(season) + 1)[-2:]}",
        )
        
        result = stats.get_dict()
        return jsonify(set_cache(cache_key, result, 'advanced_stats'))
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/team-by-name/<team_name>', methods=['GET'])
def get_team_by_name(team_name):
    """Find team ID by name"""
    cache_key = f'team_name_{team_name}'
    cached_data = get_cache(cache_key, 'teams')
    if cached_data:
        return jsonify(cached_data)
    
    try:
        all_teams = teams.get_teams()
        found_teams = [t for t in all_teams if team_name.lower() in t['full_name'].lower()]
        
        if not found_teams:
            return jsonify({"error": f"Team not found: {team_name}"}), 404
            
        return jsonify(set_cache(cache_key, found_teams[0], 'teams'))
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/team-roster/<team_id>', methods=['GET'])
def get_team_roster(team_id):
    """Get roster for a team"""
    cache_key = f'team_roster_{team_id}'
    season = request.args.get('season', datetime.now().year)
    
    cached_data = get_cache(cache_key, 'team_stats')
    if cached_data:
        return jsonify(cached_data)
    
    try:
        roster = commonteamroster.CommonTeamRoster(
            team_id=team_id,
            season=f"{season}-{str(int(season) + 1)[-2:]}"
        )
        result = roster.get_dict()
        return jsonify(set_cache(cache_key, result, 'team_stats'))
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/player-stats/<player_id>', methods=['GET'])
def get_player_stats(player_id):
    """Get player stats"""
    cache_key = f'player_stats_{player_id}'
    
    cached_data = get_cache(cache_key, 'player_stats')
    if cached_data:
        return jsonify(cached_data)
    
    try:
        player_career = playercareerstats.PlayerCareerStats(player_id=player_id)
        result = player_career.get_dict()
        return jsonify(set_cache(cache_key, result, 'player_stats'))
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/clear-cache', methods=['POST'])
def clear_cache():
    """Admin endpoint to clear the cache"""
    global cache
    cache = {}
    return jsonify({"status": "Cache cleared", "cache_size": len(cache)})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True) 