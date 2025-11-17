// ============================================================================
// GOOGLE SHEETS INTEGRATION - MULTI-CAM VIEW
// ============================================================================
//
// 1. CREATE YOUR GOOGLE SHEET:
//    - Add a new tab called "Cams" to your existing Google Sheet
//
// 2. CAMS SHEET FORMAT (tab name: "Cams"):
//    Required columns (first row is headers, case-insensitive):
//    - camId: Unique camera identifier (e.g., "cam-corridor")
//    - section: Section name (e.g., "SECTION A", "SECTION B")
//    - location: Location description (e.g., "A-03 CORRIDOR (MAIN)")
//    - status: Camera status ("ONLINE", "FLICKER", "INTERFERENCE", "LOST SIGNAL", "OFFLINE")
//    - distance: Distance indicator (e.g., "14m")
//    - hudText: HUD display text (e.g., "ZOOM: 1.0x  |  PAN: H-AXIS")
//    - imageUrl: URL to camera feed image or video (supports .jpg, .png, .gif, .webp, .mp4, .webm, .mov)
//                Note: For "LOST SIGNAL" status, imageUrl is ignored and animated static is rendered
//    - panEnabled: "true" or "false" (enables pan animation)
//    - panDuration: Pan animation duration in seconds (e.g., "7")
//    - glitchMinMs: Minimum glitch interval in milliseconds (for FLICKER/INTERFERENCE)
//    - glitchMaxMs: Maximum glitch interval in milliseconds (for FLICKER/INTERFERENCE)
//
// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    SHEET_ID: '1qy6CMeOH8qf508wfTs3RAFdsSCO_hNnShE2Z1mHXZzI', // Replace with your Google Sheet ID
    API_KEY: 'AIzaSyB8GH1-iSNqGPd2t9ZWk61UTrurjoBWVBE',  // Replace with your Google Sheets API key
    CAMS_TAB_NAME: 'Cams'
};

// Alternative: Read from URL query parameters
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('sheetId')) CONFIG.SHEET_ID = urlParams.get('sheetId');
if (urlParams.get('apiKey')) CONFIG.API_KEY = urlParams.get('apiKey');

// ============================================================================
// GLOBAL STATE
// ============================================================================
const clockEl = document.getElementById('clock');
const listEl = document.getElementById('list');
const viewEl = document.getElementById('view');
const labelEl = document.getElementById('label');
const stateEl = document.getElementById('state');
const togglePanBtn = document.getElementById('togglePan');
const glitchEl = document.getElementById('glitch');
const hudEl = document.getElementById('hud');

let cameras = {}; // Store camera data keyed by camId
let sections = {}; // Store cameras grouped by section
let activeId = null;
let panPaused = false;
let panNode = null;
let glitchTimer = null;
let lostSignalAnimationId = null; // Track lost signal animation frame

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

// ============================================================================
// CAMERA DATA LOADING
// ============================================================================

/**
 * Loads camera data from Google Sheets
 */
async function loadCameras() {
    try {
        showLoadingState();
        
        const range = `${CONFIG.CAMS_TAB_NAME}!A1:Z1000`;
        const rows = await fetchSheetData(CONFIG.SHEET_ID, range, CONFIG.API_KEY);
        
        if (rows.length === 0) {
            showErrorState('No camera data found in Cams sheet');
            return;
        }

        const camEntries = parseSheetData(rows);
        
        // Store camera data and group by section
        camEntries.forEach(entry => {
            const camId = entry.camid || '';
            if (camId) {
                cameras[camId] = {
                    id: camId,
                    section: entry.section || 'UNKNOWN',
                    location: entry.location || 'Unknown Location',
                    status: (entry.status || 'OFFLINE').toUpperCase(),
                    distance: entry.distance || '--',
                    hudText: entry.hudtext || 'CAMERA FEED',
                    imageUrl: entry.imageurl || '',
                    panEnabled: entry.panenabled === 'true' || entry.panenabled === 'TRUE',
                    panDuration: parseFloat(entry.panduration) || 7,
                    glitchMinMs: parseInt(entry.glitchminms) || 400,
                    glitchMaxMs: parseInt(entry.glitchmaxms) || 1200
                };

                // Group by section
                const sectionName = cameras[camId].section;
                if (!sections[sectionName]) {
                    sections[sectionName] = [];
                }
                sections[sectionName].push(cameras[camId]);
            }
        });

        renderCameraList();
        
        // Auto-select first camera
        if (Object.keys(cameras).length > 0) {
            const firstCamId = Object.keys(cameras)[0];
            loadScene(firstCamId);
        }
        
    } catch (error) {
        showErrorState(`Failed to load cameras: ${error.message}`);
        console.error('Camera loading error:', error);
    }
}

