const StorageHelper = {
    // Safari localStorage compatibility check
    isLocalStorageAvailable() {
        try {
            const testKey = '__safari_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('localStorage not available in Safari private mode or other restrictions');
            return false;
        }
    },

    // Safari-safe localStorage with fallback
    safariSafeSetItem(key, value) {
        if (!this.isLocalStorageAvailable()) {
            console.warn('Using sessionStorage fallback for Safari private mode');
            try {
                sessionStorage.setItem(key, value);
                return true;
            } catch (e) {
                console.error('Both localStorage and sessionStorage failed:', e);
                return false;
            }
        }
        
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn('localStorage setItem failed, trying sessionStorage:', e);
            try {
                sessionStorage.setItem(key, value);
                return true;
            } catch (e2) {
                console.error('Both storage methods failed:', e2);
                return false;
            }
        }
    },

    safariSafeGetItem(key) {
        try {
            const value = localStorage.getItem(key);
            if (value !== null) return value;
        } catch (e) {
            console.warn('localStorage getItem failed, trying sessionStorage:', e);
        }
        
        try {
            return sessionStorage.getItem(key);
        } catch (e) {
            console.warn('Both storage methods failed for getItem:', e);
            return null;
        }
    },

    safariSafeRemoveItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('localStorage removeItem failed:', e);
        }
        
        try {
            sessionStorage.removeItem(key);
        } catch (e) {
            console.warn('sessionStorage removeItem failed:', e);
        }
    },

    // API key management
    saveApiKey(apiKey) {
        try {
            if (apiKey) {
                const success = this.safariSafeSetItem(CONFIG.STORAGE_KEYS.API_KEY, apiKey);
                if (success) {
                    console.log('API key saved to storage');
                } else {
                    console.warn('Failed to save API key to any storage method');
                }
            } else {
                this.clearApiKey();
            }
        } catch (error) {
            console.warn('Could not save API key:', error);
        }
    },

    loadApiKey() {
        try {
            return this.safariSafeGetItem(CONFIG.STORAGE_KEYS.API_KEY);
        } catch (error) {
            console.warn('Could not load API key from storage:', error);
            return null;
        }
    },

    clearApiKey() {
        try {
            this.safariSafeRemoveItem(CONFIG.STORAGE_KEYS.API_KEY);
        } catch (error) {
            console.warn('Could not clear API key from storage:', error);
        }
    },

    // Spreadsheet ID management
    saveSpreadsheetId(spreadsheetId) {
        try {
            const success = this.safariSafeSetItem(CONFIG.STORAGE_KEYS.SPREADSHEET_ID, spreadsheetId);
            if (success) {
                console.log('Spreadsheet ID saved to storage');
            }
        } catch (error) {
            console.warn('Could not save spreadsheet ID:', error);
        }
    },
    
    loadSpreadsheetId() {
        try {
            return this.safariSafeGetItem(CONFIG.STORAGE_KEYS.SPREADSHEET_ID);
        } catch (error) {
            console.warn('Could not load spreadsheet ID:', error);
            return null;
        }
    },

    clearSpreadsheetId() {
        try {
            this.safariSafeRemoveItem(CONFIG.STORAGE_KEYS.SPREADSHEET_ID);
        } catch (error) {
            console.warn('Could not clear spreadsheet ID:', error);
        }
    },

    // Spreadsheet name management
    saveSpreadsheetName(spreadsheetName) {
        try {
            this.safariSafeSetItem(CONFIG.STORAGE_KEYS.SPREADSHEET_NAME, spreadsheetName);
        } catch (error) {
            console.warn('Could not save spreadsheet name:', error);
        }
    },
    
    loadSpreadsheetName() {
        try {
            return this.safariSafeGetItem(CONFIG.STORAGE_KEYS.SPREADSHEET_NAME);
        } catch (error) {
            console.warn('Could not load spreadsheet name:', error);
            return null;
        }
    },

    // Get parameters from URL (Safari-compatible)
    getApiKeyFromUrl() {
        try {
            // Safari sometimes has issues with URLSearchParams
            if (typeof URLSearchParams !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get('api-key');
            } else {
                // Fallback for older Safari versions
                return this.getUrlParameterFallback('api-key');
            }
        } catch (e) {
            console.warn('URLSearchParams failed, using fallback:', e);
            return this.getUrlParameterFallback('api-key');
        }
    },
    
    getSpreadsheetIdFromUrl() {
        try {
            if (typeof URLSearchParams !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get('sheet') || urlParams.get('spreadsheet');
            } else {
                return this.getUrlParameterFallback('sheet') || this.getUrlParameterFallback('spreadsheet');
            }
        } catch (e) {
            console.warn('URLSearchParams failed, using fallback:', e);
            return this.getUrlParameterFallback('sheet') || this.getUrlParameterFallback('spreadsheet');
        }
    },

    // Fallback URL parameter parsing for Safari compatibility
    getUrlParameterFallback(name) {
        try {
            const urlParams = window.location.search.substring(1).split('&');
            for (let i = 0; i < urlParams.length; i++) {
                const param = urlParams[i].split('=');
                if (param[0] === name) {
                    return decodeURIComponent(param[1] || '');
                }
            }
            return null;
        } catch (e) {
            console.error('URL parameter fallback failed:', e);
            return null;
        }
    },

    // Migration helpers - get existing localStorage data
    getExistingActivities() {
        try {
            const activities = this.safariSafeGetItem(CONFIG.STORAGE_KEYS.ACTIVITIES);
            return activities ? JSON.parse(activities) : null;
        } catch (error) {
            console.warn('Could not load existing activities:', error);
            return null;
        }
    },

    getExistingHistory() {
        try {
            const history = this.safariSafeGetItem(CONFIG.STORAGE_KEYS.HISTORY);
            return history ? JSON.parse(history) : null;
        } catch (error) {
            console.warn('Could not load existing history:', error);
            return null;
        }
    },

    getExistingCurrentIndex() {
        try {
            const index = this.safariSafeGetItem(CONFIG.STORAGE_KEYS.CURRENT_INDEX);
            return index !== null ? parseInt(index) || 0 : null;
        } catch (error) {
            console.warn('Could not load existing current index:', error);
            return null;
        }
    },

    // Clean up old localStorage data after successful migration
    clearMigratedData() {
        try {
            this.safariSafeRemoveItem(CONFIG.STORAGE_KEYS.ACTIVITIES);
            this.safariSafeRemoveItem(CONFIG.STORAGE_KEYS.HISTORY);
            this.safariSafeRemoveItem(CONFIG.STORAGE_KEYS.CURRENT_INDEX);
            console.log('Cleared migrated storage data');
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
            const backupData = JSON.stringify({
                data: data,
                timestamp: new Date().toISOString()
            });
            this.safariSafeSetItem(backupKey, backupData);
        } catch (error) {
            console.warn(`Could not save backup for ${key}:`, error);
        }
    },

    loadBackup(key) {
        try {
            const backupKey = `backup_${key}`;
            const backup = this.safariSafeGetItem(backupKey);
            return backup ? JSON.parse(backup) : null;
        } catch (error) {
            console.warn(`Could not load backup for ${key}:`, error);
            return null;
        }
    },

    clearBackup(key) {
        try {
            const backupKey = `backup_${key}`;
            this.safariSafeRemoveItem(backupKey);
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