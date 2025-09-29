// scripts/main.js
import { initAudio, playSound, toggleMute, updateMuteButtonIcon } from './audio.js';
import { applyTheme, toggleTheme, showSidebar, hideSidebar, showLoading, hideLoading, switchTab } from './ui.js';
import { displayGames, displayGeneralGames, showGameGrid, showGeneralGameGrid, cleanupActiveGame } from './games.js';

document.addEventListener('DOMContentLoaded', () => {
    let currentSurahData = null;
    let surahIndex = [];
    const surahCache = {}; // Cache to store loaded surah data

    // DOM Elements
    const surahSelect = document.getElementById('surah-select');
    const verseStartInput = document.getElementById('verse-start');
    const verseEndInput = document.getElementById('verse-end');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // --- Data Loading ---
    async function loadAndDisplaySurah(surahId) {
        showLoading();
        try {
            // Check cache first
            if (surahCache[surahId]) {
                currentSurahData = surahCache[surahId];
                displayFullSurah(currentSurahData);
                hideLoading(); // Hide loading indicator immediately
                return;
            }

            // If not in cache, fetch from network
            const response = await fetch(`./quran_data/${surahId}.json`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const surahData = await response.json();
            if (!surahData || typeof surahData !== 'object') throw new Error('Parsed data is not a valid object.');

            // Store in cache and display
            surahCache[surahId] = surahData;
            currentSurahData = surahData;
            displayFullSurah(currentSurahData);

        } catch (error) {
            console.error(`Error loading surah ${surahId}:`, error);
            currentSurahData = null;
            const container = document.getElementById('surah-container');
            if(container) container.innerHTML = `<p style="text-align: center; color: red;">فشل تحميل بيانات السورة. يرجى المحاولة مرة أخرى.</p>`;
        } finally {
            hideLoading();
        }
    }

    // --- Display Functions ---
    function displayFullSurah(surah) {
        if (!surah) return;
        const startVerse = 1;
        const endVerse = surah.verses.length;
        verseStartInput.value = startVerse;
        verseStartInput.max = endVerse;
        verseEndInput.value = endVerse;
        verseEndInput.max = endVerse;

        displaySurah(surah, startVerse, endVerse);
        displayTafsir(surah, startVerse, endVerse);
        displayGames(surah, startVerse, endVerse);
    }

    function normalizeBasmallah(text) {
        if (!text) return "";
        return text.normalize("NFD").replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, "").replace(/ـ/g, "").replace(/ٱ/g, "ا").replace(/ٰ/g, "ا").replace(/\s+/g, "");
    }

    function displaySurah(surah, start, end) {
        const container = document.getElementById('surah-container');
        const title = document.getElementById('read-title');
        title.textContent = `سورة ${surah.name} (الآيات ${start}-${end})`;
        container.innerHTML = '';

        const versesToShow = surah.verses.filter(v => v.id >= start && v.id <= end);
        let skipFirstVerse = false;

        if (versesToShow.length > 0 && surah.id !== 9) {
            const firstVerse = versesToShow[0];
            const basmallahStandard = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
            const normalizedFirstVerse = normalizeBasmallah(firstVerse.text.trim());
            const normalizedBasmallah = normalizeBasmallah(basmallahStandard);

            if (normalizedFirstVerse === normalizedBasmallah) {
                container.innerHTML += `<div class="basmallah">${firstVerse.text.trim()}</div>`;
                skipFirstVerse = true;
            } else if (normalizedFirstVerse.startsWith(normalizedBasmallah) && surah.id !== 1) {
                let original = firstVerse.text.trim();
                let basmallahEndIndex = 0;
                let normCount = 0;
                for (let i = 0; i < original.length; i++) {
                    let char = original[i];
                    let normChar = normalizeBasmallah(char);
                    if (normChar.length > 0) {
                        normCount += normChar.length;
                        if (normCount > normalizedBasmallah.length) break;
                    }
                    basmallahEndIndex = i + 1;
                }
                container.innerHTML += `<div class="basmallah">${original.slice(0, basmallahEndIndex)}</div>`;
                let remainingText = original.slice(basmallahEndIndex).trim();
                if (remainingText) {
                    container.innerHTML += `<span class="verse-block">${remainingText} <span class="verse-number">﴿${firstVerse.id}﴾</span></span>`;
                }
                skipFirstVerse = true;
            }
        }

        for (let i = skipFirstVerse ? 1 : 0; i < versesToShow.length; i++) {
            const verse = versesToShow[i];
            container.innerHTML += `<span class="verse-block">${verse.text} <span class="verse-number">﴿${verse.id}﴾</span></span>`;
        }
    }

    function displayTafsir(surah, start, end) {
        const container = document.getElementById('tafsir-container');
        const title = document.getElementById('tafsir-title');
        title.textContent = `تفسير سورة ${surah.name} (الآيات ${start}-${end})`;
        container.innerHTML = '';
        if (!surah.tafsir || surah.tafsir.length === 0) {
            container.innerHTML = '<p>لا يتوفر تفسير لهذه السورة حاليًا.</p>';
            return;
        }
        const tafsirToShow = surah.tafsir.filter(t => {
            if (!t.verses) return false;
            const verseRange = t.verses.split('-').map(Number);
            return Math.max(start, verseRange[0]) <= Math.min(end, verseRange[1] || verseRange[0]);
        });
        if (tafsirToShow.length === 0) {
            container.innerHTML = '<p>لا يتوفر تفسير للآيات المحددة حاليًا.</p>';
            return;
        }
        tafsirToShow.forEach(item => {
            container.innerHTML += `<div class="tafsir-item"><h4>الآيات (${item.verses})</h4><p>${item.explanation}</p></div>`;
        });
    }

    function loadSurahRange() {
        if (!currentSurahData) return;
        const startVerse = parseInt(verseStartInput.value) || 1;
        const endVerse = parseInt(verseEndInput.value) || currentSurahData.verses.length;
        const activeTab = document.querySelector('.main-tabs .tab-btn.active');
        const activeSectionId = activeTab ? activeTab.getAttribute('data-section') : 'read';

        switch (activeSectionId) {
            case 'read': displaySurah(currentSurahData, startVerse, endVerse); break;
            case 'tafsir': displayTafsir(currentSurahData, startVerse, endVerse); break;
            case 'games': displayGames(currentSurahData, startVerse, endVerse); break;
        }
    }

    function loadGeneralGames() {
        const startId = parseInt(document.getElementById('general-surah-start-select').value);
        const endId = parseInt(document.getElementById('general-surah-end-select').value);
        displayGeneralGames(startId, endId, surahIndex);
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        document.body.addEventListener('click', initAudio, { once: true });

        surahSelect.addEventListener('change', async () => {
            playSound('navigate');
            cleanupActiveGame();
            await loadAndDisplaySurah(surahSelect.value);
        });
        verseStartInput.addEventListener('change', () => { playSound('click'); cleanupActiveGame(); loadSurahRange(); });
        verseEndInput.addEventListener('change', () => { playSound('click'); cleanupActiveGame(); loadSurahRange(); });

        document.getElementById('general-surah-start-select').addEventListener('change', () => { playSound('navigate'); loadGeneralGames(); });
        document.getElementById('general-surah-end-select').addEventListener('change', () => { playSound('navigate'); loadGeneralGames(); });

        document.getElementById('mute-btn-desktop').addEventListener('click', toggleMute);
        document.getElementById('mute-btn-mobile').addEventListener('click', toggleMute);
        document.getElementById('theme-toggle-desktop').addEventListener('click', toggleTheme);
        document.getElementById('theme-toggle-mobile').addEventListener('click', toggleTheme);

        if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', showSidebar);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', hideSidebar);

        window.addEventListener('resize', () => { if (window.innerWidth > 768) hideSidebar(); });

        document.querySelectorAll('.main-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                playSound('navigate');
                cleanupActiveGame();
                const sectionId = this.getAttribute('data-section');
                switchTab(sectionId, (newSectionId) => {
                    if (newSectionId === 'general-games') loadGeneralGames();
                    else if (newSectionId === 'games') showGameGrid();
                });
            });
        });

        document.getElementById('global-back-to-games-btn').addEventListener('click', () => { playSound('navigate'); showGameGrid(); });
        document.addEventListener('click', (e) => {
            if (e.target.closest('#general-game-area .back-to-games-btn')) {
                playSound('navigate');
                showGeneralGameGrid();
            }
        });
    }

    // --- Initialization ---
    async function initializeApp() {
        if (!surahSelect) return;
        try {
            const response = await fetch('./quran_data/surah_index.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            surahIndex = await response.json();

            populateSurahSelect(surahSelect);
            populateSurahSelect(document.getElementById('general-surah-start-select'));
            populateSurahSelect(document.getElementById('general-surah-end-select'));

            setupEventListeners();
            updateMuteButtonIcon();
            applyTheme();

            switchTab('read'); // Set initial tab

            if (surahSelect.options.length > 0) {
                await loadAndDisplaySurah(surahSelect.value);
            }
        } catch (error) {
            console.error("Failed to initialize app:", error);
            document.getElementById('content-area').innerHTML = `<p style="text-align: center; color: red;">فشل تحميل بيانات التطبيق. يرجى تحديث الصفحة.</p>`;
        }
    }

    function populateSurahSelect(selectElement) {
        if (!selectElement || !surahIndex || !Array.isArray(surahIndex)) return;
        selectElement.innerHTML = '';
        surahIndex.forEach((surah) => {
            const option = document.createElement('option');
            option.value = surah.id;
            option.textContent = `${surah.id}. ${surah.name}`;
            selectElement.appendChild(option);
        });
    }

    initializeApp();
});