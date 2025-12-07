// main.js - FINAL CLEAN IMPORTS AND SETUP (APP CRASH FIX)

const electron = require('electron'); // Sirf ek baar define karein
const { autoUpdater } = require('electron-updater'); // 🔥 Naya Code: Updater Import
const fs = require('fs');
const path = require('path');
const fluent = require('fluent-ffmpeg'); 

// Electron Destructuring: Saare zaroori modules yahan hain
const { app, BrowserWindow, session, ipcMain, dialog, Menu, shell, clipboard } = electron;

// YouTube Downloader Libraries (yt-dlp aur FFmpeg ke liye)
const ytdlExec = require('youtube-dl-exec');
const { spawn } = require('child_process'); // CRITICAL: yt-dlp ko seedha call karne ke liye spawn

// Other Utility Libraries
const { DownloaderHelper } = require('node-downloader-helper');

// FIX: Blank Video Screen ka masla hal karne ke liye Hardware Acceleration Disable karein
app.disableHardwareAcceleration();

try {
    // electron-reloader ko sirf development mein use karein
    require('electron-reloader')(module);
} catch (_) {}

console.log('🔧 Main process starting with debugging logs...');

// Settings file ka path define karein
const settingsPath = path.join(__dirname, 'settings.json');
const defaultSettings = {
    isAdBlockerEnabled: true
};


// 🔥 NEW: History aur Bookmarks files ka path define karein
// app.getPath('userData') se data hamesha user profile mein save hoga
const historyPath = path.join(app.getPath('userData'), 'history.json');
const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json');


// CRITICAL FIX 2: Ad Blocker filters ko import karein
let adDomains = [];
let adKeywords = [];
let rawFilterContent = ''; 
let cssFilterSelectors = ''; 

try {
    const filters = require('./adblock_filters');
    adDomains = filters.adDomains;
    adKeywords = filters.adKeywords; 
    rawFilterContent = filters.FULL_RAW_FILTER_CONTENT;
    cssFilterSelectors = filters.CSS_FILTER_SELECTORS; // Agar filters file mein hai to
    console.log('✅ AdBlock filters loaded successfully');
} catch(e) {
    console.warn("⚠️ adblock_filters.js not found or error:", e.message);
}

let isAdBlockerEnabled = true;
// 🔥 NEW: Global variable for PiP window
let pipWindow = null;



// Helper function to safely load JSON data
function loadData(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error(`❌ Failed to load data from ${path.basename(filePath)}:`, e);
    }
    return []; // Agar file na mile ya koi error ho to empty array return karein
}

// Helper function to safely save JSON data
function saveData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`✅ Data saved successfully to ${path.basename(filePath)}`);
    } catch (e) {
        console.error(`❌ Failed to save data to ${path.basename(filePath)}:`, e);
    }
}

/** Browsing history mein naya entry add karta hai. */
function addHistoryEntry(url, title) {
    // Local files, Electron pages, aur empty URLs ko ignore karein
    if (!url || url.startsWith('file://')) return; 
    
    const history = loadData(historyPath);
    const newEntry = { url, title: title || url, timestamp: Date.now() };
    
    // Naye entry ko top par rakhein
    history.unshift(newEntry);
    
    // History ko 1000 entries tak rakhein
    if (history.length > 1000) {
        history.pop();
    }
    
    saveData(historyPath, history);
}

// --------------------------------------------------------------------------
// IPC HANDLERS FOR HISTORY, BOOKMARKS, AND CLEANUP
// --------------------------------------------------------------------------

ipcMain.handle('record-history-entry', (event, { url, title }) => {
    // addHistoryEntry function already main.js mein maujood hai
    addHistoryEntry(url, title); 
    return { success: true };
});

ipcMain.handle('get-history', () => { 
    return loadData(historyPath); 
});

ipcMain.handle('get-bookmarks', () => { 
    return loadData(bookmarksPath); 
});

ipcMain.handle('add-bookmark', (event, { url, title }) => {
    if (!url) return { success: false, message: 'URL required' };
    
    const bookmarks = loadData(bookmarksPath);
    const existing = bookmarks.find(b => b.url === url);
    
    if (existing) {
        return { success: false, message: 'Pehle se bookmark mein maujood hai.' };
    }
    
    const newEntry = { url, title: title || url, timestamp: Date.now() };
    bookmarks.unshift(newEntry);
    saveData(bookmarksPath, bookmarks);
    
    return { success: true, entry: newEntry };
});

ipcMain.handle('remove-bookmark', (event, url) => {
    if (!url) return { success: false, message: 'URL required' };
    
    let bookmarks = loadData(bookmarksPath);
    const initialLength = bookmarks.length;
    
    bookmarks = bookmarks.filter(b => b.url !== url);
    
    if (bookmarks.length < initialLength) {
        saveData(bookmarksPath, bookmarks);
        return { success: true };
    }
    
    return { success: false, message: 'Bookmark mila nahi.' };
});

ipcMain.handle('clear-history-and-cache', async () => {
    // 1. History file ko empty karein
    saveData(historyPath, []);
    
    // 2. Cache aur temporary files ko saaf karein
    try {
        await session.defaultSession.clearCache();
        await session.defaultSession.clearStorageData({
             storages: ['cookies', 'localStorage', 'sessionStorage', 'indexeddb', 'websql', 'serviceworkers']
        });
        return { success: true, message: 'History, Cache, aur Temp Files saaf ho chuke hain.' };
    } catch (e) {
        console.error('❌ Failed to clear cache/storage:', e);
        return { success: false, message: `Cleanup mein masla: ${e.message}` };
    }
});


// --------------------------------------------------------------------------
// CSS Filter Parser
// --------------------------------------------------------------------------
function getCSSSelectors(rawContent) {
    if (!rawContent) return '';
    
    const lines = rawContent.split('\n');
    let selectors = [];
    
    for (const line of lines) {
        let trimmed = line.trim();
        
        if (trimmed.startsWith('##') || trimmed.startsWith('###')) {
            let rule = trimmed.substring(trimmed.indexOf('##') + 2).trim();
            if (rule.includes(':not') || rule.includes(':has') || rule.includes('$')) {
                continue;
            }
            
            if (rule.includes('##') && rule.indexOf('##') > 0) {
                 rule = rule.substring(trimmed.indexOf('##') + 2);
            }
            
            let selector = rule.split(':')[0].trim();
            
            if (selector.length > 1 && !selector.includes(' ')) {
                 selectors.push(selector);
            }
        }
    }
    
    const uniqueSelectors = Array.from(new Set(selectors));
    
    return uniqueSelectors.join(', ');
}

function initializeCSSFilters() {
    console.log('🎨 Initializing CSS filters...');
    const selectors = getCSSSelectors(rawFilterContent);
    
    if (selectors) {
        cssFilterSelectors = `${selectors} { display: none !important; }`;
        console.log('✅ CSS filters initialized with selectors');
    } else {
        console.warn('⚠️ No CSS selectors found for filtering');
    }
}

