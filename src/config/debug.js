// src/config/debug.js - Centralized debug configuration
const DEBUG_CONFIG = {
    // Global debug mode - set to false for production
    ENABLED: process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG === 'true',
    
    // Specific debug categories
    LEADERBOARD: true,
    DATABASE: true,
    SAVE_ATTEMPT: true,
    PERIOD_FORMAT: true,
    DEDUPLICATION: false, // Very verbose, only enable when needed
    
    // Helper function to check if debug is enabled for a category
    isEnabled(category = null) {
      if (!this.ENABLED) return false;
      return category ? this[category] : true;
    },
    
    // Centralized logging function
    log(category, ...args) {
      if (this.isEnabled(category)) {
        console.log(`[${category.toUpperCase()}]`, ...args);
      }
    },
    
    warn(category, ...args) {
      if (this.isEnabled(category)) {
        console.warn(`[${category.toUpperCase()}]`, ...args);
      }
    },
    
    error(category, ...args) {
      if (this.isEnabled(category)) {
        console.error(`[${category.toUpperCase()}]`, ...args);
      }
    }
  };
  
  export default DEBUG_CONFIG;