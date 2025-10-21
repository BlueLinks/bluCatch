#!/usr/bin/env node

/**
 * Add sprite_url column to pokemon table and populate it
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/pokemon.db');

console.log('📊 Adding sprite_url column to pokemon table...');

const db = new Database(dbPath);

try {
  // Check if column already exists
  const columns = db.prepare("PRAGMA table_info(pokemon)").all();
  const hasSpriteUrl = columns.some(col => col.name === 'sprite_url');
  
  if (hasSpriteUrl) {
    console.log('✅ sprite_url column already exists');
  } else {
    // Add the column
    db.exec('ALTER TABLE pokemon ADD COLUMN sprite_url TEXT;');
    console.log('✅ Added sprite_url column');
  }
  
  // Populate sprite URLs for all Pokemon
  const updateStmt = db.prepare(`
    UPDATE pokemon 
    SET sprite_url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' || id || '.png'
    WHERE sprite_url IS NULL
  `);
  
  const result = updateStmt.run();
  console.log(`✅ Updated ${result.changes} Pokemon with sprite URLs`);
  
  // Verify
  const sample = db.prepare('SELECT id, name, sprite_url FROM pokemon LIMIT 3').all();
  console.log('\n Sample data:');
  sample.forEach(p => console.log(`  ${p.id}. ${p.name}: ${p.sprite_url}`));
  
  console.log('\n✅ Sprite URLs added successfully!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}

