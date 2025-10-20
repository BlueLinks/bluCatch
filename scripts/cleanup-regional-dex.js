import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract and clean regional dex info from location string
 */
function extractRegionalDexInfo(location) {
  // Match patterns like:
  // "Bulbasaur (Regional Dex #1)"
  // "Regional Dex #25"
  // "(Regional Dex #100)"
  const regionalDexMatch = location.match(/\(?Regional Dex #(\d+)\)?/i);
  
  if (regionalDexMatch) {
    // Remove the regional dex portion from location
    let cleanLocation = location
      .replace(/\(?Regional Dex #\d+\)?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If location becomes empty or just the Pokemon name, make it more generic
    if (!cleanLocation || cleanLocation.length < 3) {
      cleanLocation = 'Available in game';
    }
    
    return {
      cleanLocation,
      regionalDex: parseInt(regionalDexMatch[1])
    };
  }
  
  return {
    cleanLocation: location,
    regionalDex: null
  };
}

function cleanupGamesData(gamesData) {
  console.log('🧹 Cleaning up regional dex numbers from location strings...\n');
  
  let totalCleaned = 0;
  let totalWithDex = 0;
  
  gamesData.games.forEach(game => {
    let cleanedInGame = 0;
    let withDexInGame = 0;
    
    game.pokemon.forEach(pokemon => {
      const { cleanLocation, regionalDex } = extractRegionalDexInfo(pokemon.location);
      
      if (cleanLocation !== pokemon.location) {
        pokemon.location = cleanLocation;
        cleanedInGame++;
        totalCleaned++;
      }
      
      if (regionalDex) {
        pokemon.regionalDex = regionalDex;
        withDexInGame++;
        totalWithDex++;
      }
    });
    
    if (cleanedInGame > 0 || withDexInGame > 0) {
      console.log(`  ${game.name}:`);
      if (cleanedInGame > 0) {
        console.log(`    - Cleaned ${cleanedInGame} locations`);
      }
      if (withDexInGame > 0) {
        console.log(`    - Extracted ${withDexInGame} regional dex numbers`);
      }
    }
  });
  
  console.log(`\n✅ Cleanup complete:`);
  console.log(`   Locations cleaned: ${totalCleaned}`);
  console.log(`   Regional dex numbers extracted: ${totalWithDex}`);
  
  return { totalCleaned, totalWithDex };
}

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('         Clean Up Regional Dex Numbers');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  if (!fs.existsSync(gamesPath)) {
    console.error('❌ games.json not found');
    process.exit(1);
  }
  
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
  // Backup
  const backupPath = gamesPath.replace('.json', '.before-cleanup.json');
  fs.copyFileSync(gamesPath, backupPath);
  console.log(`📋 Backup: ${backupPath}\n`);
  
  // Clean up
  const { totalCleaned, totalWithDex } = cleanupGamesData(gamesData);
  
  // Save
  fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
  console.log(`\n💾 Saved to ${gamesPath}`);
  
  console.log('\n📊 Data Structure Updated:');
  console.log('   Before: { id: 25, location: "Pikachu (Regional Dex #25)" }');
  console.log('   After:  { id: 25, location: "Available in game", regionalDex: 25 }');
  
  console.log('\n✨ Location strings are now clean!');
  console.log('   Regional dex numbers preserved in separate field for future features');
}

main();