/**
 * Renders the camera list from loaded camera data
 */
function renderCameraList() {
    listEl.innerHTML = '';

    if (Object.keys(sections).length === 0) {
        listEl.innerHTML = '<div class="text-center text-neutral-500 p-4">No cameras found</div>';
        return;
    }

    // Render sections in order
    Object.keys(sections).sort().forEach(sectionName => {
        // Add section header
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section';
        sectionHeader.textContent = sectionName;
        listEl.appendChild(sectionHeader);

        // Add cameras in this section
        sections[sectionName].forEach(cam => {
            const camDiv = document.createElement('div');
            camDiv.className = 'cam';
            camDiv.dataset.id = cam.id;
            camDiv.dataset.state = cam.status;

            // Determine dot color based on status
            let dotClass = 'ok';
            if (cam.status === 'FLICKER') {
                dotClass = 'warn';
            } else if (cam.status === 'INTERFERENCE' || cam.status === 'OFFLINE' || cam.status === 'LOST SIGNAL') {
                dotClass = 'err';
            }

            camDiv.innerHTML = `
                <div class="dot ${dotClass}"></div>
                <div class="loc">${cam.location}</div>
                <div class="dist">${cam.distance}</div>
            `;

            listEl.appendChild(camDiv);
        });
    });
}

// ============================================================================
// SCENE LOADING & RENDERING
// ============================================================================

/**
 * Loads a camera scene into the viewport
 */
