import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Progress tracking for disaster recovery
const PROGRESS_FILE = path.join(__dirname, '../.bulbapedia-progress.json');
const LOG_FILE = path.join(__dirname, '../bulbapedia-scraper.log');
const BATCH_SIZE = 10; // Save progress every 10 Pokemon
const DELAY_MS = 8000; // 8 seconds base delay
const DELAY_VARIANCE = 4000; // +/- 4 seconds random variance (4-12 second range)
const MAX_RETRIES = 7; // Expanded retries to support long backoff schedule
const RETRY_DELAYS = [10000, 30000, 60000, 300000, 1800000, 3600000, 10800000]; // 10s, 30s, 60s, 5m, 30m, 60m, 180m

// Spinner frames for loading indicator (Mac Terminal compatible)
const SPINNER_FRAMES = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
let spinnerInterval = null;
let currentSpinnerMessage = '';

// Map Bulbapedia game names to our IDs
const GAME_NAME_MAP = {
  // Gen 1
  'Red': 'red',
  'Blue': 'blue',
  'Yellow': 'yellow',
  
  // Gen 2
  'Gold': 'gold',
  'Silver': 'silver',
  'Crystal': 'crystal',
  
  // Gen 3
  'Ruby': 'ruby',
  'Sapphire': 'sapphire',
  'Emerald': 'emerald',
  'FireRed': 'firered',
  'LeafGreen': 'leafgreen',
  'Fire Red': 'firered',
  'Leaf Green': 'leafgreen',
  
  // Gen 4
  'Diamond': 'diamond',
  'Pearl': 'pearl',
  'Platinum': 'platinum',
  'HeartGold': 'heartgold',
  'SoulSilver': 'soulsilver',
  'Heart Gold': 'heartgold',
  'Soul Silver': 'soulsilver',
  
  // Gen 5
  'Black': 'black',
  'White': 'white',
  'Black 2': 'black2',
  'White 2': 'white2',
  
  // Gen 6
  'X': 'x',
  'Y': 'y',
  'Omega Ruby': 'omegaruby',
  'Alpha Sapphire': 'alphasapphire',
  
  // Gen 7
  'Sun': 'sun',
  'Moon': 'moon',
  'Ultra Sun': 'ultrasun',
  'Ultra Moon': 'ultramoon',
  "Let's Go, Pikachu!": 'letsgopikachu',
  "Let's Go, Eevee!": 'letsgoeevee',
  'Let\'s Go Pikachu': 'letsgopikachu',
  'Let\'s Go Eevee': 'letsgoeevee',
  
  // Gen 8
  'Sword': 'sword',
  'Shield': 'shield',
  'Brilliant Diamond': 'brilliantdiamond',
  'Shining Pearl': 'shiningpearl',
  'Legends: Arceus': 'legendsarceus',
  
  // Gen 9
  'Scarlet': 'scarlet',
  'Violet': 'violet'
};

// Track progress
let progress = {
  lastProcessedId: 0,
  lastProcessedName: '',
  totalProcessed: 0,
  totalAdded: 0,
  errors: [],
  timestamp: new Date().toISOString()
};

// Load progress if exists
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      console.log(`📂 Resuming from Pokemon #${progress.lastProcessedId} (${progress.lastProcessedName})`);
      console.log(`   Previously processed: ${progress.totalProcessed}, Added: ${progress.totalAdded}`);
      return true;
    } catch (error) {
      console.log('⚠️  Could not load progress, starting fresh');
      return false;
    }
  }
  return false;
}

// Save progress (atomic write to prevent corruption)
function saveProgress() {
  progress.timestamp = new Date().toISOString();
  const tempFile = PROGRESS_FILE + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(progress, null, 2));
  fs.renameSync(tempFile, PROGRESS_FILE); // Atomic operation
}

// Save games data (atomic write to prevent corruption)
function saveGamesData(gamesData, gamesPath) {
  const tempFile = gamesPath + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(gamesData, null, 2));
  fs.renameSync(tempFile, gamesPath); // Atomic operation
}

