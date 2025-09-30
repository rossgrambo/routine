# Safari Debugging Guide

This document helps debug Safari-specific issues with the Daily Routine App.

## Steps to Debug Safari Issues

### 1. First, Test Basic Safari Compatibility
1. Open `safari-debug.html` in Safari
2. Check all the automatic tests - they should mostly show "PASS"
3. Run the manual tests by clicking the buttons
4. If any tests fail, note the specific errors

### 2. Check Safari Developer Console
1. In Safari, go to Safari > Preferences > Advanced
2. Check "Show Develop menu in menu bar"
3. Open your app in Safari
4. Go to Develop > Show Web Inspector
5. Check the Console tab for any errors

### 3. Common Safari Issues and Solutions

#### Issue: "localStorage not available"
- **Cause**: Safari private browsing mode restricts localStorage
- **Solution**: The app now falls back to sessionStorage automatically
- **Test**: Try in regular (non-private) Safari window

#### Issue: API key disappears after URL cleaning
- **Cause**: Safari URL handling differences
- **Solution**: Enhanced URL parameter parsing with fallbacks
- **Test**: Check if API key is properly saved to storage

#### Issue: Fetch requests fail
- **Cause**: Safari CORS or timeout issues
- **Solution**: Added timeout handling and explicit CORS settings
- **Test**: Check network tab in developer tools

#### Issue: Copy to clipboard fails
- **Cause**: Safari clipboard API restrictions
- **Solution**: Multiple fallback methods implemented
- **Test**: Use the "Test Clipboard" button in safari-debug.html

### 4. Safari-Specific Features Added

The following Safari compatibility features have been added:

1. **Storage Fallbacks**: 
   - localStorage → sessionStorage → in-memory fallback
   - Handles private browsing mode restrictions

2. **URL Parameter Parsing**:
   - Enhanced URLSearchParams with manual parsing fallback
   - Better error handling for URL manipulation

3. **Fetch API Enhancements**:
   - Explicit timeout handling (10 seconds)
   - CORS settings for Safari compatibility
   - Better error messages for network issues

4. **Clipboard API**:
   - Modern clipboard API with timeout
   - execCommand fallback for older Safari
   - Manual selection fallback if all else fails

5. **JSON Parsing**:
   - Enhanced error handling for JSON responses
   - Better parsing of date/timestamp fields

### 5. Debugging Steps for Your Specific Issue

Since you mentioned the app refreshes without the API key, then has Safari-specific errors:

1. **Check API Key Handling**:
   ```javascript
   // In Safari console, check:
   console.log('API Key from URL:', StorageHelper.getApiKeyFromUrl());
   console.log('API Key from storage:', StorageHelper.loadApiKey());
   ```

2. **Check Storage Availability**:
   ```javascript
   // In Safari console:
   console.log('localStorage available:', StorageHelper.isLocalStorageAvailable());
   ```

3. **Check Network Requests**:
   - Open Network tab in Safari developer tools
   - Reload the page with API key
   - Check if any requests fail with CORS or other errors

4. **Check Console Errors**:
   - Look for any red error messages
   - Look for yellow warning messages about Safari compatibility

### 6. Testing in Different Safari Modes

1. **Regular Safari**: Should work with all features
2. **Private Browsing**: Will use sessionStorage instead of localStorage
3. **Safari on iOS**: May have additional restrictions

### 7. If Issues Persist

1. **Enable Offline Mode**: The app should still work without Google Sheets
2. **Check Error Messages**: Look for specific Safari error codes
3. **Test with Simple URL**: Try loading without any parameters first
4. **Clear Safari Cache**: Safari > Develop > Empty Caches

### 8. Reporting Issues

If you find specific errors, please provide:
1. Safari version (Safari > About Safari)
2. macOS/iOS version
3. Console error messages (copy/paste text)
4. Results from safari-debug.html test page
5. Whether you're using private browsing mode

## Quick Test Commands

Run these in Safari's developer console to quickly test functionality:

```javascript
// Test storage
StorageHelper.saveApiKey('test');
console.log('Saved and retrieved:', StorageHelper.loadApiKey());

// Test URL parsing
console.log('Current URL params:', new URLSearchParams(window.location.search).toString());

// Test fetch (if you have internet)
fetch('https://httpbin.org/json').then(r => r.json()).then(console.log).catch(console.error);

// Test Safari detection
console.log('Is Safari:', /^((?!chrome|android).)*safari/i.test(navigator.userAgent));
```