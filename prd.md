# Product Requirements Document (PRD)

## 2025-05-22 — Advanced Pitcher Stat Integration: New Direction

### Summary of Change
- We are moving away from patching legacy scripts and instead building a new, robust, and modular advanced pitcher stat integration and testing suite under `src/experimental/advanced-pitching/`.
- All new logic, tests, and data flows will be isolated from legacy code, with a path to clean up and deprecate or remove unused/broken scripts.
- This ensures maintainability, testability, and alignment with our world-class analytics goals for MLB.

### Implementation Plan
1. **Scaffold `src/experimental/advanced-pitching/`:**
   - All new advanced pitcher stat logic and tests will live here.
   - No legacy import or module issues.
2. **Implement:**
   - `factorCalculator.ts`: Core logic for advanced pitcher stat factors.
   - `testFactorCalculator.ts`: Self-contained test script with mock and real data support.
   - Modern logging and error handling.
3. **Clean Up:**
   - Mark legacy scripts as deprecated or remove them if not in use.
   - Document new modules and usage clearly.

### Technical/Process Appendix

### Feature-Specific Testing for Data Pipelines

**Automation Backfill (May 2025):**
- Added robust automated test scripts for pitcher stats loaders:
  - `scripts/test-fetch-pitcher-stats.ts` (basic stats)
  - `scripts/test-fetch-pitcher-advanced-stats.ts` (advanced stats)
- All tests are run via `ts-node` for ESM/TypeScript compatibility.
- Hitter stats tests (see `scripts/test-hitter-stats-loader.ts`) are also required and should be validated in the same manner for all new and historical integrations.

All new data pipelines (including pitching and hitting advanced stats) must be validated with feature-specific tests before integration or merging. Due to ESM and TypeScript compatibility issues with Jest, we use direct TypeScript test scripts run via `ts-node` for validation.

**Example:** See `scripts/test-hitter-stats-loader.ts` for a complete test of the hitter splits loader.

**How to run:**
```sh
npx ts-node --experimental-specifier-resolution=node scripts/test-hitter-stats-loader.ts
```

This approach is now required for all new MLB/NBA data integrations to ensure reliability and compliance with internal testing policy.

### Progress Tracking
- [ ] Scaffold new directory and files
- [ ] Implement core logic and tests
- [ ] Validate with real and mock data
- [ ] Remove or archive legacy scripts
- [ ] Document everything for future contributors

---
: MLB Prediction Model Enhancement

**Project Owner:** jakemullins  
**Code Owner:** Cascade AI  
**Goal:** Maximize MLB prediction model quality, feature richness, and actionable improvements for personal sports betting insights.

---

## 1. Data Pipeline & Feature Expansion

**Goal:** Gather, process, and structure advanced MLB data for use in predictions.

### 1A. Integrate Advanced Pitcher Stats  
- FIP, xFIP, SIERA, K/BB, WHIP, recent pitch counts, handedness splits.

### 1B. Integrate Advanced Hitter Stats, Splits & Streaks  
- wOBA, wRC+, OBP, SLG, BB%, K%, WAR, etc. for all MLB hitters.

### Advanced Hitter Splits vs. LHP/RHP

#### Features
- Fetch and aggregate season and recent (7/14/30 day) splits for every hitter vs. LHP and RHP using the MLB API.
- Output JSON includes: `recent`, `splits`, `vs_hand`, and `streaks` for each hitter.
- Resume mode: Script skips already-complete hitters, so jobs can be resumed after interruption.
- Robust error handling: API timeouts and failures are logged, never halt the script.
- Progress reporting: Status every 10 hitters, and on skips.

#### Loader & Validation
- The TypeScript loader exposes all splits, including `vs_hand` (LHP/RHP).
- Loader must be run after script to validate output and structure before integration.

#### Testing Policy
- All data pipelines and scripts must be run and validated before integration or use in production. This is mandatory for all enhancements.

#### Example Validation
- Run the loader (see README) and verify output for a known hitter (e.g., Aaron Judge) and a sample of others.
- Confirm the structure matches the documented JSON schema.

### 1C. Integrate Bullpen and Defense Stats  
- Bullpen ERA, usage, DRS, errors, catcher framing.

### 1D. Integrate Weather & Park Factors  
- Wind, temp, humidity, park run factor.

### 1E. Integrate Odds Movement  
- Track opening vs. current lines.

### 1F. Integrate Injuries & Lineups  
- Real-time injury and lineup data.

### Enhanced Defensive Analytics (Retrosheet, Chadwick, etc.)
- **Goal:** Integrate additional advanced defensive metrics for the current MLB season (**2025**) from open public sources such as Retrosheet and Chadwick Bureau.
- **Rationale:** Further enrich the model with granular and historical defensive analytics, focusing on the latest available data.
- **Planned Pipeline:**
  - Automated download and parsing of Retrosheet event files for 2025
  - Aggregation of advanced team and position-level metrics (range factor, double plays, assists, errors, splits)
  - Loader and automated test scripts for validation
  - Output to `data/enhanced_defense_stats_<date>.json`
- **Supported Metrics:**
  - Range Factor (RF)
  - Double Plays (DP)
  - Assists (A)
  - Errors (E)
  - By-position splits (e.g., SS, 2B, OF breakdowns)
- **Status:** Next up after bullpen/defense stats pipeline merge

---

## 2. Model Enhancements

**Goal:** Use new data to improve prediction accuracy and confidence grading.

### 2A. Feature Engineering  
- Rolling averages, z-scores, percentiles for all stats.

### 2B. Player-Level Modeling  
- Model pitcher/batter matchups, not just team stats.

### 2C. Confidence Grading & Calibration  
- Model calibration curves, A/B/C pick grading.

---

## 3. Performance Tracking & Backtesting

**Goal:** Log, analyze, and learn from every pick.

### 3A. Persistent Logging  
- Log all picks, model inputs, and results to a CSV or database.

### 3B. Automated Analysis  
- Scripts to analyze win rate, ROI, model calibration.

### 3C. Model Adjustment  
- Use analysis to tune model parameters automatically.

---

## 4. Output, Explainability, and Google Sheets Integration

**Goal:** Make picks easy to review and understand.

### 4A. Enhanced Output  
- For each pick, include a “why” (short rationale).

### 4B. Google Sheets Integration  
- Push picks and results to a Google Sheet for personal review.

### 4C. Automated Performance Summaries  
- Weekly/monthly summaries of performance to Google Sheets.

---

## 5. Documentation & Config

**Goal:** Make the system easy to understand, configure, and extend.

### 5A. Centralized Config  
- All model and pipeline settings in a single config file.

### 5B. Expanded README & PRD  
- Document new features, data sources, and usage.
- All new data pipelines, scripts, and integrations (including advanced hitter splits/streaks) must be tested and validated before integration. Testing is mandatory for both Python and TypeScript workflows. This policy must be followed by all agents and contributors.
- Add explicit instructions for running, validating, and troubleshooting new scripts (see README for details).
- Document all changes and update this PRD and the README as the source of truth for future AI/automation.

---

## Branching Plan

- Each number (1, 2, 3, 4, 5) will be a main branch.
- Each letter (A, B, C, etc.) will be a feature branch off its main branch.
- Example: `1A-advanced-pitcher-stats`, `2B-player-level-modeling`, etc.

---

## Next Steps

1. Merge this PRD into main/develop branch for tracking.
2. Begin with `1A-advanced-pitcher-stats` (branch) and provide a draft of the new data model and data fetch logic.
3. Track and review progress for each feature as a PR/branch.
