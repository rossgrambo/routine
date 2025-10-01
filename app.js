// Daily Routine App - Main JavaScript File

class DailyRoutineApp {
    constructor() {
        this.currentActivityIndex = 0;
        this.activities = [];
        this.history = [];
        this.currentEditingActivity = null;
        this.currentEditingHistory = null;
        this.currentImportExportMode = null;
        
        // Google Sheets integration state
        this.isGoogleSheetsEnabled = false;
        this.isInitializing = false;
        this.useOfflineMode = false;
        
        // Flag to prevent auto-saving until user makes actual edits
        this.userHasMadeEdits = false;
        
        this.init();
    }

    async init() {
        try {
            this.isInitializing = true;
            this.showInitializing();
            
            // Safari-specific checks
            this.checkSafariCompatibility();
            
            // Try to initialize Google Sheets integration
            await this.initializeGoogleSheets();
            
            // Load data (from Google Sheets or localStorage fallback)
            await this.loadData();
            this.initializeDefaultActivities();
            
            // Advance past activities that have already been completed today
            this.advancePastCompletedActivities();
            
            this.hideInitializing();
            
            // Check for widget view mode (Safari-compatible)
            if (this.isWidgetMode()) {
                // Check if we need to complete an activity first
                let shouldComplete = false;
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    shouldComplete = urlParams.get('complete') === 'true';
                } catch (urlError) {
                    console.warn('URLSearchParams failed, using fallback:', urlError);
                    shouldComplete = window.location.search.includes('complete=true');
                }
                
                if (shouldComplete) {
                    // Complete the activity without updating the widget view yet
                    await this.completeActivityWidgetSilent();
                    // Update URL to remove the complete parameter (Safari-compatible)
                    try {
                        const newUrl = new URL(window.location);
                        newUrl.searchParams.delete('complete');
                        window.history.replaceState({}, '', newUrl);
                    } catch (urlError) {
                        console.warn('URL update failed:', urlError);
                    }
                }
                
                this.initWidgetMode();
            } else {
                this.setupEventListeners();
                this.updateUI();
                this.showCurrentActivity();
            }
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.handleInitializationError(error);
        } finally {
            this.isInitializing = false;
        }
    }

    // Safari compatibility check
    checkSafariCompatibility() {
        const issues = [];
        
        // Check localStorage
        if (!StorageHelper.isLocalStorageAvailable()) {
            issues.push('localStorage may be restricted (private browsing mode?)');
        }
        
        // Check fetch API
        if (typeof fetch === 'undefined') {
            issues.push('fetch API not available');
        }
        
        // Check URL API
        if (typeof URL === 'undefined') {
            issues.push('URL API not available');
        }
        
        // Check Promise support
        if (typeof Promise === 'undefined') {
            issues.push('Promise support missing');
        }
        
        if (issues.length > 0) {
            console.warn('Safari compatibility issues detected:', issues);
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            if (isSafari) {
                console.warn('Safari detected - some features may be limited');
            }
        }
    }

    // Check if widget mode is enabled via query parameter
    isWidgetMode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('view') === 'widget';
    }

    // Initialize Google Sheets integration
    async initializeGoogleSheets() {
        try {
            console.log('Initializing Google Sheets integration...');
            
            // Check if we have an API key available
            const hasApiKey = StorageHelper.getApiKeyFromUrl() || StorageHelper.loadApiKey();
            
            if (!hasApiKey) {
                console.log('No API key found, using offline mode');
                this.useOfflineMode = true;
                this.isGoogleSheetsEnabled = false;
                return false;
            }
            
            // Initialize Google Sheets API
            await sheetsAPI.initialize();
            
            // Initialize Spreadsheet Manager
            await spreadsheetManager.initialize();
            
            this.isGoogleSheetsEnabled = true;
            this.useOfflineMode = false;
            console.log('Google Sheets integration initialized successfully');
            
            return true;
            
        } catch (error) {
            console.warn('Failed to initialize Google Sheets, falling back to offline mode:', error);
            this.isGoogleSheetsEnabled = false;
            this.useOfflineMode = true;
            
            // Show user-friendly message
            this.showConnectionError(error.message);
            
            return false;
        }
    }

    showInitializing() {
        // Show loading state
        console.log('App initializing...');
        
        // Hide the activity card and buttons during initialization
        const activityCard = document.querySelector('.activity-card');
        const doneBtn = document.getElementById('doneBtn');
        const skipBtn = document.getElementById('skipBtn');
        const activityContainer = document.querySelector('.activity-container');
        
        if (activityCard) activityCard.style.display = 'none';
        if (doneBtn) doneBtn.style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none';
        
        // Create and show loading spinner
        if (activityContainer && !document.querySelector('.loading-spinner')) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.innerHTML = `
                <div class="spinner"></div>
                <p class="loading-text">Loading your routine...</p>
            `;
            activityContainer.appendChild(spinner);
        }
    }

    hideInitializing() {
        // Hide loading state
        console.log('App initialization complete');
        
        // Remove loading spinner
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
        
        // Show the activity card and buttons after initialization
        const activityCard = document.querySelector('.activity-card');
        const doneBtn = document.getElementById('doneBtn');
        const skipBtn = document.getElementById('skipBtn');
        
        if (activityCard) activityCard.style.display = 'block';
        if (doneBtn) doneBtn.style.display = 'block';
        if (skipBtn) skipBtn.style.display = 'block';
    }

    handleInitializationError(error) {
        console.error('App initialization failed:', error);
        this.useOfflineMode = true;
        this.isGoogleSheetsEnabled = false;
        
        // Load data from localStorage as fallback
        this.loadDataFromLocalStorage();
        this.initializeDefaultActivities();
        
        // Remove loading spinner
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
        
        // Show the activity card and buttons for offline mode
        const activityCard = document.querySelector('.activity-card');
        const doneBtn = document.getElementById('doneBtn');
        const skipBtn = document.getElementById('skipBtn');
        
        if (activityCard) activityCard.style.display = 'block';
        if (doneBtn) doneBtn.style.display = 'block';
        if (skipBtn) skipBtn.style.display = 'block';
        
        // Continue with normal app initialization
        if (!this.isWidgetMode()) {
            this.setupEventListeners();
            this.updateUI();
            this.showCurrentActivity();
        }
        
        this.showError(`Failed to initialize: ${error.message}. Running in offline mode.`);
    }

    showConnectionError(message) {
        // Show a non-blocking notification about connection issues
        console.warn('Connection issue:', message);
        // You could implement a toast notification here
    }

    // Settings screen management
    updateSettingsScreen() {
        this.updateGoogleSheetsStatus();
        this.setupSettingsEventListeners();
    }

    updateGoogleSheetsStatus() {
        const statusElement = document.getElementById('googleSheetsStatus');
        const spreadsheetInfo = document.getElementById('spreadsheetInfo');
        const spreadsheetLink = document.getElementById('spreadsheetLink');
        
        if (!statusElement) return;
        
        if (this.isGoogleSheetsEnabled && !this.useOfflineMode) {
            statusElement.textContent = '✅ Connected';
            statusElement.style.color = 'green';
            
            if (spreadsheetManager.spreadsheetId) {
                const url = spreadsheetManager.getSpreadsheetUrl();
                spreadsheetLink.href = url;
                spreadsheetLink.textContent = spreadsheetManager.spreadsheetName || 'View Spreadsheet';
                spreadsheetInfo.style.display = 'block';
            }
        } else if (this.useOfflineMode) {
            statusElement.textContent = '⚠️ Offline Mode';
            statusElement.style.color = 'orange';
            spreadsheetInfo.style.display = 'none';
        } else {
            statusElement.textContent = '❌ Not Connected';
            statusElement.style.color = 'red';
            spreadsheetInfo.style.display = 'none';
        }
    }

    setupSettingsEventListeners() {
        const refreshBtn = document.getElementById('refreshConnection');
        const clearApiKeyBtn = document.getElementById('clearApiKey');
        const debugBtn = document.getElementById('showDebugInfo');
        
        // Remove existing listeners to prevent duplicates
        refreshBtn?.replaceWith(refreshBtn.cloneNode(true));
        clearApiKeyBtn?.replaceWith(clearApiKeyBtn.cloneNode(true));
        debugBtn?.replaceWith(debugBtn.cloneNode(true));
        
        // Add new listeners
        document.getElementById('refreshConnection')?.addEventListener('click', async () => {
            await this.refreshGoogleSheetsConnection();
        });
        
        document.getElementById('clearApiKey')?.addEventListener('click', () => {
            this.clearApiKeyAndReset();
        });
        
        document.getElementById('showDebugInfo')?.addEventListener('click', () => {
            this.toggleDebugInfo();
        });
    }

    async refreshGoogleSheetsConnection() {
        try {
            const refreshBtn = document.getElementById('refreshConnection');
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.textContent = 'Refreshing...';
            }
            
            // Try to reinitialize Google Sheets
            await this.initializeGoogleSheets();
            this.updateGoogleSheetsStatus();
            
            if (this.isGoogleSheetsEnabled) {
                // Reload data from Google Sheets
                await this.loadData();
                this.showError('Connection refreshed successfully!', 'success');
            }
            
        } catch (error) {
            console.error('Error refreshing connection:', error);
            this.showError(`Failed to refresh connection: ${error.message}`);
        } finally {
            const refreshBtn = document.getElementById('refreshConnection');
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh Connection';
            }
        }
    }

    clearApiKeyAndReset() {
        if (confirm('This will clear your API key and reset the app to offline mode. Continue?')) {
            // Clear API key and reset state
            homeSecretsClient.clearApiKey();
            StorageHelper.clearSpreadsheetId();
            
            this.isGoogleSheetsEnabled = false;
            this.useOfflineMode = true;
            
            this.updateGoogleSheetsStatus();
            this.showError('API key cleared. You can provide a new one in the URL.', 'info');
        }
    }

    toggleDebugInfo() {
        const debugInfo = document.getElementById('debugInfo');
        const debugBtn = document.getElementById('showDebugInfo');
        
        if (debugInfo.style.display === 'none' || !debugInfo.style.display) {
            // Show debug info
            const info = {
                app: {
                    isGoogleSheetsEnabled: this.isGoogleSheetsEnabled,
                    useOfflineMode: this.useOfflineMode,
                    isInitializing: this.isInitializing,
                    activitiesCount: this.activities.length,
                    historyCount: this.history.length,
                    currentActivityIndex: this.currentActivityIndex
                },
                storage: {
                    hasApiKey: !!StorageHelper.loadApiKey(),
                    hasSpreadsheetId: !!StorageHelper.loadSpreadsheetId(),
                    hasExistingData: StorageHelper.hasExistingData(),
                    isOnline: StorageHelper.isOnline()
                },
                googleSheets: sheetsAPI.getDebugInfo(),
                spreadsheetManager: spreadsheetManager.getDebugInfo(),
                homeSecrets: homeSecretsClient.getTokenInfo()
            };
            
            debugInfo.textContent = JSON.stringify(info, null, 2);
            debugInfo.style.display = 'block';
            debugBtn.textContent = 'Hide Debug Info';
        } else {
            // Hide debug info
            debugInfo.style.display = 'none';
            debugBtn.textContent = 'Show Debug Info';
        }
    }

    // Initialize widget-only view
    initWidgetMode() {
        // Hide all UI elements except the activity
        document.querySelector('.header').style.display = 'none';
        document.querySelector('.nav-menu').style.display = 'none';
        document.querySelector('.overlay').style.display = 'none';
        
        // Hide all screens
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.style.display = 'none');
        
        // Create and show widget view
        this.createWidgetView();
    }

    createWidgetView() {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="widget-view">
                <div class="widget-square">
                    <div class="widget-activity">
                        <h1 class="widget-activity-title" id="widgetActivityTitle">Loading...</h1>
                        <p class="widget-activity-meta" id="widgetActivityMeta"></p>
                    </div>
                    <a class="widget-done-btn" id="widgetDoneBtn" href="">Done</a>
                </div>
            </div>
        `;
        
        // Add widget-specific styles
        const style = document.createElement('style');
        style.textContent = `
            .widget-view {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 20px;
                background: var(--background);
                box-sizing: border-box;
            }
            
            .widget-square {
                width: 1200px;
                height: 1200px;
                background: var(--card-background);
                border-radius: 20px;
                box-shadow: var(--shadow);
                display: flex;
                flex-direction: column;
                position: relative;
                overflow: hidden;
            }
            
            .widget-activity {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 1;
                text-align: center;
                padding: 40px;
                box-sizing: border-box;
            }
            
            .widget-activity-title {
                font-size: 4rem;
                color: var(--text-color);
                margin-bottom: 20px;
                font-weight: 600;
                line-height: 1.2;
                word-wrap: break-word;
                max-width: 100%;
            }
            
            .widget-activity-meta {
                font-size: 1.8rem;
                color: var(--text-light);
                margin: 0;
            }
            
            .widget-done-btn {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 400px;
                background: var(--success-color);
                color: white;
                border: none;
                font-size: 3rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                border-radius: 0 0 20px 20px;
                text-decoration: none;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .widget-done-btn:hover {
                background: #45a049;
                transform: translateY(-4px);
            }
            
            .widget-done-btn:active {
                transform: translateY(0);
            }
            
            /* Responsive scaling for smaller screens */
            @media (max-width: 1300px) {
                .widget-square {
                    width: 90vw;
                    height: 90vw;
                    max-width: 1200px;
                    max-height: 1200px;
                }
                
                .widget-activity-title {
                    font-size: 3.5rem;
                }
                
                .widget-activity-meta {
                    font-size: 1.6rem;
                }
                
                .widget-done-btn {
                    height: 30%;
                    font-size: 2.5rem;
                }
            }
            
            @media (max-width: 800px) {
                .widget-square {
                    width: 95vw;
                    height: 95vw;
                }
                
                .widget-activity-title {
                    font-size: 2.5rem;
                }
                
                .widget-activity-meta {
                    font-size: 1.3rem;
                }
                
                .widget-done-btn {
                    font-size: 2rem;
                }
            }
            
            @media (max-width: 500px) {
                .widget-activity-title {
                    font-size: 2rem;
                }
                
                .widget-activity-meta {
                    font-size: 1.1rem;
                }
                
                .widget-done-btn {
                    font-size: 1.5rem;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Add event listener for the done button
        document.getElementById('widgetDoneBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            const btn = e.target;
            btn.style.pointerEvents = 'none'; // Prevent double-clicks
            
            try {
                await this.completeActivityWidget();
            } finally {
                btn.style.pointerEvents = 'auto';
            }
        });
        
        // Show current activity in widget view
        this.updateWidgetView();
        
        // Update widget view every 30 seconds
        setInterval(() => {
            this.updateWidgetView();
        }, 30000);
    }

    async completeActivityWidget() {
        const todayActivities = this.getTodayActivities();
        if (todayActivities.length === 0) return;

        const currentActivity = todayActivities[this.currentActivityIndex];
        
        // Mark that user has made edits (completing an activity counts as an edit)
        this.userHasMadeEdits = true;
        
        // Add to history
        this.history.unshift({
            id: Date.now(),
            activityName: currentActivity.name,
            timestamp: new Date().toISOString(),
            skipped: false
        });

        // Move to next activity
        this.currentActivityIndex = (this.currentActivityIndex + 1) % todayActivities.length;
        
        // Save data and update widget view
        await this.saveData();
        this.updateWidgetView();
        
        // Add a brief animation/feedback
        const btn = document.getElementById('widgetDoneBtn');
        if (btn) {
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 150);
        }
    }

    async completeActivityWidgetSilent() {
        const todayActivities = this.getTodayActivities();
        if (todayActivities.length === 0) return;

        const currentActivity = todayActivities[this.currentActivityIndex];
        
        // Mark that user has made edits (completing an activity counts as an edit)
        this.userHasMadeEdits = true;
        
        // Add to history
        this.history.unshift({
            id: Date.now(),
            activityName: currentActivity.name,
            timestamp: new Date().toISOString(),
            skipped: false
        });

        // Move to next activity
        this.currentActivityIndex = (this.currentActivityIndex + 1) % todayActivities.length;
        
        // Save data only (don't update widget view since DOM elements don't exist yet)
        await this.saveData();
    }

    updateWidgetView() {
        const todayActivities = this.getTodayActivities();
        
        if (todayActivities.length === 0) {
            document.getElementById('widgetActivityTitle').textContent = 'No activities today';
            document.getElementById('widgetActivityMeta').textContent = '';
            // Update link to just refresh the page
            document.getElementById('widgetDoneBtn').href = window.location.href;
            return;
        }

        // Ensure we don't go out of bounds
        if (this.currentActivityIndex >= todayActivities.length) {
            this.currentActivityIndex = 0;
        }

        const currentActivity = todayActivities[this.currentActivityIndex];
        document.getElementById('widgetActivityTitle').textContent = currentActivity.name;
        
        let metaText = '';
        if (currentActivity.time) {
            metaText = `Suggested time: ${this.formatTime(currentActivity.time)}`;
        }
        document.getElementById('widgetActivityMeta').textContent = metaText;
        
        // Update the link to include completion parameter
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('complete', 'true');
        document.getElementById('widgetDoneBtn').href = currentUrl.toString();
    }

    // Data Management
    async loadData() {
        if (this.isGoogleSheetsEnabled && !this.useOfflineMode) {
            return await this.loadDataFromGoogleSheets();
        } else {
            return this.loadDataFromLocalStorage();
        }
    }

    async loadDataFromGoogleSheets() {
        try {
            console.log('Loading data from Google Sheets...');
            
            // Load activities
            const activities = await spreadsheetManager.loadActivities();
            if (activities && activities.length > 0) {
                this.activities = activities;
            }
            
            // Load history
            const history = await spreadsheetManager.loadHistory();
            if (history && history.length > 0) {
                this.history = history;
            }
            
            // Load current activity index
            const currentIndex = await spreadsheetManager.loadCurrentActivityIndex();
            this.currentActivityIndex = currentIndex;
            
            console.log(`Loaded ${this.activities.length} activities, ${this.history.length} history entries from Google Sheets`);
            
        } catch (error) {
            console.error('Error loading data from Google Sheets:', error);
            
            // Fallback to localStorage
            console.log('Falling back to localStorage...');
            this.loadDataFromLocalStorage();
            
            throw error;
        }
    }

    loadDataFromLocalStorage() {
        console.log('Loading data from localStorage (history and index only)...');
        
        try {
            // Only load history and current index from localStorage
            // Activities should come from server or defaults only
            const savedHistory = StorageHelper.safariSafeGetItem('dailyRoutine_history');
            const savedIndex = StorageHelper.safariSafeGetItem('dailyRoutine_currentIndex');

            if (savedHistory) {
                try {
                    this.history = JSON.parse(savedHistory);
                } catch (parseError) {
                    console.warn('Failed to parse history from storage:', parseError);
                    this.history = [];
                }
            }

            if (savedIndex !== null) {
                this.currentActivityIndex = parseInt(savedIndex) || 0;
            }
            
            console.log(`Loaded ${this.history.length} history entries from storage (activities come from server)`);
        } catch (error) {
            console.error('Failed to load data from localStorage (Safari compatibility issue):', error);
            // Initialize with empty data if loading fails
            this.history = [];
            this.currentActivityIndex = 0;
        }
    }

    async saveData() {
        // Don't save activities until user has made actual edits
        // This prevents overriding server data with defaults
        if (!this.userHasMadeEdits && this.isGoogleSheetsEnabled) {
            console.log('Skipping save - user has not made edits yet');
            return;
        }
        
        if (this.isGoogleSheetsEnabled && !this.useOfflineMode) {
            return await this.saveDataToGoogleSheets();
        } else {
            return this.saveDataToLocalStorage();
        }
    }

    async saveDataToGoogleSheets() {
        try {
            // Save all data to Google Sheets
            await Promise.all([
                spreadsheetManager.saveActivities(this.activities),
                spreadsheetManager.saveHistory(this.history),
                spreadsheetManager.saveCurrentActivityIndex(this.currentActivityIndex)
            ]);
            
            // Also save to localStorage as backup
            this.saveDataToLocalStorage();
            
            console.log('Data saved to Google Sheets successfully');
            
        } catch (error) {
            console.error('Error saving data to Google Sheets:', error);
            
            // Always save to localStorage as fallback
            this.saveDataToLocalStorage();
            
            // Don't throw error - app should continue working with localStorage
            console.log('Data saved to localStorage as fallback');
        }
    }

    saveDataToLocalStorage() {
        try {
            // Only save history and current index to localStorage
            // Activities are managed by server only
            StorageHelper.safariSafeSetItem('dailyRoutine_history', JSON.stringify(this.history));
            StorageHelper.safariSafeSetItem('dailyRoutine_currentIndex', this.currentActivityIndex.toString());
        } catch (error) {
            console.error('Failed to save data to localStorage (Safari compatibility issue):', error);
            this.showError('Failed to save data locally. Your changes may not persist.', 'error');
        }
    }

    initializeDefaultActivities() {
        if (this.activities.length === 0) {
            console.log('Initializing default activities (will not auto-save)');
            this.activities = [
                { 
                    id: 1, 
                    name: 'Wake Up', 
                    locked: true, 
                    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], 
                    time: '' 
                },
                { 
                    id: 2, 
                    name: 'Brush Teeth', 
                    locked: false, 
                    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], 
                    time: '' 
                },
                { 
                    id: 3, 
                    name: 'Shower', 
                    locked: false, 
                    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], 
                    time: '' 
                },
                { 
                    id: 4, 
                    name: 'Get Dressed', 
                    locked: false, 
                    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], 
                    time: '' 
                },
                { 
                    id: 5, 
                    name: 'Eat Breakfast', 
                    locked: false, 
                    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], 
                    time: '' 
                },
                { 
                    id: 6, 
                    name: 'Start Work', 
                    locked: false, 
                    days: ['mon', 'tue', 'wed', 'thu', 'fri'], 
                    time: '09:00' 
                },
                { 
                    id: 7, 
                    name: 'Lunch Break', 
                    locked: false, 
                    days: ['mon', 'tue', 'wed', 'thu', 'fri'], 
                    time: '12:00' 
                },
                { 
                    id: 8, 
                    name: 'Wrap Up Work', 
                    locked: false, 
                    days: ['mon', 'tue', 'wed', 'thu', 'fri'], 
                    time: '17:00' 
                },
                { 
                    id: 9, 
                    name: 'Be in Bed', 
                    locked: false, 
                    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], 
                    time: '22:00' 
                }
            ];
            // Don't auto-save defaults - only save when user makes actual edits
        }
    }
    
    advancePastCompletedActivities() {
        const todayActivities = this.getTodayActivities();
        if (todayActivities.length === 0) return;
        
        // Get today's date in YYYY-MM-DD format for comparison
        const today = new Date().toISOString().split('T')[0];
        
        // Find all activities completed today (not skipped)
        const completedTodayActivities = this.history.filter(entry => {
            const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
            return entryDate === today && !entry.skipped;
        }).map(entry => entry.activityName);
        
        if (completedTodayActivities.length === 0) {
            // No activities completed today, start from the beginning or current position
            return;
        }
        
        console.log(`Found ${completedTodayActivities.length} activities completed today:`, completedTodayActivities);
        
        // Starting from the current activity index, find the next activity that hasn't been completed today
        let advancedIndex = this.currentActivityIndex;
        let checkedCount = 0;
        
        while (checkedCount < todayActivities.length) {
            const currentActivity = todayActivities[advancedIndex];
            
            // If this activity hasn't been completed today, stop here
            if (!completedTodayActivities.includes(currentActivity.name)) {
                break;
            }
            
            // Move to next activity
            advancedIndex = (advancedIndex + 1) % todayActivities.length;
            checkedCount++;
        }
        
        // If we advanced the index, update it and save
        if (advancedIndex !== this.currentActivityIndex) {
            const oldIndex = this.currentActivityIndex;
            this.currentActivityIndex = advancedIndex;
            console.log(`Advanced from activity index ${oldIndex} to ${advancedIndex} (skipping completed activities)`);
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        const hamburgerMenu = document.getElementById('hamburgerMenu');
        const navMenu = document.getElementById('navMenu');
        const closeNav = document.getElementById('closeNav');
        const overlay = document.getElementById('overlay');
        const navItems = document.querySelectorAll('.nav-items a');

        hamburgerMenu.addEventListener('click', () => this.openNav());
        closeNav.addEventListener('click', () => this.closeNav());
        overlay.addEventListener('click', () => this.closeNav());

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = e.target.getAttribute('data-screen');
                this.showScreen(screen);
                this.closeNav();
            });
        });

        // Routine screen
        const doneBtn = document.getElementById('doneBtn');
        const skipBtn = document.getElementById('skipBtn');

        doneBtn.addEventListener('click', async () => {
            doneBtn.disabled = true;
            try {
                await this.completeActivity();
            } finally {
                doneBtn.disabled = false;
            }
        });
        skipBtn.addEventListener('click', async () => {
            skipBtn.disabled = true;
            try {
                await this.skipActivity();
            } finally {
                skipBtn.disabled = false;
            }
        });

        // Schedule screen
        const addActivityBtn = document.getElementById('addActivityBtn');
        addActivityBtn.addEventListener('click', () => this.showAddActivityModal());

        // History screen
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        clearHistoryBtn.addEventListener('click', async () => {
            clearHistoryBtn.disabled = true;
            try {
                await this.clearHistory();
            } finally {
                clearHistoryBtn.disabled = false;
            }
        });

        // Modals
        this.setupModalEventListeners();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeNav();
            }
        });
    }

    setupModalEventListeners() {
        // Activity Modal
        const editModal = document.getElementById('editModal');
        const closeModal = document.getElementById('closeModal');
        const cancelEdit = document.getElementById('cancelEdit');
        const activityForm = document.getElementById('activityForm');

        closeModal.addEventListener('click', () => this.closeModal('editModal'));
        cancelEdit.addEventListener('click', () => this.closeModal('editModal'));
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) this.closeModal('editModal');
        });

        activityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            
            try {
                await this.saveActivity();
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });

        // History Modal
        const historyModal = document.getElementById('historyModal');
        const closeHistoryModal = document.getElementById('closeHistoryModal');
        const cancelHistoryEdit = document.getElementById('cancelHistoryEdit');
        const historyForm = document.getElementById('historyForm');
        const deleteHistoryEntry = document.getElementById('deleteHistoryEntry');

        closeHistoryModal.addEventListener('click', () => this.closeModal('historyModal'));
        cancelHistoryEdit.addEventListener('click', () => this.closeModal('historyModal'));
        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) this.closeModal('historyModal');
        });

        historyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            
            try {
                await this.saveHistoryEntry();
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });

        deleteHistoryEntry.addEventListener('click', async () => {
            deleteHistoryEntry.disabled = true;
            try {
                await this.deleteHistoryEntry();
            } finally {
                deleteHistoryEntry.disabled = false;
            }
        });

        // Import/Export Modal
        const importExportModal = document.getElementById('importExportModal');
        const closeImportExportModal = document.getElementById('closeImportExportModal');
        const cancelImportExport = document.getElementById('cancelImportExport');
        const importExportAction = document.getElementById('importExportAction');
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');

        // Verify elements exist before adding listeners
        if (!exportBtn || !importBtn) {
            console.error('Export or Import buttons not found in DOM');
            return;
        }

        closeImportExportModal.addEventListener('click', () => this.closeModal('importExportModal'));
        cancelImportExport.addEventListener('click', () => this.closeModal('importExportModal'));
        importExportModal.addEventListener('click', (e) => {
            if (e.target === importExportModal) this.closeModal('importExportModal');
        });

        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Export button click event fired'); // Debug log
            this.showExportModal();
        });
        importBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Import button click event fired'); // Debug log
            this.showImportModal();
        });
        importExportAction.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleImportExportAction();
        });
        
        // Add touch event handlers for better Safari mobile support
        exportBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('Export button touchend event fired'); // Debug log
            this.showExportModal();
        });
        importBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('Import button touchend event fired'); // Debug log
            this.showImportModal();
        });
        importExportAction.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleImportExportAction();
        });
    }

    // Navigation
    openNav() {
        const navMenu = document.getElementById('navMenu');
        const overlay = document.getElementById('overlay');
        navMenu.classList.add('open');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeNav() {
        const navMenu = document.getElementById('navMenu');
        const overlay = document.getElementById('overlay');
        navMenu.classList.remove('open');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }

    showScreen(screenName) {
        // Hide all screens
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.remove('active'));

        // Show selected screen
        const targetScreen = document.getElementById(screenName + 'Screen');
        if (targetScreen) {
            targetScreen.classList.add('active');
        }

        // Update nav items
        const navItems = document.querySelectorAll('.nav-items a');
        navItems.forEach(item => item.classList.remove('active'));
        const activeNavItem = document.querySelector(`[data-screen="${screenName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Update screen title
        const titles = {
            routine: 'Daily Routine',
            history: 'History',
            schedule: 'Schedule',
            settings: 'Settings'
        };
        document.getElementById('screenTitle').textContent = titles[screenName] || 'Daily Routine';

        // Update screen-specific content
        if (screenName === 'history') {
            this.renderHistory();
        } else if (screenName === 'schedule') {
            this.renderSchedule();
        } else if (screenName === 'routine') {
            this.showCurrentActivity();
        } else if (screenName === 'settings') {
            this.updateSettingsScreen();
        }
    }

    // Routine Screen Logic
    async showCurrentActivity() {
        const todayActivities = this.getTodayActivities();
        
        if (todayActivities.length === 0) {
            document.getElementById('currentActivity').textContent = 'No activities for today';
            document.getElementById('activityMeta').textContent = '';
            return;
        }

        // Ensure we don't go out of bounds
        if (this.currentActivityIndex >= todayActivities.length) {
            this.currentActivityIndex = 0;
        }

        const currentActivity = todayActivities[this.currentActivityIndex];
        document.getElementById('currentActivity').textContent = currentActivity.name;
        
        let metaText = '';
        if (currentActivity.time) {
            metaText = `Suggested time: ${this.formatTime(currentActivity.time)}`;
        }
        document.getElementById('activityMeta').textContent = metaText;

        await this.saveData();
    }

    getTodayActivities() {
        const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
        
        return this.activities.filter(activity => 
            activity.days.includes(todayKey)
        );
    }

    async completeActivity() {
        const todayActivities = this.getTodayActivities();
        if (todayActivities.length === 0) return;

        const currentActivity = todayActivities[this.currentActivityIndex];
        
        // Mark that user has made edits (completing an activity counts as an edit)
        this.userHasMadeEdits = true;
        
        // Add to history
        this.history.unshift({
            id: Date.now(),
            activityName: currentActivity.name,
            timestamp: new Date().toISOString(),
            skipped: false
        });

        await this.nextActivity();
    }

    async skipActivity() {
        const todayActivities = this.getTodayActivities();
        if (todayActivities.length === 0) return;

        const currentActivity = todayActivities[this.currentActivityIndex];
        
        // Mark that user has made edits (skipping an activity counts as an edit)
        this.userHasMadeEdits = true;
        
        // Add to history as skipped
        this.history.unshift({
            id: Date.now(),
            activityName: currentActivity.name,
            timestamp: new Date().toISOString(),
            skipped: true
        });

        await this.nextActivity();
    }

    async nextActivity() {
        const todayActivities = this.getTodayActivities();
        this.currentActivityIndex = (this.currentActivityIndex + 1) % todayActivities.length;
        this.showCurrentActivity();
        await this.saveData();
    }

    // Schedule Management
    renderSchedule() {
        const scheduleList = document.getElementById('scheduleList');
        scheduleList.innerHTML = '';

        this.activities.forEach((activity, index) => {
            const scheduleItem = document.createElement('div');
            scheduleItem.className = `schedule-item ${activity.locked ? 'locked' : ''}`;
            scheduleItem.draggable = !activity.locked;
            scheduleItem.dataset.index = index;

            const daysText = this.formatDays(activity.days);
            const timeText = activity.time ? ` at ${this.formatTime(activity.time)}` : '';

            scheduleItem.innerHTML = `
                <div class="schedule-info">
                    <h3>${activity.name}</h3>
                    <p>${daysText}${timeText}</p>
                </div>
                <div class="schedule-actions">
                    <button class="edit-btn" onclick="app.editActivity(${index})" ${activity.locked ? 'disabled' : ''}>
                        Edit
                    </button>
                    <button class="delete-btn" onclick="app.deleteActivity(${index})" ${activity.locked ? 'disabled' : ''}>
                        Delete
                    </button>
                </div>
            `;

            // Add drag and drop event listeners
            if (!activity.locked) {
                this.addDragAndDropListeners(scheduleItem, index);
            }

            scheduleList.appendChild(scheduleItem);
        });
    }

    addDragAndDropListeners(item, index) {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const targetIndex = index;
            
            if (draggedIndex !== targetIndex && !this.activities[targetIndex].locked) {
                await this.reorderActivities(draggedIndex, targetIndex);
            }
        });
    }

    async reorderActivities(fromIndex, toIndex) {
        // Don't allow reordering the locked "Wake Up" item
        if (this.activities[fromIndex].locked || this.activities[toIndex].locked) {
            return;
        }

        // Mark that user has made edits
        this.userHasMadeEdits = true;
        
        const item = this.activities.splice(fromIndex, 1)[0];
        this.activities.splice(toIndex, 0, item);
        
        await this.saveData();
        this.renderSchedule();
    }

    editActivity(index) {
        if (this.activities[index].locked) return;

        this.currentEditingActivity = index;
        const activity = this.activities[index];

        document.getElementById('modalTitle').textContent = 'Edit Activity';
        document.getElementById('activityName').value = activity.name;
        document.getElementById('activityTime').value = activity.time;

        // Set day checkboxes
        const dayCheckboxes = document.querySelectorAll('input[name="days"]');
        dayCheckboxes.forEach(checkbox => {
            checkbox.checked = activity.days.includes(checkbox.value);
        });

        this.showModal('editModal');
    }

    async deleteActivity(index) {
        if (this.activities[index].locked) return;
        
        if (confirm('Are you sure you want to delete this activity?')) {
            // Mark that user has made edits
            this.userHasMadeEdits = true;
            
            this.activities.splice(index, 1);
            await this.saveData();
            this.renderSchedule();
        }
    }

    showAddActivityModal() {
        this.currentEditingActivity = null;
        
        document.getElementById('modalTitle').textContent = 'Add Activity';
        document.getElementById('activityName').value = '';
        document.getElementById('activityTime').value = '';

        // Check all days by default
        const dayCheckboxes = document.querySelectorAll('input[name="days"]');
        dayCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
        });

        this.showModal('editModal');
    }

    async saveActivity() {
        const name = document.getElementById('activityName').value.trim();
        if (!name) return;

        const time = document.getElementById('activityTime').value;
        const days = Array.from(document.querySelectorAll('input[name="days"]:checked'))
                         .map(checkbox => checkbox.value);

        if (days.length === 0) {
            alert('Please select at least one day.');
            return;
        }

        const activityData = {
            name,
            time,
            days,
            locked: false
        };

        // Mark that user has made edits
        this.userHasMadeEdits = true;
        
        if (this.currentEditingActivity !== null) {
            // Editing existing activity
            this.activities[this.currentEditingActivity] = {
                ...this.activities[this.currentEditingActivity],
                ...activityData
            };
        } else {
            // Adding new activity
            activityData.id = Date.now();
            this.activities.push(activityData);
        }

        await this.saveData();
        this.renderSchedule();
        this.closeModal('editModal');
    }

    // History Management
    renderHistory() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';

        if (this.history.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">No history yet. Complete some activities to see them here!</p>';
            return;
        }

        this.history.forEach((entry, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${entry.skipped ? 'skipped' : ''}`;

            const timestamp = new Date(entry.timestamp);
            const timeStr = entry.skipped ? 'Skipped' : timestamp.toLocaleString();

            historyItem.innerHTML = `
                <div class="history-info">
                    <h3>${entry.activityName}</h3>
                    <p>${timeStr}</p>
                </div>
                <div class="history-actions">
                    <button class="edit-history-btn" onclick="app.editHistoryEntry(${index})">
                        Edit
                    </button>
                </div>
            `;

            historyList.appendChild(historyItem);
        });
    }

    editHistoryEntry(index) {
        this.currentEditingHistory = index;
        const entry = this.history[index];

        const timestamp = new Date(entry.timestamp);
        const dateTimeString = timestamp.toISOString().slice(0, 16); // Format for datetime-local input

        document.getElementById('historyTimestamp').value = dateTimeString;
        document.getElementById('historySkipped').checked = entry.skipped;

        this.showModal('historyModal');
    }

    async saveHistoryEntry() {
        if (this.currentEditingHistory === null) return;

        const timestamp = document.getElementById('historyTimestamp').value;
        const skipped = document.getElementById('historySkipped').checked;

        this.history[this.currentEditingHistory] = {
            ...this.history[this.currentEditingHistory],
            timestamp: new Date(timestamp).toISOString(),
            skipped
        };

        await this.saveData();
        this.renderHistory();
        this.closeModal('historyModal');
    }

    async deleteHistoryEntry() {
        if (this.currentEditingHistory === null) return;

        if (confirm('Are you sure you want to delete this history entry?')) {
            this.history.splice(this.currentEditingHistory, 1);
            await this.saveData();
            this.renderHistory();
            this.closeModal('historyModal');
        }
    }

    async clearHistory() {
        if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
            this.history = [];
            await this.saveData();
            this.renderHistory();
        }
    }

    // Import/Export Functionality
    showExportModal() {
        console.log('Export button clicked'); // Debug log
        this.currentImportExportMode = 'export';
        const jsonData = this.exportActivitiesToJson();
        
        document.getElementById('importExportTitle').textContent = 'Export Activities';
        document.getElementById('jsonData').value = jsonData;
        document.getElementById('jsonData').readOnly = true;
        document.getElementById('importExportAction').textContent = 'Copy';
        
        this.showModal('importExportModal');
    }

    showImportModal() {
        console.log('Import button clicked'); // Debug log
        this.currentImportExportMode = 'import';
        
        document.getElementById('importExportTitle').textContent = 'Import Activities';
        document.getElementById('jsonData').value = '';
        document.getElementById('jsonData').readOnly = false;
        document.getElementById('importExportAction').textContent = 'Import';
        
        this.showModal('importExportModal');
    }

    exportActivitiesToJson() {
        // Create a simplified representation of activities
        const exportData = this.activities.map(activity => {
            const exportActivity = {};
            
            // Always include name
            if (activity.name) exportActivity.name = activity.name;
            
            // Include days if present
            if (activity.days && activity.days.length > 0) {
                exportActivity.days = activity.days;
            }
            
            // Include time if present
            if (activity.time) exportActivity.time = activity.time;
            
            // Include locked status if it's different from default (false)
            if (activity.locked) exportActivity.locked = activity.locked;
            
            // Include any other properties dynamically
            Object.keys(activity).forEach(key => {
                if (!['id', 'name', 'days', 'time', 'locked'].includes(key)) {
                    exportActivity[key] = activity[key];
                }
            });
            
            return exportActivity;
        });
        
        return JSON.stringify(exportData, null, 2);
    }

    handleImportExportAction() {
        try {
            if (this.currentImportExportMode === 'export') {
                this.copyToClipboard();
            } else if (this.currentImportExportMode === 'import') {
                this.importActivitiesFromJson();
            }
        } catch (error) {
            console.error('Error in import/export action:', error);
            alert('An error occurred. Please try again.');
        }
    }

    async copyToClipboard() {
        const jsonData = document.getElementById('jsonData').value;
        
        try {
            // Enhanced Safari clipboard compatibility check
            const hasClipboardAPI = navigator.clipboard && 
                                  window.isSecureContext && 
                                  typeof navigator.clipboard.writeText === 'function';
            
            if (hasClipboardAPI) {
                // Test clipboard availability with a small timeout for Safari
                const clipboardPromise = navigator.clipboard.writeText(jsonData);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Clipboard timeout')), 3000)
                );
                
                await Promise.race([clipboardPromise, timeoutPromise]);
                this.showCopyFeedback();
            } else {
                // Immediate fallback for Safari issues
                this.fallbackCopyToClipboard(jsonData);
            }
            
        } catch (err) {
            console.log('Clipboard API failed, trying fallback', err);
            // Fallback for older browsers or when clipboard API fails
            this.fallbackCopyToClipboard(jsonData);
        }
    }
    
    fallbackCopyToClipboard(text) {
        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        
        // Focus and select the text
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showCopyFeedback();
            } else {
                this.showManualCopyModal(text);
            }
        } catch (err) {
            console.log('execCommand failed', err);
            this.showManualCopyModal(text);
        } finally {
            document.body.removeChild(textarea);
        }
    }
    
    showCopyFeedback() {
        // Provide visual feedback
        const button = document.getElementById('importExportAction');
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.background = '#4CAF50';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }
    
    showManualCopyModal(text) {
        // If automated copy fails, show manual copy instructions
        alert('Unable to copy automatically. Please manually select and copy the text from the text area.');
        
        // Re-select the text in the textarea for manual copying
        const textarea = document.getElementById('jsonData');
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, 99999);
    }

    importActivitiesFromJson() {
        const jsonData = document.getElementById('jsonData').value.trim();
        
        if (!jsonData) {
            alert('Please paste JSON data to import.');
            return;
        }
        
        try {
            const importedData = JSON.parse(jsonData);
            
            if (!Array.isArray(importedData)) {
                throw new Error('JSON data must be an array of activities');
            }
            
            // Validate the imported data
            const validatedActivities = this.validateImportedActivities(importedData);
            
            //if (confirm(`This will replace all ${this.activities.length} existing activities with ${validatedActivities.length} imported activities. Are you sure?`)) {
                // Mark that user has made edits
                this.userHasMadeEdits = true;
                
                this.activities = validatedActivities;
                this.currentActivityIndex = 0; // Reset to first activity
                this.saveData();
                this.renderSchedule();
                this.closeModal('importExportModal');
                alert('Activities imported successfully!');
            //} 
            
        } catch (error) {
            alert(`Error importing JSON data: ${error.message}`);
        }
    }

    validateImportedActivities(importedData) {
        return importedData.map((activity, index) => {
            const validatedActivity = {
                id: Date.now() + index, // Generate new IDs
                name: activity.name || `Activity ${index + 1}`, // Default name if missing
                days: activity.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], // Default to all days
                time: activity.time || '', // Default to empty time
                locked: activity.locked || false // Default to unlocked
            };
            
            // Validate days array
            if (Array.isArray(validatedActivity.days)) {
                const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                validatedActivity.days = validatedActivity.days.filter(day => validDays.includes(day));
                
                // If no valid days remain, default to all days
                if (validatedActivity.days.length === 0) {
                    validatedActivity.days = validDays;
                }
            } else {
                validatedActivity.days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
            }
            
            // Copy any additional properties dynamically
            Object.keys(activity).forEach(key => {
                if (!['id', 'name', 'days', 'time', 'locked'].includes(key)) {
                    validatedActivity[key] = activity[key];
                }
            });
            
            return validatedActivity;
        });
    }

    // Modal Management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Enhanced Safari mobile compatibility
        if (modalId === 'importExportModal') {
            // Ensure the modal is fully visible on mobile Safari
            setTimeout(() => {
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    // Safari-specific scroll fix
                    try {
                        modalContent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } catch (e) {
                        // Fallback for older Safari versions
                        modalContent.scrollIntoView(false);
                    }
                }
                
                // Safari iOS focus fix for text areas
                const jsonTextarea = document.getElementById('jsonData');
                if (jsonTextarea && this.currentImportExportMode === 'import') {
                    // Small delay to ensure Safari processes the modal display
                    setTimeout(() => {
                        try {
                            jsonTextarea.focus();
                        } catch (focusError) {
                            console.warn('Focus failed on Safari:', focusError);
                        }
                    }, 200);
                }
            }, 100);
        }
        
        // Add escape key handling
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modalId);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        // Reset any form states when closing
        if (modalId === 'importExportModal') {
            const jsonTextarea = document.getElementById('jsonData');
            if (jsonTextarea) {
                jsonTextarea.blur(); // Remove focus to hide keyboard on mobile
            }
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.style.overflow = '';
    }

    // Utility Functions
    formatTime(timeString) {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    formatDays(days) {
        const dayNames = {
            'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu',
            'fri': 'Fri', 'sat': 'Sat', 'sun': 'Sun'
        };

        if (days.length === 7) {
            return 'Every day';
        } else if (days.length === 5 && !days.includes('sat') && !days.includes('sun')) {
            return 'Weekdays';
        } else if (days.length === 2 && days.includes('sat') && days.includes('sun')) {
            return 'Weekends';
        } else {
            return days.map(day => dayNames[day]).join(', ');
        }
    }

    updateUI() {
        // This method can be used to update any global UI elements
        // Currently not needed, but kept for future enhancements
    }

    showError(message, type = 'error') {
        // Implement your error display logic
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // For now, use alert but you could implement a toast notification
        if (type === 'error') {
            alert(`Error: ${message}`);
        } else if (type === 'success') {
            console.log(`Success: ${message}`);
            // Could show a success toast instead of alert
        } else if (type === 'info') {
            alert(`Info: ${message}`);
        }
    }
}

// Unregister any existing service worker that might be causing issues
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for (let registration of registrations) {
            registration.unregister().then(function(boolean) {
                console.log('Service worker unregistered:', boolean);
            });
        }
    });
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DailyRoutineApp();
});

