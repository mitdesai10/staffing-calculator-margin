// ========================================
// Global State
// ========================================

let positions = [];
let positionIdCounter = 0;
let calculationMode = null; // 'margin' or 'rate'

// ========================================
// Initialize Application
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeApp, 500);
});

function onDataLoaded() {
    console.log('Data loaded callback triggered');
    populateRoles();
}

function initializeApp() {
    populateRoles();
    setupModeToggle();
    document.getElementById('positionForm').addEventListener('submit', handleAddPosition);
    document.getElementById('clearAllBtn').addEventListener('click', handleClearAll);
}

function populateRoles() {
    const roleSelect = document.getElementById('role');
    while (roleSelect.options.length > 1) {
        roleSelect.remove(1);
    }
    
    if (rateCardData && rateCardData.length > 0) {
        rateCardData.forEach(role => {
            const option = document.createElement('option');
            option.value = role.role;
            option.textContent = role.role;
            roleSelect.appendChild(option);
        });
        console.log(`✓ ${rateCardData.length} roles loaded`);
    }
}

// ========================================
// Mode Toggle Setup
// ========================================

function setupModeToggle() {
    const marginRadio = document.getElementById('modeMargin');
    const rateRadio = document.getElementById('modeRate');
    const marginInput = document.getElementById('marginInput');
    const rateInput = document.getElementById('rateInput');
    
    marginRadio.addEventListener('change', () => {
        if (marginRadio.checked) {
            marginInput.classList.add('active');
            rateInput.classList.remove('active');
            document.getElementById('clientRate').value = '';
        }
    });
    
    rateRadio.addEventListener('change', () => {
        if (rateRadio.checked) {
            rateInput.classList.add('active');
            marginInput.classList.remove('active');
            document.getElementById('desiredMargin').value = '';
        }
    });
}

// ========================================
// Handle Add Position
// ========================================

function handleAddPosition(e) {
    e.preventDefault();
    
    const role = document.getElementById('role').value;
    const hours = parseFloat(document.getElementById('hours').value);
    const marginRadio = document.getElementById('modeMargin');
    const selectedMode = marginRadio.checked ? 'margin' : 'rate';
    
    if (!role || !hours) {
        alert('Please select a Role and enter Hours');
        return;
    }
    
    // Check if mode is locked
    if (calculationMode && calculationMode !== selectedMode) {
        alert(`You started with ${calculationMode === 'margin' ? 'Margin %' : 'Client Rate'} mode. Please clear all positions to switch modes.`);
        return;
    }
    
    const roleData = rateCardData.find(r => r.role === role);
    if (!roleData) {
        alert('Role data not found');
        return;
    }
    
    let position;
    
    if (selectedMode === 'margin') {
        // MARGIN MODE
        const desiredMarginInput = document.getElementById('desiredMargin').value;
        const desiredMargin = desiredMarginInput ? parseFloat(desiredMarginInput) / 100 : 0.70;
        
        position = {
            id: ++positionIdCounter,
            role,
            hours,
            mode: 'margin',
            desiredMargin,
            roleData
        };
        
        // Set calculation mode on first position
        if (!calculationMode) {
            calculationMode = 'margin';
            updateModeIndicator();
            lockModeInputs();
        }
    } else {
        // RATE MODE
        const clientRateInput = document.getElementById('clientRate').value;
        if (!clientRateInput) {
            alert('Please enter a Target Client Rate');
            return;
        }
        const clientRate = parseFloat(clientRateInput);
        
        position = {
            id: ++positionIdCounter,
            role,
            hours,
            mode: 'rate',
            clientRate,
            roleData
        };
        
        // Set calculation mode on first position
        if (!calculationMode) {
            calculationMode = 'rate';
            updateModeIndicator();
            lockModeInputs();
        }
    }
    
    positions.push(position);
    renderPositions();
    updateSummary();
    
    // Reset only the input fields, not the mode selection
    document.getElementById('role').value = '';
    document.getElementById('hours').value = '';
    if (calculationMode === 'margin') {
        document.getElementById('desiredMargin').value = '';
    } else {
        document.getElementById('clientRate').value = '';
    }
    
    document.getElementById('resultsPlaceholder').style.display = 'none';
    document.getElementById('positionsPanel').style.display = 'block';
    document.getElementById('summaryPanel').style.display = 'block';
}

// ========================================
// Mode Indicator
// ========================================

function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    if (calculationMode === 'margin') {
        indicator.innerHTML = '🎯 <strong>Mode:</strong> Calculating by Margin %';
        indicator.className = 'mode-indicator mode-margin';
    } else {
        indicator.innerHTML = '💰 <strong>Mode:</strong> Calculating by Client Rate';
        indicator.className = 'mode-indicator mode-rate';
    }
    indicator.style.display = 'block';
}

function lockModeInputs() {
    const marginRadio = document.getElementById('modeMargin');
    const rateRadio = document.getElementById('modeRate');
    
    if (calculationMode === 'margin') {
        rateRadio.disabled = true;
        rateRadio.parentElement.classList.add('disabled');
    } else {
        marginRadio.disabled = true;
        marginRadio.parentElement.classList.add('disabled');
    }
}

