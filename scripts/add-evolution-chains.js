import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DELAY_MS = 150;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cache for evolution chains to avoid re-fetching
const evolutionCache = new Map();

async function fetchEvolutionChain(pokemonId) {
  try {
    // First get the pokemon species to get evolution chain URL
    const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
    if (!speciesResponse.ok) return null;
    
    const speciesData = await speciesResponse.json();
    const chainUrl = speciesData.evolution_chain.url;
    const chainId = chainUrl.split('/').slice(-2)[0];
    
    // Check cache
    if (evolutionCache.has(chainId)) {
      return evolutionCache.get(chainId);
    }
    
    // Fetch evolution chain
    const chainResponse = await fetch(chainUrl);
    if (!chainResponse.ok) return null;
    
    const chainData = await chainResponse.json();
    
    // Parse the evolution chain into a flat array
    const chain = [];
    
    function parseChain(evoData) {
      const speciesId = parseInt(evoData.species.url.split('/').slice(-2)[0]);
      chain.push(speciesId);
      
      // Recursively parse evolutions (handle branching)
      if (evoData.evolves_to && evoData.evolves_to.length > 0) {
        evoData.evolves_to.forEach(evolution => {
          parseChain(evolution);
        });
      }
    }
    
    parseChain(chainData.chain);
    
    // Cache the result
    evolutionCache.set(chainId, chain);
    
    return chain;
  } catch (error) {
    console.error(`Error fetching evolution chain for Pokemon ${pokemonId}:`, error.message);
    return null;
  }
}

async function buildEvolutionMap() {
  console.log('Building evolution map from PokeAPI...\n');
  
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const allPokemon = pokemonData.pokemon;
  
  const evolutionMap = new Map(); // pokemonId -> [all forms in its evolution chain]
  const processed = new Set();
  
  let count = 0;
  
  for (const pkmn of allPokemon) {
    if (processed.has(pkmn.id)) continue;
    
    count++;
    if (count % 50 === 0) {
      console.log(`  Processed ${count}/${allPokemon.length} Pokemon...`);
    }
    
    const chain = await fetchEvolutionChain(pkmn.id);
    
    if (chain && chain.length > 1) {
      // Mark all Pokemon in this chain
      chain.forEach(id => {
        if (!evolutionMap.has(id)) {
          evolutionMap.set(id, chain);
        }
        processed.add(id);
      });
    }
    
    await delay(DELAY_MS);
  }
  
  console.log(`\n✅ Built evolution map for ${evolutionMap.size} Pokemon`);
  console.log(`📊 Found ${evolutionCache.size} unique evolution chains\n`);
  
  return evolutionMap;
}

function getPokemonName(id, allPokemon) {
  const pkmn = allPokemon.find(p => p.id === id);
  return pkmn ? pkmn.name : `Pokemon #${id}`;
}

function addEvolutionsToGames(evolutionMap, gamesData, allPokemon) {
  console.log('Adding evolutions to game data...\n');
  
  let totalAdded = 0;
  
  gamesData.games.forEach(game => {
    const existingIds = new Set(game.pokemon.map(p => p.id));
    const toAdd = [];
    
    // For each Pokemon in the game, check if we should add its evolutions
    game.pokemon.forEach(pkmn => {
      const chain = evolutionMap.get(pkmn.id);
      
      if (chain && chain.length > 1) {
        // Find this Pokemon's position in the chain
        const currentIndex = chain.indexOf(pkmn.id);
        
        // Add all evolutions that come after this Pokemon
        for (let i = currentIndex + 1; i < chain.length; i++) {
          const evolvedId = chain[i];
          
          if (!existingIds.has(evolvedId)) {
            // Find what it evolves from
            const previousId = chain[i - 1];
            const previousName = getPokemonName(previousId, allPokemon);
            
            toAdd.push({
              id: evolvedId,
              location: `Evolve ${previousName}`
            });
            existingIds.add(evolvedId);
          }
        }
        
        // Also add pre-evolutions that might be missing (e.g., if only middle form was in wild)
        for (let i = 0; i < currentIndex; i++) {
          const preEvoId = chain[i];
          
          if (!existingIds.has(preEvoId)) {
            // This is a pre-evolution - could be obtained by breeding or trade
            toAdd.push({
              id: preEvoId,
              location: 'Breeding or transfer'
            });
            existingIds.add(preEvoId);
          }
        }
      }
    });
    
    if (toAdd.length > 0) {
      game.pokemon.push(...toAdd);
      game.pokemon.sort((a, b) => a.id - b.id);
      console.log(`  ${game.name}: Added ${toAdd.length} evolved forms`);
      totalAdded += toAdd.length;
    }
  });
  
  console.log(`\n✅ Added ${totalAdded} evolved forms across all games`);
  return totalAdded;
}

async function main() {
  console.log('=== Evolution Chain Inference ===\n');
  console.log('This script will add evolved forms to each game.');
  console.log('For example, if Pidgey is in FireRed, Pidgeotto and Pidgeot will be added.\n');
  
  // Load data
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  if (!fs.existsSync(pokemonPath) || !fs.existsSync(gamesPath)) {
    console.error('❌ Required data files not found');
    process.exit(1);
  }
  
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  const allPokemon = pokemonData.pokemon;
  
  // Build evolution map
  const evolutionMap = await buildEvolutionMap();
  
  // Save evolution map for future use
  const evolutionMapPath = path.join(__dirname, '../public/data/evolution-map.json');
  const evolutionMapArray = Array.from(evolutionMap.entries()).map(([id, chain]) => ({
    id,
    chain
  }));
  fs.writeFileSync(evolutionMapPath, JSON.stringify({ evolutions: evolutionMapArray }, null, 2));
  console.log(`💾 Saved evolution map to ${evolutionMapPath}\n`);
  
  // Backup games.json
  const backupPath = gamesPath.replace('.json', '.before-evolutions.json');
  fs.copyFileSync(gamesPath, backupPath);
  console.log(`📋 Backup saved to ${backupPath}\n`);
  
  // Add evolutions
  const added = addEvolutionsToGames(evolutionMap, gamesData, allPokemon);
  
  // Save updated games.json
  fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
  console.log(`\n📝 Updated ${gamesPath}`);
  
  // Print updated stats
  console.log('\n📊 Updated Pokemon counts:');
  gamesData.games.forEach(game => {
    console.log(`  ${game.name}: ${game.pokemon.length} Pokemon`);
  });
  
  console.log('\n✨ Evolution chains successfully added!');
  console.log('   Your data is now much more complete.');
}

main().catch(console.error);

