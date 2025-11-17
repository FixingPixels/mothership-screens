// ============================================================================
// GOOGLE SHEETS INTEGRATION - PERSONNEL RECORDS
// ============================================================================
//
// 1. CREATE YOUR GOOGLE SHEET:
//    - Create a new Google Sheet with two tabs: "PersonnelDirectory" and "PersonnelRecords"
//
// 2. PERSONNEL DIRECTORY SHEET FORMAT (tab name: "PersonnelDirectory"):
//    Required columns (first row is headers, case-insensitive):
//    - personnelId: Unique identifier linking to PersonnelRecords sheet
//    - name: Display name (e.g., "Dr. Aris Thorne")
//    - position: Position/rank (e.g., "Lead Xenobiologist")
//    - clearance: Security clearance level
//    - notes: Notes column (e.g., "CLASSIFIED")
//    - status: "active", "deceased", "missing", or "classified"
//    - isConfidential: "true" or "false" (requires password to access)
//    - password: Password for confidential records (plain text, for game use only)
//    - rowClass: Optional CSS classes for the row
//    - notesClass: Optional CSS classes for notes cell
//
// 3. PERSONNEL RECORDS SHEET FORMAT (tab name: "PersonnelRecords"):
//    Required columns (first row is headers, case-insensitive):
//    - personnelId: Must match personnelId from PersonnelDirectory sheet
//    - fullName: Full legal name
//    - serviceId: Service ID number
//    - fileNumber: File number
//    - position: Position/assignment
//    - contractingEntity: Contracting entity
//    - securityClearance: Security clearance
//    - psychEval: Psych evaluation status
//    - currentAssignment: Current assignment
//    - statusHeader: Status header text (e.g., ":: STATUS: CLASSIFIED ::")
//    - statusSubtext: Status subtext
//    - imageUrl: URL to personnel photo (optional, shows placeholder if empty)
//    - medFlag1Text, medFlag1Desc, medFlag1Class: Medical flag 1
//    - medFlag2Text, medFlag2Desc, medFlag2Class: Medical flag 2
//    - medFlag3Text, medFlag3Desc, medFlag3Class: Medical flag 3
//    - medFlag4Text, medFlag4Desc, medFlag4Class: Medical flag 4
//    - adminLogs: Administrative logs (HTML supported, use <br> for line breaks)
//
// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    SHEET_ID: '', // Replace with your Google Sheet ID
    API_KEY: '',  // Replace with your Google Sheets API key
    DIRECTORY_TAB_NAME: 'PersonnelDirectory',
    RECORDS_TAB_NAME: 'PersonnelRecords'
};

// Alternative: Read from URL query parameters
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('sheetId')) CONFIG.SHEET_ID = urlParams.get('sheetId');
if (urlParams.get('apiKey')) CONFIG.API_KEY = urlParams.get('apiKey');

// ============================================================================
// GLOBAL STATE
// ============================================================================
const directoryView = document.getElementById('directory-view');
const personnelContentContainer = document.getElementById('personnel-content-container');
const directoryTableBody = document.getElementById('directory-table-body');
const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('password-input');
const passwordError = document.getElementById('password-error');

let personnelRecordData = {}; // Store record data keyed by personnelId
let personnelRecordViews = []; // Track dynamically created record views
let sheetMetadata = {}; // Store sheet metadata (name, etc.)
let pendingAccessPersonnelId = null; // Track which record is waiting for password
let pendingAccessPassword = null; // Track the correct password

// ============================================================================
// GOOGLE SHEETS API INTEGRATION
// ============================================================================

/**
 * Fetches data from a Google Sheet using the Sheets API v4
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
            title: data.properties?.title || 'Personnel Directory',
            locale: data.properties?.locale || 'en_US',
            timeZone: data.properties?.timeZone || 'America/New_York'
        };
    } catch (error) {
        console.error('Error fetching sheet metadata:', error);
        return {
            title: 'Personnel Directory',
            locale: 'en_US',
            timeZone: 'America/New_York'
        };
    }
}

// ============================================================================
// DIRECTORY LOADING
// ============================================================================

/**
 * Updates the page title with the sheet name
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
            showErrorState('No data found in PersonnelDirectory sheet');
            return;
        }

        const directoryEntries = parseSheetData(rows);
        renderDirectoryTable(directoryEntries);
        
    } catch (error) {
        showErrorState(`Failed to load directory: ${error.message}`);
        console.error('Directory loading error:', error);
    }
}

/**
 * Renders the directory table from parsed data
 */
