// ========================================
// Global State
// ========================================

let positions = [];
let positionIdCounter = 0;

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
// Handle Add Position
// ========================================

function handleAddPosition(e) {
    e.preventDefault();
    
    const role = document.getElementById('role').value;
    const location = document.getElementById('location').value;
    const hours = parseFloat(document.getElementById('hours').value);
    const desiredMarginInput = document.getElementById('desiredMargin').value;
    const desiredMargin = desiredMarginInput ? parseFloat(desiredMarginInput) / 100 : 0.70;
    
    if (!role || !hours) {
        alert('Please select a Role and enter Hours');
        return;
    }
    
    const roleData = rateCardData.find(r => r.role === role);
    if (!roleData) {
        alert('Role data not found');
        return;
    }
    
    // If no location, this is comparison mode
    if (!location) {
        const position = {
            id: ++positionIdCounter,
            role,
            hours,
            desiredMargin,
            roleData,
            comparisonMode: true
        };
        positions.push(position);
    } else {
        const cost = roleData[location].cost;
        const clientRate = cost / (1 - desiredMargin);
        const totalCost = hours * clientRate;
        
        const position = {
            id: ++positionIdCounter,
            role,
            location,
            hours,
            desiredMargin,
            cost,
            clientRate,
            totalCost,
            roleData,
            comparisonMode: false
        };
        positions.push(position);
    }
    
    renderPositions();
    updateSummary();
    document.getElementById('positionForm').reset();
    document.getElementById('resultsPlaceholder').style.display = 'none';
    document.getElementById('positionsPanel').style.display = 'block';
    document.getElementById('summaryPanel').style.display = 'block';
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
    
    // COMPARISON MODE
    if (position.comparisonMode) {
        const locations = [
            { name: 'Onshore', location: 'onshore', cost: position.roleData.onshore.cost },
            { name: 'Offshore', location: 'offshore', cost: position.roleData.offshore.cost },
            { name: 'Nearshore', location: 'nearshore', cost: position.roleData.nearshore.cost }
        ];
        
        locations.forEach(loc => {
            loc.clientRate = loc.cost / (1 - position.desiredMargin);
            loc.totalCost = position.hours * loc.clientRate;
            loc.totalProfit = loc.totalCost - (position.hours * loc.cost);
        });
        
        locations.sort((a, b) => a.totalCost - b.totalCost);
        const best = locations[0];
        
        card.innerHTML = `
            <div class="position-header">
                <div>
                    <div class="position-title">${position.role}</div>
                    <span class="comparison-badge">📊 Comparing All Locations</span>
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
                    <span class="position-metric-value">${(position.desiredMargin * 100).toFixed(0)}%</span>
                </div>
            </div>
            <div class="all-locations-comparison">
                <div class="comparison-header">
                    <span class="comparison-icon">📊</span>
                    <span class="comparison-title">Location Comparison at ${(position.desiredMargin * 100).toFixed(0)}% Margin</span>
                </div>
                <div class="location-options-grid">
                    ${locations.map(loc => `
                        <div class="location-full-option ${loc.location === best.location ? 'best-option' : ''}">
                            ${loc.location === best.location ? '<div class="best-badge">🏆 BEST</div>' : ''}
                            <div class="location-full-name">${loc.name}</div>
                            <div class="location-full-metrics">
                                <div class="metric-row">
                                    <span class="metric-label">Your Cost/hr:</span>
                                    <span class="metric-value">${formatCurrency(loc.cost)}</span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">Charge Client/hr:</span>
                                    <span class="metric-value">${formatCurrency(loc.clientRate)}</span>
                                </div>
                                <div class="metric-row highlight">
                                    <span class="metric-label">Your Margin:</span>
                                    <span class="metric-value-large">${(position.desiredMargin * 100).toFixed(0)}%</span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">Total to Client:</span>
                                    <span class="metric-value">${formatCurrency(loc.totalCost)}</span>
                                </div>
                                <div class="metric-row">
                                    <span class="metric-label">Your Profit:</span>
                                    <span class="metric-value profit">${formatCurrency(loc.totalProfit)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="recommendation-box">
                    <strong>💡 Best Choice:</strong> <strong>${best.name}</strong> costs client ${formatCurrency(best.totalCost)} 
                    (you earn ${formatCurrency(best.totalProfit)} profit) · Save ${formatCurrency(locations[2].totalCost - best.totalCost)} vs ${locations[2].name}
                </div>
            </div>
        `;
    } 
    // STANDARD MODE
    else {
        card.innerHTML = `
            <div class="position-header">
                <div>
                    <div class="position-title">${position.role}</div>
                    <span class="position-location ${position.location}">${position.location}</span>
                </div>
                <button class="position-delete" onclick="deletePosition(${position.id})">✕</button>
            </div>
            <div class="position-metrics">
                <div class="position-metric">
                    <span class="position-metric-label">Hours</span>
                    <span class="position-metric-value">${position.hours}</span>
                </div>
                <div class="position-metric">
                    <span class="position-metric-label">Margin</span>
                    <span class="position-metric-value">${(position.desiredMargin * 100).toFixed(1)}%</span>
                </div>
                <div class="position-metric">
                    <span class="position-metric-label">Cost/hr</span>
                    <span class="position-metric-value">${formatCurrency(position.cost)}</span>
                </div>
                <div class="position-metric">
                    <span class="position-metric-label">Client Rate</span>
                    <span class="position-metric-value">${formatCurrency(position.clientRate)}</span>
                </div>
                <div class="position-metric" style="grid-column: span 2;">
                    <span class="position-metric-label">Total Cost</span>
                    <span class="position-metric-value" style="font-size: 1.25rem; color: var(--primary-blue);">${formatCurrency(position.totalCost)}</span>
                </div>
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
    
    const totalPositions = positions.length;
    let totalHours = 0;
    let totalCost = 0;
    let totalMargin = 0;
    
    positions.forEach(p => {
        totalHours += p.hours;
        totalMargin += p.desiredMargin;
        
        if (p.comparisonMode) {
            // For comparison, use offshore (cheapest usually)
            const cost = p.roleData.offshore.cost;
            const rate = cost / (1 - p.desiredMargin);
            totalCost += p.hours * rate;
        } else {
            totalCost += p.totalCost;
        }
    });
    
    const avgMargin = totalMargin / totalPositions;
    
    document.getElementById('summaryPositions').textContent = totalPositions;
    document.getElementById('summaryHours').textContent = totalHours;
    document.getElementById('summarySelected').textContent = formatCurrency(totalCost);
    document.getElementById('summaryAvgMargin').textContent = (avgMargin * 100).toFixed(1) + '%';
}

// ========================================
// Utility Functions
// ========================================

function formatCurrency(value) {
    if (isNaN(value) || value === 0) return '$0.00';
    return `$${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}
