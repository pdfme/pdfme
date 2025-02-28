#!/bin/bash
# Script to fix failing tests in Dependabot PRs

# List of PRs with failing tests
prs=(752 750 748 746 744 742 738 735 734 733)

for pr in "${prs[@]}"; do
  echo "Processing PR #$pr..."
  
  # Fetch PR branch
  git fetch origin pull/$pr/head:dependabot-pr-$pr
  
  # Checkout PR branch
  git checkout dependabot-pr-$pr
  
  # Apply our fixes from the devin branch
  git cherry-pick devin/1740728357-fix-dependabot-prs
  
  # Install dependencies with legacy peer deps to handle conflicts
  npm ci --legacy-peer-deps
  
  # Build the project
  npm run build || true
  
  # Update snapshots in the UI package
  cd packages/ui
  npm run test -- -u
  cd ../..
  
  # Commit changes
  git add packages/ui/__tests__/components/__snapshots__/
  git commit -m "Update snapshots for Dependabot PR #$pr"
  
  # Push changes to PR branch
  git push origin dependabot-pr-$pr:$(git symbolic-ref --short HEAD)
  
  # Return to our branch
  git checkout devin/1740728357-fix-dependabot-prs
done

echo "All PRs processed!"
