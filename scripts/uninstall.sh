#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗑️  Uninstalling STTS...${NC}\n"

# Check if STTS is installed
if ! command -v stts &> /dev/null; then
    echo -e "${YELLOW}⚠️  STTS is not installed globally${NC}"
    exit 0
fi

# Show current version before uninstalling
echo -e "${YELLOW}📌 Current version:${NC}"
stts --version

# Disable hooks for all detected tools before uninstalling
echo -e "\n${YELLOW}🔇 Disabling hooks for all tools...${NC}"
for tool in claude-code claude cursor windsurf zed; do
    if stts detect $tool 2>/dev/null | grep -q "detected"; then
        echo -e "${BLUE}  Disabling $tool...${NC}"
        stts disable $tool 2>/dev/null || true
    fi
done

# Uninstall the package
echo -e "\n${YELLOW}📦 Uninstalling package...${NC}"
npm uninstall -g @eh-aye/stts

# Clean up logs but preserve configuration
echo -e "\n${YELLOW}🧹 Cleaning up logs...${NC}"
if [ -d ~/.stts/logs ]; then
    rm -f ~/.stts/logs/*
    echo -e "${GREEN}✓ Logs removed${NC}"
else
    echo -e "${BLUE}ℹ️  No logs to clean${NC}"
fi

echo -e "\n${BLUE}ℹ️  Configuration preserved${NC}"
echo -e "Configuration files remain at:"
echo -e "  • ~/.stts/settings.json (global settings)"
echo -e "  • ./.stts.json (project configs)"
echo -e ""
echo -e "${YELLOW}Note: Your settings have been preserved for future installations${NC}"

echo -e "\n${GREEN}✅ STTS uninstalled successfully!${NC}"