// renderer/renderer.js
// FINAL VERSION: Tab Management, Media Player, Volume Boost, Ad Blocker, aur Download Manager
// COMPLETELY FIXED WITH DEBUGGING LOGS

console.log("🚀 Renderer Process Started: Initializing variables...");

let isMediaPlaying = false; // Naye media status ko track karne ke liye
let currentMediaUrl = '';   // Current media ka URL store karne ke liye
let currentMediaTitle = ''; // Current media ka title store karne ke liye
let activeRendererDownloads = {};

let isAdBlockerEnabled = true; 
let adblockCSS = ''; 
const knownAggressiveRedirectDomains = ['1xbet.com', 'popads.net', 'exoclick.com', 'dmca-security.com', 'popcash.net', 'adsterra.com', 'alibaba.com/ads']; 


// 🔥 NEW: Logo Images Paths (Ensure yeh files aapke assets folder mein hain)
const STATIC_LOGO_SRC = './assets/logo-static.png';
const LOADING_LOGO_SRC = './assets/logo-loader.gif';

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

console.log("✅ Electron modules loaded");

// --- Element Selection (Updated for Tabs and Downloads) ---
console.log("🔍 Selecting DOM elements...");
const tabContainer = document.getElementById('tab-bar');
const newTabBtn = document.getElementById('new-tab-btn');
const contentArea = document.querySelector('.content-area'); 



// 🔥 NEW: Browser Logo Element
const browserLogo = document.getElementById('browser-logo'); // ID wahi jo HTML mein di hai
const addressBar = document.getElementById('address-bar');
const goButton = document.getElementById('go-btn');
const backButton = document.getElementById('back-btn');
const forwardButton = document.getElementById('forward-btn');
const adblockToggleBtn = document.getElementById('adblock-toggle'); 
const notificationArea = document.getElementById('notification-area'); 
const localFileBtn = document.getElementById('local-file-btn'); 
const webviewContainer = document.getElementById('webview-container'); // Naya container
const mediaPlayerContainer = document.getElementById('media-player-container'); 
const playlistPanel = document.getElementById('playlist-panel'); 
const hidePlaylistBtn = document.getElementById('hide-playlist-btn'); 
const channelList = document.getElementById('channel-list'); 
const togglePlaylistBtn = document.getElementById('toggle-playlist-btn');

// Download Elements
const downloadToggleBtn = document.getElementById('download-toggle-btn');
//const downloadListEl = document.getElementById('download-list');
const downloadPopup = document.getElementById('download-popup');
const downloadListEl = document.getElementById('downloads-container');
const noDownloadsMsgEl = document.getElementById('no-downloads-msg');

// 🔥 NEW: History and Bookmarks Elements
const historyBtn = document.getElementById('history-btn'); 
const bookmarksBtn = document.getElementById('bookmarks-btn');
const historyModal = document.getElementById('history-bookmarks-modal');
const closeModalHistoryBtn = document.getElementById('close-history-modal-btn');
const historyListEl = document.getElementById('history-list');
const bookmarksListEl = document.getElementById('bookmarks-list');
const clearDataBtn = document.getElementById('clear-data-btn');
const bookmarkToggleInAddressBar = document.getElementById('bookmark-toggle-btn'); 

// Global state to track current tab's URL for bookmarking
let currentActiveUrl = ''; 
let currentActiveTitle = '';

// 🔥 NEW: Media Player Download Controls
const mediaDownloadContainer = document.getElementById('media-download-container'); // Yeh container hum index.html mein add karenge
const downloadMediaBtn = document.getElementById('download-media-btn');


console.log("✅ DOM elements selected");
// 🔥 CRITICAL FIX: Main window media player ko hamesha ke liye chupa dein
mediaPlayerContainer.style.display = 'none';

// Video.js Player ka instance
let videojsPlayer; 
let audioContext;
let gainNode;
let currentPlaylist = []; 
let currentChannelIndex = -1; 

// --- Tab Management State ---
let tabs = [];
let activeTabId = null;

// --- Downloader State ---
let activeDownloads = {}; 

console.log("✅ Global variables initialized");

// Add these variables:
const downloadModal = document.getElementById('download-modal');
const modalTitleDisplay = document.getElementById('modal-title-display');
const downloadVideoBtn = document.getElementById('download-video-btn');
const downloadAudioBtn = document.getElementById('download-audio-btn');
const closeModalBtn = document.getElementById('close-modal-btn');



// --------------------------------------------------------------------------
// 1. Helper Functions (NEW: Logo Status Update)
// --------------------------------------------------------------------------

function setLogoLoading() {
    // Agar current src loading GIF nahi hai, toh change karo
    if (browserLogo && browserLogo.src.indexOf(LOADING_LOGO_SRC) === -1) {
        browserLogo.src = LOADING_LOGO_SRC;
        console.log("🔄 Logo set to LOADING (GIF)");
    }
}

function setLogoStatic() {
    // Agar current src static PNG nahi hai, toh change karo
    if (browserLogo && browserLogo.src.indexOf(STATIC_LOGO_SRC) === -1) {
        browserLogo.src = STATIC_LOGO_SRC;
        console.log("✅ Logo set to STATIC (PNG)");
    }
}



// --------------------------------------------------------------------------
// 1. Helper Functions
// --------------------------------------------------------------------------

function showNotification(message) {
    console.log(`📢 Notification: ${message}`);
    if (!notificationArea) {
        console.error("❌ Notification area not found!");
        return;
    }
    notificationArea.textContent = message;
    notificationArea.style.display = 'block';
    setTimeout(() => { 
        notificationArea.style.display = 'none'; 
    }, 3000); 
}


