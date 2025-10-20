# Enhanced Tooltips - Show All Games Feature

## Overview

The enhanced tooltip system now shows **ALL games** where a Pokémon can be found, not just the games you've currently selected. This helps users identify exactly which games they need to acquire to complete their Pokémon collection.

## The Problem

**Before**: When hovering over an unavailable Pokémon, the tooltip would just say "Not available in selected games" - not helpful for planning which games to buy!

**After**: The tooltip now shows ALL games where that Pokémon is available, with clear visual distinction between games you've selected and games you haven't.

## How It Works

### Visual Indicators

**Selected Games** (Games you have):

-   ✓ Checkmark indicator
-   Blue left border (3px)
-   Bright blue background (`rgba(74, 158, 255, 0.15)`)
-   Full opacity (100%)
-   Section header: "✓ Available in selected games:"

**Unselected Games** (Games you don't have):

-   ○ Circle indicator
-   Grey left border (3px, #555)
-   Dark grey background (`rgba(0, 0, 0, 0.15)`)
-   Dimmed opacity (60%)
-   Section header: "○ Also available in:" or "○ Available in (not selected):"

### Example Scenarios

#### Scenario 1: Pokémon Available in Selected Game

You have **Gold** selected and hover over **Steelix**:

```
Steelix #208

✓ Available in selected games:
  🔵 Pokémon Gold
     Evolve Onix

○ Also available in:
  ⚪ Pokémon Silver
     Evolve Onix
  ⚪ Pokémon Crystal
     Evolve Onix
```

**Insight**: "I can get Steelix in Gold (which I have), but if I want Silver or Crystal later, I can get it there too."

#### Scenario 2: Pokémon NOT Available in Selected Games

You have **Blue** selected and hover over **Steelix** (Gen 2 Pokémon):

```
Steelix #208

○ Available in (not selected):
  ⚪ Pokémon Gold
     Evolve Onix
  ⚪ Pokémon Silver
     Evolve Onix
  ⚪ Pokémon Crystal
     Evolve Onix
```

**Insight**: "Steelix isn't in Blue, but I can get it if I buy Gold, Silver, or Crystal."

#### Scenario 3: Multiple Games Selected

You have **Blue** and **Gold** selected, hover over **Pikachu**:

```
Pikachu #25

✓ Available in selected games:
  🔵 Pokémon Blue
     Viridian Forest
  🔵 Pokémon Gold
     Viridian Forest

○ Also available in:
  ⚪ Pokémon Red
     Viridian Forest
  ⚪ Pokémon Yellow
     Starter from Professor Oak
  ⚪ Pokémon FireRed
     Viridian Forest
  ⚪ Pokémon LeafGreen
     Viridian Forest
  (and more...)
```

**Insight**: "I can get Pikachu in Blue or Gold (which I have), and it's also in these other games if I need them."

## Use Cases

### 1. Planning Your Game Purchases

**Goal**: You want to complete your National Pokédex and need to decide which games to buy.

**Workflow**:

1. Select the games you currently own
2. Hover over unavailable (greyed out) Pokémon sprites
3. See which games have those Pokémon
4. Identify which game gives you the most missing Pokémon

**Example**: "I'm missing 50 Pokémon. Let me check which games they're in... looks like Emerald has 30 of them, so I'll buy that!"

### 2. Verifying Collection Completeness

**Goal**: Check if you can catch all Pokémon with your current games.

**Workflow**:

1. Select all games you own
2. Look at the greyed out Pokémon
3. Hover to see which additional games you'd need
4. Decide if it's worth purchasing more games

**Example**: "I have Red, Gold, and Ruby. I'm only missing 15 Pokémon, all available in FireRed. One more game and I'm done!"

### 3. Optimizing Game Selection

**Goal**: Find the minimum set of games needed to catch all Pokémon.

**Workflow**:

1. Start with no games selected
2. Pick one game with many Pokémon
3. Hover over unavailable Pokémon to find games with high coverage
4. Incrementally add games with the most uncovered Pokémon

**Example**: "Platinum has 399 Pokémon. That covers Gen 1-4. Now I need Gen 5-9..."

### 4. Smart Trade-Offs

**Goal**: Decide between similar games.

**Workflow**:

1. Select your current games
2. Consider two options (e.g., Sword vs Shield)
3. Hover over missing Pokémon to see which game has more you need
4. Make an informed decision

**Example**: "Sword has 5 version exclusives I need, Shield has 8. I'll get Shield!"

## Technical Implementation

### Data Flow

1. **Calculator** (`calculator.js`):

    ```javascript
    calculateAvailablePokemon(selectedGames, games, pokemon) {
      // Build two maps:
      // 1. availablePokemonMap - only selected games
      // 2. allPokemonGamesMap - ALL games with isSelected flag
      return { availableIds, pokemonGameMap, allPokemonGamesMap };
    }
    ```

2. **App Component** (`App.jsx`):

    ```javascript
    const { availableIds, pokemonGameMap, allPokemonGamesMap } = calculateAvailablePokemon(
    	selectedGames,
    	filteredGames,
    	filteredPokemon
    );

    <PokemonSprites
    	allPokemonGamesMap={allPokemonGamesMap}
    	// ... other props
    />;
    ```

3. **PokemonSprites** (`PokemonSprites.jsx`):

    ```javascript
    const allGames = allPokemonGamesMap.get(pokemonId);
    const selectedGames = allGames.filter((g) => g.isSelected);
    const unselectedGames = allGames.filter((g) => !g.isSelected);

    // Render both groups with different styling
    ```

### CSS Styling

```css
/* Selected games - highlighted */
.tooltip-game-selected {
	background: rgba(74, 158, 255, 0.15);
	border-left-color: #4a9eff;
	opacity: 1;
}

/* Unselected games - dimmed */
.tooltip-game-unselected {
	background: rgba(0, 0, 0, 0.15);
	border-left-color: #555;
	opacity: 0.6;
}

.tooltip-game-unselected:hover {
	opacity: 0.8; /* Slightly brighter on hover */
}
```

### Data Structure

Each game entry in the tooltip includes:

```javascript
{
  gameId: "gold",
  gameName: "Pokémon Gold",
  location: "Evolve Onix",
  isSelected: true // or false
}
```

## Benefits

### For Users

1. **Better Planning** - See exactly which games you need
2. **Informed Decisions** - Compare game coverage before buying
3. **Completeness Tracking** - Identify gaps in your collection
4. **No Guessing** - Always know where to find any Pokémon

### For the App

1. **More Useful** - Helps users achieve their goal (catch 'em all)
2. **Educational** - Shows Pokémon availability across all games
3. **Professional** - Clear visual hierarchy and information design
4. **Comprehensive** - Uses all available data, not just selected games

## Visual Design

### Color Coding

| Element               | Color                    | Purpose                 |
| --------------------- | ------------------------ | ----------------------- |
| Selected border       | #4a9eff (blue)           | Indicates owned games   |
| Unselected border     | #555 (grey)              | Indicates unowned games |
| Selected background   | rgba(74, 158, 255, 0.15) | Highlights available    |
| Unselected background | rgba(0, 0, 0, 0.15)      | Subdues unavailable     |
| Selected text         | #ffffff (white)          | High contrast           |
| Unselected text       | #aaa (light grey)        | Lower contrast          |

### Typography

-   **Section headers**: Bold, colored (blue for selected, grey for unselected)
-   **Game names**: Bold
-   **Locations**: Italic, slightly smaller font
-   **Indicators**: ✓ for selected, ○ for unselected

### Layout

```
┌─────────────────────────────────────┐
│ Pokémon Name            #ID         │
├─────────────────────────────────────┤
│ ✓ Available in selected games:      │
│ ┌───────────────────────────────┐   │
│ │🔵 Game Name                   │   │
│ │   Location                    │   │
│ └───────────────────────────────┘   │
│                                     │
│ ○ Also available in:                │
│ ┌───────────────────────────────┐   │
│ │⚫ Game Name (dimmed)          │   │
│ │   Location (dimmed)           │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Performance

### Efficiency

-   **Single calculation**: All games computed once in calculator
-   **No re-rendering**: Only tooltip updates on hover
-   **Fast lookups**: Map data structure for O(1) access
-   **Lazy rendering**: Tooltip only renders when hovering

### Scalability

-   Works with all 1,025 Pokémon
-   Handles 37 games efficiently
-   No performance degradation with more selections

## Future Enhancements

### Possible Improvements

1. **Click to Select Game** - Click an unselected game in tooltip to add it
2. **Game Coverage Stats** - Show "This game has X Pokémon you need"
3. **Highlight Exclusives** - Mark version-exclusive Pokémon specially
4. **Sort Options** - Order games by usefulness/coverage
5. **Compact Mode** - Toggle to show only unselected games
6. **Game Icons** - Show small box art icons instead of text

### Advanced Features

1. **Minimum Set Suggestion** - "Buy these 3 games to get all Pokémon"
2. **Cost Analysis** - Factor in game prices for budget planning
3. **Trade Requirements** - Show if Pokémon requires player trading
4. **Rarity Information** - Indicate hard-to-find Pokémon

## Files Modified

-   ✅ `src/utils/calculator.js` - Added allPokemonGamesMap tracking
-   ✅ `src/App.jsx` - Pass new data to PokemonSprites
-   ✅ `src/components/PokemonSprites.jsx` - Enhanced tooltip rendering
-   ✅ `src/styles/PokemonSprites.css` - Visual styling for selection states

## Summary

The enhanced tooltip feature transforms the app from a simple availability checker into a **comprehensive game planning tool**. Users can now:

-   ✅ See where ANY Pokémon is available (not just selected games)
-   ✅ Plan which games to purchase for maximum coverage
-   ✅ Make informed decisions based on visual data
-   ✅ Track their progress toward "catching 'em all"

This feature aligns perfectly with the app's core goal: **helping users determine the minimum set of games needed to catch all Pokémon**.

---

**Implemented**: October 19, 2025  
**Feature**: Enhanced tooltips with all games  
**Status**: ✅ COMPLETE
