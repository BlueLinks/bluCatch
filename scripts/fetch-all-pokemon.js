import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOTAL_POKEMON = 1025; // As of Gen 9
const BATCH_SIZE = 100;
const DELAY_MS = 100; // Rate limiting

// Generation ranges based on National Dex numbers
const GENERATION_RANGES = {
  1: { min: 1, max: 151 },
  2: { min: 152, max: 251 },
  3: { min: 252, max: 386 },
  4: { min: 387, max: 493 },
  5: { min: 494, max: 649 },
  6: { min: 650, max: 721 },
  7: { min: 722, max: 809 },
  8: { min: 810, max: 905 },
  9: { min: 906, max: 1025 }
};

function getGeneration(id) {
  for (const [gen, range] of Object.entries(GENERATION_RANGES)) {
    if (id >= range.min && id <= range.max) {
      return parseInt(gen);
    }
  }
  return 9; // Default to latest gen
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPokemon(id) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!response.ok) {
      console.error(`Failed to fetch Pokémon ${id}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    return {
      id: data.id,
      name: data.name.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      generation: getGeneration(data.id),
      sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`
    };
  } catch (error) {
    console.error(`Error fetching Pokémon ${id}:`, error.message);
    return null;
  }
}

async function fetchAllPokemon() {
  console.log(`Fetching ${TOTAL_POKEMON} Pokémon from PokeAPI...`);
  console.log('This will take several minutes. Please be patient.\n');
  
  const pokemon = [];
  const failed = [];
  
  for (let i = 1; i <= TOTAL_POKEMON; i += BATCH_SIZE) {
    const batch = [];
    const end = Math.min(i + BATCH_SIZE - 1, TOTAL_POKEMON);
    
    console.log(`Fetching Pokémon ${i}-${end}...`);
    
    for (let id = i; id <= end; id++) {
      batch.push(fetchPokemon(id));
      await delay(DELAY_MS); // Rate limiting
    }
    
    const results = await Promise.all(batch);
    
    results.forEach((pkmn, idx) => {
      if (pkmn) {
        pokemon.push(pkmn);
      } else {
        failed.push(i + idx);
      }
    });
    
    console.log(`  ✓ Completed ${pokemon.length}/${TOTAL_POKEMON}`);
  }
  
  // Sort by ID
  pokemon.sort((a, b) => a.id - b.id);
  
  console.log(`\n✅ Successfully fetched ${pokemon.length} Pokémon`);
  if (failed.length > 0) {
    console.log(`⚠️  Failed to fetch ${failed.length} Pokémon: ${failed.join(', ')}`);
  }
  
  return pokemon;
}

async function main() {
  const pokemon = await fetchAllPokemon();
  
  const outputPath = path.join(__dirname, '../public/data/pokemon.json');
  const output = {
    pokemon,
    generated: new Date().toISOString(),
    source: 'PokeAPI',
    total: pokemon.length
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n📝 Saved to ${outputPath}`);
  
  // Print stats by generation
  console.log('\n📊 Pokémon by Generation:');
  for (let gen = 1; gen <= 9; gen++) {
    const count = pokemon.filter(p => p.generation === gen).length;
    console.log(`  Gen ${gen}: ${count} Pokémon`);
  }
}

main().catch(console.error);

