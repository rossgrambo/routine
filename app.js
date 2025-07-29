// Daily Process App - Main JavaScript File

class DailyProcessApp {
    constructor() {
        this.currentActivityIndex = 0;
        this.activities = [];
        this.history = [];
        this.currentEditingActivity = null;
        this.currentEditingHistory = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.initializeDefaultActivities();
        
        // Check for widget view mode
        if (this.isWidgetMode()) {
            this.initWidgetMode();
        } else {
            this.setupEventListeners();
            this.updateUI();
            this.showCurrentActivity();
        }
    }

    // Check if widget mode is enabled via query parameter
    isWidgetMode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('view') === 'widget';
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
                    <button class="widget-done-btn" id="widgetDoneBtn">Done</button>
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
        document.getElementById('widgetDoneBtn').addEventListener('click', () => {
            this.completeActivityWidget();
        });
        
        // Show current activity in widget view
        this.updateWidgetView();
        
        // Update widget view every 30 seconds
        setInterval(() => {
            this.updateWidgetView();
        }, 30000);
    }

    completeActivityWidget() {
        const todayActivities = this.getTodayActivities();
        if (todayActivities.length === 0) return;

        const currentActivity = todayActivities[this.currentActivityIndex];
        
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
        this.saveData();
        this.updateWidgetView();
        
        // Add a brief animation/feedback
        const btn = document.getElementById('widgetDoneBtn');
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }

    updateWidgetView() {
        const todayActivities = this.getTodayActivities();
        
        if (todayActivities.length === 0) {
            document.getElementById('widgetActivityTitle').textContent = 'No activities today';
            document.getElementById('widgetActivityMeta').textContent = '';
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
    }

    // Data Management
    loadData() {
        const savedActivities = localStorage.getItem('dailyProcess_activities');
        const savedHistory = localStorage.getItem('dailyProcess_history');
        const savedIndex = localStorage.getItem('dailyProcess_currentIndex');

        if (savedActivities) {
            this.activities = JSON.parse(savedActivities);
        }

        if (savedHistory) {
            this.history = JSON.parse(savedHistory);
        }

        if (savedIndex !== null) {
            this.currentActivityIndex = parseInt(savedIndex) || 0;
        }
    }

    saveData() {
        localStorage.setItem('dailyProcess_activities', JSON.stringify(this.activities));
        localStorage.setItem('dailyProcess_history', JSON.stringify(this.history));
        localStorage.setItem('dailyProcess_currentIndex', this.currentActivityIndex.toString());
    }

    initializeDefaultActivities() {
        if (this.activities.length === 0) {
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
            this.saveData();
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

        // Process screen
        const doneBtn = document.getElementById('doneBtn');
        const skipBtn = document.getElementById('skipBtn');

        doneBtn.addEventListener('click', () => this.completeActivity());
        skipBtn.addEventListener('click', () => this.skipActivity());

        // Schedule screen
        const addActivityBtn = document.getElementById('addActivityBtn');
        addActivityBtn.addEventListener('click', () => this.showAddActivityModal());

        // History screen
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        clearHistoryBtn.addEventListener('click', () => this.clearHistory());

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

        activityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveActivity();
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

        historyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHistoryEntry();
        });

        deleteHistoryEntry.addEventListener('click', () => this.deleteHistoryEntry());
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
            process: 'Daily Process',
            history: 'History',
            schedule: 'Schedule',
            settings: 'Settings'
        };
        document.getElementById('screenTitle').textContent = titles[screenName] || 'Daily Process';

        // Update screen-specific content
        if (screenName === 'history') {
            this.renderHistory();
        } else if (screenName === 'schedule') {
            this.renderSchedule();
        } else if (screenName === 'process') {
            this.showCurrentActivity();
        }
    }

    // Process Screen Logic
    showCurrentActivity() {
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

        this.saveData();
    }

    getTodayActivities() {
        const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
        
        return this.activities.filter(activity => 
            activity.days.includes(todayKey)
        );
    }

    completeActivity() {
        const todayActivities = this.getTodayActivities();
        if (todayActivities.length === 0) return;

        const currentActivity = todayActivities[this.currentActivityIndex];
        
        // Add to history
        this.history.unshift({
            id: Date.now(),
            activityName: currentActivity.name,
            timestamp: new Date().toISOString(),
            skipped: false
        });

        this.nextActivity();
    }

    skipActivity() {
        const todayActivities = this.getTodayActivities();
        if (todayActivities.length === 0) return;

        const currentActivity = todayActivities[this.currentActivityIndex];
        
        // Add to history as skipped
        this.history.unshift({
            id: Date.now(),
            activityName: currentActivity.name,
            timestamp: new Date().toISOString(),
            skipped: true
        });

        this.nextActivity();
    }

    nextActivity() {
        const todayActivities = this.getTodayActivities();
        this.currentActivityIndex = (this.currentActivityIndex + 1) % todayActivities.length;
        this.showCurrentActivity();
        this.saveData();
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

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const targetIndex = index;
            
            if (draggedIndex !== targetIndex && !this.activities[targetIndex].locked) {
                this.reorderActivities(draggedIndex, targetIndex);
            }
        });
    }

    reorderActivities(fromIndex, toIndex) {
        // Don't allow reordering the locked "Wake Up" item
        if (this.activities[fromIndex].locked || this.activities[toIndex].locked) {
            return;
        }

        const item = this.activities.splice(fromIndex, 1)[0];
        this.activities.splice(toIndex, 0, item);
        
        this.saveData();
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

    deleteActivity(index) {
        if (this.activities[index].locked) return;
        
        if (confirm('Are you sure you want to delete this activity?')) {
            this.activities.splice(index, 1);
            this.saveData();
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

    saveActivity() {
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

        this.saveData();
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

    saveHistoryEntry() {
        if (this.currentEditingHistory === null) return;

        const timestamp = document.getElementById('historyTimestamp').value;
        const skipped = document.getElementById('historySkipped').checked;

        this.history[this.currentEditingHistory] = {
            ...this.history[this.currentEditingHistory],
            timestamp: new Date(timestamp).toISOString(),
            skipped
        };

        this.saveData();
        this.renderHistory();
        this.closeModal('historyModal');
    }

    deleteHistoryEntry() {
        if (this.currentEditingHistory === null) return;

        if (confirm('Are you sure you want to delete this history entry?')) {
            this.history.splice(this.currentEditingHistory, 1);
            this.saveData();
            this.renderHistory();
            this.closeModal('historyModal');
        }
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
            this.history = [];
            this.saveData();
            this.renderHistory();
        }
    }

    // Modal Management
    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
        document.body.style.overflow = '';
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
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DailyProcessApp();
});

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
