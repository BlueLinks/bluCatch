import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DELAY_MS = 200; // Rate limiting

// Map PokeAPI version names to our game IDs
const VERSION_MAP = {
  'red': 'red',
  'blue': 'blue',
  'yellow': 'yellow',
  'gold': 'gold',
  'silver': 'silver',
  'crystal': 'crystal',
  'ruby': 'ruby',
  'sapphire': 'sapphire',
  'emerald': 'emerald',
  'firered': 'firered',
  'leafgreen': 'leafgreen',
  'diamond': 'diamond',
  'pearl': 'pearl',
  'platinum': 'platinum',
  'heartgold': 'heartgold',
  'soulsilver': 'soulsilver',
  'black': 'black',
  'white': 'white',
  'black-2': 'black2',
  'white-2': 'white2',
  'x': 'x',
  'y': 'y',
  'omega-ruby': 'omegaruby',
  'alpha-sapphire': 'alphasapphire',
  'sun': 'sun',
  'moon': 'moon',
  'ultra-sun': 'ultrasun',
  'ultra-moon': 'ultramoon',
  'lets-go-pikachu': 'letsgopikachu',
  'lets-go-eevee': 'letsgoeevee',
  'sword': 'sword',
  'shield': 'shield',
  'brilliant-diamond': 'brilliantdiamond',
  'shining-pearl': 'shiningpearl',
  'legends-arceus': 'legendsarceus',
  'scarlet': 'scarlet',
  'violet': 'violet'
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchEncounters(pokemonId) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}/encounters`);
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const encounters = {};
    
    // Process encounter data
    data.forEach(locationArea => {
      const locationName = locationArea.location_area.name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      locationArea.version_details.forEach(versionDetail => {
        const versionName = versionDetail.version.name;
        const gameId = VERSION_MAP[versionName];
        
        if (gameId) {
          if (!encounters[gameId]) {
            encounters[gameId] = [];
          }
          
          // Only add if not already in the list for this game
          if (!encounters[gameId].includes(locationName)) {
            encounters[gameId].push(locationName);
          }
        }
      });
    });
    
    return encounters;
  } catch (error) {
    console.error(`Error fetching encounters for Pokémon ${pokemonId}:`, error.message);
    return {};
  }
}

async function fetchAllEncounters() {
  // Load existing pokemon data
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  
  if (!fs.existsSync(pokemonPath)) {
    console.error('❌ pokemon.json not found. Please run fetch-all-pokemon.js first.');
    process.exit(1);
  }
  
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const pokemon = pokemonData.pokemon;
  
  console.log(`Fetching encounter data for ${pokemon.length} Pokémon...`);
  console.log('⚠️  Note: This only includes WILD ENCOUNTERS from PokeAPI');
  console.log('   Missing: starters, gifts, trades, evolutions, events\n');
  
  const encountersByGame = {};
  let processed = 0;
  let withEncounters = 0;
  
  for (const pkmn of pokemon) {
    processed++;
    
    if (processed % 50 === 0) {
      console.log(`  Progress: ${processed}/${pokemon.length} (${withEncounters} with encounters)`);
    }
    
    const encounters = await fetchEncounters(pkmn.id);
    
    if (Object.keys(encounters).length > 0) {
      withEncounters++;
      
      // Add to each game
      Object.entries(encounters).forEach(([gameId, locations]) => {
        if (!encountersByGame[gameId]) {
          encountersByGame[gameId] = [];
        }
        
        encountersByGame[gameId].push({
          id: pkmn.id,
          location: locations.length > 0 ? locations[0] : 'Wild encounter'
        });
      });
    }
    
    await delay(DELAY_MS);
  }
  
  console.log(`\n✅ Processed ${pokemon.length} Pokémon`);
  console.log(`📊 ${withEncounters} Pokémon have wild encounter data`);
  console.log(`📊 ${pokemon.length - withEncounters} Pokémon have no wild encounter data (likely starters, gifts, events, etc.)\n`);
  
  return encountersByGame;
}

async function main() {
  const encountersByGame = await fetchAllEncounters();
  
  // Load existing games.json to merge with
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  let gamesData = { games: [] };
  
  if (fs.existsSync(gamesPath)) {
    gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  }
  
  // Merge encounter data with existing game data
  gamesData.games.forEach(game => {
    if (encountersByGame[game.id]) {
      // Merge with existing pokemon data, avoiding duplicates
      const existingIds = new Set(game.pokemon.map(p => p.id));
      const newEncounters = encountersByGame[game.id].filter(p => !existingIds.has(p.id));
      
      game.pokemon.push(...newEncounters);
      game.pokemon.sort((a, b) => a.id - b.id);
    }
  });
  
  // Save updated games.json
  const backupPath = gamesPath.replace('.json', '.backup.json');
  if (fs.existsSync(gamesPath)) {
    fs.copyFileSync(gamesPath, backupPath);
    console.log(`📋 Backup saved to ${backupPath}`);
  }
  
  fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
  console.log(`📝 Updated ${gamesPath}`);
  
  // Print stats
  console.log('\n📊 Pokémon per Game (wild encounters only):');
  gamesData.games.forEach(game => {
    console.log(`  ${game.name}: ${game.pokemon.length} Pokémon`);
  });
  
  console.log('\n⚠️  IMPORTANT: This data is INCOMPLETE!');
  console.log('   You need to manually add:');
  console.log('   - Starter Pokémon');
  console.log('   - Gift Pokémon (from NPCs)');
  console.log('   - In-game trade Pokémon');
  console.log('   - Event-exclusive Pokémon');
  console.log('   - Evolved forms (if not encountered in wild)');
}

main().catch(console.error);