ipcMain.handle('get-adblock-css', () => {
    console.log('🛡️ IPC: get-adblock-css requested');
    return cssFilterSelectors;
});



// --------------------------------------------------------------------------
// Settings Management
// --------------------------------------------------------------------------
function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf-8');
            const loaded = JSON.parse(data);
            isAdBlockerEnabled = loaded.isAdBlockerEnabled;
            console.log('⚙️ Settings loaded successfully');
            return { ...defaultSettings, ...loaded };
        }
    } catch (e) {
        console.error("❌ Failed to load settings:", e);
    }
    console.log('⚙️ Using default settings');
    return defaultSettings;
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        console.log('⚙️ Settings saved successfully');
    } catch (e) {
        console.error("❌ Failed to save settings:", e);
    }
}

ipcMain.handle('load-settings', () => { 
    console.log('⚙️ IPC: load-settings requested');
    return loadSettings(); 
});

ipcMain.handle('save-settings', (event, settings) => { 
    console.log('⚙️ IPC: save-settings requested');
    saveSettings(settings); 
});

ipcMain.handle('get-adblock-state', () => { 
    console.log('🛡️ IPC: get-adblock-state requested');
    return isAdBlockerEnabled; 
});

ipcMain.on('set-adblock-state', (event, state) => {
    console.log(`🛡️ IPC: set-adblock-state to ${state}`);
    isAdBlockerEnabled = state;
    const settings = loadSettings();
    settings.isAdBlockerEnabled = state;
    saveSettings(settings);
});

ipcMain.handle('open-file-dialog', async () => {
    console.log('📁 IPC: open-file-dialog requested');
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
        console.error('❌ No focused window for file dialog');
        return null;
    }
    
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [
            { name: 'Media Playlists & Videos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'ogg', 'm3u', 'm3u8'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    
    console.log(`📁 File dialog result: ${canceled ? 'canceled' : 'selected ' + filePaths[0]}`);
    return canceled ? null : filePaths[0];
});






// --------------------------------------------------------------------------
// Ad Blocker
// --------------------------------------------------------------------------
function setupAdBlocker() {
    console.log("🛡️ Safe Ad Blocker setup ho raha hai (SUPER AGGRESSIVE MODE)...");
    
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        if (!isAdBlockerEnabled) { 
            callback({}); 
            return; 
        }
        
        const url = details.url.toLowerCase();
        
        // Important resources ko allow karo
        if (['mainFrame', 'document', 'cspReport', 'devtools'].includes(details.resourceType)) { 
            callback({}); 
            return; 
        }
        
        const blockedByDomain = adDomains.some(d => url.includes(d));
        const blockedByKeyword = adKeywords.some(keyword => url.includes(keyword));
        
        let blockedByYtPattern = false;
        if (url.includes('youtube.com') || url.includes('ytimg.com')) {
             blockedByYtPattern = url.includes('/pagead/') || url.includes('/adbreak') || url.includes('/pubads/');
        }
        
        if (blockedByDomain || blockedByKeyword || blockedByYtPattern) {
            console.log(`[AdBlock] Blocked (Type: ${details.resourceType}): ${details.url}`);
            callback({ cancel: true });
        } else {
            callback({});
        }
    }, { urls: ["<all_urls>"] });
    
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        if (!isAdBlockerEnabled) { 
            callback({ cancel: false }); 
            return; 
        }
        
        if (details.responseHeaders && details.responseHeaders['location']) {
             const redirectUrl = details.responseHeaders['location'][0].toLowerCase();
             
             const isAdRedirect = adDomains.some(d => redirectUrl.includes(d)) || adKeywords.some(k => redirectUrl.includes(k));
                             
             if (isAdRedirect) {
                 console.log(`[RedirectBlock] Blocked aggressive server redirect to ${redirectUrl}`);
                 callback({ cancel: true });
                 return;
             }
        }
        callback({ cancel: false });
    }, { urls: ["<all_urls>"] }, ['responseHeaders']);

    console.log('✅ Ad Blocker setup completed');
}

// --------------------------------------------------------------------------
// ADVANCED DOWNLOADER MANAGEMENT - COMPLETELY REWRITTEN
// --------------------------------------------------------------------------
let activeDownloads = {};

function createDownloadId(url) {
    return Buffer.from(url).toString('base64');
}

// 🔥 CRITICAL FIX: Base64 ID decode function
function decodeDownloadId(downloadId) {
    try {
        return Buffer.from(downloadId, 'base64').toString('utf-8');
    } catch (error) {
        console.error(`❌ Failed to decode download ID: ${downloadId}`, error);
        return downloadId; // Fallback: return original ID
    }
}

// 🔥 CRITICAL FIX: Extract filename from URL
function extractFileNameFromUrl(url) {
    try {
        const urlObj = new URL(url);
        let fileName = path.basename(urlObj.pathname).split('?')[0];
        
        // Agar filename nahi hai toh default name use karo
        if (!fileName || fileName === '/' || fileName.includes('..')) {
            fileName = `download_${Date.now()}.mp4`;
        }
        
        return fileName;
    } catch (error) {
        console.error(`❌ Failed to extract filename from URL: ${url}`, error);
        return `download_${Date.now()}.bin`;
    }
}

