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
  
  // Basic exclusions
  if (lower.includes('unavailable') || lower.includes('unobtainable')) return false;
  if (lower.includes('trade only') || lower.includes('evolve')) return false;
  if (lower.match(/^generation\s+[ivx]+$/i)) return false;
  
  // Whitelist patterns for main-series games
  const validPatterns = [
    // Routes (all regions)
    /^route\s+\d+$/i,
    /^(kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|paldea)\s+route\s+\d+$/i,
    
    // Cities and Towns (common patterns)
    /\s+(city|town|village)$/i,
    
    // Known main-series locations - Gen 1 (Kanto)
    /^(viridian|pewter|cerulean|lavender|vermilion|celadon|fuchsia|saffron|cinnabar|pallet|indigo plateau)(\s+(city|town))?$/i,
    /^(victory road|rock tunnel|safari zone|pokemon mansion|power plant|seafoam islands|digletts cave)(\s+\(.*\))?$/i,
    /^(mt\.\s*moon|viridian forest)(\s+\(.*\))?$/i,
    
    // Gen 2 (Johto)
    /^(new bark|cherrygrove|violet|azalea|goldenrod|ecruteak|olivine|cianwood|mahogany|blackthorn)(\s+(city|town))?$/i,
    /^(union cave|slowpoke well|ilex forest|national park|burned tower|bell tower|tin tower|whirl islands|dark cave|ice path|dragons den|mt\.\s*mortar|mt\.\s*silver|tohjo falls|sprout tower|ruins of alph)(\s+\(.*\))?$/i,
    
    // Gen 3 (Hoenn)
    /^(littleroot|oldale|petalburg|rustboro|dewford|slateport|mauville|verdanturf|fallarbor|lavaridge|fortree|lilycove|mossdeep|sootopolis|pacifidlog|ever grande)(\s+(city|town))?$/i,
    /^(petalburg woods|granite cave|meteor falls|jagged pass|fiery path|new mauville|shoal cave|cave of origin|sky pillar|mirage island|desert ruins|island cave|ancient tomb|sealed chamber|scorched slab|terra cave|marine cave|rusturf tunnel|abandoned ship|sea mauville|seafloor cavern|mt\.\s*chimney|mt\.\s*pyre|desert underpass|altering cave|artisan cave|faraway island|navel rock|birth island|southern island)(\s+\(.*\))?$/i,
    
    // Gen 4 (Sinnoh)
    /^(twinleaf|sandgem|jubilife|oreburgh|floaroma|eterna|hearthome|solaceon|veilstone|pastoria|celestic|canalave|snowpoint|sunyshore|pokemon league)(\s+(city|town))?$/i,
    /^(oreburgh gate|ravaged path|valley windworks|eterna forest|wayward cave|old chateau|great marsh|lost tower|solaceon ruins|lake valor|lake verity|lake acuity|stark mountain|snowpoint temple|spear pillar|distortion world|turnback cave|sendoff spring|fullmoon island|newmoon island|spring path|maniac tunnel|iron island|acuity lakefront|valor lakefront|verity lakefront|mt\.\s*coronet|victory road|oreburgh mine|fuego ironworks|ruin maniac cave)(\s+\(.*\))?$/i,
    /^(ramanas park|distortion room)$/i,
    
    // Gen 5 (Unova)
    /^(nuvema|accumula|striaton|nacrene|castelia|nimbasa|driftveil|mistralton|icirrus|opelucid|lacunosa|undella|black city|white forest|aspertia|virbank|humilau|lentimas)(\s+(city|town))?$/i,
    /^(twist mountain|dragonspiral tower|relic castle|chargestone cave|celestial tower|reversal mountain|strange house|abundant shrine|undella bay|victory road|giant chasm|route 4|pinwheel forest|wellspring cave|mistralton cave|lostlorn forest|clay tunnel|seaside cave|p2 laboratory|liberty garden|marvelous bridge)(\s+\(.*\))?$/i,
    
    // Gen 6 (Kalos)
    /^(vaniville|aquacorde|santalune|lumiose|camphrier|ambrette|cyllage|geosenge|shalour|coumarine|laverre|dendemille|anistar|couriway|snowbelle|kiloude)(\s+(city|town))?$/i,
    /^(santalune forest|connecting cave|reflection cave|glittering cave|terminus cave|pokemon village|frost cavern|lost hotel|azure bay|sea spirit's den|kalos power plant|tower of mastery)(\s+\(.*\))?$/i,
    
    // Gen 7 (Alola)
    /^(iki|hau'oli|heahea|paniola|konikoni|malie|tapu village|seafolk village|po town)(\s+(city|town|village))?$/i,
    /^(ten carat hill|verdant cavern|melemele meadow|seaward cave|brooklet hill|lush jungle|diglett's tunnel|memorial hill|akala outskirts|haina desert|mount lanakila|lake of the (sunne|moone)|vast poni canyon|resolution cave|poni meadow|poni coast|ancient poni path|poni wilds|poni breaker coast|exeggutor island|wela volcano park|malie garden|hokulani observatory|thrifty megamart|aether paradise|ultra space|ultra megalopolis|konikoni city|hano beach)(\s+\(.*\))?$/i,
    
    // Gen 8 (Galar)
    /^(postwick|wedgehurst|motostoke|turffield|hulbury|stow-on-side|ballonlea|circhester|spikemuth|hammerlocke|wyndon)(\s+(city|town))?$/i,
    /^(slumbering weald|galar mine|motostoke outskirts|glimwood tangle|watchtower ruins|dusty bowl|giant's seat|stony wilderness|lake of outrage|crown tundra|giant's bed|old cemetery|snowslide slope|tunnel to the top|path to the peak|ballimere lake|dyna tree hill|max lair|wild area|route 9 tunnel|galar mine no\.\s*2|axew's eye|dynamax adventure|honeycalm island)(\s+\(.*\))?$/i,
    
    // Gen 9 (Paldea)
    /^(cabo poco|mesagoza|los platos|cortondo|alfornada|zapapico|cascarrafa|medali|montenevera|levincia|artazon|porto marinada)(\s+(city|town))?$/i,
    /^(south province|east province|west province|north province|poco path|inlet grotto|dalizapa passage|alfornada cavern|glaseado mountain|area zero|asado desert|north paldean sea|south paldean sea|west paldean sea|east paldean sea)(\s+.*)?$/i,
    
    // DLC Locations - Kitakami & Blueberry Academy
    /^(mossui town|loyalty plaza|kitakami road|apple hills|oni's hold|oni mountain|crystal pool|wistful fields|fellhorn gorge|paradise barrens|timeless woods|infernal pass)(\s+.*)?$/i,
    
    // Islands (Sevii, Alola, etc)
    /^(one|two|three|four|five|six|seven)\s+island$/i,
    /^(mt\.\s*ember|berry forest|icefall cave|lost cave|altering cave|pattern bush|dotted hole|tanoby ruins|trainer tower|three isle port|five isle meadow|water path|outcast island|resort gorgeous|memorial pillar|treasure beach|kindle road|cape brink|bond bridge|water labyrinth|canyon entrance|sevault canyon|ruin valley)$/i,
    
    // Special battle facilities
    /^(pokemon league|elite four|hall of fame|battle tower|battle frontier|battle subway|battle tree|battle royal dome|battle agency|battle maison|battle resort)$/i,
    
    // Caves and Mountains (generic patterns for main series)
    /^(mt\.|mount)\s+\w+$/i,
  ];
  
  // Check if location matches any valid pattern
  const isValid = validPatterns.some(pattern => pattern.test(lower));
  
  // Additional blacklist for BDSP unparseable caves and Legends Arceus locations
  const blacklist = [
    /^grand underground$/i,
    /^(spacious|grassland|volcanic|swampy|fountainspring|riverbank|dazzling|whiteout|icy|rocky|stargleam|glacial|big bluff|typhlo|sandsear|bogsunk|still-water)\s+cav(e|ern)$/i,
    /^(obsidian fieldlands|crimson mirelands|cobalt coastlands|coronet highlands|alabaster icelands)$/i,
    /^(droning meadow|nature's pantry|deertrack path|grueling grove|oreburrow tunnel|celestica ruins|sacred plaza|primeval grotto|ancient retreat|shrouded ruins|solitary spring|cloudcap pass)$/i,
    // Ranger locations
    /^(altru building|altru tower|oil field hideout|union road|chicole village|pueltown)$/i,
    // Mystery Dungeon
    /^(wish cave|solar cave|mt\.\s*blaze|uproar forest|eternal tower|treeshroud forest|southern cavern|rasp cavern|midnight forest|labyrinth cave|mt\.\s*bristle)$/i,
    // Rumble
    /^(ruby field|sapphire field|rock mountain|cheerful meadow|cavern zone|waterfall cave)$/i,
    // Other spin-offs
    /^(spooky manor|town outskirts|noisy forest|pleasant forest|rugged road|rugged mountain|dim cave|scary cave|beautiful beach|stormy beach|blue lake|icy cave|volcano path|fields?|sea|treehouse|route|desert region|research camp|mirage spot)$/i,
    // New Snap
    /^(prestige precept center|mirage desert|green path)$/i,
    // Masters EX / Cafe Mix / other
    /^(nimbasa gym|cerulean gym|league club room)$/i,
    // Generic invalid locations
    /^(vermilion city streets|courages cavern|brawlers' cave|reveler's road|challenger's cave|kala'e bay|sea skim|cycling road|brine cave|sea of wailord|bellsproutegg|crevice cave|seagrass haven)$/i,
  ];
  
  if (blacklist.some(pattern => pattern.test(lower))) return false;
  
  return isValid;
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

