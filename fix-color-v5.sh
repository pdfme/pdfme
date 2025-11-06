#!/bin/bash

# Script to fix color v5 upgrade PRs (#1217, #1208)
# Issue: color v5 includes built-in types, @types/color conflicts

set -e

echo "Fixing color v5 upgrade..."

# Fix packages/pdf-lib (PR #1217)
if [ -f "packages/pdf-lib/package.json" ]; then
    echo "Processing packages/pdf-lib..."
    cd packages/pdf-lib

    # Remove @types/color from package.json
    if grep -q '"@types/color"' package.json; then
        echo "Removing @types/color from devDependencies..."

        # Create backup
        cp package.json package.json.backup

        # Remove @types/color line
        sed -i '/"@types\/color"/d' package.json

        # Clean up any trailing commas
        sed -i 's/,\s*}/}/g' package.json

        # Update lockfile
        npm install

        echo "✓ Fixed packages/pdf-lib"
    else
        echo "⚠ @types/color not found in packages/pdf-lib/package.json"
    fi

    cd ../..
fi

# Fix packages/common if needed (PR #1208)
if [ -f "packages/common/package.json" ]; then
    echo "Processing packages/common..."
    cd packages/common

    if grep -q '"@types/color"' package.json; then
        echo "Removing @types/color from devDependencies..."

        cp package.json package.json.backup
        sed -i '/"@types\/color"/d' package.json
        sed -i 's/,\s*}/}/g' package.json

        npm install

        echo "✓ Fixed packages/common"
    else
        echo "⚠ @types/color not found in packages/common/package.json (may not be needed)"
    fi

    cd ../..
fi

echo ""
echo "✅ Fix complete!"
echo ""
echo "Next steps:"
echo "1. Review the changes in packages/*/package.json"
echo "2. Run 'npm run build' to verify no type errors"
echo "3. Run 'npm run test' to verify all tests pass"
echo "4. Commit and push the changes"
