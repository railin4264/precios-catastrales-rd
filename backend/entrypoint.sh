#!/bin/sh
set -e

echo "⏳ Running database migrations..."
npx prisma db push

echo "✅ Migrations complete."

# Auto-seed if the Zone table is empty (first deploy)
echo "🔍 Checking if database needs seeding..."
ZONE_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.zone.count().then(n => { console.log(n); p.\$disconnect(); }).catch(() => { console.log(0); p.\$disconnect(); });
")

if [ "$ZONE_COUNT" = "0" ]; then
  echo "📦 Database is empty. Running seed..."
  node dist/utils/seed.js
  echo "✅ Seed complete."
else
  echo "✅ Database already has $ZONE_COUNT zones. Skipping seed."
fi

echo "🚀 Starting server..."
exec node dist/index.js
