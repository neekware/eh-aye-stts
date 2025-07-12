#!/usr/bin/env python3

import json
import sys
import subprocess
from pathlib import Path

def get_tts_command():
    """Get the stts command path"""
    return "stts"

def main():
    try:
        # Read JSON from stdin
        data = json.load(sys.stdin)
        
        # Log the event for debugging
        log_dir = Path.home() / ".stts" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Append to log file
        log_file = log_dir / "subagent_stop.json"
        logs = []
        if log_file.exists():
            try:
                with open(log_file, 'r') as f:
                    logs = json.load(f)
            except:
                logs = []
        
        logs.append(data)
        
        with open(log_file, 'w') as f:
            json.dump(logs, f, indent=2)
        
        # Announce subagent completion
        message = "Subagent complete"
        try:
            subprocess.run([
                get_tts_command(), "say", message
            ], capture_output=True, timeout=5)
        except:
            pass  # Fail silently
        
    except Exception:
        pass  # Fail silently
    
    sys.exit(0)

if __name__ == "__main__":
    main()