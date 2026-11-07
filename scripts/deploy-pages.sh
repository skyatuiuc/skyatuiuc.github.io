#!/bin/sh
# Upload the built site (dist/) to Cloudflare Pages as the production deployment.
# Pages serves index.html for unknown paths (client-side routes such as /admin/settings and campaign
# links such as /demo) only while the upload has no top-level 404.html, so one is refused here.
set -e

PROJECT="skyuiuc"
# The club's Cloudflare account (skyatuiuc@gmail.com), which also holds the skyuiuc.org zone. Pinned so
# a login with access to several accounts can never deploy the site into the wrong one.
export CLOUDFLARE_ACCOUNT_ID="0c437e7b20645e7ab66e472369c3e783"

if [ ! -f dist/index.html ]; then
  echo "dist/ is missing: run npm run build first." >&2
  exit 1
fi
if [ -f dist/404.html ]; then
  echo "dist/404.html would turn off Cloudflare Pages' fallback to index.html and break deep links." >&2
  echo "Remove it from public/ and rebuild." >&2
  exit 1
fi

npx wrangler pages deploy dist --project-name="$PROJECT" --branch=main --commit-dirty=true
