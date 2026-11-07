#!/bin/sh
# Upload the built site (dist/) to Cloudflare Pages as the production deployment.
# 404.html is GitHub Pages' deep-link workaround. Cloudflare Pages serves index.html for unknown
# paths only when the upload has no 404.html, so a copy of dist/ without it is uploaded (dist/
# itself stays intact for deploy:github-pages).
set -e

PROJECT="skyuiuc"

if [ ! -f dist/index.html ]; then
  echo "dist/ is missing: run npm run build first." >&2
  exit 1
fi

UPLOAD=$(mktemp -d)
trap 'rm -rf "$UPLOAD"' EXIT
cp -R dist/. "$UPLOAD"
rm -f "$UPLOAD/404.html"

npx wrangler pages deploy "$UPLOAD" --project-name="$PROJECT" --branch=main --commit-dirty=true
