#!/bin/bash
# Wrapper script for launchd — sets PATH so node/tsx are found
# and ensures we're in the right directory

export PATH="/Users/ericmaloney/.nvm/versions/node/v24.14.0/bin:$PATH"
cd /Users/ericmaloney/hss-internal-content/huntington-cms

/Users/ericmaloney/.nvm/versions/node/v24.14.0/bin/node \
  --env-file=.env.local \
  node_modules/.bin/tsx \
  scripts/unifi-worker.ts >> /tmp/unifi-worker.log 2>&1