/** 🛡️ Base64 ID ko selector-safe banata hai */
function getSafeId(base64Id) {
    if (typeof base64Id !== 'string') return '';
    // Base64 ke unsafe characters (+, /, =) ko safe strings se replace karna
    return base64Id
        .replace(/\+/g, '-plus-')
        .replace(/\//g, '-slash-')
        .replace(/=/g, ''); // = ko hata do
}


function updateToggleButton(isEnabled) {
    console.log(`🔄 Updating toggle button to: ${isEnabled ? 'ON' : 'OFF'}`);
    if (!adblockToggleBtn) {
        console.error("❌ Adblock toggle button not found!");
        return;
    }
    if (isEnabled) {
        adblockToggleBtn.textContent = '🚫 AdBlock: ON';
        adblockToggleBtn.style.backgroundColor = '#f44336'; 
        adblockToggleBtn.style.color = 'white';
    } else {
        adblockToggleBtn.textContent = '✅ AdBlock: OFF';
        adblockToggleBtn.style.backgroundColor = '#AAAAAA'; 
        adblockToggleBtn.style.color = 'black';
    }
}

function forcePlayerRedraw() {
    console.log("🎬 Forcing player redraw...");
    const container = document.getElementById('media-player-container');
    if (container && container.style.display === 'flex') {
        container.style.width = '99.99%';
        container.offsetHeight; 
        container.style.width = ''; 
        console.log("✅ Renderer: Forced player redraw applied.");
    }
}

function setupVolumeBoost() {
    console.log("🔊 Setting up volume boost...");
    if (audioContext && gainNode) {
        console.log("🔊 Volume boost already exists, checking state...");
        if (audioContext.state === 'suspended') {
            console.log("🔊 Audio context suspended, attempting to resume...");
            audioContext.resume().catch(e => console.error("❌ Audio resume failed during setup:", e));
        }
        return; 
    }
    const videoElement = document.getElementById('video-player');
    if (!videoElement) {
        console.error("❌ Video element not found for volume boost");
        return;
    }
    try {
        console.log("🔊 Creating new audio context...");
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        videoElement.volume = 1.0; 
        const track = audioContext.createMediaElementSource(videoElement);
        track.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 1.0; 
        console.log("✅ Volume boost setup completed");
        
        if (audioContext.state === 'suspended') {
            console.log("🔊 Audio context suspended, attempting to resume...");
            audioContext.resume().catch(e => console.error("❌ Audio context resume failed after creation:", e));
        }
    } catch (e) {
        console.error("❌ Volume Boost setup failed:", e);
        showNotification("Warning: Volume Boost (Web Audio API) kaam nahi kar raha.");
    }
}


// --------------------------------------------------------------------------
// 🔥 NEW: Media Download Button UI Logic
// --------------------------------------------------------------------------

function showDownloadButton(url, title) {
    if (!url || !mediaDownloadContainer) return;
    
    // Check agar button pehle se dikh raha hai
    if (mediaDownloadContainer.classList.contains('active')) return;
    
    // Agar URL YouTube ka hai, to thoda alag text dikhayein
    let buttonText = url.includes('youtube.com') || url.includes('youtu.be') ? 'YouTube Download' : 'Media Download';
    
    if(downloadMediaBtn) {
        downloadMediaBtn.textContent = `⬇️ ${buttonText}`;
    }
    
    mediaDownloadContainer.classList.add('active'); // CSS se isko visible kiya jayega
    console.log(`[DOWNLOAD-UI] 🟢 Download button shown for: ${title}`);
}

function hideDownloadButton() {
    if(!mediaDownloadContainer) return;
    mediaDownloadContainer.classList.remove('active');
    console.log("[DOWNLOAD-UI] 🔴 Download button hidden.");
}

// --------------------------------------------------------------------------
// HISTORY/BOOKMARKS UI & LOGIC
// --------------------------------------------------------------------------

/** History list ko render karta hai */
async function renderHistory() {
    const history = await ipcRenderer.invoke('get-history');
    // historyListEl aur historyModal ka check zaroori hai
    if (!historyListEl || !historyModal) return; 
    
    historyListEl.innerHTML = '';
    
    if (history.length === 0) {
        historyListEl.innerHTML = '<p style="color:#ccc; padding:10px;">Koi History nahi mili.</p>';
        return;
    }
    
    history.slice(0, 100).forEach(entry => { 
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="item-title">${entry.title}</div>
            <div class="item-url">${entry.url}</div>
            <div class="item-time">${new Date(entry.timestamp).toLocaleString()}</div>
        `;
        
        // 🔥 FIX: History item click par URL load karna
        li.addEventListener('click', () => {
            // 1. Sab se pehle active webview dhoondhein
            let activeWebview = document.querySelector('.webview.active');
            
            // 2. Agar active nahi milta, toh pehla webview dhoondhein (CRITICAL FIX)
            if (!activeWebview) {
                activeWebview = document.querySelector('webview');
            }
            
            if (activeWebview) {
                // Active webview mein URL load karein
                activeWebview.loadURL(entry.url); 
                console.log(`✅ History link clicked: Loading ${entry.url}`);
            } else {
                showNotification('Naya tab kholen aur phir try karein.', 'error'); // Agar koi bhi tab nahi hai
            }
            
            // Modal band karein
            historyModal.style.display = 'none'; 
        });
        
        historyListEl.appendChild(li);
    });
}



/** Bookmarks list ko render karta hai */
async function renderBookmarks() {
    const bookmarks = await ipcRenderer.invoke('get-bookmarks');
    // Check for element existence is good practice
    if (!bookmarksListEl || !historyModal) return; 
    
    bookmarksListEl.innerHTML = '';
    
    if (bookmarks.length === 0) {
        bookmarksListEl.innerHTML = '<p style="color:#ccc; padding:10px;">Koi Bookmarks nahi milay.</p>';
        return;
    }
    
    bookmarks.forEach(entry => {
        const li = document.createElement('li');
        li.className = 'bookmark-item';
        li.setAttribute('data-url', entry.url);
        li.innerHTML = `
            <div class="item-title">${entry.title}</div>
            <div class="item-url">${entry.url}</div>
            <button class="remove-bookmark-btn" data-url="${entry.url}">✕</button>
        `;
        
        // 🔥 FIX: Bookmark Title click par URL load karna
        li.querySelector('.item-title').addEventListener('click', () => {
            // 1. Sab se pehle active webview dhoondhein
            let activeWebview = document.querySelector('.webview.active');

            // 2. Agar active nahi milta, toh pehla webview dhoondhein (CRITICAL FIX)
            if (!activeWebview) {
                activeWebview = document.querySelector('webview');
            }
            
            if (activeWebview) {
                activeWebview.loadURL(entry.url); // CRITICAL: Direct webview ko loadURL call karein
                console.log(`✅ Bookmark clicked: Loading ${entry.url}`);
            } else {
                showNotification('Naya tab kholen aur phir try karein.', 'error'); // Agar koi bhi tab nahi hai
            }
            historyModal.style.display = 'none'; // Modal band karein
        });
        
        // Remove button click
        li.querySelector('.remove-bookmark-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            await ipcRenderer.invoke('remove-bookmark', entry.url);
            showNotification(`Bookmark removed: ${entry.title}`);
            renderBookmarks(); // List refresh karein
        });
        
        bookmarksListEl.appendChild(li);
    });
}


/** Bookmark toggle button ka state update karta hai */
async function updateBookmarkToggle(url) {
    if (!bookmarkToggleInAddressBar) return;
    if (!url || url.startsWith('file://')) {
         bookmarkToggleInAddressBar.innerHTML = '☆';
         bookmarkToggleInAddressBar.title = 'Current page bookmark nahi ho sakti';
         return;
    }
    
    const bookmarks = await ipcRenderer.invoke('get-bookmarks');
    const isBookmarked = bookmarks.some(b => b.url === url);
    
    if (isBookmarked) {
        bookmarkToggleInAddressBar.innerHTML = '⭐';
        bookmarkToggleInAddressBar.title = 'Bookmark Hata dein';
    } else {
        bookmarkToggleInAddressBar.innerHTML = '☆';
        bookmarkToggleInAddressBar.title = 'Bookmark Add karein';
    }
}


// --------------------------------------------------------------------------
// 2. Downloader Management - COMPLETELY FIXED
// --------------------------------------------------------------------------

function updateDownloadCountUI() {
    // Woh downloads jo chal rahe hain, pause hain ya shuru ho rahe hain
    const pendingCount = Object.values(activeDownloads).filter(d => 
        d.state !== 'completed' && d.state !== 'cancelled' && d.state !== 'error'
    ).length;
    
    console.log(`📥 Download Count Update - Pending: ${pendingCount}`);
    
    // 1. Download Toggle Button ke Text ko update karna
    if (downloadToggleBtn) {
        // Button ka text update karein (e.g., Downloads (3))
        downloadToggleBtn.textContent = `Downloads (${pendingCount})`;

        // Button ko 'active-downloads' class de ya hata de
        downloadToggleBtn.classList.toggle('active-downloads', pendingCount > 0);
    }
    
    // NOTE: 'download-count' element aapke HTML mein nahi hai, isliye uska code hata diya gaya hai.

    // 2. "No active downloads" message ko hide/show karna
    const noDownloadsMsgEl = document.getElementById('no-downloads-msg');
    if (noDownloadsMsgEl) {
        noDownloadsMsgEl.style.display = pendingCount > 0 ? 'none' : 'block';
    }
}  


/** Download shuru karne ke liye main function */
window.startDownload = async function(url, fileName) {
    console.log(`📥 Starting download - URL: ${url}, FileName: ${fileName}`);
    
    if (!url) {
        console.error("❌ Download failed: No URL provided");
        showNotification("❌ Download failed: No URL provided");
        return false;
    }

    try {
        console.log("📥 Invoking IPC download-video...");
        const result = await ipcRenderer.invoke('download-video', { url, fileName });
        console.log("📥 IPC download-video response:", result);

        if (result.success) {
            console.log(`✅ Download started successfully - ID: ${result.id}`);
            showNotification(`🚀 Download started: ${result.fileName}`);
            return true;
        } else {
            console.error(`❌ Download failed: ${result.message}`);
            showNotification(`❌ Download Failed: ${result.message}`);
            return false;
        }
    } catch (e) {
        console.error("❌ IPC Download Error:", e);
        showNotification("❌ Download initiation failed due to a system error.");
        return false;
    }
}

// --------------------------------------------------------------------------
// 3. Download UI Management - COMPLETELY FIXED
// --------------------------------------------------------------------------

function addDownloadEntryToUI(download) {
    console.log(`📥 Adding download entry to UI - ID: ${download.id}, File: ${download.fileName}, State: ${download.state}`);
    
    const safeId = getSafeId(download.id); 
    
    // Remove existing entry if any
    const existing = document.getElementById(`download-item-${safeId}`);
    if (existing) {
        console.log(`📥 Removing existing download item - Safe ID: ${safeId}`);
        existing.remove();
    }

    const li = document.createElement('li');
    li.id = `download-item-${safeId}`;
    li.className = 'download-item';
    
    const displayFileName = download.fileName || 
                            (download.url ? download.url.split('/').pop() : 'Unknown File') || 
                            `file-${download.id.substring(0, 8)}`;
    
    const isYouTubeDownload = download.url && (download.url.includes('youtube.com') || download.url.includes('youtu.be'));
    
    // 🔥 CRITICAL FIX: Download ki current state check karein
    const isPaused = download.state === 'paused';

    let actionButtonsHtml;
    if (isYouTubeDownload) {
        actionButtonsHtml = '<span style="color:#FFA000; font-size:12px;">YouTube Download (Actions not supported)</span>';
    } else {
        // Correct button class aur text choose karein
        const actionBtnClass = isPaused ? 'resume-btn' : 'pause-btn';
        const actionBtnText = isPaused ? '▶️ Resume' : '⏸️ Pause';
        
        actionButtonsHtml = `
            <button class="action-btn ${actionBtnClass}" data-id="${download.id}">${actionBtnText}</button> 
            <button class="action-btn cancel-btn" data-id="${download.id}">✖️ Cancel</button>
        `;
    }
    
    li.innerHTML = `
        <div class="file-name" title="${download.url || 'Unknown URL'}">${displayFileName}</div>
        <div class="status-info">
            <span class="status-text">Status: ${download.state === 'paused' ? 'Paused ⏸️' : (download.state || 'Initializing...')}</span>
            <span class="speed-text">0 KB/s</span>
            <span class="eta-text">ETA: Calculating...</span>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${download.progress || 0}%;"></div>
            <span class="progress-percent">${download.progress || 0}%</span>
        </div>
        <div class="download-actions">
            ${actionButtonsHtml}
        </div>
    `;
    
    downloadListEl.prepend(li); 
    
    if (!isYouTubeDownload) {
       //attachDownloadActionListeners(li);
    }
    
    console.log(`✅ Download item added to UI - Safe ID: ${safeId}`);
}


// 🔥 CRITICAL FIX: Global Event Delegation Listener for all Download Actions
document.addEventListener('click', (e) => {
    // e.target.closest('.action-btn') hamesha sabse qareeb ka action button dhundta hai
    const btn = e.target.closest('.action-btn'); 

    if (!btn) return; 

    const downloadId = btn.getAttribute('data-id');
    if (!downloadId) return; 

    console.log(`DEBUG: Action button clicked. Class: ${btn.className}`);
    
    // Logic check karein: Pause, Resume, ya Cancel
    if (btn.classList.contains('pause-btn')) {
        console.log(`🎬 IPC Invoking 'download-pause' for ID: ${downloadId}`);
        ipcRenderer.invoke('download-pause', downloadId);
    } else if (btn.classList.contains('resume-btn')) {
        console.log(`🎬 IPC Invoking 'download-resume' for ID: ${downloadId}`);
        ipcRenderer.invoke('download-resume', downloadId);
    } else if (btn.classList.contains('cancel-btn')) {
        console.log(`🎬 IPC Invoking 'download-cancel' for ID: ${downloadId}`);
        ipcRenderer.invoke('download-cancel', downloadId);
    }
});


// --------------------------------------------------------------------------
// 5. Download Action Handlers - CRITICAL FIX
// Yeh function buttons par click hone ki logic handle karta hai
// --------------------------------------------------------------------------

function attachDownloadActionListeners(downloadItemEl) {
    const actionsDiv = downloadItemEl.querySelector('.download-actions');
    if (!actionsDiv) return;

    // Listener ko action div par attach karein
    actionsDiv.addEventListener('click', (e) => {
        const btn = e.target;

        // Agar click action-btn par nahi hua to ignore karein
        if (!btn.classList.contains('action-btn')) {
            console.log('DEBUG: Clicked element is not an action button.');
            return;
        }

        const downloadId = btn.getAttribute('data-id');
        
        // 🔥 CRITICAL DEBUG: Check karein ke listener kis class ko dekh raha hai
        console.log(`DEBUG: Clicked button class is: ${btn.className}`);
        
        // --- LOGIC CHECKS ---
        if (btn.classList.contains('pause-btn')) {
            console.log(`🎬 IPC Invoking 'download-pause' for ID: ${downloadId}`);
            ipcRenderer.invoke('download-pause', downloadId);
        } else if (btn.classList.contains('resume-btn')) {
            console.log(`🎬 IPC Invoking 'download-resume' for ID: ${downloadId}`);
            ipcRenderer.invoke('download-resume', downloadId);
        } else if (btn.classList.contains('cancel-btn')) {
            console.log(`🎬 IPC Invoking 'download-cancel' for ID: ${downloadId}`);
            ipcRenderer.invoke('download-cancel', downloadId);
        }
    });
}

// --------------------------------------------------------------------------
// 4. Downloader IPC Listeners - COMPLETELY FIXED
// --------------------------------------------------------------------------

// 1. Download Started Listener - MAIN EVENT
ipcRenderer.on('download-started', (event, data) => {
    console.log(`📥 DOWNLOAD-STARTED Event - ID: ${data.id}, URL: ${data.url.substring(0, 50)}..., FileName: ${data.fileName}`);
    
    // Priority: Agar pehle se entry nahi hai toh create karo
    if (data.id && !activeDownloads[data.id]) {
        activeDownloads[data.id] = { 
            id: data.id, 
            url: data.url, 
            fileName: data.fileName, 
            state: 'starting', 
            progress: 0,
            receivedBytes: 0,
            totalBytes: 0
        };
        
        console.log(`✅ Download tracking INITIALIZED - ID: ${data.id}`);
        addDownloadEntryToUI(activeDownloads[data.id]);
        updateDownloadCountUI();
        showNotification(`📥 Download started: ${data.fileName}`);
    } else {
        console.log(`📥 Download already tracked - ID: ${data.id}`);
    }
});

// YEHI EK BAAR HONA CHAHIYE — BAKI SAB DELETE KAR DO
ipcRenderer.on('download-progress', (event, data) => {
    // Agar entry nahi hai to bana do
    if (!activeDownloads[data.id]) {
        activeDownloads[data.id] = {
            id: data.id,
            url: data.url || '',
            fileName: data.fileName || 'Unknown',
            state: 'downloading',
            progress: 0
        };
        addDownloadEntryToUI(activeDownloads[data.id]);
    }

    // Update state
    const download = activeDownloads[data.id];
    download.progress = data.progress || 0;
    download.receivedBytes = data.receivedBytes || 0;
    download.totalBytes = data.totalBytes || 0;

    // UI update (sirf ek baar!)
    updateDownloadUI(data.id, data.progress, data.speed, data.eta);
    updateDownloadCountUI();
});



// 3. Download Status Update (Pause/Resume/Cancel)
ipcRenderer.on('download-status-update', (event, data) => {
    console.log(`📥 DOWNLOAD-STATUS-UPDATE - ID: ${data.id}, State: ${data.state}`);
    
    // ... Initialization logic yahan rahegi ...
    
    activeDownloads[data.id].state = data.state;

    const safeId = getSafeId(data.id);
    const itemEl = document.getElementById(`download-item-${safeId}`); 
    if (!itemEl) return;

    const statusTextEl = itemEl.querySelector('.status-text');
    const actionsDiv = itemEl.querySelector('.download-actions'); // Action buttons ka container

    // Download ho chuka hai, actions hatao
    if (data.state === 'completed' || data.state === 'error' || data.state === 'cancelled') {
        // ... (completed/error/cancelled logic yahan rahegi) ...
        // Yeh block theek hai, isko chhod dein
        // ...
        
    } else if (data.state === 'paused') {
        if (statusTextEl) statusTextEl.textContent = 'Status: Paused ⏸️';
        
        // 🔥 CRITICAL FIX: Poore actions div ko RESUME buttons se replace karo
        if (actionsDiv) {
            actionsDiv.innerHTML = `
                <button class="action-btn resume-btn" data-id="${data.id}">▶️ Resume</button>
                <button class="action-btn cancel-btn" data-id="${data.id}">✖️ Cancel</button>
            `;
            console.log(`✅ UI: Download actions replaced with RESUME button (innerHTML).`); 
        }
        showNotification(`⏸️ Download paused: ${activeDownloads[data.id].fileName}`);
        
    } else if (data.state === 'downloading') {
        if (statusTextEl) statusTextEl.textContent = 'Status: Downloading...';
        
        // 🔥 CRITICAL FIX: Poore actions div ko PAUSE buttons se replace karo
        if (actionsDiv) {
            actionsDiv.innerHTML = `
                <button class="action-btn pause-btn" data-id="${data.id}">⏸️ Pause</button>
                <button class="action-btn cancel-btn" data-id="${data.id}">✖️ Cancel</button>
            `;
            console.log(`✅ UI: Download actions replaced with PAUSE button (innerHTML).`); 
        }
        
    }
    
    updateDownloadCountUI();
});


// 4. Download Complete
ipcRenderer.on('download-complete', (event, data) => {
    console.log(`📥 DOWNLOAD-COMPLETE - ID: ${data.id}, File: ${data.fileName}, Path: ${data.path}`);
    
    // 🔥 CRITICAL FIX: Agar download ID activeDownloads mein nahi hai, toh on-the-fly initialize karo
    if (!activeDownloads[data.id]) {
        console.warn(`📥 Unknown download ID in complete: ${data.id}, creating entry...`);
        
        let decodedUrl, fileName;
        try {
            decodedUrl = atob(data.id);
            fileName = data.fileName || decodedUrl.split('/').pop() || `file-${data.id.substring(0, 8)}`;
        } catch (decodeError) {
            decodedUrl = data.id;
            fileName = data.fileName || `file-${data.id.substring(0, 8)}`;
        }
        
        activeDownloads[data.id] = { 
            id: data.id, 
            url: decodedUrl, 
            fileName: fileName, 
            state: 'completed', 
            progress: 100 
        };
        
        console.log(`✅ On-the-fly download initialized for completion - ID: ${data.id}`);
        addDownloadEntryToUI(activeDownloads[data.id]);
    } else {
        activeDownloads[data.id].state = 'completed';
        activeDownloads[data.id].progress = 100;
    }
    
    const safeId = getSafeId(data.id);
    const itemEl = document.getElementById(`download-item-${safeId}`); 
    if (!itemEl) {
        console.error(`📥 Download item element not found for completed download ID: ${data.id}, Safe ID: ${safeId}`);
        return;
    }

    // UI elements update karo
    const statusText = itemEl.querySelector('.status-text');
    const progressBar = itemEl.querySelector('.progress-bar');
    const progressPercent = itemEl.querySelector('.progress-percent');
    const speedText = itemEl.querySelector('.speed-text');
    const etaText = itemEl.querySelector('.eta-text');
    const actionsDiv = itemEl.querySelector('.download-actions');

    if (statusText) statusText.textContent = 'Status: ✅ Complete';
    if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#4CAF50';
    }
    if (progressPercent) progressPercent.textContent = '100%';
    if (speedText) speedText.textContent = '';
    if (etaText) etaText.textContent = '';
    
    if (actionsDiv) {
        actionsDiv.innerHTML = `<button class="action-btn open-file-btn" data-path="${data.path}">📂 Open Fe</button>`;
    }

    updateDownloadCountUI();
    showNotification(`🎉 Download Complete: ${data.fileName || 'File'}`);
    console.log(`✅ Download completed successfully - ID: ${data.id}`);

    // Remove item after 8 seconds
    setTimeout(() => {
        if(activeDownloads[data.id] && activeDownloads[data.id].state === 'completed') {
            console.log(`📥 Removing completed download from UI - ID: ${data.id}`);
            delete activeDownloads[data.id];
            if (itemEl.parentNode) {
                itemEl.remove();
            }
        }
    }, 8000);
});

// 5. Download Error
ipcRenderer.on('download-error', (event, data) => {
    console.error(`📥 DOWNLOAD-ERROR - ID: ${data.id}, Error: ${data.error}`);
    
    // 🔥 CRITICAL FIX: Agar download ID activeDownloads mein nahi hai, toh on-the-fly initialize karo
    if (!activeDownloads[data.id]) {
        console.warn(`📥 Unknown download ID in error: ${data.id}, creating entry...`);
        
        let decodedUrl, fileName;
        try {
            decodedUrl = atob(data.id);
            fileName = data.fileName || decodedUrl.split('/').pop() || `file-${data.id.substring(0, 8)}`;
        } catch (decodeError) {
            decodedUrl = data.id;
            fileName = data.fileName || `file-${data.id.substring(0, 8)}`;
        }
        
        activeDownloads[data.id] = { 
            id: data.id, 
            url: decodedUrl, 
            fileName: fileName, 
            state: 'error', 
            progress: 0 
        };
        
        console.log(`✅ On-the-fly download initialized for error - ID: ${data.id}`);
        addDownloadEntryToUI(activeDownloads[data.id]);
    }
    
   const safeId = getSafeId(data.id);
    const itemEl = document.getElementById(`download-item-${safeId}`);
    if (!itemEl) {
        console.error(`📥 Download item element not found for errored download ID: ${data.id}, Safe ID: ${safeId}`);
        return;
    }
    
    const statusText = itemEl.querySelector('.status-text');
    const progressBar = itemEl.querySelector('.progress-bar');
    const progressPercent = itemEl.querySelector('.progress-percent');
    const actionsDiv = itemEl.querySelector('.download-actions');

    if (statusText) statusText.textContent = `Status: ❌ ERROR`;
    if (progressBar) {
        progressBar.style.backgroundColor = 'red';
        progressBar.style.width = '100%';
    }
    if (progressPercent) progressPercent.textContent = 'Error';

    if (actionsDiv) {
        actionsDiv.innerHTML = `<span style="color:red; font-size:12px;">Error: ${data.error}</span>`;
    }

    delete activeDownloads[data.id];
    updateDownloadCountUI();
    showNotification(`❌ Download Error: ${data.fileName || 'File'}`);
});

// 6. Auto Catch Listener (will-download event se aata hai)
ipcRenderer.on('auto-catch-download', (event, data) => {
    console.log(`📥 AUTO-CATCH-DOWNLOAD - URL: ${data.url}, FileName: ${data.fileName}, ID: ${data.id}`);
    
    // Pehle se hi activeDownloads mein entry create karo
    if (data.id && !activeDownloads[data.id]) {
        activeDownloads[data.id] = { 
            id: data.id, 
            url: data.url, 
            fileName: data.fileName, 
            state: 'pending', 
            progress: 0 
        };
        addDownloadEntryToUI(activeDownloads[data.id]);
        updateDownloadCountUI();
    }
    
    if (confirm(`A download link was detected. Start download for: ${data.fileName}?`)) {
        console.log(`📥 User confirmed auto-catch download`);
        window.startDownload(data.url, data.fileName); 
        if (downloadPopup) {
            downloadPopup.style.display = 'block';
        }
    } else {
        console.log("📥 Auto-caught download rejected by user.");
        // User ne cancel kiya toh entry remove karo
        if (data.id && activeDownloads[data.id]) {
            delete activeDownloads[data.id];
            updateDownloadCountUI();
            const itemEl = document.getElementById(`download-item-${data.id}`);
            if (itemEl) itemEl.remove();
        }
    }
});

// 🔥 NEW: Separate UI update function
function updateDownloadUI(downloadId, progress, speed, eta) {
    // ✅ Safe ID use karen element dhundne ke liye
    const safeId = getSafeId(downloadId);
    const itemEl = document.getElementById(`download-item-${safeId}`); 
    if (!itemEl) {
        console.error(`📥 UI element still not found for ID: ${downloadId}, Safe ID: ${safeId}`);
        return;
    }
    // Format values
    const speedFormatted = speed ? (speed / 1024).toFixed(1) : '0';
    const etaFormatted = eta ? Math.floor(eta) : '...';
    const progressFormatted = Math.max(0, Math.min(100, progress)); // Clamp between 0-100

    // Update UI elements
    const progressBar = itemEl.querySelector('.progress-bar');
    const progressPercent = itemEl.querySelector('.progress-percent');
    const statusText = itemEl.querySelector('.status-text');
    const speedText = itemEl.querySelector('.speed-text');
    const etaText = itemEl.querySelector('.eta-text');

    if (progressBar) progressBar.style.width = `${progressFormatted}%`;
    if (progressPercent) progressPercent.textContent = `${progressFormatted}%`;
    if (statusText) statusText.textContent = `Status: Downloading...`;
    if (speedText) speedText.textContent = `${speedFormatted} KB/s`;
    if (etaText) etaText.textContent = `ETA: ${etaFormatted}s`;
    
    console.log(`📥 UI Updated - ID: ${downloadId}, Progress: ${progressFormatted}%`);
}

// --------------------------------------------------------------------------
// 5. Tab Management Logic
// --------------------------------------------------------------------------

function getActiveWebview() {
    const webview = document.querySelector(`.webview-tab[data-tab-id="${activeTabId}"]`);
    console.log(`🔍 Getting active webview - ID: ${activeTabId}, Found: ${!!webview}`);
    return webview;
}

function updateToolbarState(webview) {
    console.log(`🔄 Updating toolbar state for webview:`, webview ? webview.getURL() : 'No webview');
    
    if (webview) {
        addressBar.value = webview.getURL() || '';
        backButton.disabled = !webview.canGoBack();
        forwardButton.disabled = !webview.canGoForward();
        console.log(`🔄 Toolbar - URL: ${addressBar.value}, CanGoBack: ${!backButton.disabled}, CanGoForward: ${!forwardButton.disabled}`);
    } else {
        addressBar.value = '';
        backButton.disabled = true;
        forwardButton.disabled = true;
        console.log(`🔄 Toolbar reset - No active webview`);
    }
}

function activateTab(tabId) {
    console.log(`📑 Activating tab - ID: ${tabId}, Current active: ${activeTabId}`);
    
    if (activeTabId === tabId) {
        console.log(`📑 Tab ${tabId} is already active`);
        return;
// Iske end mein yeh line add kar do
    setTimeout(() => {
        const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`) || document.querySelector('webview');
        if (webview) {
            webview.focus();
        }
    }, 100);
    }
    
    const oldWebview = getActiveWebview();
    if (oldWebview) {
        oldWebview.style.display = 'none';
        const oldTabEl = document.querySelector(`.tab[data-tab-id="${activeTabId}"]`);
        if (oldTabEl) oldTabEl.classList.remove('active');
        console.log(`📑 Deactivated old tab - ID: ${activeTabId}`);
    }

    activeTabId = tabId;
    const newWebview = getActiveWebview();
    
    if (newWebview) {
        newWebview.style.display = 'flex'; 
        const newTabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
        if (newTabEl) newTabEl.classList.add('active');

// 🔥 YAHAN PAR PASTE KAREIN! (Loading state check)
        // Logo state check on tab activation
        if (newWebview.isLoading()) {
            setLogoLoading(); // Agar naya tab load ho raha hai, toh GIF dikhao
        } else {
            setLogoStatic(); // Warna static image dikhao
        }
        
        toggleViewMode('web');
        updateToolbarState(newWebview);

        addressBar.focus();
        console.log(`✅ Activated tab - ID: ${tabId}, URL: ${newWebview.getURL()}`);
    } else {
        console.error(`❌ Failed to activate tab - Webview not found for ID: ${tabId}`);
    }
}

