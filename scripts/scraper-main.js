/**
 * Main scraper orchestrator
 * Coordinates Pokemon -> Locations -> Route scraping workflow
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapePokemonPage } from './modules/pokemon-scraper.js';
import { scrapeRoutePage, batchScrapeRoutes } from './modules/route-scraper.js';
import { isCached, getCacheStats, getUncachedLocations } from './modules/cache-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../public/data/pokemon.db');

// Configuration
const CONFIG = {
  startPokemonId: 1,
  endPokemonId: 151, // Start with Gen 1 for testing
  mode: 'routes-only', // 'full', 'routes-only', 'pokemon-only'
  force: false // Force re-scrape even if cached
};

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--start' && args[i + 1]) {
    CONFIG.startPokemonId = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--end' && args[i + 1]) {
    CONFIG.endPokemonId = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--mode' && args[i + 1]) {
    CONFIG.mode = args[i + 1];
    i++;
  } else if (args[i] === '--force') {
    CONFIG.force = true;
  }
}

console.log('\n🚀 Route-Based Scraper Started\n');
console.log('Configuration:');
console.log(`   Pokemon range: ${CONFIG.startPokemonId} - ${CONFIG.endPokemonId}`);
console.log(`   Mode: ${CONFIG.mode}`);
console.log(`   Force: ${CONFIG.force}\n`);

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

/**
 * Main orchestrator function
 */
async function main() {
  const startTime = Date.now();
  
  try {
    if (CONFIG.mode === 'routes-only') {
      // Only scrape uncached routes (skip Pokemon pages)
      await scrapeRoutesOnly();
    } else if (CONFIG.mode === 'pokemon-only') {
      // Only scrape Pokemon pages to build location database
      await scrapePokemonOnly();
    } else {
      // Full workflow: Pokemon -> Locations -> Routes
      await fullScrape();
    }
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ Scraping complete in ${elapsed}s\n`);
    
    // Show final stats
    showFinalStats();
    
  } catch (error) {
    console.error('\n❌ Scraper failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Full scraping workflow
 */
async function fullScrape() {
  console.log('📋 Starting full scrape workflow\n');
  
  // Step 1: Get Pokemon to scrape
  const pokemon = getPokemonToScrape();
  console.log(`Found ${pokemon.length} Pokemon to process\n`);
  
  let totalLocations = 0;
  let totalRoutes = 0;
  
  // Step 2: Process each Pokemon
  for (let i = 0; i < pokemon.length; i++) {
    const pkmn = pokemon[i];
    console.log(`\n[${i + 1}/${pokemon.length}] Processing ${pkmn.name} (#${pkmn.id})...`);
    
    // Extract locations from Pokemon page
    const locations = await scrapePokemonPage(db, pkmn);
    totalLocations += locations.length;
    
    if (locations.length === 0) {
      console.log(`  ⚠️  No locations found`);
      continue;
    }
    
    console.log(`  📍 Found ${locations.length} unique locations`);
    
    // Scrape each uncached location
    for (const location of locations) {
      if (!isCached(db, location.id) || CONFIG.force) {
        const result = await scrapeRoutePage(db, location, CONFIG.force);
        if (result.success) totalRoutes++;
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total locations discovered: ${totalLocations}`);
  console.log(`   Total routes scraped: ${totalRoutes}`);
}

/**
 * Scrape only uncached routes (skip Pokemon pages)
 */
async function scrapeRoutesOnly() {
  console.log('📋 Scraping uncached routes only\n');
  
  // Get uncached locations
  const locations = getUncachedLocations(db);
  
  if (locations.length === 0) {
    console.log('✅ All routes are already cached!\n');
    return;
  }
  
  console.log(`Found ${locations.length} uncached routes\n`);
  
  // Batch scrape with progress
  const results = await batchScrapeRoutes(db, locations, (current, total, location) => {
    console.log(`\n[${current}/${total}] ${location.name}...`);
  });
  
  console.log(`\n📊 Batch Scrape Results:`);
  console.log(`   Total: ${results.total}`);
  console.log(`   Success: ${results.success}`);
  console.log(`   Skipped: ${results.skipped}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Partial: ${results.partial}`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    results.errors.slice(0, 10).forEach(err => {
      console.log(`   ${err.locationId}: ${err.error}`);
    });
    if (results.errors.length > 10) {
      console.log(`   ... and ${results.errors.length - 10} more`);
    }
  }
}

/**
 * Scrape only Pokemon pages to build location database
 */
async function scrapePokemonOnly() {
  console.log('📋 Scraping Pokemon pages to build location database\n');
  
  const pokemon = getPokemonToScrape();
  console.log(`Found ${pokemon.length} Pokemon to process\n`);
  
  let totalLocations = 0;
  
  for (let i = 0; i < pokemon.length; i++) {
    const pkmn = pokemon[i];
    console.log(`\n[${i + 1}/${pokemon.length}] ${pkmn.name} (#${pkmn.id})...`);
    
    const locations = await scrapePokemonPage(db, pkmn);
    totalLocations += locations.length;
    
    if (locations.length > 0) {
      console.log(`  ✅ Found ${locations.length} locations`);
    }
  }
  
  console.log(`\n📊 Total locations discovered: ${totalLocations}`);
}

/**
 * Get Pokemon to scrape based on config
 * @returns {Array} Array of Pokemon objects
 */
function getPokemonToScrape() {
  return db.prepare(`
    SELECT id, name, generation
    FROM pokemon
    WHERE id BETWEEN ? AND ?
    ORDER BY id
  `).all(CONFIG.startPokemonId, CONFIG.endPokemonId);
}

/**
 * Show final statistics
 */
function showFinalStats() {
  console.log('📊 Final Statistics:\n');
  
  // Pokemon count
  const pokemonCount = db.prepare('SELECT COUNT(*) as count FROM pokemon').get().count;
  console.log(`   Pokemon: ${pokemonCount}`);
  
  // Locations count
  const locationsCount = db.prepare('SELECT COUNT(*) as count FROM locations').get().count;
  const scrapedLocations = db.prepare("SELECT COUNT(*) as count FROM locations WHERE scrape_status = 'pending'").get().count;
  console.log(`   Locations: ${locationsCount} (${scrapedLocations} pending)`);
  
  // Encounters count
  const encountersCount = db.prepare('SELECT COUNT(*) as count FROM encounters').get().count;
  const detailedEncounters = db.prepare('SELECT COUNT(*) as count FROM encounters WHERE location_id IS NOT NULL').get().count;
  console.log(`   Encounters: ${encountersCount} (${detailedEncounters} with location data)`);
  
  // Cache stats
  const cacheStats = getCacheStats(db);
  console.log(`   Cache: ${cacheStats.complete}/${cacheStats.total} complete`);
  
  // Games count
  const gamesCount = db.prepare('SELECT COUNT(*) as count FROM games').get().count;
  console.log(`   Games: ${gamesCount}\n`);
}

// Run the scraper
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

