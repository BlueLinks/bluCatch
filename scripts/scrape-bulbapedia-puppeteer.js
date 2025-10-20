import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { JSDOM } from 'jsdom';

// Use stealth plugin to avoid Cloudflare detection
puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Progress tracking for disaster recovery
const PROGRESS_FILE = path.join(__dirname, '../.bulbapedia-progress.json');
const LOG_FILE = path.join(__dirname, '../bulbapedia-scraper.log');
const BATCH_SIZE = 10; // Save progress every 10 Pokemon
const DELAY_MS = 8000; // 8 seconds base delay
const DELAY_VARIANCE = 4000; // +/- 4 seconds random variance
const MAX_RETRIES = 3; // Retry failed requests up to 3 times
const RETRY_DELAYS = [10000, 30000, 60000]; // 10s, 30s, 1m

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
      return true;
    } catch (error) {
      return false;
    }
  }
  return false;
}

// Save progress
function saveProgress() {
  progress.timestamp = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Log to both console and file
function log(message, toFileOnly = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
  
  if (!toFileOnly) {
    console.log(message);
  }
}

// Random delay
const delay = (baseMs = DELAY_MS, variance = DELAY_VARIANCE) => {
  const randomMs = baseMs + (Math.random() * variance * 2) - variance;
  const actualMs = Math.max(2000, Math.floor(randomMs));
  return new Promise(resolve => setTimeout(resolve, actualMs));
};

// Fetch Pokemon page from Bulbapedia using Puppeteer (bypasses Cloudflare)
async function fetchBulbapediaPage(page, pokemonName, pokemonId, retryCount = 0) {
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&format=json&page=${encodeURIComponent(pokemonName)}_(Pok%C3%A9mon)`;
  
  try {
    log(`  Attempt ${retryCount + 1}/${MAX_RETRIES + 1} for ${pokemonName}...`, true);
    
    // Navigate to the API URL
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    if (!response.ok()) {
      if (response.status() === 404) {
        log(`  ${pokemonName}: Page not found (404)`, true);
        return null;
      }
      
      // Retry on server errors
      if ((response.status() === 403 || response.status() === 503 || response.status() === 504) && retryCount < MAX_RETRIES) {
        const waitTime = RETRY_DELAYS[retryCount];
        log(`  ⚠️  HTTP ${response.status()} for ${pokemonName}, waiting ${waitTime/1000}s before retry ${retryCount + 2}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return fetchBulbapediaPage(page, pokemonName, pokemonId, retryCount + 1);
      }
      
      throw new Error(`HTTP ${response.status()} after ${retryCount + 1} attempts`);
    }
    
    // Get the page content (it should be JSON)
    const content = await page.content();
    
    // Extract JSON from the page
    const bodyText = await page.evaluate(() => document.body.textContent);
    
    try {
      const data = JSON.parse(bodyText);
      return data.parse?.text?.['*'] || null;
    } catch (e) {
      log(`  Warning: Could not parse JSON for ${pokemonName}`, true);
      return null;
    }
    
  } catch (error) {
    // Retry on errors
    if (retryCount < MAX_RETRIES) {
      const waitTime = RETRY_DELAYS[retryCount];
      log(`  ⚠️  Error for ${pokemonName}: ${error.message}, waiting ${waitTime/1000}s before retry ${retryCount + 2}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchBulbapediaPage(page, pokemonName, pokemonId, retryCount + 1);
    }
    throw error;
  }
}

// [Include all the parsing functions from the original script]
// Copy the extractRegionalDexInfo, extractRegionalDexNumber, and parseGameLocations functions here
// (keeping them the same as before)

/**
 * Extract and clean regional dex info from location string
 */
function extractRegionalDexInfo(location) {
  const regionalDexMatch = location.match(/\(?Regional Dex #(\d+)\)?/i);
  
  if (regionalDexMatch) {
    let cleanLocation = location
      .replace(/\(?Regional Dex #\d+\)?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!cleanLocation || cleanLocation.length < 3) {
      cleanLocation = 'Available in game';
    }
    
    return {
      cleanLocation,
      regionalDex: parseInt(regionalDexMatch[1])
    };
  }
  
  return {
    cleanLocation: location,
    regionalDex: null
  };
}

function extractRegionalDexNumber(document, gameId) {
  const tables = document.querySelectorAll('table');
  
  for (const table of tables) {
    const cells = table.querySelectorAll('td, th');
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const text = cell.textContent.toLowerCase();
      
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

function parseGameLocations(html, pokemonId, pokemonName) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const gameLocations = {};
  
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
  
  let currentElement = locationHeader.nextElementSibling;
  const tables = [];
  
  while (currentElement) {
    if (currentElement.tagName === 'TABLE') {
      tables.push(currentElement);
    }
    if (currentElement.tagName === 'H2' || 
        (currentElement.tagName === 'H3' && 
         !currentElement.textContent.includes('side games'))) {
      break;
    }
    currentElement = currentElement.nextElementSibling;
  }
  
  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tr'));
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const headers = Array.from(row.querySelectorAll('th'));
      
      const gamesInRow = [];
      for (const th of headers) {
        const thText = th.textContent.trim();
        const links = th.querySelectorAll('a');
        
        for (const link of links) {
          const linkText = link.textContent.trim();
          if (GAME_NAME_MAP[linkText]) {
            gamesInRow.push({ name: linkText, id: GAME_NAME_MAP[linkText] });
            break;
          }
        }
        
        if (gamesInRow.length < headers.length) {
          for (const [name, id] of Object.entries(GAME_NAME_MAP)) {
            if (thText.includes(name)) {
              gamesInRow.push({ name, id });
              break;
            }
          }
        }
      }
      
      if (gamesInRow.length > 0) {
        let locationRow = row;
        let locationCells = row.querySelectorAll('td');
        
        if (locationCells.length === 0 && i + 1 < rows.length) {
          locationRow = rows[i + 1];
          locationCells = locationRow.querySelectorAll('td');
        }
        
        if (locationCells.length > 0) {
          for (const td of locationCells) {
            let location = td.textContent.trim();
            
            location = location
              .replace(/\s+/g, ' ')
              .replace(/\[.*?\]/g, '')
              .replace(/\n/g, ' ')
              .trim();
            
            if (!location || 
                location.toLowerCase().includes('unavailable') ||
                location.toLowerCase().includes('unobtainable') ||
                location.toLowerCase().includes('none') ||
                location.length < 3) {
              continue;
            }
            
            if (location.length > 200) {
              location = location.substring(0, 197) + '...';
            }
            
            for (const game of gamesInRow) {
              if (!gameLocations[game.id]) {
                gameLocations[game.id] = [];
              }
              
              const { cleanLocation, regionalDex } = extractRegionalDexInfo(location);
              const dexNumber = regionalDex || extractRegionalDexNumber(document, game.id);
              
              const entry = {
                id: pokemonId,
                location: cleanLocation
              };
              
              if (dexNumber) {
                entry.regionalDex = dexNumber;
              }
              
              gameLocations[game.id].push(entry);
            }
          }
        }
      }
    }
    
    // Strategy 2: Inline game mentions
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th'));
      
      for (let i = 0; i < cells.length - 1; i++) {
        const cell = cells[i];
        const cellText = cell.textContent.trim();
        
        let gameId = null;
        for (const [name, id] of Object.entries(GAME_NAME_MAP)) {
          if (cellText.includes(name)) {
            gameId = id;
            break;
          }
        }
        
        if (gameId) {
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
async function processPokemon(page, pokemon, gamesData) {
  const { id, name } = pokemon;
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&format=json&page=${encodeURIComponent(name)}_(Pok%C3%A9mon)`;
  
  try {
    process.stdout.write(`  [${id}] ${name.padEnd(20)}... `);
    log(`Processing #${id} ${name}`, true);
    
    const html = await fetchBulbapediaPage(page, name, id);
    
    if (!html) {
      console.log('page not found');
      log(`  #${id} ${name}: Page not found`, true);
      return { added: 0, skipped: true, url };
    }
    
    const gameLocations = parseGameLocations(html, id, name);
    const gameCount = Object.keys(gameLocations).length;
    
    if (gameCount === 0) {
      console.log('no locations found');
      log(`  #${id} ${name}: No locations parsed`, true);
      return { added: 0, skipped: false, url };
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
    
    if (added > 0) {
      console.log(`✓ +${added} across ${gameCount} games`);
      log(`  #${id} ${name}: SUCCESS - Added ${added} entries across ${gameCount} games`, true);
    } else {
      console.log(`already present in ${gameCount} games`);
      log(`  #${id} ${name}: Already in database`, true);
    }
    
    return { added, skipped: false, url };
    
  } catch (error) {
    console.log(`❌ ${error.message}`);
    log(`  #${id} ${name}: FAILED - ${error.message}`, true);
    
    return { added: 0, skipped: false, error: true, errorMessage: error.message, url };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fresh = args.includes('--fresh');
  const replace = args.includes('--replace');
  const rangeArg = args.find(arg => arg.startsWith('--range='));
  
  let startId = 1;
  let endId = 1025;
  
  if (rangeArg) {
    const [start, end] = rangeArg.split('=')[1].split('-').map(Number);
    startId = start || 1;
    endId = end || 1025;
  }
  
  // Initialize log file
  if (fresh || !fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, `=== Bulbapedia Scraper Log (Puppeteer) ===\nStarted: ${new Date().toISOString()}\n\n`);
  }
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   BULBAPEDIA SCRAPER (Puppeteer - Cloudflare Bypass)     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Configuration:`);
  console.log(`   Range: Pokemon ${startId}-${endId} (${endId - startId + 1} total)`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Data: ${replace ? 'REPLACE' : 'ADD'}`);
  console.log(`   Browser: Puppeteer (bypasses Cloudflare)`);
  console.log(`   Delay: ${DELAY_MS}ms ± ${DELAY_VARIANCE}ms`);
  console.log(`   Retries: Up to ${MAX_RETRIES} with escalating delays`);
  console.log(`   Halt on error: YES\n`);
  
  log(`\n=== New scrape session (Puppeteer) ===`);
  log(`Range: ${startId}-${endId}`);
  
  // Load data
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
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
    }
  } else {
    const loaded = loadProgress();
    if (loaded) {
      console.log(`📂 Resuming from Pokemon #${progress.lastProcessedId} (${progress.lastProcessedName})`);
      console.log(`   Previously: ${progress.totalProcessed} processed, ${progress.totalAdded} added\n`);
    }
  }
  
  // Backup
  if (!dryRun) {
    const backupPath = gamesPath.replace('.json', `.before-bulbapedia-${Date.now()}.json`);
    fs.copyFileSync(gamesPath, backupPath);
    console.log(`📋 Backup: ${backupPath}\n`);
  }
  
  // REPLACE mode
  if (replace && !dryRun) {
    console.log('🧹 REPLACE MODE: Clearing existing Pokemon data...\n');
    gamesData.games.forEach(game => {
      game.pokemon = [];
    });
    console.log('✅ All games cleared.\n');
  }
  
  console.log('🌐 Launching browser (Puppeteer)...\n');
  
  // Launch Puppeteer browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  console.log('✅ Browser ready. Starting scrape...\n');
  
  // Filter Pokemon
  const pokemonToProcess = pokemonData.pokemon.filter(p => 
    p.id >= Math.max(startId, progress.lastProcessedId + 1) && 
    p.id <= endId
  );
  
  let sessionAdded = 0;
  let batchCount = 0;
  
  try {
    for (const pokemon of pokemonToProcess) {
      const result = await processPokemon(page, pokemon, gamesData);
      
      // HALT on error
      if (result.error) {
        console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
        console.log(`║          ❌ SCRAPER HALTED ON ERROR ❌                    ║`);
        console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
        console.log(`Pokemon: #${pokemon.id} ${pokemon.name}`);
        console.log(`Error: ${result.errorMessage}`);
        console.log(`\n🔍 Test this URL in your browser:`);
        console.log(`${result.url}\n`);
        console.log(`📝 Check log file:`);
        console.log(`   cat bulbapedia-scraper.log\n`);
        console.log(`🔄 To retry:`);
        console.log(`   node scripts/scrape-bulbapedia-puppeteer.js --range=${pokemon.id}-1025\n`);
        
        if (!dryRun) {
          saveProgress();
          fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
          console.log(`💾 Progress and data saved\n`);
        }
        
        await browser.close();
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
        fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
        console.log(`\n  💾 Progress saved (${progress.totalProcessed} processed, ${progress.totalAdded} added)\n`);
        batchCount = 0;
      }
      
      // Rate limiting
      await delay(DELAY_MS);
    }
    
    // Final save
    if (!dryRun) {
      saveProgress();
      
      for (const game of gamesData.games) {
        game.pokemon.sort((a, b) => a.id - b.id);
      }
      
      fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
      console.log(`\n💾 Final save complete`);
    }
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                ✅ SCRAPE COMPLETE! ✅                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Statistics:`);
    console.log(`   Pokemon processed: ${progress.totalProcessed}`);
    console.log(`   Total additions: ${progress.totalAdded}`);
    console.log(`   Errors: ${progress.errors.length}\n`);
    
    if (progress.errors.length > 0) {
      console.log(`⚠️  Some errors occurred. Check:`);
      console.log(`   cat bulbapedia-scraper.log\n`);
    }
    
  } finally {
    await browser.close();
    console.log('🌐 Browser closed\n');
  }
}

main().catch(console.error);