function renderDirectoryTable(entries) {
    directoryTableBody.innerHTML = '';

    if (entries.length === 0) {
        directoryTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-neutral-500 py-8">
                    No personnel records found
                </td>
            </tr>
        `;
        return;
    }

    entries.forEach(entry => {
        const personnelId = entry.personnelid || '';
        const name = entry.name || '';
        const position = entry.position || '--';
        const clearance = entry.clearance || '--';
        const notes = entry.notes || '';
        const status = (entry.status || 'active').toLowerCase();
        const isConfidential = entry.isconfidential === 'true' || entry.isconfidential === 'TRUE' || entry.isconfidential === true;
        const password = entry.password || '';
        const rowClass = entry.rowclass || '';
        const notesClass = entry.notesclass || '';

        // Determine icon and text colors based on status
        let iconClass = 'text-primary-yellow';
        let textClass = '';
        
        if (status === 'deceased') {
            iconClass = 'text-red-500';
            textClass = 'text-red-500';
        } else if (status === 'missing') {
            iconClass = 'text-yellow-400';
            textClass = 'text-yellow-400';
        } else if (status === 'classified') {
            iconClass = 'text-red-500';
            textClass = 'text-red-500';
        }

        // Build row classes
        let trClass = rowClass;
        trClass += (trClass ? ' ' : '') + 'clickable-row';
        if (textClass) {
            trClass += (trClass ? ' ' : '') + textClass;
        }

        // Build onclick handler
        const onclick = `onclick="openPersonnelRecord('${personnelId}', ${isConfidential}, '${password.replace(/'/g, "\\'")}')"`;

        // Build notes cell with optional class and confidential indicator
        const notesCellClass = notesClass || '';
        const displayNotes = isConfidential && !notes ? 'CLASSIFIED' : notes;
        const notesCellContent = notesCellClass ? `<td class="${notesCellClass}">${displayNotes}</td>` : `<td>${displayNotes}</td>`;

        const row = `
            <tr class="${trClass.trim()}" ${onclick}>
                <td class="${iconClass}">
                    <svg class="w-5 h-5 inline-block icon-path" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="2" stroke="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                </td>
                <td>${name}</td>
                <td>${position}</td>
                <td>${clearance}</td>
                ${notesCellContent}
            </tr>
        `;

        directoryTableBody.insertAdjacentHTML('beforeend', row);
    });
}

// ============================================================================
// PERSONNEL RECORDS LOADING
// ============================================================================

/**
 * Loads personnel record data from Google Sheets
 */
async function loadPersonnelRecords() {
    try {
        const range = `${CONFIG.RECORDS_TAB_NAME}!A1:Z1000`;
        const rows = await fetchSheetData(CONFIG.SHEET_ID, range, CONFIG.API_KEY);
        
        if (rows.length === 0) {
            console.warn('No personnel record data found');
            return;
        }

        const recordEntries = parseSheetData(rows);
        
        // Store record data keyed by personnelId
        recordEntries.forEach(entry => {
            const personnelId = entry.personnelid || '';
            if (personnelId) {
                personnelRecordData[personnelId] = entry;
            }
        });

        // Generate personnel record views
        generatePersonnelRecordViews();
        
    } catch (error) {
        console.error('Personnel records loading error:', error);
    }
}

/**
 * Generates personnel record view divs from loaded record data
 */
function generatePersonnelRecordViews() {
    personnelContentContainer.innerHTML = '';

    Object.keys(personnelRecordData).forEach(personnelId => {
        const record = personnelRecordData[personnelId];
        const viewDiv = createPersonnelRecordView(personnelId, record);
        personnelContentContainer.appendChild(viewDiv);
        personnelRecordViews.push(viewDiv);
    });
}

/**
 * Creates a personnel record view div from record data
 */
