#!/bin/bash

# Fix go.mod dependencies
# Run this script to update go.mod after adding new code files

set -e

echo "🔧 Fixing Go module dependencies..."
echo ""

cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    echo "❌ Error: go.mod not found. Are you in the backend directory?"
    exit 1
fi

echo "📦 Running go mod tidy..."
go mod tidy

echo "✅ Verifying dependencies..."
go mod verify

echo "🔍 Checking for changes..."
if git diff --quiet go.mod go.sum; then
    echo "✅ No changes needed - go.mod is up to date"
else
    echo "📝 Changes detected:"
    git diff --stat go.mod go.sum
    echo ""
    echo "✅ go.mod and go.sum have been updated"
    echo ""
    echo "Next steps:"
    echo "  1. Review the changes: git diff go.mod go.sum"
    echo "  2. Commit the changes: git add go.mod go.sum && git commit -m 'chore: update go.mod dependencies'"
    echo "  3. Push to GitHub: git push"
fi

echo ""
echo "🎉 Done!"
