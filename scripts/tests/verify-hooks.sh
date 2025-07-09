#!/bin/bash

# Script to verify STTS hook installation in Claude settings

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 STTS Hook Verification Script${NC}"
echo "================================"
echo

# Find Claude settings file
CLAUDE_SETTINGS=""
POSSIBLE_PATHS=(
    "$HOME/Library/Application Support/Claude/claude_code_settings.json"
    "$HOME/.config/Claude/claude_code_settings.json"
    "$HOME/.claude/claude_code_settings.json"
    "$HOME/.claude/settings.json"
)

for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        CLAUDE_SETTINGS="$path"
        break
    fi
done

if [ -z "$CLAUDE_SETTINGS" ]; then
    echo -e "${RED}❌ Claude settings file not found${NC}"
    echo "Checked paths:"
    for path in "${POSSIBLE_PATHS[@]}"; do
        echo "  - $path"
    done
    exit 1
fi

echo -e "${GREEN}✓ Found Claude settings:${NC} $CLAUDE_SETTINGS"
echo

# Check if any STTS hooks are installed
echo -e "${BLUE}Checking for STTS hooks...${NC}"
echo

# Look for STTS hook patterns in the settings file
if grep -q "STTS-HOOK-v\|stts/dist/hooks/\|@eh-aye/stts" "$CLAUDE_SETTINGS"; then
    echo -e "${GREEN}✓ STTS hooks detected${NC}"
    echo
    
    # Show all STTS hooks
    echo "Installed STTS hooks:"
    echo "-------------------"
    
    # Extract and display STTS hooks with context
    grep -B2 -A2 "STTS-HOOK-v\|stts/dist/hooks/\|@eh-aye/stts" "$CLAUDE_SETTINGS" | grep -E "\"(PreToolUse|PostToolUse|Notification|Stop|SubagentStop|Agent)\":|\"command\":" | sed 's/^/  /'
    
    echo
    
    # Count STTS hooks
    HOOK_COUNT=$(grep -c "STTS-HOOK-v\|stts/dist/hooks/\|@eh-aye/stts" "$CLAUDE_SETTINGS")
    echo -e "${GREEN}Total STTS hooks: $HOOK_COUNT${NC}"
    
    # Check for version identifiers
    if grep -q "STTS-HOOK-v" "$CLAUDE_SETTINGS"; then
        echo
        echo "Version identifiers found:"
        grep -o "STTS-HOOK-v[0-9.]*" "$CLAUDE_SETTINGS" | sort | uniq | sed 's/^/  - /'
    fi
else
    echo -e "${YELLOW}⚠️  No STTS hooks found${NC}"
    echo
    echo "To install STTS hooks, run:"
    echo "  ./test-enable.sh"
fi

echo
echo -e "${BLUE}Settings file backup info:${NC}"
ls -la "$CLAUDE_SETTINGS".backup-* 2>/dev/null | tail -5 || echo "  No backups found"

echo