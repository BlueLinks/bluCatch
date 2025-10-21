/**
 * HTML parsing utilities for Bulbapedia pages
 */

import { JSDOM } from 'jsdom';
import { parseLevelRange, parseEncounterRate } from './detection-utils.js';
import { parseSpecialEncounters } from './special-encounters-parser.js';

/**
 * Parse encounter tables from route HTML
 * @param {string} html - HTML content
 * @param {string} routeName - Route name for context
 * @param {Database} db - Database instance for Pokemon lookups
 * @returns {Array} Array of encounter objects
 */
export function parseRouteEncounters(html, routeName, db = null) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const encounters = [];
  const seen = new Set(); // Track unique encounters
  
  // Parse regular encounter tables
  const tables = document.querySelectorAll('table');
  
  for (const table of tables) {
    // Look for Pokemon mini sprites (indicators of encounter tables)
    const pokemonLinks = table.querySelectorAll('a[title*="(Pokémon)"]');
    
    if (pokemonLinks.length === 0) continue;
    
    // Try to parse this table as an encounter table
    const tableEncounters = parseEncounterTable(table, routeName, db);
    
    for (const enc of tableEncounters) {
      const key = `${enc.pokemonId}-${enc.game}-${enc.area}`;
      if (!seen.has(key) && enc.pokemonId) {
        seen.add(key);
        encounters.push(enc);
      }
    }
  }
  
  // Also parse special encounters (legendaries, one-time encounters)
  const specialEncounters = parseSpecialEncounters(html, routeName, db);
  for (const enc of specialEncounters) {
    // Special encounters may have multiple games
    for (const game of enc.games) {
      const key = `${enc.pokemonId}-${game}-${enc.area}`;
      if (!seen.has(key) && enc.pokemonId) {
        seen.add(key);
        encounters.push({
          ...enc,
          game // Use individual game instead of array
        });
      }
    }
  }
  
  return encounters;
}

/**
 * Parse a single encounter table
 * @param {HTMLTableElement} table - Table element
 * @param {string} routeName - Route name
 * @param {Database} db - Database instance for Pokemon name lookup
 * @returns {Array} Array of encounter objects
 */
