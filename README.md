# Daily Routine App

A simple, mobile-friendly web app for managing daily routines with guided step-by-step navigation.

## Features

- **Routine Screen**: Step through activities one at a time with large "Done" and "Skip" buttons
- **History Tracking**: View completed and skipped activities with timestamps
- **Schedule Management**: Add, edit, reorder, and customize activities
- **Mobile-First Design**: Optimized for touch interfaces with smooth animations
- **Local Storage**: All data saved locally in browser
- **PWA Ready**: Can be installed as a mobile app

## Setup

1. Clone this repository
2. Open `index.html` in a web browser
3. For mobile app packaging, use Capacitor or Cordova

## Mobile App Packaging

### Using Capacitor

1. Install Capacitor:
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

2. Add platforms:
```bash
npx cap add ios
npx cap add android
```

3. Copy web assets and sync:
```bash
npx cap copy
npx cap sync
```

4. Open in native IDE:
```bash
npx cap open ios
npx cap open android
```

### Using Cordova

1. Install Cordova:
```bash
npm install -g cordova
```

2. Create Cordova project:
```bash
cordova create myapp com.example.dailyroutine DailyRoutine
```

3. Copy files to `www` directory
4. Add platforms and build:
```bash
cordova platform add ios android
cordova build
```

## File Structure

- `index.html` - Main HTML structure
- `styles.css` - All styles with mobile-first responsive design
- `app.js` - Main application logic and state management
- `manifest.json` - PWA manifest for app installation

## Default Activities

1. Wake Up (locked - cannot be edited/deleted)
2. Brush Teeth
3. Shower
4. Get Dressed
5. Eat Breakfast
6. Start Work (weekdays only)
7. Lunch Break (weekdays only)
8. Wrap Up Work (weekdays only)
9. Go to Bed

## Browser Support

- Modern browsers with ES6+ support
- Local Storage support required
- Service Worker support for PWA features

## License

MIT License - feel free to modify and use as needed.