ipcMain.handle('download-video', async (event, { url, fileName }) => {
    console.log(`[DOWNLOAD-MAIN] ➡️ IPC 'download-video' received`);
    console.log(`[DOWNLOAD-MAIN] URL: ${url.substring(0, 100)}...`);
    console.log(`[DOWNLOAD-MAIN] Initial FileName: ${fileName}`);

    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
        console.log(`[DOWNLOAD-MAIN] ❌ No window found for download`);
        return { success: false, message: 'Window not found' };
    }

    const downloadId = createDownloadId(url);
    
    if (activeDownloads[downloadId]) {
        console.log(`[DOWNLOAD-MAIN] ⚠️ Download already active for ID: ${downloadId}`);
        return { success: false, message: 'Download already active', id: downloadId };
    }
    
    const downloadsPath = app.getPath('downloads');
    let finalFileName = fileName; 

    // CRITICAL FIX: Robust URL and Filename Validation
    try {
        console.log(`[DOWNLOAD-MAIN] Attempting URL parsing`);
        const urlObject = new URL(url);
        if (!finalFileName) {
            finalFileName = path.basename(urlObject.pathname).split('?')[0];
            console.log(`[DOWNLOAD-MAIN] Filename extracted from URL: ${finalFileName}`);
        }
    } catch (e) {
        console.error(`[DOWNLOAD-MAIN] ❌ URL parsing failed: ${e.message}`); 
        finalFileName = `download_${Date.now()}.bin`;
    }
    
    // Filename sanitization
    if (!finalFileName || finalFileName.includes('..') || finalFileName.trim() === '') {
        finalFileName = `download_${Date.now()}.mp4`;
        console.log(`[DOWNLOAD-MAIN] Filename sanitized to: ${finalFileName}`);
    }

    console.log(`[DOWNLOAD-MAIN] Final Download Path: ${downloadsPath}`);
    console.log(`[DOWNLOAD-MAIN] Final File Name: ${finalFileName}`);

    // 🔥 CORRECT: DownloaderHelper sirf ek baar declare hoga (const dl)
    const dl = new DownloaderHelper(url, downloadsPath, {
        fileName: finalFileName,
        retry: { maxRetries: 3, delay: 3000 },
        maxSegments: 5,
        timeout: 10000,
        headers: { 
            'User-Agent': win.webContents.getUserAgent(),
            'Accept': '*/*',
            'Connection': 'keep-alive'
        }
    });
    
    activeDownloads[downloadId] = {
        // 🔥 CRITICAL FIX: Downloader object ko direct reference ke taur par save kiya
        downloader: dl, 
        url: url,
        fileName: finalFileName,
        startTime: Date.now(),
        // Normal downloader ki pehchaan ke liye ek aur field:
        type: 'downloader-helper' 
    };

    // 🔥 CRITICAL FIX: Download started event IMMEDIATELY bhejo with ALL DATA
    console.log(`[DOWNLOAD-MAIN] 🚀 Sending download-started event`);
    win.webContents.send('download-started', {
        id: downloadId,
        url: url,
        fileName: finalFileName,
        state: 'starting'
    });

    // Progress events - 🔥 CRITICAL FIX: Always send URL and fileName with progress
    dl.on('progress.throttled', (stats) => {
        console.log(`[DOWNLOAD-MAIN] 📈 Progress: ${Math.floor(stats.progress)}% - Speed: ${Math.floor(stats.speed / 1024)} KB/s`);
        
        // ETA calculation
        let eta = 0;
        if (stats.speed > 0 && stats.total && stats.downloaded) {
            eta = (stats.total - stats.downloaded) / stats.speed;
        }
        
        win.webContents.send('download-progress', {
            id: downloadId,
            url: url, // 🔥 ALWAYS send URL
            fileName: finalFileName, // 🔥 ALWAYS send fileName
            state: 'downloading',
            progress: Math.floor(stats.progress),
            speed: stats.speed,
            totalBytes: stats.total,
            receivedBytes: stats.downloaded,
            eta: eta
        });
    });

    // Download completion - 🔥 CRITICAL FIX: Send all necessary data
    dl.on('end', (downloadInfo) => {
        console.log(`[DOWNLOAD-MAIN] ✅ Download COMPLETED: ${downloadInfo.filePath}`);
        delete activeDownloads[downloadId];
        win.webContents.send('download-complete', { 
            id: downloadId,
            url: url,
            fileName: finalFileName,
            path: downloadInfo.filePath,
            state: 'completed'
        });
    });

    // Download error - 🔥 CRITICAL FIX: Send all necessary data
    dl.on('error', (err) => {
        console.error(`[DOWNLOAD-MAIN] ❌ Download ERROR: ${err.message}`);
        delete activeDownloads[downloadId];
        win.webContents.send('download-error', { 
            id: downloadId,
            url: url,
            fileName: finalFileName,
            error: err.message,
            state: 'error'
        });
    });
    
    // Pause event - 🔥 CRITICAL FIX: Send all necessary data
    dl.on('pause', () => {
        console.log(`[DOWNLOAD-MAIN] ⏸️ Download PAUSED: ${downloadId}`);
        win.webContents.send('download-status-update', { 
            id: downloadId,
            url: url,
            fileName: finalFileName,
            state: 'paused' 
        });
    });
    
    // Resume event - 🔥 CRITICAL FIX: Send all necessary data  
    dl.on('resume', () => {
        console.log(`[DOWNLOAD-MAIN] ▶️ Download RESUMED: ${downloadId}`);
        win.webContents.send('download-status-update', { 
            id: downloadId,
            url: url,
            fileName: finalFileName,
            state: 'downloading' 
        });
    });
    
    // Abort event - 🔥 CRITICAL FIX: Send all necessary data
    dl.on('abort', () => {
        console.log(`[DOWNLOAD-MAIN] 🚫 Download ABORTED: ${downloadId}`);
        delete activeDownloads[downloadId];
        win.webContents.send('download-status-update', { 
            id: downloadId,
            url: url,
            fileName: finalFileName,
            state: 'cancelled' 
        });
    });
    
    // Start download
    try {
        console.log(`[DOWNLOAD-MAIN] Starting download...`);
        await dl.start();
        console.log(`[DOWNLOAD-MAIN] ✅ Download started successfully`);
        return { 
            success: true, 
            id: downloadId, 
            fileName: finalFileName 
        };
    } catch (e) {
        console.error(`[DOWNLOAD-MAIN] 🛑 FATAL ERROR: ${e.message}`);
        delete activeDownloads[downloadId];
        return { 
            success: false, 
            message: e.message 
        };
    }
});


// --------------------------------------------------------------------------
// YOUTUBE & SIMILAR PLATFORM DOWNLOADER (using youtube-dl-exec / yt-dlp)
// --------------------------------------------------------------------------

