#!/bin/sh
# Upload the built site (dist/) to Cloudflare Pages as the production deployment.
# 404.html is GitHub Pages' deep-link workaround. Cloudflare Pages serves index.html for unknown
# paths only when the upload has no 404.html, so a copy of dist/ without it is uploaded (dist/
# itself stays intact for deploy:github-pages).
set -e

PROJECT="skyuiuc"
# The club's Cloudflare account (skyatuiuc@gmail.com), which also holds the skyuiuc.org zone. Pinned so
# a login with access to several accounts can never deploy the site into the wrong one.
export CLOUDFLARE_ACCOUNT_ID="0c437e7b20645e7ab66e472369c3e783"

if [ ! -f dist/index.html ]; then
  echo "dist/ is missing: run npm run build first." >&2
  exit 1
fi

UPLOAD=$(mktemp -d)
trap 'rm -rf "$UPLOAD"' EXIT
cp -R dist/. "$UPLOAD"
rm -f "$UPLOAD/404.html"

npx wrangler pages deploy "$UPLOAD" --project-name="$PROJECT" --branch=main --commit-dirty=true
