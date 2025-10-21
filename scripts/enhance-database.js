import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../public/data/pokemon.db');

console.log('🔄 Enhancing database schema for route-based scraping...\n');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Step 1: Create locations table
console.log('📍 Creating locations table...');
db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT,
    location_type TEXT,
    bulbapedia_page TEXT,
    generation INTEGER,
    last_scraped_at INTEGER,
    scrape_status TEXT DEFAULT 'pending'
  );
`);
console.log('   ✅ Locations table created\n');

// Step 2: Create scraper_cache table
console.log('🗄️  Creating scraper_cache table...');
db.exec(`
  CREATE TABLE IF NOT EXISTS scraper_cache (
    cache_key TEXT PRIMARY KEY,
    data_type TEXT NOT NULL,
    last_queried_at INTEGER NOT NULL,
    status TEXT DEFAULT 'complete',
    metadata TEXT
  );
`);
console.log('   ✅ Scraper cache table created\n');

// Step 3: Add new columns to encounters table
console.log('📊 Enhancing encounters table...');

// Check which columns already exist
const tableInfo = db.prepare('PRAGMA table_info(encounters)').all();
const existingColumns = new Set(tableInfo.map(col => col.name));

const newColumns = [
  { name: 'location_id', type: 'TEXT', constraint: 'REFERENCES locations(id)' },
  { name: 'encounter_area', type: 'TEXT' },
  { name: 'encounter_rate', type: 'TEXT' },
  { name: 'level_range', type: 'TEXT' },
  { name: 'time_of_day', type: 'TEXT' },
  { name: 'season', type: 'TEXT' },
  { name: 'special_requirements', type: 'TEXT' }
];

for (const col of newColumns) {
  if (!existingColumns.has(col.name)) {
    const constraint = col.constraint ? ` ${col.constraint}` : '';
    db.exec(`ALTER TABLE encounters ADD COLUMN ${col.name} ${col.type}${constraint}`);
    console.log(`   ✅ Added column: ${col.name}`);
  } else {
    console.log(`   ⏭️  Column already exists: ${col.name}`);
  }
}

// Step 4: Create indexes
console.log('\n📑 Creating indexes...');
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_encounters_location ON encounters(location_id)');
  console.log('   ✅ Created index on encounters.location_id');
} catch (e) {
  console.log('   ⏭️  Index already exists');
}

// Step 5: Parse existing location data and extract special requirements
console.log('\n🔍 Analyzing existing encounter data...');

const encounters = db.prepare('SELECT id, location FROM encounters WHERE location IS NOT NULL').all();
console.log(`   Found ${encounters.length} encounters to analyze\n`);

// Patterns to detect
const dualSlotPattern = /\((firered|leafgreen|ruby|sapphire|emerald|any gen iii game)\)/i;

let updatedCount = 0;
const updateStmt = db.prepare('UPDATE encounters SET special_requirements = ? WHERE id = ?');

const transaction = db.transaction((encounters) => {
  for (const enc of encounters) {
    const match = enc.location.match(dualSlotPattern);
    if (match) {
      const requirements = JSON.stringify({
        dualSlot: match[1].toLowerCase().replace(' ', '-')
      });
      updateStmt.run(requirements, enc.id);
      updatedCount++;
    }
  }
});

transaction(encounters);
console.log(`   ✅ Updated ${updatedCount} encounters with special requirements\n`);

// Step 6: Summary
console.log('📊 Database Enhancement Summary:');
console.log('   ✅ Locations table created');
console.log('   ✅ Scraper cache table created');
console.log('   ✅ Encounters table enhanced with 7 new columns');
console.log('   ✅ Indexes created');
console.log(`   ✅ ${updatedCount} dual-slot requirements extracted\n`);

console.log('🎉 Database enhancement complete!');
console.log('   Next step: Run route-based scraper to populate detailed data\n');

db.close();

