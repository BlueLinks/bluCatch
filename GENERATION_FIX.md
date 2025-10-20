# Generation-Locked Evolution Fix

## The Problem

After implementing automatic evolution chains, a critical bug was discovered: **future evolutions were appearing in games released before those evolutions existed**.

### Examples of the Bug

❌ **Before the fix:**

-   **Steelix** (Gen 2) appeared in Blue (Gen 1)
-   **Magnezone** (Gen 4) appeared in Blue (Gen 1)
-   **Electivire** (Gen 4) appeared in FireRed (Gen 3)
-   **Sylveon** (Gen 6) appeared in Black/White (Gen 5)

This happened because the evolution chain scripts added ALL evolutions without checking when they were introduced.

## The Solution

Created `fix-generation-evolutions.js` to remove Pokémon from games that were released before those Pokémon existed.

### How It Works

1. **Map games to generations** - Each game knows what generation it belongs to
2. **Check Pokémon generations** - Each Pokémon has its introduction generation
3. **Filter out future Pokémon** - Remove any Pokémon introduced AFTER the game's generation

### Example Logic

```javascript
// Blue is a Gen 1 game
GAME_GENERATIONS["blue"] = 1;

// For each Pokemon in Blue:
if (pokemon.generation > 1) {
	// Remove it - didn't exist in Gen 1
	remove(pokemon);
}
```

## Results

✅ **After the fix:**

-   **Removed 411 future evolutions** across all games
-   Blue now has only **134 Pokémon** (all Gen 1)
-   Gen 1 games cleaned up: Red, Blue, Yellow
-   Gen 2 games cleaned up: Gold, Silver, Crystal
-   All games now historically accurate!

### Specific Fixes by Game

| Game      | Generation | Removed | New Total |
| --------- | ---------- | ------- | --------- |
| Red       | 1          | 27      | 134       |
| Blue      | 1          | 24      | 134       |
| Yellow    | 1          | 27      | 135       |
| Gold      | 2          | 35      | 221       |
| Silver    | 2          | 32      | 221       |
| Crystal   | 2          | 34      | 226       |
| Ruby      | 3          | 12      | 196       |
| Sapphire  | 3          | 12      | 196       |
| Emerald   | 3          | 16      | 238       |
| FireRed   | 3          | 22      | 204       |
| LeafGreen | 3          | 22      | 205       |

## What Was Removed

### Gen 1 Games (Red, Blue, Yellow)

Removed Gen 2+ evolutions:

-   Steelix (Gen 2 - evolves from Onix)
-   Crobat (Gen 2 - evolves from Golbat)
-   Bellossom (Gen 2 - evolves from Gloom)
-   Politoed (Gen 2 - evolves from Poliwhirl)
-   Slowking (Gen 2 - evolves from Slowpoke)
-   Kingdra (Gen 2 - evolves from Seadra)
-   Scizor (Gen 2 - evolves from Scyther)
-   And 20+ more Gen 2-9 evolutions

### Gen 2 Games (Gold, Silver, Crystal)

Removed Gen 3+ evolutions:

-   Magnezone (Gen 4)
-   Electivire (Gen 4)
-   Magmortar (Gen 4)
-   Leafeon, Glaceon (Gen 4)
-   And 30+ more Gen 3-9 evolutions

### Gen 3 Games (Ruby, Sapphire, Emerald, FireRed, LeafGreen)

Removed Gen 4+ evolutions:

-   Magnezone (Gen 4)
-   Electivire (Gen 4)
-   Rhyperior (Gen 4)
-   And 10+ more Gen 4-9 evolutions

## What Was Kept

✅ **Valid evolution chains remain intact:**

### Gen 1 Games Keep:

-   Bulbasaur → Ivysaur → Venusaur ✓
-   Pikachu → Raichu ✓
-   Magnemite → Magneton ✓ (but NOT Magnezone)
-   Onix stays ✓ (but NOT Steelix)
-   Eevee → Vaporeon/Jolteon/Flareon ✓