function createNewTab(url = 'https://www.google.com') {
    console.log(`📑 Creating new tab - URL: ${url}, Total tabs: ${tabs.length}`);
    
    if (tabs.length > 0 && activeTabId === null) {
        console.log(`📑 No active tab, activating first tab instead`);
        activateTab(tabs[0].id);
        return;
    }
    
    const tabId = Date.now();
    console.log(`📑 New tab ID generated: ${tabId}`);
    
    // 1. Webview Element create karna
    const webview = document.createElement('webview');
    webview.id = `webview-${tabId}`;
    webview.className = 'webview-tab';
    webview.setAttribute('data-tab-id', tabId);
    webview.setAttribute('src', url);
    webview.setAttribute('allowpopups', 'true'); 
    webview.style.display = 'none'; 
    webview.setAttribute('webpreferences', 'contextIsolation=false, nodeIntegration=false');

    console.log(`✅ Webview element created - ID: webview-${tabId}`);

    // 2. Tab Element create karna
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.setAttribute('data-tab-id', tabId);
    tabEl.textContent = 'Loading...';
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-tab';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        console.log(`📑 Close tab clicked - ID: ${tabId}`);
        closeTab(tabId);
    });
    
    tabEl.appendChild(closeBtn);
    
    tabEl.addEventListener('click', () => {
        console.log(`📑 Tab clicked - ID: ${tabId}`);
        activateTab(tabId);
    });

    // 3. Elements DOM mein add karna
    contentArea.insertBefore(webview, mediaPlayerContainer); 
    tabContainer.insertBefore(tabEl, newTabBtn);
    tabs.push({ id: tabId, webview: webview, tabEl: tabEl });

    console.log(`✅ Tab elements added to DOM - Total tabs: ${tabs.length}`);

    // 4. Events lagana
    webview.addEventListener('did-navigate', (event) => { 
        console.log(`🌐 Tab ${tabId} navigated to: ${event.url}`);
        if (activeTabId === tabId) {
            addressBar.value = event.url; 
        }
    });
    
    webview.addEventListener('page-title-updated', (event) => {
        const title = event.title.substring(0, 20) + (event.title.length > 20 ? '...' : '');
        tabEl.textContent = title;
        tabEl.appendChild(closeBtn); 
        console.log(`📑 Tab ${tabId} title updated: ${title}`);
    });

