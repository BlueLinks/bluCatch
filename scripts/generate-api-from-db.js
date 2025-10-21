/**
 * Generate API endpoints from SQLite database
 * This replaces the old generate-api-endpoints.js to work with the enhanced database
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../public/data/pokemon.db');
const API_DIR = path.join(__dirname, '../public/api/dex');
const DEX_FILE = path.join(__dirname, '../public/api/dex.json');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║       GENERATING API ENDPOINTS FROM DATABASE             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const db = new Database(DB_PATH);

// Create API directory
if (!fs.existsSync(API_DIR)) {
  fs.mkdirSync(API_DIR, { recursive: true });
  console.log(`📁 Created directory: ${API_DIR}\n`);
}

// Get all Pokemon
const pokemon = db.prepare('SELECT * FROM pokemon ORDER BY id').all();
console.log(`🔍 Generating API endpoints for ${pokemon.length} Pokémon...\n`);

let generated = 0;

// Generate a JSON file for each Pokemon
for (const pkmn of pokemon) {
  // Get all encounters for this Pokemon
  // Prioritize encounters with location_id (enhanced data)
  const encounters = db.prepare(`
    SELECT 
      g.id as game_id,
      g.name as game_name,
      g.generation as game_generation,
      COALESCE(l.name, e.location) as location,
      e.encounter_area,
      e.encounter_rate,
      e.level_range,
      e.time_of_day,
      e.season,
      e.special_requirements,
      l.name as location_name,
      l.region,
      l.location_type,
      CASE WHEN e.location_id IS NOT NULL THEN 1 ELSE 0 END as has_enhanced_data
    FROM encounters e
    JOIN games g ON e.game_id = g.id
    LEFT JOIN locations l ON e.location_id = l.id
    WHERE e.pokemon_id = ?
    ORDER BY has_enhanced_data DESC, g.generation, g.name
  `).all(pkmn.id);
  
  // Skip old encounters if enhanced versions exist for same pokemon+game combo
  const seenGameLocations = new Set();
  const filteredEncounters = [];
  
  for (const enc of encounters) {
    const key = `${enc.game_id}:${enc.location}`;
    if (!seenGameLocations.has(key)) {
      seenGameLocations.add(key);
      filteredEncounters.push(enc);
    }
  }
  
  // Group by game
  const gameMap = new Map();
  
  for (const enc of filteredEncounters) {
    if (!gameMap.has(enc.game_id)) {
      gameMap.set(enc.game_id, {
        id: enc.game_id,
        name: enc.game_name,
        generation: enc.game_generation,
        locations: []
      });
    }
    
    // Build location object with enhanced data
    const locationData = {
      location: enc.location
    };
    
    // Add enhanced fields if available
    if (enc.location_name) locationData.locationName = enc.location_name;
    if (enc.region) locationData.region = enc.region;
    if (enc.location_type) locationData.locationType = enc.location_type;
    if (enc.encounter_area) locationData.area = enc.encounter_area;
    if (enc.encounter_rate) locationData.rate = enc.encounter_rate;
    if (enc.level_range) locationData.levels = enc.level_range;
    if (enc.time_of_day) locationData.timeOfDay = enc.time_of_day;
    if (enc.season) locationData.season = enc.season;
    if (enc.special_requirements) {
      try {
        locationData.specialRequirements = JSON.parse(enc.special_requirements);
      } catch (e) {
        // Invalid JSON, skip
      }
    }
    
    gameMap.get(enc.game_id).locations.push(locationData);
  }
  
  // Build Pokemon data
  const pokemonInfo = {
    id: pkmn.id,
    name: pkmn.name,
    sprite: pkmn.sprite_url,
    generation: pkmn.generation,
    games: Array.from(gameMap.values())
  };
  
  // Write to file
  const filePath = path.join(API_DIR, `${pkmn.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(pokemonInfo, null, 2));
  
  generated++;
  
  if (generated % 100 === 0) {
    console.log(`   Generated ${generated}/${pokemon.length} endpoints...`);
  }
}

console.log(`\n✅ Generated ${generated} API endpoints\n`);

// Generate main dex.json (list of all Pokemon)
console.log('📋 Generating dex.json...');
const dexData = {
  pokemon: pokemon.map(p => ({
    id: p.id,
    name: p.name,
    sprite: p.sprite_url,
    generation: p.generation
  }))
};

fs.writeFileSync(DEX_FILE, JSON.stringify(dexData, null, 2));
console.log('   ✅ Generated dex.json\n');

// Summary with sample
console.log('📊 Sample API endpoint (Pokemon #1):');
const sample = JSON.parse(fs.readFileSync(path.join(API_DIR, '1.json'), 'utf-8'));
console.log(JSON.stringify(sample, null, 2).substring(0, 800) + '...\n');

console.log('✅ API generation complete!\n');

db.close();