function parseEncounterTable(table, routeName, db = null) {
  const encounters = [];
  const rows = Array.from(table.querySelectorAll('tr'));
  
  for (const row of rows) {
    // Find Pokemon link
    const pokemonLink = row.querySelector('a[title*="(Pokémon)"]');
    if (!pokemonLink) continue;
    
    const pokemonName = pokemonLink.getAttribute('title').replace(' (Pokémon)', '');
    const pokemonId = extractPokemonId(pokemonLink, db);
    
    // Skip if we can't get Pokemon ID
    if (!pokemonId) {
      continue; // Silently skip - too verbose
    }
    
    // Get all cells in the row
    const cells = Array.from(row.querySelectorAll('td'));
    
    // Extract data from cells
    let levelRange = null;
    let rate = null;
    let area = 'grass'; // default
    let games = [];
    let specialRequirements = null;
    
    // Look through cells for data
    for (const cell of cells) {
      const text = cell.textContent.trim();
      
      // Check for level range (e.g., "3-6", "15")
      if (!levelRange && text.match(/^\d+(-\d+)?$/)) {
        levelRange = text;
      }
      
      // Check for encounter rate (e.g., "50%", "20%")
      if (!rate && text.match(/^\d+(\.\d+)?%$/)) {
        rate = text;
      }
      
      // Check for encounter area
      if (cell.querySelector('a[title="Tall grass"]')) {
        area = 'grass';
      } else if (cell.querySelector('a[title*="Surfing"]') || text.toLowerCase().includes('surf')) {
        area = 'surf';
      } else if (text.toLowerCase().includes('fish') || text.toLowerCase().includes('rod')) {
        area = 'fishing';
      }
      
      // Check for dual-slot
      const dualSlotLink = cell.querySelector('a[title="Dual-slot mode"]');
      if (dualSlotLink) {
        const gameMatch = text.match(/(FireRed|LeafGreen|Ruby|Sapphire|Emerald)/i);
        if (gameMatch) {
          specialRequirements = {
            dualSlot: gameMatch[1].toLowerCase()
          };
        }
      }
    }
    
    // Try to determine games from the row headers (th elements)  
    // Route pages use different formats: single letter (R, B, Y) or full names
    const gameHeaders = row.querySelectorAll('th');
    for (const header of gameHeaders) {
      const text = header.textContent.trim();
      const gameLinks = header.querySelectorAll('a[href*="Pokémon"]');
      
      // Check links first
      for (const link of gameLinks) {
        const href = link.getAttribute('href') || '';
        const linkText = link.textContent.trim();
        
        // Match by href patterns
        if (href.includes('Red_and_Blue')) {
          // Could be R or B, check text
          if (linkText === 'R' || linkText.toLowerCase().includes('red')) games.push('red');
          if (linkText === 'B' || linkText.toLowerCase().includes('blue')) games.push('blue');
        }
        else if (href.includes('Yellow')) games.push('yellow');
        else if (href.includes('FireRed')) games.push('firered');
        else if (href.includes('LeafGreen')) games.push('leafgreen');
        else if (href.includes('Diamond') && !href.includes('Brilliant')) games.push('diamond');
        else if (href.includes('Pearl') && !href.includes('Shining')) games.push('pearl');
        else if (href.includes('Platinum')) games.push('platinum');
        else if (href.includes('HeartGold')) games.push('heartgold');
        else if (href.includes('SoulSilver')) games.push('soulsilver');
        else if (href.includes('Gold') && !href.includes('Heart')) games.push('gold');
        else if (href.includes('Silver') && !href.includes('Soul')) games.push('silver');
        else if (href.includes('Crystal')) games.push('crystal');
        else if (href.includes('Ruby') && !href.includes('Omega')) games.push('ruby');
        else if (href.includes('Sapphire') && !href.includes('Alpha')) games.push('sapphire');
        else if (href.includes('Emerald')) games.push('emerald');
      }
      
      // If no links, try text content for abbreviated names (R, B, Y, etc.)
      if (games.length === 0 && text.length <= 3) {
        if (text === 'R') games.push('red');
        else if (text === 'B') games.push('blue');
        else if (text === 'Y') games.push('yellow');
        else if (text === 'G') games.push('gold');
        else if (text === 'S') games.push('silver');
        else if (text === 'C') games.push('crystal');
        else if (text === 'FR') games.push('firered');
        else if (text === 'LG') games.push('leafgreen');
        else if (text === 'D') games.push('diamond');
        else if (text === 'P') games.push('pearl');
        else if (text === 'Pt') games.push('platinum');
        else if (text === 'HG') games.push('heartgold');
        else if (text === 'SS') games.push('soulsilver');
      }
    }
    
    // If no games found, try to get from context
    if (games.length === 0) {
      games = ['unknown'];
    }
    
    // Create encounter entry for each game
    for (const game of games) {
      encounters.push({
        pokemonName,
        pokemonId,
        game,
        area,
        levelRange,
        rate,
        specialRequirements,
        location: routeName
      });
    }
  }
  
  return encounters;
}

/**
 * Find area headers in the table (Grass, Surf, etc.)
 * @param {HTMLTableElement} table - Table element
 * @returns {Array} Array of area names
 */
function findAreaHeaders(table) {
  const headers = Array.from(table.querySelectorAll('th'));
  const areas = [];
  
  for (const header of headers) {
    const text = header.textContent.trim().toLowerCase();
    if (text.match(/\b(grass|surf|old rod|good rod|super rod|fish|cave|water)\b/i)) {
      areas.push(text);
    }
  }
  
  return areas;
}

/**
 * Find game headers in the table
 * @param {HTMLTableElement} table - Table element
 * @returns {Object} Map of column index to game ID
 */
