import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-game trades for each game (NPCs that trade you Pokémon)
const IN_GAME_TRADES = {
  'red': [
    { id: 124, location: 'In-game trade in Cerulean City (for Poliwhirl)' }, // Jynx
    { id: 122, location: 'In-game trade on Route 2 (for Abra)' }, // Mr. Mime
    { id: 114, location: 'In-game trade on Route 18 (for Venonat)' }, // Tangela
    { id: 83, location: 'In-game trade in Vermilion City (for Spearow)' }, // Farfetch'd
    { id: 101, location: 'In-game trade in Cinnabar Lab (for Raichu)' }, // Electrode
    { id: 98, location: 'In-game trade in Route 11 Gate (for Goldeen)' }, // Krabby
    { id: 80, location: 'In-game trade in Cinnabar Lab (for Kadabra)' }, // Slowbro
    { id: 93, location: 'In-game trade in Route 18 Gate (for Haunter)' }, // Haunter (becomes Gengar)
    { id: 94, location: 'Evolve Haunter (received in trade)' }, // Gengar
    { id: 26, location: 'In-game trade in Route 18 Gate (for Pikachu)' }, // Raichu
    { id: 115, location: 'In-game trade on Route 5 (for Cubone)' } // Kangaskhan (Blue exclusive trade)
  ],
  'blue': [
    { id: 124, location: 'In-game trade in Cerulean City (for Poliwhirl)' }, // Jynx
    { id: 122, location: 'In-game trade on Route 2 (for Abra)' }, // Mr. Mime
    { id: 114, location: 'In-game trade on Route 18 (for Venonat)' }, // Tangela
    { id: 83, location: 'In-game trade in Vermilion City (for Spearow)' }, // Farfetch'd
    { id: 101, location: 'In-game trade in Cinnabar Lab (for Raichu)' }, // Electrode
    { id: 98, location: 'In-game trade in Route 11 Gate (for Goldeen)' }, // Krabby
    { id: 80, location: 'In-game trade in Cinnabar Lab (for Kadabra)' }, // Slowbro
    { id: 93, location: 'In-game trade in Route 18 Gate (for Haunter)' }, // Haunter
    { id: 94, location: 'Evolve Haunter (received in trade)' }, // Gengar
    { id: 26, location: 'In-game trade in Route 18 Gate (for Pikachu)' }, // Raichu
    { id: 108, location: 'In-game trade on Route 11 (for Slowbro)' } // Lickitung (Red exclusive trade)
  ],
  'yellow': [
    { id: 124, location: 'In-game trade in Cerulean City (for Poliwhirl)' }, // Jynx
    { id: 122, location: 'In-game trade on Route 11 (for Clefairy)' }, // Mr. Mime
    { id: 114, location: 'In-game trade in Cinnabar Island (for Venonat)' }, // Tangela
    { id: 83, location: 'In-game trade in Vermilion City (for Spearow)' }, // Farfetch'd
    { id: 108, location: 'In-game trade on Route 18 (for Slowbro)' }, // Lickitung
    { id: 97, location: 'In-game trade in Cinnabar Lab (for Raichu)' }, // Hypno
    { id: 76, location: 'In-game trade in Pewter City (for Kangaskhan)' }, // Golem
    { id: 75, location: 'Evolve Graveler' }, // Graveler
    { id: 115, location: 'In-game trade in Cinnabar Lab (for Growlithe)' } // Kangaskhan
  ],
  'gold': [
    { id: 95, location: 'In-game trade in Violet City (for Bellsprout)' }, // Onix
    { id: 66, location: 'In-game trade in Goldenrod City (for Drowzee)' }, // Machop
    { id: 100, location: 'In-game trade in Olivine City (for Krabby)' }, // Voltorb
    { id: 175, location: 'Odd Egg from Day Care' }, // Togepi
    { id: 147, location: 'In-game trade in Blackthorn City (for Dragonair)' }, // Dratini
    { id: 185, location: 'In-game trade on Route 35 (for any Pokémon)' } // Sudowoodo
  ],
  'silver': [
    { id: 95, location: 'In-game trade in Violet City (for Bellsprout)' }, // Onix
    { id: 66, location: 'In-game trade in Goldenrod City (for Drowzee)' }, // Machop
    { id: 100, location: 'In-game trade in Olivine City (for Krabby)' }, // Voltorb
    { id: 175, location: 'Odd Egg from Day Care' }, // Togepi
    { id: 147, location: 'In-game trade in Blackthorn City (for Dragonair)' }, // Dratini
    { id: 185, location: 'In-game trade on Route 35 (for any Pokémon)' } // Sudowoodo
  ],
  'crystal': [
    { id: 95, location: 'In-game trade in Violet City (for Bellsprout)' }, // Onix
    { id: 66, location: 'In-game trade in Goldenrod City (for Drowzee)' }, // Machop
    { id: 100, location: 'In-game trade in Olivine City (for Krabby)' }, // Voltorb
    { id: 175, location: 'Odd Egg from Day Care' }, // Togepi
    { id: 147, location: 'In-game trade in Blackthorn City (for Dragonair)' }, // Dratini
    { id: 185, location: 'In-game trade on Route 35 (for any Pokémon)' } // Sudowoodo
  ],
  'ruby': [
    { id: 296, location: 'In-game trade in Rustboro City (for Slakoth)' }, // Makuhita
    { id: 307, location: 'In-game trade on Route 118 (for Plusle)' } // Meditite (Sapphire trade)
  ],
  'sapphire': [
    { id: 296, location: 'In-game trade in Rustboro City (for Slakoth)' }, // Makuhita
    { id: 312, location: 'In-game trade on Route 118 (for Minun)' } // Minun (Ruby trade)
  ],
  'emerald': [
    { id: 296, location: 'In-game trade in Rustboro City (for Slakoth)' }, // Makuhita
    { id: 273, location: 'In-game trade on Route 120 (for Ralts)' } // Seedot
  ],
  'firered': [
    { id: 124, location: 'In-game trade in Cerulean City (for Poliwhirl)' }, // Jynx
    { id: 122, location: 'In-game trade on Route 2 (for Abra)' }, // Mr. Mime
    { id: 114, location: 'In-game trade on Route 18 (for Venonat)' }, // Tangela
    { id: 83, location: 'In-game trade in Vermilion City (for Spearow)' }, // Farfetch'd
    { id: 101, location: 'In-game trade in Cinnabar Lab (for Raichu)' }, // Electrode
    { id: 108, location: 'In-game trade on Route 11 (for Goldeen)' }, // Lickitung
    { id: 80, location: 'In-game trade in Cinnabar Lab (for Kadabra)' } // Slowbro
  ],
  'leafgreen': [
    { id: 124, location: 'In-game trade in Cerulean City (for Poliwhirl)' }, // Jynx
    { id: 122, location: 'In-game trade on Route 2 (for Abra)' }, // Mr. Mime
    { id: 114, location: 'In-game trade on Route 18 (for Venonat)' }, // Tangela
    { id: 83, location: 'In-game trade in Vermilion City (for Spearow)' }, // Farfetch'd
    { id: 101, location: 'In-game trade in Cinnabar Lab (for Raichu)' }, // Electrode
    { id: 108, location: 'In-game trade on Route 11 (for Goldeen)' }, // Lickitung
    { id: 80, location: 'In-game trade in Cinnabar Lab (for Kadabra)' } // Slowbro
  ],
  'diamond': [
    { id: 66, location: 'In-game trade in Oreburgh City (for Machop)' }, // Machop
    { id: 95, location: 'In-game trade in Snowpoint City (for Medicham)' }, // Onix
    { id: 129, location: 'In-game trade on Route 226 (for Finneon)' } // Magikarp
  ],
  'pearl': [
    { id: 66, location: 'In-game trade in Oreburgh City (for Machop)' }, // Machop
    { id: 95, location: 'In-game trade in Snowpoint City (for Medicham)' }, // Onix
    { id: 129, location: 'In-game trade on Route 226 (for Finneon)' } // Magikarp
  ],
  'platinum': [
    { id: 66, location: 'In-game trade in Oreburgh City (for Machop)' }, // Machop
    { id: 95, location: 'In-game trade in Snowpoint City (for Medicham)' }, // Onix
    { id: 129, location: 'In-game trade on Route 226 (for Finneon)' } // Magikarp
  ]
};

