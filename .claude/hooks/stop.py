#!/usr/bin/env python3

import json
import sys
import subprocess
from pathlib import Path

def get_tts_command():
    """Get the stts command path"""
    return "stts"

def process_transcript(transcript_path):
    """Process the transcript file and save as chat.json"""
    try:
        if not transcript_path or not Path(transcript_path).exists():
            return
        
        # Read .jsonl file and convert to JSON array
        chat_data = []
        with open(transcript_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        chat_data.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass  # Skip invalid lines
        
        # Write to logs/chat.json
        log_dir = Path.home() / ".stts" / "logs"
        chat_file = log_dir / "chat.json"
        with open(chat_file, 'w') as f:
            json.dump(chat_data, f, indent=2)
            
    except Exception:
        pass  # Fail silently

def main():
    try:
        # Read JSON from stdin
        data = json.load(sys.stdin)
        
        # Log the event for debugging
        log_dir = Path.home() / ".stts" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Append to log file
        log_file = log_dir / "stop.json"
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
        
        # Process transcript if available
        transcript_path = data.get('transcript_path')
        if transcript_path:
            process_transcript(transcript_path)
        
        # Extract session info
        session_id = data.get('session_id', '')
        reason = data.get('reason', 'Session ended')
        
        # Announce session end
        message = "Session complete"
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