function findGameHeaders(table) {
  const headerRow = table.querySelector('tr');
  if (!headerRow) return {};
  
  const headers = Array.from(headerRow.querySelectorAll('th'));
  const gameMap = {};
  
  const gamePatterns = {
    'red': /\bred\b/i,
    'blue': /\bblue\b/i,
    'yellow': /\byellow\b/i,
    'gold': /\bgold\b/i,
    'silver': /\bsilver\b/i,
    'crystal': /\bcrystal\b/i,
    'ruby': /\bruby\b/i,
    'sapphire': /\bsapphire\b/i,
    'emerald': /\bemerald\b/i,
    'firered': /\bfirered\b/i,
    'leafgreen': /\bleafgreen\b/i,
    'diamond': /\bdiamond\b/i,
    'pearl': /\bpearl\b/i,
    'platinum': /\bplatinum\b/i,
    'heartgold': /\bheartgold\b/i,
    'soulsilver': /\bsoulsilver\b/i,
    'black': /\bblack\b(?!\s*2)/i,
    'white': /\bwhite\b(?!\s*2)/i,
    'black2': /\bblack\s*2\b/i,
    'white2': /\bwhite\s*2\b/i,
    'x': /\b[^a-z]x[^a-z]\b/i,
    'y': /\b[^a-z]y[^a-z]\b/i,
    'omegaruby': /\bomega\s*ruby\b/i,
    'alphasapphire': /\balpha\s*sapphire\b/i,
    'sun': /\bsun\b(?!\s*ultra)/i,
    'moon': /\bmoon\b(?!\s*ultra)/i,
    'ultrasun': /\bultra\s*sun\b/i,
    'ultramoon': /\bultra\s*moon\b/i,
    'letsgopikachu': /let'?s\s*go.*pikachu/i,
    'letsgoeevee': /let'?s\s*go.*eevee/i,
    'sword': /\bsword\b/i,
    'shield': /\bshield\b/i,
    'brilliantdiamond': /\bbrilliant\s*diamond\b/i,
    'shiningpearl': /\bshining\s*pearl\b/i,
    'legendsarceus': /\blegends\s*arceus\b/i,
    'scarlet': /\bscarlet\b/i,
    'violet': /\bviolet\b/i
  };
  
  headers.forEach((header, index) => {
    const text = header.textContent.trim();
    // Also check link title attribute (e.g., "P" displays but title has "Let's Go, Pikachu!")
    const link = header.querySelector('a');
    const linkTitle = link?.getAttribute('title') || '';
    const fullText = `${text} ${linkTitle}`;
    
    for (const [gameId, pattern] of Object.entries(gamePatterns)) {
      if (pattern.test(fullText)) {
        gameMap[index] = gameId;
        break;
      }
    }
  });
  
  return gameMap;
}

/**
 * Detect games from row context
 * @param {HTMLTableRowElement} row - Table row
 * @param {Object} gameHeaders - Game header map
 * @returns {Array|null} Array of game IDs or null
 */
function detectGamesFromRow(row, gameHeaders) {
  // Look for game indicators in the row
  const cells = Array.from(row.querySelectorAll('td, th'));
  
  // Check for game links
  const gameLinks = row.querySelectorAll('a[href*="Pokémon"]');
  const games = [];
  
  for (const link of gameLinks) {
    const href = link.getAttribute('href');
    const text = link.textContent.trim().toLowerCase();
    
    // Try to match against known games
    if (text.includes('red')) games.push('red');
    if (text.includes('blue')) games.push('blue');
    if (text.includes('yellow')) games.push('yellow');
    if (text.includes('diamond')) games.push('diamond');
    if (text.includes('pearl')) games.push('pearl');
    if (text.includes('platinum')) games.push('platinum');
    if (text.match(/\bx\b/i)) games.push('x');
    if (text.match(/\by\b/i)) games.push('y');
  }
  
  return games.length > 0 ? games : null;
}

/**
 * Detect encounter area from row/table context
 * @param {HTMLTableRowElement} row - Table row
 * @param {HTMLTableElement} table - Parent table
 * @returns {string|null} Encounter area
 */
