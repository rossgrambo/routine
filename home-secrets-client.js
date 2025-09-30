class HomeSecretsClient {
    constructor() {
        this.accessToken = null;
        this.tokenExpiryTime = null;
        this.baseUrl = null;
        this.apiKey = null;
        this.isInitialized = false;
    }

    async initialize(config) {
        try {
            this.baseUrl = config.BASE_URL;
            
            // Safari compatibility check
            if (typeof fetch === 'undefined') {
                throw new Error('Fetch API not available. Please use a modern browser.');
            }
            
            // Handle API key from URL and localStorage
            const urlApiKey = StorageHelper.getApiKeyFromUrl();
            const storedApiKey = StorageHelper.loadApiKey();
            
            if (urlApiKey) {
                this.apiKey = urlApiKey;
                StorageHelper.saveApiKey(urlApiKey);
                console.log('API key provided in URL and saved');
                
                // Clean up URL to remove API key for security (Safari-compatible)
                try {
                    if (typeof URL !== 'undefined' && typeof URLSearchParams !== 'undefined') {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('api-key');
                        window.history.replaceState({}, '', url.toString());
                    } else {
                        // Fallback for Safari URL cleaning
                        this.safariCleanUrl();
                    }
                } catch (urlError) {
                    console.warn('URL cleaning failed, continuing anyway:', urlError);
                    // Continue without URL cleaning if it fails
                }
                
            } else if (storedApiKey) {
                this.apiKey = storedApiKey;
                console.log('Using stored API key');
            } else {
                throw new Error('No API key available. Please provide api-key parameter in URL.');
            }
            
            // Check if we can get a valid token
            const tokenValid = await this.checkTokenValidity();
            
            if (tokenValid) {
                this.isInitialized = true;
                console.log('Home Secrets Client initialized successfully');
                return true;
            } else {
                throw new Error('Could not obtain valid access token');
            }
            
        } catch (error) {
            console.error('Error initializing Home Secrets Client:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // Safari-compatible URL cleaning fallback
    safariCleanUrl() {
        try {
            const currentUrl = window.location.href;
            const cleanUrl = currentUrl.replace(/[?&]api-key=[^&]*(&|$)/, function(match, suffix) {
                return suffix === '&' ? '&' : '';
            }).replace(/[?]$/, ''); // Remove trailing ? if it exists
            
            if (cleanUrl !== currentUrl) {
                window.history.replaceState({}, '', cleanUrl);
            }
        } catch (e) {
            console.warn('Safari URL cleaning fallback failed:', e);
        }
    }

    async checkTokenValidity() {
        try {
            console.log('Checking token validity with Home Secrets service...');
            
            if (!this.apiKey) {
                throw new Error('No API key available');
            }
            
            // Build token URL with API key
            const tokenUrl = `${this.baseUrl}/oauth/google/token?api-key=${encodeURIComponent(this.apiKey)}`;
            
            // Safari-compatible fetch with timeout and error handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            let response;
            try {
                response = await fetch(tokenUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': this.apiKey
                    },
                    signal: controller.signal,
                    // Safari sometimes needs these explicit settings
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-cache'
                });
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timeout - please check your internet connection');
                } else {
                    throw new Error(`Network error: ${fetchError.message}`);
                }
            } finally {
                clearTimeout(timeoutId);
            }
            
            if (response.status === 401 || response.status === 403) {
                throw new Error('API key invalid or expired. Please get a new API key.');
            }
            
            if (!response.ok) {
                throw new Error(`Token endpoint error: ${response.status} ${response.statusText}`);
            }
            
            let tokenData;
            try {
                const responseText = await response.text();
                if (!responseText) {
                    throw new Error('Empty response from server');
                }
                tokenData = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                throw new Error(`Invalid response from server: ${jsonError.message}`);
            }
            
            if (tokenData.access_token) {
                this.accessToken = tokenData.access_token;
                
                // Set expiry time (Safari date parsing compatibility)
                if (tokenData.expiry) {
                    try {
                        if (typeof tokenData.expiry === 'string') {
                            // Safari sometimes has issues with ISO date parsing
                            const expiryDate = new Date(tokenData.expiry);
                            if (isNaN(expiryDate.getTime())) {
                                // Try parsing as timestamp if ISO parsing fails
                                this.tokenExpiryTime = parseInt(tokenData.expiry) * 1000;
                            } else {
                                this.tokenExpiryTime = expiryDate.getTime();
                            }
                        } else {
                            this.tokenExpiryTime = tokenData.expiry * 1000;
                        }
                    } catch (dateError) {
                        console.warn('Date parsing error, using default expiry:', dateError);
                        this.tokenExpiryTime = Date.now() + (3600 * 1000);
                    }
                } else {
                    // Default to 1 hour from now if no expiry provided
                    this.tokenExpiryTime = Date.now() + (3600 * 1000);
                }
                
                console.log('Valid token received, expires at:', new Date(this.tokenExpiryTime));
                return true;
            }
            
            throw new Error('No access token in response');
            
        } catch (error) {
            console.error('Error checking token validity:', error);
            
            // Clear stored token data on error
            this.accessToken = null;
            this.tokenExpiryTime = null;
            
            throw error;
        }
    }

    isTokenExpired() {
        if (!this.tokenExpiryTime) return true;
        
        // Add 5 minute buffer to prevent using tokens that are about to expire
        const bufferTime = 5 * 60 * 1000; // 5 minutes
        return Date.now() >= (this.tokenExpiryTime - bufferTime);
    }

    async getAccessToken(forceRefresh = false) {
        try {
            if (!this.isInitialized) {
                throw new Error('HomeSecretsClient not initialized');
            }
            
            if (!this.accessToken || this.isTokenExpired() || forceRefresh) {
                console.log('Token expired or refresh requested, getting new token...');
                await this.checkTokenValidity();
            }
            
            if (!this.accessToken) {
                throw new Error('No valid access token available');
            }
            
            return this.accessToken;
            
        } catch (error) {
            console.error('Error getting access token:', error);
            throw error;
        }
    }

    async testConnection() {
        try {
            const token = await this.getAccessToken();
            console.log('Connection test successful');
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    // Get API key for debugging (masked for security)
    getApiKeyInfo() {
        if (!this.apiKey) return 'No API key';
        
        const length = this.apiKey.length;
        if (length <= 8) return this.apiKey; // Show short keys fully
        
        const start = this.apiKey.substring(0, 4);
        const end = this.apiKey.substring(length - 4);
        return `${start}****${end}`;
    }

    // Get token info for debugging
    getTokenInfo() {
        return {
            hasToken: !!this.accessToken,
            isExpired: this.isTokenExpired(),
            expiresAt: this.tokenExpiryTime ? new Date(this.tokenExpiryTime).toISOString() : null,
            isInitialized: this.isInitialized
        };
    }

    // Clear all token data (useful for logout/reset)
    clearTokenData() {
        this.accessToken = null;
        this.tokenExpiryTime = null;
        this.isInitialized = false;
        console.log('Token data cleared');
    }

    // Clear API key (useful for switching accounts)
    clearApiKey() {
        this.apiKey = null;
        StorageHelper.clearApiKey();
        this.clearTokenData();
        console.log('API key cleared');
    }
}

// Create global instance
const homeSecretsClient = new HomeSecretsClient();