#!/usr/bin/env bash
set -euo pipefail
# This runs only inside a disposable Linux container fed an immutable archive.
export CI=true
npm install --global npm@10.9.3 --ignore-scripts
[[ "$(npm --version)" == '10.9.3' ]]
npm ci --ignore-scripts
npm run lint
npm run release:check
npm run release:self-test
npm run test:scheduled-release
npm run content:check-assets
npm run security:test
npm run test:loop-push
npm run test:local-required-gate
npm run test:update-site
npm run test:content
npm run test:model-watch
npm run test:space-background
npm run test:newsletter
npm run test:mobile-contract
npm run test:flows-contract
npm run test:tools-matrix
npm run build
