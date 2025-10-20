import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('=== Fixing Legends: Arceus ===\n');
  
  // Fetch Hisui pokedex
  const response = await fetch('https://pokeapi.co/api/v2/pokedex/30/');
  const data = await response.json();
  
  console.log(`Fetched ${data.name} pokedex: ${data.pokemon_entries.length} Pokémon\n`);
  
  // Load our data
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
  // Find Legends Arceus
  const game = gamesData.games.find(g => g.id === 'legendsarceus');
  if (!game) {
    console.error('❌ Legends Arceus not found');
    process.exit(1);
  }
  
  console.log(`Current Legends Arceus: ${game.pokemon.length} Pokémon`);
  
  // Extract Pokemon from pokedex
  const pokemonToAdd = [];
  for (const entry of data.pokemon_entries) {
    const pokemonUrl = entry.pokemon_species.url;
    const pokemonId = parseInt(pokemonUrl.split('/').slice(-2)[0]);
    
    const pokemon = pokemonData.pokemon.find(p => p.id === pokemonId);
    if (!pokemon) continue;
    
    pokemonToAdd.push({
      id: pokemonId,
      location: `Hisui Dex #${entry.entry_number}`
    });
  }
  
  // Check what's new
  const existingIds = new Set(game.pokemon.map(p => p.id));
  const toAdd = pokemonToAdd.filter(p => !existingIds.has(p.id));
  
  console.log(`Adding ${toAdd.length} new Pokémon\n`);
  
  // Backup
  const backupPath = gamesPath.replace('.json', '.before-legends-fix.json');
  fs.copyFileSync(gamesPath, backupPath);
  
  // Add them
  game.pokemon.push(...toAdd);
  game.pokemon.sort((a, b) => a.id - b.id);
  
  // Save
  fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
  
  console.log(`✅ Legends: Arceus now has ${game.pokemon.length} Pokémon`);
  console.log(`💾 Saved to ${gamesPath}`);
}

main().catch(console.error);

