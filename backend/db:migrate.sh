#!/bin/bash
# Run DB migrations against $DATABASE_URL
# Usage: ./db:migrate.sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set"
  exit 1
fi

echo "🔄 Running migrations..."
psql "$DATABASE_URL" -f src/schema.sql
echo "✅ Migrations complete"
