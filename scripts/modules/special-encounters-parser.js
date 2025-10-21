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
  
  // Find ALL sections (h2, h3) that might contain encounters
  const headers = document.querySelectorAll('h2, h3');
  
  for (const header of headers) {
    const span = header.querySelector('span.mw-headline');
    if (!span) continue;
    
    const headerText = span.textContent;
    const headerHTML = span.innerHTML;
    
    // Get context from next few elements (paragraphs often contain game indicators like "BD"/"SP")
    let sectionContext = '';
    let sectionHTML = '';
    let contextElement = header.nextElementSibling;
    let contextCount = 0;
    
    while (contextElement && contextCount < 3 && !['H2', 'H3'].includes(contextElement.tagName)) {
      if (contextElement.tagName === 'P') {
        sectionContext += contextElement.textContent + ' ';
        sectionHTML += contextElement.innerHTML + ' ';
      }
      contextElement = contextElement.nextElementSibling;
      contextCount++;
    }
    
    // Find all PKMNbox divs after this header
    let currentElement = header.nextElementSibling;
    
    while (currentElement && !['H2', 'H3'].includes(currentElement.tagName)) {
      // Look for Pokemon boxes
      const pkmnBoxes = currentElement.querySelectorAll ? 
        currentElement.querySelectorAll('.PKMNbox') : [];
      
      for (const box of pkmnBoxes) {
        // Pass section context to help detect game
        const encounter = parseSpecialEncounterBox(box, locationName, db, { 
          headerText: headerText + ' ' + sectionContext, 
          headerHTML: headerHTML + ' ' + sectionHTML 
        });
        if (encounter) {
          encounters.push(encounter);
        }
      }
      
      currentElement = currentElement.nextElementSibling;
    }
  }
  
  return encounters;
}

/**
 * Parse a single special encounter box
 * @param {HTMLElement} box - PKMNbox div element
 * @param {string} locationName - Location name
 * @param {Database} db - Database for lookups
 * @param {Object} sectionContext - Section header context for game detection
 * @returns {Object|null} Encounter object or null
 */
