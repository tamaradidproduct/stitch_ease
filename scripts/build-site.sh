#!/bin/sh
# Assemble only what ships into dist/ (no docs, supabase, scripts, selftests).
set -e
rm -rf dist && mkdir dist
cp index.html sw.js manifest.json CNAME icon-192.png icon-512.png apple-touch-icon.png dist/
cp -R js dist/js
find dist/js -name '*.selftest.js' -delete
[ -d pdf ] && cp -R pdf dist/pdf || true
