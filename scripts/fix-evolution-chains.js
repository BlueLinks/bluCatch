import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DELAY_MS = 150;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cache for evolution chains with proper parent-child relationships
const evolutionCache = new Map();

async function fetchEvolutionChainWithStructure(pokemonId) {
  try {
    // Get pokemon species
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
    
    // Build parent-child relationships
    const relationships = {}; // childId -> parentId
    
    function parseChain(evoData, parentId = null) {
      const speciesId = parseInt(evoData.species.url.split('/').slice(-2)[0]);
      
      if (parentId !== null) {
        relationships[speciesId] = parentId;
      }
      
      // Recursively parse evolutions (handles branching)
      if (evoData.evolves_to && evoData.evolves_to.length > 0) {
        evoData.evolves_to.forEach(evolution => {
          parseChain(evolution, speciesId);
        });
      }
    }
    
    parseChain(chainData.chain);
    
    // Cache the result
    evolutionCache.set(chainId, relationships);
    
    return relationships;
  } catch (error) {
    console.error(`Error fetching evolution chain for Pokemon ${pokemonId}:`, error.message);
    return null;
  }
}

async function buildEvolutionRelationships() {
  console.log('Building proper evolution relationships from PokeAPI...\n');
  
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const allPokemon = pokemonData.pokemon;
  
  const allRelationships = {}; // childId -> parentId
  const processed = new Set();
  
  let count = 0;
  
  for (const pkmn of allPokemon) {
    if (processed.has(pkmn.id)) continue;
    
    count++;
    if (count % 50 === 0) {
      console.log(`  Processed ${count}/${allPokemon.length} Pokemon...`);
    }
    
    const relationships = await fetchEvolutionChainWithStructure(pkmn.id);
    
    if (relationships) {
      // Merge relationships
      Object.assign(allRelationships, relationships);
      
      // Mark all Pokemon in this chain as processed
      Object.keys(relationships).forEach(id => processed.add(parseInt(id)));
      const parentIds = new Set(Object.values(relationships));
      parentIds.forEach(id => processed.add(id));
    }
    
    await delay(DELAY_MS);
  }
  
  console.log(`\n✅ Built evolution relationships for ${Object.keys(allRelationships).length} Pokemon`);
  console.log(`📊 Found ${evolutionCache.size} unique evolution chains\n`);
  
  return allRelationships;
}

function getPokemonName(id, allPokemon) {
  const pkmn = allPokemon.find(p => p.id === id);
  return pkmn ? pkmn.name : `Pokemon #${id}`;
}

function getAllEvolutions(pokemonId, relationships) {
  // Get all Pokemon that evolve from this one (recursively)
  const evolutions = [];
  
  function findChildren(parentId) {
    Object.entries(relationships).forEach(([childId, parent]) => {
      if (parent === parentId) {
        const childIdNum = parseInt(childId);
        evolutions.push(childIdNum);
        findChildren(childIdNum); // Recursively find children of children
      }
    });
  }
  
  findChildren(pokemonId);
  return evolutions;
}

function getAllPreEvolutions(pokemonId, relationships) {
  // Get all Pokemon that this one evolves from (recursively)
  const preEvos = [];
  let current = pokemonId;
  
  while (relationships[current]) {
    const parent = relationships[current];
    preEvos.unshift(parent); // Add to beginning
    current = parent;
  }
  
  return preEvos;
}

function fixGameEvolutions(relationships, gamesData, allPokemon) {
  console.log('Fixing evolution data in games...\n');
  
  let totalAdded = 0;
  let totalFixed = 0;
  
  gamesData.games.forEach(game => {
    const existingMap = new Map(game.pokemon.map(p => [p.id, p]));
    const toAdd = [];
    const toFix = [];
    
    // For each Pokemon in the game
    game.pokemon.forEach(pkmn => {
      // Get all evolutions
      const evolutions = getAllEvolutions(pkmn.id, relationships);
      
      evolutions.forEach(evoId => {
        const parentId = relationships[evoId];
        const parentName = getPokemonName(parentId, allPokemon);
        
        if (!existingMap.has(evoId)) {
          // Add new evolution
          toAdd.push({
            id: evoId,
            location: `Evolve ${parentName}`
          });
          existingMap.set(evoId, { id: evoId, location: `Evolve ${parentName}` });
        } else {
          // Check if existing entry needs fixing
          const existing = existingMap.get(evoId);
          if (existing.location && existing.location.startsWith('Evolve ') && 
              !existing.location.includes(parentName)) {
            // This might be incorrectly showing evolution from wrong parent
            // Only fix if the correct parent is also available
            if (existingMap.has(parentId)) {
              toFix.push({
                id: evoId,
                oldLocation: existing.location,
                newLocation: `Evolve ${parentName}`
              });
              existing.location = `Evolve ${parentName}`;
            }
          }
        }
      });
      
      // Also add pre-evolutions if they're missing (breeding/transfer)
      const preEvos = getAllPreEvolutions(pkmn.id, relationships);
      preEvos.forEach(preEvoId => {
        if (!existingMap.has(preEvoId)) {
          toAdd.push({
            id: preEvoId,
            location: 'Breeding or transfer'
          });
          existingMap.set(preEvoId, { id: preEvoId, location: 'Breeding or transfer' });
        }
      });
    });
    
    if (toAdd.length > 0) {
      game.pokemon.push(...toAdd);
      game.pokemon.sort((a, b) => a.id - b.id);
      console.log(`  ${game.name}: Added ${toAdd.length} evolutions${toFix.length > 0 ? `, fixed ${toFix.length}` : ''}`);
      totalAdded += toAdd.length;
      totalFixed += toFix.length;
    } else if (toFix.length > 0) {
      console.log(`  ${game.name}: Fixed ${toFix.length} evolution paths`);
      totalFixed += toFix.length;
    }
  });
  
  console.log(`\n✅ Added ${totalAdded} missing evolutions`);
  console.log(`✅ Fixed ${totalFixed} incorrect evolution paths`);
  
  return { added: totalAdded, fixed: totalFixed };
}

async function main() {
  console.log('=== Fix Evolution Chain Relationships ===\n');
  console.log('This script properly handles branching evolutions like Eevee.\n');
  
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
  
  // Build proper evolution relationships
  const relationships = await buildEvolutionRelationships();
  
  // Save relationships
  const relationshipsPath = path.join(__dirname, '../public/data/evolution-relationships.json');
  fs.writeFileSync(relationshipsPath, JSON.stringify({ relationships }, null, 2));
  console.log(`💾 Saved evolution relationships to ${relationshipsPath}\n`);
  
  // Backup games.json
  const backupPath = gamesPath.replace('.json', '.before-evo-fix.json');
  fs.copyFileSync(gamesPath, backupPath);
  console.log(`📋 Backup saved to ${backupPath}\n`);
  
  // Fix evolution data
  const { added, fixed } = fixGameEvolutions(relationships, gamesData, allPokemon);
  
  // Save updated games.json
  fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
  console.log(`\n📝 Updated ${gamesPath}`);
  
  // Print updated stats
  console.log('\n📊 Updated Pokemon counts:');
  gamesData.games.slice(0, 10).forEach(game => {
    console.log(`  ${game.name}: ${game.pokemon.length} Pokemon`);
  });
  console.log('  ...');
  
  console.log('\n✨ Evolution chains properly fixed!');
  console.log('   Branching evolutions like Eevee now show correct parents.');
}

main().catch(console.error);

