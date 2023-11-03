#!/bin/bash

# Extract the latest tag name
LATEST_TAG=$(git describe --tags --abbrev=0)

# Extract the base version and pre-release identifier from the latest tag
if [[ $LATEST_TAG =~ ([0-9]+\.[0-9]+\.[0-9]+)(-(alpha|beta|rc)\.([0-9]+))? ]]; then
    BASE_VERSION=${BASH_REMATCH[1]}
    PRE_ID=${BASH_REMATCH[3]}
    PRE_NUM=${BASH_REMATCH[4]}
else
    echo "Error: Unable to parse the latest tag name." >&2
    exit 1
fi

# Determine the dev iteration number based on the commit count since the last tag
DEV_ITERATION=$(git rev-list ${LATEST_TAG}..HEAD --count)

# Construct the new version string
if [[ -n $PRE_ID ]]; then
    # If there is a pre-release identifier (alpha, beta, rc)
    NEW_VERSION="${BASE_VERSION}-${PRE_ID}.${PRE_NUM}-dev.${DEV_ITERATION}"
else
    # If there is no pre-release identifier
    NEW_VERSION="${BASE_VERSION}-dev.${DEV_ITERATION}"
fi

# Output the new version string
echo "VERSION=$NEW_VERSION" >> $GITHUB_ENV
