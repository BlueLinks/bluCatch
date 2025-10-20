# Running the Bulbapedia Scraper

## ✅ Backup Already Created!

Your current PokeAPI data has been backed up to:

```
backups/games-pokeapi-20251019-155249.json (1.2 MB)
```

## 🎯 Recommended: REPLACE Mode

Since Bulbapedia data is more comprehensive than PokeAPI, we recommend using **REPLACE mode** to start with a clean slate:

### Why Replace?

**Current Data (PokeAPI + enhancements):**

-   ✅ Regional Pokedex data
-   ✅ Some encounters
-   ❌ Missing event Pokemon
-   ❌ Missing special acquisition methods
-   ❌ Generic location names

**Bulbapedia Data:**

-   ✅ Complete event Pokemon
-   ✅ Detailed acquisition methods
-   ✅ Specific location names
-   ✅ Community-maintained accuracy
-   ✅ Special cases (trades, fossils, etc.)

**Problem with mixing:**

-   Duplicates with different location formats
-   Inconsistent detail levels
-   Harder to maintain

**Solution: Clean Replace**

-   Pure Bulbapedia data
-   Consistent format
-   One source of truth

## 🚀 How to Run

### Step 1: Test with Replace Mode (RECOMMENDED)

Test with first 10 Pokemon to see the output:

```bash
node scripts/scrape-bulbapedia.js --range=1-10 --replace --dry-run
```

This shows you what would happen without making changes.

### Step 2: Run Small Batch

Start with first 100 Pokemon to verify quality:

```bash
node scripts/scrape-bulbapedia.js --range=1-100 --replace
```

**Note**: The `--replace` flag only clears data on the FIRST run. Progress is tracked, so if you resume later, it won't clear again (safe for disaster recovery).

### Step 3: Full Run with Replace

Once satisfied, run the full scraper:

```bash
node scripts/scrape-bulbapedia.js --range=1-1025 --replace
```

**Time**: ~35 minutes for all Pokemon
**Safety**: Auto-backups + progress tracking + resumable

### Step 4 (Optional): Resume if Interrupted

If the scraper is interrupted, just rerun:

```bash
node scripts/scrape-bulbapedia.js --range=101-1025
```

It will resume from where it left off. No need for `--replace` again (data already cleared).

## ⚙️ Command Options

| Flag             | Description                             |
| ---------------- | --------------------------------------- |
| `--range=1-1025` | Pokemon range to process                |
| `--replace`      | Clear existing data first (clean slate) |
| `--dry-run`      | Test without saving changes             |
| `--fresh`        | Clear progress file and start over      |

## 📊 What to Expect

### Before (Current PokeAPI Data):

```
HeartGold: 483 Pokemon
- Locations: "Regional Dex #X"
- Missing: Palkia (event), Dialga (event), Giratina (event)
```

### After (Bulbapedia Data):

```
HeartGold: 486 Pokemon
- Locations: "Sinjoh Ruins (requires Event Arceus)"
- Includes: Palkia, Dialga, Giratina with detailed methods
```

### Expected Additions:

-   **15,000-20,000 detailed entries** across all games
-   **Event Pokemon** with acquisition details
-   **Trade evolutions** clearly marked
-   **Special methods** (Dream Radar, Pokewalker, etc.)
-   **Specific locations** instead of generic "Regional Dex"

## 🛡️ Safety Features

### Automatic Backups

Every run creates TWO backups:

1. **Manual backup** (already created):

    ```
    backups/games-pokeapi-20251019-155249.json
    ```

2. **Script backup** (created automatically):
    ```
    public/data/games.before-bulbapedia-1729372849000.json
    ```

### Progress Tracking

Progress saved to `.bulbapedia-progress.json`:

```json
{
	"lastProcessedId": 150,
	"totalProcessed": 150,
	"totalAdded": 2847,
	"errors": []
}
```

### Resume Capability

If interrupted, just rerun with the same or adjusted range:

```bash
node scripts/scrape-bulbapedia.js --range=151-1025
```

## 📝 Recommended Workflow

### Conservative Approach (Test First)

```bash
# 1. Test with dry run (20 seconds)
node scripts/scrape-bulbapedia.js --range=1-10 --replace --dry-run

# 2. Real run with small batch (4 minutes)
node scripts/scrape-bulbapedia.js --range=1-100 --replace

# 3. Check your app
npm run dev
# Verify data quality, tooltips, acquisition methods

# 4. If good, run the rest (30 minutes)
node scripts/scrape-bulbapedia.js --range=101-1025

# Done!
```

