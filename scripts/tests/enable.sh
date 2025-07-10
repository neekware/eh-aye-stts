#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
TOOL=${1:-claude}

echo "🧪 Testing STTS enable for $TOOL"
echo

# Run the built CLI directly
node "$PROJECT_ROOT/dist/src/cli/index.js" enable "$TOOL" "$@"
