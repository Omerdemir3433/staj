#!/bin/sh
set -e

echo "Veritabani shemasi senkronize ediliyor..."
npx prisma db push --skip-generate --accept-data-loss

echo "Seed verileri yukleniyor..."
node prisma/seed.js

echo "Uygulama baslatiliyor..."
exec node server.js
