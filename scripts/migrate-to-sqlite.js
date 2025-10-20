import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POKEMON_JSON = path.join(__dirname, '../public/data/pokemon.json');
const GAMES_JSON = path.join(__dirname, '../public/data/games.json');
const OUTPUT_DB = path.join(__dirname, '../public/data/pokemon.db');

/**
 * Detect acquisition method from location string
 */
function detectAcquisitionMethod(location) {
  const lowerLocation = location.toLowerCase();
  
  // Event detection
  if (lowerLocation.includes('event') || 
      lowerLocation.includes('distribution') ||
      lowerLocation.includes('mystery gift')) {
    return 'event';
  }
  
  // Trade evolution detection
  if (lowerLocation.includes('trade') && 
      (lowerLocation.includes('evolve') || lowerLocation.includes('evolution'))) {
    return 'trade-evolution';
  }
  
  // In-game trade detection
  if (lowerLocation.includes('trade') || lowerLocation.includes('npc')) {
    return 'trade';
  }
  
  // Evolution detection
  if (lowerLocation.includes('evolve') || lowerLocation.includes('evolution')) {
    return 'evolution';
  }
  
  // Gift/starter detection
  if (lowerLocation.includes('gift') || 
      lowerLocation.includes('starter') ||
      lowerLocation.includes('professor') ||
      lowerLocation.includes('first partner') ||
      lowerLocation.includes('given')) {
    return 'gift';
  }
  
  // Fossil detection
  if (lowerLocation.includes('fossil') || lowerLocation.includes('revive')) {
    return 'fossil';
  }
  
  // Dream Radar detection
  if (lowerLocation.includes('dream radar')) {
    return 'dream-radar';
  }
  
  // Pokewalker detection
  if (lowerLocation.includes('pokewalker') || lowerLocation.includes('pokéwalker')) {
    return 'pokewalker';
  }
  
  // Special methods
  if (lowerLocation.includes('special') || 
      lowerLocation.includes('unique') ||
      lowerLocation.includes('sinjoh')) {
    return 'special';
  }
  
  // Default to wild encounter
  return 'wild';
}

console.log('🔄 Starting JSON to SQLite migration...\n');

// Load JSON data
console.log('📖 Reading JSON files...');
const pokemonData = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf-8'));
const gamesData = JSON.parse(fs.readFileSync(GAMES_JSON, 'utf-8'));

console.log(`   Found ${pokemonData.pokemon.length} Pokemon`);
console.log(`   Found ${gamesData.games.length} games\n`);

// Delete existing database if it exists
if (fs.existsSync(OUTPUT_DB)) {
  console.log('🗑️  Removing existing database...');
  fs.unlinkSync(OUTPUT_DB);
}

// Create new database
console.log('🏗️  Creating new SQLite database...');
const db = new Database(OUTPUT_DB);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
console.log('📋 Creating tables...');

db.exec(`
  CREATE TABLE pokemon (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    generation INTEGER NOT NULL,
    sprite_url TEXT
  );

  CREATE TABLE games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    generation INTEGER NOT NULL,
    platform TEXT NOT NULL,
    box_art TEXT
  );

  CREATE TABLE encounters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pokemon_id INTEGER NOT NULL,
    game_id TEXT NOT NULL,
    location TEXT NOT NULL,
    acquisition_method TEXT,
    FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
    FOREIGN KEY (game_id) REFERENCES games(id)
  );
`);

console.log('   ✅ Tables created\n');

// Insert Pokemon
console.log('🔵 Inserting Pokemon...');
const insertPokemon = db.prepare(`
  INSERT INTO pokemon (id, name, generation, sprite_url)
  VALUES (?, ?, ?, ?)
`);

const insertManyPokemon = db.transaction((pokemon) => {
  for (const p of pokemon) {
    insertPokemon.run(p.id, p.name, p.generation, p.sprite);
  }
});

insertManyPokemon(pokemonData.pokemon);
console.log(`   ✅ Inserted ${pokemonData.pokemon.length} Pokemon\n`);

// Insert Games
console.log('🎮 Inserting games...');
const insertGame = db.prepare(`
  INSERT INTO games (id, name, generation, platform, box_art)
  VALUES (?, ?, ?, ?, ?)
`);

const insertManyGames = db.transaction((games) => {
  for (const g of games) {
    insertGame.run(g.id, g.name, g.generation, g.platform, g.boxArt);
  }
});

insertManyGames(gamesData.games);
console.log(`   ✅ Inserted ${gamesData.games.length} games\n`);

// Insert Encounters
console.log('📍 Inserting encounters...');
const insertEncounter = db.prepare(`
  INSERT INTO encounters (pokemon_id, game_id, location, acquisition_method)
  VALUES (?, ?, ?, ?)
`);

let totalEncounters = 0;
const insertManyEncounters = db.transaction((games) => {
  for (const game of games) {
    for (const pokemon of game.pokemon) {
      const method = detectAcquisitionMethod(pokemon.location);
      insertEncounter.run(pokemon.id, game.id, pokemon.location, method);
      totalEncounters++;
    }
  }
});

insertManyEncounters(gamesData.games);
console.log(`   ✅ Inserted ${totalEncounters} encounters\n`);

// Create indexes
console.log('🔍 Creating indexes...');
db.exec(`
  CREATE INDEX idx_pokemon_generation ON pokemon(generation);
  CREATE INDEX idx_games_generation ON games(generation);
  CREATE INDEX idx_encounters_pokemon ON encounters(pokemon_id);
  CREATE INDEX idx_encounters_game ON encounters(game_id);
  CREATE INDEX idx_encounters_method ON encounters(acquisition_method);
`);
console.log('   ✅ Indexes created\n');

// Verify data
console.log('✅ Verifying migration...');
const pokemonCount = db.prepare('SELECT COUNT(*) as count FROM pokemon').get();
const gamesCount = db.prepare('SELECT COUNT(*) as count FROM games').get();
const encountersCount = db.prepare('SELECT COUNT(*) as count FROM encounters').get();

console.log(`   Pokemon: ${pokemonCount.count}`);
console.log(`   Games: ${gamesCount.count}`);
console.log(`   Encounters: ${encountersCount.count}\n`);

// Show some statistics
console.log('📊 Acquisition method breakdown:');
const methodStats = db.prepare(`
  SELECT acquisition_method, COUNT(*) as count
  FROM encounters
  GROUP BY acquisition_method
  ORDER BY count DESC
`).all();

methodStats.forEach(stat => {
  console.log(`   ${stat.acquisition_method}: ${stat.count}`);
});

// Close database
db.close();

// Get file size
const stats = fs.statSync(OUTPUT_DB);
const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log('\n✨ Migration complete!');
console.log(`📦 Database size: ${fileSizeInMB} MB`);
console.log(`📁 Location: ${OUTPUT_DB}`);