// 🔥 UPDATED: Loading Indicator (Logo) Events
    webview.addEventListener('did-start-loading', () => {
        console.log(`🌐 Tab ${tabId} started loading`);
        // Sirf active tab ke liye logo update karo
        if (activeTabId === tabId) {
            setLogoLoading(); 
        }
    });

    webview.addEventListener('did-stop-loading', () => {
        console.log(`🌐 Tab ${tabId} stopped loading`);
        // Sirf active tab ke liye logo update karo
        if (activeTabId === tabId) {
            setLogoStatic(); 
        }
    });
    
    // Agar loading fail ho jaye to bhi band karna hai
    webview.addEventListener('did-fail-load', () => {
        if (activeTabId === tabId) {
            setLogoStatic(); 
        }
        // ... existing did-fail-load logic ...
    });


// 🔥 NEW: Media Playback Detector & Button Injector
    webview.addEventListener('media-started-playing', (event) => {
        isMediaPlaying = true;
        const srcUrl = webview.getURL();
        
        // Page Title nikalne ki koshish karein
        webview.executeJavaScript(`document.title;`).then(title => {
            // Title ko sanitize karein
            currentMediaTitle = title ? title.split(' - ')[0].trim() : 'Video_Download';
            currentMediaUrl = srcUrl; 
            
            console.log(`[MEDIA-RENDERER] ▶️ Media Started Playing. URL: ${currentMediaUrl}, Title: ${currentMediaTitle}`);
            
            showDownloadButton(currentMediaUrl, currentMediaTitle);
        }).catch(err => {
            console.warn("[MEDIA-RENDERER] Could not get title:", err);
            currentMediaTitle = 'Video_Download';
            currentMediaUrl = srcUrl;
            showDownloadButton(currentMediaUrl, currentMediaTitle);
        });
    });

    webview.addEventListener('media-paused', () => {
        isMediaPlaying = false;
        hideDownloadButton();
        console.log("[MEDIA-RENDERER] ⏸️ Media Paused.");
    });
    
    // Jab webview navigate ho ya tab change ho to button hide karein
    webview.addEventListener('did-start-navigation', () => {
        isMediaPlaying = false;
        currentMediaUrl = '';
        currentMediaTitle = '';
        hideDownloadButton();
    });

    
    webview.addEventListener('did-stop-loading', () => {
        console.log(`🌐 Tab ${tabId} finished loading`);
        if (activeTabId === tabId) {
            updateToolbarState(webview);
        }
        // AdBlock CSS inject karein after load stop
        if (isAdBlockerEnabled && adblockCSS) {
            console.log(`🛡️ Injecting AdBlock CSS into tab ${tabId}`);
            webview.insertCSS(adblockCSS).catch(e => console.error("❌ CSS Inject Failed:", e));
        }
    });

    // JavaScript Forceful Redirect Roko 
    webview.addEventListener('will-navigate', (event) => {
        const currentUrl = webview.getURL();
        const redirectUrl = event.url;
        
        console.log(`🛡️ Will-navigate event - Current: ${currentUrl}, Redirect: ${redirectUrl}`);
        
        ipcRenderer.invoke('get-adblock-state').then(isEnabled => {
            if (isEnabled && currentUrl !== redirectUrl) {
                const adCheck = ['1xbet', 'betting', 'popads', 'adsterra', 'redirect', 'alibaba', 'undefined']; 

                if (adCheck.some(d => redirectUrl.includes(d.toLowerCase()))) {
                     console.warn(`🚨 [JS Redirect Blocked] Forceful navigation blocked: ${redirectUrl}`);
                     showNotification("🚨 Aggressive Redirect Blocked!");
                     webview.stop(); 
                }
            }
        });
    });
    
    // Context Menu Listener
    webview.addEventListener('context-menu', (event) => {
        console.log(`🖱️ Context menu requested in tab ${tabId}`);
        ipcRenderer.send('show-context-menu', { params: event.params }); 
    });

// 🔥 CRITICAL FIX 1: New Window event ko force deny karna (Pop-ups ko Renderer level par roka)
    webview.addEventListener('new-window', (e) => {
        console.warn(`[WEBVIEW SECURITY] 🚫 New window event blocked: ${e.url}`);
        e.preventDefault(); // Isse naya window Electron mein khulne se turant ruk jayega
    });

    // 🔥 CRITICAL FIX 2: Page load hone par Aggressive CSS inject karna (Overlays ko chhupaya)
    webview.addEventListener('did-finish-load', () => {
    // Aggressive CSS bhi inject karein
    applyAggressiveCSSBlock(webview);



// 🔥 NEW: Update current URL/Title for bookmarking
    const url = webview.getURL();
        const title = webview.getTitle(); 
        
        currentActiveUrl = url;
        currentActiveTitle = title;
        updateBookmarkToggle(url); // <-- Yahan Bookmark Toggle update hota hai
// 🔥 HISTORY RECORDING CODE YAHAN PASTE KAREIN
        if (url && !url.startsWith('file://') && !url.startsWith('about:')) {
            ipcRenderer.invoke('record-history-entry', { url, title })
                .then(() => {
                    console.log(`✅ History Recorded and Sent to Main: ${title}`);
                })
                .catch(err => {
                    console.error("History recording failed (IPC Error):", err);
                });
        }
    
    // 🔥 NEW: Login State Simulation + Aggressive DOM Cleanup Script
    const aggressiveCleanupScript = `
        // 1. Local Storage mein flags set karein (taake website ko lage logged in hai)
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('subscriptionStatus', 'active');
        localStorage.setItem('paywallShown', 'false');
        document.cookie = "isLoggedIn=true; max-age=3600; path=/"; 
        
        // --- Aggressive DOM Cleanup Function ---
        function aggressiveDOMCleanup() {
            const selectorsToRemove = [
                // Login/Subscribe modals and wrappers
                '[id*="login-modal"]',
                '[id*="subscribe-prompt"]',
                '[class*="paywall"]',
                '[class*="login-overlay"]',
                '[class*="modal-dialog"]',
                // Generic blockers
                '.modal-backdrop',
                '[id*="popup-wrapper"]',
                '[class*="lock-screen"]',
                // High z-index elements ko target karein
                'div[style*="z-index:999999"]', 
                'body > div:last-child[style*="fixed"]' 
            ];

            selectorsToRemove.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    // Agar element ka height/width 100% hai toh usko remove kar do
                    if (el && (el.offsetWidth > window.innerWidth * 0.9 || el.offsetHeight > window.innerHeight * 0.9)) {
                        el.remove();
                        // Console log sirf debugging ke liye
                        // console.log('Removed aggressive blocker:', selector); 
                    }
                });
            });
        }
        
        // 2. Cleanup ko foran chalaein
        aggressiveDOMCleanup(); 
        
        // 3. Cleanup ko har 500ms par 5 seconds tak chalaein (dobara inject hone se rokne ke liye)
        let cleanupInterval = setInterval(aggressiveDOMCleanup, 500); 
        setTimeout(() => {
            clearInterval(cleanupInterval); 
            // console.log('Aggressive cleanup finished.');
        }, 5000); 
    `;
    
    // JavaScript inject karein
    if (activeTabId === tabId) {
        webview.executeJavaScript(aggressiveCleanupScript)
            .catch(err => console.error("Error injecting aggressive cleanup script:", err));
    }
});

    // 5. Activate karna
    activateTab(tabId);
}

function closeTab(tabId) {
    console.log(`📑 Closing tab - ID: ${tabId}, Total tabs: ${tabs.length}`);
    
    if (tabs.length === 1) {
        console.warn("❌ Cannot close last tab");
        showNotification("Last tab band nahi ho sakta!");
        return;
    }
    
    const indexToClose = tabs.findIndex(t => t.id === tabId);
    if (indexToClose === -1) {
        console.error(`❌ Tab not found for closing - ID: ${tabId}`);
        return;
    }
    
    const tabData = tabs[indexToClose];
    tabData.webview.remove();
    tabData.tabEl.remove();
    tabs.splice(indexToClose, 1);

    console.log(`✅ Tab closed - ID: ${tabId}, Remaining tabs: ${tabs.length}`);

    if (activeTabId === tabId) {
        const newIndex = Math.min(indexToClose, tabs.length - 1);
        console.log(`📑 Activating new tab after close - Index: ${newIndex}, ID: ${tabs[newIndex].id}`);
        activateTab(tabs[newIndex].id);
    }
}

// --------------------------------------------------------------------------
// 6. View Mode Switching Logic
// --------------------------------------------------------------------------

