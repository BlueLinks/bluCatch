import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DELAY_MS = 100; // Small delay to be respectful to PokeAPI

// Helper: delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch evolution chain for a Pokemon
 * @param {number} pokemonId - Pokemon ID
 * @returns {Object|null} Evolution data or null if no evolution
 */
async function fetchEvolutionData(pokemonId) {
  try {
    // First get species data to find evolution chain URL
    const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`);
    if (!speciesResponse.ok) {
      console.log(`  ⚠️  Pokemon #${pokemonId}: Species not found`);
      return null;
    }
    
    const speciesData = await speciesResponse.json();
    const evolutionChainUrl = speciesData.evolution_chain?.url;
    
    if (!evolutionChainUrl) {
      return null;
    }
    
    // Fetch evolution chain
    const chainResponse = await fetch(evolutionChainUrl);
    if (!chainResponse.ok) {
      console.log(`  ⚠️  Pokemon #${pokemonId}: Evolution chain not found`);
      return null;
    }
    
    const chainData = await chainResponse.json();
    
    // Find this Pokemon in the chain and extract its evolution details
    const evolutionInfo = findPokemonInChain(chainData.chain, pokemonId, speciesData.name);
    
    return evolutionInfo;
    
  } catch (error) {
    console.log(`  ❌ Pokemon #${pokemonId}: ${error.message}`);
    return null;
  }
}

/**
 * Recursively search evolution chain for a specific Pokemon
 * @param {Object} chain - Evolution chain node
 * @param {number} pokemonId - Pokemon ID to find
 * @param {string} pokemonName - Pokemon name
 * @returns {Object|null} Evolution details
 */
function findPokemonInChain(chain, pokemonId, pokemonName) {
  // Check if this is our Pokemon
  const speciesId = parseInt(chain.species.url.split('/').slice(-2, -1)[0]);
  
  if (speciesId === pokemonId) {
    // Check if this Pokemon evolves from something
    // Look at parent by checking if we're in an evolves_to array
    return null; // This will be set when we find it as a child
  }
  
  // Check children
  for (const evolution of chain.evolves_to || []) {
    const childId = parseInt(evolution.species.url.split('/').slice(-2, -1)[0]);
    
    if (childId === pokemonId) {
      // Found it! Extract evolution details
      const details = evolution.evolution_details[0]; // Take first method if multiple
      
      if (!details) return null;
      
      const method = details.trigger.name;
      let methodDescription = null;
      let requirement = null;
      
      // Parse based on trigger type
      switch (method) {
        case 'level-up':
          if (details.min_level) {
            requirement = `Level ${details.min_level}`;
          } else if (details.min_happiness) {
            requirement = 'High friendship';
          } else if (details.min_affection) {
            requirement = 'High affection';
          } else if (details.known_move) {
            requirement = `Learn specific move`;
          } else if (details.location) {
            requirement = 'Specific location';
          } else if (details.time_of_day) {
            requirement = `${details.time_of_day} time`;
          } else {
            requirement = 'Level up';
          }
          methodDescription = 'level-up';
          break;
          
        case 'trade':
          if (details.held_item) {
            const itemName = details.held_item.name.replace(/-/g, ' ');
            requirement = `Trade holding ${itemName}`;
            methodDescription = 'trade-with-item';
          } else if (details.trade_species) {
            const speciesName = details.trade_species.name;
            requirement = `Trade for ${speciesName}`;
            methodDescription = 'trade';
          } else {
            requirement = 'Trade';
            methodDescription = 'trade';
          }
          break;
          
        case 'use-item':
          if (details.item) {
            const itemName = details.item.name.replace(/-/g, ' ');
            requirement = itemName;
            methodDescription = 'use-item';
          }
          break;
          
        case 'shed':
          requirement = 'Level up with empty party slot';
          methodDescription = 'shed';
          break;
          
        default:
          requirement = method;
          methodDescription = method;
      }
      
      return {
        id: pokemonId,
        name: pokemonName,
        evolvesFrom: speciesId,
        method: methodDescription,
        requirement: requirement,
        trigger: method
      };
    }
    
    // Recursively check this evolution's children
    const found = findPokemonInChain(evolution, pokemonId, pokemonName);
    if (found) return found;
  }
  
  return null;
}

/**
 * Main function
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         FETCH EVOLUTION DATA FROM POKEAPI                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  // Load pokemon.json to get all Pokemon IDs
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  
  const evolutions = {};
  let processed = 0;
  let found = 0;
  
  // Allow limiting range for testing
  const rangeArg = process.argv.find(arg => arg.startsWith('--range='));
  let startId = 1;
  let endId = pokemonData.pokemon.length;
  
  if (rangeArg) {
    const [start, end] = rangeArg.split('=')[1].split('-').map(Number);
    startId = start || 1;
    endId = end || pokemonData.pokemon.length;
  }
  
  const pokemonToProcess = pokemonData.pokemon.filter(p => p.id >= startId && p.id <= endId);
  
  console.log(`Processing ${pokemonToProcess.length} Pokemon (${startId}-${endId})...\n`);
  
  for (const pokemon of pokemonToProcess) {
    process.stdout.write(`\r  [${pokemon.id}/${endId}] ${pokemon.name.padEnd(20)} ...`);
    
    const evolutionInfo = await fetchEvolutionData(pokemon.id);
    
    if (evolutionInfo) {
      evolutions[pokemon.id] = evolutionInfo;
      found++;
      process.stdout.write(`\r  [${pokemon.id}/${endId}] ${pokemon.name.padEnd(20)} ✅ ${evolutionInfo.requirement}\n`);
    } else {
      process.stdout.write(`\r  [${pokemon.id}/${endId}] ${pokemon.name.padEnd(20)}    (no evolution)\n`);
    }
    
    processed++;
    
    // Small delay between requests
    await delay(DELAY_MS);
  }
  
  // Save to file
  const outputPath = path.join(__dirname, '../public/data/evolutions.json');
  fs.writeFileSync(outputPath, JSON.stringify({ evolutions }, null, 2));
  
  console.log(`\n✅ Evolution data saved to ${outputPath}`);
  console.log(`📊 Processed: ${processed} Pokemon`);
  console.log(`📊 Found evolutions: ${found} Pokemon`);
  
  // Show some examples
  console.log('\n📝 Example evolution methods:');
  const examples = [
    { id: 65, name: 'Alakazam' },
    { id: 94, name: 'Gengar' },
    { id: 76, name: 'Golem' },
    { id: 208, name: 'Steelix' }
  ];
  
  examples.forEach(ex => {
    if (evolutions[ex.id]) {
      console.log(`  ${ex.name}: ${evolutions[ex.id].requirement}`);
    }
  });
}

main().catch(console.error);

