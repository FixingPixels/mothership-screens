# Google Sheets Integration - MUTHER CMS

Dynamic Lo-Fi / Sci-Fi Screens and Interfaces powered by Google Sheets. Created for use in Mothership RPG.

## Overview

This system provides six main components:

**Google Sheets Integration Components** (Dynamic):
1. **File Browser** (`file-browser.html`) - A dynamic file directory with clickable files that open detailed content views
2. **Maintenance Log** (`maintenance-log.html`) - A dynamic maintenance log table for tracking system events
3. **Personnel Records** (`personnel-records.html`) - A personnel directory browser with password-protected confidential records
4. **Multi-Cam View** (`multi-cam-view.html`) - A dynamic camera matrix viewer with real-time feeds and glitch effects

**Static/Demo Components** (Not yet connected to Google Sheets):
5. **Command Center** (`command-center.html`) - A command and control dashboard with system monitoring, power routing, and alerts
6. **Personnel Monitor** (`personnel-monitor.html`) - A real-time personnel monitoring system with vital signs, cognitive sensors, and suit telemetry

The first four components have their content managed through Google Sheets, making it easy for non-technical users to add, modify, or remove content without editing code. The Command Center and Personnel Monitor are currently static demo interfaces with simulated data.

## Features

- **Google Sheets Integration**: All file data is stored in and loaded from Google Sheets
- **Two-Sheet Architecture**: Separate sheets for directory listing and file content
- **Multiple File States**: Support for normal, locked, corrupted, and system files
- **Dynamic Content**: HTML support in file content for rich formatting
- **Client-Side Only**: No backend required - works with static hosting
- **Retro UI**: Matches the Mothership RPG aesthetic with scanline effects and terminal-style interface

## Quick Start

### 1. Set Up Your Google Sheet

**Option A: Import Sample Data (Recommended for First-Time Setup)**

1. Create a new Google Sheet
2. Import the sample CSV files:
   - Go to `File > Import`
   - Upload `sample-data/Directory.csv`
   - Choose "Insert new sheet(s)" and click "Import data"
   - Rename the imported sheet to "Directory"
   - Repeat for `sample-data/Content.csv` and rename to "Content"
3. You now have working sample data to test with!

**Option B: Create Sheets Manually**

Create a new Google Sheet with two tabs:

#### Directory Tab
Create a tab named "Directory" with the following columns (first row as headers):

| fileId | filename | size | modified | notes | isClickable | status | rowClass | notesClass |
|--------|----------|------|----------|-------|-------------|--------|----------|------------|
| log-entry-1 | log_entry_001.log | 1.2 KB | 2279.08.14 | System Boot | true | normal | | text-yellow-400 |
| corrupted-file | [CORRUPTED_0x88] | -- | -- | READ ERROR | false | corrupted | | text-red-500 |

**Column Descriptions:**
- `fileId`: Unique identifier (links to Content sheet)
- `filename`: Display name in the directory
- `size`: File size (e.g., "1.2 KB")
- `modified`: Last modified date
- `notes`: Notes or description
- `isClickable`: "true" or "false" (determines if file can be opened)
- `status`: "normal", "locked", "corrupted", or "system"
- `rowClass`: Optional CSS classes for the row
- `notesClass`: Optional CSS classes for the notes cell

#### Content Tab
Create a tab named "Content" with the following columns:

| fileId | title | subtitle | status | statusSubtext | logId | timestamp | origin | bodyContent |
|--------|-------|----------|--------|---------------|-------|-----------|--------|-------------|
| log-entry-1 | Log Entry :: System | MUTHER-8800 // System Log | :: STATUS: ACTIVE :: | SYSTEM BOOT | System Initialization | 2279.08.14 // 00:00:01 | SYSTEM | `<p>System boot sequence initiated...</p>` |

**Column Descriptions:**
- `fileId`: Must match a fileId from Directory sheet
- `title`: Main title for the file view
- `subtitle`: Subtitle text below the title
- `status`: Status badge text (e.g., ":: ACTIVE ::")
- `statusSubtext`: Text below status badge
- `logId`: Log ID field (optional)
- `timestamp`: Timestamp field (optional)
- `origin`: Origin/author field (optional)
- `bodyContent`: Main content (supports HTML)

### 2. Set Up Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create an API Key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - (Recommended) Restrict the key to Google Sheets API only

### 3. Make Your Sheet Public

Option A (Simplest):
- Open your Google Sheet
- Click "Share" button
- Change access to "Anyone with the link" > "Viewer"

Option B (More Secure):
- Keep sheet private
- Configure API key with appropriate service account permissions

### 4. Configure the Application

#### Method 1: Edit the JavaScript file
Open `js/file-browser.js` and update the CONFIG object:

```javascript
const CONFIG = {
    SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',
    API_KEY: 'YOUR_API_KEY_HERE',
    DIRECTORY_TAB_NAME: 'Directory',
    CONTENT_TAB_NAME: 'Content'
};
```

**Finding your Sheet ID:**
- Open your Google Sheet
- Look at the URL: `https://docs.google.com/spreadsheets/d/{THIS_IS_YOUR_SHEET_ID}/edit`
- Copy the ID between `/d/` and `/edit`

