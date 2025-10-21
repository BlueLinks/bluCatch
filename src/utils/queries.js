import { query } from './database.js';

/**
 * Get all Pokemon, optionally filtered by generation
 * @param {Object} enabledGenerations - Object with generation numbers as keys
 * @returns {Array} Array of Pokemon objects
 */
export function getAllPokemon(enabledGenerations = null) {
  if (!enabledGenerations) {
    return query('SELECT * FROM pokemon ORDER BY id');
  }
  
  const enabledGens = Object.keys(enabledGenerations)
    .filter(gen => enabledGenerations[gen])
    .map(Number);
  
  if (enabledGens.length === 0) {
    return [];
  }
  
  const placeholders = enabledGens.map(() => '?').join(',');
  return query(
    `SELECT * FROM pokemon WHERE generation IN (${placeholders}) ORDER BY id`,
    enabledGens
  );
}

/**
 * Get all games, optionally filtered by generation
 * @param {Object} enabledGenerations - Object with generation numbers as keys
 * @returns {Array} Array of game objects
 */
export function getAllGames(enabledGenerations = null) {
  if (!enabledGenerations) {
    return query('SELECT * FROM games ORDER BY generation, name');
  }
  
  const enabledGens = Object.keys(enabledGenerations)
    .filter(gen => enabledGenerations[gen])
    .map(Number);
  
  if (enabledGens.length === 0) {
    return [];
  }
  
  const placeholders = enabledGens.map(() => '?').join(',');
  return query(
    `SELECT * FROM games WHERE generation IN (${placeholders}) ORDER BY generation, name`,
    enabledGens
  );
}

/**
 * Get available Pokemon based on selected games and enabled acquisition methods
 * @param {Array} selectedGames - Array of game IDs
 * @param {Object} enabledGenerations - Enabled generations filter
 * @param {Object} enabledMethods - Enabled acquisition methods
 * @returns {Object} Object with availableIds, pokemonGameMap, allPokemonGamesMap
 */
export function getAvailablePokemon(selectedGames, enabledGenerations, enabledMethods) {
  // Get all filtered pokemon
  const allPokemon = getAllPokemon(enabledGenerations);
  
  // Build enabled methods list
  const methodsList = Object.keys(enabledMethods).filter(m => enabledMethods[m] !== false);
  
  // Get all encounters for all pokemon (for tooltips) with enhanced data
  const allEncounters = query(`
    SELECT 
      e.pokemon_id,
      e.game_id,
      g.name as game_name,
      e.location,
      e.acquisition_method,
      e.encounter_area,
      e.encounter_rate,
      e.level_range,
      e.time_of_day,
      e.season,
      e.special_requirements,
      l.name as location_name,
      CASE WHEN e.game_id IN (${selectedGames.map(() => '?').join(',') || 'NULL'}) THEN 1 ELSE 0 END as is_selected
    FROM encounters e
    JOIN games g ON e.game_id = g.id
    LEFT JOIN locations l ON e.location_id = l.id
    ORDER BY g.generation, g.name
  `, selectedGames.length > 0 ? selectedGames : []);
  
  // Build allPokemonGamesMap (all games where each pokemon appears) with enhanced data
  const allPokemonGamesMap = new Map();
  allEncounters.forEach(enc => {
    if (!allPokemonGamesMap.has(enc.pokemon_id)) {
      allPokemonGamesMap.set(enc.pokemon_id, []);
    }
    
    const isMethodEnabled = enabledMethods[enc.acquisition_method] !== false;
    allPokemonGamesMap.get(enc.pokemon_id).push({
      gameId: enc.game_id,
      gameName: enc.game_name,
      location: enc.location,
      locationName: enc.location_name,
      method: enc.acquisition_method,
      encounterArea: enc.encounter_area,
      encounterRate: enc.encounter_rate,
      levelRange: enc.level_range,
      timeOfDay: enc.time_of_day,
      season: enc.season,
      specialRequirements: enc.special_requirements ? JSON.parse(enc.special_requirements) : null,
      isSelected: enc.is_selected === 1 && isMethodEnabled,
      methodDisabled: !isMethodEnabled
    });
  });
  
  if (selectedGames.length === 0 || methodsList.length === 0) {
    return {
      availableIds: [],
      pokemonGameMap: new Map(),
      allPokemonGamesMap
    };
  }
  
  // Get available pokemon from selected games with enabled methods
  const gamePlaceholders = selectedGames.map(() => '?').join(',');
  const methodPlaceholders = methodsList.map(() => '?').join(',');
  
  const availableEncounters = query(`
    SELECT DISTINCT
      e.pokemon_id,
      e.game_id,
      g.name as game_name,
      e.location,
      e.acquisition_method,
      e.encounter_area,
      e.encounter_rate,
      e.level_range,
      e.time_of_day,
      e.season,
      e.special_requirements,
      l.name as location_name
    FROM encounters e
    JOIN games g ON e.game_id = g.id
    LEFT JOIN locations l ON e.location_id = l.id
    WHERE e.game_id IN (${gamePlaceholders})
      AND e.acquisition_method IN (${methodPlaceholders})
    ORDER BY g.generation, g.name
  `, [...selectedGames, ...methodsList]);
  
  // Build pokemonGameMap (only selected games) with enhanced data
  const pokemonGameMap = new Map();
  availableEncounters.forEach(enc => {
    if (!pokemonGameMap.has(enc.pokemon_id)) {
      pokemonGameMap.set(enc.pokemon_id, []);
    }
    pokemonGameMap.get(enc.pokemon_id).push({
      gameId: enc.game_id,
      gameName: enc.game_name,
      location: enc.location,
      locationName: enc.location_name,
      method: enc.acquisition_method,
      encounterArea: enc.encounter_area,
      encounterRate: enc.encounter_rate,
      levelRange: enc.level_range,
      timeOfDay: enc.time_of_day,
      season: enc.season,
      specialRequirements: enc.special_requirements ? JSON.parse(enc.special_requirements) : null,
      isSelected: true
    });
  });
  
  const availableIds = Array.from(pokemonGameMap.keys());
  
  return {
    availableIds,
    pokemonGameMap,
    allPokemonGamesMap
  };
}

