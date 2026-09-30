#!/usr/bin/env bash
# Netlify build: removes the files the public site doesn't need.
# Runs on Netlify's fresh clone; don't run it in your working copy (it deletes files).
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf research tools .venv
