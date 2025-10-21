/**
 * HTML parsing utilities for Bulbapedia pages
 */

import { JSDOM } from 'jsdom';
import { parseLevelRange, parseEncounterRate } from './detection-utils.js';
import { parseSpecialEncounters } from './special-encounters-parser.js';

/**
 * Check if table has standard encounter table headers
 * @param {HTMLTableElement} table - Table element
 * @returns {boolean} True if table has Pokémon, Games, Location, Levels, Rate headers
 */
function hasEncounterTableHeaders(table) {
  const headerRow = table.querySelector('tr');
  if (!headerRow) return false;
  
  const headerText = headerRow.textContent.toLowerCase();
  
  // Check for standard Bulbapedia encounter table headers
  return headerText.includes('pokémon') && 
         headerText.includes('games') && 
         headerText.includes('location') && 
         headerText.includes('levels') && 
         headerText.includes('rate');
}

/**
 * Get context for a table by looking at preceding headers AND section rows within table
 * @param {HTMLTableElement} table - Table element
 * @returns {Object} Context object with type and acquisitionMethod
 */
function getTableContext(table) {
  // First check for section headers within the table itself
  // Look for th elements that span multiple columns with keywords
  const sectionHeaders = Array.from(table.querySelectorAll('th[colspan]'));
  for (const header of sectionHeaders) {
    const headerText = header.textContent.toLowerCase().trim();
    
    if (headerText.includes('gift') && headerText.includes('pokémon')) {
      return { type: 'gift', acquisitionMethod: 'gift' };
    }
    if (headerText.includes('choice') || headerText.includes('starter')) {
      return { type: 'starter', acquisitionMethod: 'starter' };
    }
    if (headerText.includes('special pokémon')) {
      return { type: 'special', acquisitionMethod: 'special' };
    }
    if (headerText.includes('trade') && !headerText.includes('traded')) {
      return { type: 'trade', acquisitionMethod: 'trade' };
    }
  }
  
  // Then look backwards for section headers (h2, h3, h4)
  let element = table.previousElementSibling;
  let headerText = '';
  
  // Search up to 5 elements back for a header
  for (let i = 0; i < 5 && element; i++) {
    const tagName = element.tagName?.toLowerCase();
    if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
      headerText = element.textContent.toLowerCase();
      break;
    }
    element = element.previousElementSibling;
  }
  
  // Determine table type based on header
  if (headerText.includes('gift') || headerText.includes('choice')) {
    return { type: 'gift', acquisitionMethod: 'gift' };
  }
  if (headerText.includes('starter')) {
    return { type: 'starter', acquisitionMethod: 'starter' };
  }
  if (headerText.includes('special') && !headerText.includes('special encounter')) {
    return { type: 'special', acquisitionMethod: 'special' };
  }
  if (headerText.includes('trade') && !headerText.includes('traded')) {
    return { type: 'trade', acquisitionMethod: 'trade' };
  }
  if (headerText.includes('fishing')) {
    return { type: 'fishing', acquisitionMethod: 'wild' };
  }
  
  // Default to wild encounter
  return { type: 'wild', acquisitionMethod: 'wild' };
}

/**
 * Detect game ID from a table header cell
 * @param {HTMLTableCellElement} cell - th or td cell
 * @returns {string|null} Game ID or null
 */
