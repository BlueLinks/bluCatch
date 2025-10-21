#!/bin/bash

# Fresh deployment script - wipes all data and rebuilds from scratch

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         FRESH DEPLOYMENT - WIPING ALL DATA               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Confirm action
read -p "⚠️  This will DELETE all existing data. Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "🛑 Stopping containers..."
docker-compose down

echo ""
echo "🗑️  Deleting data volume..."
docker volume rm blucatch_data 2>/dev/null || echo "   (Volume already deleted)"

echo ""
echo "🔨 Rebuilding images..."
docker-compose build --no-cache

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to initialize..."
sleep 10

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                  DEPLOYMENT COMPLETE                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Monitor scraper progress:"
echo "   docker logs -f blucatch-scraper"
echo ""
echo "🔍 Check database status:"
echo "   docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db 'SELECT COUNT(*) FROM encounters WHERE location_id IS NOT NULL'"
echo ""
echo "🌐 Access application:"
echo "   http://localhost:3000"
echo ""

