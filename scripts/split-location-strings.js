/**
 * Split concatenated location strings into separate encounter records
 * This migrates from old format: "Route 204, Eterna Forest (FireRed)"
 * To new format: Separate records for each location
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../public/data/pokemon.db');

console.log('🔄 Splitting concatenated location strings...\n');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Get all encounters with comma-separated locations
const encounters = db.prepare(`
  SELECT id, pokemon_id, game_id, location, acquisition_method, special_requirements
  FROM encounters
  WHERE location LIKE '%,%'
`).all();

console.log(`Found ${encounters.length} encounters with multiple locations\n`);

if (encounters.length === 0) {
  console.log('✅ No location strings to split\n');
  db.close();
  process.exit(0);
}

// Prepare statements
const insertStmt = db.prepare(`
  INSERT INTO encounters (
    pokemon_id, game_id, location, location_id, 
    encounter_area, level_range, encounter_rate,
    acquisition_method, special_requirements,
    time_of_day, season
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const deleteStmt = db.prepare('DELETE FROM encounters WHERE id = ?');

let splitCount = 0;
let newRecords = 0;

const transaction = db.transaction(() => {
  for (const enc of encounters) {
    // Split location string by comma
    const locations = enc.location.split(',').map(loc => loc.trim());
    
    if (locations.length > 1) {
      console.log(`Splitting: "${enc.location}"`);
      console.log(`  → ${locations.length} separate locations`);
      
      // Create a separate encounter for each location
      for (const location of locations) {
        insertStmt.run(
          enc.pokemon_id,
          enc.game_id,
          location,
          null, // location_id (will be set when routes are scraped)
          null, // encounter_area
          null, // level_range
          null, // encounter_rate
          enc.acquisition_method,
          enc.special_requirements,
          null, // time_of_day
          null  // season
        );
        newRecords++;
      }
      
      // Delete the original concatenated record
      deleteStmt.run(enc.id);
      splitCount++;
    }
  }
});

transaction();

console.log(`\n✅ Split ${splitCount} location strings into ${newRecords} separate records\n`);

// Show sample results
console.log('Sample results:');
const samples = db.prepare(`
  SELECT p.name, g.name as game, e.location
  FROM encounters e
  JOIN pokemon p ON e.pokemon_id = p.id
  JOIN games g ON e.game_id = g.id
  WHERE p.id = 10 AND g.id = 'platinum'
`).all();

samples.forEach(s => {
  console.log(`  ${s.name} in ${s.game}: ${s.location}`);
});

console.log('\n✅ Migration complete!\n');

db.close();

