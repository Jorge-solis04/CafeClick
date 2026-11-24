#!/bin/sh
set -e

node dist/database/migrate.js

if [ "$SEED_ON_START" = "true" ]; then
  node dist/database/seed.js

  if [ -n "$DEMO_CUSTOMER_PASSWORD" ] && [ -n "$DEMO_KITCHEN_PASSWORD" ]; then
    node dist/database/seed-accounts.js
  else
    echo "Skipping demo accounts: DEMO_CUSTOMER_PASSWORD and DEMO_KITCHEN_PASSWORD are not set"
  fi
fi

exec node dist/server.js
