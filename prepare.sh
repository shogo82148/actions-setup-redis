#!/bin/bash

set -uex

CURRENT=$(cd "$(dirname "$0")" && pwd)
VERSION=$1
MAJOR=$(echo "$VERSION" | cut -d. -f1)
MINOR=$(echo "$VERSION" | cut -d. -f2)
PATCH=$(echo "$VERSION" | cut -d. -f3)
WORKING=$CURRENT/.working

: clone
ORIGIN=$(git remote get-url origin)
rm -rf "$WORKING"
git clone "$ORIGIN" "$WORKING"
cd "$WORKING"

git checkout -b "releases/v$MAJOR" "origin/releases/v$MAJOR" || git checkout -b "releases/v$MAJOR" main
git merge --no-ff -X theirs -m "Merge branch 'main' into releases/v$MAJOR" main || true

: build the action
git checkout main -- package.json package-lock.json
jq ".version=\"$MAJOR.$MINOR.$PATCH\"" < package.json > .tmp.json
mv .tmp.json package.json
jq ".version=\"$MAJOR.$MINOR.$PATCH\"" < package-lock.json > .tmp.json
mv .tmp.json package-lock.json
npm ci
npm run build

: remove development packages from node_modules
npm prune --production
perl -ne 'print unless m(^/node_modules/|/lib/$)' -i .gitignore

: publish to GitHub
git add .
git commit -m "bump up to v$MAJOR.$MINOR.$PATCH" || true
git push origin "releases/v$MAJOR"
gh release create "v$MAJOR.$MINOR.$PATCH" \
    --draft --target "$(git rev-parse HEAD)" --title "v$MAJOR.$MINOR.$PATCH" --notes ""

cd "$CURRENT"
rm -rf "$WORKING"
