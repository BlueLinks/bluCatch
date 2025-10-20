import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map remakes to their original games
const REMAKE_MAPPINGS = {
  // Gen 3 remakes of Gen 1
  'firered': { original: 'red', maxGeneration: 3, name: 'FireRed' },
  'leafgreen': { original: 'blue', maxGeneration: 3, name: 'LeafGreen' },
  
  // Gen 4 remakes of Gen 2
  'heartgold': { original: 'gold', maxGeneration: 4, name: 'HeartGold' },
  'soulsilver': { original: 'silver', maxGeneration: 4, name: 'SoulSilver' },
  
  // Gen 6 remakes of Gen 3
  'omegaruby': { original: 'ruby', maxGeneration: 6, name: 'Omega Ruby' },
  'alphasapphire': { original: 'sapphire', maxGeneration: 6, name: 'Alpha Sapphire' },
  
  // Gen 8 remakes of Gen 4
  'brilliantdiamond': { original: 'diamond', maxGeneration: 8, name: 'Brilliant Diamond' },
  'shiningpearl': { original: 'pearl', maxGeneration: 8, name: 'Shining Pearl' }
};

function getPokemonGeneration(pokemonId, pokemonData) {
  const pokemon = pokemonData.pokemon.find(p => p.id === pokemonId);
  return pokemon ? pokemon.generation : 99;
}

function copyPokemonToRemakes(gamesData, pokemonData) {
  console.log('Copying Pokémon from original games to their remakes...\n');
  
  let totalCopied = 0;
  
  Object.entries(REMAKE_MAPPINGS).forEach(([remakeId, config]) => {
    const originalGame = gamesData.games.find(g => g.id === config.original);
    const remakeGame = gamesData.games.find(g => g.id === remakeId);
    
    if (!originalGame) {
      console.log(`⚠️  Original game '${config.original}' not found`);
      return;
    }
    
    if (!remakeGame) {
      console.log(`⚠️  Remake game '${remakeId}' not found`);
      return;
    }
    
    const existingIds = new Set(remakeGame.pokemon.map(p => p.id));
    const toCopy = [];
    
    // Copy Pokémon from original that:
    // 1. Aren't already in the remake
    // 2. Are from generations that existed when remake was released
    originalGame.pokemon.forEach(pkmn => {
      if (existingIds.has(pkmn.id)) return;
      
      const pokemonGen = getPokemonGeneration(pkmn.id, pokemonData);
      
      // Only copy if Pokémon was introduced before or during remake's generation
      if (pokemonGen <= config.maxGeneration) {
        toCopy.push({
          id: pkmn.id,
          location: pkmn.location // Keep same location as original
        });
      }
    });
    
    if (toCopy.length > 0) {
      remakeGame.pokemon.push(...toCopy);
      remakeGame.pokemon.sort((a, b) => a.id - b.id);
      console.log(`  ${config.name}: Copied ${toCopy.length} Pokémon from ${originalGame.name}`);
      totalCopied += toCopy.length;
    } else {
      console.log(`  ${config.name}: No new Pokémon to copy`);
    }
  });
  
  console.log(`\n✅ Copied ${totalCopied} Pokémon to remake games`);
  return totalCopied;
}

function main() {
  console.log('=== Copy Pokémon to Remake Games ===\n');
  console.log('This improves data for remakes like Omega Ruby/Alpha Sapphire\n');
  
  // Load data
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  if (!fs.existsSync(pokemonPath) || !fs.existsSync(gamesPath)) {
    console.error('❌ Required data files not found');
    process.exit(1);
  }
  
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
  // Backup
  const backupPath = gamesPath.replace('.json', '.before-remake-copy.json');
  fs.copyFileSync(gamesPath, backupPath);
  console.log(`📋 Backup saved to ${backupPath}\n`);
  
  // Copy to remakes
  const copied = copyPokemonToRemakes(gamesData, pokemonData);
  
  // Save
  fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
  console.log(`\n📝 Updated ${gamesPath}`);
  
  // Stats
  console.log('\n📊 Updated Pokémon counts for remakes:');
  Object.keys(REMAKE_MAPPINGS).forEach(remakeId => {
    const game = gamesData.games.find(g => g.id === remakeId);
    if (game) {
      console.log(`  ${game.name}: ${game.pokemon.length} Pokémon`);
    }
  });
  
  console.log('\n✨ Remake games updated!');
  console.log('   Example: Shroomish now in Omega Ruby/Alpha Sapphire');
}

main();

