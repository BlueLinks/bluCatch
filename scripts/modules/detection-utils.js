/**
 * Utility functions for detecting acquisition methods and special requirements
 */

/**
 * Detect acquisition method from location and context
 * @param {Object} context - Context object with location, area, etc.
 * @returns {string} Acquisition method ID
 */
export function detectAcquisitionMethod(context) {
  const { location = '', area = '', specialRequirements = null } = context;
  const lowerLocation = location.toLowerCase();
  
  // Dual-slot detection
  if (specialRequirements?.dualSlot) {
    return 'dual-slot';
  }
  
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
      lowerLocation.includes('first partner') ||
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
  
  // Fishing detection (area-based)
  if (area && (area.toLowerCase().includes('fish') || area.toLowerCase().includes('rod'))) {
    return 'wild'; // Still wild, but in water
  }
  
  // Surfing detection
  if (area && area.toLowerCase().includes('surf')) {
    return 'wild';
  }
  
  // Default to wild encounter
  return 'wild';
}

/**
 * Detect special requirements from location string
 * @param {string} location - Location string
 * @returns {Object|null} Special requirements object or null
 */
export function detectSpecialRequirements(location) {
  const requirements = {};
  
  // Dual-slot detection
  const dualSlotMatch = location.match(/\((firered|leafgreen|ruby|sapphire|emerald|any gen iii game)\)/i);
  if (dualSlotMatch) {
    requirements.dualSlot = dualSlotMatch[1].toLowerCase().replace(/\s+/g, '-');
  }
  
  // Weather conditions
  if (location.match(/\b(rain|hail|sandstorm|fog)\b/i)) {
    const weatherMatch = location.match(/\b(rain|hail|sandstorm|fog)\b/i);
    requirements.weather = weatherMatch[1].toLowerCase();
  }
  
  // Swarm detection
  if (location.match(/\b(swarm|outbreak)\b/i)) {
    requirements.swarm = true;
  }
  
  // Honey tree
  if (location.match(/\b(honey\s+tree|slather)\b/i)) {
    requirements.honeyTree = true;
  }
  
  return Object.keys(requirements).length > 0 ? requirements : null;
}

/**
 * Normalize location name for ID generation
 * @param {string} locationName - Location name
 * @param {string} region - Region name
 * @returns {string} Normalized location ID
 */
export function normalizeLocationId(locationName, region = '') {
  // Remove special characters and convert to lowercase
  let normalized = locationName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  // Add region prefix if available
  if (region) {
    const normalizedRegion = region.toLowerCase().replace(/\s+/g, '-');
    normalized = `${normalizedRegion}-${normalized}`;
  }
  
  return normalized;
}

/**
 * Detect location type from name
 * @param {string} locationName - Location name
 * @returns {string} Location type
 */
export function detectLocationType(locationName) {
  const lower = locationName.toLowerCase();
  
  if (lower.match(/\broute\s+\d+/)) return 'route';
  if (lower.includes('cave')) return 'cave';
  if (lower.includes('forest')) return 'forest';
  if (lower.includes('tower')) return 'tower';
  if (lower.includes('gym')) return 'gym';
  if (lower.includes('city') || lower.includes('town')) return 'city';
  if (lower.includes('island')) return 'island';
  if (lower.includes('mountain') || lower.includes('mt.')) return 'mountain';
  if (lower.includes('lake')) return 'lake';
  if (lower.includes('sea') || lower.includes('ocean')) return 'water';
  if (lower.includes('safari')) return 'safari';
  if (lower.includes('park')) return 'park';
  if (lower.includes('league')) return 'league';
  
  return 'special';
}

/**
 * Parse level range from text
 * @param {string} text - Text containing level information
 * @returns {string|null} Level range (e.g., "2-3", "15")
 */
export function parseLevelRange(text) {
  if (!text) return null;
  
  // Match patterns like "Lv. 2-3", "Level 15-18", "2-3", etc.
  const match = text.match(/(?:lv\.?|level)?\s*(\d+)(?:\s*-\s*(\d+))?/i);
  if (match) {
    return match[2] ? `${match[1]}-${match[2]}` : match[1];
  }
  
  return null;
}

/**
 * Parse encounter rate from text
 * @param {string} text - Text containing rate information
 * @returns {string|null} Encounter rate (e.g., "20%")
 */
export function parseEncounterRate(text) {
  if (!text) return null;
  
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? `${match[1]}%` : null;
}

