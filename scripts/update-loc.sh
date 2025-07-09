#!/bin/bash

# Update lines of code statistics
echo "📊 Updating lines of code statistics..."
npm run loc

# Add the updated README.md to the commit if it changed
if git diff --quiet README.md; then
  echo "✅ No changes to lines of code"
else
  echo "📝 Lines of code updated"
  git add README.md
fi