function createPersonnelRecordView(personnelId, record) {
    const div = document.createElement('div');
    div.id = `personnel-record-${personnelId}`;
    div.className = 'hidden';

    const fullName = record.fullname || 'Unknown';
    const serviceId = record.serviceid || '--';
    const fileNumber = record.filenumber || '--';
    const position = record.position || '--';
    const contractingEntity = record.contractingentity || '--';
    const securityClearance = record.securityclearance || '--';
    const psychEval = record.psycheval || '--';
    const currentAssignment = record.currentassignment || '--';
    const statusHeader = record.statusheader || ':: STATUS: ACTIVE ::';
    const statusSubtext = record.statussubtext || '';
    const adminLogs = record.adminlogs || '<p class="text-neutral-500">No administrative logs on file.</p>';
    const imageUrl = record.imageurl || '';

    // Medical flags
    const medFlag1Text = record.medflag1text || 'N/A';
    const medFlag1Desc = record.medflag1desc || '';
    const medFlag1Class = record.medflag1class || 'border-neutral-600';
    
    const medFlag2Text = record.medflag2text || 'N/A';
    const medFlag2Desc = record.medflag2desc || '';
    const medFlag2Class = record.medflag2class || 'border-neutral-600';
    
    const medFlag3Text = record.medflag3text || 'N/A';
    const medFlag3Desc = record.medflag3desc || '';
    const medFlag3Class = record.medflag3class || 'border-neutral-600';
    
    const medFlag4Text = record.medflag4text || 'N/A';
    const medFlag4Desc = record.medflag4desc || '';
    const medFlag4Class = record.medflag4class || 'border-neutral-600';

    div.innerHTML = `
        <div class="max-w-4xl mx-auto border-2 border-primary-yellow bg-neutral-950 shadow-glow-yellow">
            
            <!-- HEADER -->
            <header class="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b-2 border-primary-yellow">
                <div>
                    <h1 class="font-sans text-2xl md:text-3xl text-primary-yellow uppercase tracking-widest">
                        Service Record :: [${fullName}]
                    </h1>
                    <p class="text-neutral-400">FILE: ${fileNumber} // WEYLAND-YUTANI CORP.</p>
                </div>
                <div class="text-left md:text-right mt-2 md:mt-0">
                    <span class="block text-xl font-sans text-primary-yellow font-bold">
                        ${statusHeader}
                    </span>
                    ${statusSubtext ? `<span class="text-sm text-red-500 animate-pulse">${statusSubtext}</span>` : ''}
                </div>
            </header>

            <!-- PRIMARY INFO -->
            <section class="flex flex-col md:flex-row gap-6 p-4 border-b-2 border-neutral-700 bg-black/30 items-start">
                <!-- Image or Placeholder -->
                <div class="w-full md:w-1/3 flex-shrink-0">
                    ${imageUrl ? `
                        <div class="w-full aspect-square border-2 border-neutral-700 bg-black overflow-hidden">
                            <img src="${imageUrl}" alt="${fullName}" class="w-full h-full object-cover" />
                        </div>
                    ` : `
                        <div class="w-full aspect-square border-2 border-neutral-700 bg-black flex items-center justify-center text-center p-4">
                            <span class="text-neutral-500 font-sans uppercase text-xl md:text-2xl tracking-widest">[ NO IMAGE ON FILE ]</span>
                        </div>
                    `}
                    <p class="text-xs text-neutral-500 mt-1 text-center">ID_PHOTO :: ${fileNumber}</p>
                </div>

                <!-- Info Grid -->
                <div class="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                        <label class="block text-xs uppercase text-neutral-500">Full Name (Legal)</label>
                        <span class="text-lg font-sans text-primary-yellow">${fullName}</span>
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-neutral-500">Service ID / Dossier #</label>
                        <span class="text-lg">${serviceId}</span>
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-neutral-500">Service Assignment</label>
                        <span class="text-lg">${position}</span>
                    </div>
                    <div>
                        <label class="block text-xs uppercase text-neutral-500">Contracting Entity</label>
                        <span class="text-lg">${contractingEntity}</span>
                    </div>
                </div>
            </section>

            <!-- SECONDARY INFO -->
            <section class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-b-2 border-neutral-700 bg-black/40">
                <div>
                    <label class="block text-xs uppercase text-neutral-500">Security Clearance</label>
                    <span class="text-lg">${securityClearance}</span>
                </div>
                <div>
                    <label class="block text-xs uppercase text-neutral-500">Psych Eval (Last)</label>
                    <span class="text-lg text-yellow-400">${psychEval}</span>
                </div>
                <div>
                    <label class="block text-xs uppercase text-neutral-500">Current Assignment</label>
                    <span class="text-lg">${currentAssignment}</span>
                </div>
            </section>

            <!-- LOG BODY -->
            <main class="p-6 md:p-8 space-y-6">
                
                <!-- Medical Status -->
                <div>
                    <h2 class="font-sans text-xl text-primary-yellow uppercase tracking-wider mb-3">:: Medical Status Flags ::</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <!-- Flag 1 -->
                        <div class="border ${medFlag1Class} p-3 bg-neutral-900">
                            <span class="block font-bold">${medFlag1Text}</span>
                            <span class="text-xs text-neutral-400">${medFlag1Desc}</span>
                        </div>
                        <!-- Flag 2 -->
                        <div class="border ${medFlag2Class} p-3 bg-neutral-900">
                            <span class="block font-bold">${medFlag2Text}</span>
                            <span class="text-xs text-neutral-400">${medFlag2Desc}</span>
                        </div>
                        <!-- Flag 3 -->
                        <div class="border ${medFlag3Class} p-3 bg-neutral-900">
                            <span class="block font-bold">${medFlag3Text}</span>
                            <span class="text-xs text-neutral-400">${medFlag3Desc}</span>
                        </div>
                        <!-- Flag 4 -->
                        <div class="border ${medFlag4Class} p-3 bg-neutral-900">
                            <span class="block font-bold">${medFlag4Text}</span>
                            <span class="text-xs text-neutral-400">${medFlag4Desc}</span>
                        </div>
                    </div>
                </div>

                <!-- Admin Logs -->
                <div>
                    <h2 class="font-sans text-xl text-primary-yellow uppercase tracking-wider mb-3">:: Administrative Logs ::</h2>
                    <div class="font-mono text-base bg-black/50 border border-neutral-700 p-4 h-48 overflow-y-auto space-y-2">
                        ${adminLogs}
                    </div>
                </div>
            </main>

            <!-- FOOTER ACTIONS -->
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
// PERSONNEL NAVIGATION & PASSWORD PROTECTION
// ============================================================================

/**
 * Opens a personnel record by ID, prompting for password if confidential
 */
function openPersonnelRecord(personnelId, isConfidential, password) {
    // Ensure record is loaded
    if (!personnelRecordData[personnelId]) {
        console.warn(`Record for personnel ${personnelId} not found`);
        return;
    }

    // If confidential and has password, show password prompt
    if (isConfidential && password) {
        showPasswordPrompt(personnelId, password);
    } else {
        // Open directly
        showPersonnelRecord(personnelId);
    }
}

/**
 * Shows the password prompt modal
 */
function showPasswordPrompt(personnelId, password) {
    pendingAccessPersonnelId = personnelId;
    pendingAccessPassword = password;
    
    passwordInput.value = '';
    passwordError.classList.add('hidden');
    passwordModal.classList.remove('hidden');
    
    // Focus the input
    setTimeout(() => passwordInput.focus(), 100);
    
    // Allow Enter key to submit
    passwordInput.onkeypress = function(e) {
        if (e.key === 'Enter') {
            submitPassword();
        }
    };
}

/**
 * Submits the password and checks if it's correct
 */
function submitPassword() {
    const enteredPassword = passwordInput.value.trim();
    
    if (enteredPassword === pendingAccessPassword) {
        // Correct password
        passwordModal.classList.add('hidden');
        showPersonnelRecord(pendingAccessPersonnelId);
        pendingAccessPersonnelId = null;
        pendingAccessPassword = null;
    } else {
        // Incorrect password
        passwordError.classList.remove('hidden');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

/**
 * Cancels the password prompt
 */
function cancelPasswordPrompt() {
    passwordModal.classList.add('hidden');
    pendingAccessPersonnelId = null;
    pendingAccessPassword = null;
}

/**
 * Shows a personnel record view
 */
function showPersonnelRecord(personnelId) {
    const recordView = document.getElementById(`personnel-record-${personnelId}`);
    
    if (recordView) {
        // Hide the directory
        directoryView.classList.add('hidden');
        
        // Hide all other record views
        personnelRecordViews.forEach(view => {
            if (view.id !== recordView.id) {
                view.classList.add('hidden');
            }
        });
        
        // Show the selected record view
        recordView.classList.remove('hidden');
    } else {
        console.error(`Personnel record view with ID 'personnel-record-${personnelId}' not found.`);
    }
}

/**
 * Returns to the main directory view from any record view
 */
function goBack() {
    // Hide all record views
    personnelRecordViews.forEach(view => {
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
                <div class="inline-block">Loading personnel directory...</div>
            </td>
        </tr>
    `;
}

/**
 * Shows error state in the directory table
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
 * Initializes the application by loading directory and records
 */
async function initialize() {
    if (!CONFIG.SHEET_ID || !CONFIG.API_KEY) {
        showErrorState('Sheet ID and API Key must be configured. Please update the CONFIG object in the script.');
        return;
    }

    // Load sheet metadata first to get the title
    sheetMetadata = await fetchSheetMetadata(CONFIG.SHEET_ID, CONFIG.API_KEY);
    updatePageTitle(sheetMetadata.title);

    // Load directory and records in parallel
    await Promise.all([
        loadDirectory(),
        loadPersonnelRecords()
    ]);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