function loadScene(id) {
    const cam = cameras[id];
    if (!cam) {
        console.error(`Camera ${id} not found`);
        return;
    }

    activeId = id;

    // Stop any existing lost signal animation
    stopLostSignalEffect();

    // Clear previous view
    viewEl.innerHTML = '';

    let mediaElement;

    // Check if this is a LOST SIGNAL status - render animated static
    if (cam.status === 'LOST SIGNAL') {
        // Create container for lost signal effect
        const container = document.createElement('div');
        container.className = 'lost-signal-container';
        
        // Create canvas for animated static effect
        const canvas = document.createElement('canvas');
        canvas.className = 'lost-signal-canvas';
        canvas.width = viewEl.offsetWidth || 800;
        canvas.height = viewEl.offsetHeight || 600;
        
        // Create text overlay
        const textOverlay = document.createElement('div');
        textOverlay.className = 'lost-signal-text';
        textOverlay.innerHTML = '<span>NO SIGNAL</span>';
        
        container.appendChild(canvas);
        container.appendChild(textOverlay);
        viewEl.appendChild(container);
        panNode = null; // No pan for lost signal
        
        // Start the static animation
        startLostSignalEffect(canvas);
    } else {
        // Determine if the URL is a video file
        const isVideo = cam.imageUrl && (
            cam.imageUrl.toLowerCase().endsWith('.mp4') ||
            cam.imageUrl.toLowerCase().endsWith('.webm') ||
            cam.imageUrl.toLowerCase().endsWith('.mov')
        );

        if (isVideo) {
            // Create video element for video files
            const video = document.createElement('video');
            video.loop = true;
            video.muted = true;
            video.autoplay = true;
            video.playsInline = true;
            video.setAttribute('playsinline', ''); // iOS compatibility
            video.setAttribute('webkit-playsinline', ''); // Older iOS
            
            // Apply pan class if enabled
            if (cam.panEnabled) {
                video.className = 'pan';
                video.style.animationDuration = `${cam.panDuration}s`;
            }
            
            // Set source and load
            video.src = cam.imageUrl;
            video.load();
            
            // Add error handler
            video.addEventListener('error', (e) => {
                console.error('Video load error:', e, 'Source:', video.src);
            });
            
            // Attempt to play after loaded metadata
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(err => {
                    console.warn('Autoplay prevented:', err);
                    // Fallback: try playing on first user interaction
                    document.addEventListener('click', () => {
                        video.play().catch(e => console.warn('Manual play failed:', e));
                    }, { once: true });
                });
            });
            
            // Fallback: try to play after a short delay
            setTimeout(() => {
                if (video.paused) {
                    video.play().catch(err => console.warn('Delayed play attempt failed:', err));
                }
            }, 500);
            
            mediaElement = video;
        } else {
            // Create image element for static images
            const img = document.createElement('img');
            img.alt = cam.location;
            img.src = cam.imageUrl || 'https://placehold.co/1600x600/031018/1d5b72?text=NO+CAMERA+FEED';
            img.onerror = function() {
                this.src = 'https://placehold.co/1600x600/031018/1d5b72?text=IMAGE+LOAD+ERROR';
            };

            // Apply pan class if enabled
            if (cam.panEnabled) {
                img.className = 'pan';
                // Set custom pan duration via inline style
                img.style.animationDuration = `${cam.panDuration}s`;
            }
            
            mediaElement = img;
        }

        panNode = mediaElement;
        viewEl.appendChild(mediaElement);
    }

    // Update UI elements
    labelEl.textContent = cam.location;
    stateEl.textContent = cam.status;
    hudEl.textContent = `${cam.hudText}  |  CAMERA: ${cam.id.toUpperCase()}`;

    // Update active camera highlight
    document.querySelectorAll('.cam').forEach(el => {
        el.classList.toggle('active', el.dataset.id === id);
    });

    // Reset pan button state
    panPaused = false;
    togglePanBtn.textContent = 'PAUSE PAN';
    if (panNode && cam.panEnabled) {
        panNode.style.animationPlayState = 'running';
    }

    // Handle status-specific effects
    stopGlitch();
    if (cam.status === 'FLICKER') {
        triggerGlitch(cam.glitchMinMs, cam.glitchMaxMs);
    } else if (cam.status === 'INTERFERENCE') {
        triggerGlitch(cam.glitchMinMs, cam.glitchMaxMs);
    } else if (cam.status === 'LOST SIGNAL') {
        triggerGlitch(cam.glitchMinMs, cam.glitchMaxMs);
    }

    // Update accessibility
    viewEl.setAttribute('aria-label', `Camera ${cam.location}. Status ${cam.status}.`);
}

// ============================================================================
// LOST SIGNAL EFFECT
// ============================================================================

/**
 * Starts the animated static effect for LOST SIGNAL cameras
 */
function startLostSignalEffect(canvas) {
    // Stop any existing animation
    stopLostSignalEffect();
    
    const ctx = canvas.getContext('2d');
    let w = canvas.width;
    let h = canvas.height;
    
    // Render low-res noise and upscale for performance
    const scale = 0.28;
    let smallW = Math.max(64, Math.floor(w * scale));
    let smallH = Math.max(64, Math.floor(h * scale));
    let buffer = ctx.createImageData(smallW, smallH);
    let data = buffer.data;
    
    // Noise parameters
    const fps = 24;
    const frameInterval = 1000 / fps;
    let last = 0;
    let t = 0;
    let prev = null;
    
    function drawNoise(now) {
        if (now - last < frameInterval) {
            lostSignalAnimationId = requestAnimationFrame(drawNoise);
            return;
        }
        
        const dt = (now - last) / 1000;
        last = now;
        t += dt;
        
        // Base random static
        for (let i = 0; i < data.length; i += 4) {
            const base = 100 + Math.random() * 70;
            data[i] = data[i + 1] = data[i + 2] = base;
            data[i + 3] = 255;
        }
        
        // Slow drifting luminance band
        const bandY = Math.floor(((t * 20) % smallH));
        for (let y = bandY - 3; y < bandY + 3; y++) {
            if (y < 0 || y >= smallH) continue;
            for (let x = 0; x < smallW; x++) {
                const idx = (y * smallW + x) * 4;
                data[idx] = Math.min(255, data[idx] + 10);
                data[idx + 1] = Math.min(255, data[idx + 1] + 10);
                data[idx + 2] = Math.min(255, data[idx + 2] + 10);
            }
        }
        
        // Sparse white-noise speckles
        const speckles = Math.floor((smallW * smallH) * 0.002);
        for (let s = 0; s < speckles; s++) {
            const x = (Math.random() * smallW) | 0;
            const y = (Math.random() * smallH) | 0;
            const idx = (y * smallW + x) * 4;
            data[idx] = data[idx + 1] = data[idx + 2] = 255;
        }
        
        // Temporal blend with previous frame
        if (prev && prev.length === data.length) {
            const blend = 0.85;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = data[i] * (1 - blend) + prev[i] * blend;
                data[i + 1] = data[i + 1] * (1 - blend) + prev[i + 1] * blend;
                data[i + 2] = data[i + 2] * (1 - blend) + prev[i + 2] * blend;
            }
        }
        prev = new Uint8ClampedArray(data);
        
        // Draw upscaled
        const off = document.createElement('canvas');
        off.width = smallW;
        off.height = smallH;
        const octx = off.getContext('2d');
        octx.putImageData(buffer, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, w, h);
        
        lostSignalAnimationId = requestAnimationFrame(drawNoise);
    }
    
    lostSignalAnimationId = requestAnimationFrame(drawNoise);
}

