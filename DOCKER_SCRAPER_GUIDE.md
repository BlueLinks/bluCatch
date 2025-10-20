# Docker Scraper Guide

## Overview

The scraper service automatically updates your Pokémon data from Bulbapedia when you start Docker Compose.

## How It Works

1. **Startup Scrape (Auto-Resume)**: When you run `docker-compose up`, the scraper runs immediately and **automatically resumes from where it left off** (using `public/data/.bulbapedia-progress.json`)
2. **Scheduled Updates (Full Refresh)**: The cron job runs on schedule (default: daily at 3:30 AM) and does a **full refresh starting from the beginning** (uses `--fresh --replace` flags)
3. **Shared Data**: The scraped data is shared with the main app via a Docker volume

**Note**: The scraper doesn't need a `--resume` flag - it automatically resumes by default unless you use `--fresh`

## Usage

### Start the services

```bash
docker-compose up -d
```

### View scraper logs (live)

```bash
docker logs -f blucatch-scraper
```

### View initial scrape results

```bash
docker exec blucatch-scraper cat /var/log/initial-scrape.log
```

### View cron job logs

```bash
docker exec blucatch-scraper cat /var/log/cron.log
```

### Rebuild after changes

```bash
docker-compose down
docker-compose build --no-cache blucatch-scraper
docker-compose up -d
```

## Configuration

### Change the Schedule

Edit `docker-compose.yml` and modify the `CRON_SCHEDULE` environment variable:

```yaml
environment:
    - CRON_SCHEDULE=0 2 * * * # Every day at 2:00 AM
    - CRON_SCHEDULE=0 */6 * * * # Every 6 hours
    - CRON_SCHEDULE=0 0 * * 0 # Every Sunday at midnight
```

### Trigger Manual Scrape

**Resume from last position (automatic):**
```bash
docker exec blucatch-scraper node /app/scripts/scrape-bulbapedia.js
```

**Full refresh from beginning:**
```bash
docker exec blucatch-scraper node /app/scripts/scrape-bulbapedia.js --fresh --replace
```

**Process specific range:**
```bash
docker exec blucatch-scraper node /app/scripts/scrape-bulbapedia.js --range=1-151
```

## Troubleshooting

### Check if scraper is running

```bash
docker ps | grep scraper
```

### View all logs

```bash
docker logs blucatch-scraper
```

### Restart scraper only

```bash
docker-compose restart blucatch-scraper
```

### Enter scraper container

```bash
docker exec -it blucatch-scraper sh
```

### Check cron jobs

```bash
docker exec blucatch-scraper crontab -l
```

## Notes

-   **Startup behavior**: Automatically resumes from last position (reads `public/data/.bulbapedia-progress.json`)
-   **Scheduled behavior**: Full refresh from beginning (uses `--fresh --replace` to clear progress and data)
-   **No --resume flag needed**: The scraper auto-resumes by default unless you use `--fresh`
-   A full scrape takes 30-60 minutes for all 1025 Pokémon
-   The scraper uses simple HTTP requests (reliable and works well)
-   Data is persisted in the `data` Docker volume
-   The main app will automatically use the updated data
-   Scraper restarts automatically if it crashes (`restart: unless-stopped`)
-   Progress file is saved in the shared `data` volume, so resume works across container restarts

## Logs Location

-   **Initial scrape**: `/var/log/initial-scrape.log`
-   **Cron jobs**: `/var/log/cron.log`
-   **Container logs**: `docker logs blucatch-scraper`
