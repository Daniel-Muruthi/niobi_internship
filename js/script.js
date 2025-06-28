// Global variables
let internalData = [];
let providerData = [];
let reconciliationResults = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupFileUpload('internalUpload', 'internalFile', 'internalStatus', 'internal');
    setupFileUpload('providerUpload', 'providerFile', 'providerStatus', 'provider');
    
    document.getElementById('reconcileBtn').addEventListener('click', performReconciliation);
});

// File upload setup
function setupFileUpload(uploadId, fileId, statusId, dataVariable) {
    const uploadBox = document.getElementById(uploadId);
    const fileInput = document.getElementById(fileId);
    const statusDiv = document.getElementById(statusId);

    uploadBox.addEventListener('click', () => fileInput.click());
    
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });
    
    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('dragover');
    });
    
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0], statusDiv, dataVariable);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0], statusDiv, dataVariable);
        }
    });
}

function handleFile(file, statusDiv, dataVariable) {
    if (!file.name.endsWith('.csv')) {
        showStatus(statusDiv, 'Please select a CSV file', 'danger');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const csvData = parseCSV(e.target.result);
            if (dataVariable === 'internal') {
                internalData = csvData;
            } else {
                providerData = csvData;
            }
            showStatus(statusDiv, `✓ Successfully loaded ${csvData.length} transactions`, 'success');
            updateReconcileButton();
        } catch (error) {
            showStatus(statusDiv, `Error: ${error.message}`, 'danger');
        }
    };
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Validate required columns
    const requiredColumns = ['transaction_reference', 'amount', 'date'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Skip empty lines
        
        const values = parseCSVLine(lines[i]);
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        // Parse amount as float and validate
        const amount = parseFloat(row.amount);
        if (isNaN(amount)) {
            throw new Error(`Invalid amount value "${row.amount}" in row ${i + 1}`);
        }
        row.amount = amount;
        
        // Validate transaction reference
        if (!row.transaction_reference || row.transaction_reference.trim() === '') {
            throw new Error(`Missing transaction reference in row ${i + 1}`);
        }
        
        // Ensure description exists
        row.description = row.description || '';
        
        data.push(row);
    }
    
    return data;
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim());
    return values;
}

function showStatus(statusDiv, message, type) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    statusDiv.innerHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

function updateReconcileButton() {
    const reconcileBtn = document.getElementById('reconcileBtn');
    if (internalData.length > 0 && providerData.length > 0) {
        reconcileBtn.disabled = false;
        reconcileBtn.innerHTML = `
            <i class="fas fa-sync-alt me-2"></i>
            Start Reconciliation Analysis
        `;
    }
}

function performReconciliation() {
    // Show loading
    document.getElementById('loadingSection').classList.remove('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    
    // Simulate processing time
    let progress = 0;
    const progressBar = document.querySelector('.progress-bar');
    
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        progressBar.style.width = progress + '%';
        
        if (progress >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
                processReconciliation();
                showResults();
            }, 500);
        }
    }, 200);
}

function processReconciliation() {
    // Create maps for efficient lookup
    const internalMap = new Map();
    const providerMap = new Map();
    
    // Index internal transactions
    internalData.forEach(transaction => {
        internalMap.set(transaction.transaction_reference, transaction);
    });
    
    // Index provider transactions
    providerData.forEach(transaction => {
        providerMap.set(transaction.transaction_reference, transaction);
    });
    
    // Find matches and discrepancies
    const matched = [];
    const internalOnly = [];
    const providerOnly = [];
    
    // Check internal transactions
    internalData.forEach(internalTx => {
        const providerTx = providerMap.get(internalTx.transaction_reference);
        if (providerTx) {
            // Matched transaction
            const matchedTransaction = {
                transaction_reference: internalTx.transaction_reference,
                internal: internalTx,
                provider: providerTx,
                amountMatch: Math.abs(internalTx.amount - providerTx.amount) < 0.01,
                amountDifference: internalTx.amount - providerTx.amount
            };
            matched.push(matchedTransaction);
        } else {
            // Internal only
            internalOnly.push(internalTx);
        }
    });
    
    // Check provider transactions for provider-only
    providerData.forEach(providerTx => {
        if (!internalMap.has(providerTx.transaction_reference)) {
            providerOnly.push(providerTx);
        }
    });
    
    reconciliationResults = {
        matched,
        internalOnly,
        providerOnly,
        totalInternal: internalData.length,
        totalProvider: providerData.length,
        matchRate: matched.length / Math.max(internalData.length, providerData.length) * 100
    };
}