function detectGameFromCell(cell) {
  const text = cell.textContent.trim();
  const link = cell.querySelector('a');
  const linkHref = link?.getAttribute('href') || '';
  const linkTitle = link?.getAttribute('title') || '';
  
  // Single letter abbreviations (common in Gen I-II tables)
  if (text === 'R' && linkHref.includes('Red_and_Blue')) return 'red';
  if (text === 'B' && linkHref.includes('Red_and_Blue')) return 'blue';
  if (text === 'Y' && linkHref.includes('Yellow')) return 'yellow';
  if (text === 'G' && linkHref.includes('Gold_and_Silver')) return 'gold';
  if (text === 'S' && linkHref.includes('Gold_and_Silver')) return 'silver';
  if (text === 'C' && linkHref.includes('Crystal')) return 'crystal';
  
  // Two-letter abbreviations
  if (text === 'FR' || text === 'FireRed') return 'firered';
  if (text === 'LG' || text === 'LeafGreen') return 'leafgreen';
  if (text === 'HG' || text === 'HeartGold') return 'heartgold';
  if (text === 'SS' || text === 'SoulSilver') return 'soulsilver';
  if (text === 'D' && linkHref.includes('Diamond_and_Pearl')) return 'diamond';
  if (text === 'P' && linkHref.includes('Diamond_and_Pearl') && !linkTitle.includes("Let's Go")) return 'pearl';
  if (text === 'Pt' || text === 'Platinum') return 'platinum';
  
  // Let's Go
  if (text === 'P' && (linkTitle.includes("Let's Go, Pikachu") || linkTitle.includes("Let's Go Pikachu"))) return 'letsgopikachu';
  if (text === 'E' && (linkTitle.includes("Let's Go, Eevee") || linkTitle.includes("Let's Go Eevee"))) return 'letsgoeevee';
  
  // Gen 5+
  if (text === 'B' && linkHref.includes('Black_and_White') && !linkHref.includes('2')) return 'black';
  if (text === 'W' && linkHref.includes('Black_and_White') && !linkHref.includes('2')) return 'white';
  if (text === 'B2' || (text === 'B' && linkHref.includes('Black_2'))) return 'black2';
  if (text === 'W2' || (text === 'W' && linkHref.includes('White_2'))) return 'white2';
  if (text === 'X') return 'x';
  if (text === 'Y') return 'y';
  if (text === 'ΩR' || text === 'OR') return 'omegaruby';
  if (text === 'αS' || text === 'AS') return 'alphasapphire';
  if (text === 'S' && linkTitle.includes('Sun') && !linkTitle.includes('Ultra')) return 'sun';
  if (text === 'M' && linkTitle.includes('Moon') && !linkTitle.includes('Ultra')) return 'moon';
  if (text === 'US') return 'ultrasun';
  if (text === 'UM') return 'ultramoon';
  if (text === 'Sw') return 'sword';
  if (text === 'Sh') return 'shield';
  if (text === 'BD') return 'brilliantdiamond';
  if (text === 'SP') return 'shiningpearl';
  if (text === 'LA') return 'legendsarceus';
  if (text === 'Sc') return 'scarlet';
  if (text === 'Vi') return 'violet';
  
  return null;
}

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
  
  // Parse regular encounter tables - look for standard header format
  const tables = document.querySelectorAll('table');
  
  for (const table of tables) {
    // Check if this is a standard encounter table with proper headers
    if (!hasEncounterTableHeaders(table)) continue;
    
    // Determine table context by looking at preceding headers
    const tableContext = getTableContext(table);
    
    // Try to parse this table as an encounter table
    const tableEncounters = parseEncounterTable(table, routeName, db, tableContext);
    
    for (const enc of tableEncounters) {
      const key = `${enc.pokemonId}-${enc.game}-${enc.area || 'none'}-${enc.acquisitionMethod || 'wild'}`;
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
 * @param {Object} tableContext - Context about this table (type, acquisitionMethod)
 * @returns {Array} Array of encounter objects
 */
function parseEncounterTable(table, routeName, db = null, tableContext = {}) {
  const encounters = [];
  const rows = Array.from(table.querySelectorAll('tr'));
  
  const isGiftTable = tableContext.type === 'gift' || tableContext.type === 'starter';
  const acquisitionMethod = tableContext.acquisitionMethod || 'wild';
  
  for (const row of rows) {
    
    // Get all cells (both td and th)
    const allCells = Array.from(row.querySelectorAll('td, th'));
    
    // Skip rows without enough cells (headers, etc.)
    if (allCells.length < 5) continue;
    
    // Find Pokemon link
    const pokemonLink = row.querySelector('a[title*="(Pokémon)"]');
    if (!pokemonLink) continue;
    
    const pokemonName = pokemonLink.getAttribute('title').replace(' (Pokémon)', '');
    const pokemonId = extractPokemonId(pokemonLink, db);
    
    // Skip if we can't get Pokemon ID
    if (!pokemonId) continue;
    
    // Extract level and rate from cells
    let levelRange = null;
    let rate = null;
    let area = null;
    let games = [];
    let specialRequirements = null;
    
    // Look through all cells for data
    for (const cell of allCells) {
      const text = cell.textContent.trim();
      
      // Check for level range (e.g., "22", "39, 44", "41-46")
      if (!levelRange && text.match(/^\d+(-\d+)?(,\s*\d+)*$/)) {
        levelRange = text;
      }
      
      // Check for encounter rate (e.g., "15%", "20%", or "One" for gifts)
      if (!rate && text.match(/^\d+(\.\d+)?%$/)) {
        rate = text;
      } else if (!rate && isGiftTable && text.toLowerCase() === 'one') {
        rate = 'One';
      }
      
      // Check for encounter area (skip for gift tables)
      if (!isGiftTable) {
        const cellText = text.toLowerCase();
        if (cellText === 'cave' || cell.querySelector('a[title="Cave"]')) {
          area = 'cave';
        } else if (cellText === 'grass' || cellText === 'tall grass' || cell.querySelector('a[title="Tall grass"]')) {
          area = 'grass';
        } else if (cellText.includes('surf') || cell.querySelector('a[title*="Surf"]')) {
          area = 'surf';
        } else if (cellText.includes('fish') || cellText.includes('rod')) {
          area = 'fishing';
        } else if (cellText.includes('rock smash')) {
          area = 'rock-smash';
        }
      }
      
      // Detect games from th cells or links
      if (cell.tagName.toLowerCase() === 'th') {
        const gameId = detectGameFromCell(cell);
        if (gameId && !games.includes(gameId)) {
          games.push(gameId);
        }
      }
    }
    
    // Default area if not detected (but NOT for gift/special tables)
    if (!area && !isGiftTable) {
      area = 'grass';
    }
    
    // If no games found, skip this encounter
    if (games.length === 0) {
      continue;
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
        location: routeName,
        acquisitionMethod
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

