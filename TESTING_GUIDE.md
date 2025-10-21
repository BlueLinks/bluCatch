# Testing Guide - Route-Based Scraper

## Quick Start

### Option 1: Automated Test Workflow (Recommended)

Run the complete test workflow that will:

1. Backup your database
2. Clear test tables
3. Run a small scrape (5 Pokemon)
4. Show statistics and sample data

```bash
./scripts/test-workflow.sh
```

**Note:** Requires network access for scraping Bulbapedia

### Option 2: Manual Step-by-Step

```bash
# 1. Backup database
cp public/data/pokemon.db public/data/pokemon.db.backup

# 2. Clear test tables (optional - keeps existing encounters)
sqlite3 public/data/pokemon.db "DELETE FROM locations; DELETE FROM scraper_cache;"

# 3. Test scrape (discover locations from 5 Pokemon)
node scripts/scraper-main.js --mode pokemon-only --start 1 --end 5

# 4. Scrape discovered routes
node scripts/scraper-main.js --mode routes-only

# 5. Check results
node scripts/test-scraper.js
```

## Testing API Endpoints

### Step 1: Generate API Endpoints from Database

```bash
node scripts/generate-api-from-db.js
```

This creates `/api/dex/*.json` files with enhanced data.

### Step 2: Start Dev Server

```bash
npm run dev
```

### Step 3: Test with curl

In a new terminal:

```bash
# Automated tests
./scripts/test-api-endpoints.sh

# Or manual tests:
curl http://localhost:5173/api/dex.json | jq '.pokemon | length'
curl http://localhost:5173/api/dex/1.json | jq '.'
curl http://localhost:5173/api/dex/10.json | jq '.games[0].locations[0]'
```

### Expected Enhanced Data Format

```json
{
	"id": 10,
	"name": "Caterpie",
	"sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10.png",
	"generation": 1,
	"games": [
		{
			"id": "platinum",
			"name": "Pokémon Platinum",
			"generation": 4,
			"locations": [
				{
					"location": "Route 204, Eterna Forest",
					"locationName": "Sinnoh Route 204",
					"region": "sinnoh",
					"locationType": "route",
					"area": "grass",
					"rate": "8%",
					"levels": "5-6",
					"specialRequirements": {
						"dualSlot": "firered"
					}
				}
			]
		}
	]
}
```

## Verify Enhanced Data

### Check Database Directly

```bash
sqlite3 public/data/pokemon.db

# Check locations
SELECT COUNT(*) FROM locations;
SELECT * FROM locations LIMIT 5;

# Check enhanced encounters
SELECT COUNT(*) FROM encounters WHERE location_id IS NOT NULL;

# Sample enhanced encounter
SELECT
  p.name as pokemon,
  g.name as game,
  l.name as location,
  e.encounter_area,
  e.encounter_rate,
  e.level_range,
  e.special_requirements
FROM encounters e
JOIN pokemon p ON e.pokemon_id = p.id
JOIN games g ON e.game_id = g.id
LEFT JOIN locations l ON e.location_id = l.id
WHERE e.location_id IS NOT NULL
LIMIT 5;
```

### Check Cache Status

```bash
sqlite3 public/data/pokemon.db "SELECT * FROM scraper_cache;"
```

## Expected Results

### After Pokemon Scrape (Step 1)

-   **Locations table**: 10-20 new locations discovered
-   **Cache table**: 0 entries (not scraped yet)
-   **Time**: ~10-30 seconds (5 Pokemon pages)

### After Route Scrape (Step 2)

-   **Locations table**: Same count, but `scrape_status` updated
-   **Cache table**: 10-20 entries (routes scraped)
-   **Enhanced encounters**: New rows with location_id, rates, levels
-   **Time**: ~30-60 seconds (depends on routes)

### API Endpoint Sample

```bash
curl http://localhost:5173/api/dex/1.json
```

Should show Bulbasaur with:

-   ✅ Basic info (id, name, sprite, generation)
-   ✅ Games array
-   ✅ Locations with original location string
-   ✅ **NEW**: Enhanced fields (area, rate, levels) if scraped

## Troubleshooting

### "Server not running"

```bash
npm run dev
```

### "jq: command not found"

```bash
# macOS
brew install jq

# Or just test in browser
open http://localhost:5173/api/dex/1.json
```

### "Network error" during scraping

-   Check internet connection
-   Bulbapedia might be temporarily down
-   Try again later or with different Pokemon range

### "No enhanced data in API"

Make sure you:

1. Ran the scraper successfully
2. Regenerated API endpoints: `node scripts/generate-api-from-db.js`
3. Restarted the dev server

### Restore Backup

```bash
cp public/data/pokemon.db.backup public/data/pokemon.db
# Or use the specific backup from test-workflow
cp public/data/pokemon.db.backup-test-* public/data/pokemon.db
```

## Full Production Scrape

After testing successfully:

```bash
# Generation 1 (151 Pokemon)
node scripts/scraper-main.js --mode full --start 1 --end 151

# Generation 6 (Kalos region)
node scripts/scraper-main.js --mode full --start 650 --end 721

# All Pokemon (will take ~30-60 minutes)
node scripts/scraper-main.js --mode full --start 1 --end 1025

# Regenerate API endpoints
node scripts/generate-api-from-db.js

# Build for production
npm run build
```

## Test Checklist

-   [ ] Database schema enhanced (run `node scripts/test-scraper.js`)
-   [ ] Test scrape completed (5-10 Pokemon)
-   [ ] Locations discovered and scraped
-   [ ] Cache working (routes marked as scraped)
-   [ ] Enhanced data in database (area, rate, levels)
-   [ ] API endpoints generated with enhanced fields
-   [ ] Dev server serving correct data
-   [ ] curl tests pass
-   [ ] Dual-slot requirements properly extracted
-   [ ] Frontend displays enhanced data (optional UI update)

## Next Steps

1. ✅ Run test workflow
2. ✅ Verify enhanced data in database
3. ✅ Generate and test API endpoints
4. ✅ Check data looks correct
5. 🚀 Run full scrape for desired generations
6. 🎨 Update UI to display enhanced fields (optional)
7. 📦 Build and deploy

## Support

-   **Test workflow**: `./scripts/test-workflow.sh`
-   **Test scraper**: `node scripts/test-scraper.js`
-   **Database check**: `sqlite3 public/data/pokemon.db`
-   **API test**: `./scripts/test-api-endpoints.sh`