function showResults() {
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.remove('hidden');
    
    // Update summary stats
    updateSummaryStats();
    
    // Update category counts
    document.getElementById('matchedCount').textContent = reconciliationResults.matched.length;
    document.getElementById('internalOnlyCount').textContent = reconciliationResults.internalOnly.length;
    document.getElementById('providerOnlyCount').textContent = reconciliationResults.providerOnly.length;
    
    // Populate transaction lists
    populateTransactionList('matchedTransactions', reconciliationResults.matched, 'matched');
    populateTransactionList('internalOnlyTransactions', reconciliationResults.internalOnly, 'internal');
    populateTransactionList('providerOnlyTransactions', reconciliationResults.providerOnly, 'provider');
    
    // Update analytics tab
    updateAnalytics();
}

function updateSummaryStats() {
    const summaryStats = document.getElementById('summaryStats');
    const { matched, internalOnly, providerOnly } = reconciliationResults;
    
    // CHANGED: compute unique transaction references
    const allRefs = [
      ...internalData.map(t => t.transaction_reference),
      ...providerData.map(t => t.transaction_reference)
    ];
    const uniqueCount = new Set(allRefs).size;

    const amountMismatches = matched.filter(m => !m.amountMatch).length;
    
    summaryStats.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${matched.length}</div>
            <div class="stat-label">Matched Transactions</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${internalOnly.length}</div>
            <div class="stat-label">Internal Only</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${providerOnly.length}</div>
            <div class="stat-label">Provider Only</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${matchRate.toFixed(1)}%</div>
            <div class="stat-label">Match Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${amountMismatches}</div>
            <div class="stat-label">Amount Mismatches</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${uniqueCount}</div>
            <div class="stat-label">Total Unique Transactions</div>
        </div>
    `;
}


function populateTransactionList(containerId, transactions, type) {
    const container = document.getElementById(containerId);
    
    if (transactions.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted">No transactions in this category</div>';
        return;
    }
    
    let html = '';
    
    transactions.forEach(transaction => {
        if (type === 'matched') {
            const amountMismatch = !transaction.amountMatch;
            html += `
                <div class="transaction-item ${amountMismatch ? 'amount-mismatch' : ''}">
                    <div>
                        <div class="fw-bold">${transaction.transaction_reference}</div>
                        <div class="text-muted small">${transaction.internal.description || transaction.provider.description}</div>
                        <div class="text-muted small">Date: ${transaction.internal.date}</div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">Internal: $${transaction.internal.amount.toFixed(2)}</div>
                        <div class="fw-bold">Provider: $${transaction.provider.amount.toFixed(2)}</div>
                        ${amountMismatch ? `<div class="text-danger small">Difference: $${transaction.amountDifference.toFixed(2)}</div>` : ''}
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="transaction-item">
                    <div>
                        <div class="fw-bold">${transaction.transaction_reference}</div>
                        <div class="text-muted small">${transaction.description}</div>
                        <div class="text-muted small">Date: ${transaction.date}</div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">$${transaction.amount.toFixed(2)}</div>
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

function toggleCategory(categoryId) {
    const content = document.getElementById(categoryId + 'Content');
    const chevron = document.getElementById(categoryId + 'Chevron');
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        chevron.classList.remove('fa-chevron-down');
        chevron.classList.add('fa-chevron-up');
    } else {
        content.style.display = 'none';
        chevron.classList.remove('fa-chevron-up');
        chevron.classList.add('fa-chevron-down');
    }
}

function exportCategory(category) {
    let data = [];
    let filename = '';
    
    switch(category) {
        case 'matched':
            data = reconciliationResults.matched.map(t => ({
                transaction_reference: t.transaction_reference,
                internal_amount: t.internal.amount,
                provider_amount: t.provider.amount,
                amount_difference: t.amountDifference,
                internal_date: t.internal.date,
                provider_date: t.provider.date,
                description: t.internal.description || t.provider.description
            }));
            filename = 'matched_transactions.csv';
            break;
        case 'internalOnly':
            data = reconciliationResults.internalOnly;
            filename = 'internal_only_transactions.csv';
            break;
        case 'providerOnly':
            data = reconciliationResults.providerOnly;
            filename = 'provider_only_transactions.csv';
            break;
    }
    
    if (data.length === 0) {
        alert('No data to export for this category');
        return;
    }
    
    const csv = convertToCSV(data);
    downloadCSV(csv, filename);
}

