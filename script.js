// ========================================
// Global State
// ========================================

let positions = [];
let positionIdCounter = 0;

// ========================================
// Initialize Application
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for sheets data to load
    setTimeout(initializeApp, 500);
});

// Callback when data is loaded from sheets
function onDataLoaded() {
    console.log('Data loaded callback triggered');
    populateRoles();
}

function initializeApp() {
    populateRoles();
    
    // Add event listeners
    document.getElementById('positionForm').addEventListener('submit', handleAddPosition);
    document.getElementById('clearAllBtn').addEventListener('click', handleClearAll);
}

function populateRoles() {
    const roleSelect = document.getElementById('role');
    
    // Clear existing options except the first one
    while (roleSelect.options.length > 1) {
        roleSelect.remove(1);
    }
    
    // Populate roles
    if (rateCardData && rateCardData.length > 0) {
        rateCardData.forEach(role => {
            const option = document.createElement('option');
            option.value = role.role;
            option.textContent = role.role;
            roleSelect.appendChild(option);
        });
        console.log(`✓ ${rateCardData.length} roles loaded into dropdown`);
    } else {
        console.warn('No rate card data available');
    }
}

// ========================================
// Handle Add Position
// ========================================

function handleAddPosition(e) {
    e.preventDefault();
    
    console.log('Add position clicked');
    
    // Get form values
    const role = document.getElementById('role').value;
    const location = document.getElementById('location').value;
    const hours = parseFloat(document.getElementById('hours').value);
    const desiredMarginInput = document.getElementById('desiredMargin').value;
    
    // If no margin provided, we'll calculate for all locations
    const desiredMargin = desiredMarginInput ? parseFloat(desiredMarginInput) / 100 : null;
    
    console.log('Form values:', { role, location, hours, desiredMargin });
    
    // Validate
    if (!role || !location || !hours) {
        alert('Please fill in Role, Location, and Hours');
        return;
    }
    
    // Get role data
    const roleData = rateCardData.find(r => r.role === role);
    
    console.log('Role data:', roleData);
    
    if (!roleData) {
        alert('Role data not found');
        return;
    }
    
    // Calculate position data
    const cost = roleData[location].cost;
    
    // If margin is provided, use it. Otherwise, use a default (e.g., 60%)
    const effectiveMargin = desiredMargin !== null ? desiredMargin : 0.60;
    
    const clientRate = cost > 0 ? cost / (1 - effectiveMargin) : 0;
    const totalCost = hours * clientRate;
    
    console.log('Calculated:', { cost, clientRate, totalCost });
    
    // Create position object
    const position = {
        id: ++positionIdCounter,
        role,
        location,
        hours,
        desiredMargin: effectiveMargin,
        marginProvided: desiredMargin !== null, // Track if user provided margin
        cost,
        clientRate,
        totalCost,
        roleData
    };
    
    // Add to positions array
    positions.push(position);
    
    console.log('Total positions:', positions.length);
    
    // Update UI
    renderPositions();
    updateSummary();
    
    // Reset form
    document.getElementById('positionForm').reset();
    
    // Show results, hide placeholder
    document.getElementById('resultsPlaceholder').style.display = 'none';
    document.getElementById('positionsPanel').style.display = 'block';
    document.getElementById('summaryPanel').style.display = 'block';
    
    console.log('Position added successfully');
}

// ========================================
// Render Positions
// ========================================

function renderPositions() {
    const positionsList = document.getElementById('positionsList');
    const positionCount = document.getElementById('positionCount');
    
    // Update count
    positionCount.textContent = `${positions.length} position${positions.length !== 1 ? 's' : ''}`;
    
    // Clear list
    positionsList.innerHTML = '';
    
    // Render each position
    positions.forEach(position => {
        const card = createPositionCard(position);
        positionsList.appendChild(card);
    });
}

// ========================================
// Create Position Card
// ========================================