function unlockModeInputs() {
    const marginRadio = document.getElementById('modeMargin');
    const rateRadio = document.getElementById('modeRate');
    
    marginRadio.disabled = false;
    rateRadio.disabled = false;
    marginRadio.parentElement.classList.remove('disabled');
    rateRadio.parentElement.classList.remove('disabled');
}

// ========================================
// Render Positions
// ========================================

function renderPositions() {
    const positionsList = document.getElementById('positionsList');
    const positionCount = document.getElementById('positionCount');
    
    positionCount.textContent = `${positions.length} position${positions.length !== 1 ? 's' : ''}`;
    positionsList.innerHTML = '';
    
    positions.forEach(position => {
        const card = createPositionCard(position);
        positionsList.appendChild(card);
    });
}

// ========================================
// Create Position Card
// ========================================

function createPositionCard(position) {
    const card = document.createElement('div');
    card.className = 'position-card';
    
    const locations = [
        { name: 'Onshore', location: 'onshore', cost: position.roleData.onshore.cost },
        { name: 'Offshore', location: 'offshore', cost: position.roleData.offshore.cost },
        { name: 'Nearshore', location: 'nearshore', cost: position.roleData.nearshore.cost }
    ];
    
    if (position.mode === 'margin') {
        // MARGIN MODE: Calculate client rates for each location
        locations.forEach(loc => {
            loc.clientRate = loc.cost / (1 - position.desiredMargin);
            loc.totalCost = position.hours * loc.clientRate;
            loc.totalProfit = loc.totalCost - (position.hours * loc.cost);
            loc.margin = position.desiredMargin * 100;
        });
        
        locations.sort((a, b) => a.totalCost - b.totalCost);
        const best = locations[0];
        
        card.innerHTML = `
            <div class="position-header">
                <div>
                    <div class="position-title">${position.role}</div>
                    <span class="mode-badge margin">Margin Mode</span>
                </div>
                <button class="position-delete" onclick="deletePosition(${position.id})">✕</button>
            </div>
            <div class="position-metrics">
                <div class="position-metric">
                    <span class="position-metric-label">Hours</span>
                    <span class="position-metric-value">${position.hours}</span>
                </div>
                <div class="position-metric">
                    <span class="position-metric-label">Target Margin</span>
                    <span class="position-metric-value">${position.margin ? position.margin.toFixed(1) : (position.desiredMargin * 100).toFixed(1)}%</span>
                </div>
            </div>
            <div class="location-comparison-grid">
                ${locations.map(loc => `
                    <div class="location-card ${loc.location === best.location ? 'best' : ''}">
                        ${loc.location === best.location ? '<div class="best-badge">🏆 LOWEST COST</div>' : ''}
                        <div class="location-name">${loc.name}</div>
                        <div class="location-metrics">
                            <div class="metric">
                                <span class="label">Your Cost/hr</span>
                                <span class="value">${formatCurrency(loc.cost)}</span>
                            </div>
                            <div class="metric highlight">
                                <span class="label">Charge Client</span>
                                <span class="value large">${formatCurrency(loc.clientRate)}/hr</span>
                            </div>
                            <div class="metric">
                                <span class="label">Total Project</span>
                                <span class="value">${formatCurrency(loc.totalCost)}</span>
                            </div>
                            <div class="metric success">
                                <span class="label">Your Profit</span>
                                <span class="value">${formatCurrency(loc.totalProfit)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="recommendation">
                💡 <strong>Best:</strong> ${best.name} at ${formatCurrency(best.totalCost)} 
                (save ${formatCurrency(locations[2].totalCost - best.totalCost)} vs ${locations[2].name})
            </div>
        `;
    } else {
        // RATE MODE: Calculate margins for each location
        locations.forEach(loc => {
            loc.clientRate = position.clientRate;
            loc.totalCost = position.hours * loc.clientRate;
            loc.totalProfit = loc.totalCost - (position.hours * loc.cost);
            loc.margin = loc.cost > 0 ? ((loc.clientRate - loc.cost) / loc.clientRate) * 100 : 0;
        });
        
        locations.sort((a, b) => b.margin - a.margin);
        const best = locations[0];
        
        card.innerHTML = `
            <div class="position-header">
                <div>
                    <div class="position-title">${position.role}</div>
                    <span class="mode-badge rate">Rate Mode</span>
                </div>
                <button class="position-delete" onclick="deletePosition(${position.id})">✕</button>
            </div>
            <div class="position-metrics">
                <div class="position-metric">
                    <span class="position-metric-label">Hours</span>
                    <span class="position-metric-value">${position.hours}</span>
                </div>
                <div class="position-metric">
                    <span class="position-metric-label">Client Rate</span>
                    <span class="position-metric-value">${formatCurrency(position.clientRate)}/hr</span>
                </div>
            </div>
            <div class="location-comparison-grid">
                ${locations.map(loc => `
                    <div class="location-card ${loc.location === best.location ? 'best' : ''}">
                        ${loc.location === best.location ? '<div class="best-badge">🏆 BEST MARGIN</div>' : ''}
                        <div class="location-name">${loc.name}</div>
                        <div class="location-metrics">
                            <div class="metric">
                                <span class="label">Your Cost/hr</span>
                                <span class="value">${formatCurrency(loc.cost)}</span>
                            </div>
                            <div class="metric highlight">
                                <span class="label">Your Margin</span>
                                <span class="value large">${loc.margin.toFixed(1)}%</span>
                            </div>
                            <div class="metric">
                                <span class="label">Total Revenue</span>
                                <span class="value">${formatCurrency(loc.totalCost)}</span>
                            </div>
                            <div class="metric success">
                                <span class="label">Your Profit</span>
                                <span class="value">${formatCurrency(loc.totalProfit)}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="recommendation">
                💡 <strong>Best:</strong> ${best.name} with ${best.margin.toFixed(1)}% margin 
                (earn ${formatCurrency(best.totalProfit)} profit)
            </div>
        `;
    }
    
    return card;
}

// ========================================
// Delete Position
// ========================================

window.deletePosition = function(id) {
    positions = positions.filter(p => p.id !== id);
    
    if (positions.length === 0) {
        calculationMode = null;
        unlockModeInputs();
        document.getElementById('modeIndicator').style.display = 'none';
        document.getElementById('positionsPanel').style.display = 'none';
        document.getElementById('summaryPanel').style.display = 'none';
        document.getElementById('resultsPlaceholder').style.display = 'block';
    } else {
        renderPositions();
        updateSummary();
    }
};

// ========================================
// Clear All
// ========================================

function handleClearAll() {
    if (positions.length === 0) return;
    if (confirm('Clear all positions?')) {
        positions = [];
        calculationMode = null;
        unlockModeInputs();
        document.getElementById('modeIndicator').style.display = 'none';
        document.getElementById('positionsPanel').style.display = 'none';
        document.getElementById('summaryPanel').style.display = 'none';
        document.getElementById('resultsPlaceholder').style.display = 'block';
    }
}

// ========================================
// Update Summary
// ========================================

function updateSummary() {
    if (positions.length === 0) return;
    
    const summaryContent = document.getElementById('summaryContent');
    
    // Calculate totals for each location
    const locationTotals = {
        onshore: { totalCost: 0, totalProfit: 0, totalHours: 0, name: 'Onshore' },
        offshore: { totalCost: 0, totalProfit: 0, totalHours: 0, name: 'Offshore' },
        nearshore: { totalCost: 0, totalProfit: 0, totalHours: 0, name: 'Nearshore' }
    };
    
    positions.forEach(pos => {
        ['onshore', 'offshore', 'nearshore'].forEach(loc => {
            const cost = pos.roleData[loc].cost;
            let clientRate, totalCost, profit;
            
            if (pos.mode === 'margin') {
                clientRate = cost / (1 - pos.desiredMargin);
                totalCost = pos.hours * clientRate;
                profit = totalCost - (pos.hours * cost);
            } else {
                clientRate = pos.clientRate;
                totalCost = pos.hours * clientRate;
                profit = totalCost - (pos.hours * cost);
            }
            
            locationTotals[loc].totalCost += totalCost;
            locationTotals[loc].totalProfit += profit;
            locationTotals[loc].totalHours += pos.hours;
        });
    });
    
    // Find best location
    const locationsArray = Object.values(locationTotals);
    locationsArray.sort((a, b) => a.totalCost - b.totalCost);
    const best = locationsArray[0];
    const worst = locationsArray[2];
    
    summaryContent.innerHTML = `
        <div class="summary-header">
            <h3>Location Comparison Summary</h3>
            <div class="summary-stat">${positions.length} Positions · ${locationTotals.onshore.totalHours} Total Hours</div>
        </div>
        
        <div class="summary-locations">
            ${locationsArray.map(loc => {
                const isBest = loc.name === best.name;
                const margin = (loc.totalProfit / loc.totalCost) * 100;
                return `
                    <div class="summary-location ${isBest ? 'best' : ''}">
                        ${isBest ? '<div class="summary-best-badge">🏆 BEST OVERALL</div>' : ''}
                        <div class="summary-location-name">${loc.name}</div>
                        <div class="summary-location-metrics">
                            <div class="summary-metric">
                                <span class="label">Total to Client</span>
                                <span class="value">${formatCurrency(loc.totalCost)}</span>
                            </div>
                            <div class="summary-metric">
                                <span class="label">Your Profit</span>
                                <span class="value profit">${formatCurrency(loc.totalProfit)}</span>
                            </div>
                            <div class="summary-metric">
                                <span class="label">Avg Margin</span>
                                <span class="value">${margin.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        
        <div class="summary-recommendation">
            <strong>📊 Recommendation:</strong> Choose <strong>${best.name}</strong> to save 
            ${formatCurrency(worst.totalCost - best.totalCost)} vs ${worst.name} 
            (${((worst.totalCost - best.totalCost) / worst.totalCost * 100).toFixed(1)}% savings)
        </div>
    `;
}

// ========================================
// Utility Functions
// ========================================

function formatCurrency(value) {
    if (isNaN(value) || value === 0) return '$0.00';
    return `$${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}
