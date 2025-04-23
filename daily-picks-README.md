# Daily Picks Generator

This script generates a daily list of the top betting predictions from the AI-BET system.

## Requirements

- Node.js (v14 or later)
- npm (Node Package Manager)

## Installation

1. Make sure the AI-BET application is running on port 3000.
2. Install the required dependencies:

```bash
npm install axios date-fns
```

3. Make the script executable:

```bash
chmod +x daily-picks.js
```

## Usage

Run the script:

```bash
./daily-picks.js
```

This will:
1. Fetch today's games from the API
2. Filter predictions with confidence ratings of 75% or higher
3. Output the results to the console
4. Save the results to a file called `todays-picks.txt` in the current directory

## Customization

You can modify the following parameters in the script:

- `API_BASE_URL`: Change this if your API is running on a different port or host
- `CONFIDENCE_THRESHOLD`: Adjust to show more or fewer predictions (higher = more selective)

## Example Output

```
TODAY'S TOP PREDICTIONS (Apr 14, 2023)
==============================================

MLB GAMES
--------------

Texas Rangers @ Seattle Mariners - 4:40 PM
  TOTAL     : O/U 7      | Confidence: 90% | Grade: A
  SPREAD    : 0          | Confidence: 81% | Grade: B
  MONEYLINE : -142       | Confidence: 76% | Grade: B

Los Angeles Angels @ Houston Astros - 6:10 PM
  MONEYLINE : -142       | Confidence: 86% | Grade: A
  SPREAD    : 0          | Confidence: 83% | Grade: B
  TOTAL     : O/U 8.5    | Confidence: 80% | Grade: B

NBA GAMES
--------------

Detroit Pistons @ Milwaukee Bucks - 7:00 PM
  SPREAD    : -12.5      | Confidence: 89% | Grade: A
  MONEYLINE : -1250      | Confidence: 87% | Grade: A
  TOTAL     : O/U 231.5  | Confidence: 81% | Grade: B
```

## Support

For questions or issues, please contact the AI-BET development team. 