### Aggressive Approach (Full Run)

```bash
# Just do it all at once (35 minutes)
node scripts/scrape-bulbapedia.js --range=1-1025 --replace

# Go get coffee ☕
```

### Overnight Approach (Set and Forget)

```bash
# Run in background
nohup node scripts/scrape-bulbapedia.js --range=1-1025 --replace > bulbapedia.log 2>&1 &

# Go to bed 😴

# Check in the morning
cat bulbapedia.log
cat .bulbapedia-progress.json
```

## 🔄 Restoring from Backup

### If Something Goes Wrong

```bash
# Restore from manual backup
cp backups/games-pokeapi-20251019-155249.json public/data/games.json

# Or restore from script backup
cp public/data/games.before-bulbapedia-*.json public/data/games.json
```

### If You Want to Rerun

```bash
# Clear progress and start fresh
rm .bulbapedia-progress.json

# Run again
node scripts/scrape-bulbapedia.js --range=1-1025 --replace
```

## 📈 Monitoring Progress

### In Real-Time

```bash
# In one terminal: run scraper
node scripts/scrape-bulbapedia.js --range=1-1025 --replace

# In another terminal: watch progress
watch -n 5 'cat .bulbapedia-progress.json | jq .'
```

### Check Logs

```bash
# If running in background
tail -f bulbapedia.log
```

## ✅ Verification After Completion

### 1. Check Progress File

```bash
cat .bulbapedia-progress.json
```

Should show:

```json
{
  "lastProcessedId": 1025,
  "totalProcessed": 1025,
  "totalAdded": 15000-20000,
  "errors": []
}
```

### 2. Check Game Data

```bash
# See updated counts
cat public/data/games.json | jq '.games[] | {name: .name, count: (.pokemon | length)}' | head -20
```

### 3. Test Your App

```bash
npm run dev
```

Check:

-   ✅ Tooltips show detailed locations
-   ✅ Acquisition filters detect methods correctly
-   ✅ Event Pokemon appear when filter enabled
-   ✅ Trade evolutions marked correctly

### 4. Spot Check Known Cases

-   Palkia in HeartGold (should be "Sinjoh Ruins")
-   Gengar in any game (should mention trade evolution)
-   Starters (should mention professor/gift)

## 🎯 After Scraping

### Your App Will Have:

✅ **Most comprehensive Pokemon location data available**

-   15,000-20,000 detailed entries
-   All event Pokemon
-   All special acquisition methods
-   Specific location names

✅ **Acquisition filters will work perfectly**

-   Auto-detection of events
-   Trade evolution flagging
-   Dream Radar identification
-   Pokewalker detection

✅ **Better user experience**

-   "Realistic Solo" preset excludes events/trades
-   Tooltips show exact requirements
-   Game suggestions more accurate

## 🚨 Troubleshooting

### Script Hangs

```bash
# Kill and resume
Ctrl+C
node scripts/scrape-bulbapedia.js --range=XXX-1025
```

(Replace XXX with lastProcessedId from progress file)

### Too Many Errors

```bash
# Check errors
cat .bulbapedia-progress.json | jq '.errors'

# Increase delay if rate limited
# Edit scripts/scrape-bulbapedia.js
# Change: const DELAY_MS = 2000; to 3000;
```

### Need to Start Over

```bash
# Clear everything and start fresh
rm .bulbapedia-progress.json
cp backups/games-pokeapi-*.json public/data/games.json
node scripts/scrape-bulbapedia.js --range=1-1025 --replace --fresh
```

## 💡 Pro Tips

1. **Run overnight** - 35 minutes is perfect for sleep time
2. **Check first 100** - Validate quality before full run
3. **Keep backups** - Never delete `backups/` folder
4. **Monitor errors** - A few errors (5-10) are normal
5. **Test filters** - Try "Realistic Solo" after scraping

## 🎊 Ready to Run!

You're all set! Your data is backed up and the scraper is ready.

**Recommended first command:**

```bash
node scripts/scrape-bulbapedia.js --range=1-50 --replace --dry-run
```

This tests everything without risk. When you see good output, run it for real! 🚀🔴⚪✨
