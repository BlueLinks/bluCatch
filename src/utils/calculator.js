/**
 * Detect acquisition method from location string
 * @param {string} location - Location description
 * @returns {string} Acquisition method ID
 */
function detectAcquisitionMethod(location) {
  const lowerLocation = location.toLowerCase();
  
  // Event detection
  if (lowerLocation.includes('event') || 
      lowerLocation.includes('distribution') ||
      lowerLocation.includes('mystery gift')) {
    return 'event';
  }
  
  // Trade evolution detection
  if (lowerLocation.includes('trade') && 
      (lowerLocation.includes('evolve') || lowerLocation.includes('evolution'))) {
    return 'trade-evolution';
  }
  
  // In-game trade detection
  if (lowerLocation.includes('trade') || lowerLocation.includes('npc')) {
    return 'trade';
  }
  
  // Evolution detection
  if (lowerLocation.includes('evolve') || lowerLocation.includes('evolution')) {
    return 'evolution';
  }
  
  // Gift/starter detection
  if (lowerLocation.includes('gift') || 
      lowerLocation.includes('starter') ||
      lowerLocation.includes('professor') ||
      lowerLocation.includes('given')) {
    return 'gift';
  }
  
  // Fossil detection
  if (lowerLocation.includes('fossil') || lowerLocation.includes('revive')) {
    return 'fossil';
  }
  
  // Dream Radar detection
  if (lowerLocation.includes('dream radar')) {
    return 'dream-radar';
  }
  
  // Pokewalker detection
  if (lowerLocation.includes('pokewalker') || lowerLocation.includes('pokéwalker')) {
    return 'pokewalker';
  }
  
  // Special methods
  if (lowerLocation.includes('special') || 
      lowerLocation.includes('unique') ||
      lowerLocation.includes('sinjoh')) {
    return 'special';
  }
  
  // Default to wild encounter
  return 'wild';
}

/**
 * Check if a location is a valid acquisition method (not just a transfer)
 * @param {string} location - Location string
 * @returns {boolean} True if it's a valid acquisition method
 */
function isValidAcquisitionMethod(location) {
  const invalidMethods = [
    'trade',
    'poké transfer',
    'poke transfer',
    'pal park',
    'time capsule',
    'poké transporter',
    'poke transporter',
    'pokémon bank',
    'pokemon bank',
    'pokémon home',
    'pokemon home'
  ];
  
  const locationLower = location.toLowerCase();
  
  // Check if the location is ONLY one of these methods (not a specific trade like "In-game trade")
  const isOnlyTransferMethod = invalidMethods.some(method => 
    locationLower === method || locationLower === method + ',' || locationLower === method + '.'
  );
  
  return !isOnlyTransferMethod;
}

/**
 * Calculate which Pokemon are available based on selected games
 * Also builds a map of ALL games where each Pokemon can be found
 * @param {Array} selectedGames - Array of game IDs that are selected
 * @param {Array} games - Array of all games with their Pokemon
 * @param {Array} pokemon - Array of all Pokemon
 * @param {Object} enabledMethods - Object with acquisition method filters (optional)
 * @returns {Object} Object with available Pokemon IDs and game mappings
 */
export function calculateAvailablePokemon(selectedGames, games, pokemon, enabledMethods = {}) {
  const availablePokemonMap = new Map(); // Map of pokemon ID to array of {gameId, location, isSelected}
  const allPokemonGamesMap = new Map(); // Map of pokemon ID to ALL games (selected or not)
  
  // First, build a map of ALL games where each Pokemon appears
  games.forEach(game => {
    game.pokemon.forEach(pokemonEntry => {
      // Skip transfer-only methods that aren't real acquisition methods
      if (!isValidAcquisitionMethod(pokemonEntry.location)) {
        return;
      }
      
      const method = detectAcquisitionMethod(pokemonEntry.location);
      const isMethodEnabled = enabledMethods[method] !== false; // Default to enabled
      
      if (!allPokemonGamesMap.has(pokemonEntry.id)) {
        allPokemonGamesMap.set(pokemonEntry.id, []);
      }
      allPokemonGamesMap.get(pokemonEntry.id).push({
        gameId: game.id,
        gameName: game.name,
        location: pokemonEntry.location,
        method: method,
        isSelected: selectedGames.includes(game.id) && isMethodEnabled,
        methodDisabled: !isMethodEnabled
      });
    });
  });
  
  // Build the availability map (only selected games)
  const selectedGameObjects = games.filter(game => selectedGames.includes(game.id));
  
  selectedGameObjects.forEach(game => {
    game.pokemon.forEach(pokemonEntry => {
      // Skip transfer-only methods that aren't real acquisition methods
      if (!isValidAcquisitionMethod(pokemonEntry.location)) {
        return;
      }
      
      const method = detectAcquisitionMethod(pokemonEntry.location);
      const isMethodEnabled = enabledMethods[method] !== false;
      
      // Only add if the acquisition method is enabled
      if (isMethodEnabled) {
        if (!availablePokemonMap.has(pokemonEntry.id)) {
          availablePokemonMap.set(pokemonEntry.id, []);
        }
        availablePokemonMap.get(pokemonEntry.id).push({
          gameId: game.id,
          gameName: game.name,
          location: pokemonEntry.location,
          method: method,
          isSelected: true
        });
      }
    });
  });
  
  return {
    availableIds: Array.from(availablePokemonMap.keys()),
    pokemonGameMap: availablePokemonMap,
    allPokemonGamesMap: allPokemonGamesMap // New: shows ALL games for each Pokemon
  };
}