function toggleViewMode(mode) {
    console.log(`🔄 Switching view mode to: ${mode}`);
    
    const currentWebview = getActiveWebview();
    
    if (mode === 'web') {
        if (currentWebview) currentWebview.style.display = 'flex'; 
        if (mediaPlayerContainer) mediaPlayerContainer.style.display = 'none'; 
        if (playlistPanel) playlistPanel.classList.remove('visible'); 

        if (videojsPlayer) {
            videojsPlayer.pause(); 
            videojsPlayer.reset(); 
        }
        
        if (addressBar) addressBar.placeholder = "Enter URL or Search Term...";
        console.log("✅ Switched to WEB mode");
    } else if (mode === 'media') {
        if (currentWebview) currentWebview.style.display = 'none'; 
        if (mediaPlayerContainer) mediaPlayerContainer.style.display = 'flex'; 
        if (addressBar) addressBar.placeholder = "Enter Stream Link (M3U8, MP4, etc.)...";

        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(e => console.error("❌ Audio resume failed during mode switch:", e));
        }
        console.log("✅ Switched to MEDIA mode");
    }
}

// --------------------------------------------------------------------------
// 7. M3U Playlist Parsing and Playback Logic
// --------------------------------------------------------------------------

async function initializePlayer(videoUrl, streamType) {
    console.log(`🎬 Initializing player - URL: ${videoUrl}, Type: ${streamType}`);
    
    if (!videojsPlayer) {
        console.log("🎬 Creating new Video.js player instance");
        videojsPlayer = videojs('video-player', {
            autoplay: true, 
            controls: true, 
            responsive: true, 
            fluid: true,
            playbackRates: [0.5, 1, 1.5, 2],
            html5: {
                hls: { withCredentials: false },
                crossOrigin: 'anonymous' 
            }
        });
        
        console.log("✅ Video.js player created");
        await setupVolumeBoost(); 
        
        videojsPlayer.on('error', () => {
            const err = videojsPlayer.error();
            console.error(`❌ Video player error:`, err);
            showNotification("Error: " + (err?.message || "Stream failed"));
        });
        
        // Fullscreen change event
        videojsPlayer.on('fullscreenchange', () => {
            const isPlayerFullscreen = videojsPlayer.isFullscreen();
            console.log(`🎬 Fullscreen change: ${isPlayerFullscreen}`);
            ipcRenderer.send('toggle-native-fullscreen', isPlayerFullscreen); 
            
            if (!isPlayerFullscreen) {
                setTimeout(forcePlayerRedraw, 300);
            }
        });

        // Double Click Handler
        const playerEl = videojsPlayer.el();
        if (playerEl) {
            playerEl.addEventListener('dblclick', function(event) {
                console.log(`🎬 Double click detected on player`);
                if (event.target.closest('.vjs-control-bar') || event.target.closest('.vjs-control')) {
                    console.log("🎬 Double click on controls, ignoring");
                    return;
                }
                if (videojsPlayer.isFullscreen()) {
                    console.log("🎬 Exiting fullscreen via double click");
                    videojsPlayer.exitFullscreen();
                } else {
                    console.log("🎬 Entering fullscreen via double click");
                    videojsPlayer.requestFullscreen();
                }
            });
        }

    } else {
        console.log("🎬 Reusing existing Video.js player");
        videojsPlayer.reset();
    }
    
    console.log(`🎬 Setting player source: ${videoUrl}`);
    videojsPlayer.src({ src: videoUrl, type: streamType });
    videojsPlayer.ready(() => {
        console.log("🎬 Player ready, attempting to play...");
        videojsPlayer.play().catch(err => {
            console.error("❌ Player play failed:", err);
            showNotification("Play failed. Format/link check karein.");
        });
        setTimeout(forcePlayerRedraw, 500);
    });
    
    const videoElement = document.getElementById('video-player');
    if (videoElement) {
        videoElement.focus();
    }
}

function parseM3UFile(filePath) {
    console.log(`📁 Parsing M3U file: ${filePath}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const channels = [];
        let channel = null;
        
        console.log(`📁 M3U file read successfully, ${lines.length} lines`);
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('#EXTINF:')) {
                const nameMatch = trimmedLine.match(/tvg-name="([^"]*)"|,(.*)$/i);
                const name = nameMatch ? (nameMatch[1] || nameMatch[2] || 'Unknown Channel').trim() : 'Unknown Channel';
                channel = { name: name, url: null };
            } 
            else if (channel && (trimmedLine.startsWith('http') || trimmedLine.startsWith('file'))) {
                channel.url = trimmedLine;
                channels.push(channel);
                channel = null; 
            }
        }
        
        console.log(`✅ M3U parsing completed - ${channels.length} channels found`);
        return channels;
    } catch (error) {
        console.error("❌ M3U Parsing Error:", error);
        showNotification("Error: M3U file load ya read nahi ho saki. Check permissions/format.");
        return [];
    }
}

async function loadAndPlayChannel(index) {
    console.log(`📺 Loading channel - Index: ${index}, Total channels: ${currentPlaylist.length}`);
    
    if (index < 0 || index >= currentPlaylist.length) {
        console.error(`❌ Invalid channel index: ${index}`);
        return;
    }
    
    const channel = currentPlaylist[index];
    const videoUrl = channel.url.trim();
    const streamType = videoUrl.toLowerCase().includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
    
    console.log(`📺 Playing channel: ${channel.name}, URL: ${videoUrl}`);
    
    await initializePlayer(videoUrl, streamType);
    currentChannelIndex = index;
    
    document.querySelectorAll('.channel-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
    
    showNotification("Playing: " + channel.name);
    
    const videoElement = document.getElementById('video-player');
    if (videoElement) {
        videoElement.focus();
    }
}

function displayPlaylist(channels) {
    console.log(`📺 Displaying playlist - ${channels.length} channels`);
    currentPlaylist = channels; 
    if (!channelList) { 
        console.error("❌ Channel list element not found!"); 
        return; 
    } 
    channelList.innerHTML = ''; 
    
    // 🔥 CRITICAL FIX 1: Main player ko reset karo taake playlist load hone par background audio band ho jaye
    if (videojsPlayer) { // 'window.player' ki bajaye 'videojsPlayer' use karein
        videojsPlayer.reset();
        console.log("🔇 Main videojsPlayer reset on playlist load.");
    }
    
    if (channels.length === 0) {
        channelList.innerHTML = '<li style="padding: 10px;">No channels found in playlist.</li>'; 
        console.warn("📺 No channels in playlist"); 
        return; 
    } 
    
    channels.forEach((channel, index) => { 
        const li = document.createElement('li'); 
        li.classList.add('channel-item'); 
        li.textContent = channel.name; 
        li.title = channel.name; 
        
        // 🔥 CRITICAL FIX 2: Channel click hone par PiP window mein load karein
        li.addEventListener('click', () => { 
            const videoUrl = channel.url.trim();
            console.log(`📺 Channel clicked - Index: ${index}, Name: ${channel.name}, URL: ${videoUrl}`); 
            
            // Ab seedha PiP window open hoga
            loadVideoInNewWindow(videoUrl); 
            
            // Playlist panel ko band kar dein jab channel select ho jaye
            if (playlistPanel) {
                playlistPanel.classList.remove('visible');
                showNotification(`TV channel shuru: ${channel.name}`);
            }
        }); 
        channelList.appendChild(li); 
    }); 
    
    // 🔥 CRITICAL FIX 3: Pehle channel ko background mein chalaane wali line hata di
    // loadAndPlayChannel(0); // <--- Yeh line remove kar di gayi hai
    
    if (playlistPanel) { 
        playlistPanel.classList.add('visible'); 
    } 
    console.log(`✅ Playlist displayed with ${channels.length} channels. Click to play in PiP window.`); 
}
// --------------------------------------------------------------------------
// 8. Navigation and Local File Logic
// --------------------------------------------------------------------------

async function navigate() {
    let url = addressBar.value.trim();
    if (!url) return;

    const currentWebview = getActiveWebview();
    console.log(`Navigation requested - URL: ${url}`);

    if (!currentWebview) {
        createNewTab(url);
        return;
    }

    // ─────── REAL MEDIA / STREAM LINKS DETECTION ───────
    const isDirectMediaFile = /\.(m3u8|m3u|mp4|webm|mov|avi|mpg|mpeg|ts|mkv|wav|mp3|aac|flac|ogg|mpegurl)$/i.test(url);
    const isStreamingProtocol = /^rtmp:\/\//i.test(url) || 
                                /^rtsp:\/\//i.test(url) || 
                                /^ftp:\/\//i.test(url);

    // Agar real stream/media link hai → PiP window mein direct kholo
    if (isDirectMediaFile || isStreamingProtocol) {
        console.log("REAL MEDIA/STREAM DETECTED → Opening in PiP Floating Window");
        
        // currentPlaylist ko khali rakho taake sirf single video chale
        currentPlaylist = [];

        loadVideoInNewWindow(url);  // Yeh wahi function hai jo Load Video/TV button use karta hai
        showNotification("Stream PiP window mein shuru ho gaya!");
        return;
    }

    // ─────── BAaki SAB normal web URLs ───────
    console.log("Normal Web URL → Opening in browser tab");
    toggleViewMode('web');

    if (url.startsWith('http://') || url.startsWith('https://')) {
        currentWebview.loadURL(url);
    } 
    else if (url.includes('.') && !url.includes(' ')) {
        currentWebview.loadURL(`https://${url}`);
    } 
    else {
        currentWebsearch(`https://www.google.com/search?q=${encodeURIComponent(url)}`);
    }
}


// Local file logic
if (localFileBtn) {
    localFileBtn.addEventListener('click', async () => {
    console.log("📁 Local file button clicked");
    
    const filePath = await ipcRenderer.invoke('open-file-dialog');
    if (filePath) {
        console.log(`📁 File selected: ${filePath}`);
        
        // File path ko file:// URL banana
        const videoUrl = `file://${filePath.replace(/\\/g, '/')}`;
        const fileName = filePath.toLowerCase();
        
        // Agar yeh playlist hai to usay main window mein dikhao
        if (fileName.endsWith('.m3u8') || fileName.endsWith('.m3u')) {
            console.log("📁 M3U file detected, parsing playlist");
            const channels = parseM3UFile(filePath); 
            
            // ✅ FIX: currentPlaylist ko set karo taake channel click karne par PiP window mein chala sake
            currentPlaylist = channels;
            
            displayPlaylist(channels);
            showNotification(`Playlist loaded: ${path.basename(filePath)}. Click channel to play.`);
            
        } else {
            // Agar yeh single video hai
            
            // 🔥 CRITICAL BUG FIX: Single video load karne se pehle currentPlaylist ko HATA DO!
            // Is se PiP window ko playlist nahi milegi, aur woh sirf single video URL play karega.
            currentPlaylist = [];
            
            // Single video file ko seedha naye window mein load karo
            console.log(`📁 Media file detected. Loading in new window: ${videoUrl}`);
            loadVideoInNewWindow(videoUrl); 
            showNotification(`Starting: ${path.basename(filePath)} in new window`);
            
            // Agar playlist panel khula ho to band kar dein
            if (playlistPanel) playlistPanel.classList.remove('visible');
        }
        
        // ✅ Cleanup: Main player ko pause/reset kar dein chahe koi bhi file select ho
        if (window.player) {
            window.player.reset(); 
            console.log("🔇 [PIP-RENDERER] Main player paused/reset.");
        }
        
    } else {
        console.log("📁 File selection cancelled");
    }
});
}


// --------------------------------------------------------------------------
// 9. IPC Handlers for Context Menu Commands
// --------------------------------------------------------------------------

ipcRenderer.on('new-tab-request', (event, url) => {
    console.log(`📑 New tab request via IPC - URL: ${url}`);
    createNewTab(url);
    showNotification(`Link opened in new tab: ${url}`);
});

ipcRenderer.on('nav-action', (event, action) => {
    console.log(`🌐 Navigation action via IPC: ${action}`);
    
    const currentWebview = getActiveWebview(); 
    if (!currentWebview) {
        console.error("❌ No active webview for navigation action");
        return;
    }

    if (action === 'back' && currentWebview.canGoBack()) {
        console.log("🌐 Going back");
        currentWebview.goBack();
    } else if (action === 'forward' && currentWebview.canGoForward()) {
        console.log("🌐 Going forward");
        currentWebview.goForward();
    } else {
        console.log(`❌ Navigation action not possible: ${action}`);
    }
});

ipcRenderer.on('view-source-request', () => {
    console.log("🔧 View source requested via IPC");
    
    const currentWebview = getActiveWebview();
    if (currentWebview) {
        console.log("🔧 Opening DevTools");
        currentWebview.openDevTools();
    } else {
        console.error("❌ No active webview for view source");
    }
});

// --------------------------------------------------------------------------
// 10. Event Listeners and UI - COMPLETELY FIXED
// --------------------------------------------------------------------------

console.log("🔗 Setting up event listeners...");

// Navigation Buttons
if (goButton) {
    goButton.addEventListener('click', () => {
        console.log("🌐 Go button clicked");
        navigate();
    });
}

if (addressBar) {
    addressBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { 
            console.log("🌐 Enter pressed in address bar");
            navigate(); 
        }
    });
}

if (backButton) {
    backButton.addEventListener('click', () => { 
        console.log("🌐 Back button clicked");
        const currentWebview = getActiveWebview();
        if (currentWebview && currentWebview.canGoBack()) { 
            currentWebview.goBack(); 
        } else {
            console.log("❌ Cannot go back");
        }
    });
}

if (forwardButton) {
    forwardButton.addEventListener('click', () => { 
        console.log("🌐 Forward button clicked");
        const currentWebview = getActiveWebview();
        if (currentWebview && currentWebview.canGoForward()) { 
            currentWebview.goForward(); 
        } else {
            console.log("❌ Cannot go forward");
        }
    });
}

// 🔥 NEW: Download Media Button Listener
if (downloadMediaBtn) {
    downloadMediaBtn.addEventListener('click', async () => {
        const currentUrl = addressBar.value.trim();
        const webview = getActiveWebview();
        if (!webview) return showNotification('No tab open!');
        showNotification('Detecting video/audio... Wait 5-10 sec');
        try {
            // Ultimate Detection Script – Sab kuch pakadega
            const result = await webview.executeJavaScript(`
                (() => {
                    const title = document.title;
                   
                    if (location.hostname.includes('youtube.com') || location.hostname.includes('youtu.be')) {
                        return { url: location.href, type: 'youtube', title: title };
                    }
                    const media = document.querySelector('video, audio');
                    if (media) {
                        if (media.currentSrc && media.currentSrc.startsWith('http') && !media.currentSrc.includes('blob:')) {
                            return { url: media.currentSrc, type: media.tagName.toLowerCase(), title: title };
                        }
                        if (media.src && media.src.startsWith('http') && !media.src.includes('blob:')) {
                            return { url: media.src, type: media.tagName.toLowerCase(), title: title };
                        }
                    }
                    const sources = document.querySelectorAll('source, video[src], audio[src]');
                    for (let s of sources) {
                        if (s.src && (s.src.includes('.m3u8') || s.src.includes('.mp4') || s.src.includes('.webm') || s.src.includes('.mp3') || s.src.includes('.m4a'))) {
                            return { url: s.src, type: 'hls_or_direct', title: title };
                        }
                    }
                    const entries = performance.getEntriesByType('resource');
                    const candidates = entries
                        .filter(e => e.name.includes('.m3u8') || e.name.includes('.mp4') || e.name.includes('.ts') || e.name.includes('.m4a') || e.name.includes('.mp3') || e.name.includes('fragment') || e.name.includes('videoplayback') || e.name.includes('audio'))
                        .map(e => ({ url: e.name, size: e.transferSize || 0 }))
                        .filter(i => i.url.startsWith('http'))
                        .sort((a, b) => b.size - a.size || b.url.length - a.url.length);
                    if (candidates.length > 0) {
                        return { url: candidates[0].url, type: 'hls_or_direct', title: title };
                    }
                    return { url: location.href, type: 'page_fallback', title: title };
                })();
            `);

            if (!result || !result.url) {
                showNotification('No media found');
                return;
            }

            const { url, type, title } = result;
            console.log('Detected media:', url, 'Type:', type, 'Title:', title);

            // Agar YouTube hai → Modal dikhao (Video ya Audio choose karne ke liye)
            if (type === 'youtube' || type === 'page_fallback') {
                if (downloadModal && modalTitleDisplay) {
                    modalTitleDisplay.textContent = title || 'YouTube Media';
                    // Global variables mein store kar do taake modal buttons use kar sake
                    window.tempDownloadUrl = url;
                    window.tempDownloadTitle = title || 'YouTube Video';
                    downloadModal.style.display = 'flex';
                    console.log("[DOWNLOAD] YouTube detected → Modal shown");
                } else {
                    // Agar modal nahi mila to fallback: sirf video download
                    showNotification('Modal nahi mila, Video download shuru kar raha hoon...');
                    const res = await ipcRenderer.invoke('download-youtube-video', { url, title });
                    showNotification(res.success ? 'Video Download Started!' : 'Failed: ' + (res.message || ''));
                }
                return;
            }

            // Baaki sab (non-YouTube) → purana working logic bilkul same
            const ext = type === 'video' ? '.mp4' : '.mp3';
            let fileName = title
                ? title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim().substring(0, 150) + ext
                : 'Media_' + Date.now() + ext;

            try {
                const urlFileName = decodeURIComponent(url.split('/').pop().split('?')[0]);
                if (urlFileName && urlFileName.length > 0 && !urlFileName.includes('.')) {
                    fileName = urlFileName.split('?')[0];
                }
            } catch(e) {}

            showNotification(`Direct download: ${fileName}`);
            const res = await ipcRenderer.invoke('download-other-media', { url, fileName });
            showNotification(res.success ? 'Download shuru!' : 'Failed');
        } catch (err) {
            console.error(err);
            showNotification('Error ho gaya. Video play karke 10 sec wait karo');
        }
    });
}

// Playlist/AdBlocker listeners
if (hidePlaylistBtn) {
    hidePlaylistBtn.addEventListener('click', () => {
        if (!playlistPanel) return;
        const isVisible = playlistPanel.classList.contains('visible');
        console.log(`📺 Hide playlist button clicked - Currently visible: ${isVisible}`);
        
        playlistPanel.classList.toggle('visible');
        showNotification(playlistPanel.classList.contains('visible') ? 'Playlist Visible' : 'Playlist Hidden');
    });
}

if (adblockToggleBtn) {
    adblockToggleBtn.addEventListener('click', () => {
        const newState = adblockToggleBtn.textContent.includes('ON') ? false : true;
        console.log(`🛡️ AdBlock toggle clicked - New state: ${newState}`);
        
        ipcRenderer.send('set-adblock-state', newState);
        isAdBlockerEnabled = newState; 
        updateToggleButton(newState);
        const statusMsg = newState ? 'ON' : 'OFF';
        showNotification(`✅ Ad Blocker ab ${statusMsg} ho chuka hai. Reload zaroori hai.`);
        
        // Inject or remove CSS for all open tabs immediately
        tabs.forEach(t => { 
            try { 
                if(newState && adblockCSS) {
                     console.log(`🛡️ Injecting AdBlock CSS into tab ${t.id}`);
                     t.webview.insertCSS(adblockCSS); 
                } else if (!newState && adblockCSS) {
                     console.log(`🛡️ AdBlock disabled for tab ${t.id}`);
                }
            } catch (e) {
                console.error(`❌ AdBlock CSS operation failed for tab ${t.id}:`, e);
            } 
        });
    });
}

if (togglePlaylistBtn) {
    togglePlaylistBtn.addEventListener('click', () => {
        console.log("📺 Toggle playlist button clicked");
        
        // 🔥 CRITICAL CHANGE: Media player display check hata diya
        // (Yeh code pehle ghalat output de raha tha kyunki player hamesha hidden rahega)
        
        // NOTE: Agar 'currentPlaylist' kahin globally define nahi hai to error dega.
        // Yeh check rakha gaya hai taake bina list ke panel na khule.
        if (typeof currentPlaylist === 'undefined' || currentPlaylist.length === 0) {
            console.log("❌ Toggle playlist failed - No playlist loaded");
            showNotification("Pehle koi M3U playlist load karen!");
            return;
        }
        
        if (!playlistPanel) return;
        const isVisible = playlistPanel.classList.contains('visible');
        playlistPanel.classList.toggle('visible');
        console.log(`📺 Playlist visibility toggled - Now visible: ${!isVisible}`);
        showNotification(playlistPanel.classList.contains('visible') ? "Channels List Khul Gayi" : "Channels List Band Ho Gayi");
    });
}

// NEW Tab Button Listener
if (newTabBtn) {
    newTabBtn.addEventListener('click', () => {
        console.log("📑 New tab button clicked");
        createNewTab();
    });
}

// Download Toggle Button Listener
if (downloadToggleBtn) {
    downloadToggleBtn.addEventListener('click', () => {
        console.log("📥 Download toggle button clicked");
        
        if (!downloadPopup) {
            console.error("❌ Download popup element not found");
            return;
        }
        
        const isVisible = downloadPopup.style.display === 'block';
        downloadPopup.style.display = isVisible ? 'none' : 'block';
        console.log(`📥 Download popup visibility: ${!isVisible}`);
        
        if (!isVisible) {
            showNotification('Download Manager Khul Gaya');
        }
    });
}

// Download Action Buttons Listener (Pause/Resume/Cancel/Open File)
if (downloadListEl) {
    downloadListEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('.action-btn');
        if (!btn || btn.disabled) {
            console.log("📥 Download action click ignored - No button or disabled");
            return;
        }

        const id = btn.getAttribute('data-id');
        const path = btn.getAttribute('data-path');

        console.log(`📥 Download action clicked - Button: ${btn.className}, ID: ${id}`);

        if (btn.classList.contains('pause-btn')) {
            console.log(`📥 Pausing download - ID: ${id}`);
            await ipcRenderer.invoke('download-pause', id);
        } else if (btn.classList.contains('resume-btn')) {
            console.log(`📥 Resuming download - ID: ${id}`);
            await ipcRenderer.invoke('download-resume', id);
        } else if (btn.classList.contains('cancel-btn')) {
            console.log(`📥 Cancelling download - ID: ${id}`);
            await ipcRenderer.invoke('download-cancel', id);
        } else if (btn.classList.contains('open-file-btn')) {
            console.log(`📥 Opening downloaded file - Path: ${path}`);
            ipcRenderer.send('open-download-file', path);
        }
    });
}

console.log("✅ All event listeners set up");