function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escape values that contain commas or quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    return csvContent;
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function updateAnalytics() {
    const analyticsContent = document.getElementById('analyticsContent');
    const { matched, internalOnly, providerOnly, matchRate } = reconciliationResults;
    
    // Calculate additional analytics
    const totalTransactions = matched.length + internalOnly.length + providerOnly.length;
    const amountMismatches = matched.filter(m => !m.amountMatch);
    const totalInternalAmount = reconciliationResults.internalOnly.reduce((sum, t) => sum + t.amount, 0) + 
                               matched.reduce((sum, t) => sum + t.internal.amount, 0);
    const totalProviderAmount = reconciliationResults.providerOnly.reduce((sum, t) => sum + t.amount, 0) + 
                               matched.reduce((sum, t) => sum + t.provider.amount, 0);
    
    analyticsContent.innerHTML = `
        <div class="row g-4">
            <div class="col-md-6">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-primary">
                            <i class="fas fa-percentage me-2"></i>Match Rate Analysis
                        </h5>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span>Overall Match Rate</span>
                                <span class="fw-bold">${matchRate.toFixed(1)}%</span>
                            </div>
                            <div class="progress">
                                <div class="progress-bar bg-success" style="width: ${matchRate}%"></div>
                            </div>
                        </div>
                        <div class="row text-center">
                            <div class="col-4">
                                <div class="fw-bold text-success">${matched.length}</div>
                                <small class="text-muted">Matched</small>
                            </div>
                            <div class="col-4">
                                <div class="fw-bold text-warning">${internalOnly.length}</div>
                                <small class="text-muted">Internal Only</small>
                            </div>
                            <div class="col-4">
                                <div class="fw-bold text-danger">${providerOnly.length}</div>
                                <small class="text-muted">Provider Only</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-primary">
                            <i class="fas fa-dollar-sign me-2"></i>Amount Analysis
                        </h5>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between">
                                <span>Total Internal Amount:</span>
                                <span class="fw-bold">$${totalInternalAmount.toFixed(2)}</span>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span>Total Provider Amount:</span>
                                <span class="fw-bold">$${totalProviderAmount.toFixed(2)}</span>
                            </div>
                            <div class="d-flex justify-content-between border-top pt-2 mt-2">
                                <span>Difference:</span>
                                <span class="fw-bold ${totalInternalAmount - totalProviderAmount >= 0 ? 'text-success' : 'text-danger'}">
                                    $${(totalInternalAmount - totalProviderAmount).toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="fw-bold text-warning">${amountMismatches.length}</div>
                            <small class="text-muted">Amount Mismatches</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title text-primary">
                            <i class="fas fa-exclamation-triangle me-2"></i>Issues Requiring Attention
                        </h5>
                        <div class="row">
                            <div class="col-md-4">
                                <div class="alert alert-warning">
                                    <h6><i class="fas fa-database me-1"></i>Internal System Only</h6>
                                    <p class="mb-1">${internalOnly.length} transactions found only in internal system</p>
                                    <small>These may represent failed payments or processing issues</small>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="alert alert-danger">
                                    <h6><i class="fas fa-credit-card me-1"></i>Provider Statement Only</h6>
                                    <p class="mb-1">${providerOnly.length} transactions found only in provider statement</p>
                                    <small>These may represent missing records in your system</small>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="alert alert-info">
                                    <h6><i class="fas fa-calculator me-1"></i>Amount Mismatches</h6>
                                    <p class="mb-1">${amountMismatches.length} transactions with amount discrepancies</p>
                                    <small>These require manual review and correction</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="text-center mt-4">
            <button class="btn btn-niobi me-2" onclick="exportFullReport()">
                <i class="fas fa-file-export me-2"></i>Export Full Report
            </button>
            <button class="btn btn-outline-primary" onclick="resetReconciliation()">
                <i class="fas fa-refresh me-2"></i>Start New Reconciliation
            </button>
        </div>
    `;
}

function exportFullReport() {
    const report = {
        summary: {
            total_internal_transactions: reconciliationResults.totalInternal,
            total_provider_transactions: reconciliationResults.totalProvider,
            matched_transactions: reconciliationResults.matched.length,
            internal_only_transactions: reconciliationResults.internalOnly.length,
            provider_only_transactions: reconciliationResults.providerOnly.length,
            match_rate_percentage: reconciliationResults.matchRate.toFixed(2),
            amount_mismatches: reconciliationResults.matched.filter(m => !m.amountMatch).length
        },
        matched_transactions: reconciliationResults.matched,
        internal_only_transactions: reconciliationResults.internalOnly,
        provider_only_transactions: reconciliationResults.providerOnly
    };
    
    const jsonContent = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'reconciliation_report.json';
    link.click();
}

function resetReconciliation() {
    // Reset data
    internalData = [];
    providerData = [];
    reconciliationResults = {};
    
    // Reset UI
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('internalStatus').innerHTML = '';
    document.getElementById('providerStatus').innerHTML = '';
    document.getElementById('internalFile').value = '';
    document.getElementById('providerFile').value = '';
    document.getElementById('reconcileBtn').disabled = true;
    
    // Reset analytics
    document.getElementById('analyticsContent').innerHTML = `
        <p class="text-muted text-center py-5">
            <i class="fas fa-chart-bar fa-3x mb-3 d-block"></i>
            Complete a reconciliation to view detailed analytics and insights.
        </p>
    `;
}