// ===================================
// VEIL CONFIGURATION
// ===================================

// Auto-detect environment
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// API Configuration
export const config = {
  // Backend HTTP API
  HTTP_API: isProduction 
    ? (window.VEIL_BACKEND_URL || 'https://your-backend.up.railway.app')
    : 'http://localhost:3000',
  
  // WebSocket URL
  WS_URL: isProduction
    ? (window.VEIL_WS_URL || 'wss://your-backend.up.railway.app')
    : 'ws://localhost:3001',
  
  // Environment
  IS_PRODUCTION: isProduction,
  
  // Debug mode
  DEBUG: !isProduction
};

// Log configuration on load
if (config.DEBUG) {
  console.log('🔧 Veil Configuration:', config);
}

// Allow overriding via window object (for Vercel env vars)
if (typeof window !== 'undefined') {
  window.VEIL_CONFIG = config;
}
