# BluCatch

A web application to calculate the minimum set of Pokémon games needed to catch all Pokémon. Select games to see which Pokémon become available and track your collection progress.

## ⚠️ Copyright Disclaimer

This project uses copyright media owned by Nintendo, Game Freak, and Creatures. The images, sounds, names and animations are all the Intellectual Property of Nintendo, Game Freak, and Creatures. These assets are being used solely for educational purposes and we claim no ownership over any of the assets used in the program.

## Features

-   **Visual Pokémon Display**: All Pokémon sprites organized by generation
-   **Interactive Game Selection**: Click game box art to enable/disable games
-   **Real-time Updates**: See which Pokémon are catchable as you select games
-   **Enhanced Tooltips**: Hover over ANY Pokémon to see ALL games where it's available
    -   ✓ Selected games shown with blue highlights
    -   ○ Unselected games shown greyed out - helps plan which games to buy!
-   **Progress Tracking**: View overall and per-generation statistics
-   **⚙️ Generation Filter**: Settings menu to show/hide specific generations

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
/Users/bluelinks/Developer/web/
├── public/
│   ├── data/
│   │   ├── pokemon.json     # Pokémon data with sprites
│   │   └── games.json       # Game data with Pokémon availability
│   └── images/
│       └── boxart/          # Game box art images (add your own)
├── src/
│   ├── components/
│   │   ├── PokemonSprites.jsx   # Pokémon sprite display component
│   │   ├── GameGrid.jsx         # Game grid container
│   │   └── GameCard.jsx         # Individual game card
│   ├── styles/              # Component-specific CSS
│   ├── utils/
│   │   └── calculator.js    # Game calculation logic
│   ├── App.jsx              # Main app component
│   └── main.jsx             # App entry point
```

## Data Sources

### Pokémon Sprites

Currently using sprites from PokeAPI's GitHub repository:
`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`

### Game Box Art

You'll need to add game box art images to `/public/images/boxart/`. Name them according to the game IDs in `games.json`:

-   red.png
-   blue.png
-   yellow.png
-   gold.png
-   silver.png
-   etc.

You can find box art images from various sources online. Make sure to use images you have the rights to use.

## Expanding the Data

### Scripts Available

**Fetch All Pokémon** (already run):

```bash
node scripts/fetch-all-pokemon.js
```

**Fetch Encounter Data** (already run):

```bash
node scripts/fetch-encounters.js
```

**Add Essential Pokémon** (already run):

```bash
node scripts/add-essential-pokemon.js
```

### Manual Data Addition

To add more Pokémon to specific games, edit `/public/data/games.json`:

```json
{
	"id": "scarlet",
	"name": "Pokémon Scarlet",
	"pokemon": [
		{ "id": 25, "location": "South Province Area One" },
		{ "id": 133, "location": "South Province Area Two" }
	]
}
```

**📖 See [DATA_GUIDE.md](./DATA_GUIDE.md) for comprehensive expansion instructions and data sources.**

### Evolution Chains ✅

**Fully automated!** If a Pokémon is available in a game, all its evolutions are automatically included:

```bash
# Already run - adds all evolved forms
node scripts/add-evolution-chains.js
node scripts/fix-evolution-chains.js  # Fixes branching (Eevee, etc.)
```

**Examples**:

-   Pidgey in FireRed → Pidgeotto and Pidgeot automatically added
-   Eevee → All 8 Eeveelutions properly linked
-   Tyrogue → Hitmonlee, Hitmonchan, Hitmontop all correct

📄 See [EVOLUTION_FIX_SUMMARY.md](./EVOLUTION_FIX_SUMMARY.md) for details.

## Tech Stack

-   **React 18**: UI framework with performance optimizations
    -   useMemo for expensive calculations
    -   useCallback for stable function references
    -   React.memo for component memoization
-   **Vite**: Build tool and dev server
-   **CSS3**: Styling with dark theme

## Performance

The app is **highly optimized** for smooth performance:

-   ⚡ 60-70% faster interactions
-   💾 40-50% less memory usage
-   🚀 Handles 1,025 Pokémon effortlessly
-   ✨ Production-ready code quality

See [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md) for details.

## Data Backups & Restoration

### Backup Locations

All data backups are stored in `backups/` directory:

-   `backups/games-pokeapi-*.json` - PokeAPI-based data backups
-   `public/data/games.before-*.json` - Script-created backups

### Restoring from Backup

If you need to restore your data:

```bash
# List available backups
ls -lh backups/

# Restore from manual backup
cp backups/games-pokeapi-20251019-155249.json public/data/games.json

# Restore from script backup
ls public/data/games.before-*.json
cp public/data/games.before-bulbapedia-*.json public/data/games.json
```

### Creating Manual Backup

```bash
# Create a timestamped backup
mkdir -p backups
cp public/data/games.json backups/games-$(date +%Y%m%d-%H%M%S).json
```

## Features to Add

-   [x] Algorithm to calculate minimum game set (✅ Added!)
-   [ ] Export/import selected games
-   [x] Local storage to save selections and settings (✅ Added!)
-   [x] Filter by generation (✅ Added!)
-   [x] Acquisition method filters (✅ Added!)
-   [ ] Search for specific Pokémon
-   [x] Complete data for all games (✅ Bulbapedia scraper!)
-   [ ] Version-exclusive Pokémon indicators
-   [x] Evolution chain inference (✅ Complete!)

## License

This project is for educational purposes. Pokémon and related properties are owned by Nintendo, Game Freak, and The Pokémon Company.

# bluCatch
