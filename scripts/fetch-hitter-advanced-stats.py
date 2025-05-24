import sys
import json
from pybaseball import batting_stats
import numpy as np
import pandas as pd

def main():
    # Get year from command line or use current year
    import datetime
    year = int(sys.argv[1]) if len(sys.argv) > 1 else datetime.datetime.now().year
    df = batting_stats(year, qual=0)
    # Replace NaN/inf with None for JSON compatibility
    df = df.replace({np.nan: None, np.inf: None, -np.inf: None})
    hitters = df.to_dict(orient='records')
    print(json.dumps(hitters, indent=2))

if __name__ == '__main__':
    main()