ipcMain.handle('download-youtube-video', async (event, input) => {
    // 1. Input se URL aur Title nikal lo
    const url = typeof input === 'string' ? input : input?.url;
    // Renderer se bheja gaya title extract karo
    const suggestedTitle = input?.title || ''; 
    
    if (!url) return { success: false };

    const win = BrowserWindow.fromWebContents(event.sender);
    const id = 'yt_' + Date.now();
    
    // yt-dlp executable ka path: PRODUCTION mein yeh resources folder se milega
    // Lekin chuki aap 'yt-dlp' ko bhi extraResources mein daal rahe hain, to is tarah access karein:
    let ytDlpPath;
    if (app.isPackaged) {
        // Production: resources/yt-dlp/yt-dlp.exe
        const platformExe = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
        ytDlpPath = path.join(process.resourcesPath, 'yt-dlp', platformExe);
    } else {
        // Development: project root/yt-dlp/yt-dlp.exe
        ytDlpPath = path.join(__dirname, 'yt-dlp', 'yt-dlp.exe');
    }
    
    // Check agar yt-dlp path exist karta hai
    if (!fs.existsSync(ytDlpPath)) {
        console.error(`❌ yt-dlp executable not found at: ${ytDlpPath}`);
        win.webContents.send('download-error', { id, error: 'YT-DLP executable not found. Cannot start download.' });
        return { success: false };
    }


    // 2. Title ko set aur saaf (clean) karo
    let realTitle = suggestedTitle || 'YouTube_Video_' + Date.now();

    if (suggestedTitle) {
        // Common extra text hatao (maslan: "- YouTube")
        realTitle = suggestedTitle
            .replace(/ - YouTube$/, '') 
            .replace(/ \| Google$/, '') 
            .trim();
    }
    // Agar saaf karne ke baad bhi empty ho toh default time-based name use hoga
    if (realTitle.length === 0) {
        realTitle = 'YouTube_Video_' + Date.now();
    }

    // 3. Pehla update notification (Download shuru hone se pehle)
    win.webContents.send('download-started', { 
        id, 
        url, 
        fileName: `Starting download: ${realTitle}.mp4...`
    });

    // 4. Safe filename banao
    const safeTitle = realTitle
        .replace(/[<>:"/\\|?*]/g, '_')  // Windows invalid chars replace karein
        .replace(/\s+/g, ' ')           // Extra spaces hatao
        .trim()
        .substring(0, 150);

    const finalFileName = safeTitle + '.mp4';
    const finalFilePath = path.join(app.getPath('downloads'), finalFileName);

    // 5. Final download shuru karo
    win.webContents.send('download-started', { 
        id, 
        url, 
        fileName: finalFileName 
    });
    
    // 6. Download Process ki Arguments
    const args = [
        url,
        '-o', finalFilePath,
        '-f', 'bestvideo+bestaudio/best',   // highest quality
        '--merge-output-format', 'mp4',
        '--no-playlist',
        '--newline',
        // 🔥 CRITICAL FIX: FFmpeg ka location yahan pass karein!
        '--ffmpeg-location', calculatedFfmpegPath 
    ];

    const child = spawn(ytDlpPath, args, { windowsHide: true });

    activeDownloads[id] = {
        process: child,
        downloader: 'yt-dlp',
        type: 'yt-dlp',
        url: url,
        fileName: finalFileName,
        path: finalFilePath,
        args: args,  // Resume ke liye args store karo
        ytDlpPath: ytDlpPath,  // Path bhi store
        isPausing: false,  // Flag for pause
        state: 'downloading'
    };

    // 7. Progress tracking
    child.stdout.on('data', (data) => {
        const line = data.toString();
        // Console mein full output dekhein agar masla ho
        // console.log(`[YTDL-VIDEO-STDOUT] ${line.trim()}`); 
        
        // Agar merging ka masla ho to is line ko dekhein
        if (line.includes('[Merger]') && line.includes('Merging formats into')) {
            win.webContents.send('download-progress', {
                id,
                progress: 100, // Merging shuru hone par 100% progress dikha dein
                fileName: `Merging... ${finalFileName}`
            });
        }
        
        if (line.includes('[download]')) {
            const match = line.match(/(\d+(?:\.\d+)?)%/);
            if (match) {
                win.webContents.send('download-progress', {
                    id,
                    progress: Math.round(parseFloat(match[1])),
                    fileName: `${finalFileName} (${match[1]}%)`
                });
            }
        }
    });
    
    child.stderr.on('data', (data) => {
        const errorLine = data.toString();
        // Error ko console mein log karein
        console.error(`[YTDL-VIDEO-STDERR] Error: ${errorLine.trim()}`);
        // Agar FFmpeg error de, to wo bhi yahan milega
        if (errorLine.includes('ffmpeg') || errorLine.includes('ERROR')) {
            // Error ko UI par bhejen
            win.webContents.send('download-error', { 
                id, 
                error: `Download/Merging failed: ${errorLine.substring(0, 150)}` 
            });
        }
    });

    // 8. Download Complete/Error handling
    child.on('close', (code) => {
        // Agar pause ki wajah se close nahi hua aur exit code 0 nahi hai, to error hai
        if (activeDownloads[id] && activeDownloads[id].isPausing) {
            console.log(`[YTDL] ⏸️ Download paused via kill - ID: ${id}`);
            // Pause status update karein
            win.webContents.send('download-status-update', { id, url, fileName: finalFileName, state: 'paused' });
            activeDownloads[id].isPausing = false; 
            activeDownloads[id].state = 'paused';
            return; 
        }

        setTimeout(() => {
            // Merging ke baad file size check karein (1MB se zyada ho to successful)
            if (fs.existsSync(finalFilePath) && fs.statSync(finalFilePath).size > 1000000 && code === 0) {
                win.webContents.send('download-complete', {
                    id,
                    fileName: finalFileName,
                    path: finalFilePath
                });
            } else {
                // Agar file exist na kare ya choti ho ya exit code non-zero ho to error
                const errorMessage = code !== 0 ? `yt-dlp exited with code ${code}. Merging failed.` : 'Download failed or merged file is too small.';
                win.webContents.send('download-error', {  
                    id, 
                    error: errorMessage 
                });
            }
             delete activeDownloads[id];
        }, 4000);
    });

    child.on('error', (err) => {
        console.error('[YTDL-VIDEO-MAIN] Spawn error:', err);
        win.webContents.send('download-error', { id, error: err.message });
        delete activeDownloads[id];
    });

    return { success: true, id };
});


ipcMain.handle('download-youtube-audio', async (event, data) => {
    console.log('[YTDL-AUDIO-MAIN] IPC download-youtube-audio received:', data);

    // Safe extraction 
    let url = '';
    let suggestedTitle = '';

    if (typeof data === 'string') {
        url = data; 
    } else if (data && typeof data === 'object') {
        url = data.url || data.URL || '';
        suggestedTitle = data.title || data.Title || '';
    }

    if (!url || url.trim() === '') {
        console.error('[YTDL-AUDIO-MAIN] No URL provided');
        return { success: false, message: 'No URL provided' };
    }

    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
        console.error('[YTDL-AUDIO-MAIN] No window found');
        return { success: false, message: 'Window not found' };
    }

    const id = 'yt_audio_' + Date.now();
    
    let ytDlpPath;
    if (app.isPackaged) {
        const platformExe = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
        ytDlpPath = path.join(process.resourcesPath, 'yt-dlp', platformExe);
    } else {
        ytDlpPath = path.join(__dirname, 'yt-dlp', 'yt-dlp.exe');
    }
    
    if (!fs.existsSync(ytDlpPath)) {
        console.error(`❌ yt-dlp executable not found at: ${ytDlpPath}`);
        win.webContents.send('download-error', { id, error: 'YT-DLP executable not found. Cannot start audio download.' });
        return { success: false };
    }


    let realTitle = suggestedTitle || 'YouTube_Audio_' + Date.now();
    if (suggestedTitle) {
        realTitle = suggestedTitle
            .replace(/ - YouTube$/i, '')
            .replace(/ \| Google$/i, '')
            .trim();
    }
    if (!realTitle || realTitle.length === 0) {
        realTitle = 'YouTube_Audio_' + Date.now();
    }

    win.webContents.send('download-started', {
        id,
        url,
        fileName: `Downloading audio: ${realTitle}.mp3...`
    });

    const downloadsPath = app.getPath('downloads');
    let finalFileName = `${realTitle}.mp3`;
    finalFileName = finalFileName
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);

    if (!finalFileName.endsWith('.mp3')) finalFileName += '.mp3';

    const finalFilePath = path.join(downloadsPath, finalFileName);
    console.log('[YTDL-AUDIO-MAIN] Final output path:', finalFilePath);

    const args = [
        url,
        '-o', finalFilePath,
        '-f', 'bestaudio',
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--no-playlist',
        '--newline',
        // 🔥 CRITICAL FIX: FFmpeg ka location yahan bhi pass karein!
        '--ffmpeg-location', calculatedFfmpegPath 
    ];

    console.log('[YTDL-AUDIO-MAIN] Spawning yt-dlp with args:', args);

    try {
        const child = spawn(ytDlpPath, args, { windowsHide: true });
        
        activeDownloads[id] = {
            process: child,
            downloader: 'yt-dlp',
            type: 'yt-dlp-audio',
            url: url,
            fileName: finalFileName,
            path: finalFilePath,
            args: args,
            ytDlpPath: ytDlpPath,
            isPausing: false,
            state: 'downloading'
        };


        child.stdout.on('data', (data) => {
            const line = data.toString();
            // Console mein full output dekhein agar masla ho
            // console.log(`[YTDL-AUDIO-STDOUT] ${line.trim()}`); 
            
            if (line.includes('[ExtractAudio] Destination')) {
                // Audio extract hone se pehle 100% progress dikha dein (Merging/Extraction)
                win.webContents.send('download-progress', { id, progress: 100, fileName: `Extracting Audio... ${finalFileName}` });
            }
            
            if (line.includes('[download]')) {
                const match = line.match(/(\d+(?:\.\d+)?)%/);
                if (match) {
                    win.webContents.send('download-progress', {
                        id,
                        progress: Math.round(parseFloat(match[1])),
                        fileName: `${finalFileName} (${match[1]}%)`
                    });
                }
            }
        });
        
        child.stderr.on('data', (data) => {
            const errorLine = data.toString();
            console.error(`[YTDL-AUDIO-STDERR] Error: ${errorLine.trim()}`);
            if (errorLine.includes('ffmpeg') || errorLine.includes('ERROR')) {
                // Error ko UI par bhejen
                win.webContents.send('download-error', { 
                    id, 
                    error: `Audio Extraction failed: ${errorLine.substring(0, 150)}` 
                });
            }
        });


        child.on('close', (code) => {
            if (activeDownloads[id] && activeDownloads[id].isPausing) {
                console.log(`[YTDL] ⏸️ Audio download paused via kill - ID: ${id}`);
                win.webContents.send('download-status-update', {  id, url, fileName: finalFileName, state: 'paused' });
                activeDownloads[id].isPausing = false;
                activeDownloads[id].state = 'paused';
                return;
            }

            // Normal close (complete ya fail)
            setTimeout(() => {
                // Extraction ke baad file size check karein (1MB se zyada ho to successful)
                if (fs.existsSync(finalFilePath) && fs.statSync(finalFilePath).size > 100000) { // Audio file choti ho sakti hai
                    win.webContents.send('download-complete', {
                        id,
                        fileName: finalFileName,
                        path: finalFilePath
                    });
                } else {
                    const errorMessage = code !== 0 ? `yt-dlp exited with code ${code}. Extraction failed.` : 'Audio download failed or file is too small.';
                    win.webContents.send('download-error', {  id, error: errorMessage });
                }
                 delete activeDownloads[id];
            }, 4000);
        });

        child.on('error', (err) => {
            console.error('[YTDL-AUDIO-MAIN] Spawn error:', err);
            win.webContents.send('download-error', { id, error: err.message });
            delete activeDownloads[id];
        });

        return { success: true, id };
    } catch (err) {
        console.error('[YTDL-AUDIO-MAIN] Spawn failed:', err);
        win.webContents.send('download-error', { id, error: err.message });
        return { success: false, message: err.message };
    }
});


