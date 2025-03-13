#!/bin/bash

# Script to make the repository compatible with pnpm
# Usage: ./scripts/pnpm-compatibility.sh [--restore]

RESTORE=false
if [ "$1" == "--restore" ]; then
  RESTORE=true
fi

# Create or remove pnpm-workspace.yaml
if [ "$RESTORE" == "true" ]; then
  if [ -f "pnpm-workspace.yaml" ]; then
    rm pnpm-workspace.yaml
    echo "Removed pnpm-workspace.yaml"
  fi
else
  echo "packages:" > pnpm-workspace.yaml
  echo "  - 'packages/*'" >> pnpm-workspace.yaml
  echo "Created pnpm-workspace.yaml"
fi

# Function to process package.json files
process_package_json() {
  local file=$1
  local temp_file="${file}.tmp"
  
  if [ "$RESTORE" == "true" ]; then
    # Restore for npm compatibility
    sed 's/"workspace:\*"/"*"/g' "$file" > "$temp_file"
    mv "$temp_file" "$file"
    echo "Restored $file for npm compatibility"
  else
    # Update for pnpm compatibility
    jq '
      walk(
        if type == "object" then
          with_entries(
            if .key == "dependencies" or .key == "devDependencies" or .key == "peerDependencies" then
              .value = (.value | with_entries(
                if .key | startswith("@pdfme/") and (.value == "*" or .value == "latest") then
                  .value = "workspace:*"
                else
                  .
                end
              ))
            else
              .
            end
          )
        else
          .
        end
      )
    ' "$file" > "$temp_file"
    mv "$temp_file" "$file"
    echo "Updated $file for pnpm compatibility"
  fi
}

# Update or restore package.json files
for pkg in packages/*/package.json; do
  process_package_json "$pkg"
done

# Update or restore root package.json
if [ "$RESTORE" == "true" ]; then
  # Restore postinstall script if it was removed
  jq '
    if .scripts.postinstall == null then
      .scripts = (.scripts + {postinstall: "./scripts/link-workspaces.sh"})
    else
      .
    end
  ' package.json > package.json.tmp
  mv package.json.tmp package.json
  echo "Restored postinstall script in package.json"
else
  # Remove postinstall script
  jq 'del(.scripts.postinstall)' package.json > package.json.tmp
  mv package.json.tmp package.json
  echo "Removed postinstall script from package.json"
fi

echo "Done! Repository is now compatible with $([ "$RESTORE" == "true" ] && echo "npm" || echo "pnpm")"