// Delay between requests
// Log to both console and file
function log(message, toFileOnly = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  // Always write to file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
  
  // Write to console unless file-only
  if (!toFileOnly) {
    console.log(message);
  }
}

// Random delay between requests (helps avoid rate limiting)
const delay = (baseMs = DELAY_MS, variance = DELAY_VARIANCE) => {
  const randomMs = baseMs + (Math.random() * variance * 2) - variance;
  const actualMs = Math.max(2000, Math.floor(randomMs)); // Minimum 2 seconds
  return new Promise(resolve => setTimeout(resolve, actualMs));
};

// Start a spinner with a message
function startSpinner(message) {
  // Stop any existing spinner first
  if (spinnerInterval) {
    stopSpinner(false);
  }
  
  let frame = 0;
  currentSpinnerMessage = message;
  
  // Function to render the current frame
  const render = () => {
    const spinner = SPINNER_FRAMES[frame];
    process.stdout.write(`\r${currentSpinnerMessage} ${spinner}`);
    frame = (frame + 1) % SPINNER_FRAMES.length;
  };
  
  // Initial render
  render();
  
  // Update every 100ms
  spinnerInterval = setInterval(render, 100);
}

// Stop the spinner and clear the line
function stopSpinner(clearLine = true) {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
  if (clearLine) {
    // Clear the entire line (write spaces to overwrite)
    process.stdout.write('\r' + ' '.repeat(120) + '\r');
  }
}

// Clean Pokemon name for Bulbapedia lookup (remove forme suffixes)
function cleanPokemonName(name) {
  // Remove forme suffixes like "Normal", "Attack", "Defense", "Speed"
  // These are used in pokemon.json but Bulbapedia uses base name
  const formeSuffixes = [
    ' Normal', ' Attack', ' Defense', ' Defence', ' Speed',
    ' Plant', ' Sandy', ' Trash',
    ' Altered', ' Origin',
    ' Land', ' Sky',
    ' Heat', ' Wash', ' Frost', ' Fan', ' Mow',
    ' Incarnate', ' Therian',
    ' Aria', ' Pirouette',
    ' Standard', ' Zen',
    ' Red-Striped', ' Blue-Striped',
    ' Shield', ' Blade',
    ' Average', ' Small', ' Large', ' Super',
    ' 50%', ' 10%', ' Complete',
    ' Baile', ' Pom-Pom', ' Pa\'u', ' Sensu',
    ' Midday', ' Midnight', ' Dusk',
    ' Solo', ' School',
    ' Disguised', ' Busted',
    ' Amped', ' Low Key',
    ' Full Belly', ' Hangry',
    ' Male', ' Female',
    ' Single Strike', ' Rapid Strike',
    ' Hero', ' Roaming', ' Crowned', ' Eternamax'
  ];
  
  for (const suffix of formeSuffixes) {
    if (name.endsWith(suffix)) {
      return name.replace(suffix, '');
    }
  }
  
  return name;
}

