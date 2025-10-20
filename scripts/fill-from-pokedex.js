import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map PokeAPI Pokedexes to our games
const POKEDEX_MAP = {
  // Gen 1
  '2': ['red', 'blue'], // Kanto
  '26': ['yellow'], // Updated Kanto

  // Gen 2  
  '3': ['gold', 'silver'], // Original Johto
  '7': ['crystal'], // Updated Johto
  
  // Gen 3
  '4': ['ruby', 'sapphire'], // Hoenn
  '15': ['emerald'], // Extended Hoenn
  '12': ['firered', 'leafgreen'], // Updated Kanto
  
  // Gen 4
  '5': ['diamond', 'pearl'], // Original Sinnoh
  '6': ['platinum'], // Extended Sinnoh
  '8': ['heartgold', 'soulsilver'], // Updated Johto
  
  // Gen 5
  '9': ['black', 'white'], // Original Unova
  '11': ['black2', 'white2'], // Updated Unova
  
  // Gen 6
  '12': ['x', 'y'], // Central Kalos (they have 3 dexes but let's start with central)
  '13': ['x', 'y'], // Coastal Kalos
  '14': ['x', 'y'], // Mountain Kalos
  '15': ['omegaruby', 'alphasapphire'], // Updated Hoenn
  
  // Gen 7
  '16': ['sun', 'moon'], // Original Alola (Melemele)
  '17': ['sun', 'moon'], // Original Alola (Akala)
  '18': ['sun', 'moon'], // Original Alola (Ulaula)
  '19': ['sun', 'moon'], // Original Alola (Poni)
  '21': ['ultrasun', 'ultramoon'], // Updated Alola (Melemele)
  '22': ['ultrasun', 'ultramoon'], // Updated Alola (Akala)
  '23': ['ultrasun', 'ultramoon'], // Updated Alola (Ulaula)
  '24': ['ultrasun', 'ultramoon'], // Updated Alola (Poni)
  '27': ['letsgopikachu', 'letsgoeevee'], // Kanto in Let's Go
  
  // Gen 8
  '28': ['sword', 'shield'], // Galar (Isle of Armor)
  '29': ['sword', 'shield'], // Galar (Crown Tundra)  
  '30': ['brilliantdiamond', 'shiningpearl'], // Sinnoh in BDSP
  '31': ['legendsarceus'], // Hisui
  
  // Gen 9
  '31': ['scarlet', 'violet'], // Paldea
  '32': ['scarlet', 'violet'], // Kitakami
  '33': ['scarlet', 'violet'] // Blueberry
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPokedex(pokedexId) {
  const url = `https://pokeapi.co/api/v2/pokedex/${pokedexId}/`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`  ❌ Error fetching Pokedex ${pokedexId}:`, error.message);
    return null;
  }
}

async function fillFromPokedexes(gamesData, pokemonData) {
  console.log('📚 Filling game data from PokeAPI Pokedex data...\n');
  
  let totalAdded = 0;
  let gamesUpdated = 0;
  
  for (const [pokedexId, gameIds] of Object.entries(POKEDEX_MAP)) {
    process.stdout.write(`  Fetching Pokedex ${pokedexId}... `);
    
    const pokedexData = await fetchPokedex(pokedexId);
    
    if (!pokedexData) {
      console.log('not found');
      await delay(100);
      continue;
    }
    
    console.log(`${pokedexData.name} (${pokedexData.pokemon_entries.length} Pokémon)`);
    
    // Extract Pokemon IDs from pokedex
    const pokemonInDex = [];
    for (const entry of pokedexData.pokemon_entries) {
      // Get Pokemon ID from URL
      const pokemonUrl = entry.pokemon_species.url;
      const pokemonId = parseInt(pokemonUrl.split('/').slice(-2)[0]);
      
      // Find in our pokemon data
      const pokemon = pokemonData.pokemon.find(p => p.id === pokemonId);
      if (!pokemon) continue;
      
      pokemonInDex.push({
        id: pokemonId,
        location: `${pokemon.name} (Regional Dex #${entry.entry_number})`
      });
    }
    
    // Add to each game
    for (const gameId of gameIds) {
      const game = gamesData.games.find(g => g.id === gameId);
      if (!game) {
        console.log(`    ⚠️  Game ${gameId} not found`);
        continue;
      }
      
      const existingIds = new Set(game.pokemon.map(p => p.id));
      const toAdd = pokemonInDex.filter(p => !existingIds.has(p.id));
      
      if (toAdd.length > 0) {
        game.pokemon.push(...toAdd);
        game.pokemon.sort((a, b) => a.id - b.id);
        console.log(`    ${game.name}: +${toAdd.length} (${game.pokemon.length} total)`);
        totalAdded += toAdd.length;
        gamesUpdated++;
      }
    }
    
    await delay(200); // Rate limiting
  }
  
  return { gamesUpdated, totalAdded };
}

async function main() {
  console.log('=== Fill Games from PokeAPI Pokedex Data ===\n');
  console.log('This uses Regional Pokedex data (more complete than encounters)\n');
  
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
  const backupPath = gamesPath.replace('.json', '.before-pokedex-fill.json');
  fs.copyFileSync(gamesPath, backupPath);
  console.log(`📋 Backup saved to ${backupPath}\n`);
  
  // Fill from pokedexes
  const { gamesUpdated, totalAdded } = await fillFromPokedexes(gamesData, pokemonData);
  
  // Save
  if (totalAdded > 0) {
    fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
    console.log(`\n💾 Updated ${gamesPath}`);
    console.log(`\n✨ ${gamesUpdated} game entries updated with ${totalAdded} Pokémon!`);
  } else {
    console.log('\n✅ No new Pokémon to add from Pokedex data');
  }
  
  console.log('\n📝 Note: This adds Pokemon based on Regional Dex membership');
  console.log('   Locations are marked as "Regional Dex #X" for reference');
}

main().catch(console.error);

