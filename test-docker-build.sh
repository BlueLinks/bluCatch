#!/bin/bash

# Test Docker build locally before pushing

echo "🧪 Testing Docker Scraper Build"
echo "================================"
echo ""

echo "📦 Building scraper image..."
docker-compose build blucatch-scraper

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""

echo "🚀 Starting test container..."
docker-compose up -d blucatch-scraper

echo ""
echo "⏳ Waiting for initialization..."
sleep 5

echo ""
echo "📋 Checking logs..."
docker logs blucatch-scraper | head -50

echo ""
echo "📊 Checking database..."
docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db "
SELECT 
  (SELECT COUNT(*) FROM encounters) as total_encounters,
  (SELECT COUNT(*) FROM encounters WHERE location_id IS NOT NULL) as enhanced_encounters,
  (SELECT COUNT(*) FROM locations) as total_locations,
  (SELECT COUNT(*) FROM scraper_cache WHERE status = 'complete') as cached_routes;
"

echo ""
echo "🛑 Stopping test container..."
docker-compose down

echo ""
echo "✅ Test complete!"

