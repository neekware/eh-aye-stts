#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗑️  Uninstalling STTS...${NC}\n"

# FIRST: Create no-op wrapper to prevent errors during/after uninstall
echo -e "${YELLOW}🔄 Creating no-op wrapper...${NC}"
mkdir -p ~/.stts/hooks
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows batch file
    cat > ~/.stts/hooks/stts.bat << 'EOF'
@echo off
REM STTS no-op wrapper - package uninstalled
REM This prevents errors if hooks are still configured
exit /b 0
EOF
else
    # Unix shell script
    cat > ~/.stts/hooks/stts << 'EOF'
#!/bin/sh
# STTS no-op wrapper - package uninstalled  
# This prevents errors if hooks are still configured
exit 0
EOF
    chmod +x ~/.stts/hooks/stts
fi
echo -e "${GREEN}✓ No-op wrapper created${NC}"

# Check if STTS is installed
if ! command -v stts &> /dev/null; then
    echo -e "${YELLOW}⚠️  STTS is not installed globally${NC}"
    exit 0
fi

# Show current version before uninstalling
echo -e "${YELLOW}📌 Current version:${NC}"
stts --version

# Try to disable hooks for all tools before uninstalling
echo -e "\n${YELLOW}🔇 Attempting to disable hooks...${NC}"
for tool in claude; do
    echo -e "${BLUE}  Trying to disable $tool...${NC}"
    stts disable $tool --workspace 2>/dev/null || true
done

# Remove audio command BEFORE uninstalling (so this script still exists)
echo -e "\n${YELLOW}🗑️  Removing audio command...${NC}"
if [ -f ~/.claude/commands/audio.md ]; then
    rm -f ~/.claude/commands/audio.md
    echo -e "${GREEN}✓ Audio command removed${NC}"
else
    echo -e "${BLUE}ℹ️  No audio command to remove${NC}"
fi

# Uninstall the package
echo -e "\n${YELLOW}📦 Uninstalling package...${NC}"
npm uninstall -g @eh-aye/stts

# Clean up logs but preserve configuration
echo -e "\n${YELLOW}🧹 Cleaning up logs...${NC}"
if [ -d ~/.stts/logs ]; then
    # Remove all files and subdirectories in logs, but keep the logs directory itself
    find ~/.stts/logs -mindepth 1 -delete 2>/dev/null || true
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