function createPositionCard(position) {
    // Calculate margins for all three locations
    const onshoreMargin = position.roleData.onshore.cost > 0 
        ? ((position.clientRate - position.roleData.onshore.cost) / position.clientRate) * 100 
        : 0;
    const offshoreMargin = position.roleData.offshore.cost > 0 
        ? ((position.clientRate - position.roleData.offshore.cost) / position.clientRate) * 100 
        : 0;
    const nearshoreMargin = position.roleData.nearshore.cost > 0 
        ? ((position.clientRate - position.roleData.nearshore.cost) / position.clientRate) * 100 
        : 0;
    
    // Find best location
    const margins = [
        { location: 'onshore', margin: onshoreMargin, cost: position.roleData.onshore.cost, displayName: 'Onshore' },
        { location: 'offshore', margin: offshoreMargin, cost: position.roleData.offshore.cost, displayName: 'Offshore' },
        { location: 'nearshore', margin: nearshoreMargin, cost: position.roleData.nearshore.cost, displayName: 'Nearshore' }
    ];
    
    margins.sort((a, b) => b.margin - a.margin);
    const bestLocation = margins[0];
    
    // Calculate savings vs current selection
    const currentMargin = (position.desiredMargin * 100);
    const savingsVsBest = bestLocation.margin - currentMargin;
    const bestTotalCost = position.hours * (bestLocation.cost / (1 - position.desiredMargin));
    const potentialSavings = position.totalCost - bestTotalCost;
    
    const card = document.createElement('div');
    card.className = 'position-card';
    
    // Different display based on whether margin was provided
    if (!position.marginProvided) {
        // Show all three options with best highlighted
        card.innerHTML = `
            <div class="position-header">
                <div>
                    <div class="position-title">${position.role}</div>
                    <span class="position-location ${position.location}">${position.location} (assumed)</span>
                </div>
                <button class="position-delete" onclick="deletePosition(${position.id})" title="Delete">✕</button>
            </div>
            <div class="position-metrics">
                <div class="position-metric">
                    <span class="position-metric-label">Hours</span>
                    <span class="position-metric-value">${position.hours}</span>
                </div>
                <div class="position-metric">
                    <span class="position-metric-label">Margin Used (Default)</span>
                    <span class="position-metric-value">${formatPercentage(position.desiredMargin)}</span>
                </div>
            </div>
            
            <!-- All Locations Comparison -->
            <div class="all-locations-comparison">
                <div class="comparison-header">
                    <span class="comparison-icon">📊</span>
                    <span class="comparison-title">Margin Analysis by Location</span>
                </div>
                <div class="location-options-grid">
                    ${margins.map((loc, index) => {
                        const clientRate = loc.cost / (1 - position.desiredMargin);
                        const totalCost = position.hours * clientRate;
                        const isBest = index === 0;
                        return `
                            <div class="location-full-option ${isBest ? 'best-option' : ''}">
                                ${isBest ? '<div class="best-badge">🏆 BEST MARGIN</div>' : ''}
                                <div class="location-full-name">${loc.displayName}</div>
                                <div class="location-full-metrics">
                                    <div class="metric-row">
                                        <span class="metric-label">Your Cost/hr:</span>
                                        <span class="metric-value">${formatCurrency(loc.cost)}</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Charge Client:</span>
                                        <span class="metric-value">${formatCurrency(clientRate)}</span>
                                    </div>
                                    <div class="metric-row highlight">
                                        <span class="metric-label">Your Margin:</span>
                                        <span class="metric-value-large">${loc.margin.toFixed(1)}%</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Total Project:</span>
                                        <span class="metric-value">${formatCurrency(totalCost)}</span>
                                    </div>
                                    <div class="metric-row">
                                        <span class="metric-label">Your Profit:</span>
                                        <span class="metric-value profit">${formatCurrency(totalCost - (position.hours * loc.cost))}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="recommendation-box">
                    <strong>💡 Recommendation:</strong> Choose <strong>${bestLocation.displayName}</strong> for ${bestLocation.margin.toFixed(1)}% margin 
                    (earn ${formatCurrency((position.hours * (bestLocation.cost / (1 - position.desiredMargin))) - (position.hours * bestLocation.cost))} profit)
                </div>
            </div>
        `;
    } else {
        // Original display with margin provided
        card.innerHTML = `
            <div class="position-header">
                <div>
                    <div class="position-title">${position.role}</div>
                    <span class="position-location ${position.location}">${position.location}</span>
                </div>
                <button class="position-delete" onclick="deletePosition(${position.id})" title="Delete">✕</button>
            </div>
            <div class="position-metrics">
                <div class="position-metric">
                    <span class="position-metric-label">Hours</span>
                    <span class="position-metric-value">${position.hours}</span>
                </div>
                <div class="position-metric">
                    <span class="position-metric-label">Desired Margin</span>
                    <span class="position-metric-value">${formatPercentage(position.desiredMargin)}</span>
                </div>
                <div class="position-metric">
                    <span class="position-metric-label">My Cost/hr</span>
                    <span class="position-metric-value">${formatCurrency(position.cost)}</span>
                </div>
                <div class="position-metric">
                    <span class="position-metric-label">Client Rate/hr</span>
                    <span class="position-metric-value">${formatCurrency(position.clientRate)}</span>
                </div>
                <div class="position-metric" style="grid-column: span 2;">
                    <span class="position-metric-label">Total Cost to Client</span>
                    <span class="position-metric-value" style="font-size: 1.25rem; color: var(--primary-blue);">${formatCurrency(position.totalCost)}</span>
                </div>
            </div>
            
            <!-- Best Location Analysis -->
            <div class="best-location-card">
                <div class="best-location-header">
                    <span class="best-location-icon">🏆</span>
                    <span class="best-location-title">Best Location Analysis</span>
                </div>
                <div class="location-comparison">
                    <div class="location-option ${position.location === 'onshore' ? 'selected' : ''} ${bestLocation.location === 'onshore' ? 'best' : ''}">
                        <div class="location-option-name">Onshore</div>
                        <div class="location-option-margin">${onshoreMargin.toFixed(1)}%</div>
                        ${bestLocation.location === 'onshore' ? '<div class="location-badge">Best</div>' : ''}
                    </div>
                    <div class="location-option ${position.location === 'offshore' ? 'selected' : ''} ${bestLocation.location === 'offshore' ? 'best' : ''}">
                        <div class="location-option-name">Offshore</div>
                        <div class="location-option-margin">${offshoreMargin.toFixed(1)}%</div>
                        ${bestLocation.location === 'offshore' ? '<div class="location-badge">Best</div>' : ''}
                    </div>
                    <div class="location-option ${position.location === 'nearshore' ? 'selected' : ''} ${bestLocation.location === 'nearshore' ? 'best' : ''}">
                        <div class="location-option-name">Nearshore</div>
                        <div class="location-option-margin">${nearshoreMargin.toFixed(1)}%</div>
                        ${bestLocation.location === 'nearshore' ? '<div class="location-badge">Best</div>' : ''}
                    </div>
                </div>
                ${position.location !== bestLocation.location ? `
                    <div class="savings-alert">
                        <strong>💰 Potential Savings:</strong> Switch to ${bestLocation.displayName} to gain ${savingsVsBest.toFixed(1)}% more margin (save ${formatCurrency(Math.abs(potentialSavings))})
                    </div>
                ` : `
                    <div class="optimal-choice">
                        ✅ You've selected the optimal location!
                    </div>
                `}
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
        // Show placeholder if no positions
        document.getElementById('positionsPanel').style.display = 'none';
        document.getElementById('summaryPanel').style.display = 'none';
        document.getElementById('resultsPlaceholder').style.display = 'block';
    } else {
        renderPositions();
        updateSummary();
    }
}

