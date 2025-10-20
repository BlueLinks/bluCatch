# Pokémon Data Guide

## Current Data Status

### Pokémon Database

✅ **1,025 Pokémon** from Generations 1-9

-   Fetched from [PokeAPI](https://pokeapi.co/)
-   Includes: ID, name, generation, sprite URL
-   Source: `/public/data/pokemon.json`

### Game Availability Data

Data completeness varies by game:

#### Well-Covered Games (Wild + Starters + Legendaries)

-   **Gen 1-4**: Red, Blue, Yellow, Gold, Silver, Crystal, Ruby, Sapphire, Emerald, FireRed, LeafGreen, Diamond, Pearl, Platinum
-   **Ultra Sun/Moon**: Most complete (360+ Pokémon each)
-   **Black 2/White 2**: Very complete (260+ Pokémon each)

#### Partially Covered Games

-   **HeartGold/SoulSilver**: ~200 Pokémon (missing many transferred Pokémon)
-   **X/Y**: ~216 Pokémon (missing gifts and some legendaries)
-   **Sun/Moon**: ~240 Pokémon (good coverage)
-   **Omega Ruby/Alpha Sapphire**: Only 50 Pokémon (needs expansion)

#### Minimally Covered Games (Need Major Work)

-   **Let's Go Pikachu/Eevee**: Only 6 Pokémon (only Gen 1 available in game)
-   **Sword/Shield**: Only 12 Pokémon (DLC areas not included)
-   **Brilliant Diamond/Shining Pearl**: Only 4 Pokémon
-   **Legends: Arceus**: Only 4 Pokémon
-   **Scarlet/Violet**: Only 10 Pokémon (needs ~400 Pokémon)

## Data Sources

### 1. PokeAPI (Automated)

-   **Endpoint**: `https://pokeapi.co/api/v2/pokemon/{id}/encounters`
-   **Provides**: Wild encounter locations
-   **Missing**: Starters, gifts, trades, evolutions, events
-   **Coverage**: Good for Gen 1-7, poor for Gen 8-9

### 2. Manual Curation (Essential Pokémon)

-   Added via `scripts/add-essential-pokemon.js`
-   Includes: Starters, starter evolutions, legendary Pokémon, mythical Pokémon
-   Based on common knowledge and game mechanics

### 3. Community Sources (Recommended for Expansion)

To complete the database, consider these sources:

#### Bulbapedia

-   [Version-exclusive Pokémon](https://bulbapedia.bulbagarden.net/wiki/Version-exclusive_Pok%C3%A9mon)
-   [List of Pokémon by availability](https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_availability)
-   Individual game pages with detailed Pokédex lists

#### Serebii.net

-   Comprehensive Pokédex for each game
-   Lists all obtainable Pokémon per version
-   Example: https://www.serebii.net/pokearth/galar/

#### PokemonDB

-   Clean, organized availability data
-   Easy to parse format
-   https://pokemondb.net/

## How to Expand the Data

### Method 1: Automated Fetch (Partial)

```bash
# Already run - fetches wild encounters only
node scripts/fetch-encounters.js
```

### Method 2: Manual Addition

Edit `/public/data/games.json` directly:

```json
{
	"id": "scarlet",
	"name": "Pokémon Scarlet",
	"pokemon": [
		{ "id": 25, "location": "South Province (Area One)" },
		{ "id": 133, "location": "South Province (Area Two)" }
	]
}
```

### Method 3: Semi-Automated Script

Create a CSV file with game availability data and import it:

```csv
pokemon_id,game_id,location
25,scarlet,South Province
133,scarlet,South Province
```

Then write a script to parse and merge it.

## Priority for Expansion

### High Priority (Most Popular Games)

1. **Scarlet/Violet** - Current gen, needs ~400 Pokémon
2. **Sword/Shield** - Very popular, needs ~400 Pokémon (including DLC)
3. **Let's Go Pikachu/Eevee** - Needs all 153 Gen 1 Pokémon
4. **Omega Ruby/Alpha Sapphire** - Only has 50, should have ~400

### Medium Priority

5. **Brilliant Diamond/Shining Pearl** - Needs ~493 Pokémon
6. **Legends: Arceus** - Needs ~240 Pokémon
7. **X/Y** - Has 216, could add ~500 more
8. **HeartGold/SoulSilver** - Has 200, could add ~250 more

### Lower Priority (Well Covered)

-   Gen 1-3 games are fairly complete
-   Ultra Sun/Moon are very complete
-   Black/White series are well covered

## Data Structure

### pokemon.json

```json
{
	"pokemon": [
		{
			"id": 1,
			"name": "Bulbasaur",
			"generation": 1,
			"sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png"
		}
	],
	"generated": "2025-10-19T...",
	"source": "PokeAPI",
	"total": 1025
}
```

### games.json

```json
{
	"games": [
		{
			"id": "red",
			"name": "Pokémon Red",
			"generation": 1,
			"boxArt": "/images/boxart/red.png",
			"pokemon": [
				{ "id": 1, "location": "Starter from Professor Oak" },
				{ "id": 10, "location": "Viridian Forest" }
			]
		}
	]
}
```

## Known Issues

### Missing Data Types

1. **Eggs/Breeding**: Pokémon obtainable only through breeding
2. **In-game Trades**: Pokémon received via NPC trades
3. **Special Events**: Time-limited event distributions
4. **Transfer-only**: Pokémon only available via transfer from other games
5. **Version Differences**: Same game but different version exclusives

### Version Exclusives

According to [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Version-exclusive_Pok%C3%A9mon), version exclusives are not yet marked in the current data. Consider adding a `versionExclusive` flag.

### Evolution Chains

Evolved forms are sometimes missing if they don't appear in the wild. The app doesn't currently auto-add evolution chains.

## Future Enhancements

### Recommended Features

1. **Evolution Chain Inference**: If Charmander is available, automatically include Charmeleon and Charizard
2. **Version Exclusive Markers**: Visual indicators for version-exclusive Pokémon
3. **Minimum Game Calculator**: Algorithm to find the smallest set of games needed
4. **Trade Requirements**: Indicate which Pokémon require trading to evolve
5. **Living Dex Mode**: Track which games you own and show completion %

### Data Quality Improvements

1. Add all DLC areas (Isle of Armor, Crown Tundra, The Teal Mask, The Indigo Disk)
2. Include Pokémon HOME availability
3. Mark event-exclusive Pokémon clearly
4. Add rarity/encounter rate information
5. Include form variations (Alolan, Galarian, Paldean forms)

## Contributing Data

If you want to contribute complete data for a game:

1. **Research**: Use Serebii, Bulbapedia, or PokemonDB
2. **Format**: Create a JSON file with Pokémon IDs and locations
3. **Test**: Load it into the app and verify
4. **Document**: Note any special cases or exclusions

Example contribution format:

```json
{
	"game": "scarlet",
	"source": "Serebii.net",
	"date": "2025-10-19",
	"pokemon": [
		{ "id": 25, "location": "South Province Area One", "notes": "Common" },
		{ "id": 906, "location": "Starter from Nemona" }
	]
}
```

## Resources

### APIs

-   [PokeAPI](https://pokeapi.co/) - Free Pokémon data API
-   [PokéAPI GitHub](https://github.com/PokeAPI/pokeapi) - API source code

### Databases

-   [Bulbapedia](https://bulbapedia.bulbagarden.net/)
-   [Serebii.net](https://serebii.net/)
-   [PokemonDB](https://pokemondb.net/)
-   [Smogon](https://www.smogon.com/)

### Sprites

-   [PokeAPI Sprites](https://github.com/PokeAPI/sprites) - Official sprites repository
-   Currently using: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`

---

**Last Updated**: October 19, 2025  
**Data Version**: 1.0  
**Total Pokémon**: 1,025  
**Total Games**: 37