// --- IPC: Doosri Websites se Download (Node-Downloader-Helper) ---
ipcMain.handle('download-other-media', async (event, { url, fileName }) => {
    console.log(`[DOWNLOAD-MAIN] ➡️ IPC 'download-other-media' received for URL: ${url.substring(0, 50)}...`);
    
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
        console.log(`[DOWNLOAD-MAIN] ❌ No window found for download`);
        return { success: false, message: 'Window not found' };
    }

    // 🔥 FIX 1: Unique ID banao (Base64) taake activeDownloads se match ho
    const downloadId = createDownloadId(url); 
    
    if (activeDownloads[downloadId]) {
        console.log(`[DOWNLOAD-MAIN] ⚠️ Download already active for ID: ${downloadId}`);
        return { success: false, message: 'Download already active', id: downloadId };
    }

    const downloadsPath = app.getPath('downloads');
    // Agar fileName nahi diya gaya to URL se nikal lenge (extractFileNameFromUrl function available hai)
    let finalFileName = fileName || extractFileNameFromUrl(url); 
    
    // DownloaderHelper ko use karein
    const dl = new DownloaderHelper(url, downloadsPath, { fileName: finalFileName });
    

    // 🔥 FIX 2: Download ko activeDownloads mein save karo taake Pause/Cancel handlers isko dhoondh saken
    activeDownloads[downloadId] = {
        downloader: dl, 
        url: url,
        fileName: finalFileName,
        type: 'downloader-helper' 
    };

    // 🔥 FIX 3: Renderer ko UNIQUE ID bhejain
    win.webContents.send('download-started', { 
        id: downloadId, 
        url: url, 
        fileName: finalFileName, 
        state: 'starting' 
    });


    dl.on('end', (downloadInfo) => {
        delete activeDownloads[downloadId]; // Remove on completion
        if (win) {
            win.webContents.send('download-complete', { 
                id: downloadId, 
                fileName: downloadInfo.fileName, 
                state: 'completed',
                path: downloadInfo.filePath
            });
        }
    });

    dl.on('error', (error) => {
        console.error('[DL-HELPER] Download Error:', error);
        delete activeDownloads[downloadId]; // Remove on error
        if (win) {
            win.webContents.send('download-error', { 
                id: downloadId, 
                fileName: finalFileName,
                error: error.message, 
                state: 'error' 
            });
        }
    });

    dl.on('progress', (stats) => {
        if (win) {
             win.webContents.send('download-progress', { 
                id: downloadId,
                fileName: finalFileName,
                url: url,
                state: 'downloading',
                progress: Math.floor(stats.progress),
                speed: stats.speed,
                eta: stats.eta
            });
        }
    });
    
    // Abort/Stop event (Cancel)
    dl.on('abort', () => {
        console.log(`[DOWNLOAD-MAIN] 🚫 Download ABORTED: ${downloadId}`);
        delete activeDownloads[downloadId];
        win.webContents.send('download-status-update', { 
            id: downloadId,
            url: url,
            fileName: finalFileName,
            state: 'cancelled' 
        });
    });
    
    // Pause/Resume events (yahan add nahi kiye, kyunki yeh global IPC handlers ke through chalte hain, lekin phir bhi unko zaruri data chahye hota hai)
    // dl.on('pause', ...) aur dl.on('resume', ...) yahan se hatae hue hain taake download-video wale ki tarah duplicate na ho, woh events globaly bhi handle hote hain.


    dl.start();
    
    console.log(`[DOWNLOAD-MAIN] ✅ Download started with ID: ${downloadId}`);
    return { success: true, fileName: finalFileName, id: downloadId };
});



