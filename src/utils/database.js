import initSqlJs from 'sql.js';

let db = null;
let SQL = null;

/**
 * Initialize the SQLite database
 * Loads the WASM module and fetches the database file
 * @returns {Promise<Database>} The initialized database
 */
export async function initDatabase() {
  if (db) {
    return db; // Already initialized
  }

  try {
    // Initialize sql.js with WASM
    SQL = await initSqlJs({
      locateFile: file => `/wasm/${file}`
    });
    
    // Fetch the database file
    const response = await fetch('/data/pokemon.db');
    if (!response.ok) {
      throw new Error(`Failed to fetch database: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));
    
    console.log('✅ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get the database instance
 * @returns {Database} The database instance
 * @throws {Error} If database is not initialized
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}

/**
 * Execute a query and return all results
 * Helper function to simplify query execution
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Array} Array of result objects
 */
export function query(sql, params = []) {
  const db = getDatabase();
  const results = db.exec(sql, params);
  
  if (results.length === 0) {
    return [];
  }
  
  // Convert sql.js result format to array of objects
  const { columns, values } = results[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Execute a query and return the first result
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Object|null} First result object or null
 */
export function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

