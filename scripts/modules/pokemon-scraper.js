/**
 * Pokemon page scraper module
 * Extracts location references from Pokemon pages
 */

import { fetchBulbapediaPage } from './bulbapedia-api.js';
import { parseGameLocations } from './html-parser.js';
import { normalizeLocationId, detectLocationType } from './detection-utils.js';

/**
 * Scrape a Pokemon page for location references
 * @param {Database} db - SQLite database instance
 * @param {Object} pokemon - Pokemon object
 * @returns {Promise<Array>} Array of location objects
 */
export async function scrapePokemonPage(db, pokemon) {
  try {
    console.log(`  📖 Fetching ${pokemon.name} page...`);
    
    // Fetch the full Pokemon page (don't use section parameter - causes issues)
    const pageData = await fetchBulbapediaPage(`${pokemon.name}_(Pokémon)`);
    
    if (!pageData) {
      console.log(`  ⚠️  Page not found for ${pokemon.name}`);
      return [];
    }
    
    // Parse location references from the full HTML
    const html = pageData.text['*'];
    const locationRefs = parseGameLocations(html);
    
    console.log(`  ✅ Found ${locationRefs.length} location references`);
    
    // Extract unique locations and create location records
    const locations = extractLocations(db, locationRefs, pokemon);
    
    return locations;
    
  } catch (error) {
    console.error(`  ❌ Error scraping ${pokemon.name}:`, error.message);
    return [];
  }
}

/**
 * Extract unique locations from location references
 * @param {Database} db - SQLite database instance
 * @param {Array} locationRefs - Array of location references
 * @param {Object} pokemon - Pokemon object
 * @returns {Array} Array of location objects
 */
function extractLocations(db, locationRefs, pokemon) {
  const locationMap = new Map();
  
  for (const ref of locationRefs) {
    for (const locationName of ref.locations) {
      // Skip invalid location names
      if (!isValidLocation(locationName)) continue;
      
      // Parse location name to extract region and create ID
      const { region, cleanName } = parseLocationName(locationName, pokemon.generation);
      const locationId = normalizeLocationId(cleanName, region);
      
      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          id: locationId,
          name: cleanName,
          region,
          location_type: detectLocationType(cleanName),
          bulbapedia_page: generateBulbapediaPage(cleanName, region),
          generation: pokemon.generation,
          scrape_status: 'pending'
        });
      }
    }
  }
  
  // Insert or update locations in database
  const locations = Array.from(locationMap.values());
  upsertLocations(db, locations);
  
  return locations;
}

/**
 * Check if location name is valid (not a game name, spin-off, or invalid entry)
 * @param {string} locationName - Location name
 * @returns {boolean} True if valid
 */
