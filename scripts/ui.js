// scripts/ui.js

// --- Theme Functionality ---
let isDarkMode = localStorage.getItem('darkMode') === 'true';

function updateThemeButtonIcon() {
    const themeToggleDesktop = document.getElementById('theme-toggle-desktop');
    const themeToggleMobile = document.getElementById('theme-toggle-mobile');
    const icon = isDarkMode ? 'brightness_high' : 'brightness_4';

    if (themeToggleDesktop) {
        themeToggleDesktop.innerHTML = `<span class="material-icons">${icon}</span>`;
    }
    if (themeToggleMobile) {
        themeToggleMobile.innerHTML = `<span class="material-icons">${icon}</span>`;
    }
}

export function applyTheme() {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    updateThemeButtonIcon();
}

export function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    applyTheme();
}


// --- Sidebar Functionality ---
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

export function showSidebar() {
    if (sidebar) sidebar.classList.add('sidebar-open');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
}

export function hideSidebar() {
    if (sidebar) sidebar.classList.remove('sidebar-open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
}


// --- Loading Indicator ---
const loadingIndicator = document.getElementById('loading-indicator');

export function showLoading() {
    if(loadingIndicator) loadingIndicator.classList.add('block');
}

export function hideLoading() {
    if(loadingIndicator) loadingIndicator.classList.remove('block');
}


// --- Tab/Section Switching ---
export function switchTab(sectionId, onSwitchCallback) {
    document.querySelectorAll('.main-tabs .tab-btn').forEach(b => b.classList.remove('active'));

    // Activate buttons in both desktop and mobile tabs
    const desktopBtn = document.querySelector(`.desktop-tabs .tab-btn[data-section="${sectionId}"]`);
    const mobileBtn = document.querySelector(`.mobile-tabs .tab-btn[data-section="${sectionId}"]`);
    if (desktopBtn) desktopBtn.classList.add('active');
    if (mobileBtn) mobileBtn.classList.add('active');

    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

    const targetSection = document.getElementById(sectionId + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }

    document.body.classList.remove('read-active', 'tafsir-active', 'games-active', 'general-games-active');
    document.body.classList.add(`${sectionId}-active`);

    updateSidebarControls(sectionId);

    if (typeof onSwitchCallback === 'function') {
        onSwitchCallback(sectionId);
    }
}

function updateSidebarControls(sectionId) {
    const surahSelectElement = document.getElementById('surah-select');
    const verseRangeSelectorElement = document.getElementById('verse-range-selector');
    const generalGamesSidebarControls = document.getElementById('general-games-sidebar-controls');
    const surahSelectTitleElement = document.getElementById('surah-select-title');

    const isGeneralGames = sectionId === 'general-games';

    if (surahSelectElement) surahSelectElement.classList.toggle('hidden', isGeneralGames);
    if (verseRangeSelectorElement) {
        verseRangeSelectorElement.classList.toggle('hidden', isGeneralGames);
        verseRangeSelectorElement.classList.toggle('grid', !isGeneralGames);
    }
    if (generalGamesSidebarControls) generalGamesSidebarControls.classList.toggle('hidden', !isGeneralGames);
    if (surahSelectTitleElement) surahSelectTitleElement.classList.toggle('hidden', isGeneralGames);
}