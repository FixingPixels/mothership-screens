// ============================================================================
// GOOGLE SHEETS INTEGRATION - MAINTENANCE LOG
// ============================================================================
//
// 1. CREATE YOUR GOOGLE SHEET:
//    - Create a new Google Sheet with a tab: "Maintenance"
//    - (Optional) Add a "Metadata" tab for header information
//
// 2. MAINTENANCE SHEET FORMAT (tab name: "Maintenance"):
//    Required columns (first row is headers, case-insensitive):
//    - timestamp: Log timestamp (e.g., "2279.08.09 // 14:30")
//    - techId: Technician ID (e.g., "755-A" or "M.U.T.H.R.")
//    - logEntry: Log entry text (supports HTML, e.g., "text with <span class='text-yellow-400'>highlight</span>")
//    - status: Status text (e.g., "NOMINAL", "WARNING", "CRITICAL", "FAILURE")
//    - entryClass: Optional CSS classes for log entry cell (e.g., "text-yellow-400")
//    - statusClass: Optional CSS classes for status cell (e.g., "text-green-400")
//    - rowClass: Optional CSS classes for the entire row (e.g., "bg-neutral-900")
//    - colspan: Optional - set to "4" for a row that spans all columns (for special messages)
//
// 3. METADATA SHEET FORMAT (tab name: "Metadata") - OPTIONAL:
//    Two columns: "key" and "value"
//    Supported keys:
//    - title: Main title (e.g., "Maintenance Log")
//    - component: Component description (e.g., "COMPONENT: AIR SCRUBBER 02 // DECK C (SCIENCE)")
//    - statusText: Status text (e.g., ":: STATUS: FAILURE IMMINENT ::")
//    - statusSubtext: Status subtext (e.g., "AUTO-LOGGING ACTIVE")
//    - componentId: Component ID (e.g., "WY-SCRUB-02C-8800")
//    - lastServiced: Last service date (e.g., "2279.08.13")
//    - assignedTech: Assigned technician (e.g., "C. HAAS (755-A)")
//
// 4. SET UP GOOGLE SHEETS API (same as file-browser.js)
//
// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    SHEET_ID: '', // Replace with your Google Sheet ID
    API_KEY: '',  // Replace with your Google Sheets API key
    MAINTENANCE_TAB_NAME: 'Maintenance',
    METADATA_TAB_NAME: 'Metadata' // Optional
};

// Alternative: Read from URL query parameters
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('sheetId')) CONFIG.SHEET_ID = urlParams.get('sheetId');
if (urlParams.get('apiKey')) CONFIG.API_KEY = urlParams.get('apiKey');

// ============================================================================
// GLOBAL STATE
// ============================================================================
const logTableBody = document.querySelector('tbody');
let sheetMetadata = {}; // Store sheet metadata (name, etc.)
let pageMetadata = {}; // Store page-specific metadata from Metadata sheet

// ============================================================================
// GOOGLE SHEETS API INTEGRATION
// ============================================================================

/**
 * Fetches data from a Google Sheet using the Sheets API v4
 * @param {string} sheetId - The Google Sheet ID
 * @param {string} range - The range to fetch (e.g., "Maintenance!A1:Z1000")
 * @param {string} apiKey - The Google Sheets API key
 * @returns {Promise<Array<Array<string>>>} Array of rows, each row is an array of cell values
 */
async function fetchSheetData(sheetId, range, apiKey) {
    if (!sheetId || !apiKey) {
        throw new Error('Sheet ID and API Key must be configured');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        throw error;
    }
}

/**
 * Parses sheet data into an array of objects using the first row as headers
 * @param {Array<Array<string>>} rows - Raw sheet data (array of arrays)
 * @returns {Array<Object>} Array of objects with keys from header row
 */
function parseSheetData(rows) {
    if (!rows || rows.length === 0) {
        return [];
    }

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    return dataRows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });
        return obj;
    });
}

/**
 * Fetches metadata about the Google Sheet (including the sheet name)
 * @param {string} sheetId - The Google Sheet ID
 * @param {string} apiKey - The Google Sheets API key
 * @returns {Promise<Object>} Sheet metadata object
 */
async function fetchSheetMetadata(sheetId, apiKey) {
    if (!sheetId || !apiKey) {
        throw new Error('Sheet ID and API Key must be configured');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        return {
            title: data.properties?.title || 'Maintenance Log',
            locale: data.properties?.locale || 'en_US',
            timeZone: data.properties?.timeZone || 'America/New_York'
        };
    } catch (error) {
        console.error('Error fetching sheet metadata:', error);
        // Return default values on error
        return {
            title: 'Maintenance Log',
            locale: 'en_US',
            timeZone: 'America/New_York'
        };
    }
}

// ============================================================================
// METADATA LOADING
// ============================================================================

/**
 * Loads page metadata from the Metadata sheet (optional)
 */
async function loadMetadata() {
    try {
        const range = `${CONFIG.METADATA_TAB_NAME}!A1:B100`;
        const rows = await fetchSheetData(CONFIG.SHEET_ID, range, CONFIG.API_KEY);
        
        if (rows.length === 0) {
            console.warn('No metadata found');
            return;
        }

        // Parse metadata as key-value pairs
        const metadataEntries = parseSheetData(rows);
        metadataEntries.forEach(entry => {
            const key = entry.key || '';
            const value = entry.value || '';
            if (key) {
                pageMetadata[key] = value;
            }
        });

        // Update page elements with metadata
        updatePageMetadata();
        
    } catch (error) {
        console.warn('Metadata loading error (this is optional):', error);
        // Don't show error to user - metadata is optional
    }
}

