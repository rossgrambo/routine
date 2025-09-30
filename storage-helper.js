const StorageHelper = {
    // API key management
    saveApiKey(apiKey) {
        try {
            if (apiKey) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, apiKey);
                console.log('API key saved to localStorage');
            } else {
                this.clearApiKey();
            }
        } catch (error) {
            console.warn('Could not save API key to local storage:', error);
        }
    },

    loadApiKey() {
        try {
            return localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
        } catch (error) {
            console.warn('Could not load API key from local storage:', error);
            return null;
        }
    },

    clearApiKey() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.API_KEY);
        } catch (error) {
            console.warn('Could not clear API key from local storage:', error);
        }
    },

    // Spreadsheet ID management
    saveSpreadsheetId(spreadsheetId) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.SPREADSHEET_ID, spreadsheetId);
            console.log('Spreadsheet ID saved to localStorage');
        } catch (error) {
            console.warn('Could not save spreadsheet ID:', error);
        }
    },
    
    loadSpreadsheetId() {
        try {
            return localStorage.getItem(CONFIG.STORAGE_KEYS.SPREADSHEET_ID);
        } catch (error) {
            console.warn('Could not load spreadsheet ID:', error);
            return null;
        }
    },

    clearSpreadsheetId() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.SPREADSHEET_ID);
        } catch (error) {
            console.warn('Could not clear spreadsheet ID:', error);
        }
    },

    // Spreadsheet name management
    saveSpreadsheetName(spreadsheetName) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.SPREADSHEET_NAME, spreadsheetName);
        } catch (error) {
            console.warn('Could not save spreadsheet name:', error);
        }
    },
    
    loadSpreadsheetName() {
        try {
            return localStorage.getItem(CONFIG.STORAGE_KEYS.SPREADSHEET_NAME);
        } catch (error) {
            console.warn('Could not load spreadsheet name:', error);
            return null;
        }
    },

    // Get parameters from URL
    getApiKeyFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('api-key');
    },
    
    getSpreadsheetIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('sheet') || urlParams.get('spreadsheet');
    },

    // Migration helpers - get existing localStorage data
    getExistingActivities() {
        try {
            const activities = localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVITIES);
            return activities ? JSON.parse(activities) : null;
        } catch (error) {
            console.warn('Could not load existing activities:', error);
            return null;
        }
    },

    getExistingHistory() {
        try {
            const history = localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY);
            return history ? JSON.parse(history) : null;
        } catch (error) {
            console.warn('Could not load existing history:', error);
            return null;
        }
    },

    getExistingCurrentIndex() {
        try {
            const index = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_INDEX);
            return index !== null ? parseInt(index) || 0 : null;
        } catch (error) {
            console.warn('Could not load existing current index:', error);
            return null;
        }
    },

    // Clean up old localStorage data after successful migration
    clearMigratedData() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVITIES);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.HISTORY);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_INDEX);
            console.log('Cleared migrated localStorage data');
        } catch (error) {
            console.warn('Could not clear migrated data:', error);
        }
    },

    // Check if we have existing data to migrate
    hasExistingData() {
        return this.getExistingActivities() !== null || 
               this.getExistingHistory() !== null || 
               this.getExistingCurrentIndex() !== null;
    },

    // Backup helpers for offline functionality
    saveBackup(key, data) {
        try {
            const backupKey = `backup_${key}`;
            localStorage.setItem(backupKey, JSON.stringify({
                data: data,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.warn(`Could not save backup for ${key}:`, error);
        }
    },

    loadBackup(key) {
        try {
            const backupKey = `backup_${key}`;
            const backup = localStorage.getItem(backupKey);
            return backup ? JSON.parse(backup) : null;
        } catch (error) {
            console.warn(`Could not load backup for ${key}:`, error);
            return null;
        }
    },

    clearBackup(key) {
        try {
            const backupKey = `backup_${key}`;
            localStorage.removeItem(backupKey);
        } catch (error) {
            console.warn(`Could not clear backup for ${key}:`, error);
        }
    },

    // Connection status helpers
    isOnline() {
        return navigator.onLine;
    },

    // Debug helper
    debugStorage() {
        console.log('StorageHelper Debug Info:');
        console.log('API Key:', this.loadApiKey() ? 'Present' : 'Missing');
        console.log('Spreadsheet ID:', this.loadSpreadsheetId());
        console.log('Spreadsheet Name:', this.loadSpreadsheetName());
        console.log('Has existing data:', this.hasExistingData());
        console.log('Online status:', this.isOnline());
    }
};