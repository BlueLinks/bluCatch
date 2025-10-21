/**
 * Parser for special/legendary Pokemon encounters
 * These use a different HTML structure (PKMNbox) than regular wild encounters
 */

import { JSDOM } from 'jsdom';

/**
 * Parse special encounter boxes (for legendaries, one-time encounters)
 * @param {string} html - HTML content
 * @param {string} locationName - Location name
 * @param {Database} db - Database for Pokemon lookups
 * @returns {Array} Array of special encounter objects
 */
export function parseSpecialEncounters(html, locationName, db = null) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const encounters = [];
  
  // Find the "Special encounters" section
  const headers = document.querySelectorAll('h2, h3');
  let specialSection = null;
  
  for (const header of headers) {
    const span = header.querySelector('span.mw-headline');
    if (span && span.textContent.includes('Special encounters')) {
      specialSection = header;
      break;
    }
  }
  
  if (!specialSection) {
    return []; // No special encounters section
  }
  
  // Find all PKMNbox divs after this header
  let currentElement = specialSection.nextElementSibling;
  
  while (currentElement && currentElement.tagName !== 'H2') {
    // Look for Pokemon boxes
    const pkmnBoxes = currentElement.querySelectorAll ? 
      currentElement.querySelectorAll('.PKMNbox') : [];
    
    for (const box of pkmnBoxes) {
      const encounter = parseSpecialEncounterBox(box, locationName, db);
      if (encounter) {
        encounters.push(encounter);
      }
    }
    
    currentElement = currentElement.nextElementSibling;
  }
  
  return encounters;
}

/**
 * Parse a single special encounter box
 * @param {HTMLElement} box - PKMNbox div element
 * @param {string} locationName - Location name
 * @param {Database} db - Database for lookups
 * @returns {Object|null} Encounter object or null
 */
function parseSpecialEncounterBox(box, locationName, db) {
  // Get Pokemon name
  const nameBox = box.querySelector('.PKMNnamebox');
  if (!nameBox) return null;
  
  const pokemonLink = nameBox.querySelector('a[title*="(Pokémon)"]');
  if (!pokemonLink) return null;
  
  const pokemonName = pokemonLink.getAttribute('title').replace(' (Pokémon)', '');
  
  // Get level
  const levelSpan = nameBox.querySelector('.PKMNlevel');
  const levelText = levelSpan ? levelSpan.textContent.trim() : null;
  const levelMatch = levelText ? levelText.match(/Lv\.?\s*(\d+)/) : null;
  const level = levelMatch ? levelMatch[1] : null;
  
  // Look up Pokemon ID
  let pokemonId = null;
  if (db) {
    try {
      const result = db.prepare('SELECT id FROM pokemon WHERE name = ?').get(pokemonName);
      pokemonId = result ? result.id : null;
    } catch (error) {
      console.error('    Error looking up', pokemonName, ':', error.message);
    }
  }
  
  if (!pokemonId) {
    console.log(`    ⚠️  Skipping ${pokemonName} - no ID found`);
    return null;
  }
  
  // Try to determine game from context
  // Special encounters are usually game-specific
  // Look for game indicators in surrounding text or box styling
  const games = detectGameFromContext(box);
  
  return {
    pokemonName,
    pokemonId,
    games: games.length > 0 ? games : ['firered', 'leafgreen'], // Mt. Ember is FRLG only
    area: 'special',
    levelRange: level,
    rate: 'One time only',
    specialRequirements: null,
    location: locationName,
    isLegendary: true
  };
}

/**
 * Detect game from box context
 * @param {HTMLElement} box - PKMNbox element
 * @returns {Array} Array of game IDs
 */
function detectGameFromContext(box) {
  const games = [];
  
  // Check surrounding content for game indicators
  const containerText = box.parentElement?.textContent || '';
  
  if (containerText.includes('FireRed') || containerText.includes('LeafGreen')) {
    games.push('firered', 'leafgreen');
  }
  
  // Could add more detection logic here
  
  return games;
}

