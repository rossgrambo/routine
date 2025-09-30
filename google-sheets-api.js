class GoogleSheetsAPI {
    constructor() {
        this.isInitialized = false;
        this.accessToken = null;
        this.retryCount = 0;
    }

    async initialize() {
        try {
            // Load Google API client
            if (typeof gapi === 'undefined') {
                throw new Error('Google API library not loaded. Make sure to include the Google API script in your HTML.');
            }

            // Initialize Google API client
            await new Promise((resolve, reject) => {
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            discoveryDocs: [CONFIG.DISCOVERY_DOC],
                        });
                        console.log('Google API client initialized');
                        resolve();
                    } catch (error) {
                        console.error('Error initializing Google API client:', error);
                        reject(error);
                    }
                });
            });

            // Initialize Home Secrets client
            const tokenValid = await homeSecretsClient.initialize(CONFIG.HOME_SECRETS);
            
            if (tokenValid) {
                await this.updateSignInStatus();
                this.isInitialized = true;
                console.log('Google Sheets API initialized successfully');
                return true;
            } else {
                throw new Error('Could not obtain valid access token');
            }
            
        } catch (error) {
            console.error('Error initializing Google Sheets API:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    async updateSignInStatus() {
        try {
            this.accessToken = await homeSecretsClient.getAccessToken();
            gapi.client.setToken({ access_token: this.accessToken });
            console.log('Updated Google API with access token');
            this.retryCount = 0; // Reset retry count on successful auth
        } catch (error) {
            console.error('Error updating sign-in status:', error);
            this.accessToken = null;
            gapi.client.setToken(null);
            throw error;
        }
    }

    isUserSignedIn() {
        return this.isInitialized && this.accessToken && !homeSecretsClient.isTokenExpired();
    }

    async ensureAuthenticated() {
        if (!this.isUserSignedIn()) {
            console.log('Refreshing authentication...');
            await this.updateSignInStatus();
        }
    }

    async executeWithRetry(operation, maxRetries = CONFIG.SYNC.RETRY_ATTEMPTS) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.ensureAuthenticated();
                return await operation();
            } catch (error) {
                console.warn(`Attempt ${attempt} failed:`, error);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Check if it's an auth error and try refreshing token
                if (error.status === 401 || error.status === 403) {
                    console.log('Auth error detected, refreshing token...');
                    try {
                        await this.updateSignInStatus();
                    } catch (authError) {
                        console.error('Token refresh failed:', authError);
                        throw authError;
                    }
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, CONFIG.SYNC.RETRY_DELAY * attempt));
            }
        }
    }

    // Spreadsheet operations
    async createSpreadsheet(title) {
        return this.executeWithRetry(async () => {
            const response = await gapi.client.sheets.spreadsheets.create({
                properties: {
                    title: title
                }
            });
            
            console.log('Spreadsheet created:', response.result.properties.title);
            return response.result;
        });
    }

    async getSpreadsheet(spreadsheetId) {
        return this.executeWithRetry(async () => {
            const response = await gapi.client.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId
            });
            
            return response.result;
        });
    }

    async findSpreadsheetByName(name) {
        return this.executeWithRetry(async () => {
            // Load Google Drive API if not loaded
            await gapi.client.load('drive', 'v3');
            
            const response = await gapi.client.drive.files.list({
                q: `name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
                fields: 'files(id, name, createdTime, modifiedTime)'
            });
            
            return response.result.files || [];
        });
    }

    // Sheet operations
    async addSheet(spreadsheetId, sheetName) {
        return this.executeWithRetry(async () => {
            const response = await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId,
                requests: [{
                    addSheet: {
                        properties: {
                            title: sheetName
                        }
                    }
                }]
            });
            
            console.log('Sheet added:', sheetName);
            return response.result;
        });
    }

    // Data operations
    async getValues(spreadsheetId, range) {
        return this.executeWithRetry(async () => {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: range
            });
            
            return response.result.values || [];
        });
    }

    async updateValues(spreadsheetId, range, values, valueInputOption = 'RAW') {
        return this.executeWithRetry(async () => {
            const response = await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: range,
                valueInputOption: valueInputOption,
                values: values
            });
            
            return response.result;
        });
    }

    async appendValues(spreadsheetId, range, values, valueInputOption = 'RAW') {
        return this.executeWithRetry(async () => {
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: spreadsheetId,
                range: range,
                valueInputOption: valueInputOption,
                values: values
            });
            
            return response.result;
        });
    }

    async batchUpdate(spreadsheetId, requests) {
        return this.executeWithRetry(async () => {
            const response = await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId,
                requests: requests
            });
            
            return response.result;
        });
    }

    async clearValues(spreadsheetId, range) {
        return this.executeWithRetry(async () => {
            const response = await gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: spreadsheetId,
                range: range
            });
            
            return response.result;
        });
    }

    // Batch operations for better performance
    async batchGetValues(spreadsheetId, ranges) {
        return this.executeWithRetry(async () => {
            const response = await gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId: spreadsheetId,
                ranges: ranges
            });
            
            return response.result.valueRanges || [];
        });
    }

    async batchUpdateValues(spreadsheetId, data, valueInputOption = 'RAW') {
        return this.executeWithRetry(async () => {
            const response = await gapi.client.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: spreadsheetId,
                valueInputOption: valueInputOption,
                data: data
            });
            
            return response.result;
        });
    }

    // Utility methods
    getSheetUrl(spreadsheetId, sheetId = null) {
        let url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
        if (sheetId) {
            url += `#gid=${sheetId}`;
        }
        return url;
    }

    // Error handling helper
    handleSheetsError(error) {
        console.error('Google Sheets API Error:', error);
        
        if (error.status === 401) {
            return 'Authentication expired. Please refresh the page.';
        } else if (error.status === 403) {
            return 'Access denied. Please check your permissions.';
        } else if (error.status === 404) {
            return 'Spreadsheet not found. It may have been deleted or moved.';
        } else if (error.status === 429) {
            return 'Too many requests. Please try again in a moment.';
        } else if (!navigator.onLine) {
            return 'No internet connection. Please check your connection and try again.';
        } else {
            return `An error occurred: ${error.message || 'Unknown error'}`;
        }
    }

    // Debug information
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            hasAccessToken: !!this.accessToken,
            isSignedIn: this.isUserSignedIn(),
            homeSecretsInfo: homeSecretsClient.getTokenInfo(),
            retryCount: this.retryCount
        };
    }
}

// Create global instance
const sheetsAPI = new GoogleSheetsAPI();