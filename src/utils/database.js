// API base URL (can be configured via environment variable)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

let initPromise = null;

/**
 * Initialize the database connection (now just checks API health)
 * @returns {Promise<boolean>} Promise that resolves when API is available
 */
export async function initDatabase() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`API health check failed: ${response.statusText}`);
      }
      console.log('✅ API connection established');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to API:', error);
      throw error;
    }
  })();
  
  return initPromise;
}

/**
 * Execute a query via the API
 * @param {string} endpoint - API endpoint path
 * @param {Object} params - Query parameters
 * @returns {Promise<any>} API response data
 */
export async function query(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Backwards compatibility exports
export function getDatabase() {
  return { query };
}

export function closeDatabase() {
  // No-op for API-based approach
}
