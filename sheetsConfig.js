// ========================================
// Google Sheets Configuration
// ========================================

const SHEETS_CONFIG = {
    // Your Google Sheet ID
    SHEET_ID: '1ukwdUnC1zg1KrCf1Skj1LyfwhQKOseBXSeis6swpvD4',
    
    // Leave this empty for public access (no API key needed)
    API_KEY: '',
    
    // The name of your sheet tab
    SHEET_NAME: 'Rate Card Data',
    
    // Auto-refresh interval in milliseconds (60000 = 1 minute)
    REFRESH_INTERVAL: 60000,
    
    // Enable/disable auto-refresh
    AUTO_REFRESH: true
};

// Make config available globally
window.SHEETS_CONFIG = SHEETS_CONFIG;

console.log('Google Sheets configuration loaded');
console.log('Sheet ID:', SHEETS_CONFIG.SHEET_ID);
console.log('Auto-refresh:', SHEETS_CONFIG.AUTO_REFRESH ? 'Enabled' : 'Disabled');


// ========================================
// Instructions for Setup:
// ========================================
/*
1. CREATE GOOGLE SHEET:
   - Go to Google Sheets
   - Create a new sheet or use existing
   - Name one tab "Rate Card Data"
   - Add columns: Role | Onshore Cost/hr | Offshore Cost/hr | Nearshore Cost/hr
   - Fill in your data

2. GET SHEET ID:
   - Copy the ID from your sheet URL
   - Example URL: https://docs.google.com/spreadsheets/d/1abc123xyz/edit
   - Sheet ID is: 1abc123xyz
   - Paste it in SHEET_ID above

3. MAKE SHEET PUBLIC:
   - Click "Share" button
   - Click "Change to anyone with the link"
   - Set to "Viewer"
   - Click "Done"

4. GET API KEY (Optional but recommended):
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create new API key
   - Enable Google Sheets API
   - Copy key and paste in API_KEY above
   
   OR use public access (less secure):
   - Leave API_KEY as empty string: ''
   - Make sure sheet is public

5. UPDATE THIS FILE:
   - Replace SHEET_ID with your actual ID
   - Replace API_KEY with your actual key (or leave empty)
   - Save and upload to GitHub

That's it! Your website will now pull data from Google Sheets automatically!
*/
