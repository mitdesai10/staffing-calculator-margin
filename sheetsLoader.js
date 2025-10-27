// ========================================
// Google Sheets Data Loader
// ========================================

let rateCardData = [];
let lastUpdateTime = null;
let refreshTimer = null;

// ========================================
// Load Data from Google Sheets
// ========================================

async function loadDataFromSheets() {
    try {
        console.log('Loading data from Google Sheets...');
        
        // Build the URL
        let url;
        if (SHEETS_CONFIG.API_KEY) {
            // With API key (more secure, higher quota)
            url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.SHEET_ID}/values/${SHEETS_CONFIG.SHEET_NAME}?key=${SHEETS_CONFIG.API_KEY}`;
        } else {
            // Public access (simple but limited)
            url = `https://docs.google.com/spreadsheets/d/${SHEETS_CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEETS_CONFIG.SHEET_NAME}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let data;
        if (SHEETS_CONFIG.API_KEY) {
            // Parse Google Sheets API response
            data = await response.json();
            rateCardData = parseGoogleSheetsAPIData(data);
        } else {
            // Parse public Google Sheets response
            const text = await response.text();
            const jsonText = text.substring(47).slice(0, -2); // Remove Google's wrapper
            data = JSON.parse(jsonText);
            rateCardData = parsePublicSheetsData(data);
        }
        
        lastUpdateTime = new Date();
        console.log(`✓ Data loaded successfully! ${rateCardData.length} roles found.`);
        console.log('Last update:', lastUpdateTime.toLocaleTimeString());
        
        // Update UI with last update time
        updateLastUpdateDisplay();
        
        // Trigger data loaded event
        if (typeof onDataLoaded === 'function') {
            onDataLoaded();
        }
        
        return true;
    } catch (error) {
        console.error('Error loading data from Google Sheets:', error);
        
        // Fallback to local data if available
        if (typeof rateCardDataBackup !== 'undefined' && rateCardDataBackup.length > 0) {
            console.log('Using backup data...');
            rateCardData = rateCardDataBackup;
            return true;
        }
        
        alert('Could not load data from Google Sheets. Please check your configuration.');
        return false;
    }
}

// ========================================
// Parse Google Sheets API Data
// ========================================

function parseGoogleSheetsAPIData(data) {
    const rows = data.values;
    if (!rows || rows.length === 0) {
        throw new Error('No data found in sheet');
    }
    
    // Skip header row (index 0)
    const dataRows = rows.slice(1);
    
    return dataRows.map(row => ({
        role: row[0] || '',
        onshore: {
            cost: parseFloat(row[1]) || 0
        },
        offshore: {
            cost: parseFloat(row[2]) || 0
        },
        nearshore: {
            cost: parseFloat(row[3]) || 0
        }
    })).filter(item => item.role); // Remove empty rows
}

// ========================================
// Parse Public Sheets Data
// ========================================

function parsePublicSheetsData(data) {
    const rows = data.table.rows;
    
    return rows.map(row => {
        const cells = row.c;
        return {
            role: cells[0]?.v || '',
            onshore: {
                cost: parseFloat(cells[1]?.v) || 0
            },
            offshore: {
                cost: parseFloat(cells[2]?.v) || 0
            },
            nearshore: {
                cost: parseFloat(cells[3]?.v) || 0
            }
        };
    }).filter(item => item.role); // Remove empty rows
}

// ========================================
// Auto-Refresh Setup
// ========================================

function startAutoRefresh() {
    if (!SHEETS_CONFIG.AUTO_REFRESH) return;
    
    // Clear existing timer
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    // Set up new timer
    refreshTimer = setInterval(() => {
        console.log('Auto-refreshing data...');
        loadDataFromSheets();
    }, SHEETS_CONFIG.REFRESH_INTERVAL);
    
    console.log(`Auto-refresh enabled: Updates every ${SHEETS_CONFIG.REFRESH_INTERVAL / 1000} seconds`);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        console.log('Auto-refresh stopped');
    }
}

// ========================================
// Manual Refresh
// ========================================

window.refreshData = async function() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
    }
    
    await loadDataFromSheets();
    
    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh Data';
    }
    
    // Reload roles dropdown if it exists
    if (typeof populateRoles === 'function') {
        populateRoles();
    }
};

// ========================================
// Update Last Update Display
// ========================================

function updateLastUpdateDisplay() {
    const display = document.getElementById('lastUpdate');
    if (display && lastUpdateTime) {
        display.textContent = `Last updated: ${lastUpdateTime.toLocaleTimeString()}`;
    }
}

// ========================================
// Initialize on Page Load
// ========================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing Google Sheets integration...');
    
    // Load data initially
    const success = await loadDataFromSheets();
    
    if (success && SHEETS_CONFIG.AUTO_REFRESH) {
        // Start auto-refresh
        startAutoRefresh();
    }
});

// ========================================
// Cleanup on Page Unload
// ========================================

window.addEventListener('beforeunload', function() {
    stopAutoRefresh();
});
