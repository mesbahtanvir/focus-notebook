#!/usr/bin/env bash
set -euo pipefail

log() {
  printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

log "Installing dependencies"
npm ci

log "Running lint checks"
npm run lint

log "Running unit tests"
npm run test -- --runInBand

log "Building production bundle"
npm run build

if [ "${DEPLOY_COMMAND:-}" != "" ]; then
  log "Running deploy command: $DEPLOY_COMMAND"
  eval "$DEPLOY_COMMAND"
else
  log "Skipping deploy step (set DEPLOY_COMMAND to enable)."
fi

log "All validation steps completed successfully."
