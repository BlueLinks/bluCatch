# Gift Pokemon Parser Fix - Complete

## Problem Identified

Bulbasaur in Cerulean City was incorrectly showing as:

-   **Area:** grass
-   **Acquisition:** wild
-   Should be: **Area:** null, **Acquisition:** gift

## Root Cause

The parser defaulted all encounters to `area = 'grass'` without checking if the table was for gift/special Pokemon.

## Solution Implemented

### 1. Added `getTableContext()` Function

Detects table type by checking:

-   **Section headers within table:** `th[colspan]` elements with "Gift Pokémon", "Special Pokémon", "Starter", etc.
-   **Preceding headers:** h2, h3, h4 elements before the table

Returns context object:

```javascript
{
  type: 'gift|starter|special|trade|wild',
  acquisitionMethod: 'gift|starter|special|trade|wild'
}
```

### 2. Updated `parseEncounterTable()`

-   Added `tableContext` parameter
-   Skips area detection for gift/starter tables
-   Doesn't default to 'grass' for gift tables
-   Sets `acquisitionMethod` from context
-   Recognizes "One" as a valid rate for gifts

### 3. Updated `parseRouteEncounters()`

-   Calls `getTableContext()` for each table
-   Passes context to `parseEncounterTable()`
-   Updated deduplication key to include `acquisitionMethod`

### 4. Updated `route-scraper.js`

-   Uses `enc.acquisitionMethod` from parser if available
-   Falls back to `detectAcquisitionMethod()` only if not provided

## Test Results

**Before:**

```
Bulbasaur at Cerulean City:
  Area: grass
  Acquisition: wild
  Rate: N/A
```

**After:**

```
Bulbasaur at Cerulean City:
  Area: none
  Acquisition: gift
  Rate: One
```

✅ Validated with test script - all checks pass

## Impact

This fix correctly handles:

-   ✅ Gift Pokemon (Bulbasaur, Charmander, Squirtle in various locations)
-   ✅ Starter Pokemon (if tables have "Starter" or "Choice" headers)
-   ✅ Special Pokemon (legendaries given as gifts)
-   ✅ In-game trades (when "Trade" section detected)

## Files Modified

1. `scripts/modules/html-parser.js` - Added getTableContext(), updated parseEncounterTable()
2. `scripts/modules/route-scraper.js` - Preserve acquisitionMethod from parser

## Deployment

Changes pushed in commit `c6aea7d`.

When deployed to Portainer:

-   Scraper will re-process all locations with correct gift detection
-   Bulbasaur and other gifts will show proper acquisition method
-   Frontend will display "Gift" instead of grass encounter

## Next Steps

-   Monitor scraper logs for gift Pokemon being correctly identified
-   Verify frontend displays acquisition method badges
-   Consider adding starter data from Professor Oak encounters