// ========================================
// Clear All Positions
// ========================================

function handleClearAll() {
    if (positions.length === 0) return;
    
    if (confirm('Are you sure you want to clear all positions?')) {
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
    
    // Calculate totals
    const totalPositions = positions.length;
    const totalHours = positions.reduce((sum, p) => sum + p.hours, 0);
    const avgClientRate = positions.reduce((sum, p) => sum + p.clientRate, 0) / totalPositions;
    const avgDesiredMargin = positions.reduce((sum, p) => sum + p.desiredMargin, 0) / totalPositions;
    const totalSelected = positions.reduce((sum, p) => sum + p.totalCost, 0);
    
    // Calculate "what if" scenarios with average margins for each location
    let totalOnshore = 0;
    let totalOffshore = 0;
    let totalNearshore = 0;
    
    let onshoreMarginSum = 0;
    let offshoreMarginSum = 0;
    let nearshoreMarginSum = 0;
    let onshoreCount = 0;
    let offshoreCount = 0;
    let nearshoreCount = 0;
    
    positions.forEach(p => {
        const onshoreCost = p.roleData.onshore.cost;
        const offshoreCost = p.roleData.offshore.cost;
        const nearshoreCost = p.roleData.nearshore.cost;
        
        const onshoreRate = onshoreCost > 0 ? onshoreCost / (1 - p.desiredMargin) : 0;
        const offshoreRate = offshoreCost > 0 ? offshoreCost / (1 - p.desiredMargin) : 0;
        const nearshoreRate = nearshoreCost > 0 ? nearshoreCost / (1 - p.desiredMargin) : 0;
        
        totalOnshore += p.hours * onshoreRate;
        totalOffshore += p.hours * offshoreRate;
        totalNearshore += p.hours * nearshoreRate;
        
        // Calculate actual margins achieved
        if (onshoreRate > 0) {
            const onshoreActualMargin = (onshoreRate - onshoreCost) / onshoreRate;
            onshoreMarginSum += onshoreActualMargin;
            onshoreCount++;
        }
        
        if (offshoreRate > 0) {
            const offshoreActualMargin = (offshoreRate - offshoreCost) / offshoreRate;
            offshoreMarginSum += offshoreActualMargin;
            offshoreCount++;
        }
        
        if (nearshoreRate > 0) {
            const nearshoreActualMargin = (nearshoreRate - nearshoreCost) / nearshoreRate;
            nearshoreMarginSum += nearshoreActualMargin;
            nearshoreCount++;
        }
    });
    
    // Calculate average margins for each location
    const avgOnshoreMargin = onshoreCount > 0 ? onshoreMarginSum / onshoreCount : 0;
    const avgOffshoreMargin = offshoreCount > 0 ? offshoreMarginSum / offshoreCount : 0;
    const avgNearshoreMargin = nearshoreCount > 0 ? nearshoreMarginSum / nearshoreCount : 0;
    
    // Update UI
    document.getElementById('summaryPositions').textContent = totalPositions;
    document.getElementById('summaryHours').textContent = totalHours;
    document.getElementById('summaryAvgRate').textContent = formatCurrency(avgClientRate);
    document.getElementById('summaryAvgMargin').textContent = formatPercentage(avgDesiredMargin);
    
    document.getElementById('summaryOnshore').textContent = formatCurrency(totalOnshore);
    document.getElementById('summaryOnshoreMargin').textContent = `at ${formatPercentage(avgOnshoreMargin)} margin`;
    
    document.getElementById('summaryOffshore').textContent = formatCurrency(totalOffshore);
    document.getElementById('summaryOffshoreMargin').textContent = `at ${formatPercentage(avgOffshoreMargin)} margin`;
    
    document.getElementById('summaryNearshore').textContent = formatCurrency(totalNearshore);
    document.getElementById('summaryNearshoreMargin').textContent = `at ${formatPercentage(avgNearshoreMargin)} margin`;
    
    document.getElementById('summarySelected').textContent = formatCurrency(totalSelected);
    document.getElementById('summarySelectedMargin').textContent = `at ${formatPercentage(avgDesiredMargin)} avg margin`;
    
    // Best location analysis
    updateBestLocationSummary(totalOnshore, totalOffshore, totalNearshore, totalSelected, avgOnshoreMargin, avgOffshoreMargin, avgNearshoreMargin);
}

// ========================================
// Update Best Location Summary
// ========================================

function updateBestLocationSummary(onshore, offshore, nearshore, selected, onshoreMargin, offshoreMargin, nearshoreMargin) {
    const summaryDiv = document.getElementById('bestLocationSummary');
    const contentDiv = document.getElementById('bestLocationContent');
    
    // Find best option
    const options = [
        { name: 'All Onshore', cost: onshore, margin: onshoreMargin, location: 'onshore' },
        { name: 'All Offshore', cost: offshore, margin: offshoreMargin, location: 'offshore' },
        { name: 'All Nearshore', cost: nearshore, margin: nearshoreMargin, location: 'nearshore' }
    ];
    
    // Sort by lowest cost (best for client)
    options.sort((a, b) => a.cost - b.cost);
    const bestOption = options[0];
    const worstOption = options[2];
    
    // Calculate savings
    const savingsVsWorst = worstOption.cost - bestOption.cost;
    const savingsVsCurrent = selected - bestOption.cost;
    const marginGain = (bestOption.margin - (savingsVsCurrent / selected)) * 100;
    
    // Count positions by location
    const locationCounts = {
        onshore: positions.filter(p => p.location === 'onshore').length,
        offshore: positions.filter(p => p.location === 'offshore').length,
        nearshore: positions.filter(p => p.location === 'nearshore').length
    };
    
    // Generate content
    let html = `
        <div class="best-option-card">
            <div class="best-option-badge">🏆 Best Overall Strategy</div>
            <div class="best-option-name">${bestOption.name}</div>
            <div class="best-option-details">
                <div class="best-option-metric">
                    <span class="label">Total Cost:</span>
                    <span class="value">${formatCurrency(bestOption.cost)}</span>
                </div>
                <div class="best-option-metric">
                    <span class="label">Avg Margin:</span>
                    <span class="value">${formatPercentage(bestOption.margin)}</span>
                </div>
            </div>
        </div>
        
        <div class="savings-comparison">
            <div class="savings-item">
                <span class="savings-label">💰 Savings vs Most Expensive (${worstOption.name}):</span>
                <span class="savings-value">${formatCurrency(savingsVsWorst)}</span>
            </div>
    `;
    
    if (savingsVsCurrent > 100) {
        html += `
            <div class="savings-item alert">
                <span class="savings-label">⚠️ Potential Savings vs Your Current Mix:</span>
                <span class="savings-value">${formatCurrency(savingsVsCurrent)}</span>
            </div>
            <div class="recommendation">
                <strong>Recommendation:</strong> Consider switching more positions to ${bestOption.location} to maximize margin!
            </div>
        `;
    } else {
        html += `
            <div class="savings-item success">
                <span class="savings-label">✅ Your Current Mix:</span>
                <span class="savings-value">Nearly optimal! (within ${formatCurrency(Math.abs(savingsVsCurrent))} of best)</span>
            </div>
        `;
    }
    
    html += `</div>`;
    
    // Current mix breakdown
    html += `
        <div class="current-mix">
            <h4>Your Current Location Mix:</h4>
            <div class="mix-bars">
                <div class="mix-bar onshore" style="width: ${(locationCounts.onshore / positions.length * 100)}%">
                    <span>${locationCounts.onshore} Onshore</span>
                </div>
                <div class="mix-bar offshore" style="width: ${(locationCounts.offshore / positions.length * 100)}%">
                    <span>${locationCounts.offshore} Offshore</span>
                </div>
                <div class="mix-bar nearshore" style="width: ${(locationCounts.nearshore / positions.length * 100)}%">
                    <span>${locationCounts.nearshore} Nearshore</span>
                </div>
            </div>
        </div>
    `;
    
    contentDiv.innerHTML = html;
    summaryDiv.style.display = 'block';
}

// ========================================
// Utility Functions
// ========================================

function formatCurrency(value) {
    if (isNaN(value) || value === 0) return '$0.00';
    return `$${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function formatPercentage(value) {
    if (isNaN(value)) return '0%';
    return `${(value * 100).toFixed(1)}%`;
}
