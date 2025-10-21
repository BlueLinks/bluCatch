import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get Pokemon name by ID
 */
function getPokemonName(pokemonId, pokemonData) {
  const pokemon = pokemonData.pokemon.find(p => p.id === pokemonId);
  return pokemon ? pokemon.name : `Pokemon #${pokemonId}`;
}

/**
 * Main function to enrich evolution strings in games.json
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║      ENRICH EVOLUTION STRINGS WITH METHOD DETAILS         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  // Load data files
  const evolutionsPath = path.join(__dirname, '../public/data/evolutions.json');
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  
  if (!fs.existsSync(evolutionsPath)) {
    console.error('❌ evolutions.json not found! Run fetch-evolution-data.js first.');
    process.exit(1);
  }
  
  const evolutionsData = JSON.parse(fs.readFileSync(evolutionsPath, 'utf-8'));
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  
  // Create backup
  const backupPath = gamesPath.replace('.json', `.before-evolution-enrichment-${Date.now()}.json`);
  fs.copyFileSync(gamesPath, backupPath);
  console.log(`📋 Backup: ${backupPath}\n`);
  
  let totalUpdated = 0;
  let gamesUpdated = 0;
  
  // Process each game
  for (const game of gamesData.games) {
    let gameUpdated = false;
    
    for (const pokemonEntry of game.pokemon) {
      const location = pokemonEntry.location;
      
      // Check if this is a simple "Evolve X" entry
      const evolveMatch = location.match(/^Evolve\s+(.+)$/i);
      if (!evolveMatch) continue;
      
      const fromPokemonName = evolveMatch[1].trim();
      
      // Find the evolution data for this Pokemon
      const evolutionInfo = evolutionsData.evolutions[pokemonEntry.id];
      
      if (!evolutionInfo) continue;
      
      // Get the name of the Pokemon it evolves from
      const evolvesFromName = getPokemonName(evolutionInfo.evolvesFrom, pokemonData);
      
      // Verify the name matches (case-insensitive)
      if (evolvesFromName.toLowerCase() !== fromPokemonName.toLowerCase()) {
        // Names don't match, skip
        continue;
      }
      
      // Build enriched location string
      let enrichedLocation = `Evolve ${evolvesFromName}`;
      
      switch (evolutionInfo.method) {
        case 'trade':
          enrichedLocation += ' (trade required)';
          break;
          
        case 'trade-with-item':
          enrichedLocation += ` (${evolutionInfo.requirement})`;
          break;
          
        case 'use-item':
          // Capitalize item name
          const itemName = evolutionInfo.requirement.split(' ').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join(' ');
          enrichedLocation += ` (${itemName})`;
          break;
          
        case 'level-up':
          // Only add details if it's not simple level up
          if (evolutionInfo.requirement !== 'Level up' && evolutionInfo.requirement !== evolutionInfo.requirement.match(/^Level \d+$/)) {
            enrichedLocation += ` (${evolutionInfo.requirement})`;
          } else if (evolutionInfo.requirement.match(/^Level \d+$/)) {
            enrichedLocation += ` (${evolutionInfo.requirement})`;
          }
          // Simple level up - no extra info needed
          break;
          
        case 'shed':
          enrichedLocation += ' (level up with empty party slot)';
          break;
          
        default:
          // Unknown method - keep as is
          break;
      }
      
      // Update if changed
      if (enrichedLocation !== location) {
        pokemonEntry.location = enrichedLocation;
        totalUpdated++;
        gameUpdated = true;
      }
    }
    
    if (gameUpdated) {
      gamesUpdated++;
    }
  }
  
  // Save updated games.json
  if (totalUpdated > 0) {
    fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
    console.log(`\n✅ Updated ${gamesPath}`);
    console.log(`📊 ${totalUpdated} evolution entries enriched across ${gamesUpdated} games\n`);
    
    console.log('Examples of enriched entries:');
    console.log('  - "Evolve Kadabra" → "Evolve Kadabra (trade required)"');
    console.log('  - "Evolve Onix" → "Evolve Onix (Trade holding metal coat)"');
    console.log('  - "Evolve Eevee" → "Evolve Eevee (Water Stone)"');
  } else {
    console.log('\n✅ No entries needed updating (already enriched or no evolutions found)');
  }
}

main().catch(console.error);

