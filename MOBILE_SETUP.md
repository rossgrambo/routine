# Mobile App Setup Guide

## Prerequisites

1. **Node.js** (v16 or later)
2. **npm** or **yarn**
3. **Android Studio** (for Android builds)
4. **Xcode** (for iOS builds, macOS only)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Capacitor

```bash
npm run capacitor:init
```

### 3. Add Mobile Platforms

For Android:
```bash
npm run capacitor:add-android
```

For iOS (macOS only):
```bash
npm run capacitor:add-ios
```

### 4. Build and Sync

```bash
npm run build:capacitor
```

### 5. Open in Native IDE

For Android:
```bash
npm run capacitor:open-android
```

For iOS:
```bash
npm run capacitor:open-ios
```

## Alternative: Cordova Setup

### 1. Install Cordova CLI

```bash
npm install -g cordova
```

### 2. Create Cordova Project

```bash
cordova create dailyroutine com.example.dailyroutine "Daily Routine"
cd dailyroutine
```

### 3. Copy Web Files

Copy all files from this directory to the `www` folder in your Cordova project.

### 4. Add Platforms

```bash
cordova platform add android
cordova platform add ios
```

### 5. Build

```bash
cordova build android
cordova build ios
```

## Testing Locally

To test the web version locally:

```bash
npm start
```

Then open http://localhost:8000 in your browser.

## Features Working in Mobile App

- ✅ Local data storage
- ✅ Touch-friendly interface
- ✅ Offline functionality
- ✅ Native navigation
- ✅ App installation
- ✅ Splash screen (Capacitor)
- ✅ Status bar styling

## Customization

### App Icon

Replace the placeholder icons:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)

### App Information

Edit `capacitor.config.json`:
- Change `appId` to your unique identifier
- Update `appName` as needed

### Splash Screen

Customize splash screen in `capacitor.config.json` under the `SplashScreen` plugin configuration.

## Deployment

### Android
1. Open in Android Studio: `npm run capacitor:open-android`
2. Build signed APK or AAB for Play Store
3. Upload to Google Play Console

### iOS
1. Open in Xcode: `npm run capacitor:open-ios`
2. Archive and upload to App Store Connect
3. Submit for App Store review

## Troubleshooting

### Common Issues

1. **Build errors**: Ensure all dependencies are installed
2. **Platform not found**: Run the add platform commands again
3. **Web assets not updated**: Run `npm run capacitor:sync`
4. **CORS issues**: Make sure `androidScheme` is set to "https" in config

### Helpful Commands

```bash
# Rebuild everything
npm run capacitor:sync

# View device logs
npx cap run android
npx cap run ios

# Clean build
npx cap clean
```