function isValidLocation(locationName) {
  if (!locationName || locationName.length < 3) return false;
  
  const lower = locationName.toLowerCase();
  
  // Filter out invalid entries
  if (lower.includes('unavailable')) return false;
  if (lower.includes('unobtainable')) return false;
  if (lower.includes('trade only')) return false;
  if (lower.includes('evolve')) return false;
  if (lower.match(/^generation\s+[ivx]+$/i)) return false;
  
  // Filter out game names (these are not locations)
  const gameNames = [
    'red', 'blue', 'yellow', 'gold', 'silver', 'crystal',
    'ruby', 'sapphire', 'emerald', 'firered', 'leafgreen',
    'diamond', 'pearl', 'platinum', 'heartgold', 'soulsilver',
    'black', 'white', 'black 2', 'white 2',
    'x', 'y', 'omega ruby', 'alpha sapphire',
    'sun', 'moon', 'ultra sun', 'ultra moon',
    'sword', 'shield', 'brilliant diamond', 'shining pearl',
    'legends: arceus', 'scarlet', 'violet',
    "let's go pikachu", "let's go eevee"
  ];
  
  for (const game of gameNames) {
    if (lower === game || lower === game + ' version') return false;
  }
  
  // Filter out spin-off games and apps
  if (lower.includes('trozei')) return false;
  if (lower.includes('shuffle')) return false;
  if (lower.includes('quest')) return false;
  if (lower.includes('duel')) return false;
  if (lower.includes('snap')) return false;
  if (lower.includes('stadium')) return false;
  if (lower.includes('ranger')) return false;
  if (lower.match(/\bstage\s+\d+/)) return false; // "Stage 1", "Stage 03", etc.
  if (lower.match(/\bsalon:/)) return false; // Shuffle stages
  if (lower.includes('celebration stamps')) return false;
  if (lower.includes('anniversary')) return false;
  if (lower.includes('rumble')) return false;
  if (lower.includes('mystery dungeon')) return false;
  
  // Filter out spin-off location names
  if (lower.includes(' sea') && !lower.includes('seafoam')) return false; // "Bulbasaur Sea", "Charizard Sea"
  if (lower === 'field' || lower === 'cave' || lower === 'forest') return false; // Too generic
  if (lower.includes('hideaway:')) return false; // Legends Arceus spin-off areas
  if (lower.includes('origin hideaway')) return false;
  if (lower.includes('temple') && !lower.includes('ruins') && !lower.includes('distortion')) return false; // Spin-off temples
  
  // Filter out spin-off game specific locations
  const spinoffLocations = [
    // Mystery Dungeon series (dungeons and towns)
    'baram town', 'capim town', 'dolce island', 'noe town', 'sahra town', 'aegis cave', 
    'sky tower', 'joyous tower', 'mystifying forest', 'mystery jungle', 'silent forest', 
    'torchlit labyrinth', 'verdant plaza', 'lyra forest', 'ultra forest', 'lapis lakeside', 
    'western cave', 'buried relic', 'silver trench', 'hero pokémon', 'partner pokémon', 'fainted pokémon',
    'fiery field', 'northwind field', 'lightning field', 'magma cavern', 'lava zone',
    'mt. faraway', 'mt. thunder', 'mt. freeze', 'purity forest', 'murky cave', 'oran forest', 
    'dusk forest', 'oddity cave', 'vien forest', 'howling forest',
    
    // Snap / New Snap (often have generic names + island references)
    'florio nature park', 'elsewhere forest', 'belusylva island', 'lental seafloor',
    'cave (snap)', 'river (snap)', 'reef (snap)', 'jungle (snap)',
    'blushing beach', 'bright beach', 'reef (new snap)', 'sweltering sands',
    'remains island', 'faldera island', 'voluca island', 'aurus island',
    
    // Ranger series
    'fall city', 'ringtown', 'summerland', 'wintown', 'chicole village', 'hinder cape',
    'forest temple', 'kisara plain', 'olive jungle', 'dolce island',
    
    // Rumble series
    'silent forest', 'everspring valley', 'model train room', 'locomotive café', 'variety battle',
    'origin hideaway', 'old-growth woods',
    
    // PokéPark
    'poképark', 'meeting place', 'meadow zone', 'granite zone', 'beach zone', 'iceberg zone',
    
    // Pinball
    'red field', 'blue field', 'bonus stage', 'pallet town (pinball)', 'viridian city (pinball)',
    
    // Channel, Trozei, Quest, Shuffle, Sleep
    'bus stop', 'phobos train', 'endless level', 'trozei battle', 'mr. who\'s den',
    'puerto blanco', 'blau salon', 'greengrass isle', 'cyan beach', 'taupe hollow', 'snowdrop tundra',
    
    // Rumble Rush (Seas)
    'charizard sea', 'gengar sea', 'castform sea', 'mimikyu sea', 'mewtwo sea', 'bulbasaur sea',
    
    // Masters EX, Café ReMix, other
    'trainer lodge', 'menu development', 'delivery', 'celebration stamps', 'scottie/bettie',
    'gym leader castle', 'island scan', 'mightywide river', 'odd temple', 'mirage spot', 
    'nfc figurine', 'random chance', 'sol laboratory', 'haunted zone'
  ];
  if (spinoffLocations.some(loc => lower.includes(loc))) return false;
  
  // Filter out locations with colons (usually spin-off game battle/challenge names)
  // e.g., "Chill Battle: The Forest of Memories", "Pearl Marsh: Pearl Lake"
  if (lower.includes(':') && !lower.includes("let's go")) return false;
  
  // Filter out generic single-word locations (usually from spin-offs like Snap)
  // These are too vague to be real main-series locations
  const genericWords = ['river', 'jungle', 'beach', 'meadow', 'plains', 'mountain', 'desert', 'reef', 'routes'];
  if (genericWords.includes(lower)) return false;
  
  // Filter out invalid route numbers (Route 47 in Kanto doesn't exist)
  // Kanto only has routes 1-25
  if (lower.match(/route\s+(4[7-9]|[5-9]\d)/)) return false; // Route 47-99
  
  // Filter out transfer/migration methods
  if (lower === 'trade') return false;
  if (lower === 'event') return false;
  if (lower.includes('pokémon bank')) return false;
  if (lower.includes('pokemon home')) return false;
  if (lower.includes('poké transfer')) return false;
  if (lower.includes('time capsule')) return false;
  if (lower.includes('pal park')) return false;
  
  // Must have something that looks like a location
  const hasLocationIndicator = 
    lower.includes('route') ||
    lower.includes('cave') ||
    lower.includes('forest') ||
    lower.includes('town') ||
    lower.includes('city') ||
    lower.includes('island') ||
    lower.includes('mountain') ||
    lower.includes('mt.') ||
    lower.includes('lake') ||
    lower.includes('path') ||
    lower.includes('road') ||
    lower.includes('tunnel') ||
    lower.includes('tower') ||
    lower.includes('gym') ||
    lower.includes('league') ||
    lower.includes('park') ||
    lower.includes('garden') ||
    lower.includes('zone') ||
    lower.includes('building') ||
    lower.includes('castle') ||
    lower.includes('manor') ||
    lower.includes('house') ||
    lower.includes('lab') ||
    lower.includes('center') ||
    lower.includes('ruins') ||
    lower.includes('temple') ||
    lower.includes('shrine') ||
    lower.includes('bay') ||
    lower.includes('beach') ||
    lower.includes('sea') ||
    lower.includes('ocean') ||
    lower.includes('river') ||
    lower.includes('marsh') ||
    lower.includes('meadow') ||
    lower.includes('field') ||
    lower.includes('grove') ||
    lower.includes('canyon') ||
    lower.includes('desert') ||
    lower.includes('outskirts') ||
    lower.includes('plaza') ||
    lower.includes('underground');
  
  return hasLocationIndicator;
}

