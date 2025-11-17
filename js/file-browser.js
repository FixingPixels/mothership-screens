// ============================================================================
// GOOGLE SHEETS INTEGRATION - SETUP INSTRUCTIONS
// ============================================================================
//
// 1. CREATE YOUR GOOGLE SHEET:
//    - Create a new Google Sheet with two tabs: "Directory" and "Content"
//
// 2. DIRECTORY SHEET FORMAT (tab name: "Directory"):
//    Required columns (first row is headers, case-insensitive):
//    - fileId: Unique identifier linking to Content sheet (e.g., "log-entry-edam-1")
//    - filename: Display name (e.g., "log_entry_881M.log")
//    - size: File size (e.g., "1.2 KB")
//    - modified: Modification date (e.g., "2279.08.14")
//    - notes: Notes column (e.g., "Preliminary Assessment")
//    - isClickable: "true" or "false" (determines if file opens content)
//    - status: "normal", "locked", "corrupted", or "system" (affects styling)
//    - rowClass: Optional CSS classes for the row (e.g., "text-yellow-400")
//    - notesClass: Optional CSS classes for notes cell (e.g., "text-red-500")
//
// 3. CONTENT SHEET FORMAT (tab name: "Content"):
//    Required columns (first row is headers, case-insensitive):
//    - fileId: Must match fileId from Directory sheet
//    - title: Main title (e.g., "Log Entry :: Greta Base")
//    - subtitle: Subtitle text (e.g., "Station AI: [GRETA-SYS] // Research Log")
//    - status: Status text (e.g., ":: STATUS: ACTIVE STUDY ::")
//    - statusSubtext: Status subtext (e.g., "SPECIES RESEARCH // CARCINID")
//    - logId: Log ID field (e.g., "Acoustic Signature of Replication...")
//    - timestamp: Timestamp (e.g., "2279.08.14 // 23:41:12")
//    - origin: Origin field (e.g., "Dr. Edam")
//    - bodyContent: Main content (supports HTML, e.g., "<p>Text with <span class='text-primary-yellow'>highlighting</span></p>")
//
// 4. SET UP GOOGLE SHEETS API:
//    - Go to Google Cloud Console: https://console.cloud.google.com/
//    - Create a new project or select existing one
//    - Enable "Google Sheets API"
//    - Create credentials > API Key
//    - (Optional) Restrict API key to Google Sheets API for security
//
// 5. SHARE YOUR SHEET:
//    - Make the sheet publicly viewable (File > Share > Anyone with the link)
//    - OR configure API key with proper permissions
//
// 6. CONFIGURE THIS FILE:
//    - Update SHEET_ID and API_KEY below
//    - OR use URL parameters: ?sheetId=YOUR_ID&apiKey=YOUR_KEY
//
// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    SHEET_ID: '', // Replace with your Google Sheet ID (from URL: docs.google.com/spreadsheets/d/{THIS_IS_THE_ID}/edit)
    API_KEY: '',  // Replace with your Google Sheets API key (from Google Cloud Console)
    DIRECTORY_TAB_NAME: 'Directory',
    CONTENT_TAB_NAME: 'Content'
};

// Alternative: Read from URL query parameters (for easier sharing)
// Usage: ?sheetId=YOUR_SHEET_ID&apiKey=YOUR_API_KEY
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('sheetId')) CONFIG.SHEET_ID = urlParams.get('sheetId');
if (urlParams.get('apiKey')) CONFIG.API_KEY = urlParams.get('apiKey');

// ============================================================================
// GLOBAL STATE
// ============================================================================
const directoryView = document.getElementById('directory-view');
const fileContentContainer = document.getElementById('file-content-container');
const directoryTableBody = document.getElementById('directory-table-body');
let fileContentData = {}; // Store content data keyed by fileId
let fileContentViews = []; // Track dynamically created file views
let sheetMetadata = {}; // Store sheet metadata (name, etc.)

// ============================================================================
// GOOGLE SHEETS API INTEGRATION
// ============================================================================

