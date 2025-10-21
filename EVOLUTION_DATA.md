# Evolution Data System

## Overview

The evolution system tracks how Pokemon evolve and enriches location strings with evolution method details.

## How It Works

### 1. Fetch Evolution Data (`scripts/fetch-evolution-data.js`)

Fetches evolution information from PokeAPI for all 1,025 Pokemon and stores it in `public/data/evolutions.json`.

**Run:**
```bash
node scripts/fetch-evolution-data.js
# Or limit to range:
node scripts/fetch-evolution-data.js --range=1-100
```

**Output** (`public/data/evolutions.json`):
```json
{
  "evolutions": {
    "65": {
      "id": 65,
      "name": "alakazam",
      "evolvesFrom": 64,
      "method": "trade",
      "requirement": "Trade",
      "trigger": "trade"
    },
    "208": {
      "id": 208,
      "name": "steelix",
      "evolvesFrom": 95,
      "method": "trade-with-item",
      "requirement": "Trade holding metal coat",
      "trigger": "trade"
    }
  }
}
```

### 2. Enrich Evolution Strings (`scripts/enrich-evolution-strings.js`)

Updates `games.json` to add evolution method details to location strings.

**Run:**
```bash
node scripts/enrich-evolution-strings.js
```

**Changes:**
- `"Evolve Kadabra"` → `"Evolve Kadabra (trade required)"`
- `"Evolve Onix"` → `"Evolve Onix (Trade holding metal coat)"`
- `"Evolve Eevee"` → `"Evolve Eevee (Water Stone)"` (context-specific)
- `"Evolve Bulbasaur"` → `"Evolve Bulbasaur (Level 16)"`
- `"Evolve Golbat"` → `"Evolve Golbat (High friendship)"`

## Evolution Methods

The system recognizes these evolution methods:

1. **level-up**: Simple level-up or level-up with conditions
2. **trade**: Requires trading with another player
3. **trade-with-item**: Trade while holding a specific item
4. **use-item**: Use an evolution stone or other item
5. **shed**: Special case (Nincada → Shedinja)
6. **other**: Unique methods (varies)

## Benefits

1. **Clear Requirements**: Users immediately know if they can evolve a Pokemon solo
2. **Trade Evolution Warning**: Alakazam, Gengar, Golem, Machamp, etc. clearly show "(trade required)"
3. **Item Requirements**: Shows which stones/items are needed
4. **Level Information**: Shows exact levels for simple level-up evolutions

## Maintenance

**When to regenerate:**
- After adding new Pokemon to `pokemon.json`
- After major game updates
- If evolution methods change in newer game versions

**Full regeneration:**
```bash
# 1. Fetch evolution data (~2 minutes)
node scripts/fetch-evolution-data.js

# 2. Enrich games.json strings
node scripts/enrich-evolution-strings.js
```

**Note**: `evolutions.json` is in `.gitignore` as it can be regenerated. It's not committed to the repo.

## Trade Evolution List

Common trade evolutions users should know about:
- Alakazam (from Kadabra)
- Gengar (from Haunter)
- Golem (from Graveler)
- Machamp (from Machoke)
- Steelix (from Onix, requires Metal Coat)
- Kingdra (from Seadra, requires Dragon Scale)
- Politoed (from Poliwhirl, requires King's Rock)
- Slowking (from Slowpoke, requires King's Rock)
- Scizor (from Scyther, requires Metal Coat)
- Porygon2 (from Porygon, requires Upgrade)
- Porygon-Z (from Porygon2, requires Dubious Disc)

All of these now show "(trade required)" or "(Trade holding X)" in the location strings!

