/**
 * Route page scraper module
 * Queries Bulbapedia route pages to get all Pokemon encounters
 */

import { fetchBulbapediaPage } from './bulbapedia-api.js';
import { parseRouteEncounters } from './html-parser.js';
import { isCached, markLocationScraped } from './cache-manager.js';
import { detectAcquisitionMethod } from './detection-utils.js';

/**
 * Scrape a route page for Pokemon encounters
 * @param {Database} db - SQLite database instance
 * @param {Object} locationData - Location data object
 * @param {boolean} force - Force scrape even if cached
 * @returns {Promise<Object>} Scrape results
 */
export async function scrapeRoutePage(db, locationData, force = false) {
  const { id: locationId, bulbapedia_page: bulbapediaPage, name: locationName } = locationData;
  
  // Check cache first (unless forced)
  if (!force && isCached(db, locationId)) {
    console.log(`  ⏭️  Skipping ${locationName} - already scraped`);
    return { skipped: true, locationId };
  }
  
  try {
    console.log(`  📡 Querying ${bulbapediaPage}...`);
    
    // Fetch the route page
    const pageData = await fetchBulbapediaPage(bulbapediaPage);
    
    if (!pageData) {
      console.log(`  ⚠️  Page not found: ${bulbapediaPage}`);
      markLocationScraped(db, locationId, 'failed', { error: 'Page not found' });
      return { failed: true, locationId, error: 'Page not found' };
    }
    
    // Parse encounters from the HTML (pass db for Pokemon lookups)
    const html = pageData.text['*'];
    const encounters = parseRouteEncounters(html, locationName, db);
    
    console.log(`  ✅ Found ${encounters.length} encounters`);
    
    if (encounters.length === 0) {
      markLocationScraped(db, locationId, 'partial', { warning: 'No encounters found' });
      return { partial: true, locationId, encounters: [] };
    }
    
    // Insert encounters into database
    const insertedCount = insertEncounters(db, locationId, encounters);
    
    // Mark location as scraped
    markLocationScraped(db, locationId, 'complete', { 
      encountersFound: encounters.length,
      encountersInserted: insertedCount
    });
    
    return { 
      success: true, 
      locationId, 
      encounters, 
      insertedCount 
    };
    
  } catch (error) {
    console.error(`  ❌ Error scraping ${locationName}:`, error.message);
    markLocationScraped(db, locationId, 'failed', { error: error.message });
    return { failed: true, locationId, error: error.message };
  }
}

/**
 * Insert encounters into the database
 * @param {Database} db - SQLite database instance
 * @param {string} locationId - Location ID
 * @param {Array} encounters - Array of encounter objects
 * @returns {number} Number of encounters inserted
 */
function insertEncounters(db, locationId, encounters) {
  // Check if encounter exists
  const checkStmt = db.prepare(`
    SELECT id, encounter_area, level_range, encounter_rate 
    FROM encounters 
    WHERE pokemon_id = ? AND game_id = ? AND location = ?
  `);
  
  // Insert new encounter
  const insertStmt = db.prepare(`
    INSERT INTO encounters (
      pokemon_id, game_id, location, location_id, 
      encounter_area, level_range, encounter_rate,
      acquisition_method, special_requirements
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Update existing encounter if new data is more complete
  const updateStmt = db.prepare(`
    UPDATE encounters 
    SET encounter_area = ?, level_range = ?, encounter_rate = ?,
        acquisition_method = ?, special_requirements = ?
    WHERE id = ?
  `);
  
  // Get valid game IDs from database
  const validGames = new Set(db.prepare('SELECT id FROM games').all().map(g => g.id));
  
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  
  const transaction = db.transaction((encounters) => {
    for (const enc of encounters) {
      // Skip if game is unknown or invalid
      if (enc.game === 'unknown' || !validGames.has(enc.game)) {
        skippedCount++;
        continue;
      }
      
      // Use acquisitionMethod from parser if available, otherwise detect it
      const method = enc.acquisitionMethod || detectAcquisitionMethod({
        location: enc.location,
        area: enc.area,
        specialRequirements: enc.specialRequirements
      });
      
      const specialReqsJson = enc.specialRequirements 
        ? JSON.stringify(enc.specialRequirements)
        : null;
      
      // Check if encounter already exists
      const existing = checkStmt.get(enc.pokemonId, enc.game, enc.location);
      
      if (existing) {
        // Count non-null fields in new vs existing
        const newNonNull = [enc.area, enc.levelRange, enc.rate].filter(v => v).length;
        const existingNonNull = [existing.encounter_area, existing.level_range, existing.encounter_rate].filter(v => v).length;
        
        // Update if new data is more complete
        if (newNonNull > existingNonNull) {
          updateStmt.run(
            enc.area,
            enc.levelRange,
            enc.rate,
            method,
            specialReqsJson,
            existing.id
          );
          updatedCount++;
        }
      } else {
        // Insert new encounter
        const result = insertStmt.run(
          enc.pokemonId,
          enc.game,
          enc.location,
          locationId,
          enc.area,
          enc.levelRange,
          enc.rate,
          method,
          specialReqsJson
        );
        
        if (result.changes > 0) {
          insertedCount++;
        }
      }
    }
  });
  
  transaction(encounters);
  
  if (skippedCount > 0) {
    console.log(`    ⚠️  Skipped ${skippedCount} encounters with invalid game IDs`);
  }
  if (updatedCount > 0) {
    console.log(`    🔄 Updated ${updatedCount} encounters with more complete data`);
  }
  
  return insertedCount;
}

/**
 * Batch scrape multiple routes
 * @param {Database} db - SQLite database instance
 * @param {Array} locations - Array of location objects
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<Object>} Batch scrape results
 */
export async function batchScrapeRoutes(db, locations, progressCallback = null) {
  const results = {
    total: locations.length,
    success: 0,
    skipped: 0,
    failed: 0,
    partial: 0,
    errors: []
  };
  
  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    
    if (progressCallback) {
      progressCallback(i + 1, locations.length, location);
    }
    
    const result = await scrapeRoutePage(db, location);
    
    if (result.success) results.success++;
    else if (result.skipped) results.skipped++;
    else if (result.failed) {
      results.failed++;
      results.errors.push({ locationId: location.id, error: result.error });
    }
    else if (result.partial) results.partial++;
  }
  
  return results;
}