// --------------------------------------------------------------------------
// Download Control Functions (UPDATED FOR YOUTUBE)
// --------------------------------------------------------------------------
// IMPORTANT: YouTube download mein pause/resume/cancel ki functionality thodi alag hoti hai.
// Cancel ke liye FFMPEG process ko kill karna padega.

ipcMain.handle('download-cancel', (event, id) => {
    console.log(`[DOWNLOAD-MAIN] 🚫 IPC 'download-cancel' for ID: ${id}`);
    
    if (activeDownloads[id]) {
        const download = activeDownloads[id];
        
        if (download.type === 'downloader-helper') {
            download.downloader.stop(); 
        } else if (download.downloader === 'yt-dlp' && download.process) {
            console.log(`[YTDL-EXEC-MAIN] 🛑 Killing yt-dlp process for ID: ${id}`);
            download.process.kill('SIGKILL'); // Force kill
            // File delete karo taake partial na rahe
            if (fs.existsSync(download.path)) {
                fs.unlinkSync(download.path);
                console.log(`[YTDL] 🗑️ Partial file deleted: ${download.path}`);
            }
        }
        
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.webContents.send('download-status-update', { 
                id: id,
                url: download.url,
                fileName: download.fileName,
                state: 'cancelled' 
            });
        }
        
        delete activeDownloads[id]; 
        return { success: true };
    }
    console.error(`[DOWNLOAD-MAIN] Download not found for cancelling: ${id}`);
    return { success: false, message: 'Download not found' };
});



// NOTE: ytdl-core/ffmpeg ke through streams ko pause/resume karna complex hai
// filhaal sirf cancel (stop) ki functionality de rahe hain.
ipcMain.handle('download-pause', (event, id) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (activeDownloads[id] && activeDownloads[id].type !== 'yt-dlp') { 
        console.log(`[DOWNLOAD-MAIN] Pausing download ID: ${id}`);
        try {
            // Pause call
            activeDownloads[id].downloader.pause();
            
            // 🔥 CRITICAL SANITY CHECK: Thoda sa delay dekar status bhejen
            setTimeout(() => {
                if (win) {
                    win.webContents.send('download-status-update', { 
                        id: id,
                        state: 'paused' // Status: paused
                    });
                    console.log(`✅ MAIN: Sent 'paused' status after delay for ID: ${id}`);
                }
            }, 50); // Sirf 50 milliseconds ka chhota delay
            
            return { success: true };
        } catch(err) {
            console.error("[DOWNLOAD-MAIN] Pause Error:", err);
            // Agar yahan error aaya to UI ko error status bhejen
            if (win) {
                 win.webContents.send('download-status-update', { id: id, state: 'error' });
            }
            return { success: false, message: err.message };
        }
    } 
    return { success: false, message: 'Pause not supported or download not found' }; 
});


ipcMain.handle('download-resume', (event, id) => { 
    const win = BrowserWindow.fromWebContents(event.sender);
    
    // Sirf woh downloads jinme 'downloader' property hai aur woh 'yt-dlp' nahi hai 
    if (activeDownloads[id] && activeDownloads[id].type !== 'yt-dlp') { 
        console.log(`[DOWNLOAD-MAIN] Resuming download ID: ${id}`);
        
        try {
            activeDownloads[id].downloader.resume();
            
            // 🔥 CRITICAL FIX: Status update yahan se foran bhejen
            if (win) {
                 const dlData = activeDownloads[id];
                 win.webContents.send('download-status-update', { 
                    id: id,
                    url: dlData.url,
                    fileName: dlData.fileName,
                    state: 'downloading' // Resume hone par 'downloading' state bhejen
                });
                console.log(`✅ MAIN: Manually sent 'downloading' status to renderer for ID: ${id}`);
            }

            return { success: true };
        } catch(err) {
            console.error("[DOWNLOAD-MAIN] Resume Error:", err);
            return { success: false, message: err.message };
        }
    } 
    return { success: false, message: 'Resume not supported or download not found' }; 
});

// --------------------------------------------------------------------------
// Download Control Functions
// --------------------------------------------------------------------------

ipcMain.on('open-download-file', (event, filePath) => {
    console.log(`[DOWNLOAD-MAIN] 📂 Opening file: ${filePath}`);
    try {
        shell.showItemInFolder(filePath);
        console.log(`[DOWNLOAD-MAIN] ✅ File opened successfully: ${filePath}`);
    } catch (e) {
        console.error("❌ File open error:", e);
    }
});

// --------------------------------------------------------------------------
// Full Screen Toggle Integration
// --------------------------------------------------------------------------
// 🔥 NEW: Separate Video Window Handler (Yahan daal den)
ipcMain.handle('open-pip-window', (event, data) => {
    // 🔥 CRITICAL FIX 1: Ab data object receive hoga jismein { url, playlist } hai
    const { url, playlist } = data;
    
    // Console log ko update kiya
    console.log(`[PIP-MAIN] ➡️ IPC 'open-pip-window' received for URL: ${url.substring(0, 100)}...`);

    // 1. Agar window pehle se bani hui hai, to use activate kar dein aur naya data bhej dein
    if (pipWindow) {
        if (pipWindow.isMinimized()) pipWindow.restore();
        pipWindow.focus();
        
        // 🔥 CRITICAL FIX 2: Naya data object (url aur playlist) bhej dein
        pipWindow.webContents.send('load-pip-video', data); 
        console.log("[PIP-MAIN] ✅ Existing window found, sent new URL and Playlist.");
        return { success: true };
    }

    // 2. Nayi choti, borderless window banao (Settings aapki purani wali hi rakhi hain)
    pipWindow = new BrowserWindow({
        width: 600, 
        height: 350,
        frame: true, 
        title: "TV Player (PiP)", // Title update kiya
        alwaysOnTop: false,
        resizable: true, 
        minimizable: true,
        maximizable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    // Pip player HTML file load karein
    pipWindow.loadFile(path.join(__dirname, 'pip_player.html'));
    console.log("[PIP-MAIN] 🪟 New window created, loading pip_player.html");

    // 3. Window band hone par state reset karein (Code same)
    pipWindow.on('closed', () => {
        console.log("[PIP-MAIN] ❌ PiP window closed, resetting pipWindow variable.");
        pipWindow = null;
    });

    // 4. Jab window load ho jaye, to data bhej dein
    pipWindow.webContents.on('did-finish-load', () => {
        // 🔥 CRITICAL FIX 3: Did-finish-load par data object (url aur playlist) bhejo
        pipWindow.webContents.send('load-pip-video', data);
        console.log("[PIP-MAIN] ✅ HTML loaded, URL and Playlist sent to renderer.");

        // Agar aap DevTools kholna chahte hain to uncomment kar dein
        // pipWindow.webContents.openDevTools(); 
    });

    return { success: true };
});

ipcMain.on('toggle-native-fullscreen', (event, isFullscreen) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
        console.error('❌ No window found for fullscreen toggle');
        return;
    }
    
    console.log(`[Fullscreen] Native fullscreen: ${isFullscreen}`);
    
    if (isFullscreen) {
        win.setFullScreen(true);
    } else {
        win.setFullScreen(false);
    }
});

