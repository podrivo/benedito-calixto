#!/usr/bin/env bash
# Netlify build: strips development-only blocks and the files the public site doesn't need.
# Runs on Netlify's fresh clone; don't run it in your working copy (it edits files in place).
set -euo pipefail
cd "$(dirname "$0")/.."

perl -0pi -e 's{<!-- dev:start -->.*?<!-- dev:end -->\n?|/\* dev:start \*/.*?/\* dev:end \*/\n?}{}gs' index.html script.js

if grep -q 'dev:start\|atencao' index.html script.js; then
  echo "build-prod: development-only content still present" >&2
  exit 1
fi

rm -rf research tools .venv
