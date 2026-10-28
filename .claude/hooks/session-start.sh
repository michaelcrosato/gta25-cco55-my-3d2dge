#!/bin/bash
# Claude Code cloud sessions: install the pinned dev dependencies and point Playwright at the container's Chromium
# (Playwright 1.56.1 is the release built for Chromium build 1194; /opt/pw-browsers ships build 1243 now, which it
# drives as well: docs/DECISIONS.md D32).
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi
cd "$CLAUDE_PROJECT_DIR"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund
if [ -z "${CHROMIUM_PATH:-}" ] && [ -x /opt/pw-browsers/chromium ]; then
  echo 'export CHROMIUM_PATH=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi
