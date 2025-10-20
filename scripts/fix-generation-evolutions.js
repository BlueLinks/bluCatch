import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map of what generation each game belongs to (for evolution availability)
const GAME_GENERATIONS = {
  'red': 1, 'blue': 1, 'yellow': 1,
  'gold': 2, 'silver': 2, 'crystal': 2,
  'ruby': 3, 'sapphire': 3, 'emerald': 3, 'firered': 3, 'leafgreen': 3,
  'diamond': 4, 'pearl': 4, 'platinum': 4, 'heartgold': 4, 'soulsilver': 4,
  'black': 5, 'white': 5, 'black2': 5, 'white2': 5,
  'x': 6, 'y': 6, 'omegaruby': 6, 'alphasapphire': 6,
  'sun': 7, 'moon': 7, 'ultrasun': 7, 'ultramoon': 7, 'letsgopikachu': 7, 'letsgoeevee': 7,
  'sword': 8, 'shield': 8, 'brilliantdiamond': 8, 'shiningpearl': 8, 'legendsarceus': 8,
  'scarlet': 9, 'violet': 9
};

function cleanFutureEvolutions(gamesData, pokemonData) {
  console.log('Removing evolutions that didn\'t exist when games were released...\n');
  
  const pokemonById = new Map(pokemonData.pokemon.map(p => [p.id, p]));
  let totalRemoved = 0;
  
  gamesData.games.forEach(game => {
    const gameGeneration = GAME_GENERATIONS[game.id];
    
    if (!gameGeneration) {
      console.log(`⚠️  Warning: Unknown generation for game ${game.id}`);
      return;
    }
    
    const before = game.pokemon.length;
    
    // Filter out Pokemon that were introduced after this game's generation
    game.pokemon = game.pokemon.filter(pkmn => {
      const pokemon = pokemonById.get(pkmn.id);
      
      if (!pokemon) {
        console.log(`⚠️  Warning: Pokemon ${pkmn.id} not found in pokemon.json`);
        return true; // Keep it to be safe
      }
      
      // Keep the Pokemon only if it was introduced in or before this game's generation
      const shouldKeep = pokemon.generation <= gameGeneration;
      
      if (!shouldKeep) {
        // This is a future evolution - remove it
        return false;
      }
      
      return true;
    });
    
    const removed = before - game.pokemon.length;
    
    if (removed > 0) {
      console.log(`  ${game.name} (Gen ${gameGeneration}): Removed ${removed} future evolutions`);
      totalRemoved += removed;
    }
  });
  
  console.log(`\n✅ Removed ${totalRemoved} future evolutions across all games`);
  
  return totalRemoved;
}

function main() {
  console.log('=== Fix Generation-Locked Evolutions ===\n');
  console.log('This script removes evolutions that didn\'t exist in earlier games.');
  console.log('Example: Steelix (Gen 2) removed from Blue (Gen 1)\n');
  
  // Load data
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  if (!fs.existsSync(pokemonPath) || !fs.existsSync(gamesPath)) {
    console.error('❌ Required data files not found');
    process.exit(1);
  }
  
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
  // Backup games.json
  const backupPath = gamesPath.replace('.json', '.before-gen-fix.json');
  fs.copyFileSync(gamesPath, backupPath);
  console.log(`📋 Backup saved to ${backupPath}\n`);
  
  // Clean future evolutions
  const removed = cleanFutureEvolutions(gamesData, pokemonData);
  
  // Save updated games.json
  fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
  console.log(`\n📝 Updated ${gamesPath}`);
  
  // Print updated stats for Gen 1-3 games
  console.log('\n📊 Updated Pokemon counts (Gen 1-3):');
  gamesData.games.slice(0, 11).forEach(game => {
    console.log(`  ${game.name}: ${game.pokemon.length} Pokemon`);
  });
  
  console.log('\n✨ Generation-locked evolutions fixed!');
  console.log('   Games now only show Pokemon that existed when they were released.');
  console.log('\n🎯 Examples of fixes:');
  console.log('   • Steelix removed from Gen 1 games (introduced in Gen 2)');
  console.log('   • Magnezone removed from Gen 1-3 games (introduced in Gen 4)');
  console.log('   • Electivire removed from Gen 1-3 games (introduced in Gen 4)');
  console.log('   • Sylveon removed from Gen 1-5 games (introduced in Gen 6)');
}

main();