/**
 * Stops the lost signal animation
 */
function stopLostSignalEffect() {
    if (lostSignalAnimationId) {
        cancelAnimationFrame(lostSignalAnimationId);
        lostSignalAnimationId = null;
    }
}

// ============================================================================
// GLITCH EFFECTS
// ============================================================================

/**
 * Triggers periodic glitch effect
 */
function triggerGlitch(min, max) {
    stopGlitch();
    
    function bump() {
        glitchEl.classList.remove('show');
        void glitchEl.offsetWidth; // Force reflow
        glitchEl.classList.add('show');
        schedule();
    }
    
    function schedule() {
        glitchTimer = setTimeout(bump, Math.random() * (max - min) + min);
    }
    
    schedule();
}

/**
 * Stops glitch effect
 */
function stopGlitch() {
    if (glitchTimer) {
        clearTimeout(glitchTimer);
        glitchTimer = null;
    }
    glitchEl.classList.remove('show');
}

// ============================================================================
// UI STATE MANAGEMENT
// ============================================================================

/**
 * Shows loading state in the camera list
 */
function showLoadingState() {
    listEl.innerHTML = '<div class="text-center text-neutral-400 p-4">Loading cameras...</div>';
    labelEl.textContent = '—';
    stateEl.textContent = '—';
}

/**
 * Shows error state in the camera list
 */
function showErrorState(message) {
    listEl.innerHTML = `
        <div class="p-4 text-red-500">
            <div class="font-bold mb-2">ERROR</div>
            <div class="text-sm">${message}</div>
            <div class="text-xs text-neutral-500 mt-4">
                Check Sheet ID and API Key configuration.
            </div>
        </div>
    `;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle camera selection clicks
 */
listEl.addEventListener('click', (e) => {
    const item = e.target.closest('.cam');
    if (!item) return;
    
    const camId = item.dataset.id;
    loadScene(camId);
});

/**
 * Handle pan toggle button
 */
togglePanBtn.addEventListener('click', () => {
    panPaused = !panPaused;
    
    if (panNode) {
        panNode.style.animationPlayState = panPaused ? 'paused' : 'running';
    }
    
    togglePanBtn.textContent = panPaused ? 'RESUME PAN' : 'PAUSE PAN';
});

// ============================================================================
// CLOCK UPDATE
// ============================================================================

/**
 * Updates the clock display
 */
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}:${s}`;
}

updateClock();
setInterval(updateClock, 1000);

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the application
 */
async function initialize() {
    if (!CONFIG.SHEET_ID || !CONFIG.API_KEY) {
        showErrorState('Sheet ID and API Key must be configured.');
        return;
    }

    await loadCameras();

    // Runtime assertions
    setTimeout(() => {
        console.assert(viewEl.querySelector('img'), '[TEST] No IMG mounted in view');
        console.assert(document.querySelector('.cam.active'), '[TEST] No active camera highlighted');
    }, 1200);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

