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
            console.log('Safari - initializing with base URL:', this.baseUrl);
            
            // Safari compatibility check
            if (typeof fetch === 'undefined') {
                throw new Error('Fetch API not available. Please use a modern browser.');
            }
            
            // Check if base URL is accessible (basic connectivity test)
            try {
                console.log('Safari - testing base URL connectivity...');
                const testUrl = new URL(this.baseUrl);
                console.log('Safari - parsed URL components:', {
                    protocol: testUrl.protocol,
                    hostname: testUrl.hostname,
                    port: testUrl.port
                });
            } catch (urlError) {
                console.error('Safari - URL parsing error:', urlError);
                throw new Error(`Invalid base URL: ${this.baseUrl}`);
            }
            
            // Handle API key from URL and localStorage
            const urlApiKey = StorageHelper.getApiKeyFromUrl();
            const storedApiKey = StorageHelper.loadApiKey();
            
            console.log('Safari - API key sources:', {
                fromUrl: !!urlApiKey,
                fromStorage: !!storedApiKey
            });
            
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
            
            // Safari pre-flight connectivity check
            await this.safariConnectivityCheck();
            
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

    // Safari/iOS connectivity pre-check
    async safariConnectivityCheck() {
        try {
            this.showDebugMessage('Testing network connectivity...', 'info');
            
            // Try a simple fetch to the base domain
            const testController = new AbortController();
            const testTimeoutId = setTimeout(() => testController.abort(), 5000);
            
            const testResponse = await fetch(this.baseUrl, {
                method: 'HEAD',
                signal: testController.signal,
                mode: 'no-cors', // Less restrictive for connectivity test
                cache: 'no-cache'
            });
            
            clearTimeout(testTimeoutId);
            this.showDebugMessage('Network connectivity OK', 'success');
            
        } catch (connectError) {
            console.warn('Connectivity check failed:', connectError);
            if (connectError.name === 'AbortError') {
                this.showDebugMessage('Network timeout - slow connection detected', 'warning');
            } else {
                this.showDebugMessage(`Network issue: ${connectError.message}`, 'warning');
            }
            // Don't throw - this is just a pre-check
        }
    }

    // Show debug messages in the UI for iOS testing
    showDebugMessage(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Also show in UI for iOS debugging
        let debugContainer = document.getElementById('ios-debug-messages');
        if (!debugContainer) {
            debugContainer = document.createElement('div');
            debugContainer.id = 'ios-debug-messages';
            debugContainer.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                max-width: 300px;
                z-index: 10000;
                font-family: monospace;
                font-size: 12px;
                background: rgba(0,0,0,0.9);
                color: white;
                padding: 10px;
                border-radius: 5px;
                max-height: 200px;
                overflow-y: auto;
                display: block;
            `;
            
            // Add a toggle button
            const toggleButton = document.createElement('button');
            toggleButton.textContent = '×';
            toggleButton.style.cssText = `
                position: absolute;
                top: 2px;
                right: 5px;
                background: none;
                border: none;
                color: white;
                font-size: 16px;
                cursor: pointer;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            toggleButton.onclick = () => {
                if (debugContainer.style.display === 'none') {
                    debugContainer.style.display = 'block';
                    toggleButton.textContent = '×';
                } else {
                    debugContainer.style.display = 'none';
                    toggleButton.textContent = '?';
                    toggleButton.style.cssText += 'background: rgba(0,0,0,0.9); border-radius: 50%;';
                }
            };
            
            debugContainer.appendChild(toggleButton);
            document.body.appendChild(debugContainer);
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const colorMap = {
            info: '#17a2b8',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545'
        };
        
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            color: ${colorMap[type] || '#ffffff'};
            margin: 2px 0;
            word-wrap: break-word;
        `;
        messageDiv.textContent = `${timestamp}: ${message}`;
        
        debugContainer.appendChild(messageDiv);
        
        // Keep only last 10 messages
        while (debugContainer.children.length > 10) {
            debugContainer.removeChild(debugContainer.firstChild);
        }
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 3000);
        }
    }

    async checkTokenValidity() {
        try {
            console.log('Checking token validity with Home Secrets service...');
            this.showDebugMessage('Checking token validity...', 'info');
            
            if (!this.apiKey) {
                throw new Error('No API key available');
            }
            
            // Build token URL with API key
            const tokenUrl = `${this.baseUrl}/oauth/google/token?api-key=${encodeURIComponent(this.apiKey)}`;
            console.log('Token URL (masked):', tokenUrl.replace(/api-key=[^&]*/, 'api-key=***'));
            this.showDebugMessage('Making token request...', 'info');
            
            // Safari-compatible fetch with timeout and error handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            console.log('Safari fetch attempt - starting request...');
            
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
                
                console.log('Safari fetch - response received:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    headers: Object.fromEntries(response.headers.entries())
                });
                
                this.showDebugMessage(`Response: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error');
                
            } catch (fetchError) {
                clearTimeout(timeoutId);
                console.error('Safari fetch error details:', {
                    name: fetchError.name,
                    message: fetchError.message,
                    stack: fetchError.stack
                });
                
                this.showDebugMessage(`Fetch error: ${fetchError.name} - ${fetchError.message}`, 'error');
                
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timeout - please check your internet connection');
                } else if (fetchError.name === 'TypeError' && fetchError.message.includes('network')) {
                    throw new Error(`Safari network error: ${fetchError.message}. Check CORS settings and network connectivity.`);
                } else {
                    throw new Error(`Safari fetch failed: ${fetchError.message}`);
                }
            } finally {
                clearTimeout(timeoutId);
            }
            
            if (response.status === 401 || response.status === 403) {
                console.error('Safari auth error - status:', response.status);
                throw new Error('API key invalid or expired. Please get a new API key.');
            }
            
            if (!response.ok) {
                console.error('Safari non-ok response:', {
                    status: response.status,
                    statusText: response.statusText
                });
                
                // Try to get error details from response body
                let errorDetails = '';
                try {
                    const errorText = await response.text();
                    console.log('Safari error response body:', errorText);
                    errorDetails = errorText ? ` - ${errorText}` : '';
                } catch (e) {
                    console.warn('Could not read error response body:', e);
                }
                
                throw new Error(`Token endpoint error: ${response.status} ${response.statusText}${errorDetails}`);
            }
            
            let tokenData;
            try {
                const responseText = await response.text();
                console.log('Safari response text length:', responseText?.length || 0);
                console.log('Safari response preview:', responseText?.substring(0, 200) || 'empty');
                
                if (!responseText) {
                    throw new Error('Empty response from server');
                }
                tokenData = JSON.parse(responseText);
                console.log('Safari token parsing success - has access_token:', !!tokenData.access_token);
                
            } catch (jsonError) {
                console.error('Safari JSON parsing error:', jsonError);
                throw new Error(`Invalid response from server: ${jsonError.message}`);
            }
            
            if (tokenData.access_token) {
                this.accessToken = tokenData.access_token;
                this.showDebugMessage('✅ Token received successfully', 'success');
                
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
                        this.showDebugMessage('Date parsing issue, using 1hr expiry', 'warning');
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
            this.showDebugMessage(`❌ Token check failed: ${error.message}`, 'error');
            
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