/**
 * Fetches data from a Google Sheet using the Sheets API v4
 * @param {string} sheetId - The Google Sheet ID
 * @param {string} range - The range to fetch (e.g., "Directory!A1:Z1000")
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
            title: data.properties?.title || 'File Directory',
            locale: data.properties?.locale || 'en_US',
            timeZone: data.properties?.timeZone || 'America/New_York'
        };
    } catch (error) {
        console.error('Error fetching sheet metadata:', error);
        // Return default values on error
        return {
            title: 'File Directory',
            locale: 'en_US',
            timeZone: 'America/New_York'
        };
    }
}

// ============================================================================
// DIRECTORY LOADING
// ============================================================================

/**
 * Parses a file size string (e.g., "1.2 KB", "8812.0 KB") into bytes
 * @param {string} sizeStr - File size string
 * @returns {number} Size in bytes
 */
function parseSizeToBytes(sizeStr) {
    if (!sizeStr || sizeStr === '--') return 0;
    
    const match = sizeStr.match(/^([\d.]+)\s*(KB|MB|GB|TB|B)?$/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    
    const multipliers = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
    };
    
    return value * (multipliers[unit] || 1);
}

/**
 * Formats bytes into a human-readable size string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string (e.g., "1.2 KB")
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    
    return `${value.toFixed(1)} ${units[i]}`;
}

/**
 * Calculates directory statistics from entries
 * @param {Array<Object>} entries - Directory entries
 * @returns {Object} Statistics object with fileCount, dirCount, totalSize
 */
function calculateDirectoryStats(entries) {
    let fileCount = 0;
    let dirCount = 0;
    let totalBytes = 0;
    
    entries.forEach(entry => {
        const filename = entry.filename || '';
        const size = entry.size || '--';
        
        // Count files vs directories (basic heuristic: directories might not have extensions or have specific markers)
        // For now, count everything as files since the CSV doesn't distinguish
        fileCount++;
        
        // Sum up file sizes
        totalBytes += parseSizeToBytes(size);
    });
    
    return {
        fileCount,
        dirCount,
        totalSize: formatBytes(totalBytes)
    };
}

/**
 * Updates the footer with calculated statistics
 * @param {Object} stats - Statistics object from calculateDirectoryStats
 */
function updateFooterStats(stats) {
    const footerStatsElement = document.getElementById('footer-stats');
    if (footerStatsElement) {
        footerStatsElement.textContent = `${stats.fileCount} File(s), ${stats.dirCount} Dir(s) // ${stats.totalSize} TOTAL // [2.1 TB FREE]`;
    }
}

/**
 * Updates the page title with the sheet name
 * @param {string} title - Sheet title
 */
function updatePageTitle(title) {
    const h1Element = document.getElementById('page-title');
    if (h1Element) {
        h1Element.textContent = title;
    }
}

/**
 * Loads and renders the directory table from Google Sheets
 */
async function loadDirectory() {
    try {
        showLoadingState();
        
        const range = `${CONFIG.DIRECTORY_TAB_NAME}!A1:Z1000`;
        const rows = await fetchSheetData(CONFIG.SHEET_ID, range, CONFIG.API_KEY);
        
        if (rows.length === 0) {
            showErrorState('No data found in Directory sheet');
            return;
        }

        const directoryEntries = parseSheetData(rows);
        renderDirectoryTable(directoryEntries);
        
        // Calculate and update statistics
        const stats = calculateDirectoryStats(directoryEntries);
        updateFooterStats(stats);
        
    } catch (error) {
        showErrorState(`Failed to load directory: ${error.message}`);
        console.error('Directory loading error:', error);
    }
}

/**
 * Renders the directory table from parsed data
 * @param {Array<Object>} entries - Array of directory entry objects
 */
