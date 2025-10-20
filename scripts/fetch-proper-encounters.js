import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPokemonEncounters(pokemonId) {
  const url = `https://pokeapi.co/api/v2/pokemon/${pokemonId}/encounters`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  ⚠️  Pokemon ${pokemonId}: No encounter data (${response.status})`);
      return [];
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`  ❌ Error fetching Pokemon ${pokemonId}:`, error.message);
    return [];
  }
}

function parseEncounterData(encounters, pokemonId) {
  const gameEncounters = {};
  
  encounters.forEach(encounter => {
    const locationName = encounter.location_area.name
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    encounter.version_details.forEach(versionDetail => {
      const apiVersion = versionDetail.version.name;
      const gameId = VERSION_MAP[apiVersion];
      
      if (!gameId) {
        return; // Skip unmapped versions
      }
      
      if (!gameEncounters[gameId]) {
        gameEncounters[gameId] = [];
      }
      
      // Check encounter methods
      const methods = versionDetail.encounter_details.map(ed => ed.method.name);
      const location = methods.includes('gift') || methods.includes('only-one') 
        ? `${locationName} (Gift/Event)`
        : locationName;
      
      gameEncounters[gameId].push({
        id: pokemonId,
        location: location
      });
    });
  });
  
  return gameEncounters;
}

async function updateGamesWithEncounters(gamesData, pokemonData, startId = 1, endId = 50, dryRun = false) {
  console.log(`\n📡 Fetching encounter data from PokeAPI for Pokémon ${startId}-${endId}...`);
  console.log('   This will take a few minutes to respect rate limits.\n');
  
  const updates = {};
  let pokemonProcessed = 0;
  let encountersAdded = 0;
  
  for (let pokemonId = startId; pokemonId <= endId; pokemonId++) {
    const pokemon = pokemonData.pokemon.find(p => p.id === pokemonId);
    if (!pokemon) {
      continue;
    }
    
    process.stdout.write(`  [${pokemonId}/${endId}] ${pokemon.name.padEnd(20)}... `);
    
    const encounters = await fetchPokemonEncounters(pokemonId);
    
    if (encounters.length === 0) {
      console.log('no encounters');
      pokemonProcessed++;
      await delay(100); // Brief delay
      continue;
    }
    
    const gameEncounters = parseEncounterData(encounters, pokemonId);
    const gameCount = Object.keys(gameEncounters).length;
    
    if (gameCount > 0) {
      console.log(`✓ ${gameCount} games`);
      
      // Store updates
      Object.entries(gameEncounters).forEach(([gameId, pokemonList]) => {
        if (!updates[gameId]) {
          updates[gameId] = [];
        }
        updates[gameId].push(...pokemonList);
      });
      
      encountersAdded += gameCount;
    } else {
      console.log('no valid games');
    }
    
    pokemonProcessed++;
    
    // Rate limiting - be nice to PokeAPI
    await delay(150);
  }
  
  console.log(`\n✅ Processed ${pokemonProcessed} Pokémon`);
  console.log(`📊 Found encounters in ${Object.keys(updates).length} games`);
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN - Here\'s what would be added:');
    Object.entries(updates).forEach(([gameId, pokemonList]) => {
      const game = gamesData.games.find(g => g.id === gameId);
      if (game) {
        console.log(`  ${game.name}: +${pokemonList.length} Pokémon`);
      }
    });
    return { updated: 0, added: 0 };
  }
  
  // Apply updates
  let gamesUpdated = 0;
  let totalAdded = 0;
  
  console.log('\n📝 Applying updates...');
  
  Object.entries(updates).forEach(([gameId, pokemonList]) => {
    const game = gamesData.games.find(g => g.id === gameId);
    if (!game) {
      console.log(`  ⚠️  Game ${gameId} not found in games.json`);
      return;
    }
    
    const existingIds = new Set(game.pokemon.map(p => p.id));
    const toAdd = pokemonList.filter(p => !existingIds.has(p.id));
    
    if (toAdd.length > 0) {
      game.pokemon.push(...toAdd);
      game.pokemon.sort((a, b) => a.id - b.id);
      console.log(`  ${game.name}: +${toAdd.length} Pokémon (${game.pokemon.length} total)`);
      gamesUpdated++;
      totalAdded += toAdd.length;
    }
  });
  
  return { updated: gamesUpdated, added: totalAdded };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  // Parse range
  let startId = 1;
  let endId = 50;
  
  const rangeArg = args.find(arg => arg.startsWith('--range='));
  if (rangeArg) {
    const [start, end] = rangeArg.split('=')[1].split('-').map(Number);
    startId = start || 1;
    endId = end || 50;
  }
  
  console.log('=== Fetch Proper Encounters from PokeAPI ===\n');
  console.log(`Range: Pokémon ${startId}-${endId}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update files)'}\n`);
  
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
  if (!dryRun) {
    const backupPath = gamesPath.replace('.json', '.before-pokeapi-encounters.json');
    fs.copyFileSync(gamesPath, backupPath);
    console.log(`📋 Backup saved to ${backupPath}\n`);
  }
  
  // Fetch and update
  const { updated, added } = await updateGamesWithEncounters(
    gamesData,
    pokemonData,
    startId,
    endId,
    dryRun
  );
  
  // Save
  if (!dryRun && added > 0) {
    fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
    console.log(`\n💾 Updated ${gamesPath}`);
    console.log(`\n✨ ${updated} games updated with ${added} new Pokémon encounters!`);
  } else if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ No new encounters to add');
  }
  
  console.log('\n📚 Usage:');
  console.log('  node scripts/fetch-proper-encounters.js --range=1-50 --dry-run');
  console.log('  node scripts/fetch-proper-encounters.js --range=400-420');
  console.log('  node scripts/fetch-proper-encounters.js --range=1-1025  # All Pokemon');
}

main().catch(console.error);

