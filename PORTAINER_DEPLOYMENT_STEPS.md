# Portainer Deployment Steps for Backend API Update

## Prerequisites
You've pushed commits `1cc95b2` and `324c10d` to GitHub with the new backend architecture.

## Deployment Steps

### Step 1: Stop Current Stack
1. Go to Portainer → **Stacks** → **blucatch**
2. Click **Stop** (or go to the stack and click Stop button)
3. Wait for all containers to stop

### Step 2: Pull Latest Code
Since Portainer pulls from GitHub, it should auto-detect the new commit. If not:
1. Click **Editor** tab
2. Scroll to bottom
3. Click **"Pull and redeploy"** or **"Update the stack"**

### Step 3: Rebuild All Containers
The new architecture has 3 services:
- `blucatch-scraper` - Creates database
- `blucatch-backend` - API server (waits for DB)
- `blucatch` - Frontend (proxies to backend)

**Important:** Make sure Portainer rebuilds the images, not just restarts them.

### Step 4: Set Environment Variables (Optional)
In Portainer stack settings, you can set:
```
FORCE_FRESH=true  # For scraper - wipes DB and starts fresh
SCRAPE_MODE=full  # For scraper - scrapes all Pokemon
```

### Step 5: Start the Stack
Click **Deploy the stack** or **Start**

### Step 6: Monitor Logs

**Watch the startup order:**

1. **blucatch-scraper** (starts first):
   ```
   🚀 Starting BluCatch Scraper...
   📊 Initializing database...
   [1/151] Processing Bulbasaur (#1)...
   ```

2. **blucatch-backend** (waits for DB):
   ```
   ⏳ Waiting for database to be created by scraper...
   ✅ Database connected successfully
   Backend API running on port 3001
   ```

3. **blucatch** (starts after backend is healthy):
   ```
   nginx starting...
   ```

### Step 7: Verify Deployment

Test the API:
```bash
curl https://poke.bluserv.co.uk/api/health
# Should return: {"status":"ok","timestamp":"..."}

curl https://poke.bluserv.co.uk/api/pokemon?generations=1 | jq '.[0].sprite_url'
# Should return: "https://raw.githubusercontent.com/..."
```

Test the frontend:
- Visit `https://poke.bluserv.co.uk`
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Pokemon sprites should be visible
- Game boxart should show
- Hover over Caterpie - should see encounter details

## Troubleshooting

### If backend shows "unhealthy":
**Check logs** - it's waiting for the database. The scraper creates it on first run.

**Solution:** Wait 2-3 minutes for scraper to create the initial database structure.

### If you still see old bundle:
The latest bundles are:
- CSS: `index-D8nVcLJ0.css`
- JS: `index-fRTfDo7E.js`

If you see older bundles:
1. Portainer didn't rebuild - **force rebuild**
2. Or browser cache - **hard refresh**

### If sprites still don't load:
Check browser console for errors. The sprites load from:
`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png`

If CORS errors, check your nginx configuration.

### If encounter details don't show:
1. Scraper is still populating data - **wait for completion**
2. Check API: `curl https://poke.bluserv.co.uk/api/pokemon/10`
   - Should have `encounter_area`, `level_range`, `encounter_rate`

## Expected Behavior

**Sprites:**
- ✅ Visible at 60% opacity for unavailable Pokemon
- ✅ Full color for available Pokemon
- ✅ Hover shows them at 90% opacity

**Encounter Details (after scraping):**
```
Blue
Route 2 (grass) • Lv. 3-5 • 15%
Viridian Forest (grass) • Lv. 3-5 • 45%
```

**Scraper Logs (clean):**
```
📡 Querying Kanto_Route_2... ✅ Found 113 encounters
📡 Querying Viridian_Forest... ✅ Found 91 encounters
```
(No more spin-off game locations!)

## Post-Deployment

After the scraper completes (1-2 hours):
- All 151 Gen 1 Pokemon will have detailed encounter data
- Frontend will show this data immediately (no cache issues)
- You can restart containers without losing data (stored in volume)

