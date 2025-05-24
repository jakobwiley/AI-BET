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

### 1B. Integrate Team Offense Metrics  
- wRC+, OPS, ISO, recent runs, splits vs. LHP/RHP.

### 1C. Integrate Bullpen and Defense Stats  
- Bullpen ERA, usage, DRS, errors, catcher framing.

### 1D. Integrate Weather & Park Factors  
- Wind, temp, humidity, park run factor.

### 1E. Integrate Odds Movement  
- Track opening vs. current lines.

### 1F. Integrate Injuries & Lineups  
- Real-time injury and lineup data.

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

### 5B. Expanded README  
- Document new features, data sources, and usage.

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
