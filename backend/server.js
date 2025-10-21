import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
const dbPath = process.env.DB_PATH || path.join(__dirname, '../public/data/pokemon.db');
const db = new Database(dbPath, { readonly: true });

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all Pokemon (with optional generation filter)
app.get('/api/pokemon', (req, res) => {
  const { generations } = req.query;
  
  let query = 'SELECT * FROM pokemon ORDER BY id';
  let params = [];
  
  if (generations) {
    const gens = generations.split(',').map(Number);
    query = `SELECT * FROM pokemon WHERE generation IN (${gens.map(() => '?').join(',')}) ORDER BY id`;
    params = gens;
  }
  
  const pokemon = db.prepare(query).all(...params);
  res.json(pokemon);
});

// Get all games (with optional generation filter)
app.get('/api/games', (req, res) => {
  const { generations } = req.query;
  
  let query = 'SELECT * FROM games ORDER BY generation, name';
  let params = [];
  
  if (generations) {
    const gens = generations.split(',').map(Number);
    query = `SELECT * FROM games WHERE generation IN (${gens.map(() => '?').join(',')}) ORDER BY generation, name`;
    params = gens;
  }
  
  const games = db.prepare(query).all(...params);
  
  // Add boxArt paths
  const gamesWithImages = games.map(game => ({
    ...game,
    boxArt: `/images/boxart/${game.id}.png`
  }));
  
  res.json(gamesWithImages);
});

// Get available Pokemon for selected games
app.get('/api/available-pokemon', (req, res) => {
  const { gameIds, acquisitionMethods, generations } = req.query;
  
  const selectedGames = gameIds && gameIds !== 'all' ? gameIds.split(',') : null;
  const selectedMethods = acquisitionMethods ? acquisitionMethods.split(',') : null;
  const selectedGens = generations ? generations.split(',').map(Number) : null;
  
  // Build query
  let query = `
    SELECT 
      e.pokemon_id,
      e.game_id,
      g.name as game_name,
      e.location,
      e.acquisition_method,
      e.encounter_area,
      e.encounter_rate,
      e.level_range,
      e.time_of_day,
      e.season,
      e.special_requirements,
      l.name as location_name
      ${selectedGames ? `, CASE WHEN e.game_id IN (${selectedGames.map(() => '?').join(',')}) THEN 1 ELSE 0 END as is_selected` : ', 0 as is_selected'}
    FROM encounters e
    JOIN games g ON e.game_id = g.id
    LEFT JOIN locations l ON e.location_id = l.id
  `;
  
  const conditions = [];
  const params = selectedGames ? [...selectedGames] : [];
  
  if (selectedMethods) {
    conditions.push(`e.acquisition_method IN (${selectedMethods.map(() => '?').join(',')})`);
    params.push(...selectedMethods);
  }
  
  if (selectedGens) {
    conditions.push(`e.pokemon_id IN (SELECT id FROM pokemon WHERE generation IN (${selectedGens.map(() => '?').join(',')}))`);
    params.push(...selectedGens);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY g.generation, g.name';
  
  const encounters = db.prepare(query).all(...params);
  res.json(encounters);
});

// Get Pokemon details
app.get('/api/pokemon/:id', (req, res) => {
  const { id } = req.params;
  const { gameIds } = req.query;
  
  const pokemon = db.prepare('SELECT * FROM pokemon WHERE id = ?').get(id);
  
  if (!pokemon) {
    return res.status(404).json({ error: 'Pokemon not found' });
  }
  
  // Get encounters for this Pokemon
  let encounterQuery = `
    SELECT 
      e.*,
      g.name as game_name,
      g.generation,
      l.name as location_name
    FROM encounters e
    JOIN games g ON e.game_id = g.id
    LEFT JOIN locations l ON e.location_id = l.id
    WHERE e.pokemon_id = ?
  `;
  
  const params = [id];
  
  if (gameIds) {
    const selectedGames = gameIds.split(',');
    encounterQuery += ` AND e.game_id IN (${selectedGames.map(() => '?').join(',')})`;
    params.push(...selectedGames);
  }
  
  encounterQuery += ' ORDER BY g.generation, g.name';
  
  const encounters = db.prepare(encounterQuery).all(...params);
  
  res.json({ ...pokemon, encounters });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
  console.log(`Database: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

