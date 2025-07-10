#!/usr/bin/env python3
"""Stop hook wrapper for stts."""

import json
import sys
import subprocess

def main():
    """Read stdin and pass to stts hook command."""
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)
        
        # Call stts with the hook type
        cmd = ["stts", "hook", "stop"]
        
        # Pass the JSON data to stts via stdin
        result = subprocess.run(
            cmd,
            input=json.dumps(input_data),
            text=True,
            capture_output=True
        )
        
        # Forward any output
        if result.stdout:
            print(result.stdout, end='')
        if result.stderr:
            print(result.stderr, file=sys.stderr, end='')
        
        # Exit with the same code as stts
        sys.exit(result.returncode)
        
    except Exception:
        # Exit cleanly on any error
        sys.exit(0)

if __name__ == '__main__':
    main()