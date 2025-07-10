#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Running STTS in development mode...${NC}\n"

# 1. Build the project
echo -e "${YELLOW}📦 Building project...${NC}"
npm run build

# 2. Run commands using node directly
echo -e "\n${BLUE}🧪 Testing commands with local build...${NC}\n"

# Show version
echo -e "${YELLOW}📌 Version:${NC}"
node dist/src/cli/program.js --version

# Detect tools
echo -e "\n${YELLOW}🔍 Detecting tools:${NC}"
node dist/src/cli/program.js detect

# Show status
echo -e "\n${YELLOW}📊 Status:${NC}"
node dist/src/cli/program.js status

# Test help
echo -e "\n${YELLOW}❓ Help:${NC}"
node dist/src/cli/program.js --help

# Test hook command (should show help)
echo -e "\n${YELLOW}🪝 Hook command:${NC}"
node dist/src/cli/program.js hook --help || true

echo -e "\n${GREEN}✅ Development test complete!${NC}"
echo -e "${BLUE}💡 To test enable/disable locally:${NC}"
echo -e "  ${YELLOW}node dist/src/cli/program.js enable claude-code${NC}"
echo -e "  ${YELLOW}node dist/src/cli/program.js disable claude-code${NC}"