#### Method 2: Use URL Parameters (easier for sharing)
Open the file browser with query parameters:

```
file-browser.html?sheetId=YOUR_SHEET_ID&apiKey=YOUR_API_KEY
```

### 5. Test Your Setup

1. Open `file-browser.html` in a web browser
2. You should see your directory loading
3. Click on clickable files to view their content

## File Structure

```
network/
├── README.md                 # This file
├── file-browser.html         # File Browser component
├── maintenance-log.html      # Maintenance Log component
├── personnel-records.html    # Personnel Records component
├── multi-cam-view.html       # Multi-Cam View component
├── command-center.html       # Command Center (static demo)
├── personnel-monitor.html    # Personnel Monitor (static demo)
├── lost-signal.html          # Lost signal demo page
├── personnel-record.html     # Standalone personnel record page
├── css/
│   └── file-browser.css      # Custom styles
├── js/
│   ├── file-browser.js       # File Browser logic
│   ├── maintenance-log.js    # Maintenance Log logic
│   ├── personnel-records.js  # Personnel Records logic
│   └── multi-cam-view.js     # Multi-Cam View logic
├── img/                      # Image assets
└── sample-data/
    ├── Directory.csv         # Sample directory data
    ├── Content.csv           # Sample content data
    ├── Maintenance.csv       # Sample maintenance data
    ├── Metadata.csv          # Sample metadata
    ├── PersonnelDirectory.csv # Sample personnel directory
    ├── PersonnelRecords.csv  # Sample personnel records
    └── Cams.csv              # Sample camera data
```

## Sample Data

The `sample-data/` folder contains ready-to-import CSV files with example content:

### What's Included

**Directory.csv** contains 8 sample files demonstrating:
- 3 clickable log entries (normal status)
- 1 non-clickable maintenance log
- 1 system file (grayed out)
- 1 corrupted file (red styling)
- 2 additional non-clickable files

**Content.csv** contains 3 full file entries with:
- Rich HTML content
- Custom styling with Tailwind classes
- Multiple content sections (log ID, timestamp, origin)
- Examples of the MUTHER aesthetic

### How to Import

1. **Create a new Google Sheet**

2. **Import Directory data:**
   - Click `File > Import`
   - Click `Upload` tab
   - Select `sample-data/Directory.csv`
   - Import location: "Insert new sheet(s)"
   - Separator type: "Comma"
   - Click `Import data`
   - Right-click the new sheet tab and rename it to "Directory"

3. **Import Content data:**
   - Repeat the process with `sample-data/Content.csv`
   - Rename the imported sheet to "Content"

4. **Configure the application** (see Setup section above)

5. **Test!** Open `file-browser.html` in your browser

### Customizing Sample Data

After importing, you can:
- Edit any cell directly in Google Sheets
- Add new rows for more files
- Delete rows you don't need
- Change the styling by modifying the class columns
- Update the HTML content in the bodyContent field

The changes will be reflected immediately when you refresh the file browser (the page fetches fresh data from Google Sheets each time it loads).

## Styling Guide

### Using Tailwind Classes

The interface uses Tailwind CSS with custom configuration. You can use these classes in your `rowClass`, `notesClass`, or within `bodyContent` HTML:

