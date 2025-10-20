import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROGRESS_FILE = path.join(__dirname, '../.bulbapedia-progress.json');
const LOG_FILE = path.join(__dirname, '../bulbapedia-scraper.log');
const BATCH_SIZE = 10;
const DELAY_MS = 8000;
const DELAY_VARIANCE = 4000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [15000, 30000, 60000]; // 15s, 30s, 1m

// Game name mappings (same as before)
const GAME_NAME_MAP = {
  'Red': 'red', 'Blue': 'blue', 'Yellow': 'yellow',
  'Gold': 'gold', 'Silver': 'silver', 'Crystal': 'crystal',
  'Ruby': 'ruby', 'Sapphire': 'sapphire', 'Emerald': 'emerald',
  'FireRed': 'firered', 'LeafGreen': 'leafgreen',
  'Fire Red': 'firered', 'Leaf Green': 'leafgreen',
  'Diamond': 'diamond', 'Pearl': 'pearl', 'Platinum': 'platinum',
  'HeartGold': 'heartgold', 'SoulSilver': 'soulsilver',
  'Heart Gold': 'heartgold', 'Soul Silver': 'soulsilver',
  'Black': 'black', 'White': 'white',
  'Black 2': 'black2', 'White 2': 'white2',
  'X': 'x', 'Y': 'y',
  'Omega Ruby': 'omegaruby', 'Alpha Sapphire': 'alphasapphire',
  'Sun': 'sun', 'Moon': 'moon',
  'Ultra Sun': 'ultrasun', 'Ultra Moon': 'ultramoon',
  "Let's Go, Pikachu!": 'letsgopikachu',
  "Let's Go, Eevee!": 'letsgoeevee',
  'Sword': 'sword', 'Shield': 'shield',
  'Brilliant Diamond': 'brilliantdiamond',
  'Shining Pearl': 'shiningpearl',
  'Legends: Arceus': 'legendsarceus',
  'Scarlet': 'scarlet', 'Violet': 'violet'
};

let progress = {
  lastProcessedId: 0,
  lastProcessedName: '',
  totalProcessed: 0,
  totalAdded: 0,
  errors: [],
  timestamp: new Date().toISOString()
};

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

function saveProgress() {
  progress.timestamp = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function log(message, toFileOnly = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
  if (!toFileOnly) {
    console.log(message);
  }
}

const delay = (baseMs = DELAY_MS, variance = DELAY_VARIANCE) => {
  const randomMs = baseMs + (Math.random() * variance * 2) - variance;
  const actualMs = Math.max(3000, Math.floor(randomMs));
  return new Promise(resolve => setTimeout(resolve, actualMs));
};

// Fetch with Selenium
async function fetchWithSelenium(driver, pokemonName, pokemonId, retryCount = 0) {
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&format=json&page=${encodeURIComponent(pokemonName)}_(Pok%C3%A9mon)`;
  
  try {
    log(`  Attempt ${retryCount + 1}/${MAX_RETRIES + 1} for ${pokemonName}...`, true);
    
    await driver.get(url);
    
    // Wait for page to load
    await driver.wait(until.elementLocated(By.tagName('body')), 10000);
    
    // Get page source
    const pageSource = await driver.getPageSource();
    
    // Check if it's a Cloudflare challenge page
    if (pageSource.includes('Just a moment') || pageSource.includes('challenge-platform')) {
      log(`  ⚠️  Cloudflare challenge for ${pokemonName}`, true);
      
      // Wait longer for Cloudflare to maybe pass us through
      if (retryCount < MAX_RETRIES) {
        const waitTime = RETRY_DELAYS[retryCount];
        log(`  ⏳ Waiting ${waitTime/1000}s for Cloudflare to resolve...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return fetchWithSelenium(driver, pokemonName, pokemonId, retryCount + 1);
      }
      
      throw new Error('Cloudflare challenge after multiple attempts');
    }
    
    // Try to get the body text (should be JSON)
    const bodyText = await driver.findElement(By.tagName('body')).getText();
    
    // Parse JSON
    try {
      const data = JSON.parse(bodyText);
      return data.parse?.text?.['*'] || null;
    } catch (e) {
      // Not JSON, might be HTML
      if (bodyText.includes('404')) {
        return null;
      }
      throw new Error('Response is not valid JSON');
    }
    
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const waitTime = RETRY_DELAYS[retryCount];
      log(`  ⚠️  Error for ${pokemonName}: ${error.message}, waiting ${waitTime/1000}s before retry ${retryCount + 2}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchWithSelenium(driver, pokemonName, pokemonId, retryCount + 1);
    }
    throw error;
  }
}

// Copy all the parsing functions from the original scraper
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
        let locationCells = row.querySelectorAll('td');
        
        if (locationCells.length === 0 && i + 1 < rows.length) {
          locationCells = rows[i + 1].querySelectorAll('td');
        }
        
        if (locationCells.length > 0) {
          for (const td of locationCells) {
            let location = td.textContent.trim()
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
              
              const entry = { id: pokemonId, location: cleanLocation };
              if (dexNumber) entry.regionalDex = dexNumber;
              
              gameLocations[game.id].push(entry);
            }
          }
        }
      }
    }
  }
  
  return gameLocations;
}

async function processPokemon(driver, pokemon, gamesData) {
  const { id, name } = pokemon;
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&format=json&page=${encodeURIComponent(name)}_(Pok%C3%A9mon)`;
  
  try {
    process.stdout.write(`  [${id}] ${name.padEnd(20)}... `);
    log(`Processing #${id} ${name}`, true);
    
    const html = await fetchWithSelenium(driver, name, id);
    
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
    
    let added = 0;
    for (const [gameId, locations] of Object.entries(gameLocations)) {
      const game = gamesData.games.find(g => g.id === gameId);
      if (!game) continue;
      
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
      log(`  #${id} ${name}: SUCCESS - Added ${added} entries`, true);
    } else {
      console.log(`already present`);
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
  const visible = args.includes('--visible'); // Run with visible browser
  const rangeArg = args.find(arg => arg.startsWith('--range='));
  
  let startId = 1;
  let endId = 1025;
  
  if (rangeArg) {
    const [start, end] = rangeArg.split('=')[1].split('-').map(Number);
    startId = start || 1;
    endId = end || 1025;
  }
  
  if (fresh || !fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, `=== Bulbapedia Scraper (Selenium) ===\nStarted: ${new Date().toISOString()}\n\n`);
  }
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║    BULBAPEDIA SCRAPER (Selenium - Cloudflare Bypass)     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Configuration:`);
  console.log(`   Range: Pokemon ${startId}-${endId} (${endId - startId + 1} total)`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Browser: ${visible ? 'VISIBLE (you can watch)' : 'HEADLESS'}`);
  console.log(`   Delay: ${DELAY_MS}ms ± ${DELAY_VARIANCE}ms`);
  console.log(`   Retries: Up to ${MAX_RETRIES}`);
  console.log(`   Halt on error: YES\n`);
  
  log(`\n=== Selenium scrape session ===`);
  log(`Range: ${startId}-${endId}`);
  
  // Load data
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
  // Load progress
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
      console.log(`📂 Resuming from #${progress.lastProcessedId} (${progress.lastProcessedName})`);
      console.log(`   Previously: ${progress.totalProcessed} processed, ${progress.totalAdded} added\n`);
    }
  }
  
  // Backup
  if (!dryRun) {
    const backupPath = gamesPath.replace('.json', `.before-selenium-${Date.now()}.json`);
    fs.copyFileSync(gamesPath, backupPath);
    console.log(`📋 Backup: ${backupPath}\n`);
  }
  
  if (replace && !dryRun) {
    console.log('🧹 REPLACE MODE: Clearing...\n');
    gamesData.games.forEach(game => { game.pokemon = []; });
  }
  
  console.log('🌐 Launching Chrome with Selenium...\n');
  
  // Configure Chrome options
  const chromeOptions = new chrome.Options();
  
  if (!visible) {
    chromeOptions.addArguments('--headless=new');
  }
  
  // Make it look more like a real browser
  chromeOptions.addArguments(
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1920,1080',
    '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  
  chromeOptions.excludeSwitches('enable-automation');
  chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();
  
  try {
    console.log('✅ Browser ready. Starting scrape...\n');
    
    const pokemonToProcess = pokemonData.pokemon.filter(p => 
      p.id >= Math.max(startId, progress.lastProcessedId + 1) && 
      p.id <= endId
    );
    
    let sessionAdded = 0;
    let batchCount = 0;
    
    for (const pokemon of pokemonToProcess) {
      const result = await processPokemon(driver, pokemon, gamesData);
      
      // HALT on error
      if (result.error) {
        console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
        console.log(`║          ❌ SCRAPER HALTED ON ERROR ❌                    ║`);
        console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
        console.log(`Pokemon: #${pokemon.id} ${pokemon.name}`);
        console.log(`Error: ${result.errorMessage}`);
        console.log(`\n🔍 Test this URL:`);
        console.log(`${result.url}\n`);
        console.log(`📝 Log: cat bulbapedia-scraper.log`);
        console.log(`\n🔄 Retry:`);
        console.log(`   node scripts/scrape-bulbapedia-selenium.js --range=${pokemon.id}-1025\n`);
        console.log(`💡 Try --visible flag to watch browser in action`);
        
        if (!dryRun) {
          saveProgress();
          fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
          console.log(`\n💾 Progress saved\n`);
        }
        
        await driver.quit();
        process.exit(1);
      }
      
      // Update progress
      progress.lastProcessedId = pokemon.id;
      progress.lastProcessedName = pokemon.name;
      progress.totalProcessed++;
      
      if (result.added > 0) {
        sessionAdded += result.added;
        progress.totalAdded += result.added;
      }
      
      batchCount++;
      
      if (batchCount >= BATCH_SIZE && !dryRun) {
        saveProgress();
        fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
        console.log(`\n  💾 Progress saved (${progress.totalProcessed} processed, ${progress.totalAdded} added)\n`);
        batchCount = 0;
      }
      
      await delay(DELAY_MS);
    }
    
    // Final save
    if (!dryRun) {
      saveProgress();
      for (const game of gamesData.games) {
        game.pokemon.sort((a, b) => a.id - b.id);
      }
      fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
    }
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                ✅ SCRAPE COMPLETE! ✅                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Stats: ${progress.totalProcessed} processed, ${progress.totalAdded} added\n`);
    
  } finally {
    await driver.quit();
    console.log('🌐 Browser closed\n');
  }
}

main().catch(console.error);

