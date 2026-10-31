#!/bin/sh
# Push the Apps Script relay and point EVERY live (non-HEAD) deployment at the new version, so no
# older deployment URL keeps serving stale code. Deployment IDs are read from `clasp deployments`
# (never stored in this public repo).
set -e

DESC="Relay & Campaign Engine v4.5.0"

npx clasp push
VERSION=$(npx clasp version "$DESC" | grep -io 'version [0-9][0-9]*' | grep -o '[0-9][0-9]*' | tail -1)
if [ -z "$VERSION" ]; then
  echo "Could not read the new version number from clasp; nothing was redeployed." >&2
  exit 1
fi

npx clasp deployments | grep -v '@HEAD' | grep -o 'AKfyc[A-Za-z0-9_-]*' | while read -r id; do
  npx clasp deploy -V "$VERSION" -i "$id" -d "$DESC"
done

echo "Deployments now:"
npx clasp deployments