**Custom Colors:**
- `text-primary-yellow` - MUTHER yellow (#fcee0a)
- `text-neutral-500` - Gray text
- `text-red-500` - Red text (for errors)

**Example in bodyContent:**
```html
<p>System warning: <span class="text-primary-yellow">critical</span> error detected.</p>
```

### File Status Types

| Status | Effect |
|--------|--------|
| `normal` | Yellow icon, clickable (if isClickable=true) |
| `locked` | Gray icon, not clickable |
| `corrupted` | Red icon and text, not clickable |
| `system` | Gray icon and text, configurable clickable |

## Advanced Usage

### Rich Content Formatting

The `bodyContent` field supports full HTML. Example:

```html
<p>
    We have detected anomalous readings from the 
    <span class="font-bold text-primary-yellow">carcinid specimen</span>.
    The frequency patterns suggest:
</p>
<ul class="list-disc ml-6">
    <li>High-frequency acoustic emission</li>
    <li>Memetic viral transmission</li>
    <li>Neural desynchronization</li>
</ul>
```

### Dynamic Header and Path

Edit `file-browser.html` to customize:

```html
<h1>Your Custom Title</h1>
<p class="text-neutral-400 text-lg">
    PATH: //YOUR/CUSTOM/PATH
</p>
```

### Footer Statistics

The footer shows static statistics. To make them dynamic, modify the footer in `file-browser.html` or update `js/file-browser.js` to calculate from loaded data.

## Troubleshooting

### "Sheet ID and API Key must be configured"
- Ensure you've set both `SHEET_ID` and `API_KEY` in the CONFIG object
- Check for typos in your configuration

### "Failed to load directory: API Error: 403"
- Your API key may not have access to the sheet
- Make sure the sheet is publicly viewable (see Step 3)
- Check that the Google Sheets API is enabled in your project

### "No data found in Directory sheet"
- Verify the tab name is exactly "Directory" (case-sensitive)
- Ensure the sheet has headers in the first row
- Check that there's data in rows below the header

### Files not appearing
- Check `isClickable` is set to "true" for files you want to open
- Verify `fileId` in Content sheet matches Directory sheet exactly
- Look in browser console (F12) for error messages

### Content not displaying correctly
- Ensure HTML in `bodyContent` is properly formatted
- Check for unescaped quotes in your HTML
- Verify all required columns have data

## Security Notes

1. **API Key Exposure**: The API key is visible in the client-side code. Restrict it to:
   - Only the Google Sheets API
   - Specific referrer URLs (your domain)
   
2. **Sheet Permissions**: Only grant "Viewer" access, never "Editor"

3. **Sensitive Data**: Don't store sensitive information in publicly viewable sheets

## Examples

### Example Directory Row
```
fileId: log-entry-edam-1
filename: log_entry_881M.log
size: 1.2 KB
modified: 2279.08.14
notes: Preliminary Assessment
isClickable: true
status: normal
rowClass: 
notesClass: text-yellow-400
```

### Example Content Row
```
fileId: log-entry-edam-1
title: Log Entry :: Greta Base
subtitle: Station AI: [GRETA-SYS] // Research Log
status: :: STATUS: ACTIVE STUDY ::
statusSubtext: SPECIES RESEARCH // CARCINID
logId: Acoustic Signature of Replication: Preliminary Assessment
timestamp: 2279.08.14 // 23:41:12
origin: Dr. Edam
bodyContent: <p>We have successfully obtained and contained a care larva for intensive study...</p>
```

---

# Maintenance Log - Google Sheets Integration

## Overview

The Maintenance Log (`maintenance-log.html`) displays a dynamic table of maintenance events, perfect for tracking system issues, repairs, and status changes. Unlike the file browser, this is a simple table view with no clickable rows.

## Features

- **Single Table View**: All log entries displayed in one chronological table
- **Dynamic Content**: Update the log by editing the Google Sheet
- **Status Colors**: Automatic color coding based on status (NOMINAL, WARNING, CRITICAL, FAILURE)
- **HTML Support**: Rich formatting in log entries
- **Optional Metadata**: Configure page headers and info sections via a Metadata sheet

## Quick Start

### 1. Set Up Your Google Sheet

**Option A: Import Sample Data (Recommended)**

1. Create a new Google Sheet (or use the same one as file-browser)
2. Import `sample-data/Maintenance.csv`:
   - Go to `File > Import`
   - Upload `sample-data/Maintenance.csv`
   - Choose "Insert new sheet(s)" and click "Import data"
   - Rename the imported sheet to "Maintenance"
3. (Optional) Import `sample-data/Metadata.csv` for header customization:
   - Repeat the import process
   - Rename to "Metadata"

**Option B: Create Sheets Manually**

#### Maintenance Tab (Required)
Create a tab named "Maintenance" with the following columns:

| timestamp | techId | logEntry | status | entryClass | statusClass | rowClass | colspan |
|-----------|--------|----------|--------|------------|-------------|----------|---------|
| 2279.08.09 // 14:30 | 755-A | Routine service. Primary filter replaced. | NOMINAL | | | | |
| 2279.08.14 // 01:50 | 755-A | Filter is clogged. Can't clear it. | CRITICAL | text-red-500 | | | |

**Column Descriptions:**
- `timestamp`: Event timestamp (e.g., "2279.08.09 // 14:30")
- `techId`: Technician or system ID (e.g., "755-A", "M.U.T.H.R.")
- `logEntry`: Log entry text (supports HTML)
- `status`: Status level (NOMINAL, WARNING, CRITICAL, FAILURE)
- `entryClass`: Optional CSS classes for the log entry cell (e.g., "text-yellow-400")
- `statusClass`: Optional CSS classes for status cell (overrides default colors)
- `rowClass`: Optional CSS classes for the entire row
- `colspan`: Set to "4" for special rows that span all columns (e.g., connection lost messages)

**Auto Status Colors:**
If `statusClass` is empty, colors are applied automatically:
- NOMINAL → green (`text-green-400`)
- WARNING → yellow (`text-yellow-400`)
- CRITICAL / FAILURE → red (`text-red-500`)

#### Metadata Tab (Optional)
Create a tab named "Metadata" with two columns for customizing page headers:

| key | value |
|-----|-------|
| title | Maintenance Log |
| component | COMPONENT: AIR SCRUBBER 02 // DECK C (SCIENCE) |
| statusText | :: STATUS: FAILURE IMMINENT :: |
| statusSubtext | AUTO-LOGGING ACTIVE |
| componentId | WY-SCRUB-02C-8800 |
| lastServiced | 2279.08.13 |
| assignedTech | C. HAAS (755-A) |

**Supported Metadata Keys:**
- `title`: Main page title
- `component`: Component description below title
- `statusText`: Status text in header (upper right)
- `statusSubtext`: Status subtext in header
- `componentId`: Component ID in info section
- `lastServiced`: Last service date in info section
- `assignedTech`: Assigned technician in info section

### 2. Configure the API

Same as file browser - you can use the same Sheet ID and API key:

1. Open `js/maintenance-log.js`
2. Update the configuration:
```javascript
const CONFIG = {
    SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
    API_KEY: 'YOUR_GOOGLE_SHEETS_API_KEY',
    MAINTENANCE_TAB_NAME: 'Maintenance',
    METADATA_TAB_NAME: 'Metadata'
};
```

### 3. Test It

Open `maintenance-log.html` in your browser. The log entries should load from your Google Sheet.

## HTML in Log Entries

You can use HTML in the `logEntry` column for rich formatting:

```
Pressure alarm. Found <span class='bg-neutral-800 p-1'>unidentified biomass</span> in filter.
```

This allows for highlighting, emphasis, and other styling within log entries.

## Special Row Types

### Full-Width Message Rows
For special messages that span all columns (like "CONNECTION LOST"), set `colspan` to "4":

| timestamp | techId | logEntry | status | entryClass | statusClass | rowClass | colspan |
|-----------|--------|----------|--------|------------|-------------|----------|---------|
| | | | | [...CONNECTION TO COMPONENT LOST...] | text-neutral-600 p-4 | | 4 |

## Examples

### Basic Log Entry
```
timestamp: 2279.08.09 // 14:30
techId: 755-A
logEntry: Routine service. Primary filter replaced.
status: NOMINAL
entryClass: 
statusClass: 
rowClass: 
colspan: 
```

### Warning Entry with Custom Styling
```
timestamp: 2279.08.13 // 04:12
techId: 755-A
logEntry: Found <span class='bg-neutral-800 p-1'>organic biomass</span> in filter.
status: WARNING
entryClass: text-yellow-400
statusClass: 
rowClass: 
colspan: 
```

### Full-Width Special Message
```
timestamp: 
techId: 
logEntry: [...CONNECTION TO COMPONENT LOST...]
status: 
entryClass: text-neutral-600 p-4
statusClass: 
rowClass: 
colspan: 4
```

## Troubleshooting

### Log table shows "Loading..." forever
- Verify Sheet ID and API key are correct in `js/maintenance-log.js`
- Check browser console for API errors
- Ensure the "Maintenance" tab exists and is spelled correctly

### Metadata not appearing
- The Metadata sheet is optional - the page will work without it
- Verify the "Metadata" tab name matches `CONFIG.METADATA_TAB_NAME`
- Check that keys in the Metadata sheet match the supported keys

### Colors not showing
- Verify status values are exactly: NOMINAL, WARNING, CRITICAL, or FAILURE
- Check for extra spaces in the status column
- Use custom `statusClass` if you need different colors

---

# Personnel Records - Google Sheets Integration

## Overview

The Personnel Records system (`personnel-records.html`) displays a browsable directory of personnel with detailed service records. Confidential records can be password-protected, requiring players to enter an authorization code to view them.

## Features

- **Directory + Detail View**: Browse personnel in a list, click to view detailed records
- **Password Protection**: Mark records as confidential with password access
- **Dynamic Content**: Update all personnel data via Google Sheets
- **Medical Status Flags**: Display up to 4 customizable medical/status flags per person
- **Administrative Logs**: Chronological log entries with HTML formatting support
- **Status Indicators**: Visual status markers (active, deceased, missing, classified)

## Quick Start

### 1. Set Up Your Google Sheet

**Option A: Import Sample Data (Recommended)**

1. Create a new Google Sheet (or use the same one as other components)
2. Import `sample-data/PersonnelDirectory.csv`:
   - Go to `File > Import`
   - Upload `sample-data/PersonnelDirectory.csv`
   - Choose "Insert new sheet(s)" and click "Import data"
   - Rename the imported sheet to "PersonnelDirectory"
3. Import `sample-data/PersonnelRecords.csv`:
   - Repeat the import process
   - Rename to "PersonnelRecords"

**Option B: Create Sheets Manually**

#### PersonnelDirectory Tab (Required)
Create a tab named "PersonnelDirectory" with the following columns:

| personnelId | name | position | clearance | notes | status | isConfidential | password | rowClass | notesClass |
|-------------|------|----------|-----------|-------|--------|----------------|----------|----------|------------|
| thorne-a | Dr. Aris Thorne | Lead Xenobiologist | LEVEL 4 | CLASSIFIED | classified | true | ALPHA-PRIME | | text-red-500 |
| haas-c | C. Haas | Maintenance Tech | LEVEL 2 | Deck C | deceased | false | | | text-neutral-400 |

**Column Descriptions:**
- `personnelId`: Unique identifier (links to PersonnelRecords sheet)
- `name`: Display name in directory
- `position`: Position/rank
- `clearance`: Security clearance level
- `notes`: Notes or description
- `status`: "active", "deceased", "missing", or "classified" (affects icon color)
- `isConfidential`: "true" or "false" (requires password to access)
- `password`: Password for confidential records (plain text, for game use only - not secure!)
- `rowClass`: Optional CSS classes for the row
- `notesClass`: Optional CSS classes for notes cell

**Status Colors:**
- `active` → yellow icon
- `deceased` → red icon and text
- `missing` → yellow icon and text
- `classified` → red icon and text

#### PersonnelRecords Tab (Required)
Create a tab named "PersonnelRecords" with detailed record information:

**Required Columns:**
- `personnelId`: Must match personnelId from PersonnelDirectory
- `fullName`: Full legal name
- `serviceId`: Service ID number
- `fileNumber`: File number
- `position`: Position/assignment
- `contractingEntity`: Contracting entity
- `securityClearance`: Security clearance
- `psychEval`: Psych evaluation status
- `currentAssignment`: Current assignment
- `statusHeader`: Status header text (e.g., ":: STATUS: CLASSIFIED ::")
- `statusSubtext`: Status subtext (appears below header)

**Medical Flags (4 flags total):**
- `medFlag1Text`, `medFlag1Desc`, `medFlag1Class`
- `medFlag2Text`, `medFlag2Desc`, `medFlag2Class`
- `medFlag3Text`, `medFlag3Desc`, `medFlag3Class`
- `medFlag4Text`, `medFlag4Desc`, `medFlag4Class`

**Medical Flag Classes Examples:**
- Green: `border-neutral-600 text-green-400`
- Yellow: `border-yellow-400 text-yellow-400`
- Red (animated): `border-red-500 bg-red-900/30 text-red-500 animate-pulse`
- Neutral: `border-neutral-600 text-neutral-500`

**Administrative Logs:**
- `adminLogs`: HTML content for chronological log entries (use `<p>` tags for each entry)

### 2. Configure the API

Same as file browser - you can use the same Sheet ID and API key:

1. Open `js/personnel-records.js`
2. Update the configuration:
```javascript
const CONFIG = {
    SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
    API_KEY: 'YOUR_GOOGLE_SHEETS_API_KEY',
    DIRECTORY_TAB_NAME: 'PersonnelDirectory',
    RECORDS_TAB_NAME: 'PersonnelRecords'
};
```

### 3. Test It

Open `personnel-records.html` in your browser. Click on a personnel record to view details. If it's marked as confidential, you'll be prompted for the password.

## Password Protection

### How It Works

1. Set `isConfidential` to "true" in the PersonnelDirectory sheet
2. Add a password in the `password` column
3. When a user clicks the record, a modal prompts for the password
4. Only the correct password grants access to the full record

**Example:**
```
personnelId: thorne-a
isConfidential: true
password: ALPHA-PRIME
```

**Security Note:** This is NOT cryptographically secure. The password is stored in plain text in the Google Sheet and visible in the browser's network traffic. This is designed for **in-game storytelling purposes only**, not real security.

## HTML in Admin Logs

You can use HTML in the `adminLogs` column for rich formatting:

```html
<p><span class='text-neutral-500'>[2279.08.10]</span> Assignment confirmed.</p>
<p><span class='text-yellow-400'>[2279.08.12]</span> <span class='text-red-500 uppercase font-bold bg-neutral-800 p-1'>[REDACTED]</span></p>
<p><span class='text-red-400'>[2279.08.14]</span> BIO-CON flag triggered.</p>
```

This allows for:
- Color-coded timestamps
- Redacted sections with highlighting
- Status indicators
- Custom formatting

## Examples

### Basic Directory Entry
```
personnelId: smith-j
name: John Smith
position: Engineer
clearance: LEVEL 2
notes: Engine Room
status: active
isConfidential: false
password: 
rowClass: 
notesClass: 
```

### Confidential Directory Entry
```
personnelId: doe-j
name: Dr. Jane Doe
position: Science Officer
clearance: LEVEL 5
notes: CLASSIFIED
status: classified
isConfidential: true
password: OMEGA-CLEARANCE
rowClass: 
notesClass: text-red-500
```

### Medical Flag Examples
```
Flag 1 (Green - Healthy):
medFlag1Text: PHYTO: STABLE
medFlag1Desc: Physical condition nominal.
medFlag1Class: border-neutral-600 text-green-400

Flag 2 (Yellow - Warning):
medFlag2Text: PSYCH: [MAND-OBS]
medFlag2Desc: Mandatory observation required.
medFlag2Class: border-yellow-400 text-yellow-400

Flag 3 (Red - Critical):
medFlag3Text: BIO-CON: [ACTIVE]
medFlag3Desc: Subject under quarantine.
medFlag3Class: border-red-500 bg-red-900/30 text-red-500 animate-pulse

Flag 4 (Redacted):
medFlag4Text: [REDACTED]
medFlag4Desc: Clearance 5+ required.
medFlag4Class: border-neutral-600 text-neutral-500
```

## Troubleshooting

### Directory shows "Loading..." forever
- Verify Sheet ID and API key in `js/personnel-records.js`
- Check browser console for API errors
- Ensure "PersonnelDirectory" tab exists and is spelled correctly

### Record won't open / shows blank
- Ensure `personnelId` matches exactly between Directory and Records sheets
- Check that the PersonnelRecords sheet has a row for that personnelId
- Verify all required columns have data (empty fields use defaults)

### Password prompt won't accept correct password
- Check for extra spaces in the password column
- Passwords are case-sensitive
- Verify `isConfidential` is exactly "true" (lowercase)

### Medical flags not showing colors
- Verify the CSS class syntax is correct
- Use Tailwind CSS class names (e.g., `text-red-500`, not custom classes)
- Check for typos in the class names

## Support

For issues or questions:
1. Check the setup instructions in `js/file-browser.js`, `js/maintenance-log.js`, or `js/personnel-records.js`
2. Review the troubleshooting section above
3. Inspect browser console for error messages

## License

This project is part of the MUTHER-CMS system.

---

# Multi-Cam View - Google Sheets Integration

## Overview

The Multi-Cam View system (`multi-cam-view.html`) provides a dynamic security camera matrix interface displaying multiple camera feeds grouped by sections. Each camera can have different states (online, flickering, interference) with visual effects, customizable pan animations, and dynamic content loaded from Google Sheets.

## Features

- **Dynamic Camera List**: All camera feeds loaded from Google Sheets
- **Section Grouping**: Cameras organized by sections (e.g., SECTION A, SECTION B)
- **Camera States**: Visual indicators for ONLINE, FLICKER, INTERFERENCE, LOST SIGNAL, OFFLINE
- **Glitch Effects**: Configurable glitch/interference effects per camera
- **Pan Animation**: Controllable horizontal pan with customizable duration
- **Image Support**: Camera feeds displayed via image URLs
- **Real-time Clock**: Live updating timestamp display
- **Interactive HUD**: Dynamic overlay with camera information

## Quick Start

### 1. Set Up Your Google Sheet

Add a new tab called "Cams" to your existing Google Sheet (the same one used for Personnel Records, File Browser, etc.).

#### Cams Tab (Required)
Create a tab named "Cams" with the following columns (first row as headers):

| camId | section | location | status | distance | hudText | imageUrl | panEnabled | panDuration | glitchMinMs | glitchMaxMs |
|-------|---------|----------|--------|----------|---------|----------|------------|-------------|-------------|-------------|
| cam-corridor | SECTION A | A-03 CORRIDOR (MAIN) | ONLINE | 14m | ZOOM: 1.0x  \|  PAN: H-AXIS | https://example.com/img/corridor.jpg | true | 7 | 400 | 1200 |
| cam-cargo | SECTION B | B-12 CARGO BAY | FLICKER | 28m | ZOOM: 0.8x  \|  PAN: H-AXIS | https://example.com/img/cargo.jpg | true | 6 | 750 | 2200 |

**Column Descriptions:**
- `camId`: Unique camera identifier (e.g., "cam-corridor", "cam-medbay")
- `section`: Section name for grouping (e.g., "SECTION A", "SECTION B")
- `location`: Location description displayed in camera list (e.g., "A-03 CORRIDOR (MAIN)")
- `status`: Camera status - "ONLINE", "FLICKER", "INTERFERENCE", "LOST SIGNAL", or "OFFLINE"
- `distance`: Distance indicator (e.g., "14m", "7m")
- `hudText`: Custom HUD text overlay (e.g., "ZOOM: 1.0x  |  PAN: H-AXIS")
- `imageUrl`: URL to camera feed image (supports any web-accessible image)
- `panEnabled`: "true" or "false" - enables horizontal pan animation
- `panDuration`: Pan animation duration in seconds (e.g., "7", "6")
- `glitchMinMs`: Minimum glitch interval in milliseconds (for FLICKER/INTERFERENCE states)
- `glitchMaxMs`: Maximum glitch interval in milliseconds (for FLICKER/INTERFERENCE states)

**Status Indicators:**
- `ONLINE` → Green dot, no glitch effects
- `FLICKER` → Yellow/amber dot, periodic glitch effects
- `INTERFERENCE` → Red dot, frequent glitch effects
- `LOST SIGNAL` → Red dot, animated static effect (no imageUrl needed)
- `OFFLINE` → Red dot, no feed (shows placeholder)

### 2. Configure the API

The Multi-Cam View uses the same Sheet ID and API key as other components:

1. Open `js/multi-cam-view.js`
2. Update the configuration:
```javascript
const CONFIG = {
    SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
    API_KEY: 'YOUR_GOOGLE_SHEETS_API_KEY',
    CAMS_TAB_NAME: 'Cams'
};
```

**Note:** You can use the same `SHEET_ID` and `API_KEY` from your Personnel Records or File Browser configuration.

### 3. Add Camera Images

You have several options for camera feed images:

**Option A: Use Placeholder Services**
```
https://placehold.co/1600x600/031018/1d5b72?text=CORRIDOR+CAM
```

**Option B: Upload to Image Hosting**
- Upload images to Imgur, Google Drive (public), or your own web server
- Use the direct image URL in the `imageUrl` column

**Option C: Use Local Images**
- Place images in `network/img/` directory
- Reference as: `img/A03-corridor.jpg`
- Best for offline/local deployments

**Image Requirements:**
- Recommended size: 1600x600 pixels (or wider for pan effect)
- For pan animation: Use wider images (e.g., 1800x600) that will pan horizontally
- Supported formats: JPG, PNG, GIF, WEBP
- **Video Support**: MP4, WEBM, MOV files will automatically play on loop (muted, autoplay)
  - Perfect for "LOST SIGNAL" status with static/glitch videos
  - Videos maintain same pan animation capability as images

### 4. Test It

Open `multi-cam-view.html` in your browser. The camera list should populate from your Google Sheet, and clicking any camera should load its feed in the viewport.

## Pan Animation

The pan animation creates a cinematic horizontal sweep across camera feeds.

### How It Works
- Set `panEnabled` to "true" in your Cams sheet
- Set `panDuration` to control speed (higher = slower, e.g., "7" for 7 seconds)
- Image must be wider than viewport for effective pan (recommended 180% width)
- Animation alternates between left and right edges

### Disable Pan for Specific Cameras
Set `panEnabled` to "false" for static cameras:
```
camId: cam-security
panEnabled: false
```

### Control Pan Button
Users can pause/resume pan animation using the "PAUSE PAN" / "RESUME PAN" button in the viewport header.

## Glitch Effects

Glitch effects add visual distortion for malfunctioning or interference-affected cameras.

### Configure Glitch Timing
- `glitchMinMs`: Minimum time between glitches (milliseconds)
- `glitchMaxMs`: Maximum time between glitches (milliseconds)

**Examples:**
```
FLICKER (occasional glitches):
glitchMinMs: 750
glitchMaxMs: 2200

INTERFERENCE (frequent glitches):
glitchMinMs: 400
glitchMaxMs: 1200
```

### Glitch by Status
- `ONLINE`: No glitches
- `FLICKER`: Uses your configured glitch timing
- `INTERFERENCE`: Uses your configured glitch timing (set shorter intervals for more severe)
- `LOST SIGNAL`: Uses your configured glitch timing + renders animated static effect
- `OFFLINE`: No glitches (shows placeholder)

## Examples

### Basic Online Camera
```
camId: cam-medbay
section: SECTION A
location: A-05 MEDBAY
status: ONLINE
distance: 7m
hudText: ZOOM: 1.0x  |  PAN: H-AXIS
imageUrl: https://example.com/medbay.jpg
panEnabled: true
panDuration: 7
glitchMinMs: 400
glitchMaxMs: 1200
```

### Flickering Camera with Slow Pan
```
camId: cam-cargo
section: SECTION B
location: B-12 CARGO BAY
status: FLICKER
distance: 28m
hudText: ZOOM: 0.8x  |  PAN: H-AXIS  |  SIGNAL DEGRADED
imageUrl: https://example.com/cargo.jpg
panEnabled: true
panDuration: 9
glitchMinMs: 750
glitchMaxMs: 2200
```

### Static Camera with Interference
```
camId: cam-duct
section: SECTION B
location: B-37 AIR DUCT
status: INTERFERENCE
distance: 3m
hudText: ZOOM: 1.2x  |  STATIC  |  SIGNAL WEAK
imageUrl: https://example.com/airduct.jpg
panEnabled: false
panDuration: 7
glitchMinMs: 300
glitchMaxMs: 800
```

### Lost Signal Camera (with animated static effect)
```
camId: cam-reactor
section: SECTION C
location: C-01 REACTOR CORE
status: LOST SIGNAL
distance: --
hudText: SIGNAL LOST  |  SEARCHING...
imageUrl: 
panEnabled: false
panDuration: 7
glitchMinMs: 200
glitchMaxMs: 600
```
**Note:** For LOST SIGNAL cameras, the `imageUrl` field is ignored. The system automatically renders an animated static/noise effect.

### Offline Camera
```
camId: cam-comms
section: SECTION C
location: C-02 COMMUNICATIONS
status: OFFLINE
distance: --
hudText: NO SIGNAL
imageUrl: 
panEnabled: false
panDuration: 7
glitchMinMs: 400
glitchMaxMs: 1200
```

## Section Grouping

Cameras are automatically grouped by the `section` column and displayed with section headers in the camera list.

**Tips:**
- Use consistent naming: "SECTION A", "SECTION B", "SECTION C"
- Sections are sorted alphabetically
- Create as many sections as needed
- Cameras within each section appear in the order they're listed in the sheet

## Troubleshooting

### Camera list shows "Loading cameras..." forever
- Verify Sheet ID and API key in `js/multi-cam-view.js`
- Check browser console for API errors
- Ensure "Cams" tab exists and is spelled correctly (case-sensitive)
- Verify the sheet is set to "Anyone with the link can view"

### Images not loading / showing placeholder
- Check that `imageUrl` is a valid, publicly accessible URL
- Verify image URLs return actual images (test by pasting URL in browser)
- For local images, ensure they exist in the correct path (`network/img/`)
- Check browser console for CORS or network errors

### Pan animation not working
- Verify `panEnabled` is exactly "true" (lowercase)
- Ensure image is wider than viewport (1600px+ recommended)
- Check that CSS animation is not disabled by browser settings
- Users with "Reduce Motion" OS settings will not see animations

### Glitch effects not appearing
- Only `FLICKER` and `INTERFERENCE` status trigger glitches
- Verify `glitchMinMs` and `glitchMaxMs` are numbers (not text)
- Check that values are reasonable (e.g., 400-2200 range)

### Cameras not grouping by section
- Verify `section` column spelling is consistent
- Sections are case-sensitive ("SECTION A" ≠ "section a")
- Check that data loaded correctly (view browser console logs)

### "PAUSE PAN" button does nothing
- Only works when a camera with `panEnabled: true` is selected
- Pan must be actively running (image must be wider than viewport)
- Check browser console for JavaScript errors

## Support

For issues or questions:
1. Check the configuration in `js/multi-cam-view.js`
2. Review the troubleshooting section above
3. Inspect browser console for error messages
4. Verify Google Sheets API is enabled and key is valid
5. Test with sample data first before custom content

---

# Command Center - Static Demo

## Overview

The Command Center (`command-center.html`) is a command and control dashboard interface displaying system status, power routing, reactor graphs, and alert feeds. This is currently a **static demo component** with simulated data and is **not yet connected to Google Sheets**.

## Features

- **Systems Overview**: Real-time status monitoring for Life Support, Reactor Core, Comms Array, Navigation, and Security systems
- **Power Routing**: Visual power distribution display for Life, Core, and Navigation systems
- **Reactor Graph**: Animated canvas graph showing reactor power output over time
- **Alert Feed**: Chronological alert system with threat level indicators
- **Interactive Controls**: Pseudo-interactive control buttons for system management (simulated responses)
- **Mission Clock**: Live updating timestamp display

## Current Status

⚠️ **Static Demo**: This component currently uses hardcoded JavaScript state and simulated data. It does not connect to Google Sheets or any external data source.

**Future Integration**: This component is planned to be connected to Google Sheets for dynamic content management, similar to the other components in this system.

## Usage

Simply open `command-center.html` in a web browser. The interface will automatically:
- Display system status with color-coded indicators (green/yellow/red)
- Show animated reactor power graph
- Display power routing percentages
- Generate simulated alerts periodically
- Update the mission clock in real-time

## Interactive Elements

- **Control Buttons**: Click control buttons to simulate system actions (e.g., "REROUTE AUX POWER", "SEAL BULKHEADS")
- **System Degradation**: Systems automatically degrade over time to simulate wear and environmental stress
- **Threat Progression**: Threat level increases automatically, triggering system degradation and alerts

---

# Personnel Monitor - Static Demo

## Overview

The Personnel Monitor (`personnel-monitor.html`) is a real-time personnel monitoring interface displaying vital signs, cognitive sensors, suit telemetry, and environmental data for crew members. This is currently a **static demo component** with simulated data and is **not yet connected to Google Sheets**.

## Features

- **Squad List**: Overview of all personnel with health bars, stress indicators, and environment status
- **Vital Signs Monitoring**: Real-time display of heart rate, SpO₂, respiration, temperature, blood pressure, and perfusion
- **Cognitive Sensors**: Stress gauge, cognitive load timeline, tremor indicators, and mental state tracking
- **Suit Telemetry**: Suit integrity, pressure monitoring, filter load, and battery status
- **Environmental Data**: O₂ levels, CO₂, toxin index, radiation, and bio-signature detection
- **Injury Visualization**: Body silhouette with highlighted injury zones
- **Real-time Updates**: Data updates every 2 seconds to simulate live monitoring

## Current Status

⚠️ **Static Demo**: This component currently uses hardcoded JavaScript state with simulated personnel data. It does not connect to Google Sheets or any external data source.

**Future Integration**: This component is planned to be connected to Google Sheets for dynamic personnel data management, similar to the Personnel Records component.

## Usage

1. Open `personnel-monitor.html` in a web browser
2. Click on any personnel card in the left sidebar to view detailed monitoring data
3. The interface automatically updates every 2 seconds with simulated real-time data

## Displayed Data

**Vital Signs:**
- Heart Rate (HR) - bpm with live graph
- SpO₂ - Oxygen saturation percentage
- Respiration Rate - breaths per minute
- Body Temperature - Celsius
- Blood Pressure - systolic/diastolic
- Perfusion Index
- Lactate Levels
- Bleed Index

**Cognitive Metrics:**
- Stress Level (0-100%)
- Cognitive Load (0-100%)
- Tremor Index
- Mental State (FOCUSED, AGITATED, DISSOCIATIVE)

**Suit Status:**
- Integrity Percentage
- Internal/External Pressure
- Filter Load
- Battery Level and Estimated Runtime

**Environment:**
- Atmospheric O₂
- CO₂ Levels
- Toxin Index
- Radiation Levels
- Bio-signature Contacts and Distance

## Notes

- All data is simulated and updates automatically
- Personnel health, stress, and vitals fluctuate realistically
- Injury overlays appear on the body silhouette when injuries are present
- The component uses the `img/silohuette.png` image for the body silhouette visualization