// --------------------------------------------------------------------------
// Context Menu Management
// --------------------------------------------------------------------------
function showContextMenu(webContents, params) {
    const win = BrowserWindow.fromWebContents(webContents);
    if (!win) {
        console.error('❌ No window found for context menu');
        return;
    }
    
    console.log(`🖱️ Showing context menu at (${params.x}, ${params.y})`);
    
    const menuTemplate = [
        ...(params.linkURL ? [
            { 
                label: 'Open link in New Tab', 
                click: () => {
                    console.log(`📑 Context menu: Open link in new tab: ${params.linkURL}`);
                    win.webContents.send('new-tab-request', params.linkURL);
                }
            },
            { 
                label: 'Open link in New Window', 
                click: () => {
                    console.log(`🪟 Context menu: Open link in new window: ${params.linkURL}`);
                    shell.openExternal(params.linkURL);
                }
            },
            { 
                label: 'Copy link address', 
                click: () => {
                    console.log(`📋 Context menu: Copy link address: ${params.linkURL}`);
                    clipboard.writeText(params.linkURL);
                }
            },
            { type: 'separator' },
        ] : []),
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste', enabled: params.isEditable },
        { type: 'separator' },
        { 
            label: 'Back', 
            click: () => {
                console.log('🔙 Context menu: Go back');
                win.webContents.send('nav-action', 'back');
            }
        },
        { 
            label: 'Forward', 
            click: () => {
                console.log('🔜 Context menu: Go forward');
                win.webContents.send('nav-action', 'forward');
            }
        },
        { label: 'Reload', role: 'reload' },
        { type: 'separator' },
        { 
            label: 'Inspect Element', 
            click: () => { 
                console.log(`🔍 Context menu: Inspect element at (${params.x}, ${params.y})`);
                webContents.inspectElement(params.x, params.y); 
            }
        },
    ];
    
    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    contextMenu.popup(win);
}

ipcMain.on('show-context-menu', (event, { params }) => {
    console.log('🖱️ IPC: show-context-menu received');
    showContextMenu(event.sender, params);
});

// --------------------------------------------------------------------------
// Window Creation
// --------------------------------------------------------------------------
function createWindow() {
    console.log('🪟 Creating main window...');
    
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        fullscreenable: true,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'assets', 'icon.png'), // Optional icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            webSecurity: true,
            allowRunningInsecureContent: true,
            enableRemoteModule: false
        }
    });

    win.loadFile('index.html');
    console.log('✅ Main window created and index.html loaded');

    // 🔥 NEW: History tracking listener (Yahan add karein)
    win.webContents.on('did-navigate', (event, url) => {
        // 'did-navigate' tab trigger hota hai jab main frame successfully load ho chuka ho.
        // Title ko fetch karne ke liye thoda delay rakhte hain.
        if (url && !url.startsWith('file://')) { // Local files ko history mein na rakhein
            setTimeout(() => {
                // Title lene ke liye JavaScript execute karein
                win.webContents.executeJavaScript('document.title', true)
                    .then(title => {
                        addHistoryEntry(url, title);
                    })
                    .catch(err => {
                        // Title na mile to URL hi use karein
                        addHistoryEntry(url, url); 
                    });
            }, 500); 
        }
    });

    // --- Naye Windows Ko Pakadne Aur Band Karne Ka Asli Tareeqa ---
    win.webContents.on('new-window', (event, url, frameName, disposition, options) => {
        
        // 🔥 1. Pehle default behavior ko rokein
        event.preventDefault(); 
        
        console.log(`[New Window Blocked - FAST] 🚫 Attempted: ${url.substring(0, 100)}...`);

        if (!url || url === 'about:blank' || url.startsWith('javascript')) {
            return;
        }

        // 2. Hum check karenge ke kya yeh Ad domain hai (aapke adDomains array ko use karte hue)
        const isAdPopUp = adDomains.some(d => url.includes(d)) || url.match(/doubleclick|adservice|popads/i);

        // 3. Naya window create karein, lekin isay dikhayein nahi aur foran band kar dein.
        
        // Options.show ko false set karein taake woh kabhi dikhe hi na.
        options.show = false; 
        
        const newWin = new BrowserWindow({
            ...options,
            show: false, // Dikhayein nahi
            width: 100,
            height: 100,
            webPreferences: {
                ...options.webPreferences,
                webSecurity: true // Security maintain rakhein
            }
        });

        // 4. Load karein aur foran band kar dein. (Load karna zaroori hai taake 'will-download' trigger ho)
        newWin.loadURL(url);
        
        // Agar yeh Ad-Pop-up hai, to 50ms (zyada tez) mein band karein.
        const closeDelay = isAdPopUp ? 50 : 200; 
        
        setTimeout(() => {
            if (!newWin.isDestroyed()) {
                 newWin.close();
                 console.log(`[Auto-Closed] ✅ Pop-up window closed after ${closeDelay}ms.`);
            }
        }, closeDelay); 
        
        // Agar woh download link tha, to will-download event ab usay handle kar chuka hoga.
    });

    
    // Permission handling
    win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        console.log(`🔐 Permission requested: ${permission}`);
        if (permission === 'notifications') {
            console.log('[Security] 🔕 Notifications blocked');
            callback(false);
        } else {
            console.log(`[Security] ✅ Permission granted: ${permission}`);
            callback(true); // Fullscreen, media, etc. allow
        }
    });

    // Context menu
    win.webContents.on('context-menu', (event, params) => {
        console.log('🖱️ Context menu triggered in web contents');
        showContextMenu(win.webContents, params);
    });
    
    // Auto-catch downloads - 🔥 CRITICAL FIX: Send proper data
    win.webContents.session.on('will-download', (event, item, webContents) => {
        event.preventDefault();
        const url = item.getURL();
        const suggestedFilename = item.getFilename();
        const downloadId = createDownloadId(url);
        
        console.log(`[DOWNLOAD-MAIN] 🎯 Auto-catch download: ${suggestedFilename} from ${url}`);
        
        win.webContents.send('auto-catch-download', { 
            url: url, 
            fileName: suggestedFilename,
            id: downloadId
        });
        item.cancel();
    });

    // Development tools (optional)
    if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode: Opening DevTools');
        win.webContents.openDevTools();
    }

    // Window event listeners
    win.on('closed', () => {
        console.log('🪟 Main window closed');
    });

    win.on('focus', () => {
        console.log('🪟 Main window focused');
    });

    return win;
}