function addInGameTrades(gamesData) {
  console.log('Adding in-game trade Pokémon...\n');
  
  let totalAdded = 0;
  
  gamesData.games.forEach(game => {
    const trades = IN_GAME_TRADES[game.id];
    
    if (!trades) {
      return; // No trades for this game
    }
    
    const existingIds = new Set(game.pokemon.map(p => p.id));
    const toAdd = trades.filter(trade => !existingIds.has(trade.id));
    
    if (toAdd.length > 0) {
      game.pokemon.push(...toAdd);
      game.pokemon.sort((a, b) => a.id - b.id);
      console.log(`  ${game.name}: Added ${toAdd.length} in-game trade Pokémon`);
      totalAdded += toAdd.length;
    }
  });
  
  console.log(`\n✅ Added ${totalAdded} in-game trade Pokémon across all games`);
  
  return totalAdded;
}

function main() {
  console.log('=== Add In-Game Trade Pokémon ===\n');
  console.log('This script adds Pokémon obtained through NPC trades.');
  console.log('Examples: Jynx, Mr. Mime, Farfetch\'d in Red/Blue\n');
  
  // Load data
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  if (!fs.existsSync(gamesPath)) {
    console.error('❌ games.json not found');
    process.exit(1);
  }
  
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
  // Backup
  const backupPath = gamesPath.replace('.json', '.before-trades.json');
  fs.copyFileSync(gamesPath, backupPath);
  console.log(`📋 Backup saved to ${backupPath}\n`);
  
  // Add in-game trades
  const added = addInGameTrades(gamesData);
  
  // Save
  fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
  console.log(`\n📝 Updated ${gamesPath}`);
  
  // Print stats for Gen 1-2 games
  console.log('\n📊 Updated Pokémon counts (Gen 1-2):');
  gamesData.games.slice(0, 6).forEach(game => {
    console.log(`  ${game.name}: ${game.pokemon.length} Pokémon`);
  });
  
  console.log('\n✨ In-game trades successfully added!');
  console.log('   Games now include Pokémon from NPC trades.');
  console.log('\n🎯 Examples:');
  console.log('   • Jynx now available in Red/Blue (trade Poliwhirl)');
  console.log('   • Mr. Mime now available in Red/Blue (trade Abra)');
  console.log('   • Farfetch\'d now available (trade Spearow)');
}

main();

