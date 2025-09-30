class SpreadsheetManager {
    constructor() {
        this.spreadsheetId = null;
        this.spreadsheetName = null;
        this.isInitialized = false;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.autoSyncInterval = null;
    }

    async initialize() {
        try {
            console.log('Initializing Spreadsheet Manager...');
            
            // Ensure Google Sheets API is initialized
            if (!sheetsAPI.isInitialized) {
                throw new Error('Google Sheets API not initialized');
            }

            // Set up or find spreadsheet
            this.spreadsheetId = await this.setupSpreadsheet();
            
            if (this.spreadsheetId) {
                CONFIG.SPREADSHEET_ID = this.spreadsheetId;
                this.isInitialized = true;
                console.log('Spreadsheet Manager initialized successfully');
                
                // Start auto-sync if configured
                this.startAutoSync();
                
                return true;
            } else {
                throw new Error('Could not set up spreadsheet');
            }
            
        } catch (error) {
            console.error('Error initializing Spreadsheet Manager:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    async setupSpreadsheet() {
        try {
            // Check if we have a spreadsheet ID from URL or storage
            let spreadsheetId = StorageHelper.getSpreadsheetIdFromUrl() || StorageHelper.loadSpreadsheetId();
            
            if (spreadsheetId) {
                // Verify the spreadsheet exists and we can access it
                try {
                    const spreadsheet = await sheetsAPI.getSpreadsheet(spreadsheetId);
                    console.log('Using existing spreadsheet:', spreadsheet.properties.title);
                    this.spreadsheetName = spreadsheet.properties.title;
                    StorageHelper.saveSpreadsheetId(spreadsheetId);
                    StorageHelper.saveSpreadsheetName(this.spreadsheetName);
                    
                    // Ensure all required sheets exist
                    await this.ensureRequiredSheets(spreadsheetId, spreadsheet);
                    
                    return spreadsheetId;
                } catch (error) {
                    console.warn('Could not access specified spreadsheet, will search/create new one:', error);
                    spreadsheetId = null;
                }
            }
            
            // Search for existing spreadsheet by name
            const existingSheets = await sheetsAPI.findSpreadsheetByName(CONFIG.DEFAULT_SPREADSHEET_NAME);
            
            if (existingSheets.length > 0) {
                // Use the first found spreadsheet (most recent)
                spreadsheetId = existingSheets[0].id;
                this.spreadsheetName = existingSheets[0].name;
                console.log('Found existing spreadsheet:', this.spreadsheetName);
                
                // Verify and setup sheets
                const spreadsheet = await sheetsAPI.getSpreadsheet(spreadsheetId);
                await this.ensureRequiredSheets(spreadsheetId, spreadsheet);
                
                StorageHelper.saveSpreadsheetId(spreadsheetId);
                StorageHelper.saveSpreadsheetName(this.spreadsheetName);
                return spreadsheetId;
            }
            
            // Create new spreadsheet
            console.log('Creating new spreadsheet...');
            const newSpreadsheet = await sheetsAPI.createSpreadsheet(CONFIG.DEFAULT_SPREADSHEET_NAME);
            spreadsheetId = newSpreadsheet.spreadsheetId;
            this.spreadsheetName = newSpreadsheet.properties.title;
            
            // Initialize with required sheets and data
            await this.initializeNewSpreadsheet(spreadsheetId);
            
            StorageHelper.saveSpreadsheetId(spreadsheetId);
            StorageHelper.saveSpreadsheetName(this.spreadsheetName);
            
            console.log('Created and initialized new spreadsheet:', spreadsheetId);
            return spreadsheetId;
            
        } catch (error) {
            console.error('Error setting up spreadsheet:', error);
            throw error;
        }
    }

    async ensureRequiredSheets(spreadsheetId, spreadsheet) {
        try {
            const existingSheets = spreadsheet.sheets.map(sheet => sheet.properties.title);
            const requiredSheets = Object.values(CONFIG.SHEETS);
            
            // Find missing sheets
            const missingSheets = requiredSheets.filter(sheetName => !existingSheets.includes(sheetName));
            
            if (missingSheets.length > 0) {
                console.log('Adding missing sheets:', missingSheets);
                
                // Create missing sheets
                for (const sheetName of missingSheets) {
                    await sheetsAPI.addSheet(spreadsheetId, sheetName);
                    
                    // Add headers for the new sheet
                    if (CONFIG.DUMMY_DATA[this.getSheetKey(sheetName)]) {
                        const headers = CONFIG.DUMMY_DATA[this.getSheetKey(sheetName)][0];
                        await sheetsAPI.updateValues(spreadsheetId, `${sheetName}!A1`, [headers]);
                    }
                }
            }
            
            console.log('All required sheets are present');
            
        } catch (error) {
            console.error('Error ensuring required sheets:', error);
            throw error;
        }
    }

    async initializeNewSpreadsheet(spreadsheetId) {
        try {
            // Create additional sheets (first sheet already exists)
            const sheetNames = Object.values(CONFIG.SHEETS);
            const requests = [];
            
            // Add sheets for each data type (skip the first one as it already exists)
            for (let i = 1; i < sheetNames.length; i++) {
                requests.push({
                    addSheet: {
                        properties: {
                            title: sheetNames[i]
                        }
                    }
                });
            }
            
            // Execute sheet creation
            if (requests.length > 0) {
                await sheetsAPI.batchUpdate(spreadsheetId, requests);
            }
            
            // Rename the first sheet to match our naming convention
            const firstSheetName = sheetNames[0];
            await sheetsAPI.batchUpdate(spreadsheetId, [{
                updateSheetProperties: {
                    properties: {
                        sheetId: 0,
                        title: firstSheetName
                    },
                    fields: 'title'
                }
            }]);
            
            // Populate each sheet with initial data
            await this.populateWithInitialData(spreadsheetId);
            
            // Migrate existing localStorage data if available
            await this.migrateExistingData(spreadsheetId);
            
            console.log('Spreadsheet initialized with data');
            
        } catch (error) {
            console.error('Error initializing new spreadsheet:', error);
            throw error;
        }
    }

    async populateWithInitialData(spreadsheetId) {
        try {
            const updateData = [];
            
            for (const [key, sheetName] of Object.entries(CONFIG.SHEETS)) {
                if (CONFIG.DUMMY_DATA[key]) {
                    updateData.push({
                        range: `${sheetName}!A1`,
                        values: CONFIG.DUMMY_DATA[key]
                    });
                }
            }
            
            if (updateData.length > 0) {
                await sheetsAPI.batchUpdateValues(spreadsheetId, updateData);
                console.log('Initial data populated');
            }
            
        } catch (error) {
            console.error('Error populating initial data:', error);
            throw error;
        }
    }

    async migrateExistingData(spreadsheetId) {
        try {
            if (!StorageHelper.hasExistingData()) {
                console.log('No existing data to migrate');
                return;
            }
            
            console.log('Migrating existing localStorage data...');
            
            // Migrate activities
            const existingActivities = StorageHelper.getExistingActivities();
            if (existingActivities && existingActivities.length > 0) {
                await this.saveActivities(existingActivities);
                console.log(`Migrated ${existingActivities.length} activities`);
            }
            
            // Migrate history
            const existingHistory = StorageHelper.getExistingHistory();
            if (existingHistory && existingHistory.length > 0) {
                await this.saveHistory(existingHistory);
                console.log(`Migrated ${existingHistory.length} history entries`);
            }
            
            // Migrate current index
            const existingIndex = StorageHelper.getExistingCurrentIndex();
            if (existingIndex !== null) {
                await this.saveCurrentActivityIndex(existingIndex);
                console.log(`Migrated current activity index: ${existingIndex}`);
            }
            
            // Clear migrated data
            StorageHelper.clearMigratedData();
            console.log('Data migration completed successfully');
            
        } catch (error) {
            console.error('Error migrating existing data:', error);
            // Don't throw here - migration failure shouldn't prevent app from working
        }
    }

    // Data operations
    async loadActivities() {
        try {
            if (!this.isInitialized) {
                throw new Error('SpreadsheetManager not initialized');
            }
            
            const values = await sheetsAPI.getValues(this.spreadsheetId, `${CONFIG.SHEETS.ACTIVITIES}!A:G`);
            
            if (values.length <= 1) {
                console.log('No activities data found');
                return [];
            }
            
            // Skip header row and convert to activity objects
            const activities = values.slice(1).map((row, index) => {
                return {
                    id: row[0] || (Date.now() + index),
                    name: row[1] || `Activity ${index + 1}`,
                    days: row[2] ? row[2].split(',') : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                    time: row[3] || '',
                    locked: row[4] === 'TRUE',
                    created: row[5] || new Date().toISOString().split('T')[0],
                    modified: row[6] || new Date().toISOString().split('T')[0]
                };
            });
            
            // Backup to localStorage
            StorageHelper.saveBackup('activities', activities);
            
            return activities;
            
        } catch (error) {
            console.error('Error loading activities:', error);
            
            // Try loading from backup
            const backup = StorageHelper.loadBackup('activities');
            if (backup) {
                console.log('Using backup activities data');
                return backup.data;
            }
            
            throw error;
        }
    }

    async saveActivities(activities) {
        try {
            if (!this.isInitialized) {
                throw new Error('SpreadsheetManager not initialized');
            }
            
            // Convert activities to sheet format
            const values = [CONFIG.DUMMY_DATA.ACTIVITIES[0]]; // Header row
            
            activities.forEach(activity => {
                values.push([
                    activity.id.toString(),
                    activity.name,
                    Array.isArray(activity.days) ? activity.days.join(',') : activity.days,
                    activity.time || '',
                    activity.locked ? 'TRUE' : 'FALSE',
                    activity.created || new Date().toISOString().split('T')[0],
                    new Date().toISOString().split('T')[0] // Modified timestamp
                ]);
            });
            
            // Clear existing data and write new data
            await sheetsAPI.clearValues(this.spreadsheetId, `${CONFIG.SHEETS.ACTIVITIES}!A:G`);
            await sheetsAPI.updateValues(this.spreadsheetId, `${CONFIG.SHEETS.ACTIVITIES}!A1`, values);
            
            // Backup to localStorage
            StorageHelper.saveBackup('activities', activities);
            
            console.log(`Saved ${activities.length} activities to spreadsheet`);
            
        } catch (error) {
            console.error('Error saving activities:', error);
            
            // Still save backup even if sync fails
            StorageHelper.saveBackup('activities', activities);
            
            throw error;
        }
    }

    async loadHistory() {
        try {
            if (!this.isInitialized) {
                throw new Error('SpreadsheetManager not initialized');
            }
            
            const values = await sheetsAPI.getValues(this.spreadsheetId, `${CONFIG.SHEETS.HISTORY}!A:E`);
            
            if (values.length <= 1) {
                console.log('No history data found');
                return [];
            }
            
            // Skip header row and convert to history objects
            const history = values.slice(1).map((row, index) => {
                return {
                    id: row[0] || (Date.now() + index),
                    activityName: row[1] || 'Unknown Activity',
                    timestamp: row[2] || new Date().toISOString(),
                    skipped: row[3] === 'TRUE',
                    created: row[4] || new Date().toISOString()
                };
            });
            
            // Sort by timestamp descending (newest first)
            history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Backup to localStorage
            StorageHelper.saveBackup('history', history);
            
            return history;
            
        } catch (error) {
            console.error('Error loading history:', error);
            
            // Try loading from backup
            const backup = StorageHelper.loadBackup('history');
            if (backup) {
                console.log('Using backup history data');
                return backup.data;
            }
            
            throw error;
        }
    }

    async saveHistory(history) {
        try {
            if (!this.isInitialized) {
                throw new Error('SpreadsheetManager not initialized');
            }
            
            // Convert history to sheet format
            const values = [CONFIG.DUMMY_DATA.HISTORY[0]]; // Header row
            
            // Sort by timestamp descending before saving
            const sortedHistory = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            sortedHistory.forEach(entry => {
                values.push([
                    entry.id.toString(),
                    entry.activityName,
                    entry.timestamp,
                    entry.skipped ? 'TRUE' : 'FALSE',
                    entry.created || new Date().toISOString()
                ]);
            });
            
            // Clear existing data and write new data
            await sheetsAPI.clearValues(this.spreadsheetId, `${CONFIG.SHEETS.HISTORY}!A:E`);
            await sheetsAPI.updateValues(this.spreadsheetId, `${CONFIG.SHEETS.HISTORY}!A1`, values);
            
            // Backup to localStorage
            StorageHelper.saveBackup('history', history);
            
            console.log(`Saved ${history.length} history entries to spreadsheet`);
            
        } catch (error) {
            console.error('Error saving history:', error);
            
            // Still save backup even if sync fails
            StorageHelper.saveBackup('history', history);
            
            throw error;
        }
    }

    async loadConfig() {
        try {
            if (!this.isInitialized) {
                throw new Error('SpreadsheetManager not initialized');
            }
            
            const values = await sheetsAPI.getValues(this.spreadsheetId, `${CONFIG.SHEETS.CONFIG}!A:C`);
            
            if (values.length <= 1) {
                console.log('No config data found');
                return {};
            }
            
            // Convert to config object
            const config = {};
            values.slice(1).forEach(row => {
                if (row[0]) {
                    config[row[0]] = row[1] || '';
                }
            });
            
            return config;
            
        } catch (error) {
            console.error('Error loading config:', error);
            return {};
        }
    }

    async saveCurrentActivityIndex(index) {
        try {
            await this.saveConfigValue('current_activity_index', index.toString());
        } catch (error) {
            console.error('Error saving current activity index:', error);
            throw error;
        }
    }

    async loadCurrentActivityIndex() {
        try {
            const config = await this.loadConfig();
            const index = parseInt(config.current_activity_index);
            return isNaN(index) ? 0 : index;
        } catch (error) {
            console.error('Error loading current activity index:', error);
            return 0;
        }
    }

    async saveConfigValue(key, value) {
        try {
            if (!this.isInitialized) {
                throw new Error('SpreadsheetManager not initialized');
            }
            
            // Load existing config
            const values = await sheetsAPI.getValues(this.spreadsheetId, `${CONFIG.SHEETS.CONFIG}!A:C`);
            
            // Find existing key or add new one
            let updated = false;
            const newValues = values.map(row => {
                if (row[0] === key) {
                    updated = true;
                    return [key, value, new Date().toISOString().split('T')[0]];
                }
                return row;
            });
            
            // Add new key if not found
            if (!updated) {
                newValues.push([key, value, new Date().toISOString().split('T')[0]]);
            }
            
            // Update the sheet
            await sheetsAPI.clearValues(this.spreadsheetId, `${CONFIG.SHEETS.CONFIG}!A:C`);
            await sheetsAPI.updateValues(this.spreadsheetId, `${CONFIG.SHEETS.CONFIG}!A1`, newValues);
            
            console.log(`Saved config value: ${key} = ${value}`);
            
        } catch (error) {
            console.error(`Error saving config value ${key}:`, error);
            throw error;
        }
    }

    // Sync operations
    async syncAll() {
        if (this.syncInProgress) {
            console.log('Sync already in progress, skipping...');
            return;
        }
        
        try {
            this.syncInProgress = true;
            console.log('Starting full sync...');
            
            // Update last sync time
            await this.saveConfigValue('last_sync', new Date().toISOString());
            this.lastSyncTime = new Date();
            
            console.log('Full sync completed');
            
        } catch (error) {
            console.error('Error during sync:', error);
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }

    startAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }
        
        if (CONFIG.SYNC.AUTO_SYNC_INTERVAL > 0) {
            this.autoSyncInterval = setInterval(async () => {
                try {
                    await this.syncAll();
                } catch (error) {
                    console.warn('Auto-sync failed:', error);
                }
            }, CONFIG.SYNC.AUTO_SYNC_INTERVAL);
            
            console.log(`Auto-sync started with ${CONFIG.SYNC.AUTO_SYNC_INTERVAL}ms interval`);
        }
    }

    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            console.log('Auto-sync stopped');
        }
    }

    // Utility methods
    getSheetKey(sheetName) {
        for (const [key, name] of Object.entries(CONFIG.SHEETS)) {
            if (name === sheetName) {
                return key;
            }
        }
        return null;
    }

    getSpreadsheetUrl() {
        return this.spreadsheetId ? sheetsAPI.getSheetUrl(this.spreadsheetId) : null;
    }

    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            spreadsheetId: this.spreadsheetId,
            spreadsheetName: this.spreadsheetName,
            syncInProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime,
            hasAutoSync: !!this.autoSyncInterval,
            spreadsheetUrl: this.getSpreadsheetUrl()
        };
    }

    // Cleanup
    destroy() {
        this.stopAutoSync();
        this.isInitialized = false;
        this.spreadsheetId = null;
        this.spreadsheetName = null;
        console.log('SpreadsheetManager destroyed');
    }
}

// Create global instance
const spreadsheetManager = new SpreadsheetManager();