/**
 * Group Pokemon by generation with availability stats
 * @param {Array} pokemon - All pokemon
 * @param {Set} availableIds - Set of available pokemon IDs
 * @returns {Object} Generation data with stats
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
 * @param {Array} pokemon - All pokemon
 * @param {Set} availableIds - Set of available pokemon IDs
 * @returns {Object} Stats object
 */
export function calculateStats(pokemon, availableIds) {
  return {
    total: pokemon.length,
    available: availableIds.size,
    percentage: pokemon.length > 0 ? Math.round((availableIds.size / pokemon.length) * 100) : 0
  };
}

/**
 * Calculate minimum game set suggestions using greedy algorithm
 * @param {Array} selectedGames - Currently selected game IDs
 * @param {Array} allGames - All available games
 * @param {Array} allPokemon - All Pokemon
 * @param {Set} availableIds - Currently available Pokemon IDs
 * @param {number} maxGames - Maximum games to suggest
 * @returns {Object} Suggestion object
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
  
  // Get encounter counts for unselected games
  const unselectedGameIds = allGames
    .filter(g => !selectedGames.includes(g.id))
    .map(g => g.id);
  
  if (unselectedGameIds.length === 0) {
    return {
      complete: false,
      suggestedGames: [],
      totalMissing: missingPokemonIds.size,
      remainingAfterSuggestions: missingPokemonIds.size,
      coveragePercentage: 0
    };
  }
  
  // Get pokemon counts per unselected game (only for missing pokemon)
  const missingPokemonList = Array.from(missingPokemonIds);
  const gameCoverage = query(`
    SELECT 
      g.id as game_id,
      g.name as game_name,
      g.generation,
      g.platform,
      g.box_art,
      COUNT(DISTINCT e.pokemon_id) as missing_count
    FROM games g
    JOIN encounters e ON g.id = e.game_id
    WHERE g.id IN (${unselectedGameIds.map(() => '?').join(',')})
      AND e.pokemon_id IN (${missingPokemonList.map(() => '?').join(',')})
    GROUP BY g.id
    ORDER BY missing_count DESC
  `, [...unselectedGameIds, ...missingPokemonList]);
  
  // Greedy algorithm: keep picking game with most uncovered Pokemon
  const remainingMissing = new Set(missingPokemonIds);
  const suggestedGames = [];
  
  while (remainingMissing.size > 0 && suggestedGames.length < maxGames && gameCoverage.length > 0) {
    let bestGame = null;
    let bestCoverage = 0;
    let bestCoveredIds = [];
    
    // Find game that covers the most remaining missing Pokemon
    for (const gameData of gameCoverage) {
      if (suggestedGames.some(sg => sg.gameId === gameData.game_id)) {
        continue;
      }
      
      // Get pokemon this game covers from remaining missing
      const remainingList = Array.from(remainingMissing);
      const coveredByGame = query(`
        SELECT DISTINCT pokemon_id
        FROM encounters
        WHERE game_id = ?
          AND pokemon_id IN (${remainingList.map(() => '?').join(',')})
      `, [gameData.game_id, ...remainingList]);
      
      const coveredIds = coveredByGame.map(r => r.pokemon_id);
      
      if (coveredIds.length > bestCoverage) {
        bestCoverage = coveredIds.length;
        bestGame = gameData;
        bestCoveredIds = coveredIds;
      }
    }
    
    if (!bestGame || bestCoverage === 0) break;
    
    // Add this game to suggestions
    suggestedGames.push({
      gameId: bestGame.game_id,
      gameName: bestGame.game_name,
      generation: bestGame.generation,
      platform: bestGame.platform,
      boxArt: bestGame.box_art,
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

/**
 * Get detailed information about a specific Pokemon
 * Useful for detail pages
 * @param {number} pokemonId - Pokemon ID
 * @returns {Object} Pokemon details with all encounters
 */
export function getPokemonDetails(pokemonId) {
  const pokemon = query(
    'SELECT * FROM pokemon WHERE id = ?',
    [pokemonId]
  )[0];
  
  if (!pokemon) {
    return null;
  }
  
  const encounters = query(`
    SELECT 
      g.id as game_id,
      g.name as game_name,
      g.generation,
      g.platform,
      g.box_art,
      e.location,
      e.acquisition_method,
      e.encounter_area,
      e.encounter_rate,
      e.level_range,
      e.time_of_day,
      e.season,
      e.special_requirements,
      l.name as location_name,
      l.location_type
    FROM encounters e
    JOIN games g ON e.game_id = g.id
    LEFT JOIN locations l ON e.location_id = l.id
    WHERE e.pokemon_id = ?
    ORDER BY g.generation, g.name
  `, [pokemonId]);
  
  return {
    ...pokemon,
    encounters
  };
}

/**
 * Get all Pokemon in a specific game
 * @param {string} gameId - Game ID
 * @returns {Array} Array of pokemon with encounter details
 */
export function getPokemonInGame(gameId) {
  return query(`
    SELECT 
      p.id,
      p.name,
      p.generation,
      p.sprite_url,
      e.location,
      e.acquisition_method
    FROM pokemon p
    JOIN encounters e ON p.id = e.pokemon_id
    WHERE e.game_id = ?
    ORDER BY p.id
  `, [gameId]);
}