/**
 * Updates page elements with loaded metadata
 */
function updatePageMetadata() {
    // Update title
    const titleElement = document.querySelector('h1');
    if (titleElement && pageMetadata.title) {
        titleElement.textContent = pageMetadata.title;
    }

    // Update component description
    const componentElement = document.querySelector('header p');
    if (componentElement && pageMetadata.component) {
        componentElement.textContent = pageMetadata.component;
    }

    // Update status text
    const statusTextElement = document.querySelector('header .text-left.md\\:text-right span:first-child');
    if (statusTextElement && pageMetadata.statusText) {
        statusTextElement.textContent = pageMetadata.statusText;
    }

    // Update status subtext
    const statusSubtextElement = document.querySelector('header .text-left.md\\:text-right .text-sm');
    if (statusSubtextElement && pageMetadata.statusSubtext) {
        statusSubtextElement.textContent = pageMetadata.statusSubtext;
    }

    // Update component ID
    const componentIdElements = document.querySelectorAll('section span');
    if (componentIdElements[0] && pageMetadata.componentId) {
        componentIdElements[0].textContent = pageMetadata.componentId;
    }

    // Update last serviced
    if (componentIdElements[1] && pageMetadata.lastServiced) {
        componentIdElements[1].textContent = pageMetadata.lastServiced;
    }

    // Update assigned tech
    if (componentIdElements[2] && pageMetadata.assignedTech) {
        componentIdElements[2].textContent = pageMetadata.assignedTech;
    }
}

// ============================================================================
// LOG LOADING
// ============================================================================

/**
 * Loads and renders the maintenance log table from Google Sheets
 */
async function loadMaintenanceLog() {
    try {
        showLoadingState();
        
        const range = `${CONFIG.MAINTENANCE_TAB_NAME}!A1:Z1000`;
        const rows = await fetchSheetData(CONFIG.SHEET_ID, range, CONFIG.API_KEY);
        
        if (rows.length === 0) {
            showErrorState('No data found in Maintenance sheet');
            return;
        }

        const logEntries = parseSheetData(rows);
        renderLogTable(logEntries);
        
    } catch (error) {
        showErrorState(`Failed to load maintenance log: ${error.message}`);
        console.error('Maintenance log loading error:', error);
    }
}

/**
 * Renders the maintenance log table from parsed data
 * @param {Array<Object>} entries - Array of log entry objects
 */
function renderLogTable(entries) {
    logTableBody.innerHTML = '';

    if (entries.length === 0) {
        logTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-neutral-500 py-8">
                    No log entries found
                </td>
            </tr>
        `;
        return;
    }

    entries.forEach(entry => {
        const timestamp = entry.timestamp || '';
        const techId = entry.techid || '';
        const logEntry = entry.logentry || '';
        const status = entry.status || '';
        const entryClass = entry.entryclass || '';
        const statusClass = entry.statusclass || '';
        const rowClass = entry.rowclass || '';
        const colspan = entry.colspan || '';

        // Handle special colspan rows (like connection lost messages)
        if (colspan === '4') {
            const row = `
                <tr class="${rowClass}">
                    <td colspan="4" class="text-center ${entryClass}">
                        ${logEntry}
                    </td>
                </tr>
            `;
            logTableBody.insertAdjacentHTML('beforeend', row);
            return;
        }

        // Apply default status colors if not specified
        let finalStatusClass = statusClass;
        if (!statusClass && status) {
            const statusLower = status.toLowerCase();
            if (statusLower === 'nominal') {
                finalStatusClass = 'text-green-400';
            } else if (statusLower === 'warning') {
                finalStatusClass = 'text-yellow-400';
            } else if (statusLower === 'critical' || statusLower === 'failure') {
                finalStatusClass = 'text-red-500';
            }
        }

        // Build the row
        const row = `
            <tr class="${rowClass}">
                <td>${timestamp}</td>
                <td>${techId}</td>
                <td class="${entryClass}">${logEntry}</td>
                <td class="${finalStatusClass}">${status}</td>
            </tr>
        `;

        logTableBody.insertAdjacentHTML('beforeend', row);
    });
}

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

/**
 * Shows loading state in the log table
 */
function showLoadingState() {
    if (logTableBody) {
        logTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-neutral-500 py-8">
                    <div class="inline-block">Loading maintenance log...</div>
                </td>
            </tr>
        `;
    }
}

/**
 * Shows error state in the log table
 * @param {string} message - Error message to display
 */
function showErrorState(message) {
    if (logTableBody) {
        logTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-red-500 py-8">
                    <div class="inline-block">
                        <div class="font-bold mb-2">ERROR</div>
                        <div class="text-sm">${message}</div>
                        <div class="text-xs text-neutral-500 mt-4">
                            Please check your Sheet ID and API Key configuration.
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the application by loading maintenance log and metadata
 */
async function initialize() {
    if (!CONFIG.SHEET_ID || !CONFIG.API_KEY) {
        showErrorState('Sheet ID and API Key must be configured. Please update the CONFIG object in the script.');
        return;
    }

    // Load sheet metadata to potentially use the sheet name
    sheetMetadata = await fetchSheetMetadata(CONFIG.SHEET_ID, CONFIG.API_KEY);

    // Load page metadata and maintenance log in parallel
    await Promise.all([
        loadMetadata(), // Optional, won't fail if missing
        loadMaintenanceLog()
    ]);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

