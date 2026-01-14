# Daily Routine App

A simple, mobile-friendly web app for managing daily routines with guided step-by-step navigation.

## Features

- **Routine Screen**: Step through activities one at a time with large "Done" and "Skip" buttons
- **History Tracking**: View completed and skipped activities with timestamps
- **Schedule Management**: Add, edit, reorder, and customize activities
- **Mobile-First Design**: Optimized for touch interfaces with smooth animations
- **Local Storage**: All data saved locally in browser
- **PWA Ready**: Can be installed as a mobile app

## Use

  - Open https://rossgrambo.github.io/routine/
    - If you make a google auth token available on your local router at `localsecrets.rossgrambo.com` (by using a real url- we get https in a way that browsers accept), this project will use the token to save your input.
    - Otherwise- localstorage will be used to save your input.
  - Edit the Schedule to fit your daily routine.
  - Open this up throughout your day to ensure you hit all of your expected routine items.
  - On iOS- you can use an app like Widget Web to make this display as a widget. Use the url param `?view=widget` for a more concise screen.

## Setup

1. Clone this repository
2. Open `index.html` in a web browser
3. For mobile app packaging, use Capacitor or Cordova

## File Structure

- `index.html` - Main HTML structure
- `styles.css` - All styles with mobile-first responsive design
- `app.js` - Main application logic and state management
- `manifest.json` - PWA manifest for app installation

## Default Activities

1. Wake Up (locked - cannot be edited/deleted)
2. Brush Teeth
3. Take vitamins
4. Shower
5. Get Dressed
6. Eat Breakfast
7. Start Work (weekdays only)
8. Lunch Break (weekdays only)
9. Wrap Up Work (weekdays only)
10. Go to Bed

## Browser Support

- Modern browsers with ES6+ support
- Local Storage support required

## License

MIT License - feel free to modify and use as needed.
