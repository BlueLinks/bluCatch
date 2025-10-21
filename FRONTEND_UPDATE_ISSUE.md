# Frontend Not Showing Data (While Scraper Running)

## Current Status

-   ✅ Scraper running (at Pokemon #19/151)
-   ✅ Database has 431 encounters for 61 Pokemon
-   ❌ Frontend not showing data yet

## Root Cause

### Architecture:

```
blucatch (frontend):
  - Built once from Dockerfile
  - Copies public/data at BUILD time
  - Mounts volume at /usr/share/nginx/html/data:ro

blucatch-scraper:
  - Writes to /app/public/data
  - Same volume mounted at /app/public/data
```

### The Issue:

The frontend container was built **before the scraper ran**, so:

1. At build time: `public/data/pokemon.db` didn't exist or was old
2. Built dist/ with old/empty DB
3. Volume mounts OVER this at `/usr/share/nginx/html/data`
4. Frontend should read from volume ✅

But if frontend shows nothing, it's likely:

-   **Browser cache** (old DB cached)
-   **Volume not properly mounted**
-   **Frontend container not restarted after scraper started**

## Solution

### Option 1: Wait for Scraper to Complete

The scraper will:

1. Finish all 151 Pokemon (~15-20 more minutes)
2. Generate API endpoints
3. Write final DB to volume

Then **restart the frontend container**:

```bash
docker restart blucatch
```

Or **hard refresh browser**:

-   Chrome/Firefox: Ctrl+Shift+R (Cmd+Shift+R on Mac)
-   Clear site data for localhost

### Option 2: Rebuild Frontend Container (After Scraper Completes)

```bash
# After scraper finishes
docker-compose down
docker-compose up -d --build
```

### Option 3: Check Volume Mount

Verify volume is properly shared:

```bash
# Check frontend container
docker exec blucatch ls -lh /usr/share/nginx/html/data/

# Check scraper container
docker exec blucatch-scraper ls -lh /app/public/data/

# Both should show same files with same timestamps
```

## Why Frontend Doesn't Auto-Update

The frontend is a **static build** served by nginx. It doesn't rebuild automatically when data changes.

The database file is loaded client-side when you first visit the page:

```javascript
// src/utils/database.js
const response = await fetch("/data/pokemon.db");
```

This happens once on page load and gets cached by the browser.

## Recommendations

### Immediate:

1. **Wait** for scraper to complete (check logs for "✅ Scraping complete")
2. **Hard refresh** browser (Ctrl+Shift+R)
3. **Check browser console** for database errors

### Long-term:

Add `npm run build` to scraper entrypoint AFTER generating API:

```bash
# In docker-entrypoint.sh after generate-api-from-db.js:
echo "🔨 Rebuilding frontend with updated data..."
npm run build
cp -r /app/dist/* /usr/share/nginx/html/ 2>/dev/null || true
```

But this requires the scraper container to have build tools, which increases image size.

**Better**: Just restart frontend container after scraper completes initial run.
