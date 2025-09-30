const CONFIG = {
    // Home Secrets Service Configuration
    HOME_SECRETS: {
        HOST: 'secretserver.local', // Your Home Secrets Server hostname (protocol will be auto-detected)
    },
    
    // Your application's spreadsheet configuration
    SPREADSHEET_ID: null, // Will be set after spreadsheet creation/discovery
    
    // Define your sheet structure
    SHEETS: {
        ACTIVITIES: 'routine-activities',
        HISTORY: 'routine-history',
        CONFIG: 'routine-config'
    },
    
    // Google Sheets API configuration
    DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
    
    // Default spreadsheet name for auto-creation
    DEFAULT_SPREADSHEET_NAME: 'Daily Routine App Data',
    
    // Local storage keys (for fallback)
    STORAGE_KEYS: {
        SPREADSHEET_ID: 'daily_routine_spreadsheet_id',
        SPREADSHEET_NAME: 'daily_routine_spreadsheet_name',
        API_KEY: 'daily_routine_api_key',
        // Keep existing keys for migration
        ACTIVITIES: 'dailyRoutine_activities',
        HISTORY: 'dailyRoutine_history',
        CURRENT_INDEX: 'dailyRoutine_currentIndex'
    },
    
    // Initial data structure for new spreadsheets
    DUMMY_DATA: {
        ACTIVITIES: [
            ['ID', 'Name', 'Days', 'Time', 'Locked', 'Created', 'Modified'],
            ['1', 'Wake Up', 'mon,tue,wed,thu,fri,sat,sun', '', 'TRUE', '2024-01-01', '2024-01-01'],
            ['2', 'Brush Teeth', 'mon,tue,wed,thu,fri,sat,sun', '', 'FALSE', '2024-01-01', '2024-01-01'],
            ['3', 'Shower', 'mon,tue,wed,thu,fri,sat,sun', '', 'FALSE', '2024-01-01', '2024-01-01'],
            ['4', 'Get Dressed', 'mon,tue,wed,thu,fri,sat,sun', '', 'FALSE', '2024-01-01', '2024-01-01'],
            ['5', 'Eat Breakfast', 'mon,tue,wed,thu,fri,sat,sun', '', 'FALSE', '2024-01-01', '2024-01-01'],
            ['6', 'Start Work', 'mon,tue,wed,thu,fri', '09:00', 'FALSE', '2024-01-01', '2024-01-01'],
            ['7', 'Lunch Break', 'mon,tue,wed,thu,fri', '12:00', 'FALSE', '2024-01-01', '2024-01-01'],
            ['8', 'Wrap Up Work', 'mon,tue,wed,thu,fri', '17:00', 'FALSE', '2024-01-01', '2024-01-01'],
            ['9', 'Be in Bed', 'mon,tue,wed,thu,fri,sat,sun', '22:00', 'FALSE', '2024-01-01', '2024-01-01']
        ],
        HISTORY: [
            ['ID', 'Activity Name', 'Timestamp', 'Skipped', 'Created'],
            ['1', 'Wake Up', '2024-01-01T08:00:00.000Z', 'FALSE', '2024-01-01T08:00:00.000Z']
        ],
        CONFIG: [
            ['Setting', 'Value', 'Modified'],
            ['app_version', '1.0.0', '2024-01-01'],
            ['current_activity_index', '0', '2024-01-01'],
            ['last_sync', '2024-01-01T00:00:00.000Z', '2024-01-01']
        ]
    },
    
    // Data sync settings
    SYNC: {
        AUTO_SYNC_INTERVAL: 30000, // 30 seconds
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000 // 1 second
    }
};