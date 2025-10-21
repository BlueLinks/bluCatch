import Database from 'better-sqlite3';
import { parseRouteEncounters } from './scripts/modules/html-parser.js';
import { fetchBulbapediaPage } from './scripts/modules/bulbapedia-api.js';

const db = new Database('public/data/pokemon.db');

console.log('🔍 Testing Victory Road parser...\n');

try {
  const pageData = await fetchBulbapediaPage('Victory_Road_(Kanto)');
  const html = pageData.text['*']; // Extract HTML from API response
  console.log('✅ Fetched Victory Road (Kanto) page\n');
  
  const encounters = parseRouteEncounters(html, 'Victory Road', db);
  console.log(`\n📊 Found ${encounters.length} encounters total\n`);
  
  // Filter for Generation I (Red/Blue/Yellow) and Generation III (FireRed/LeafGreen)
  const genIandIII = encounters.filter(e => 
    ['red', 'blue', 'yellow', 'firered', 'leafgreen'].includes(e.game)
  );
  
  console.log(`Gen I & III encounters: ${genIandIII.length}\n`);
  
  // Show Onix and Machoke encounters specifically
  const onixMachoke = encounters.filter(e => 
    e.pokemonId === 95 || e.pokemonId === 67 // Onix and Machoke
  );
  
  console.log(`Onix and Machoke encounters:\n`);
  onixMachoke.forEach(enc => {
    const pokemon = db.prepare('SELECT name FROM pokemon WHERE id = ?').get(enc.pokemonId);
    console.log(`  ${pokemon.name}:`);
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
}

db.close();

