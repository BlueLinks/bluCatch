import { query } from './database.js';

/**
 * Convert snake_case keys to camelCase
 */
const toCamelCase = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const convertKeysToCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase);
  
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = toCamelCase(key);
    acc[camelKey] = convertKeysToCamelCase(obj[key]);
    return acc;
  }, {});
};

/**
 * Get all Pokemon, optionally filtered by generation
 * @param {Object} enabledGenerations - Object with generation numbers as keys
 * @returns {Promise<Array>} Array of Pokemon objects
 */
export function getAllPokemon(enabledGenerations = null) {
  const params = {};
  if (enabledGenerations) {
    const gens = Object.keys(enabledGenerations)
      .filter(gen => enabledGenerations[gen])
      .join(',');
    if (!gens) return Promise.resolve([]);
    params.generations = gens;
  }
  return query('/api/pokemon', params);
}

/**
 * Get all games, optionally filtered by generation
 * @param {Object} enabledGenerations - Object with generation numbers as keys
 * @returns {Promise<Array>} Array of game objects
 */
export function getAllGames(enabledGenerations = null) {
  const params = {};
  if (enabledGenerations) {
    const gens = Object.keys(enabledGenerations)
      .filter(gen => enabledGenerations[gen])
      .join(',');
    if (!gens) return Promise.resolve([]);
    params.generations = gens;
  }
  return query('/api/games', params);
}

/**
 * Get available Pokemon for selected games
 * @param {Array} selectedGames - Array of game IDs
 * @param {Object} acquisitionFilters - Object with acquisition methods as keys
 * @param {Object} enabledGenerations - Object with generation numbers as keys
 * @returns {Promise<Array>} Array of encounters
 */
export async function getAvailablePokemon(selectedGames, acquisitionFilters, enabledGenerations) {
  const params = {
    gameIds: selectedGames.join(',')
  };
  
  if (acquisitionFilters) {
    const methods = Object.keys(acquisitionFilters)
      .filter(method => acquisitionFilters[method])
      .join(',');
    if (methods) params.acquisitionMethods = methods;
  }
  
  if (enabledGenerations) {
    const gens = Object.keys(enabledGenerations)
      .filter(gen => enabledGenerations[gen])
      .join(',');
    if (gens) params.generations = gens;
  }
  
  const data = await query('/api/available-pokemon', params);
  return convertKeysToCamelCase(data);
}

/**
 * Get Pokemon details
 * @param {number} pokemonId - Pokemon ID
 * @param {Array} selectedGames - Array of game IDs
 * @returns {Promise<Object>} Pokemon details with encounters
 */
export async function getPokemonDetails(pokemonId, selectedGames = null) {
  const params = {};
  if (selectedGames && selectedGames.length > 0) {
    params.gameIds = selectedGames.join(',');
  }
  const data = await query(`/api/pokemon/${pokemonId}`, params);
  return convertKeysToCamelCase(data);
}
