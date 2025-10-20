# Bulbapedia Scraper Status

## Current Progress

-   **Last Processed**: Pokémon #20 (Raticate)
-   **Total Processed**: 615 entries
-   **Total Added**: 15,708 location entries

## Why Mew (and others) Don't Have Data Yet

The scraper has only processed Pokémon #1-20 so far. Mew is #151, so it hasn't been scraped yet.

### What You're Seeing for Mew:

```
Mew #151
○ Available in (not selected):
GENERATION 1
Yellow - Event exclusive
GENERATION 3
FireRed / LeafGreen - Event exclusive
Emerald - Faraway Island Area
GENERATION 99
Let's Go, Pikachu! / Let's Go, Eevee! - Poké Ball Plus exclusive
```

These 8 entries are from **manual/pre-existing data**, not from the Bulbapedia scraper.

### What Mew SHOULD Have (from Bulbapedia):

Based on the "Game locations" table on Bulbapedia, Mew should have entries for:

-   **Generation I**: Red, Blue, Blue (Japan), Yellow - all "Event"
-   **Generation II**: Gold, Silver, Crystal - all "Event"
-   **Generation III**: Ruby, Sapphire, Emerald, FireRed, LeafGreen - all "Event" (Emerald also has Faraway Island)
-   **Generation IV**: Diamond, Pearl, Platinum, HeartGold, SoulSilver - all via "My Pokémon Ranch" or "Event"
-   **Generation V**: Black, White, Black 2, White 2 - all via "Poké Transfer"
-   **Generation VI**: X, Y, Omega Ruby, Alpha Sapphire - all "Event"
-   **Generation VII**: Sun, Moon, Ultra Sun, Ultra Moon, Let's Go Pikachu/Eevee - "Event" or "Poké Ball Plus"
-   **Generation VIII**: Sword, Shield, Brilliant Diamond, Shining Pearl - "Event" or "Poké Ball Plus" or "Floaroma Town"
-   **Generation IX**: Scarlet, Violet - "Event"

That's **~35-40 game entries** total!

## Known Limitations

### Event-Exclusive Pokémon Parsing

Pokemon that are **only available via Events** (like Mew, Celebi, Jirachi, Deoxys, etc.) have incomplete data because their Bulbapedia tables use a very complex nested structure that the scraper struggles to parse correctly.

**Current status for Mew:**

-   ✅ Has 8 entries (Yellow, Emerald, FireRed, LeafGreen, Let's Go, Brilliant Diamond/Pearl)
-   ❌ Missing ~27 other entries (Red, Blue, Gold, Silver, Crystal, Ruby, Sapphire, and all Gen 4-9 games where it's Event-only)

The Bulbapedia table for these Pokemon has 70+ rows with complex rowspan/colspan structures that make it difficult to reliably map games to locations. This is an area for future improvement.

**Workaround**: For event-exclusive Pokemon, the existing manual/community-contributed data may be more complete than the Bulbapedia scraper results.

## How to Complete the Scrape

### Option 1: Let Docker Auto-Resume (Recommended)

The Docker scraper is configured to:

1. **Auto-resume** on startup from the last processed Pokemon
2. **Full refresh daily** at 3:30 AM

Just let the container run and it will process all remaining Pokemon.

**To check progress:**

```bash
docker logs -f blucatch-scraper
```

**Estimated time**: ~2-4 hours to complete all ~1000 Pokemon (with rate limiting to avoid Bulbapedia throttling)

### Option 2: Run Locally

```bash
cd /Users/bluelinks/Developer/web
node scripts/scrape-bulbapedia.js
```

This will resume from #21 and continue to the end.

### Option 3: Force Fresh Start

```bash
# Delete progress file to start from scratch
rm public/data/.bulbapedia-progress.json

# Run scraper
node scripts/scrape-bulbapedia.js --fresh --replace
```

## Recent Fixes Applied (Not Yet Pushed)

1. ✅ **Docker Spinner Spam Fixed** - No more thousands of duplicate log lines in Portainer
2. ✅ **Special Pokemon Names Fixed** - Ho-Oh, Nidoran♀/♂, Farfetch'd, Mr. Mime, Type: Null, etc.
3. ✅ **Bulbapedia Links Added** - Click "📖 Bulbapedia" on any Pokemon in the UI to learn more
4. ⚠️ **Mew Missing Data** - Not a bug! Scraper just hasn't reached #151 yet.

## What Happens When Scraping Completes

Once the scraper finishes all ~1000 Pokemon:

-   **Mew will have ~35-40 game entries** (all the Event distributions)
-   **All Pokemon will have complete location data**
-   **The UI will show all available locations for each Pokemon**
-   **Auto-refresh will keep data up-to-date daily**

## Monitoring Progress

Check the progress file:

```bash
cat public/data/.bulbapedia-progress.json | jq '{lastProcessedId, lastProcessedName, totalProcessed, totalAdded}'
```

Check for Mew specifically once scraper reaches #151:

```bash
cat public/data/games.json | jq '.games[] | {name: .name, mew: [.pokemon[] | select(.id == 151)]} | select(.mew | length > 0)'
```
