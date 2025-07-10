#!/bin/bash

echo "🧪 Testing STTS Installation..."
echo ""

# 1. Check if built files exist
echo "📦 Checking build output..."
if [ -d "dist" ]; then
    echo "✓ Build directory exists"
else
    echo "✗ Build directory missing - run 'npm run build'"
    exit 1
fi

# 2. Test CLI availability
echo ""
echo "🔧 Testing CLI commands..."
npx stts --version

# 3. List available providers
echo ""
echo "📋 Available TTS providers:"
npx stts list

# 4. Test basic TTS
echo ""
echo "🔊 Testing basic TTS..."
npx stts speak "Hello from STTS test using the default provider"

# 5. Test hook functionality
echo ""
echo "🪝 Testing notification hook..."
echo '{"message": "This is a test notification"}' | npx stts hook

# 6. Check Claude Code integration
echo ""
echo "⚙️  Checking Claude Code integration..."
if [ -f "$HOME/.claude/settings.json" ]; then
    echo "✓ Claude settings file exists"
    if grep -q "stts hook" "$HOME/.claude/settings.json"; then
        echo "✓ TTS hook is installed"
    else
        echo "✗ TTS hook not found in settings"
    fi
else
    echo "✗ Claude settings file not found"
fi

# 7. Test different voices
echo ""
echo "🎭 Testing voice options..."
npx stts speak "Testing male voice with say provider" --gender male --provider say
npx stts speak "Testing female voice with say provider" --gender female --provider say

echo ""
echo "✅ Installation tests complete!"