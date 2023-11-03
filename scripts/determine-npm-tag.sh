#!/bin/bash

# Get the tag from the GITHUB_REF environment variable
VERSION=${GITHUB_REF#refs/tags/}

# Determine the NPM tag based on the GitHub tag
if [[ $VERSION == *"-alpha"* ]]; then
  echo "NPM_TAG=next" >> $GITHUB_ENV
elif [[ $VERSION == *"-beta"* ]]; then
  echo "NPM_TAG=next" >> $GITHUB_ENV
elif [[ $VERSION == *"-rc"* ]]; then
  echo "NPM_TAG=next" >> $GITHUB_ENV
else
  echo "NPM_TAG=latest" >> $GITHUB_ENV
fi