### Gen 2 Games Keep:

-   All Gen 1 evolutions ✓
-   Golbat → Crobat ✓
-   Onix → Steelix ✓
-   Eevee → Espeon/Umbreon ✓
-   But NOT Magnezone (Gen 4)

### Gen 3 Games Keep:

-   All Gen 1-2 evolutions ✓
-   Magneton stays ✓ (but NOT Magnezone)
-   But NOT Electivire, Magmortar (Gen 4)

## Verification

### Test Case: Blue Version

**Before Fix:**

```
Total: 158 Pokemon (WRONG - included future evolutions)
Steelix (Gen 2): Present ❌
Magnezone (Gen 4): Present ❌
```

**After Fix:**

```
Total: 134 Pokemon (CORRECT - only Gen 1)
Steelix: Not present ✓
Magnezone: Not present ✓
Onix: Present ✓
Magnemite: Present ✓
Magneton: Present ✓
```

## Technical Implementation

### Script Location

`scripts/fix-generation-evolutions.js`

### Generation Mapping

```javascript
const GAME_GENERATIONS = {
	red: 1,
	blue: 1,
	yellow: 1,
	gold: 2,
	silver: 2,
	crystal: 2,
	ruby: 3,
	sapphire: 3,
	emerald: 3,
	// ... all 37 games mapped
};
```

### Filtering Logic

```javascript
game.pokemon = game.pokemon.filter((pkmn) => {
	const pokemon = pokemonById.get(pkmn.id);
	// Keep only if Pokemon was introduced in or before this game's gen
	return pokemon.generation <= gameGeneration;
});
```

## Impact on User Experience

### Before

❌ User selects Blue  
❌ Sees Steelix and Magnezone as "available"  
❌ Confusion - these don't actually exist in Blue!  
❌ Historically inaccurate

### After

✅ User selects Blue  
✅ Sees only Gen 1 Pokémon (151 max)  
✅ Historically accurate  
✅ Makes sense - only Pokémon that existed in 1996

## Future Considerations

### Regional Forms

Regional forms (Alolan, Galarian, Hisuian, Paldean) need special handling:

-   Alolan Raichu (Gen 7) should NOT appear in Gen 1-6 games
-   Galarian Ponyta (Gen 8) should NOT appear in Gen 1-7 games
-   Currently handled by generation check ✓

### Cross-Generation Evolutions

Some Pokémon evolve across generations:

-   Eevee (Gen 1) → Sylveon (Gen 6)
-   Magneton (Gen 1) → Magnezone (Gen 4)
-   Now correctly filtered by generation ✓

### Remakes vs Original Games

-   FireRed/LeafGreen (Gen 3) can have Gen 2-3 evolutions ✓
-   HeartGold/SoulSilver (Gen 4) can have Gen 2-4 evolutions ✓
-   Brilliant Diamond/Shining Pearl (Gen 8) can have all evolutions ✓
-   Correctly mapped to their release generation ✓

## Commands

### Run the Fix

```bash
node scripts/fix-generation-evolutions.js
```

### Verify a Specific Game

```bash
# Check Blue for future evolutions
cat public/data/games.json | jq '.games[] | select(.id=="blue") | .pokemon | length'
# Should be 134 (only Gen 1)
```

## Files Modified

-   ✅ `public/data/games.json` - Cleaned up all games
-   ✅ `public/data/games.before-gen-fix.json` - Backup created

## Summary

This fix ensures **historical accuracy** - games only show Pokémon that actually existed when they were released. No more time-traveling evolutions! 🎯

The bug affected primarily:

-   Gen 1 games: Most impacted (27 incorrect Pokémon)
-   Gen 2 games: Heavily impacted (32-35 incorrect)
-   Gen 3+ games: Decreasing impact

**Total Impact**: 411 incorrect Pokémon removed across all 37 games.

---

**Fixed**: October 19, 2025  
**Issue**: Future evolutions in past games  
**Solution**: Generation-locked filtering  
**Status**: ✅ COMPLETE
