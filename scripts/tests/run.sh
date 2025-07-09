#!/bin/bash

# Main test runner for STTS manual tests
# Usage: ./test/manual/run.sh [command] [args...]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default command
COMMAND=${1:-help}

# Shift to get remaining args
shift || true

case "$COMMAND" in
    build)
        echo -e "${BLUE}🔨 Building project...${NC}"
        "$SCRIPT_DIR/build.sh"
        ;;
    
    enable)
        echo -e "${GREEN}✨ Enabling STTS...${NC}"
        "$SCRIPT_DIR/enable.sh" "$@"
        ;;
    
    disable)
        echo -e "${YELLOW}🔇 Disabling STTS...${NC}"
        "$SCRIPT_DIR/disable.sh" "$@"
        ;;
    
    status)
        echo -e "${BLUE}📊 Checking status...${NC}"
        "$SCRIPT_DIR/status.sh" "$@"
        ;;
    
    verify)
        echo -e "${BLUE}🔍 Verifying hooks...${NC}"
        "$SCRIPT_DIR/verify-hooks.sh"
        ;;
    
    clean)
        echo -e "${YELLOW}🧹 Cleaning build artifacts...${NC}"
        rm -rf "$PROJECT_ROOT/dist"
        rm -f "$SCRIPT_DIR"/{enable,disable,status}.sh
        echo -e "${GREEN}✓ Clean complete${NC}"
        ;;
    
    all)
        echo -e "${BLUE}🚀 Running full test cycle...${NC}"
        echo
        
        # Build
        "$SCRIPT_DIR/build.sh"
        echo
        
        # Enable
        echo -e "${GREEN}Testing enable...${NC}"
        "$SCRIPT_DIR/enable.sh" claude
        echo
        
        # Verify
        echo -e "${BLUE}Verifying installation...${NC}"
        "$SCRIPT_DIR/verify-hooks.sh"
        echo
        
        # Status
        echo -e "${BLUE}Checking status...${NC}"
        "$SCRIPT_DIR/status.sh" claude
        echo
        
        # Disable
        echo -e "${YELLOW}Testing disable...${NC}"
        "$SCRIPT_DIR/disable.sh" claude
        echo
        
        # Verify removal
        echo -e "${BLUE}Verifying removal...${NC}"
        "$SCRIPT_DIR/verify-hooks.sh"
        echo
        
        echo -e "${GREEN}✅ Full test cycle complete!${NC}"
        ;;
    
    help|*)
        echo "STTS Manual Test Runner"
        echo "======================"
        echo
        echo "Usage: npm run test:manual -- [command] [args...]"
        echo
        echo "Commands:"
        echo "  build    - Build the project and create test scripts"
        echo "  enable   - Enable STTS hooks (default: claude)"
        echo "  disable  - Disable STTS hooks (default: claude)"
        echo "  status   - Check STTS status (default: claude)"
        echo "  verify   - Verify hook installation"
        echo "  clean    - Clean build artifacts"
        echo "  all      - Run full test cycle (build, enable, verify, disable)"
        echo "  help     - Show this help message"
        echo
        echo "Examples:"
        echo "  npm run test:manual -- build"
        echo "  npm run test:manual -- enable claude --dangerous-commands"
        echo "  npm run test:manual -- verify"
        echo "  npm run test:manual -- all"
        ;;
esac