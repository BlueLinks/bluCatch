# Data Improvement Plan

## Current Issues Identified

### 1. Remake Games Have Incomplete Data

**Problem**: Omega Ruby/Alpha Sapphire only have 83 Pokémon (should have ~400+)

-   Missing: Most wild encounters from Ruby/Sapphire
-   Example: Shroomish in Ruby/Sapphire but not in OR/AS

**Similar Issues**:

-   FireRed/LeafGreen vs Red/Blue/Yellow
-   HeartGold/SoulSilver vs Gold/Silver/Crystal
-   Brilliant Diamond/Shining Pearl vs Diamond/Pearl/Platinum

### 2. Gen 8-9 Games Severely Incomplete

-   Sword/Shield: Only 12 Pokémon (should have ~400)
-   Scarlet/Violet: Only 12 Pokémon (should have ~400)
-   Let's Go: Only 14 Pokémon (should have ~153)

### 3. Some Evolutions Not Properly Mapped

-   Evolution chains work but some base forms missing from newer games

## Proposed Solutions

### Solution 1: Copy from Originals to Remakes (Quick Win)

**Approach**: Intelligent copying with generation filtering

**Remake Mappings**:

-   FireRed ← Red (Gen 1-3 Pokémon only)
-   LeafGreen ← Blue (Gen 1-3 Pokémon only)
-   HeartGold ← Gold (Gen 1-4 Pokémon only)
-   SoulSilver ← Silver (Gen 1-4 Pokémon only)
-   Omega Ruby ← Ruby (Gen 1-6 Pokémon only)
-   Alpha Sapphire ← Sapphire (Gen 1-6 Pokémon only)
-   Brilliant Diamond ← Diamond (Gen 1-8 Pokémon only)
-   Shining Pearl ← Pearl (Gen 1-8 Pokémon only)

**Logic**:

```javascript
1. Get all Pokémon from original game
2. Filter to only Pokémon from generations available in remake
3. Add to remake if not already present
4. Update locations appropriately
```

**Estimated Impact**:

-   OR/AS: 83 → ~350 Pokémon (+267)
-   BD/SP: 10 → ~450 Pokémon (+440)

### Solution 2: Fetch Additional PokeAPI Data

**Current Status**: Already fetched encounter data, but incomplete for Gen 8-9

**New Approach**:

-   Re-run encounter fetch with focus on:
    -   Sword/Shield (base game + DLC)
    -   Scarlet/Violet (base game + DLC)
    -   Let's Go Pikachu/Eevee

**Challenge**: PokeAPI data is incomplete for these games

### Solution 3: Community Data Integration

**Best Long-Term Solution**: Use comprehensive community databases

**Sources**:

1. **Serebii.net** - Most complete

    - PokéEarth section has every Pokémon location
    - Format: Game → Area → Pokémon list
    - Could be scraped or manually extracted

2. **Bulbapedia**

    - Complete Pokédex lists per game
    - Location tables
    - Version exclusives documented

3. **PokemonDB**
    - Clean, structured data
    - Good for parsing

**Approach Options**:

-   Manual entry (time-consuming but accurate)
-   Web scraping (automated but complex)
-   Community contribution (CSV format for easy import)

### Solution 4: Intelligent Inference

**Pattern-Based Expansion**:

1. **Regional Pokédex Transfer**

    - If Pokémon in original regional dex → likely in remake
    - Apply to OR/AS, BD/SP

2. **Evolution Chain Completion**

    - If base form exists → add evolutions
    - Already implemented ✓

3. **Cross-Version Sharing**
    - Pokémon in both Ruby AND Sapphire → likely in both remakes
    - Apply symmetrically

## Recommended Action Plan

### Phase 1: Quick Wins (Immediate)

**Script 1: copy-to-remakes.js**

```
Goal: Copy Pokémon from original games to their remakes
Time: 5 minutes to write, instant to run
Impact: +700 Pokémon across remake games
Quality: Good (some manual cleanup needed)
```

**Implementation**:

1. Map remakes to originals
2. Copy all Pokémon (with gen filtering)
3. Update locations
4. Run and verify

### Phase 2: Manual High-Value Games (1-2 hours)

**Priority Games** (most played, current gen):

1. **Scarlet/Violet** - Current gen, most interest

    - Source: Serebii PokéEarth Paldea
    - Target: ~400 Pokémon
    - Effort: 1 hour manual entry

2. **Sword/Shield** - Recent, very popular

    - Source: Serebii PokéEarth Galar
    - Target: ~400 Pokémon (including DLC)
    - Effort: 1 hour manual entry

3. **Let's Go Pikachu/Eevee** - Simple, only 153
    - Source: Bulbapedia
    - Target: 153 Pokémon (all Gen 1)
    - Effort: 30 minutes

### Phase 3: Community Data (Future)

Create CSV template for community contributions:

```csv
game_id,pokemon_id,location_name,notes
scarlet,25,South Province Area One,Common
scarlet,133,South Province Area Two,Rare
```

## Immediate Action

I recommend **Phase 1** right now - it's quick and will improve data significantly:

**Expected Results**:

-   Omega Ruby/Alpha Sapphire: 83 → ~350 Pokémon
-   Brilliant Diamond/Shining Pearl: 10 → ~450 Pokémon
-   FireRed/LeafGreen: Already good, minor improvements
-   HeartGold/SoulSilver: Already good, minor improvements

**Shall I proceed with creating the copy-to-remakes.js script?**

This will automatically populate remake games with Pokémon from their original versions, filtered by generation availability.

---

## Alternative: Manual Quick Fix

If you prefer, I can also create a template for you to manually add Pokémon to specific games using a simple JSON format, which you can fill in with data from Serebii or Bulbapedia.

Which approach would you prefer?

1. **Automated**: Run copy-to-remakes script (quick, 70% accurate)
2. **Manual**: I'll help you add specific games with Serebii data (slower, 100% accurate)
3. **Both**: Run script first, then manually refine high-priority games
