#!/bin/sh
# Pre-push hook: build check only (Playwright too slow for local hook)
# CI workflow runs full Playwright suite after push

echo "🔨 Running build check before push..."
cd "$(git rev-parse --show-toplevel)"

output=$(npm run build 2>&1)
exit_code=$?

if [ $exit_code -ne 0 ]; then
  echo "$output"
  echo "❌ Build failed — push aborted."
  exit 1
fi

echo "✅ Build passed — pushing."
exit 0