if (downloadModal) {
    closeModalBtn.addEventListener('click', () => {
        console.log("[DOWNLOAD-MODAL] Close button clicked");
        downloadModal.style.display = 'none';
    });

    downloadVideoBtn.addEventListener('click', async () => {
        // ✅ Theek kiya gaya! Ab sirf temp variables use ho rahe hain.
        const url = window.tempDownloadUrl; 
        const title = window.tempDownloadTitle || 'YouTube Video'; 

        console.log("[DOWNLOAD-MODAL] Video download selected for URL:", url, "Title:", title);
        downloadModal.style.display = 'none';

        if (!url) { 
            showNotification('No URL found for video download!'); 
            return; 
        }
        
        try {
            // FIX: Object { url, title } bhej diya
            const res = await ipcRenderer.invoke('download-youtube-video', { url, title }); 
            
            if (res.success) {
                console.log("[DOWNLOAD-MODAL] Video download invoke success - ID:", res.id);
                showNotification('YouTube Video Download Started!');
            } else {
                console.error("[DOWNLOAD-MODAL] Video download invoke failed:", res.message);
                showNotification('Video Download Failed: ' + (res.message || 'Unknown error'));
            }
        } catch (err) {
            console.error("[DOWNLOAD-MODAL] IPC error for video download:", err);
            showNotification('Video Download Error: ' + err.message);
        }
    });

    downloadAudioBtn.addEventListener('click', async () => {
        console.log("[DOWNLOAD-MODAL] Audio download selected");
        downloadModal.style.display = 'none';

        // ✅ Yeh hissa pehle se hi theek tha, temp variables use kar raha tha.
        const url = window.tempDownloadUrl || currentMediaUrl;
        const title = window.tempDownloadTitle || currentMediaTitle || 'YouTube Audio';

        if (!url) {
            showNotification('No URL found for audio download!');
            return;
        }

        try {
            const res = await ipcRenderer.invoke('download-youtube-audio', { url, title });
            if (res.success) {
                showNotification('YouTube Audio (MP3) Download Started!');
            } else {
                showNotification('Audio Download Failed: ' + (res.message || 'Try again'));
            }
        } catch (err) {
            console.error("Audio download IPC error:", err);
            showNotification('Audio Download Error!');
        }
    });

// Listener for History button
if (historyBtn) {
    historyBtn.addEventListener('click', () => {
        if (historyModal) {
            historyModal.style.display = 'flex';
            renderHistory();
        }
    });
}

// Listener for Bookmarks button
if (bookmarksBtn) {
    bookmarksBtn.addEventListener('click', () => {
        if (historyModal) {
            historyModal.style.display = 'flex';
            // Agar aap history aur bookmarks alag tabs mein dikhate, to yahan switch karte.
            // Filhal, dono lists ek hi modal mein dikhayi ja rahi hain.
            renderBookmarks();
        }
    });
}

// Listener to close the modal
if (closeModalHistoryBtn) {
    closeModalHistoryBtn.addEventListener('click', () => {
        if (historyModal) {
            historyModal.style.display = 'none';
        }
    });
}

// Listener for clearing data
if (clearDataBtn) {
    clearDataBtn.addEventListener('click', async () => {
        if (confirm('Kya aap waqai History, Cache aur Temporary Files saaf karna chahte hain?')) {
            const result = await ipcRenderer.invoke('clear-history-and-cache');
            if (result.success) {
                showNotification(result.message);
                renderHistory(); // List refresh karein
            } else {
                showNotification(`Cleanup mein masla: ${result.message}`);
            }
        }
    });
}

// Listener for the new Bookmark Toggle button in the address bar
if (bookmarkToggleInAddressBar) {
    bookmarkToggleInAddressBar.addEventListener('click', async () => {
        if (!currentActiveUrl || currentActiveUrl.startsWith('file://')) {
            showNotification('Pehle koi valid web page load karein.', 'warning');
            return;
        }
        
        const bookmarks = await ipcRenderer.invoke('get-bookmarks');
        const isBookmarked = bookmarks.some(b => b.url === currentActiveUrl);
        
        if (isBookmarked) {
            await ipcRenderer.invoke('remove-bookmark', currentActiveUrl);
            showNotification(`Bookmark removed: ${currentActiveTitle}`);
        } else {
            const result = await ipcRenderer.invoke('add-bookmark', { 
                url: currentActiveUrl, 
                title: currentActiveTitle 
            });
            if (result.success) {
                 showNotification(`Bookmark added: ${currentActiveTitle}`);
            } else {
                 showNotification(`Bookmark error: ${result.message}`);
            }
        }
        updateBookmarkToggle(currentActiveUrl); // State update karein
    });
}
}
// --------------------------------------------------------------------------
// 11. Video Player Keyboard Shortcuts
// --------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
    if (addressBar && document.activeElement === addressBar) {
        console.log(`⌨️ Key pressed but address bar focused: ${e.key}`);
        return;
    }
    
    const isMediaPlayerActive = mediaPlayerContainer && mediaPlayerContainer.style.display === 'flex';
    console.log(`⌨️ Key pressed: ${e.key}, Ctrl: ${e.ctrlKey}, Media active: ${isMediaPlayerActive}`);

    // Tab management shortcuts
    if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        console.log(`⌨️ Ctrl+Tab pressed, Total tabs: ${tabs.length}`);
        if (tabs.length > 1) {
            const currentIndex = tabs.findIndex(t => t.id === activeTabId);
            let nextIndex;
            if (e.shiftKey) { 
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                console.log(`⌨️ Ctrl+Shift+Tab - Previous tab, Index: ${nextIndex}`);
            } else { 
                nextIndex = (currentIndex + 1) % tabs.length;
                console.log(`⌨️ Ctrl+Tab - Next tab, Index: ${nextIndex}`);
            }
            activateTab(tabs[nextIndex].id);
        }
        return;
    }
    
    if (e.ctrlKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        console.log(`⌨️ Ctrl+W pressed, Active tab: ${activeTabId}`);
        if (activeTabId) {
            closeTab(activeTabId);
        }
        return;
    }

    if (e.ctrlKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        console.log(`⌨️ Ctrl+T pressed, Creating new tab`);
        createNewTab();
        return;
    }
    
    if (!isMediaPlayerActive || !videojsPlayer) {
        console.log(`⌨️ Key ignored - Media not active or no player`);
        return;
    }

    const key = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) { 
        e.preventDefault(); 
        console.log(`⌨️ Media key prevented default: ${key}`);
    }

    if (key === 'ArrowRight') {
        videojsPlayer.currentTime(videojsPlayer.currentTime() + 5); 
        console.log(`⌨️ Forward 5s - New time: ${videojsPlayer.currentTime()}`);
        showNotification("Forward 5s");
    } else if (key === 'ArrowLeft') {
        videojsPlayer.currentTime(videojsPlayer.currentTime() - 5); 
        console.log(`⌨️ Backward 5s - New time: ${videojsPlayer.currentTime()}`);
        showNotification("Backward 5s");
    } else if (key === 'ArrowUp') {
        if (gainNode) {
            if (audioContext && audioContext.state === 'suspended') {
                console.log("🔊 Audio context suspended, resuming...");
                audioContext.resume();
            }
            const newGain = Math.min(2.0, gainNode.gain.value + 0.1);
            gainNode.gain.value = newGain;
            videojsPlayer.volume(Math.min(1.0, newGain));
            console.log(`🔊 Volume increased - Gain: ${newGain}, Volume: ${videojsPlayer.volume()}`);
            showNotification(`Volume: ${Math.round(newGain * 100)}% ${newGain > 1 ? '(Boosted)' : ''}`);
        } else {
            const currentVolume = videojsPlayer.volume();
            videojsPlayer.volume(Math.min(1.0, currentVolume + 0.1));
            console.log(`🔊 Volume increased - New volume: ${videojsPlayer.volume()}`);
            showNotification(`Volume: ${Math.round(videojsPlayer.volume() * 100)}%`);
        }
    } else if (key === 'ArrowDown') {
        if (gainNode) {
            if (audioContext && audioContext.state === 'suspended') {
                console.log("🔊 Audio context suspended, resuming...");
                audioContext.resume();
            }
            const newGain = Math.max(0, gainNode.gain.value - 0.1);
            gainNode.gain.value = newGain;
            videojsPlayer.volume(Math.min(1.0, newGain));
            console.log(`🔊 Volume decreased - Gain: ${newGain}, Volume: ${videojsPlayer.volume()}`);
            showNotification(`Volume: ${Math.round(newGain * 100)}%`);
        } else {
            const currentVolume = videojsPlayer.volume();
            videojsPlayer.volume(Math.max(0, currentVolume - 0.1));
            console.log(`🔊 Volume decreased - New volume: ${videojsPlayer.volume()}`);
            showNotification(`Volume: ${Math.round(currentVolume * 100)}%`);
        }
    } else if (key === 'm' || key === 'M') {
        if (videojsPlayer) {
            const isMutedNow = !videojsPlayer.muted();
            videojsPlayer.muted(isMutedNow);
            console.log(`🔊 Mute toggled - Now muted: ${isMutedNow}`);
            showNotification(isMutedNow ? "Muted 🔇" : "Unmuted 🔊");
        }
    } else if (key === ' ') {
        if (videojsPlayer.paused()) {
            console.log("⏯️ Space - Play");
            if (audioContext && audioContext.state === 'suspended') { 
                console.log("🔊 Audio context suspended, resuming before play...");
                audioContext.resume().then(() => videojsPlayer.play()); 
            } else { 
                videojsPlayer.play(); 
            }
            showNotification("Play");
        } else {
            console.log("⏯️ Space - Pause");
            videojsPlayer.pause(); 
            showNotification("Pause");
        }
    } else if (key === 'n' || key === 'N') {
        if (currentPlaylist.length > 0) {
            const nextIndex = (currentChannelIndex + 1) % currentPlaylist.length; 
            console.log(`📺 Next channel - Current: ${currentChannelIndex}, Next: ${nextIndex}`);
            loadAndPlayChannel(nextIndex);
        } else { 
            console.log("❌ Next channel failed - No playlist");
            showNotification("Playlist load nahi hai. N/P kaam nahi karega."); 
        }
    } else if (key === 'p' || key === 'P') {
        if (currentPlaylist.length > 0) {
            const prevIndex = (currentChannelIndex - 1 + currentPlaylist.length) % currentPlaylist.length; 
            console.log(`📺 Previous channel - Current: ${currentChannelIndex}, Previous: ${prevIndex}`);
            loadAndPlayChannel(prevIndex);
        } else { 
            console.log("❌ Previous channel failed - No playlist");
            showNotification("Playlist load nahi hai. N/P kaam nahi karega."); 
        }
    }
});

// --------------------------------------------------------------------------
// 12. AdBlock: Client-Side CSS Injection & Pop-up Blocking
// --------------------------------------------------------------------------

// Main process se CSS filters load karein
async function loadCSSFilters() {
    console.log("🛡️ Loading CSS filters from main process...");
    
    try {
        const cssString = await ipcRenderer.invoke('get-adblock-css');
        if (cssString) {
            adblockCSS = cssString;
            console.log("✅ AdBlock CSS filters loaded for injection.");
        } else {
            console.warn("⚠️ No CSS filters received from main process");
        }
    } catch(e) {
        console.error("❌ Failed to load AdBlock CSS (IPC error):", e);
    }
}

// --------------------------------------------------------------------------
// 13. Initial App Setup
// --------------------------------------------------------------------------

console.log("🚀 Starting initial app setup...");

if (adblockToggleBtn) {
    adblockToggleBtn.textContent = 'AdBlock Loading...';
}