// Fetch Pokemon page from Bulbapedia with robust retry logic
async function fetchBulbapediaPage(pokemonName, pokemonId, retryCount = 0) {
  const cleanName = cleanPokemonName(pokemonName);
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&format=json&page=${encodeURIComponent(cleanName)}_(Pok%C3%A9mon)`;
  
  try {
    log(`  Attempt ${retryCount + 1}/${MAX_RETRIES + 1} for ${cleanName}...`, true);
    
    // Show spinner while fetching
    if (retryCount === 0) {
      startSpinner(`  [${pokemonId}] ${pokemonName.padEnd(20)} 📡 Fetching from Bulbapedia...`);
    }
    
    const fetchStart = Date.now();
    const response = await fetch(url);
    const fetchTime = Date.now() - fetchStart;
    stopSpinner();
    
    // Log fetch time
    log(`  Fetch time: ${fetchTime}ms`, true);
    
    if (!response.ok) {
      if (response.status === 404) {
        log(`  ${pokemonName}: Page not found (404)`, true);
        return null; // Page doesn't exist
      }
      
      // Retry on server errors
      if ((response.status === 403 || response.status === 503 || response.status === 504) && retryCount < MAX_RETRIES) {
        const waitTime = RETRY_DELAYS[retryCount];
        console.log(`  [${pokemonId}] ${pokemonName.padEnd(20)} ⚠️  HTTP ${response.status}, retrying in ${waitTime/1000}s (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return fetchBulbapediaPage(pokemonName, pokemonId, retryCount + 1);
      }
      
      // All retries exhausted
      throw new Error(`HTTP ${response.status} after ${retryCount + 1} attempts`);
    }
    
    const data = await response.json();
    return data.parse?.text?.['*'] || null;
  } catch (error) {
    // Retry on network errors
    if (retryCount < MAX_RETRIES && (error.message.includes('fetch') || error.message.includes('timeout'))) {
      const waitTime = RETRY_DELAYS[retryCount];
      log(`  ⚠️  Network error for ${pokemonName}, waiting ${waitTime/1000}s before retry ${retryCount + 2}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchBulbapediaPage(pokemonName, pokemonId, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Extract and clean regional dex info from location string
 * @param {string} location - Location string
 * @returns {Object} { cleanLocation, regionalDex }
 */
function extractRegionalDexInfo(location) {
  const regionalDexMatch = location.match(/Regional Dex #(\d+)/i);
  
  if (regionalDexMatch) {
    return {
      cleanLocation: location.replace(/\(Regional Dex #\d+\)/gi, '').trim(),
      regionalDex: parseInt(regionalDexMatch[1])
    };
  }
  
  return {
    cleanLocation: location,
    regionalDex: null
  };
}

/**
 * Try to extract regional dex number from Bulbapedia page
 * @param {Object} document - DOM document
 * @param {string} gameId - Game identifier
 * @returns {number|null} Regional dex number
 */
function extractRegionalDexNumber(document, gameId) {
  // Look for dex number in the game-specific sections
  // This is a best-effort extraction from various table formats
  const tables = document.querySelectorAll('table');
  
  for (const table of tables) {
    const cells = table.querySelectorAll('td, th');
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const text = cell.textContent.toLowerCase();
      
      // Look for dex number patterns near game names
      if (text.includes(gameId) || text.includes('dex')) {
        const nextCell = cells[i + 1];
        if (nextCell) {
          const numMatch = nextCell.textContent.match(/^\s*#?(\d+)\s*$/);
          if (numMatch) {
            return parseInt(numMatch[1]);
          }
        }
      }
    }
  }
  
  return null;
}

// Parse game locations from HTML
function parseGameLocations(html, pokemonId, pokemonName) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const gameLocations = {};
  
  // PERFORMANCE FIX: Cache regional dex lookups (was calling extractRegionalDexNumber hundreds of times!)
  const regionalDexCache = {};
  
  // Find the "Game locations" section
  const headers = document.querySelectorAll('h3');
  let locationHeader = null;
  
  for (const header of headers) {
    const span = header.querySelector('span.mw-headline');
    if (span && span.textContent.includes('Game locations')) {
      locationHeader = header;
      break;
    }
  }
  
  if (!locationHeader) {
    return gameLocations;
  }
  
  // Find all tables after the header until next section
  let currentElement = locationHeader.nextElementSibling;
  const tables = [];
  
  while (currentElement) {
    if (currentElement.tagName === 'TABLE') {
      tables.push(currentElement);
    }
    // Stop at next major section
    if (currentElement.tagName === 'H2' || 
        (currentElement.tagName === 'H3' && 
         !currentElement.textContent.includes('side games'))) {
      break;
    }
    currentElement = currentElement.nextElementSibling;
  }
  
  // Parse each table
  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tr'));
    
    // Strategy 1: Look for rows with game headers (th) and location data (td)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const headers = Array.from(row.querySelectorAll('th'));
      
      // Find game names in headers
      const gamesInRow = [];
      for (const th of headers) {
        const thText = th.textContent.trim();
        const links = th.querySelectorAll('a');
        
        // Check links first
        for (const link of links) {
          const linkText = link.textContent.trim();
          if (GAME_NAME_MAP[linkText]) {
            gamesInRow.push({ name: linkText, id: GAME_NAME_MAP[linkText] });
            break;
          }
        }
        
        // Check text content
        if (gamesInRow.length < headers.length) {
          for (const [name, id] of Object.entries(GAME_NAME_MAP)) {
            if (thText.includes(name)) {
              gamesInRow.push({ name, id });
              break;
            }
          }
        }
      }
      
      // If we found games, look for location in next row or same row
      if (gamesInRow.length > 0) {
        let locationRow = row;
        let locationCells = row.querySelectorAll('td');
        
        // If no td in current row, check next row
        if (locationCells.length === 0 && i + 1 < rows.length) {
          locationRow = rows[i + 1];
          locationCells = locationRow.querySelectorAll('td');
        }
        
        if (locationCells.length > 0) {
          // Usually there's one td that spans multiple games or one per game
          for (const td of locationCells) {
            let location = td.textContent.trim();
            
            // Clean up
            location = location
              .replace(/\s+/g, ' ')
              .replace(/\[.*?\]/g, '')
              .replace(/\n/g, ' ')
              .trim();
            
            // Skip empty, "unavailable", OR if it's just the Pokemon name (parsing error)
            if (!location || 
                location.toLowerCase().includes('unavailable') ||
                location.toLowerCase().includes('unobtainable') ||
                location.toLowerCase().includes('none') ||
                location.length < 3 ||
                location.toLowerCase().includes(pokemonName.toLowerCase())) {
              continue;
            }
            
            // Truncate long locations but preserve key info
            if (location.length > 200) {
              location = location.substring(0, 197) + '...';
            }
            
            // Add to each game found in the row
            for (const game of gamesInRow) {
              if (!gameLocations[game.id]) {
                gameLocations[game.id] = [];
              }
              
              // Extract regional dex info and clean location
              const { cleanLocation, regionalDex } = extractRegionalDexInfo(location);
              
              // Try to get regional dex from page structure if not in location (CACHED!)
              if (!regionalDexCache.hasOwnProperty(game.id)) {
                regionalDexCache[game.id] = extractRegionalDexNumber(document, game.id);
              }
              const dexNumber = regionalDex || regionalDexCache[game.id];
              
              const entry = {
                id: pokemonId,
                location: cleanLocation
              };
              
              // Only add regionalDex if we found one
              if (dexNumber) {
                entry.regionalDex = dexNumber;
              }
              
              gameLocations[game.id].push(entry);
            }
          }
        }
      }
    }
    
    // Strategy 2: Look for inline game mentions (for older table formats)
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th'));
      
      for (let i = 0; i < cells.length - 1; i++) {
        const cell = cells[i];
        const cellText = cell.textContent.trim();
        
        // Find game name in this cell
        let gameId = null;
        for (const [name, id] of Object.entries(GAME_NAME_MAP)) {
          if (cellText.includes(name)) {
            gameId = id;
            break;
          }
        }
        
        if (gameId) {
          // Next cell likely has location
          const locationCell = cells[i + 1];
          let location = locationCell.textContent.trim();
          
          location = location
            .replace(/\s+/g, ' ')
            .replace(/\[.*?\]/g, '')
            .trim();
          
          if (location && 
              !location.toLowerCase().includes('unavailable') &&
              !location.toLowerCase().includes('unobtainable') &&
              location.length > 3) {
            
            if (!gameLocations[gameId]) {
              gameLocations[gameId] = [];
            }
            
            if (location.length > 200) {
              location = location.substring(0, 197) + '...';
            }
            
            // Extract regional dex info and clean location
            const { cleanLocation, regionalDex } = extractRegionalDexInfo(location);
            const dexNumber = regionalDex || extractRegionalDexNumber(document, gameId);
            
            const entry = {
              id: pokemonId,
              location: cleanLocation
            };
            
            if (dexNumber) {
              entry.regionalDex = dexNumber;
            }
            
            gameLocations[gameId].push(entry);
          }
        }
      }
    }
  }
  
  return gameLocations;
}

// Process a single Pokemon
async function processPokemon(pokemon, gamesData) {
  const { id, name } = pokemon;
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&format=json&page=${encodeURIComponent(name)}_(Pok%C3%A9mon)`;
  
  try {
    log(`Processing #${id} ${name}`, true);
    
    const overallStart = Date.now();
    
    // Fetch with spinner (spinner shown inside fetchBulbapediaPage)
    const fetchStart = Date.now();
    const html = await fetchBulbapediaPage(name, id);
    const fetchTime = Date.now() - fetchStart;
    
    if (!html) {
      console.log(`  [${id}] ${name.padEnd(20)} ⚠️  Page not found on Bulbapedia`);
      log(`  #${id} ${name}: Page not found`, true);
      return { added: 0, skipped: true, url };
    }
    
    // Show processing spinner (ensure previous is stopped and restart)
    if (spinnerInterval) {
      stopSpinner(false);
    }
    startSpinner(`  [${id}] ${name.padEnd(20)} 📝 Processing location data...`);
    
    const parseStart = Date.now();
    const gameLocations = parseGameLocations(html, id, name);
    const parseTime = Date.now() - parseStart;
    const gameCount = Object.keys(gameLocations).length;
    
    log(`  Parse time: ${parseTime}ms`, true);
    
    if (gameCount === 0) {
      stopSpinner();
      console.log(`  [${id}] ${name.padEnd(20)} ⚠️  No locations found`);
      return { added: 0, skipped: true };
    }
    
    // Add to games
    let added = 0;
    for (const [gameId, locations] of Object.entries(gameLocations)) {
      const game = gamesData.games.find(g => g.id === gameId);
      if (!game) {
        continue;
      }
      
      const existingIds = new Set(game.pokemon.map(p => p.id));
      
      for (const location of locations) {
        if (!existingIds.has(id)) {
          game.pokemon.push(location);
          existingIds.add(id);
          added++;
        }
      }
    }
    
    stopSpinner();
    
    const totalTime = Date.now() - overallStart;
    const otherTime = totalTime - fetchTime - parseTime;
    
    if (added > 0) {
      console.log(`  [${id}] ${name.padEnd(20)} ✅ Added ${added} location entries across ${gameCount} games [fetch: ${fetchTime}ms, parse: ${parseTime}ms, other: ${otherTime}ms]`);
      log(`  #${id} ${name}: SUCCESS - Added ${added} entries across ${gameCount} games (total: ${totalTime}ms, fetch: ${fetchTime}ms, parse: ${parseTime}ms)`, true);
    } else {
      console.log(`  [${id}] ${name.padEnd(20)} ℹ️  Already present in ${gameCount} games [fetch: ${fetchTime}ms, parse: ${parseTime}ms, other: ${otherTime}ms]`);
      log(`  #${id} ${name}: Already in database (total: ${totalTime}ms, fetch: ${fetchTime}ms, parse: ${parseTime}ms)`, true);
    }
    
    return { added, skipped: false, url };
    
  } catch (error) {
    stopSpinner();
    console.log(`  [${id}] ${name.padEnd(20)} ❌ ${error.message}`);
    log(`  #${id} ${name}: FAILED - ${error.message}`, true);
    
    // Return error with URL for testing
    return { added: 0, skipped: false, error: true, errorMessage: error.message, url };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fresh = args.includes('--fresh');
  const replace = args.includes('--replace'); // NEW: Replace existing data
  const rangeArg = args.find(arg => arg.startsWith('--range='));
  
  let startId = 1;
  let endId = 1025;
  
  if (rangeArg) {
    const [start, end] = rangeArg.split('=')[1].split('-').map(Number);
    startId = start || 1;
    endId = end || 1025;
  }
  
  // Handle Ctrl+C gracefully - save progress before exiting
  let gamesDataRef = null;
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Ctrl+C detected! Saving progress before exit...\n');
    
    if (!dryRun && gamesDataRef) {
      try {
        saveProgress();
        const gamesPath = path.join(__dirname, '../public/data/games.json');
        saveGamesData(gamesDataRef, gamesPath);
        console.log('✅ Progress saved successfully\n');
        console.log(`📊 Last completed: #${progress.lastProcessedId} (${progress.lastProcessedName})`);
        console.log(`   Total processed: ${progress.totalProcessed}, Added: ${progress.totalAdded}\n`);
        console.log('🔄 Run the script again to resume from where you left off.\n');
      } catch (error) {
        console.log('❌ Error saving progress:', error.message);
      }
    }
    
    process.exit(0);
  });

  // Handle SIGTERM for Docker stop events (graceful shutdown)
  process.on('SIGTERM', () => {
    console.log('\n\n⚠️  SIGTERM received! Saving progress before exit...\n');
    if (!dryRun && gamesDataRef) {
      try {
        saveProgress();
        const gamesPath = path.join(__dirname, '../public/data/games.json');
        saveGamesData(gamesDataRef, gamesPath);
        console.log('✅ Progress saved successfully\n');
      } catch (error) {
        console.log('❌ Error saving progress:', error.message);
      }
    }
    process.exit(0);
  });
  
  // Initialize/clear log file
  if (fresh || !fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, `=== Bulbapedia Scraper Log ===\nStarted: ${new Date().toISOString()}\n\n`);
  }
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       BULBAPEDIA COMPREHENSIVE DATA SCRAPER               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Configuration:`);
  console.log(`   Range: Pokemon ${startId}-${endId} (${endId - startId + 1} total)`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no saves)' : 'LIVE (will update)'}`);
  console.log(`   Data: ${replace ? 'REPLACE existing (clean slate)' : 'ADD to existing'}`);
  console.log(`   Delay: ${DELAY_MS}ms ± ${DELAY_VARIANCE}ms (randomized 4-12s)`);
  console.log(`   Retries: Up to ${MAX_RETRIES} retries with escalating delays`);
  console.log(`   Retry delays: ${RETRY_DELAYS.map(d => d/1000 + 's').join(', ')}`);
  console.log(`   Log file: bulbapedia-scraper.log`);
  console.log(`   Halt on error: YES (will not skip failed Pokemon)`);
  console.log(`   Estimated time: ${Math.ceil((endId - startId + 1) * (DELAY_MS / 1000) / 60)} minutes\n`);
  
  log(`\n=== New scrape session ===`);
  log(`Range: ${startId}-${endId}`);
  
  // Load data
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
  // Store reference for SIGINT handler
  gamesDataRef = gamesData;
  
  // Load or reset progress
  if (fresh || dryRun) {
    progress = {
      lastProcessedId: startId - 1,
      lastProcessedName: '',
      totalProcessed: 0,
      totalAdded: 0,
      errors: [],
      timestamp: new Date().toISOString()
    };
    if (fresh && fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
      console.log('🗑️  Cleared previous progress (--fresh)\n');
    }
  } else {
    loadProgress();
  }
  
  // Backup
  if (!dryRun) {
    const backupPath = gamesPath.replace('.json', `.before-bulbapedia-${Date.now()}.json`);
    fs.copyFileSync(gamesPath, backupPath);
    console.log(`📋 Backup: ${backupPath}\n`);
  }
  
  // REPLACE mode: Clear existing Pokemon data from all games
  if (replace && !dryRun) {
    console.log('🧹 REPLACE MODE: Clearing existing Pokemon data from all games...\n');
    gamesData.games.forEach(game => {
      game.pokemon = [];
    });
    console.log('✅ All games cleared. Starting with clean slate.\n');
  } else if (replace && dryRun) {
    console.log('🧹 REPLACE MODE (dry run): Would clear all existing Pokemon data\n');
  }
  
  console.log('🔍 Starting scrape...\n');
  
  // Filter Pokemon
  // If user explicitly specifies a range, use that range (don't skip based on progress)
  // Otherwise, resume from last processed
  let actualStartId = startId;
  if (!rangeArg) {
    // No explicit range - use progress to resume
    actualStartId = Math.max(startId, progress.lastProcessedId + 1);
  } else {
    // Explicit range provided - use it even if it overlaps with progress
    console.log(`⚠️  Explicit range ${startId}-${endId} provided. Will process this range regardless of progress.`);
    console.log(`   (Some Pokemon may already have data - they'll show as "already present")\n`);
  }
  
  const pokemonToProcess = pokemonData.pokemon.filter(p => 
    p.id >= actualStartId && p.id <= endId
  );
  
  let sessionAdded = 0;
  let batchCount = 0;
  
  for (const pokemon of pokemonToProcess) {
    const result = await processPokemon(pokemon, gamesData);
    
    // HALT on error - don't continue
    if (result.error) {
      console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
      console.log(`║          ❌ SCRAPER HALTED ON ERROR ❌                    ║`);
      console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
      console.log(`Pokemon: #${pokemon.id} ${pokemon.name}`);
      console.log(`Error: ${result.errorMessage}`);
      console.log(`\n🔍 Test this URL in your browser:`);
      console.log(`${result.url}\n`);
      console.log(`📝 Check log file for details:`);
      console.log(`   cat bulbapedia-scraper.log\n`);
      console.log(`🔄 To retry from this Pokemon:`);
      console.log(`   node scripts/scrape-bulbapedia.js --range=${pokemon.id}-1025\n`);
      console.log(`💡 Bulbapedia might be down. Try again later during off-peak hours.`);
      
      // Save final progress before exit
      if (!dryRun) {
        saveProgress();
        saveGamesData(gamesData, gamesPath);
        console.log(`\n💾 Progress and data saved before exit\n`);
      }
      
      process.exit(1);
    }
    
    // Update progress on success
    progress.lastProcessedId = pokemon.id;
    progress.lastProcessedName = pokemon.name;
    progress.totalProcessed++;
    
    if (result.added > 0) {
      sessionAdded += result.added;
      progress.totalAdded += result.added;
    }
    
    batchCount++;
    
    // Save progress every BATCH_SIZE Pokemon
    if (batchCount >= BATCH_SIZE && !dryRun) {
      saveProgress();
      saveGamesData(gamesData, gamesPath);
      console.log(`\n  💾 Progress saved (${progress.totalProcessed} processed, ${progress.totalAdded} added)\n`);
      batchCount = 0;
    }
    
    // Rate limiting
    await delay(DELAY_MS);
  }
  
  // Final save
  if (!dryRun) {
    saveProgress();
    
    // Sort all game Pokemon by ID
    for (const game of gamesData.games) {
      game.pokemon.sort((a, b) => a.id - b.id);
    }
    
    saveGamesData(gamesData, gamesPath);
    console.log(`\n💾 Final save complete`);
  }
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    SCRAPE COMPLETE                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`📊 Statistics:`);
  console.log(`   Pokemon processed: ${progress.totalProcessed}`);
  console.log(`   Total additions: ${progress.totalAdded}`);
  console.log(`   Errors: ${progress.errors.length}`);
  
  if (progress.errors.length > 0) {
    console.log(`\n⚠️  Errors occurred:`);
    progress.errors.slice(-10).forEach(err => {
      console.log(`   #${err.id} ${err.name}: ${err.error}`);
    });
  }
  
  if (!dryRun) {
    console.log(`\n📁 Files:`);
    console.log(`   Data: ${gamesPath}`);
    console.log(`   Progress: ${PROGRESS_FILE}`);
    console.log(`\n💡 To resume later: node scripts/scrape-bulbapedia.js --range=${progress.lastProcessedId + 1}-${endId}`);
  } else {
    console.log(`\n💡 Run without --dry-run to save changes`);
  }
  
  console.log('\n✨ Done!\n');
}

main().catch(console.error);

