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
            // Dynamically build base URL using current page's protocol
            const currentProtocol = window.location.protocol; // 'http:' or 'https:'
            this.baseUrl = `${currentProtocol}//${config.HOST}`;
            console.log('Safari - initializing with dynamic base URL:', this.baseUrl);
            
            // Safari compatibility check
            if (typeof fetch === 'undefined') {
                throw new Error('Fetch API not available. Please use a modern browser.');
            }
            
            // Check if base URL is accessible (basic connectivity test)
            try {
                console.log('Safari - testing dynamic base URL connectivity...');
                const testUrl = new URL(this.baseUrl);
                console.log('Safari - parsed URL components (auto-protocol):', {
                    protocol: testUrl.protocol,
                    hostname: testUrl.hostname,
                    port: testUrl.port,
                    detectedFromPage: currentProtocol
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
            const testController = new AbortController();
            const testTimeoutId = setTimeout(() => testController.abort(), 5000);
            
            try {
                const testResponse = await fetch(this.baseUrl, {
                    method: 'HEAD',
                    signal: testController.signal,
                    mode: 'no-cors',
                    cache: 'no-cache'
                });
                clearTimeout(testTimeoutId);
                console.log('Connectivity check passed');
            } catch (basicError) {
                clearTimeout(testTimeoutId);
                
                // Check if this is likely a self-signed certificate issue
                if (this.baseUrl.startsWith('https://') && basicError.message.includes('Load failed')) {
                    console.log('Self-signed certificate issue detected');
                    this.showSelfSignedCertificateHelper();
                }
                
                // Try HTTP fallback if we're on HTTPS
                if (this.baseUrl.startsWith('https://')) {
                    try {
                        const httpUrl = this.baseUrl.replace('https://', 'http://');
                        console.log('Trying HTTP fallback:', httpUrl);
                        
                        const httpResponse = await fetch(httpUrl, {
                            method: 'HEAD',
                            mode: 'no-cors',
                            cache: 'no-cache'
                        });
                        console.log('HTTP fallback successful');
                        this.baseUrl = httpUrl;
                        return;
                        
                    } catch (httpError) {
                        console.warn('HTTP fallback also failed:', httpError.message);
                    }
                }
                
                throw basicError;
            }
            
        } catch (connectError) {
            console.warn('Connectivity check failed:', connectError.message);
        }
    }

    // Helper for self-signed certificate issues
    showSelfSignedCertificateHelper() {
        console.log('Self-signed certificate detected - showing helper');
        
        // Create a simple notification for certificate issues only
        let certHelper = document.getElementById('cert-helper');
        if (!certHelper) {
            certHelper = document.createElement('div');
            certHelper.id = 'cert-helper';
            certHelper.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #ff9500;
                color: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 300px;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            `;
            
            certHelper.innerHTML = `
                <div style="margin-bottom: 10px; font-weight: bold;">🔒 Certificate Required</div>
                <div style="margin-bottom: 10px; font-size: 14px;">Safari needs you to accept the security certificate first.</div>
                <a href="${this.baseUrl}" target="_blank" style="
                    display: inline-block;
                    background: white;
                    color: #ff9500;
                    padding: 8px 16px;
                    border-radius: 4px;
                    text-decoration: none;
                    font-weight: bold;
                    margin-bottom: 10px;
                ">Accept Certificate</a>
                <div style="font-size: 12px; opacity: 0.9;">Then refresh this page</div>
                <button onclick="this.parentNode.remove()" style="
                    position: absolute;
                    top: 5px;
                    right: 8px;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                ">×</button>
            `;
            
            document.body.appendChild(certHelper);
            
            // Auto-remove after 15 seconds
            setTimeout(() => {
                if (certHelper.parentNode) {
                    certHelper.parentNode.removeChild(certHelper);
                }
            }, 15000);
        }
    }

    // Show debug messages (console only, UI for cert issues)
    showDebugMessage(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    async checkTokenValidity() {
        try {
            console.log('Checking token validity with Home Secrets service...');
            
            if (!this.apiKey) {
                throw new Error('No API key available');
            }
            
            // Build token URL with API key
            const tokenUrl = `${this.baseUrl}/oauth/google/token?api-key=${encodeURIComponent(this.apiKey)}`;
            console.log('Token URL (masked):', tokenUrl.replace(/api-key=[^&]*/, 'api-key=***'));
            
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
                
                console.log('Response received:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                });
                
            } catch (fetchError) {
                clearTimeout(timeoutId);
                console.error('Safari fetch error details:', {
                    name: fetchError.name,
                    message: fetchError.message,
                    stack: fetchError.stack
                });
                

                
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