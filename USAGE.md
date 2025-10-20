# Pokémon Game Calculator - Usage Guide

## 🎮 What is This?

This web app helps you determine which Pokémon games you need to own in order to catch all Pokémon. Click on game box art to select games, and see in real-time which Pokémon become available!

## 🚀 Quick Start

The development server is already running! Open your browser and navigate to:

**http://localhost:5173**

If you need to start it manually:

```bash
npm run dev
```

## 📖 How to Use

### 1. **View Pokémon by Generation**

-   At the top of the page, you'll see all Pokémon organized by generation
-   Unavailable Pokémon are greyed out and desaturated
-   Available Pokémon are shown in full color

### 2. **Select Games**

-   Scroll down to see all mainline Pokémon games
-   Games are organized by generation
-   Click on any game's box art to select it
-   Selected games appear in full color with a blue border
-   Unselected games are greyed out

### 3. **Track Your Progress**

-   The overall progress bar at the top shows total catchable Pokémon
-   Each generation section shows its own availability count
-   Example: "5 / 10 available" means 5 out of 10 Pokémon in that generation are catchable

### 4. **Get Detailed Information**

-   **Hover over any Pokémon sprite** to see:
    -   Pokémon name and ID number
    -   Which games it's available in
    -   Where to find it in each game
-   This tooltip follows your mouse cursor

### 5. **Clear Selections**

-   Click the "Clear All Selections" button to start over

## 🎨 Features

-   **Dark Theme**: Easy on the eyes with a navy/dark grey background
-   **Interactive UI**: Smooth animations and transitions
-   **Responsive Design**: Works on desktop, tablet, and mobile
-   **Real-time Updates**: Pokémon availability updates instantly as you select games
-   **Visual Feedback**:
    -   Greyed out = unavailable
    -   Full color = available
    -   Blue highlights = selected games

## 📊 Current Data

The app currently includes:

-   **45 sample Pokémon** across all 9 generations (for demonstration)
-   **37 mainline games** from Red/Blue through Scarlet/Violet
-   Location data for where to find each Pokémon

## 🔧 Customization

### Adding More Pokémon

Edit `/public/data/pokemon.json`:

```json
{
	"id": 1,
	"name": "Bulbasaur",
	"generation": 1,
	"sprite": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png"
}
```

### Adding More Games

Edit `/public/data/games.json`:

```json
{
	"id": "red",
	"name": "Pokémon Red",
	"generation": 1,
	"boxArt": "/images/boxart/red.png",
	"pokemon": [{ "id": 1, "location": "Starter from Professor Oak" }]
}
```

### Replacing Box Art

Replace placeholder images in `/public/images/boxart/` with actual box art images. Keep the same filenames (e.g., `red.png`, `blue.png`, etc.).

## 🎯 Future Enhancements

Potential features to add:

-   Algorithm to suggest minimum game set
-   Save/load selections (localStorage)
-   Export data as JSON
-   Filter Pokémon by type
-   Search functionality
-   Complete data for all 1025 Pokémon
-   Trade-exclusive indicators
-   Version differences

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Generate placeholder box art (already done)
node scripts/generate-placeholders.js
```

## 📱 Responsive Design

The app adapts to different screen sizes:

-   **Desktop**: Full grid layout with large sprites
-   **Tablet**: Adjusted grid with medium sprites
-   **Mobile**: Compact layout with smaller sprites

## ⚡ Performance

-   Lazy loading for Pokémon sprites
-   Efficient state management
-   Minimal re-renders
-   Fast Vite development server

## 🎨 Color Scheme

-   Background: `#1a1d2e` (dark navy)
-   Primary accent: `#4a9eff` (blue)
-   Secondary accent: `#a8dadc` (light blue)
-   Cards: `rgba(44, 62, 80, 0.3)` (semi-transparent dark blue)

Enjoy catching them all! 🔴⚪
