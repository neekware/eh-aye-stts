#!/bin/bash

# Test LLM Integration Script
# This script helps debug and test the LLM integration with Claude hooks

set -e

echo "🧪 Testing LLM Integration with Claude Hooks"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo -e "${RED}Error: tsx is not installed. Install it with: npm install -g tsx${NC}"
    exit 1
fi

# Check if Claude CLI is available
if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: Claude CLI is not installed${NC}"
    echo "Visit: https://claude.ai/download to install"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}\n"

# Function to run a test with description
run_test() {
    local description="$1"
    local command="$2"
    
    echo -e "${BLUE}▶ $description${NC}"
    echo -e "${YELLOW}Command: $command${NC}"
    
    if eval "$command"; then
        echo -e "${GREEN}✓ Test passed${NC}\n"
    else
        echo -e "${RED}✗ Test failed${NC}\n"
    fi
}

# 1. Test Claude CLI directly
echo -e "${BLUE}=== Testing Claude CLI ===${NC}"
run_test "Check Claude version" "claude --version"

# 2. Test simple prompt
echo -e "${BLUE}=== Testing Simple Claude Prompt ===${NC}"
run_test "Simple prompt test" "echo 'Say hello in 5 words or less' | claude -p"

# 3. Run the debug script
echo -e "${BLUE}=== Running LLM Debug Script ===${NC}"
run_test "LLM Debug Script" "DEBUG=1 tsx scripts/debug-llm.ts"

# 4. Run hook simulations
echo -e "${BLUE}=== Running Hook Event Simulations ===${NC}"
run_test "Hook Event Simulator" "DEBUG=1 tsx scripts/simulate-hook-events.ts"

# 5. Test with actual hook execution
echo -e "${BLUE}=== Testing Individual Hooks ===${NC}"

# Test post-tool-use hook
echo -e "${YELLOW}Testing post-tool-use hook...${NC}"
test_event='{"tool":"Bash","args":{"command":"npm test"},"result":"All tests passed","exitCode":0,"duration":3000}'
echo "$test_event" | DEBUG=1 tsx src/plugins/claude/hooks/post-tool-use.ts

# 6. Show logs
echo -e "${BLUE}=== Log Files ===${NC}"
LOG_DIR="$HOME/.stts/logs/$(basename $(pwd))"
if [ -d "$LOG_DIR" ]; then
    echo -e "${YELLOW}Log directory: $LOG_DIR${NC}"
    
    if [ -f "$LOG_DIR/llm-debug.json" ]; then
        echo -e "${GREEN}LLM Debug Log:${NC}"
        tail -n 20 "$LOG_DIR/llm-debug.json" | jq '.' 2>/dev/null || cat "$LOG_DIR/llm-debug.json"
    fi
    
    if [ -f "$LOG_DIR/hook-debug.json" ]; then
        echo -e "${GREEN}Hook Debug Log:${NC}"
        tail -n 20 "$LOG_DIR/hook-debug.json" | jq '.' 2>/dev/null || cat "$LOG_DIR/hook-debug.json"
    fi
else
    echo -e "${YELLOW}No logs found at: $LOG_DIR${NC}"
fi

echo -e "${GREEN}✓ All tests completed${NC}"
echo -e "${YELLOW}Check the logs for detailed debugging information${NC}"