/**
 * Parse location name to extract region
 * @param {string} locationName - Location name
 * @param {number} generation - Pokemon generation
 * @returns {Object} Parsed location data
 */
function parseLocationName(locationName, generation) {
  // Remove parenthetical notes
  let cleanName = locationName.replace(/\s*\([^)]+\)/g, '').trim();
  
  // Try to extract region from name
  let region = null;
  
  const regionPatterns = {
    'kanto': /\bkanto\b/i,
    'johto': /\bjohto\b/i,
    'hoenn': /\bhoenn\b/i,
    'sinnoh': /\bsinnoh\b/i,
    'unova': /\bunova\b/i,
    'kalos': /\bkalos\b/i,
    'alola': /\balola\b/i,
    'galar': /\bgalar\b/i,
    'hisui': /\bhisui\b/i,
    'paldea': /\bpaldea\b/i
  };
  
  for (const [regionName, pattern] of Object.entries(regionPatterns)) {
    if (pattern.test(cleanName)) {
      region = regionName;
      // Remove region name from clean name if it's a prefix
      cleanName = cleanName.replace(pattern, '').trim();
      break;
    }
  }
  
  // If no region found, infer from generation
  if (!region) {
    region = inferRegionFromGeneration(generation);
  }
  
  return { region, cleanName };
}

/**
 * Infer region from generation
 * @param {number} generation - Pokemon generation
 * @returns {string} Region name
 */