function parseSpecialEncounterBox(box, locationName, db, sectionContext = {}) {
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
  const games = detectGameFromContext(box, sectionContext);
  
  // If we can't detect the game, return null instead of guessing
  if (games.length === 0) {
    console.log(`    ⚠️  Could not detect game for ${pokemonName} at ${locationName}`);
    return null;
  }
  
  return {
    pokemonName,
    pokemonId,
    games,
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
 * @param {Object} sectionContext - Section header context
 * @returns {Array} Array of game IDs
 */
function detectGameFromContext(box, sectionContext = {}) {
  const games = new Set();
  
  // Check surrounding content for game indicators (including version abbreviations)
  const containerText = box.parentElement?.textContent || '';
  const containerHTML = box.parentElement?.innerHTML || '';
  
  // Also check section header (where BD/SP indicators often appear)
  const headerText = sectionContext.headerText || '';
  const headerHTML = sectionContext.headerHTML || '';
  
  const fullText = `${containerText} ${headerText}`;
  const fullHTML = `${containerHTML} ${headerHTML}`;
  
  // Gen 1
  if (fullText.match(/\bRed\b/i) && !fullText.includes('Fire')) games.add('red');
  if (fullText.match(/\bBlue\b/i) && !fullText.includes('Alpha')) games.add('blue');
  if (fullText.match(/\bYellow\b/i)) games.add('yellow');
  
  // Gen 2
  if (fullText.match(/\bGold\b/i) && !fullText.includes('Heart')) games.add('gold');
  if (fullText.match(/\bSilver\b/i) && !fullText.includes('Soul')) games.add('silver');
  if (fullText.match(/\bCrystal\b/i)) games.add('crystal');
  
  // Gen 3
  if (fullText.match(/\bRuby\b/i) && !fullText.includes('Omega')) games.add('ruby');
  if (fullText.match(/\bSapphire\b/i) && !fullText.includes('Alpha')) games.add('sapphire');
  if (fullText.match(/\bEmerald\b/i)) games.add('emerald');
  if (fullText.includes('FireRed') || fullHTML.match(/\bFR\b/)) games.add('firered');
  if (fullText.includes('LeafGreen') || fullHTML.match(/\bLG\b/)) games.add('leafgreen');
  
  // Gen 4
  if (fullText.match(/\bDiamond\b/i) && !fullText.includes('Brilliant')) games.add('diamond');
  if (fullText.match(/\bPearl\b/i) && !fullText.includes('Shining')) games.add('pearl');
  if (fullText.includes('Platinum') || fullHTML.match(/\bPt\b/)) games.add('platinum');
  if (fullText.includes('HeartGold') || fullHTML.match(/\bHG\b/)) games.add('heartgold');
  if (fullText.includes('SoulSilver') || fullHTML.match(/\bSS\b/)) games.add('soulsilver');
  
  // Gen 5 - Skip if context mentions "White 2" to avoid false positives
  const hasWhite2Context = fullText.match(/White\s*2/i) || fullHTML.match(/\bW2\b/);
  const hasBlack2Context = fullText.match(/Black\s*2/i) || fullHTML.match(/\bB2\b/);
  
  if (fullText.match(/\bBlack\b/i) && !hasBlack2Context) games.add('black');
  if (fullText.match(/\bWhite\b/i) && !hasWhite2Context) {
    // Only add if "White" appears in a Pokemon game context
    if (fullText.includes('Pokémon White') || fullText.includes('Version White')) {
      games.add('white');
    }
  }
  if (hasBlack2Context) games.add('black2');
  if (hasWhite2Context) games.add('white2');
  
  // Gen 6
  if (fullHTML.match(/\b[^a-zA-Z]X[^a-zA-Z]/)) games.add('x');
  if (fullHTML.match(/\b[^a-zA-Z]Y[^a-zA-Z]/)) games.add('y');
  if (fullText.includes('Omega Ruby') || fullHTML.match(/\bΩR\b/)) games.add('omegaruby');
  if (fullText.includes('Alpha Sapphire') || fullHTML.match(/\bαS\b/)) games.add('alphasapphire');
  
  // Gen 7 - Be more specific for Sun/Moon (common words)
  if (fullText.includes('Ultra Sun') || fullHTML.match(/\bUS\b/)) games.add('ultrasun');
  if (fullText.includes('Ultra Moon') || fullHTML.match(/\bUM\b/)) games.add('ultramoon');
  // Only match Sun/Moon if explicitly mentioned as Pokemon games
  if ((fullText.includes('Pokémon Sun') || fullText.includes('Version Sun')) && !fullText.includes('Ultra')) games.add('sun');
  if ((fullText.includes('Pokémon Moon') || fullText.includes('Version Moon')) && !fullText.includes('Ultra')) games.add('moon');
  if (fullText.includes("Let's Go") && fullText.includes('Pikachu')) games.add('letsgopikachu');
  if (fullText.includes("Let's Go") && fullText.includes('Eevee')) games.add('letsgoeevee');
  
  // Gen 8
  if (fullText.includes('Sword') || fullHTML.match(/\bSw\b/)) games.add('sword');
  if (fullText.includes('Shield') || fullHTML.match(/\bSh\b/)) games.add('shield');
  if (fullText.includes('Brilliant Diamond') || fullHTML.match(/\bBD\b/)) games.add('brilliantdiamond');
  if (fullText.includes('Shining Pearl') || fullHTML.match(/\bSP\b/)) games.add('shiningpearl');
  if (fullText.includes('Legends') && fullText.includes('Arceus')) games.add('legendsarceus');
  
  // Gen 9 - Only match if explicitly mentioned (single letters too ambiguous)
  if (fullText.includes('Scarlet')) games.add('scarlet');
  if (fullText.includes('Violet')) games.add('violet');
  
  return Array.from(games);
}

