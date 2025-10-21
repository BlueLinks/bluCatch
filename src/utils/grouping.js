/**
 * Shared grouping utilities for Pokemon game displays
 * Used by both PokemonSprites (tooltips) and PokemonBottomSheet
 */

/**
 * Group encounters by game, then list locations under each game
 * Returns array of games with their locations
 */
export const groupByGameThenLocation = (games) => {
  const gameGroups = {};
  
  games.forEach(game => {
    // Create a unique key for each game (accounting for version pairs)
    const gameKey = game.gameName;
    
    if (!gameGroups[gameKey]) {
      gameGroups[gameKey] = {
        gameName: game.gameName,
        gameId: game.gameId,
        locations: []
      };
    }
    
    // Add location to this game's list
    gameGroups[gameKey].locations.push({
      location: game.location,
      encounterArea: game.encounterArea,
      encounterRate: game.encounterRate,
      levelRange: game.levelRange,
      timeOfDay: game.timeOfDay,
      season: game.season,
      specialRequirements: game.specialRequirements
    });
  });
  
  return Object.values(gameGroups);
};

/**
 * Group games by location and deduplicate
 * Preserves encounter details (rates, levels, areas, etc.)
 */
export const groupGamesByLocation = (games) => {
  const locationGroups = {};
  
  games.forEach(game => {
    const key = game.location;
    if (!locationGroups[key]) {
      locationGroups[key] = {
        location: game.location,
        games: [],
        gameIdsSeen: new Set(),
        // Store encounter details from first game (should be same for same location)
        encounterRate: game.encounterRate,
        levelRange: game.levelRange,
        encounterArea: game.encounterArea,
        timeOfDay: game.timeOfDay,
        season: game.season,
        specialRequirements: game.specialRequirements
      };
    }
    
    // Only add game if we haven't seen this gameId + gameName combination for this location
    const gameKey = `${game.gameId}-${game.gameName}`;
    if (!locationGroups[key].gameIdsSeen.has(gameKey)) {
      locationGroups[key].gameIdsSeen.add(gameKey);
      locationGroups[key].games.push(game);
    }
  });
  
  // Remove the gameIdsSeen set before returning and sort by number of games (descending)
  return Object.values(locationGroups)
    .map(({ gameIdsSeen, ...rest }) => rest)
    .sort((a, b) => b.games.length - a.games.length);
};

/**
 * Group games by generation
 */
export const groupGamesByGeneration = (games) => {
  const byGen = {};
  games.forEach(game => {
    const gen = getGameGeneration(game.gameName);
    if (!byGen[gen]) {
      byGen[gen] = [];
    }
    byGen[gen].push(game);
  });
  return byGen;
};

/**
 * Get generation number from game name
 */
export const getGameGeneration = (gameName) => {
  const GAME_GENERATION_MAP = {
    'Red': 1, 'Blue': 1, 'Yellow': 1,
    'Gold': 2, 'Silver': 2, 'Crystal': 2,
    'Ruby': 3, 'Sapphire': 3, 'Emerald': 3, 'FireRed': 3, 'LeafGreen': 3,
    'Diamond': 4, 'Pearl': 4, 'Platinum': 4, 'HeartGold': 4, 'SoulSilver': 4,
    'Black': 5, 'White': 5, 'Black 2': 6, 'White 2': 6,
    'X': 6, 'Y': 6, 'Omega Ruby': 6, 'Alpha Sapphire': 6,
    'Sun': 7, 'Moon': 7, 'Ultra Sun': 7, 'Ultra Moon': 7,
    'Sword': 8, 'Shield': 8, 'Brilliant Diamond': 8, 'Shining Pearl': 8,
    "Let's Go, Pikachu!": 99, "Let's Go, Eevee!": 99,
    'Scarlet': 9, 'Violet': 9
  };
  
  // Try exact match first
  if (GAME_GENERATION_MAP[gameName]) {
    return GAME_GENERATION_MAP[gameName];
  }
  
  // Try with "Pokémon " prefix
  const withPrefix = gameName.replace('Pokémon ', '');
  if (GAME_GENERATION_MAP[withPrefix]) {
    return GAME_GENERATION_MAP[withPrefix];
  }
  
  // Fallback: try to find partial match
  for (const [game, gen] of Object.entries(GAME_GENERATION_MAP)) {
    if (gameName.includes(game)) {
      return gen;
    }
  }
  
  return 99; // Unknown
};

/**
 * Simplify game name for display
 */
export const simplifyGameName = (fullName) => {
  return fullName.replace('Pokémon ', '');
};

