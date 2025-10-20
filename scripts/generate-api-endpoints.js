import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║          GENERATING API ENDPOINTS FOR POKÉMON             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Load data
const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
const gamesPath = path.join(__dirname, '../public/data/games.json');
const apiDir = path.join(__dirname, '../public/api/dex');

const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));

// Create API directory
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
  console.log(`📁 Created directory: ${apiDir}\n`);
}

console.log(`🔍 Generating API endpoints for ${pokemonData.pokemon.length} Pokémon...\n`);

let generated = 0;

// Generate a JSON file for each Pokémon
for (const pokemon of pokemonData.pokemon) {
  const pokemonInfo = {
    id: pokemon.id,
    name: pokemon.name,
    sprite: pokemon.sprite,
    generation: pokemon.generation,
    games: []
  };
  
  // Find all games this Pokémon is available in
  for (const game of gamesData.games) {
    const entries = game.pokemon.filter(p => p.id === pokemon.id);
    
    if (entries.length > 0) {
      pokemonInfo.games.push({
        id: game.id,
        name: game.name,
        generation: game.generation,
        locations: entries.map(e => ({
          location: e.location,
          regionalDex: e.regionalDex || null
        }))
      });
    }
  }
  
  // Write JSON file
  const filename = path.join(apiDir, `${pokemon.id}.json`);
  fs.writeFileSync(filename, JSON.stringify(pokemonInfo, null, 2));
  generated++;
  
  if (generated % 100 === 0) {
    console.log(`  ✅ Generated ${generated}/${pokemonData.pokemon.length}`);
  }
}

console.log(`\n✅ Generated ${generated} API endpoints!\n`);
console.log('📋 Access via: /api/dex/{number}.json');
console.log('   Example: /api/dex/1.json (Bulbasaur)');
console.log('   Example: /api/dex/25.json (Pikachu)');
console.log('   Example: curl http://localhost:3000/api/dex/1.json\n');
console.log('✨ Done!\n');

