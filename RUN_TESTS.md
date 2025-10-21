# 🧪 Run Tests Now

Quick commands to test the route-based scraper:

## Step 1: Run Test Workflow

```bash
cd /Users/bluelinks/Developer/web
./scripts/test-workflow.sh
```

This will:

-   ✅ Backup database
-   ✅ Clear test tables
-   ✅ Scrape 5 Pokemon to discover locations
-   ✅ Scrape discovered routes
-   ✅ Show statistics and sample data

**Time:** ~1-2 minutes

## Step 2: Generate API Endpoints

```bash
node scripts/generate-api-from-db.js
```

This creates JSON files in `/public/api/dex/` with enhanced data.

**Time:** ~5-10 seconds

## Step 3: Test API with curl

Start dev server:

```bash
npm run dev
```

In another terminal, test endpoints:

```bash
./scripts/test-api-endpoints.sh
```

Or manually:

```bash
# Check if API is working
curl http://localhost:5173/api/dex/1.json | jq .

# Check Caterpie (has dual-slot data)
curl http://localhost:5173/api/dex/10.json | jq '.games[0].locations[0]'
```

## Expected Output

You should see:

-   Location names (e.g., "Viridian Forest", "Route 25")
-   Enhanced fields: `area`, `rate`, `levels`
-   Special requirements: `specialRequirements: { dualSlot: "firered" }`

## Quick Verification

```bash
# Check what got scraped
sqlite3 public/data/pokemon.db "SELECT COUNT(*) FROM locations;"
sqlite3 public/data/pokemon.db "SELECT COUNT(*) FROM scraper_cache WHERE status = 'complete';"

# See sample data
sqlite3 -header -column public/data/pokemon.db "
SELECT p.name, g.name as game, l.name as location, e.encounter_rate, e.level_range
FROM encounters e
JOIN pokemon p ON e.pokemon_id = p.id
JOIN games g ON e.game_id = g.id
LEFT JOIN locations l ON e.location_id = l.id
WHERE e.location_id IS NOT NULL
LIMIT 5;"
```

## If Everything Works

You can run a full scrape:

```bash
# Generation 1
node scripts/scraper-main.js --mode full --start 1 --end 151

# Then regenerate APIs
node scripts/generate-api-from-db.js
```

## Restore if Needed

```bash
# Find backup
ls -lt public/data/pokemon.db.backup*

# Restore
cp public/data/pokemon.db.backup-test-XXXXX public/data/pokemon.db
```

---

**Ready to test?** Run: `./scripts/test-workflow.sh` 🚀
