#!/usr/bin/env bash
set -euo pipefail

# Github-hosted runners occasionally fail to resolve their Ubuntu apt mirror.
# Try the supported Playwright dependency installer first. If that fails, only
# accept a browser-only fallback after a real headless Chromium launch succeeds.
# This is a CI bootstrap guard, not a test skip.
if timeout --signal=TERM --kill-after=10s 120s npx playwright install --with-deps chromium; then
  echo 'Playwright Chromium and system dependencies installed'
else
  echo '::warning::Playwright apt bootstrap failed or timed out; trying installed runner libraries'
  npx playwright install chromium
fi

node <<'NODE'
const {chromium} = require('@playwright/test');
chromium.launch({headless: true})
  .then(async browser => {
    await browser.close();
    console.log('Chromium headless launch verified');
  })
  .catch(error => {
    console.error('Chromium cannot launch with installed system dependencies:', error);
    process.exitCode = 1;
  });
NODE