function inferRegionFromGeneration(generation) {
  const regionMap = {
    1: 'kanto',
    2: 'johto',
    3: 'hoenn',
    4: 'sinnoh',
    5: 'unova',
    6: 'kalos',
    7: 'alola',
    8: 'galar',
    9: 'paldea'
  };
  
  return regionMap[generation] || 'unknown';
}

/**
 * Generate Bulbapedia page name from location
 * @param {string} locationName - Clean location name
 * @param {string} region - Region name
 * @returns {string} Bulbapedia page name
 */
function generateBulbapediaPage(locationName, region) {
  // Special cases that need specific formatting
  const specialCases = {
    'Mt Moon': 'Mt._Moon',
    'Mt. Moon': 'Mt._Moon',
    'Mt Pyre': 'Mt._Pyre',
    'Mt. Pyre': 'Mt._Pyre',
    'Mt Coronet': 'Mt._Coronet',
    'Mt. Coronet': 'Mt._Coronet',
    'Mt Silver': 'Mt._Silver',
    'Mt. Silver': 'Mt._Silver',
    'Mt Mortar': 'Mt._Mortar',
    'Mt. Mortar': 'Mt._Mortar',
    'Victory Road': `Victory_Road_(${region ? region.charAt(0).toUpperCase() + region.slice(1) : 'Kanto'})`,
    'Safari Zone': `Safari_Zone_(${region ? region.charAt(0).toUpperCase() + region.slice(1) : 'Kanto'})`,
    'Power Plant': 'Kanto_Power_Plant',
    'Pokémon Mansion': 'Pokémon_Mansion',
    'Pokemon Mansion': 'Pokémon_Mansion',
    'Cerulean Cave': 'Cerulean_Cave',
    'Seafoam Islands': 'Seafoam_Islands',
    'Viridian Forest': 'Viridian_Forest',
    'Rock Tunnel': 'Rock_Tunnel',
    'Diglett\'s Cave': 'Diglett%27s_Cave',
    'Digletts Cave': 'Diglett%27s_Cave'
  };
  
  // Check for special cases (case-insensitive)
  for (const [pattern, bulbapediaName] of Object.entries(specialCases)) {
    if (locationName.toLowerCase() === pattern.toLowerCase()) {
      return bulbapediaName;
    }
  }
  
  // Format standard locations: "Kanto_Route_1", "Eterna_Forest", etc.
  let pageName = locationName
    .replace(/\s+/g, '_')
    .replace(/['']/g, '%27'); // URL encode apostrophes
  
  // Add region prefix for routes based on route number
  const routeMatch = locationName.match(/route\s+(\d+)/i);
  if (routeMatch) {
    const routeNum = parseInt(routeMatch[1]);
    let routeRegion = region; // Default to passed region
    
    // Infer region from route number (routes are region-specific)
    if (routeNum >= 201 && routeNum <= 230) routeRegion = 'sinnoh';
    else if (routeNum >= 101 && routeNum <= 134) routeRegion = 'hoenn';
    else if (routeNum >= 29 && routeNum <= 48) routeRegion = 'johto';
    else if (routeNum >= 1 && routeNum <= 28) routeRegion = 'kanto'; // Kanto has 1-28 (includes 25-28 in Sevii Islands)
    
    if (routeRegion) {
      const capitalizedRegion = routeRegion.charAt(0).toUpperCase() + routeRegion.slice(1);
      pageName = `${capitalizedRegion}_${pageName}`;
    }
  }
  
  return pageName;
}

/**
 * Upsert locations into database
 * @param {Database} db - SQLite database instance
 * @param {Array} locations - Array of location objects
 */
function upsertLocations(db, locations) {
  const upsertStmt = db.prepare(`
    INSERT OR REPLACE INTO locations (
      id, name, region, location_type, bulbapedia_page, generation, scrape_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction((locations) => {
    for (const loc of locations) {
      upsertStmt.run(
        loc.id,
        loc.name,
        loc.region,
        loc.location_type,
        loc.bulbapedia_page,
        loc.generation,
        loc.scrape_status
      );
    }
  });
  
  transaction(locations);
}