/**
 * Group Pokemon by generation and calculate availability stats
 * @param {Array} pokemon - Array of all Pokemon
 * @param {Set} availableIds - Set of available Pokemon IDs
 * @returns {Object} Object with generation-based grouping and stats
 */
export function groupPokemonByGeneration(pokemon, availableIds) {
  const generations = {};
  
  pokemon.forEach(pkmn => {
    if (!generations[pkmn.generation]) {
      generations[pkmn.generation] = {
        total: 0,
        available: 0,
        pokemon: []
      };
    }
    
    const isAvailable = availableIds.has(pkmn.id);
    generations[pkmn.generation].total++;
    if (isAvailable) {
      generations[pkmn.generation].available++;
    }
    generations[pkmn.generation].pokemon.push({
      ...pkmn,
      isAvailable
    });
  });
  
  return generations;
}

/**
 * Calculate overall statistics
 * @param {Array} pokemon - Array of all Pokemon
 * @param {Set} availableIds - Set of available Pokemon IDs
 * @returns {Object} Overall stats
 */
export function calculateStats(pokemon, availableIds) {
  return {
    total: pokemon.length,
    available: availableIds.size,
    percentage: pokemon.length > 0 ? Math.round((availableIds.size / pokemon.length) * 100) : 0
  };
}

/**
 * Calculate suggested games to complete the collection
 * Uses greedy algorithm to find games with most missing Pokemon
 * @param {Array} selectedGames - Currently selected game IDs
 * @param {Array} allGames - All available games
 * @param {Array} allPokemon - All Pokemon
 * @param {Set} availableIds - Currently available Pokemon IDs
 * @returns {Array} Suggested games with coverage info
 */
export function calculateSuggestedGames(selectedGames, allGames, allPokemon, availableIds) {
  // Get all unselected games
  const unselectedGames = allGames.filter(game => !selectedGames.includes(game.id));
  
  // Find missing Pokemon (not yet available)
  const missingPokemonIds = new Set(
    allPokemon.map(p => p.id).filter(id => !availableIds.has(id))
  );
  
  if (missingPokemonIds.size === 0) {
    // Already have all Pokemon!
    return [];
  }
  
  // Calculate coverage for each unselected game
  const gameCoverage = unselectedGames.map(game => {
    // Count how many missing Pokemon this game has
    const missingInThisGame = game.pokemon.filter(p => missingPokemonIds.has(p.id));
    const uniqueMissing = new Set(missingInThisGame.map(p => p.id));
    
    return {
      gameId: game.id,
      gameName: game.name,
      generation: game.generation,
      platform: game.platform,
      boxArt: game.boxArt,
      missingPokemonCount: uniqueMissing.size,
      coveragePercentage: missingPokemonIds.size > 0 
        ? Math.round((uniqueMissing.size / missingPokemonIds.size) * 100) 
        : 0,
      missingPokemonIds: Array.from(uniqueMissing)
    };
  });
  
  // Sort by coverage (most missing Pokemon first)
  gameCoverage.sort((a, b) => b.missingPokemonCount - a.missingPokemonCount);
  
  // Return top suggestions
  return gameCoverage.filter(g => g.missingPokemonCount > 0);
}

/**
 * Calculate minimum game set using greedy algorithm
 * @param {Array} selectedGames - Currently selected game IDs
 * @param {Array} allGames - All available games
 * @param {Array} allPokemon - All Pokemon
 * @param {Set} availableIds - Currently available Pokemon IDs
 * @param {number} maxGames - Maximum games to suggest (default 5)
 * @returns {Object} Minimum set info
 */
export function calculateMinimumGameSet(selectedGames, allGames, allPokemon, availableIds, maxGames = 5) {
  const missingPokemonIds = new Set(
    allPokemon.map(p => p.id).filter(id => !availableIds.has(id))
  );
  
  if (missingPokemonIds.size === 0) {
    return {
      complete: true,
      suggestedGames: [],
      totalMissing: 0
    };
  }
  
  // Greedy algorithm: keep picking game with most uncovered Pokemon
  const remainingMissing = new Set(missingPokemonIds);
  const suggestedGames = [];
  const unselectedGames = allGames.filter(g => !selectedGames.includes(g.id));
  
  while (remainingMissing.size > 0 && suggestedGames.length < maxGames) {
    let bestGame = null;
    let bestCoverage = 0;
    let bestCoveredIds = [];
    
    // Find game that covers the most remaining missing Pokemon
    for (const game of unselectedGames) {
      if (suggestedGames.some(sg => sg.gameId === game.id)) continue;
      
      const coveredByThisGame = game.pokemon
        .filter(p => remainingMissing.has(p.id))
        .map(p => p.id);
      
      if (coveredByThisGame.length > bestCoverage) {
        bestCoverage = coveredByThisGame.length;
        bestGame = game;
        bestCoveredIds = coveredByThisGame;
      }
    }
    
    if (!bestGame || bestCoverage === 0) break;
    
    // Add this game to suggestions
    suggestedGames.push({
      gameId: bestGame.id,
      gameName: bestGame.name,
      generation: bestGame.generation,
      platform: bestGame.platform,
      boxArt: bestGame.boxArt,
      coversCount: bestCoverage,
      coveragePercentage: Math.round((bestCoverage / missingPokemonIds.size) * 100)
    });
    
    // Remove covered Pokemon from remaining
    bestCoveredIds.forEach(id => remainingMissing.delete(id));
  }
  
  return {
    complete: remainingMissing.size === 0,
    suggestedGames,
    totalMissing: missingPokemonIds.size,
    remainingAfterSuggestions: remainingMissing.size,
    coveragePercentage: Math.round(((missingPokemonIds.size - remainingMissing.size) / missingPokemonIds.size) * 100)
  };
}

