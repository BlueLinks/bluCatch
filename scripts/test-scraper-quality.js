#!/usr/bin/env node
/**
 * Test suite for scraper data quality
 * Validates that scraped data doesn't have common issues
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'public', 'data', 'pokemon.db');
const db = new Database(dbPath);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      console.log(`   ${result}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

console.log('🧪 Running Scraper Data Quality Tests\n');

// Test 1: No cross-generation location pollution
test('No cross-generation location pollution', () => {
  const issues = [];
  
  // FireRed/LeafGreen (Gen 3 remakes) shouldn't have Gen 8 locations
  const frlgWithBDSP = db.prepare(`
    SELECT p.name, g.name as game, l.name as location
    FROM encounters e
    JOIN pokemon p ON e.pokemon_id = p.id
    JOIN games g ON e.game_id = g.id
    JOIN locations l ON e.location_id = l.id
    WHERE g.id IN ('firered', 'leafgreen')
      AND l.name IN ('Ramanas Park', 'Grand Underground', 'Distortion World')
  `).all();
  
  if (frlgWithBDSP.length > 0) {
    issues.push(`Found ${frlgWithBDSP.length} Gen 8 locations in FireRed/LeafGreen`);
    frlgWithBDSP.slice(0, 3).forEach(row => {
      issues.push(`  - ${row.name} in ${row.game}: ${row.location}`);
    });
  }
  
  // Diamond/Pearl (Gen 4) shouldn't have Gen 9 locations
  const dpWithSV = db.prepare(`
    SELECT p.name, g.name as game, l.name as location
    FROM encounters e
    JOIN pokemon p ON e.pokemon_id = p.id
    JOIN games g ON e.game_id = g.id
    JOIN locations l ON e.location_id = l.id
    WHERE g.id IN ('diamond', 'pearl', 'platinum')
      AND l.name IN ('Asado Desert', 'Casseroya Lake', 'Area Zero')
  `).all();
  
  if (dpWithSV.length > 0) {
    issues.push(`Found ${dpWithSV.length} Gen 9 locations in Diamond/Pearl/Platinum`);
  }
  
  return issues.length === 0 || issues.join('\n   ');
});

// Test 2: Legendary Pokémon have correct locations per game
test('Moltres locations are game-appropriate', () => {
  const moltres = db.prepare(`
    SELECT g.name as game, l.name as location, g.generation
    FROM encounters e
    JOIN games g ON e.game_id = g.id
    JOIN locations l ON e.location_id = l.id
    WHERE e.pokemon_id = 146 AND e.location_id IS NOT NULL
  `).all();
  
  const issues = [];
  
  moltres.forEach(row => {
    // Check for impossible combinations
    if (row.game.includes('Pearl') && !row.game.includes('Shining')) {
      issues.push(`Moltres in ${row.game} at ${row.location} (Pearl shouldn't have Moltres)`);
    }
    if (row.location === 'Ramanas Park' && row.generation < 8) {
      issues.push(`${row.game} has Ramanas Park (only in BDSP/Gen 8)`);
    }
    if (row.location === 'Mt. Ember' && !row.game.includes('FireRed') && !row.game.includes('LeafGreen')) {
      issues.push(`${row.game} has Mt. Ember (only in FireRed/LeafGreen)`);
    }
  });
  
  return issues.length === 0 || issues.join('\n   ');
});

// Test 3: BDSP-exclusive locations only in BDSP
test('BDSP-exclusive locations only appear in BDSP games', () => {
  const bdsplLocations = db.prepare(`
    SELECT g.id as game_id, g.name as game, l.name as location, COUNT(*) as count
    FROM encounters e
    JOIN games g ON e.game_id = g.id
    JOIN locations l ON e.location_id = l.id
    WHERE l.name IN ('Ramanas Park', 'Grand Underground', 'Distortion World')
      AND g.id NOT IN ('brilliantdiamond', 'shiningpearl')
    GROUP BY g.id, l.name
  `).all();
  
  if (bdsplLocations.length > 0) {
    const issues = bdsplLocations.map(row => 
      `${row.location} found in ${row.game} (${row.count} encounters)`
    );
    return issues.join('\n   ');
  }
  
  return true;
});

// Test 4: Gen 9 locations only in Gen 9 games
test('Gen 9 locations only appear in Gen 9 games', () => {
  const gen9Locations = db.prepare(`
    SELECT g.id as game_id, g.name as game, l.name as location, g.generation
    FROM encounters e
    JOIN games g ON e.game_id = g.id
    JOIN locations l ON e.location_id = l.id
    WHERE l.name IN ('Asado Desert', 'South Province', 'Area Zero', 'Casseroya Lake')
      AND g.generation != 9
    GROUP BY g.id, l.name
  `).all();
  
  if (gen9Locations.length > 0) {
    const issues = gen9Locations.map(row => 
      `${row.location} found in ${row.game} (Gen ${row.generation})`
    );
    return issues.join('\n   ');
  }
  
  return true;
});

// Test 5: No encounters with level range anomalies  
test('Level ranges are reasonable', () => {
  // Some encounters legitimately have wide level ranges:
  // - Let's Go midair encounters: 3-56 (rare spawns, combo chains)
  // - Fishing encounters: 5-40 (water Pokemon)
  // Only flag truly suspicious ranges (>50 levels in non-Let's Go games)
  const badLevels = db.prepare(`
    SELECT p.name, g.name as game, l.name as location, e.level_range, e.encounter_area
    FROM encounters e
    JOIN pokemon p ON e.pokemon_id = p.id
    JOIN games g ON e.game_id = g.id
    LEFT JOIN locations l ON e.location_id = l.id
    WHERE e.level_range IS NOT NULL
      AND e.level_range LIKE '%-%'
      AND (
        -- Level range spans more than 50 levels in non-Let's Go games
        (CAST(substr(e.level_range, instr(e.level_range, '-') + 1) AS INTEGER) - 
         CAST(substr(e.level_range, 1, instr(e.level_range, '-') - 1) AS INTEGER)) > 50
        AND g.id NOT IN ('letsgopikachu', 'letsgoeevee')
      )
    LIMIT 10
  `).all();
  
  if (badLevels.length > 0) {
    const issues = badLevels.map(row => 
      `${row.name} Lv.${row.level_range} at ${row.location || row.game} (${row.encounter_area})`
    );
    return issues.join('\n   ');
  }
  
  return true;
});

// Test 6: Enhanced encounters have required fields
test('Enhanced encounters have location_id and area', () => {
  // Some Bulbapedia tables use simplified formats without level data
  // As long as we have location and area, that's acceptable
  const incomplete = db.prepare(`
    SELECT COUNT(*) as count
    FROM encounters
    WHERE location_id IS NOT NULL
      AND encounter_area IS NULL
  `).get();
  
  if (incomplete.count > 0) {
    return `Found ${incomplete.count} enhanced encounters missing encounter_area`;
  }
  
  // Report on missing levels as info (not a failure)
  const missingLevels = db.prepare(`
    SELECT COUNT(*) as count
    FROM encounters
    WHERE location_id IS NOT NULL AND level_range IS NULL
  `).get();
  
  if (missingLevels.count > 0) {
    console.log(`   ℹ️  ${missingLevels.count} encounters missing level_range (simplified tables)`);
  }
  
  return true;
});

// Test 7: Caterpie dual-slot filtering works
test('Caterpie Route 204 encounters have dual-slot requirements', () => {
  const caterpie = db.prepare(`
    SELECT e.location, e.special_requirements
    FROM encounters e
    JOIN pokemon p ON e.pokemon_id = p.id
    WHERE p.name = 'Caterpie'
      AND e.location LIKE '%Route 204%'
      AND e.location LIKE '%(FireRed)%'
  `).all();
  
  if (caterpie.length > 0) {
    const missing = caterpie.filter(row => !row.special_requirements);
    if (missing.length > 0) {
      return `Found ${missing.length} Route 204 (FireRed) encounters without dual-slot flag`;
    }
  }
  
  return true;
});

// Test 8: Let's Go locations only in Let's Go games
test("Let's Go locations only appear in Let's Go games", () => {
  const letsGoLocations = db.prepare(`
    SELECT g.id as game_id, g.name as game, l.name as location
    FROM encounters e
    JOIN games g ON e.game_id = g.id
    JOIN locations l ON e.location_id = l.id
    WHERE l.region = 'kanto' 
      AND g.generation = 7
      AND l.name LIKE '%Ride%'
      AND g.id NOT IN ('letsgopikachu', 'letsgoeevee')
  `).all();
  
  if (letsGoLocations.length > 0) {
    const issues = letsGoLocations.map(row => 
      `${row.location} found in ${row.game}`
    );
    return issues.join('\n   ');
  }
  
  return true;
});

// Test 9: Stats check
test('Database has reasonable data counts', () => {
  const stats = db.prepare(`
    SELECT 
      COUNT(DISTINCT pokemon_id) as pokemon_count,
      COUNT(DISTINCT location_id) as location_count,
      COUNT(*) as total_encounters,
      SUM(CASE WHEN location_id IS NOT NULL THEN 1 ELSE 0 END) as enhanced_encounters
    FROM encounters
  `).get();
  
  const issues = [];
  
  if (stats.enhanced_encounters === 0) {
    issues.push('No enhanced encounters found');
  }
  
  if (stats.location_count === 0) {
    issues.push('No locations found');
  }
  
  if (stats.pokemon_count < 100) {
    issues.push(`Only ${stats.pokemon_count} Pokemon have encounters`);
  }
  
  if (issues.length > 0) {
    return issues.join('\n   ');
  }
  
  console.log(`   📊 ${stats.enhanced_encounters}/${stats.total_encounters} enhanced, ${stats.location_count} locations, ${stats.pokemon_count} Pokemon`);
  return true;
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50));

db.close();
process.exit(failed > 0 ? 1 : 0);

