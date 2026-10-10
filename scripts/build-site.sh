#!/bin/sh
# Assemble only what ships into dist/ (no docs, supabase, scripts, selftests).
set -e
rm -rf dist && mkdir dist
cp index.html sw.js manifest.json CNAME icon-192.png icon-512.png apple-touch-icon.png dist/
cp -R js dist/js
cp -R css dist/css
find dist/js -name '*.selftest.js' -delete
[ -d pdf ] && cp -R pdf dist/pdf || true
# Fail the build if the page links a local stylesheet that did not ship.
for ref in $(grep -o 'href="[^":]*\.css"' index.html | sed 's/.*="//;s/"$//'); do
  [ -f "dist/$ref" ] || { echo "build: index.html references $ref but it is not in dist/" >&2; exit 1; }
done
