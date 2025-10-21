/**
 * MediaWiki API wrapper for Bulbapedia
 */

const BULBAPEDIA_API = 'https://bulbapedia.bulbagarden.net/w/api.php';
const DELAY_MS = 3000; // 3 seconds between requests to be respectful

let lastRequestTime = 0;

/**
 * Delay to respect rate limiting
 */
async function respectfulDelay() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < DELAY_MS) {
    const waitTime = DELAY_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Fetch a page from Bulbapedia
 * @param {string} pageName - Page name (e.g., "Caterpie_(Pokémon)")
 * @param {number} section - Optional section number
 * @returns {Promise<Object>} Parsed page data
 */
export async function fetchBulbapediaPage(pageName, section = null) {
  await respectfulDelay();
  
  let url = `${BULBAPEDIA_API}?action=parse&format=json&page=${encodeURIComponent(pageName)}`;
  if (section !== null) {
    url += `&section=${section}`;
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BluCatchBot/1.0 (Pokemon Availability Tracker; Educational Project)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Page not found
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API Error: ${data.error.info}`);
    }
    
    return data.parse;
  } catch (error) {
    console.error(`Failed to fetch ${pageName}:`, error.message);
    throw error;
  }
}

/**
 * Get sections for a page
 * @param {string} pageName - Page name
 * @returns {Promise<Array>} Array of sections
 */
export async function getPageSections(pageName) {
  await respectfulDelay();
  
  const url = `${BULBAPEDIA_API}?action=parse&format=json&page=${encodeURIComponent(pageName)}&prop=sections`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BluCatchBot/1.0 (Pokemon Availability Tracker; Educational Project)',
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API Error: ${data.error.info}`);
    }
    
    return data.parse.sections;
  } catch (error) {
    console.error(`Failed to get sections for ${pageName}:`, error.message);
    throw error;
  }
}