function renderDirectoryTable(entries) {
    directoryTableBody.innerHTML = '';

    if (entries.length === 0) {
        directoryTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-neutral-500 py-8">
                    No files found in directory
                </td>
            </tr>
        `;
        return;
    }

    entries.forEach(entry => {
        const fileId = entry.fileid || '';
        const filename = entry.filename || '';
        const size = entry.size || '--';
        const modified = entry.modified || '--';
        const notes = entry.notes || '';
        const isClickable = entry.isclickable === 'true' || entry.isclickable === 'TRUE' || entry.isclickable === true;
        const status = (entry.status || 'normal').toLowerCase();
        const rowClass = entry.rowclass || '';
        const notesClass = entry.notesclass || '';

        // Determine icon and text colors based on status
        let iconClass = 'text-primary-yellow';
        let textClass = '';
        
        if (status === 'corrupted') {
            iconClass = 'text-red-500';
            textClass = 'text-red-500';
        } else if (status === 'locked') {
            iconClass = 'text-neutral-500';
            textClass = 'text-neutral-500';
        } else if (status === 'system') {
            iconClass = 'text-neutral-500';
            textClass = 'text-neutral-500';
        }

        // Build row classes
        let trClass = rowClass;
        if (isClickable && status !== 'locked' && status !== 'corrupted') {
            trClass += (trClass ? ' ' : '') + 'clickable-row';
        }
        if (textClass) {
            trClass += (trClass ? ' ' : '') + textClass;
        }

        // Build onclick handler
        const onclick = isClickable && status !== 'locked' && status !== 'corrupted' 
            ? `onclick="openFile('${fileId}')"` 
            : '';

        // Build notes cell with optional class
        const notesCellClass = notesClass || '';
        const notesCellContent = notesClass ? `<td class="${notesCellClass}">${notes}</td>` : `<td>${notes}</td>`;

        const row = `
            <tr class="${trClass.trim()}" ${onclick}>
                <td class="${iconClass}">
                    <svg class="w-5 h-5 inline-block icon-path" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="2" stroke="currentColor">
                        <path d="M5 2H12L19 9V22H5V2Z" />
                        <path d="M12 2V9H19" />
                    </svg>
                </td>
                <td>${filename}</td>
                <td>${size}</td>
                <td>${modified}</td>
                ${notesCellContent}
            </tr>
        `;

        directoryTableBody.insertAdjacentHTML('beforeend', row);
    });
}

// ============================================================================
// CONTENT LOADING
// ============================================================================

/**
 * Loads file content data from Google Sheets
 */
async function loadContent() {
    try {
        const range = `${CONFIG.CONTENT_TAB_NAME}!A1:Z1000`;
        const rows = await fetchSheetData(CONFIG.SHEET_ID, range, CONFIG.API_KEY);
        
        if (rows.length === 0) {
            console.warn('No content data found');
            return;
        }

        const contentEntries = parseSheetData(rows);
        
        // Store content data keyed by fileId
        contentEntries.forEach(entry => {
            const fileId = entry.fileid || '';
            if (fileId) {
                fileContentData[fileId] = entry;
            }
        });

        // Generate file content views
        generateFileContentViews();
        
    } catch (error) {
        console.error('Content loading error:', error);
        // Don't show error to user - content will be loaded on-demand if needed
    }
}

/**
 * Generates file content view divs from loaded content data
 */
function generateFileContentViews() {
    fileContentContainer.innerHTML = '';

    Object.keys(fileContentData).forEach(fileId => {
        const content = fileContentData[fileId];
        const viewDiv = createFileContentView(fileId, content);
        fileContentContainer.appendChild(viewDiv);
        fileContentViews.push(viewDiv);
    });
}

/**
 * Creates a file content view div from content data
 * @param {string} fileId - The file ID
 * @param {Object} content - Content data object
 * @returns {HTMLElement} The created div element
 */
function createFileContentView(fileId, content) {
    const div = document.createElement('div');
    div.id = `file-content-${fileId}`;
    div.className = 'hidden';

    const title = content.title || 'File Content';
    const subtitle = content.subtitle || '';
    const status = content.status || '';
    const statusSubtext = content.statussubtext || '';
    const logId = content.logid || '';
    const timestamp = content.timestamp || '';
    const origin = content.origin || '';
    const bodyContent = content.bodycontent || '';

    div.innerHTML = `
        <div class="max-w-4xl mx-auto border-2 border-primary-yellow bg-neutral-950 shadow-glow-yellow">
            <header class="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b-2 border-primary-yellow">
                <div>
                    <h1 class="font-sans text-2xl md:text-2xl text-primary-yellow uppercase tracking-widest">
                        ${title}
                    </h1>
                    ${subtitle ? `<p class="text-neutral-400">${subtitle}</p>` : ''}
                </div>
                ${status ? `
                <div class="text-left md:text-right mt-2 md:mt-0">
                    <span class="block text-xl font-sans text-primary-yellow font-bold">
                        ${status}
                    </span>
                    ${statusSubtext ? `<span class="text-sm text-neutral-400">${statusSubtext}</span>` : ''}
                </div>
                ` : ''}
            </header>

            ${logId || timestamp || origin ? `
            <section class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-b-2 border-neutral-700 bg-black/30">
                ${logId ? `
                <div>
                    <label class="block text-xs uppercase text-neutral-500">Log ID</label>
                    <span class="text-lg">${logId}</span>
                </div>
                ` : ''}
                ${timestamp ? `
                <div>
                    <label class="block text-xs uppercase text-neutral-500">Timestamp</label>
                    <span class="text-lg">${timestamp}</span>
                </div>
                ` : ''}
                ${origin ? `
                <div>
                    <label class="block text-xs uppercase text-neutral-500">Origin (Vox-Rec)</label>
                    <span class="text-lg">${origin}</span>
                </div>
                ` : ''}
            </section>
            ` : ''}

            <main class="p-6 md:p-8 space-y-4 text-lg leading-relaxed">
                ${bodyContent}
            </main>

            <footer class="flex flex-col md:flex-row justify-between items-center gap-3 p-4 border-t-2 border-neutral-700 bg-black/30">
                <button onclick="goBack()"
                    class="font-sans uppercase bg-neutral-800 border-2 border-primary-yellow text-primary-yellow px-6 py-2 hover:bg-primary-yellow hover:text-black transition-all duration-150">
                    &lt;&lt; Back to Directory
                </button>
            </footer>
        </div>
    `;

    return div;
}

// ============================================================================
// FILE NAVIGATION
// ============================================================================

/**
 * Opens a specific file view by its ID
 * @param {string} fileId - The unique file ID
 */
function openFile(fileId) {
    // Ensure content is loaded (in case lazy loading is needed)
    if (!fileContentData[fileId]) {
        console.warn(`Content for file ${fileId} not found`);
        return;
    }

    const fileView = document.getElementById(`file-content-${fileId}`);
    
    if (fileView) {
        // Hide the directory
        directoryView.classList.add('hidden');
        
        // Hide all *other* file views first
        fileContentViews.forEach(view => {
            if (view.id !== fileView.id) {
                view.classList.add('hidden');
            }
        });
        
        // Show the selected file view
        fileView.classList.remove('hidden');
    } else {
        console.error(`File content view with ID 'file-content-${fileId}' not found.`);
    }
}

/**
 * Returns to the main directory view from any file view
 */
function goBack() {
    // Hide all file views
    fileContentViews.forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show the directory view
    directoryView.classList.remove('hidden');
}

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

/**
 * Shows loading state in the directory table
 */
function showLoadingState() {
    directoryTableBody.innerHTML = `
        <tr id="loading-row">
            <td colspan="5" class="text-center text-neutral-500 py-8">
                <div class="inline-block">Loading directory...</div>
            </td>
        </tr>
    `;
}

/**
 * Shows error state in the directory table
 * @param {string} message - Error message to display
 */
function showErrorState(message) {
    directoryTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center text-red-500 py-8">
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

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the application by loading directory and content
 */
async function initialize() {
    if (!CONFIG.SHEET_ID || !CONFIG.API_KEY) {
        showErrorState('Sheet ID and API Key must be configured. Please update the CONFIG object in the script.');
        return;
    }

    // Load sheet metadata first to get the title
    sheetMetadata = await fetchSheetMetadata(CONFIG.SHEET_ID, CONFIG.API_KEY);
    updatePageTitle(sheetMetadata.title);

    // Load directory and content in parallel
    await Promise.all([
        loadDirectory(),
        loadContent()
    ]);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