function detectEncounterArea(row, table) {
  // Look for area indicators in the table headers or section
  const text = table.textContent.toLowerCase();
  
  if (text.includes('surfing') || text.includes('surf')) return 'surf';
  if (text.includes('fishing') || text.includes('old rod')) return 'fishing-old';
  if (text.includes('good rod')) return 'fishing-good';
  if (text.includes('super rod')) return 'fishing-super';
  if (text.includes('walking') || text.includes('grass')) return 'grass';
  if (text.includes('cave') || text.includes('interior')) return 'cave';
  if (text.includes('special')) return 'special';
  
  return null;
}

/**
 * Extract Pokemon ID from link or name
 * @param {HTMLAnchorElement} link - Pokemon link
 * @param {Database} db - Database instance for name lookup
 * @returns {number|null} Pokemon ID
 */
function extractPokemonId(link, db = null) {
  // Try method 1: Image filename (e.g., "010MS3.png" -> 10)
  const img = link.querySelector('img');
  if (img) {
    const src = img.getAttribute('src');
    const match = src?.match(/\/(\d{3,4})MS/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  // Method 2: Look up by name in database
  if (db) {
    try {
      const pokemonName = link.getAttribute('title')?.replace(' (Pokémon)', '');
      if (pokemonName) {
        const result = db.prepare('SELECT id FROM pokemon WHERE name = ?').get(pokemonName);
        return result ? result.id : null;
      }
    } catch (error) {
      console.error('    Error looking up Pokemon:', error.message);
      return null;
    }
  }
  
  return null;
}

/**
 * Parse game locations section from Pokemon page
 * Similar to the working scrape-bulbapedia.js approach
 * @param {string} html - HTML content
 * @returns {Array} Array of location references
 */
export function parseGameLocations(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const locationRefs = [];
  
  // Find the "Game locations" section header (same as scrape-bulbapedia.js)
  const headers = document.querySelectorAll('h3');
  let locationSection = null;
  
  for (const header of headers) {
    const span = header.querySelector('span.mw-headline');
    if (span && span.textContent.includes('Game locations')) {
      locationSection = header;
      break;
    }
  }
  
  if (!locationSection) {
    return []; // No game locations section found
  }
  
  // Get all tables after the "Game locations" header until the next h3
  let currentElement = locationSection.nextElementSibling;
  const mainTables = [];
  
  while (currentElement && currentElement.tagName !== 'H3') {
    if (currentElement.tagName === 'TABLE') {
      mainTables.push(currentElement);
    }
    currentElement = currentElement.nextElementSibling;
  }
  
  // Parse each table
  for (const table of mainTables) {
    // Look for game/location pairs (th with game name, td with location)
    const rows = Array.from(table.querySelectorAll('tr'));
    
    for (const row of rows) {
      const ths = Array.from(row.querySelectorAll('th'));
      const tds = Array.from(row.querySelectorAll('td'));
      
      if (ths.length === 0 || tds.length === 0) continue;
      
      for (let i = 0; i < Math.min(ths.length, tds.length); i++) {
        const gameText = ths[i].textContent.trim();
        const locationText = tds[i].textContent.trim();
        
        // Extract location names from links or text
        const locationCell = tds[i];
        const locationLinks = locationCell.querySelectorAll('a[href^="/wiki/"]');
        const locations = [];
        
        for (const link of locationLinks) {
          const href = link.getAttribute('href');
          // Skip Pokemon links and other special links
          if (href.includes('(Pokémon)') || href.includes('Time') || href.includes('Days_of')) {
            continue;
          }
          
          const locationName = link.textContent.trim();
          if (locationName && locationName.length > 0 && locationName.length < 100) {
            locations.push(locationName);
          }
        }
        
        // If no links found, fallback to text content
        if (locations.length === 0 && locationText && locationText.length < 200) {
          locations.push(locationText);
        }
        
        if (locations.length > 0) {
          locationRefs.push({
            game: gameText,
            locations
          });
        }
      }
    }
  }
  
  return locationRefs;
}