// --------------------------------------------------------------------------
// 🔥 ULTIMATE GLOBAL WINDOW CLOSER (SAFE FIX - Main window nahi band hoga)
// --------------------------------------------------------------------------
app.on('browser-window-created', (event, window) => {
    // PiP window ko chhor kar (jiska title "TV Player (PiP)" hai)
    if (window.getTitle().includes('TV Player (PiP)')) {
        return; 
    }

    // Window ke ready hote hi check karein.
    window.once('ready-to-show', () => {
        // Hum sirf woh windows band karenge jinki width 800px se kam hai. 
        // Ya agar title 'myadvanced@browser' ho to
        if (window.getWidth() < 800 || window.getTitle() === 'myadvanced@browser') {
            
            console.log(`[GLOBAL CLOSER] 🚨 Pop-up detected and FORCE closing: Title=${window.getTitle()}`);
            
            // Foran band kar dein
            if (!window.isDestroyed()) {
                window.close();
            }
        }
    });
    
    // 🔥 CRITICAL: Yahan koi "Early Check" nahi hai jo Title= ko dekhe.
    // Isse Main Window band hone ka masla hal ho jayega.
});



// --------------------------------------------------------------------------
// 🔥 FFmpeg Path Configuration FIX: Build ke baad chota path set karna
// --------------------------------------------------------------------------
let calculatedFfmpegPath;

if (app.isPackaged) {
    // 1. Production Build (Doosre PCs par)
    
    // Platform check karke sahi executable name use karein
    const platformExe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    
    // electron-builder "extraResources" ko 'resourcesPath' mein daal deta hai.
    calculatedFfmpegPath = path.join(process.resourcesPath, 'ffmpeg', platformExe); 
    console.log(`🔧 Production FFmpeg Path: ${calculatedFfmpegPath}`);
} else {
    // 2. Development Mode (Local PC par)
    // Hum 'ffmpeg-static' library ko use kar rahe hain (recommended for Dev)
    try {
        // Yeh line sirf development mein 'ffmpeg-static' se path laayegi
        calculatedFfmpegPath = require('ffmpeg-static');
        console.log(`🔧 Development FFmpeg Path (Static): ${calculatedFfmpegPath}`);
    } catch (e) {
        // Fallback to local folder (agar static nahi mila)
        // Note: Ye sirf Windows ke liye hai, development mein macOS/Linux ke liye 'ffmpeg-static' ya system path use hoga
        calculatedFfmpegPath = path.join(__dirname, 'ffmpeg', 'ffmpeg.exe'); 
        console.log(`🔧 Development FFmpeg Path (Local Fallback): ${calculatedFfmpegPath}`);
    }
}

// 1. Fluent-ffmpeg ko set karna (Yeh zaroori nahi agar sirf yt-dlp use kar rahe hain, lekin safe hai):
try {
    if (fs.existsSync(calculatedFfmpegPath)) {
        fluent.setFfmpegPath(calculatedFfmpegPath);
        console.log("✅ fluent-ffmpeg path set successfully.");
    } else {
        console.error(`❌ FFmpeg executable not found at: ${calculatedFfmpegPath}`);
    }
} catch(e) {
    console.error("❌ fluent-ffmpeg setting failed:", e);
}
// --------------------------------------------------------------------------
// End of FFmpeg Path Configuration
// --------------------------------------------------------------------------


// --------------------------------------------------------------------------
// App Lifecycle
// --------------------------------------------------------------------------
app.whenReady().then(() => {
    console.log('🚀 App whenReady triggered');
    loadSettings();
    initializeCSSFilters();
    setupAdBlocker();

    // 🔥 UPDATER BLOCK: Download ke baad poochhne wala code shamil hai
    try {
        const log = require('electron-log'); 
        autoUpdater.logger = log;
        autoUpdater.logger.transports.file.level = 'info';

        console.log('--- AUTO-UPDATER SETUP STARTING ---');
        log.info('App starting...');

        // Updates check karein (Automatic Check)
        autoUpdater.checkForUpdates(); 

        // ❌ ERROR ALERT (Agar koi masla ho to screen par dikhega)
        autoUpdater.on('error', (error) => {
            log.error('Updater Error:', error.message);
            console.error('❌ UPDATER ERROR:', error.message);
            dialog.showMessageBox({
                type: 'error',
                title: 'Update Error',
                message: 'Update check mein masla: ' + error.message,
            });
        });
        
        // 🔔 UPDATE AVAILABLE ALERT
        autoUpdater.on('update-available', (info) => {
            log.info('Update available. Version: ' + info.version);
            console.log('✅ Update Found: ' + info.version);
            dialog.showMessageBox({
                type: 'info',
                title: 'Update Available',
                message: 'Naya version (' + info.version + ') background mein download shuru ho gaya hai.',
            });
        });

        // ⬇️ DOWNLOAD COMPLETE (AB POOCHHEGA)
        autoUpdater.on('update-downloaded', (info) => {
            log.info('Update downloaded. Version: ' + info.version);
            console.log('⬇️ Update Downloaded. Installing on Quit.');
            
            // 🔥 YAHAN POOCHHNE WALA DIALOG HAI
            dialog.showMessageBox({
                type: 'info',
                title: 'Update Ready',
                message: 'Naya update download ho chuka hai. Kya aap abhi restart karke install karna chahenge?',
                buttons: ['Restart Now', 'Later'] // User se poochega
            }).then((result) => {
                // Agar user "Restart Now" dabaye
                if (result.response === 0) autoUpdater.quitAndInstall(); 
            });
        });

        autoUpdater.on('checking-for-update', () => {
            log.info('Checking for update...');
        });

    } catch(e) {
        console.error("❌ Auto-Updater setup failed (Catch Block):", e);
        // ERROR KO SCREEN PAR DIKHAEN
        dialog.showMessageBox({
            type: 'error',
            title: 'Updater Error',
            message: 'Auto-Updater shuru nahi ho saka: ' + e.message,
        });
    }
    // 🔥 End of UPDATER BLOCK

   
    createWindow();
    console.log('✅ App initialization completed');
});

app.on('ready', () => {
    console.log('✅ App ready event');
});

app.on('before-quit', () => {
    console.log('⏹️ App before-quit event');
});

app.on('will-quit', () => {
    console.log('⏹️ App will-quit event');
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('✅ Main process initialization completed');

