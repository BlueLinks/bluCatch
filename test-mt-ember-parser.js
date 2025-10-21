import Database from 'better-sqlite3';
import { parseRouteEncounters } from './scripts/modules/html-parser.js';
import { fetchBulbapediaPage } from './scripts/modules/bulbapedia-api.js';

const db = new Database('public/data/pokemon.db');

console.log('🔍 Testing Mt. Ember parser...\n');

try {
  const pageData = await fetchBulbapediaPage('Mt._Ember');
  const html = pageData.text['*']; // Extract HTML from API response
  console.log('✅ Fetched Mt. Ember page\n');
  
  const encounters = parseRouteEncounters(html, 'Mt. Ember', db);
  console.log(`\n📊 Found ${encounters.length} encounters\n`);
  
  // Show first 10 encounters
  encounters.slice(0, 10).forEach(enc => {
    console.log(`  ${enc.pokemonName || `Pokemon #${enc.pokemonId}`}:`);
    console.log(`    Game: ${enc.game}`);
    console.log(`    Area: ${enc.area || 'N/A'}`);
    console.log(`    Level: ${enc.levelRange || 'MISSING'}`);
    console.log(`    Rate: ${enc.rate || 'N/A'}`);
    console.log('');
  });
  
  // Count how many are missing level_range
  const missingLevels = encounters.filter(e => !e.levelRange).length;
  console.log(`⚠️  ${missingLevels}/${encounters.length} encounters missing level_range`);
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}

db.close();