window.addEventListener('DOMContentLoaded', () => {
    console.log("✅ DOM Content Loaded");
// Har webview par focus wapas lane ka magic
    document.addEventListener('keydown', (e) => {
        if (document.activeElement === addressBar || document.activeElement.tagName === 'INPUT') {
        return;
    }

    // Har key press par active webview ko force focus do
    const activeWebview = document.querySelector('webview.active') || document.querySelector('webview');
    
    if (activeWebview) {
        // Yeh trick Electron mein 101% kaam karti hai
        activeWebview.executeJavaScript(`
            // Webview ke andar focus wapas laao chahe wo crash hi kyun na ho
            if (document.body) {
                document.body.focus();
            }
            window.focus();
        `).catch(() => {}); // error ignore karo kyunki crash hone par aayega

        // Extra: Direct focus bhi try karo
        try {
            activeWebview.focus();
        } catch (err) {}
    }
}, true); // ← Yeh "true" bohot zaroori hai (capture phase mein event pakadta hai)

// Bonus: Jab bhi tab switch ho ya naya tab bane → focus do
const originalActivateTab = window.activateTab || (() => {});
window.activateTab = function(tabId) {
    originalActivateTab(tabId);
    setTimeout(() => {
        const wv = document.querySelector(`webview[data-tab-id="${tabId}"]`) || document.querySelector('webview');
        if (wv) {
            wv.focus();
            wv.executeJavaScript(`window.focus(); document.body?.focus();`).catch(() => {});
        }
    }, 150);
};

// Agar createNewTab function hai toh usme bhi yeh add kar do
const originalCreateNewTab = window.createNewTab || (() => {});
window.createNewTab = function() {
    originalCreateNewTab();
    setTimeout(() => {
        const wv = document.querySelector('webview:last-child') || document.querySelector('webview');
        if (wv) {
            wv.focus();
        }
    }, 200);
};


const historyHeader = document.querySelector('#history-bookmarks-modal h3:nth-of-type(1)'); // "History (Recent)"
    const bookmarksHeader = document.querySelector('#history-bookmarks-modal h3:nth-of-type(2)'); // "Bookmarks"

    const historyList = document.getElementById('history-list');
    const bookmarksList = document.getElementById('bookmarks-list');

    // Pehli baar modal khulte hi dono dikhao (taake toggle sahi se kaam kare)
    if (historyList) historyList.style.display = 'block';
    if (bookmarksList) bookmarksList.style.display = 'block';

    // HISTORY HEADER par click → toggle
    if (historyHeader) {
        historyHeader.style.cursor = 'pointer';
        historyHeader.style.userSelect = 'none';
        historyHeader.title = 'Click to show/hide History';

        historyHeader.addEventListener('click', () => {
            if (historyList.style.display === 'none') {
                historyList.style.display = 'block';
                renderHistory(); // fresh data load karega
            } else {
                historyList.style.display = 'none';
            }
        });
    }

    // BOOKMARKS HEADER par click → toggle
    if (bookmarksHeader) {
        bookmarksHeader.style.cursor = 'pointer';
        bookmarksHeader.style.userSelect = 'none';
        bookmarksHeader.title = 'Click to show/hide Bookmarks';

        bookmarksHeader.addEventListener('click', () => {
            if (bookmarksList.style.display === 'none') {
                bookmarksList.style.display = 'block';
                renderBookmarks();
            } else {
                bookmarksList.style.display = 'none';
            }
        });
    }

    // BONUS: Modal khulte hi dono dikhao (agar koi band ho gaya ho)
    const openModal = () => {
        if (historyModal.style.display === 'flex' || historyModal.style.display === 'block') {
            historyList.style.display = 'block';
            bookmarksList.style.display = 'block';
            renderHistory();
            renderBookmarks();
        }
    };

    // History aur Bookmarks button par click hone par modal khud call karo
    if (historyBtn) historyBtn.addEventListener('click', openModal);
    if (bookmarksBtn) bookmarksBtn.addEventListener('click', openModal);


    ipcRenderer.invoke('get-adblock-state').then(isEnabled => {
        isAdBlockerEnabled = !!isEnabled;
        console.log(`🛡️ Initial AdBlock state: ${isAdBlockerEnabled}`);
        updateToggleButton(isAdBlockerEnabled);
    }).catch(err => {
        console.error("❌ AdBlock state fetch error:", err);
        if (adblockToggleBtn) {
            adblockToggleBtn.textContent = 'Error!';
        }
    });

    // Load CSS filters from main 
    loadCSSFilters().catch((e) => { 
        console.error("❌ CSS filters load failed:", e);
    });

    // Initial Download UI setup
    updateDownloadCountUI();

    // Pehla tab shuru karo
    console.log("📑 Creating initial tab...");
    createNewTab(); 
    
    console.log("✅ App initialization completed");
});



console.log("🎉 Renderer process initialization script completed");

/** TV/Video ko hamesha naye floating window mein load karta hai */
function loadVideoInNewWindow(videoUrl) {
    console.log("➡️ [PIP-RENDERER] Attempting to open new window for URL:", videoUrl);
    
    if (!videoUrl) {
        showNotification('❌ Video/TV Source nahi mila.', 'error');
        console.error("❌ [PIP-RENDERER] Video URL is empty.");
        return;
    }

    // 🔥 CRITICAL FIX: URL aur playlist dono data object mein daal kar bhej rahe hain
    const dataToSend = {
        url: videoUrl,
        // currentPlaylist woh global variable hai jismein M3U8 ke saare channels hain.
        // Agar currentPlaylist mojood hai aur usmein channels hain, to bhej do.
        playlist: (typeof currentPlaylist !== 'undefined' && currentPlaylist && currentPlaylist.length > 0) ? currentPlaylist : null 
    };

    // ipcRenderer.invoke() call ka result check karein
    ipcRenderer.invoke('open-pip-window', dataToSend) // <--- Ab dataToSend object bhej rahe hain
        .then(response => {
            if (response && response.success) {
                showNotification('✅ TV/Video nayi window mein shuru ho gaya hai.', 'success');
                console.log("✅ [PIP-RENDERER] IPC call successful. Main process is handling it.");
            } else {
                showNotification('❌ TV/Video window nahi khul saki (Main Process Error).', 'error');
                console.error("❌ [PIP-RENDERER] Main process returned failure:", response);
            }
        })
        .catch(err => {
            // Yeh error tab aata hai jab ipcMain.handle define na ho ya koi bada JS crash ho
            console.error('❌ [PIP-RENDERER] IPC Invoke FAILED (CRITICAL):', err);
            showNotification(`❌ CRITICAL: Video window nahi khul saki. IPC Error: ${err.message}`, 'error');
            
            // Temporary fix: Agar naya window nahi khula, to purane main player mein awaaz band kar dein
            if (window.player) {
                window.player.pause(); 
                console.log("🔇 [PIP-RENDERER] Background player paused due to IPC failure.");
            }
        });
}


ipcRenderer.on('download-removed', (event, data) => {
    const downloadItem = document.getElementById(`download-item-${data.id}`);
    if (downloadItem) {
        downloadItem.remove();
        showNotification('🗑️ Download list se hata diya gaya.', 'info');
        console.log(`[RENDERER] Download item ${data.id} removed from UI.`);
        
        // ✅ FIX 1: Count aur Badge ko update karein
        updateDownloadBadge(); 
    }
});

// --------------------------------------------------------------------------
// 🛡️ 1. ULTIMATE CSS AD/POPUP HIDE FUNCTION
// --------------------------------------------------------------------------
function applyAggressiveCSSBlock(webview) {
    const aggressiveCSS = `
        /* Pop-up Ads, Full-Screen Overlays, Aur Ziddi Modal Backgrounds */
        .modal-backdrop, 
        .ad-container, 
        .popup-window,
        #ad-overlay,
        #pop-up-ad,
        .close-button,
        
        /* Common Login/Subscription Overlays and Modals */
        [id*="login-modal"],
        [id*="subscribe-prompt"],
        [class*="paywall"],
        [class*="login-overlay"],
        [class*="modal-dialog"],
        
        /* 🔥 NEW: Universal blocking layer selectors */
        [class*="backdrop"], /* naye backdrop classes */
        [id*="overlay"],   /* naye overlay ids */
        
        /* High z-index fixed elements jo screen cover karein */
        [style*="position: fixed"][style*="z-index: 99999"], 
        [style*="position: fixed"][style*="z-index: 999999"], /* Ultra high z-index */
        [style*="position: fixed"][style*="width: 100vw"], 
        
        iframe[id*="ad"], iframe[class*="ad"] 
        {
            display: none !important;
            visibility: hidden !important; 
            /* 🔥 ULTIMATE FIX: Clicks ko is layer ke paar jane ki ijazat do */
            pointer-events: none !important; 
        }
    `;

    webview.insertCSS(aggressiveCSS)
        .then(() => console.log('🛡️ Aggressive CSS injected successfully.'))
        .catch(err => console.error('Error injecting aggressive CSS:', err));
}


function switchModalTab(tabName) {
    // 🔥 NOTE: Yeh elements pehle hi DOMContentLoaded mein select hone chahiye
    const historyListTabBtn = document.getElementById('history-tab-btn');
    const bookmarksListTabBtn = document.getElementById('bookmarks-tab-btn');
    const historyListContainer = document.getElementById('history-list-container');
    const bookmarksListContainer = document.getElementById('bookmarks-list-container');
    
    if (!historyListContainer || !bookmarksListContainer) {
        console.error("❌ Modal containers not found.");
        return;
    }
    
    if (tabName === 'history') {
        historyListTabBtn?.classList.add('active');
        bookmarksListTabBtn?.classList.remove('active');
        
        // History tab active
        historyListContainer.style.display = 'block'; 
        bookmarksListContainer.style.display = 'none'; // Bookmarks ko hide karo
        renderHistory(); 
        
    } else if (tabName === 'bookmarks') {
        bookmarksListTabBtn?.classList.add('active');
        historyListTabBtn?.classList.remove('active');
        
        // 🔥 FIX: Bookmark tab active
        bookmarksListContainer.style.display = 'block'; 
        historyListContainer.style.display = 'none'; // <--- Yahan History ko hide karna hai!
        renderBookmarks(); 
    }
}


// REFRESH BUTTON — SIRF CURRENT TAB RELOAD KAREGA
const refreshBtn = document.getElementById('refresh-btn');

if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        const currentWebview = document.querySelector('webview.active') || document.querySelector('webview');
        if (currentWebview) {
            console.log("Reloading current tab only...");
            currentWebview.reload();
        } else {
            showNotification("Koi tab open nahi hai!");
        }
    });
}

// FIX: Refresh ke baad bhi YouTube ad skip ho
document.addEventListener('DOMContentLoaded', () => {
    const reInjectAdSkipOnRefresh = () => {
        const activeWebview = document.querySelector('webview.active') || document.querySelector('webview');
        if (activeWebview && activeWebview.getURL().includes('youtube.com/watch')) {
            // Purana flag hata do taake dobara inject ho jaye
            delete activeWebview.dataset.adBlock2025;
            // Wahi purana ad killer code chala do
            blockYouTubeAds(); // ← tumhara wahi function jo pehle kaam kar raha tha
        }
    };

    // Har tab refresh hone par yeh chalega
    document.querySelectorAll('webview').forEach(wv => {
        wv.addEventListener('did-finish-load', () => {
            if (wv.getURL().includes('youtube.com/watch')) {
                setTimeout(reInjectAdSkipOnRefresh, 1000);
            }
        });
    });

    // Naye tabs ke liye bhi
    new MutationObserver(() => {
        document.querySelectorAll('webview').forEach(wv => {
            if (wv.getURL().includes('youtube.com/watch') && !wv.dataset.refreshListener) {
                wv.dataset.refreshListener = 'yes';
                wv.addEventListener('did-finish-load', () => {
                    setTimeout(reInjectAdSkipOnRefresh, 1000);
                });
            }
        });
    }).observe(document.body, { childList: true, subtree: true });
});


// ───────────────── YOUTUBE AD BLOCKER + COUNTER + NOTIFICATION (2025 PRO VERSION) ─────────────────
document.addEventListener('DOMContentLoaded', () => {
    const blockYouTubeAds = () => {
        document.querySelectorAll('webview').forEach(wv => {
            const url = wv.getURL();
            if (url && url.includes('youtube.com') && !wv.dataset.adBlock2025) {
                wv.dataset.adBlock2025 = 'true';

                wv.executeJavaScript(`
                    setInterval(() => {
                        // Hide ad containers
                        const ads = document.querySelectorAll('.ytp-ad-module, .ytp-ad-overlay-container, ytd-display-ad-renderer, .video-ads');
                        ads.forEach(ad => ad.remove());

                        // Skip button click
                        const skip = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
                        if (skip) skip.click();

                        // Speed up if ad is playing
                        const video = document.querySelector('video');
                        const adShowing = document.querySelector('.ad-showing');
                        if (adShowing && video) {
                            video.playbackRate = 16;
                            video.muted = true;
                        } else if (video && video.playbackRate === 16) {
                            video.playbackRate = 1;
                            video.muted = false;
                        }
                    }, 500);
                `);
            }
        });
    };

    blockYouTubeAds();
    setInterval(blockYouTubeAds, 2000);
});