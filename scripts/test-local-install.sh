#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Testing local STTS installation as end user would...${NC}\n"

# Save current directory
ORIGINAL_DIR=$(pwd)

# 1. Build the project
echo -e "${YELLOW}📦 Building project...${NC}"
npm run build

# 2. Create a package
echo -e "${YELLOW}📦 Creating npm package...${NC}"
npm pack

# Get the package filename
PACKAGE_FILE=$(ls -t *.tgz | head -1)

# 3. Uninstall existing version if present
echo -e "${YELLOW}🗑️  Uninstalling existing version...${NC}"
npm uninstall -g @eh-aye/stts 2>/dev/null || true

# 4. Install globally
echo -e "${YELLOW}🌍 Installing globally...${NC}"
npm install -g ./$PACKAGE_FILE

# 5. Clean up package file
rm $PACKAGE_FILE

# 6. Test the commands
echo -e "\n${BLUE}🧪 Testing STTS commands...${NC}\n"

# Show version
echo -e "${YELLOW}📌 Version:${NC}"
stts --version

# Test voice announcement
echo -e "\n${YELLOW}🔊 Testing voice:${NC}"
stts test

# Test help
echo -e "\n${YELLOW}❓ Help:${NC}"
stts --help

# Test hook command (should show help)
echo -e "\n${YELLOW}🪝 Hook command:${NC}"
stts hook --help || true

echo -e "\n${GREEN}✅ Local installation test complete!${NC}"
echo -e "${BLUE}💡 To test enable/disable, run:${NC}"
echo -e "  ${YELLOW}stts claude enable${NC}"
echo -e "  ${YELLOW}stts claude disable${NC}"
echo -e "\n${BLUE}💡 To uninstall:${NC}"
echo -e "  ${YELLOW}npm uninstall -g @eh-aye/stts${NC}"