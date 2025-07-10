#!/bin/bash

# Manual test script for STTS package
# This script builds the project and enables/disables hooks for testing

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
DIST_DIR="$PROJECT_ROOT/dist"

echo "🔨 STTS Manual Test Script"
echo "========================="
echo

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status
status() {
    echo -e "${GREEN}[STATUS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Step 1: Clean and build the project
status "Cleaning previous build..."
rm -rf "$DIST_DIR"

status "Building project..."
cd "$PROJECT_ROOT"
npm run build

# Verify build
if [ ! -d "$DIST_DIR" ]; then
    error "Build failed - dist directory not created"
fi

if [ ! -f "$DIST_DIR/src/cli/index.js" ]; then
    error "Build failed - CLI entry point not found"
fi

status "Build successful ✅"
echo

# Step 2: Create test commands that use the built files
status "Creating test commands..."

# Create enable test command
cat > "$SCRIPT_DIR/enable.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
TOOL=${1:-claude}

echo "🧪 Testing STTS enable for $TOOL"
echo

# Run the built CLI directly
node "$PROJECT_ROOT/dist/src/cli/index.js" enable "$TOOL" "$@"
EOF

# Create disable test command
cat > "$SCRIPT_DIR/disable.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
TOOL=${1:-claude}

echo "🧪 Testing STTS disable for $TOOL"
echo

# Run the built CLI directly
node "$PROJECT_ROOT/dist/src/cli/index.js" disable "$TOOL"
EOF

# Create status test command
cat > "$SCRIPT_DIR/status.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
TOOL=${1:-claude}

echo "🧪 Checking STTS status for $TOOL"
echo

# Run the built CLI directly
node "$PROJECT_ROOT/dist/src/cli/index.js" status "$TOOL"
EOF

# Make scripts executable
chmod +x "$SCRIPT_DIR/enable.sh"
chmod +x "$SCRIPT_DIR/disable.sh"
chmod +x "$SCRIPT_DIR/status.sh"

status "Test commands created"
echo

# Step 3: Show usage instructions
echo "📋 Usage Instructions"
echo "===================="
echo
echo "Test commands are ready. You can now test the package:"
echo
echo "1. Enable STTS for Claude (default):"
echo "   ./scripts/tests/enable.sh"
echo
echo "2. Enable with options:"
echo "   ./scripts/tests/enable.sh claude --dangerous-commands"
echo "   ./scripts/tests/enable.sh claude --no-audio"
echo
echo "3. Check status:"
echo "   ./scripts/tests/status.sh"
echo
echo "4. Disable STTS:"
echo "   ./scripts/tests/disable.sh"
echo
echo "5. Test with other tools:"
echo "   ./scripts/tests/enable.sh cursor"
echo "   ./scripts/tests/enable.sh windsurf"
echo
echo "📁 Build artifacts location: $DIST_DIR"
echo

# Step 4: Verify hook paths
status "Verifying hook files..."
HOOKS_DIR="$DIST_DIR/src/hooks"

if [ -d "$HOOKS_DIR" ]; then
    echo "Found hooks in: $HOOKS_DIR"
    ls -la "$HOOKS_DIR"/*.js 2>/dev/null || warning "No hook files found in dist/src/hooks"
else
    error "Hooks directory not found in build output"
fi

echo
status "Manual test setup complete! ✅"