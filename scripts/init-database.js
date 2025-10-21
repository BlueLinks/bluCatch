#!/usr/bin/env node
/**
 * Initialize a fresh SQLite database with base schema
 * Used when no existing data files are available
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../public/data/pokemon.db');
const POKEMON_SEED = join(__dirname, 'pokemon-seed.json');

console.log('🔧 Initializing fresh database...\n');

const db = new Database(DB_PATH);

try {
  // Create pokemon table
  console.log('📦 Creating pokemon table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS pokemon (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      types TEXT,
      evolution_stage INTEGER DEFAULT 0,
      evolves_from INTEGER,
      generation INTEGER,
      FOREIGN KEY (evolves_from) REFERENCES pokemon(id)
    )
  `);
  
  // Create games table
  console.log('📦 Creating games table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      generation INTEGER NOT NULL,
      year INTEGER,
      platform TEXT,
      paired_with TEXT
    )
  `);
  
  // Create encounters table
  console.log('📦 Creating encounters table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS encounters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pokemon_id INTEGER NOT NULL,
      game_id TEXT NOT NULL,
      location TEXT NOT NULL,
      acquisition_method TEXT DEFAULT 'wild',
      FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
      FOREIGN KEY (game_id) REFERENCES games(id)
    )
  `);
  
  // Create indexes
  console.log('📦 Creating indexes...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_encounters_pokemon ON encounters(pokemon_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_game ON encounters(game_id);
    CREATE INDEX IF NOT EXISTS idx_pokemon_name ON pokemon(name);
  `);
  
  // Seed with games data (essential for scraper to work)
  console.log('📦 Seeding games data...');
  const games = [
    {id: 'red', name: 'Pokémon Red', generation: 1, year: 1996, platform: 'Game Boy'},
    {id: 'blue', name: 'Pokémon Blue', generation: 1, year: 1996, platform: 'Game Boy'},
    {id: 'yellow', name: 'Pokémon Yellow', generation: 1, year: 1998, platform: 'Game Boy'},
    {id: 'gold', name: 'Pokémon Gold', generation: 2, year: 1999, platform: 'Game Boy Color'},
    {id: 'silver', name: 'Pokémon Silver', generation: 2, year: 1999, platform: 'Game Boy Color'},
    {id: 'crystal', name: 'Pokémon Crystal', generation: 2, year: 2000, platform: 'Game Boy Color'},
    {id: 'ruby', name: 'Pokémon Ruby', generation: 3, year: 2002, platform: 'Game Boy Advance'},
    {id: 'sapphire', name: 'Pokémon Sapphire', generation: 3, year: 2002, platform: 'Game Boy Advance'},
    {id: 'emerald', name: 'Pokémon Emerald', generation: 3, year: 2004, platform: 'Game Boy Advance'},
    {id: 'firered', name: 'Pokémon FireRed', generation: 3, year: 2004, platform: 'Game Boy Advance'},
    {id: 'leafgreen', name: 'Pokémon LeafGreen', generation: 3, year: 2004, platform: 'Game Boy Advance'},
    {id: 'diamond', name: 'Pokémon Diamond', generation: 4, year: 2006, platform: 'Nintendo DS'},
    {id: 'pearl', name: 'Pokémon Pearl', generation: 4, year: 2006, platform: 'Nintendo DS'},
    {id: 'platinum', name: 'Pokémon Platinum', generation: 4, year: 2008, platform: 'Nintendo DS'},
    {id: 'heartgold', name: 'Pokémon HeartGold', generation: 4, year: 2009, platform: 'Nintendo DS'},
    {id: 'soulsilver', name: 'Pokémon SoulSilver', generation: 4, year: 2009, platform: 'Nintendo DS'},
    {id: 'black', name: 'Pokémon Black', generation: 5, year: 2010, platform: 'Nintendo DS'},
    {id: 'white', name: 'Pokémon White', generation: 5, year: 2010, platform: 'Nintendo DS'},
    {id: 'black2', name: 'Pokémon Black 2', generation: 5, year: 2012, platform: 'Nintendo DS'},
    {id: 'white2', name: 'Pokémon White 2', generation: 5, year: 2012, platform: 'Nintendo DS'},
    {id: 'x', name: 'Pokémon X', generation: 6, year: 2013, platform: 'Nintendo 3DS'},
    {id: 'y', name: 'Pokémon Y', generation: 6, year: 2013, platform: 'Nintendo 3DS'},
    {id: 'omegaruby', name: 'Pokémon Omega Ruby', generation: 6, year: 2014, platform: 'Nintendo 3DS'},
    {id: 'alphasapphire', name: 'Pokémon Alpha Sapphire', generation: 6, year: 2014, platform: 'Nintendo 3DS'},
    {id: 'sun', name: 'Pokémon Sun', generation: 7, year: 2016, platform: 'Nintendo 3DS'},
    {id: 'moon', name: 'Pokémon Moon', generation: 7, year: 2016, platform: 'Nintendo 3DS'},
    {id: 'ultrasun', name: 'Pokémon Ultra Sun', generation: 7, year: 2017, platform: 'Nintendo 3DS'},
    {id: 'ultramoon', name: 'Pokémon Ultra Moon', generation: 7, year: 2017, platform: 'Nintendo 3DS'},
    {id: 'letsgopikachu', name: "Pokémon Let's Go, Pikachu!", generation: 7, year: 2018, platform: 'Nintendo Switch'},
    {id: 'letsgoeevee', name: "Pokémon Let's Go, Eevee!", generation: 7, year: 2018, platform: 'Nintendo Switch'},
    {id: 'sword', name: 'Pokémon Sword', generation: 8, year: 2019, platform: 'Nintendo Switch'},
    {id: 'shield', name: 'Pokémon Shield', generation: 8, year: 2019, platform: 'Nintendo Switch'},
    {id: 'brilliantdiamond', name: 'Pokémon Brilliant Diamond', generation: 8, year: 2021, platform: 'Nintendo Switch'},
    {id: 'shiningpearl', name: 'Pokémon Shining Pearl', generation: 8, year: 2021, platform: 'Nintendo Switch'},
    {id: 'legendsarceus', name: 'Pokémon Legends: Arceus', generation: 8, year: 2022, platform: 'Nintendo Switch'},
    {id: 'scarlet', name: 'Pokémon Scarlet', generation: 9, year: 2022, platform: 'Nintendo Switch'},
    {id: 'violet', name: 'Pokémon Violet', generation: 9, year: 2022, platform: 'Nintendo Switch'}
  ];
  
  const insertGame = db.prepare(`
    INSERT OR IGNORE INTO games (id, name, generation, year, platform)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((games) => {
    for (const game of games) {
      insertGame.run(game.id, game.name, game.generation, game.year, game.platform);
    }
  });
  
  insertMany(games);
  console.log(`   ✅ Inserted ${games.length} games`);
  
  // Seed Pokemon data from seed file
  console.log('📦 Seeding Pokemon data...');
  
  const pokemonSeed = JSON.parse(readFileSync(POKEMON_SEED, 'utf8'));
  
  const insertPokemon = db.prepare(`
    INSERT OR IGNORE INTO pokemon (id, name, generation)
    VALUES (?, ?, ?)
  `);
  
  const seedPokemon = db.transaction((pokemon) => {
    for (const p of pokemon) {
      insertPokemon.run(p.id, p.name, p.generation);
    }
  });
  
  seedPokemon(pokemonSeed);
  console.log(`   ✅ Inserted ${pokemonSeed.length} Pokemon`);
  
  console.log('\n✅ Database initialized successfully!');
  console.log('   Tables: pokemon, games, encounters');
  console.log('   Games: 37');
  console.log('   Pokemon: 1025 (placeholders)');
  console.log('   Ready for scraper to populate data\n');
  
} catch (error) {
  console.error('❌ Error initializing database:', error);
  process.exit(1);
} finally {
  db.close();
}

