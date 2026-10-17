#!/bin/bash
# Claude Code cloud sessions: install the pinned dev dependencies and point Playwright at the container's Chromium
# (Playwright 1.56.1 is the release built for Chromium build 1194, which /opt/pw-browsers ships).
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi
cd "$CLAUDE_PROJECT_DIR"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund
if [ -z "${CHROMIUM_PATH:-}" ] && [ -x /opt/pw-browsers/chromium ]; then
  echo 'export CHROMIUM_PATH=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi
