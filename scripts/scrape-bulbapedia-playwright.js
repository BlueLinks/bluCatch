import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { JSDOM } from 'jsdom';

// Use stealth plugin to hide automation
chromium.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same configuration as before
const PROGRESS_FILE = path.join(__dirname, '../.bulbapedia-progress.json');
const LOG_FILE = path.join(__dirname, '../bulbapedia-scraper.log');
const BATCH_SIZE = 10;
const DELAY_MS = 10000; // Slower: 10 seconds base
const DELAY_VARIANCE = 5000; // +/- 5 seconds (5-15s range)
const MAX_RETRIES = 7; // Expand to support long backoff
const RETRY_DELAYS = [10000, 30000, 60000, 300000, 1800000, 3600000, 10800000]; // 10s, 30s, 60s, 5m, 30m, 60m, 180m

// [Include all the same helper functions and GAME_NAME_MAP from before]
// I'll include the essential ones here

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

let progress = { lastProcessedId: 0, lastProcessedName: '', totalProcessed: 0, totalAdded: 0, errors: [], timestamp: new Date().toISOString() };

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

// Randomize user agent - rotate through realistic variations
function getRandomUserAgent() {
  const chromeVersions = ['131.0.0.0', '130.0.0.0', '129.0.0.0', '128.0.0.0', '127.0.0.0'];
  const safariVersions = ['537.36', '537.35', '537.34'];
  const osVersions = ['10_15_7', '10_15_6', '11_0_0', '12_0_0', '13_0_0'];
  
  const chromeVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];
  const safariVersion = safariVersions[Math.floor(Math.random() * safariVersions.length)];
  const osVersion = osVersions[Math.floor(Math.random() * osVersions.length)];
  
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osVersion}) AppleWebKit/${safariVersion} (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${safariVersion}`;
}

// Randomize viewport dimensions
function getRandomViewport() {
  const baseWidths = [1366, 1440, 1536, 1920];
  const baseHeights = [768, 900, 864, 1080];
  
  const baseWidth = baseWidths[Math.floor(Math.random() * baseWidths.length)];
  const baseHeight = baseHeights[Math.floor(Math.random() * baseHeights.length)];
  
  return {
    width: baseWidth + Math.floor(Math.random() * 100),
    height: baseHeight + Math.floor(Math.random() * 50)
  };
}

// Randomize language preferences
function getRandomLanguages() {
  const variants = [
    ['en-GB', 'en-US', 'en'],
    ['en-US', 'en-GB', 'en'],
    ['en-US', 'en'],
    ['en-GB', 'en']
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

// Randomize timezone
function getRandomTimezone() {
  const timezones = [
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Europe/Paris'
  ];
  return timezones[Math.floor(Math.random() * timezones.length)];
}

// Fetch with Playwright - Enhanced Cloudflare handling
async function fetchWithPlaywright(page, pokemonName, pokemonId, retryCount = 0) {
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&format=json&page=${encodeURIComponent(pokemonName)}_(Pok%C3%A9mon)`;
  
  try {
    log(`  Attempt ${retryCount + 1}/${MAX_RETRIES + 1} for ${pokemonName}...`, true);
    
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for Cloudflare background checks to complete
    await page.waitForTimeout(3000);
    
    // Check for Cloudflare verify button challenge
    const cfVerifyButton = await page.$('input[type="button"][value*="Verify"]').catch(() => null);
    if (cfVerifyButton) {
      log(`  🔘 Cloudflare verify button detected, clicking...`, true);
      await cfVerifyButton.click();
      await page.waitForTimeout(5000); // Wait for verification
      log(`  ✅ Clicked verify button`, true);
    }
    
    // Check for Cloudflare checkbox
    const cfCheckbox = await page.$('input[type="checkbox"][id*="cf"]').catch(() => null);
    if (cfCheckbox) {
      log(`  ☑️  Cloudflare checkbox detected, clicking...`, true);
      await cfCheckbox.click();
      await page.waitForTimeout(5000);
      log(`  ✅ Clicked checkbox`, true);
    }
    
    // Check for Cloudflare iframe challenge
    const cfIframe = await page.$('iframe[src*="challenges.cloudflare"]').catch(() => null);
    if (cfIframe) {
      log(`  🔒 Cloudflare iframe challenge detected, waiting...`, true);
      await page.waitForTimeout(10000); // Give it time to resolve
    }
    
    // Get page content after challenge handling
    const content = await page.content();
    
    // Check if still showing challenge
    if (content.includes('Just a moment') || content.includes('challenge-platform') || content.includes('cf-chl')) {
      log(`  ⚠️  Cloudflare challenge still present for ${pokemonName}`, true);
      
      if (retryCount < MAX_RETRIES) {
        const waitTime = RETRY_DELAYS[retryCount];
        log(`  ⏳ Waiting ${waitTime/1000}s for challenge to clear...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return fetchWithPlaywright(page, pokemonName, pokemonId, retryCount + 1);
      }
      
      throw new Error('Cloudflare challenge did not resolve');
    }
    
    // Check response status
    if (response && !response.ok()) {
      const status = response.status();
      
      if (status === 404) {
        return null;
      }
      
      if ((status === 403 || status === 503 || status === 504) && retryCount < MAX_RETRIES) {
        const waitTime = RETRY_DELAYS[retryCount];
        log(`  ⚠️  HTTP ${status}, waiting ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return fetchWithPlaywright(page, pokemonName, pokemonId, retryCount + 1);
      }
      
      throw new Error(`HTTP ${status} after ${retryCount + 1} attempts`);
    }
    
    // Get body text (should be JSON)
    const bodyText = await page.textContent('body');
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(bodyText);
      return data.parse?.text?.['*'] || null;
    } catch (e) {
      log(`  Warning: Response is not JSON for ${pokemonName}`, true);
      return null;
    }
    
  } catch (error) {
    if (retryCount < MAX_RETRIES && !error.message.includes('after') && !error.message.includes('did not resolve')) {
      const waitTime = RETRY_DELAYS[retryCount];
      log(`  ⚠️  Error for ${pokemonName}: ${error.message}, waiting ${waitTime/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchWithPlaywright(page, pokemonName, pokemonId, retryCount + 1);
    }
    throw error;
  }
}

// Copy parsing functions from original scraper
function extractRegionalDexInfo(location) {
  const regionalDexMatch = location.match(/\(?Regional Dex #(\d+)\)?/i);
  if (regionalDexMatch) {
    let cleanLocation = location.replace(/\(?Regional Dex #\d+\)?/gi, '').replace(/\s+/g, ' ').trim();
    if (!cleanLocation || cleanLocation.length < 3) cleanLocation = 'Available in game';
    return { cleanLocation, regionalDex: parseInt(regionalDexMatch[1]) };
  }
  return { cleanLocation: location, regionalDex: null };
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
          if (numMatch) return parseInt(numMatch[1]);
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
  
  if (!locationHeader) return gameLocations;
  
  let currentElement = locationHeader.nextElementSibling;
  const tables = [];
  
  while (currentElement) {
    if (currentElement.tagName === 'TABLE') tables.push(currentElement);
    if (currentElement.tagName === 'H2' || (currentElement.tagName === 'H3' && !currentElement.textContent.includes('side games'))) break;
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
            let location = td.textContent.trim().replace(/\s+/g, ' ').replace(/\[.*?\]/g, '').replace(/\n/g, ' ').trim();
            
            if (!location || location.toLowerCase().includes('unavailable') || location.toLowerCase().includes('unobtainable') || location.toLowerCase().includes('none') || location.length < 3) continue;
            if (location.length > 200) location = location.substring(0, 197) + '...';
            
            for (const game of gamesInRow) {
              if (!gameLocations[game.id]) gameLocations[game.id] = [];
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

async function processPokemon(page, pokemon, gamesData) {
  const { id, name } = pokemon;
  const url = `https://bulbapedia.bulbagarden.net/w/api.php?action=parse&format=json&page=${encodeURIComponent(name)}_(Pok%C3%A9mon)`;
  
  try {
    process.stdout.write(`  [${id}] ${name.padEnd(20)}... `);
    log(`Processing #${id} ${name}`, true);
    
    const html = await fetchWithPlaywright(page, name, id);
    
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
  const visible = args.includes('--visible');
  const rangeArg = args.find(arg => arg.startsWith('--range='));
  
  let startId = 1, endId = 1025;
  if (rangeArg) {
    const [start, end] = rangeArg.split('=')[1].split('-').map(Number);
    startId = start || 1;
    endId = end || 1025;
  }
  
  if (fresh || !fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, `=== Playwright Scraper ===\nStarted: ${new Date().toISOString()}\n\n`);
  }
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  BULBAPEDIA SCRAPER (Playwright - Cloudflare Bypass)     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`📊 Config: ${startId}-${endId} | ${visible ? 'VISIBLE' : 'HEADLESS'} | Delay: 5-15s\n`);
  
  log(`\n=== Playwright session ===`);
  log(`Range: ${startId}-${endId}`);
  
  const pokemonPath = path.join(__dirname, '../public/data/pokemon.json');
  const gamesPath = path.join(__dirname, '../public/data/games.json');
  
  const pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
  const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));
  
  if (!dryRun && !fresh) {
    loadProgress();
    if (progress.lastProcessedId > 0) {
      console.log(`📂 Resuming from #${progress.lastProcessedId}\n`);
    }
  }
  
  if (!dryRun) {
    const backupPath = gamesPath.replace('.json', `.before-playwright-${Date.now()}.json`);
    fs.copyFileSync(gamesPath, backupPath);
    console.log(`📋 Backup: ${backupPath}\n`);
  }
  
  console.log('🌐 Launching Playwright with randomized stealth fingerprint...\n');
  
  // Get randomized fingerprint elements
  const userAgent = getRandomUserAgent();
  const viewport = getRandomViewport();
  const languages = getRandomLanguages();
  const timezone = getRandomTimezone();
  
  console.log(`   UA: ${userAgent.substring(0, 50)}...`);
  console.log(`   Viewport: ${viewport.width}x${viewport.height}`);
  console.log(`   Languages: ${languages.join(', ')}`);
  console.log(`   Timezone: ${timezone}\n`);
  
  // Launch with stealth args
  const browser = await chromium.launch({
    headless: !visible && 'new',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--exclude-switches=enable-automation',
      '--disable-automation',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--start-maximized',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  // Create realistic browser context with randomized fingerprint
  const context = await browser.newContext({
    // RANDOMIZED user agent (changes each run)
    userAgent: userAgent,
    
    // RANDOMIZED viewport (looks more human)
    viewport: viewport,
    
    // RANDOMIZED locale settings
    locale: languages[0].split('-')[0] + '-' + languages[0].split('-')[1],
    timezoneId: timezone,
    
    // Realistic browser settings
    colorScheme: 'light',
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    
    // Add realistic headers that browsers send (RANDOMIZED language)
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': languages.map((l, i) => i === 0 ? l : `${l};q=${0.9 - i * 0.1}`).join(','),
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': `"Chromium";v="${userAgent.match(/Chrome\/(\d+)/)[1]}", "Google Chrome";v="${userAgent.match(/Chrome\/(\d+)/)[1]}", "Not=A?Brand";v="24"`,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"'
    }
  });
  
  // Comprehensive stealth script - override all automation signals
  // Generate random values for this session
  const randomCores = 4 + Math.floor(Math.random() * 9); // 4-12 cores
  const randomMemory = [4, 8, 16][Math.floor(Math.random() * 3)]; // 4, 8, or 16 GB
  const randomScreenWidth = [1366, 1440, 1536, 1920][Math.floor(Math.random() * 4)];
  const randomScreenHeight = [768, 900, 864, 1080][Math.floor(Math.random() * 4)];
  
  await context.addInitScript((langs, cores, memory, screenW, screenH) => {
    // Hide webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });
    
    // Add Chrome object
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };
    
    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', description: 'Portable Document Format', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', description: 'Native Client Executable', filename: 'internal-nacl-plugin' }
      ]
    });
    
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
    
    // Add missing properties (RANDOMIZED per session)
    Object.defineProperty(navigator, 'languages', {
      get: () => langs
    });
    
    Object.defineProperty(navigator, 'platform', {
      get: () => 'MacIntel'
    });
    
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => cores
    });
    
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => memory
    });
    
    // Override automation detection
    delete window.navigator.__proto__.webdriver;
    
    // Add realistic screen properties (RANDOMIZED)
    Object.defineProperty(screen, 'width', { get: () => screenW });
    Object.defineProperty(screen, 'height', { get: () => screenH });
    Object.defineProperty(screen, 'availWidth', { get: () => screenW });
    Object.defineProperty(screen, 'availHeight', { get: () => screenH - 25 });
  }, languages, randomCores, randomMemory, randomScreenWidth, randomScreenHeight);
  
  const page = await context.newPage();
  
  console.log('✅ Browser ready\n');
  
  const pokemonToProcess = pokemonData.pokemon.filter(p => 
    p.id >= Math.max(startId, progress.lastProcessedId + 1) && p.id <= endId
  );
  
  let sessionAdded = 0, batchCount = 0;
  
  try {
    for (const pokemon of pokemonToProcess) {
      const result = await processPokemon(page, pokemon, gamesData);
      
      if (result.error) {
        console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
        console.log(`║          ❌ SCRAPER HALTED ON ERROR ❌                    ║`);
        console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
        console.log(`Pokemon: #${pokemon.id} ${pokemon.name}`);
        console.log(`Error: ${result.errorMessage}\n`);
        console.log(`🔍 Test URL:\n${result.url}\n`);
        console.log(`📝 Log: cat bulbapedia-scraper.log\n`);
        console.log(`🔄 Retry:\n   node scripts/scrape-bulbapedia-playwright.js --range=${pokemon.id}-1025\n`);
        
        if (!dryRun) {
          saveProgress();
          fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
          console.log(`💾 Saved\n`);
        }
        
        await browser.close();
        process.exit(1);
      }
      
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
    
    if (!dryRun) {
      saveProgress();
      for (const game of gamesData.games) {
        game.pokemon.sort((a, b) => a.id - b.id);
      }
      fs.writeFileSync(gamesPath, JSON.stringify(gamesData, null, 2));
    }
    
    console.log('\n✅ COMPLETE! Processed: ' + progress.totalProcessed + ', Added: ' + progress.totalAdded + '\n');
    
  } finally {
    await browser.close();
    console.log('🌐 Browser closed\n');
  }
}

main().catch(console.error);

