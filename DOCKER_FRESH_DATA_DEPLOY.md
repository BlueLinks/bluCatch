# Docker Fresh Data Deployment Guide

## How to Wipe Data and Re-scrape on Portainer

### Option 1: Delete Volume and Redeploy (Recommended)

This completely wipes all data and starts fresh.

#### In Portainer UI:

1. **Stop the Stack:**

    - Go to Stacks → `blucatch`
    - Click "Stop"
    - Wait for both containers to stop

2. **Delete the Volume:**

    - Go to Volumes
    - Find `blucatch_data` volume
    - Click the checkbox next to it
    - Click "Remove" button
    - Confirm deletion

3. **Redeploy the Stack:**

    - Go back to Stacks → `blucatch`
    - Click "Update the stack"
    - Enable "Re-pull image and redeploy"
    - Click "Update"

4. **Monitor Initial Scrape:**

    ```bash
    # Check scraper logs
    docker logs -f blucatch-scraper

    # Or in Portainer:
    # Containers → blucatch-scraper → Logs
    ```

#### Via Command Line:

```bash
# Stop and remove stack
docker-compose down

# Delete the volume
docker volume rm blucatch_data

# Rebuild and start
docker-compose up -d --build

# Monitor progress
docker logs -f blucatch-scraper
```

### Option 2: Clear Database Without Deleting Volume

Keep the volume but reset the database.

```bash
# Connect to scraper container
docker exec -it blucatch-scraper sh

# Inside container:
cd /app

# Backup current database (optional)
cp public/data/pokemon.db public/data/pokemon.db.backup-$(date +%s)

# Delete database
rm public/data/pokemon.db

# Clear cache and locations
sqlite3 public/data/pokemon.db "
DELETE FROM locations;
DELETE FROM scraper_cache;
DELETE FROM encounters WHERE location_id IS NOT NULL;
"

# Exit container
exit

# Restart scraper to trigger re-scrape
docker restart blucatch-scraper
```

### Option 3: Selective Re-scrape (Keep Most Data)

Clear only the enhanced route data, keep basic encounter data.

```bash
docker exec -it blucatch-scraper sh

# Inside container:
sqlite3 /app/public/data/pokemon.db "
DELETE FROM locations;
DELETE FROM scraper_cache;
UPDATE encounters SET
  location_id = NULL,
  encounter_area = NULL,
  encounter_rate = NULL,
  level_range = NULL,
  time_of_day = NULL,
  season = NULL
WHERE location_id IS NOT NULL;
"

exit

# Restart scraper
docker restart blucatch-scraper
```

## Automated Fresh Deploy Script

### Create this script: `deploy-fresh.sh`

```bash
#!/bin/bash

echo "🔄 Fresh Deployment - Wiping all data"
echo "========================================"

# Stop containers
echo "Stopping containers..."
docker-compose down

# Delete volume (all data)
echo "Deleting data volume..."
docker volume rm blucatch_data 2>/dev/null || echo "Volume already deleted"

# Rebuild images
echo "Rebuilding images..."
docker-compose build --no-cache

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for services to start
echo "Waiting for services to initialize..."
sleep 10

# Show logs
echo "========================================"
echo "✅ Deployment complete!"
echo ""
echo "Monitor scraper progress:"
echo "  docker logs -f blucatch-scraper"
echo ""
echo "Check database:"
echo "  docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db 'SELECT COUNT(*) FROM encounters'"
echo ""
```

### Make it executable:

```bash
chmod +x deploy-fresh.sh
```

### Run it:

```bash
./deploy-fresh.sh
```

## Update Dockerfile.scraper for Fresh Scrapes

Add to `Dockerfile.scraper`:

```dockerfile
# Add environment variable to control scraping mode
ENV SCRAPE_MODE=full
ENV START_POKEMON=1
ENV END_POKEMON=151

# Entrypoint script that checks for fresh deploy
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
```

Create `scripts/docker-entrypoint.sh`:

```bash
#!/bin/sh

# Check if database exists
if [ ! -f /app/public/data/pokemon.db ]; then
    echo "📦 No database found - creating fresh database"

    # Create database with schema
    node scripts/enhance-database.js

    # Run initial full scrape
    echo "🚀 Starting initial scrape..."
    node scripts/scraper-main.js --mode full --start $START_POKEMON --end $END_POKEMON

    # Generate API endpoints
    echo "📊 Generating API endpoints..."
    node scripts/generate-api-from-db.js
else
    echo "✅ Database exists - running incremental updates"

    # Run routes-only mode (faster, uses cache)
    node scripts/scraper-main.js --mode routes-only

    # Regenerate APIs
    node scripts/generate-api-from-db.js
fi

# Keep container running for cron jobs
exec "$@"
```

## Portainer Environment Variables

In Portainer, you can set environment variables to control scraping:

**Stack environment variables:**

```yaml
services:
    blucatch-scraper:
        environment:
            - SCRAPE_MODE=full # or "routes-only"
            - START_POKEMON=1
            - END_POKEMON=1025 # Full Pokédex
            - FORCE_FRESH=true # Set to wipe on startup
```

## Verification After Deploy

### Check if data is fresh:

```bash
# Check database timestamp
docker exec blucatch-scraper stat /app/public/data/pokemon.db

# Check enhanced encounters count
docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db "
SELECT COUNT(*) as enhanced FROM encounters WHERE location_id IS NOT NULL;
"

# Check scraper cache
docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db "
SELECT COUNT(*) as cached_routes FROM scraper_cache WHERE status = 'complete';
"

# Check last scrape time
docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db "
SELECT MAX(last_queried_at) as last_scrape FROM scraper_cache;
"
```

### View scraper logs:

```bash
# In Portainer: Containers → blucatch-scraper → Logs

# Or via CLI:
docker logs blucatch-scraper

# Follow live:
docker logs -f blucatch-scraper --tail 100
```

## Best Practice: Scheduled Fresh Scrapes

Add to `docker-compose.yml`:

```yaml
services:
    blucatch-scraper:
        environment:
            - WEEKLY_FULL_SCRAPE=true # Run full scrape weekly
            - DAILY_ROUTE_UPDATE=true # Update routes daily
```

## Quick Reference

| Task                        | Command                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Fresh deploy (wipe all)** | `docker-compose down && docker volume rm blucatch_data && docker-compose up -d --build`                             |
| **Just rebuild**            | `docker-compose up -d --build`                                                                                      |
| **Clear cache only**        | `docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db "DELETE FROM scraper_cache"`                      |
| **Check data age**          | `docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db "SELECT MAX(last_queried_at) FROM scraper_cache"` |
| **Manual re-scrape**        | `docker exec blucatch-scraper node scripts/scraper-main.js --mode full --force`                                     |

## Portainer Webhook for Fresh Deploy

In Portainer, you can create a webhook that:

1. Pulls latest code
2. Deletes volume
3. Rebuilds
4. Redeploys

**Setup:**

-   Stacks → blucatch → Webhooks
-   Create webhook
-   Use it to trigger fresh deploys

## Summary

**To guarantee fresh data on redeploy:**

1. **Via Portainer UI:** Delete `blucatch_data` volume before redeploying
2. **Via CLI:** `docker volume rm blucatch_data && docker-compose up -d --build`
3. **Automated:** Add entrypoint script that checks database age and re-scrapes if stale

**Files to create/update:**

-   `scripts/docker-entrypoint.sh` - Smart initialization
-   `deploy-fresh.sh` - One-command fresh deploy
-   Update `Dockerfile.scraper` - Use entrypoint script
