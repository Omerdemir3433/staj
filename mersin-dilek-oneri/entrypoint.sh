#!/bin/sh
set -e

echo "Veritabani shemasi senkronize ediliyor..."
node node_modules/prisma/build/index.js db push --accept-data-loss

echo "Seed verileri yukleniyor..."
node prisma/seed.js

echo "Uygulama baslatiliyor..."
exec node server.js
