# Portainer Fresh Deploy - Quick Guide

## 🎯 Quick Answer: How to Wipe Data and Re-scrape

### Method 1: Delete Volume in Portainer (Easiest)

**In Portainer UI:**

1. **Stop Stack:** Stacks → `blucatch` → Stop
2. **Delete Volume:** Volumes → `blucatch_data` → Remove
3. **Redeploy:** Stacks → `blucatch` → Deploy the stack

**Result:** Fresh database, full re-scrape on startup

---

### Method 2: Set Environment Variable (No Volume Delete)

**In Portainer Stack Editor:**

Add/update environment variables:

```yaml
services:
    blucatch-scraper:
        environment:
            - FORCE_FRESH=true # ← Add this to wipe data
            - SCRAPE_MODE=full # full, routes-only, or pokemon-only
            - START_POKEMON=1
            - END_POKEMON=151 # Or 1025 for all Pokemon
            - CRON_SCHEDULE=30 3 * * *
```

**Click "Update the stack"**

**Result:** Next deploy will:

-   Backup existing database
-   Clear locations and cache tables
-   Run full scrape with enhanced data

---

### Method 3: Command Line (SSH into server)

```bash
# Stop stack
docker-compose down

# Delete volume
docker volume rm blucatch_data

# Rebuild and start
docker-compose up -d --build

# Monitor scraper
docker logs -f blucatch-scraper
```

---

## 🔧 Environment Variables

| Variable        | Default       | Description                              |
| --------------- | ------------- | ---------------------------------------- |
| `FORCE_FRESH`   | `false`       | If `true`, wipes data on startup         |
| `SCRAPE_MODE`   | `routes-only` | `full`, `routes-only`, or `pokemon-only` |
| `START_POKEMON` | `1`           | First Pokemon ID to scrape               |
| `END_POKEMON`   | `151`         | Last Pokemon ID to scrape                |
| `CRON_SCHEDULE` | `30 3 * * *`  | Daily at 3:30 AM                         |

### Examples:

**Full Gen 1 scrape on every deploy:**

```yaml
environment:
    - FORCE_FRESH=true
    - SCRAPE_MODE=full
    - START_POKEMON=1
    - END_POKEMON=151
```

**Incremental updates (default):**

```yaml
environment:
    - FORCE_FRESH=false
    - SCRAPE_MODE=routes-only
```

**Full Pokédex scrape:**

```yaml
environment:
    - FORCE_FRESH=true
    - SCRAPE_MODE=full
    - START_POKEMON=1
    - END_POKEMON=1025
```

---

## 🔍 Monitor Deployment

### Check Scraper Logs

**In Portainer:**

-   Containers → `blucatch-scraper` → Logs

**Via CLI:**

```bash
# Live logs
docker logs -f blucatch-scraper

# Initial scrape log
docker exec blucatch-scraper cat /var/log/initial-scrape.log

# Cron log
docker exec blucatch-scraper cat /var/log/cron.log
```

### Check Database Stats

```bash
# Enhanced encounters count
docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db "
SELECT COUNT(*) FROM encounters WHERE location_id IS NOT NULL;
"

# Cached routes count
docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db "
SELECT COUNT(*) FROM scraper_cache WHERE status = 'complete';
"

# Last scrape time
docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db "
SELECT datetime(MAX(last_queried_at), 'unixepoch') as last_scrape
FROM scraper_cache;
"
```

---

## 🚀 Recommended Workflow

### For Fresh Production Deploy:

1. **Set in Portainer Stack:**

    ```yaml
    environment:
        - FORCE_FRESH=true
        - SCRAPE_MODE=full
        - START_POKEMON=1
        - END_POKEMON=151 # Gen 1 first
    ```

2. **Deploy and Monitor:**

    ```bash
    docker logs -f blucatch-scraper
    ```

3. **After Initial Scrape Completes:**
    - Change `FORCE_FRESH=false`
    - Change `SCRAPE_MODE=routes-only`
    - Update stack (incremental updates from now on)

### For Weekly Fresh Scrapes:

Keep `FORCE_FRESH=true` permanently, or use the auto-stale detection (>30 days).

---

## 📋 What Happens on Startup

The new `docker-entrypoint.sh` script:

1. ✅ Checks if `FORCE_FRESH=true` → Wipes route data
2. ✅ Checks if database exists → Creates if missing
3. ✅ Enhances schema (locations, cache tables)
4. ✅ Splits concatenated location strings
5. ✅ Checks data age → Auto-triggers full scrape if >30 days
6. ✅ Runs configured scrape mode
7. ✅ Generates API endpoints
8. ✅ Sets up cron for daily updates
9. ✅ Displays stats

---

## ✨ Features

**Smart Initialization:**

-   Detects stale data (>30 days) → Auto full re-scrape
-   Creates database if missing
-   Backs up before wiping

**Flexible Modes:**

-   `full` - Complete scrape (Pokemon pages + routes)
-   `routes-only` - Fast updates (uses cache)
-   `pokemon-only` - Build location database

**Resume Support:**

-   Cache tracks progress
-   Can stop and restart anytime
-   No duplicate work

---

## 🔐 Production Best Practices

### Initial Deploy:

```yaml
FORCE_FRESH=true
SCRAPE_MODE=full
START_POKEMON=1
END_POKEMON=151
```

### After Initial Scrape:

```yaml
FORCE_FRESH=false
SCRAPE_MODE=routes-only # Daily incremental updates
```

### Monthly Full Refresh:

Use auto-stale detection (>30 days) or manually set:

```yaml
FORCE_FRESH=true
SCRAPE_MODE=full
START_POKEMON=1
END_POKEMON=1025 # All Pokemon
```

---

## 📝 Quick Commands

```bash
# Fresh deploy (wipe everything)
docker-compose down && docker volume rm blucatch_data && docker-compose up -d --build

# Check if data is fresh
docker exec blucatch-scraper sqlite3 /app/public/data/pokemon.db "
SELECT
  (SELECT COUNT(*) FROM encounters WHERE location_id IS NOT NULL) as enhanced,
  (SELECT COUNT(*) FROM scraper_cache WHERE status = 'complete') as cached_routes,
  datetime(MAX(last_queried_at), 'unixepoch') as last_scrape
FROM scraper_cache;
"

# Force re-scrape without stopping
docker exec blucatch-scraper node /app/scripts/scraper-main.js --mode full --force

# View progress
docker logs -f blucatch-scraper
```

---

## 🎉 Summary

**To guarantee fresh data on every redeploy:**

Set in Portainer stack:

```yaml
environment:
    - FORCE_FRESH=true
```

**Or delete the volume before redeploying:**

-   Portainer → Volumes → `blucatch_data` → Remove

That's it! The scraper will handle everything else automatically. 🚀
