# Settings Menu Guide

## Overview

The Settings menu allows you to customize which Pokémon generations are displayed in the app, making it easier to focus on specific eras of Pokémon games.

## Accessing Settings

Click the **⚙️ Settings** button in the top-right corner of the app to open the settings modal.

## Features

### Generation Filters

Toggle individual generations on/off to control what's displayed:

-   **Generation 1 (Kanto)** - Red, Blue, Yellow
-   **Generation 2 (Johto)** - Gold, Silver, Crystal
-   **Generation 3 (Hoenn)** - Ruby, Sapphire, Emerald
-   **Generation 4 (Sinnoh)** - Diamond, Pearl, Platinum
-   **Generation 5 (Unova)** - Black, White, Black 2, White 2
-   **Generation 6 (Kalos)** - X, Y
-   **Generation 7 (Alola)** - Sun, Moon, Ultra Sun, Ultra Moon
-   **Generation 8 (Galar)** - Sword, Shield
-   **Generation 9 (Paldea)** - Scarlet, Violet

### Quick Actions

-   **Enable All** - Turn on all generations at once
-   **Disable All** - Turn off all generations at once

## What Gets Filtered

When you disable a generation, the following are hidden:

1. **Pokémon Sprites** - All Pokémon from that generation
2. **Game Selection** - All games from that generation
3. **Statistics** - Counts update to reflect only enabled generations
4. **Progress Tracking** - Generation sections are hidden

## Use Cases

### Focus on Classic Pokémon

**Goal**: Only see original 151 Pokémon  
**Action**: Disable Generations 2-9, keep only Generation 1 enabled

### Modern Games Only

**Goal**: Focus on recent releases  
**Action**: Disable Generations 1-7, enable only Generations 8-9

### Skip a Generation

**Goal**: You never played Gen 6, want to ignore it  
**Action**: Disable only Generation 6

### Compare Generations

**Goal**: See how Gen 1 and Gen 5 compare  
**Action**: Enable only Generations 1 and 5

## Visual Indicators

-   **✓ Enabled** - Blue background, checkmark visible
-   **Disabled** - Dark background, no checkmark
-   **Hover** - Border highlights when hovering

## Technical Details

### State Management

Settings are stored in React state and applied in real-time. Changes are:

-   **Instant** - No page reload required
-   **Client-side only** - Not saved between sessions (yet)
-   **Reversible** - Can toggle back anytime

### Filtering Logic

The app filters at multiple levels:

1. Pokémon list filtered by generation
2. Games list filtered by generation
3. Statistics recalculated for filtered data
4. Selected games remain selected even if hidden

### Performance

Filtering is highly efficient:

-   Runs on every render cycle
-   Uses JavaScript `filter()` method
-   No noticeable performance impact
-   Handles all 1,025 Pokémon smoothly

## Future Enhancements

Planned improvements:

-   [ ] Save settings to localStorage (persist between sessions)
-   [ ] Additional filters (by type, region, etc.)
-   [ ] Quick presets (Classic, Modern, Favorites)
-   [ ] Export/import settings
-   [ ] Dark/Light theme toggle

## Keyboard Shortcuts

Currently not implemented, but planned:

-   `Ctrl/Cmd + ,` - Open settings
-   `Esc` - Close settings modal

## Accessibility

The settings modal is designed to be accessible:

-   **Keyboard navigation** - Tab through options
-   **Screen reader friendly** - Proper labels and ARIA attributes
-   **High contrast** - Visible in dark theme
-   **Click targets** - Large, easy-to-click areas

## Tips

1. **Start broad** - Enable all generations, then disable what you don't need
2. **Experiment** - Toggle generations to see how your collection changes
3. **Focus mode** - Disable everything except one generation for focused tracking
4. **Quick toggle** - Use "Enable All" to quickly reset

## Troubleshooting

### Settings button not visible

-   Check top-right corner of the screen
-   Try scrolling to top of page
-   Refresh the page if needed

### Changes not applying

-   Make sure you're clicking the checkboxes
-   Close and reopen settings to verify state
-   Check browser console for errors

### All Pokémon disappeared

-   You may have disabled all generations
-   Click "Enable All" to restore
-   Or individually enable desired generations

## Related Features

-   **Game Selection** - Works alongside generation filters
-   **Evolution Chains** - Filtered by generation
-   **Statistics** - Automatically updated for enabled generations

---

**Need help?** Check the main [README.md](./README.md) or [USAGE.md](./USAGE.md) for more information.
