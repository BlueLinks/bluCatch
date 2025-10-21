#!/bin/bash
set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         BLUCATCH SCRAPER INITIALIZATION                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

DB_PATH="/app/public/data/pokemon.db"
FORCE_FRESH=${FORCE_FRESH:-true}
SCRAPE_MODE=${SCRAPE_MODE:-full}
START_POKEMON=${START_POKEMON:-1}
END_POKEMON=${END_POKEMON:-151}

# Check if we should force fresh scrape
if [ "$FORCE_FRESH" = "true" ]; then
    echo "🗑️  FORCE_FRESH=true - Wiping existing data..."
    if [ -f "$DB_PATH" ]; then
        # Backup before deleting
        BACKUP_PATH="$DB_PATH.backup-$(date +%s)"
        cp "$DB_PATH" "$BACKUP_PATH"
        echo "   Backed up to: $BACKUP_PATH"
        
        # Delete the entire database file to force fresh creation
        rm -f "$DB_PATH"
        echo "   ✅ Database deleted - will recreate from scratch"
    fi
fi

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "📦 No database found - Creating from scratch..."
    
    # Run migration script which creates the base schema + migrates data
    # This handles both fresh creation and data import from JSON
    echo "   Running database migration/creation..."
    node /app/scripts/migrate-to-sqlite.js
    
    if [ ! -f "$DB_PATH" ]; then
        echo "   ❌ Error: Database was not created!"
        exit 1
    fi
    
    echo "   ✅ Database created with base schema"
fi

# Always ensure enhanced schema exists (safe to run multiple times)
echo "🔧 Ensuring enhanced schema..."
node /app/scripts/enhance-database.js

# Split any concatenated location strings (from legacy data)
echo "🔧 Splitting concatenated location strings..."
node /app/scripts/split-location-strings.js

# Check database age
if [ -f "$DB_PATH" ]; then
    # Get last scrape timestamp
    LAST_SCRAPE=$(sqlite3 "$DB_PATH" "SELECT MAX(last_queried_at) FROM scraper_cache" 2>/dev/null || echo "0")
    CURRENT_TIME=$(date +%s)
    AGE_DAYS=$(( (CURRENT_TIME - LAST_SCRAPE) / 86400 ))
    
    echo "📊 Database Status:"
    echo "   Last scrape: $AGE_DAYS days ago"
    
    ENHANCED_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM encounters WHERE location_id IS NOT NULL" 2>/dev/null || echo "0")
    CACHED_ROUTES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM scraper_cache WHERE status = 'complete'" 2>/dev/null || echo "0")
    
    echo "   Enhanced encounters: $ENHANCED_COUNT"
    echo "   Cached routes: $CACHED_ROUTES"
    echo ""
    
    # Auto-trigger full scrape if data is stale (>30 days)
    if [ "$AGE_DAYS" -gt 30 ]; then
        echo "⚠️  Data is stale (>30 days) - Forcing full re-scrape..."
        SCRAPE_MODE="full"
    fi
fi

# Run initial scrape
echo "🚀 Starting $SCRAPE_MODE scrape (Pokemon $START_POKEMON-$END_POKEMON)..."
echo ""

if [ "$SCRAPE_MODE" = "full" ]; then
    # Full scrape: Pokemon pages + routes
    node /app/scripts/scraper-main.js --mode full --start "$START_POKEMON" --end "$END_POKEMON" 2>&1 | tee /var/log/initial-scrape.log
elif [ "$SCRAPE_MODE" = "routes-only" ]; then
    # Routes only: faster, uses cache
    node /app/scripts/scraper-main.js --mode routes-only 2>&1 | tee /var/log/initial-scrape.log
elif [ "$SCRAPE_MODE" = "pokemon-only" ]; then
    # Pokemon pages only: builds location database
    node /app/scripts/scraper-main.js --mode pokemon-only --start "$START_POKEMON" --end "$END_POKEMON" 2>&1 | tee /var/log/initial-scrape.log
fi

echo ""
echo "✅ Initial scrape completed with exit code: $?"
echo ""

# Generate API endpoints
echo "📊 Generating API endpoints..."
node /app/scripts/generate-api-from-db.js 2>&1 | tee /var/log/api-generation.log
echo "   ✅ API endpoints generated"
echo ""

# Set up cron for scheduled updates
echo "⏰ Setting up cron schedule: ${CRON_SCHEDULE}"
echo "${CRON_SCHEDULE} cd /app && node scripts/scraper-main.js --mode routes-only && node scripts/generate-api-from-db.js >> /var/log/cron.log 2>&1" > /etc/crontabs/root
touch /var/log/cron.log

# Display final stats
echo "📊 Final Database Stats:"
TOTAL_ENCOUNTERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM encounters")
ENHANCED_ENCOUNTERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM encounters WHERE location_id IS NOT NULL")
CACHED_ROUTES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM scraper_cache WHERE status = 'complete'")

echo "   Total encounters: $TOTAL_ENCOUNTERS"
echo "   Enhanced encounters: $ENHANCED_ENCOUNTERS"
echo "   Cached routes: $CACHED_ROUTES"
echo ""

# Start cron in foreground
echo "✅ Starting cron daemon..."
echo "   Scheduled updates: ${CRON_SCHEDULE}"
echo "   View logs: docker logs -f blucatch-scraper"
echo ""
exec crond -f -l 2

