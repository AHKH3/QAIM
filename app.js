document.addEventListener('DOMContentLoaded', () => {
    let currentSurahData = null; // To store the currently loaded surah data

    // DOM Elements
    const surahSelect = document.getElementById('surah-select');
    const verseStartInput = document.getElementById('verse-start');
    const verseEndInput = document.getElementById('verse-end');
    const body = document.body;
    const contentNavButtons = document.querySelectorAll('#content-nav .nav-btn');
    const contentSections = document.querySelectorAll('.content-section');
    const muteBtnDesktop = document.getElementById('mute-btn-desktop');
    const muteBtnMobile = document.getElementById('mute-btn-mobile');
    const loadingIndicator = document.getElementById('loading-indicator');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // Sound Functionality
    let isMuted = false;
    let audioCtx = null;

    function showLoading() {
        if(loadingIndicator) loadingIndicator.classList.add('block');
    }

    function hideLoading() {
        if(loadingIndicator) loadingIndicator.classList.remove('block');
    }

    function initAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser");
            }
        }
    }

    function playSound(type) {
        if (isMuted || !audioCtx) return;

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        let freq = 440;
        let duration = 0.1;
        let waveType = 'sine';

        switch (type) {
            case 'correct':
                freq = 600;
                duration = 0.15;
                break;
            case 'incorrect':
                freq = 200;
                waveType = 'square';
                duration = 0.2;
                break;
            case 'win':
                freq = 800;
                duration = 0.5;
                break;
            case 'spin_start':
                freq = 300;
                duration = 0.1;
                waveType = 'sawtooth';
                break;
            case 'spin_stop':
                freq = 700;
                duration = 0.2;
                break;
            case 'click':
                freq = 880;
                duration = 0.05;
                gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                break;
            case 'navigate':
                freq = 520;
                duration = 0.1;
                waveType = 'triangle';
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                break;
            case 'swoosh':
                freq = 220;
                duration = 0.15;
                waveType = 'sawtooth';
                gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
                break;
            case 'drag_start':
                freq = 1000;
                duration = 0.08;
                waveType = 'sine';
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                break;
            case 'wheel_start_spin':
                freq = 150;
                duration = 0.3;
                waveType = 'triangle';
                gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.25);
                break;
        }

        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration);
    }

    function toggleMute() {
        isMuted = !isMuted;
        updateMuteButtonIcon();
        if (!isMuted && !audioCtx) {
            initAudio();
        }
    }

    function updateMuteButtonIcon() {
        const muteBtnDesktop = document.getElementById('mute-btn-desktop');
        const muteBtnMobile = document.getElementById('mute-btn-mobile');

        if (muteBtnDesktop) {
            muteBtnDesktop.innerHTML = `<span class="material-icons">${isMuted ? 'volume_off' : 'volume_up'}</span>`;
        }
        if (muteBtnMobile) {
            muteBtnMobile.innerHTML = `<span class="material-icons">${isMuted ? 'volume_off' : 'volume_up'}</span>`;
        }
    }

    // Theme Functionality
    let isDarkMode = localStorage.getItem('darkMode') === 'true';

    function applyTheme() {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        updateThemeButtonIcon();
    }

    function toggleTheme() {
        isDarkMode = !isDarkMode;
        localStorage.setItem('darkMode', isDarkMode);
        applyTheme();
    }

    function updateThemeButtonIcon() {
        const themeToggleDesktop = document.getElementById('theme-toggle-desktop');
        const themeToggleMobile = document.getElementById('theme-toggle-mobile');

        if (themeToggleDesktop) {
            themeToggleDesktop.innerHTML = `<span class="material-icons">${isDarkMode ? 'brightness_high' : 'brightness_4'}</span>`;
        }
        if (themeToggleMobile) {
            themeToggleMobile.innerHTML = `<span class="material-icons">${isDarkMode ? 'brightness_high' : 'brightness_4'}</span>`;
        }
    }

    // --- Initialization ---
    async function initializeApp() {
        if (!surahSelect) return;
        populateSurahSelect(surahSelect);
        populateSurahSelect(document.getElementById('general-surah-start-select'));
        populateSurahSelect(document.getElementById('general-surah-end-select'));
        setupEventListeners();
        updateMuteButtonIcon();
        applyTheme(); // Apply theme on initialization

        // Set initial active tab and body class
        document.querySelector('.main-tabs .tab-btn[data-section="read"]').classList.add('active');
        document.getElementById('read-section').classList.add('active');
        document.body.classList.add('read-active');

        // Show default sidebar controls for 'read' section
        document.getElementById('surah-select').classList.remove('hidden');
        document.getElementById('verse-range-selector').classList.remove('hidden');
        document.getElementById('verse-range-selector').classList.add('grid');
        document.getElementById('general-games-sidebar-controls').classList.add('hidden');

        if (surahSelect.options.length > 0) {
            await loadAndDisplaySurah(surahSelect.value);
        }
    }

    function populateSurahSelect(selectElement) {
        if (typeof surahIndex === 'undefined' || !Array.isArray(surahIndex)) {
            return;
        }
        surahIndex.forEach((surah) => {
            const option = document.createElement('option');
            option.value = surah.id;
            option.textContent = `${surah.id}. ${surah.name}`;
            selectElement.appendChild(option);
        });
    }

    async function loadAndDisplaySurah(surahId) {
        showLoading();
        try {
            const response = await fetch(`./quran_data/${surahId}.js`);
            const text = await response.text();
            const surahVarName = `surah_${surahId}`;
            let surahData = null;
            try {
                surahData = new Function(text + `; return ${surahVarName};`)();
            } catch (e) {
                console.error('Error evaluating surah JS file:', e);
            }
            if (surahData && typeof surahData === 'object') {
                currentSurahData = surahData;
                displayFullSurah(currentSurahData);
            } else {
                console.error('Could not parse surah data from file:', surahId);
                currentSurahData = null;
            }
        } catch (error) {
            currentSurahData = null;
        } finally {
            hideLoading();
        }
    }

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

    let verseCascadeGameLoopId = null;

    function cleanupActiveGame() {
        if (verseCascadeGameLoopId) {
            cancelAnimationFrame(verseCascadeGameLoopId);
            verseCascadeGameLoopId = null;
            const cascadeArea = document.getElementById('cascade-area');
            if (cascadeArea) cascadeArea.innerHTML = '';
        }
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        if (!surahSelect) return;
        document.body.addEventListener('click', initAudio, { once: true });

        surahSelect.addEventListener('change', async () => {
            playSound('navigate');
            cleanupActiveGame();
            await loadAndDisplaySurah(surahSelect.value);
        });
        verseStartInput.addEventListener('change', () => {
            playSound('click');
            cleanupActiveGame();
            loadSurahRange();
        });
        verseEndInput.addEventListener('change', () => {
            playSound('click');
            cleanupActiveGame();
            loadSurahRange();
        });

        const generalSurahStartSelect = document.getElementById('general-surah-start-select');
        const generalSurahEndSelect = document.getElementById('general-surah-end-select');

        if (generalSurahStartSelect) {
            generalSurahStartSelect.addEventListener('change', () => {
                playSound('navigate');
                loadGeneralGames();
            });
        }

        if (generalSurahEndSelect) {
            generalSurahEndSelect.addEventListener('change', () => {
                playSound('navigate');
                loadGeneralGames();
            });
        }

        if (muteBtnDesktop) {
            muteBtnDesktop.addEventListener('click', toggleMute);
        }
        if (muteBtnMobile) {
            muteBtnMobile.addEventListener('click', toggleMute);
        }

        const themeToggleDesktop = document.getElementById('theme-toggle-desktop');
        const themeToggleMobile = document.getElementById('theme-toggle-mobile');

        if (themeToggleDesktop) {
            themeToggleDesktop.addEventListener('click', toggleTheme);
        }
        if (themeToggleMobile) {
            themeToggleMobile.addEventListener('click', toggleTheme);
        }

        if (sidebarToggleBtn && sidebar && sidebarOverlay) {
            sidebarToggleBtn.addEventListener('click', showSidebar);
            sidebarOverlay.addEventListener('click', hideSidebar);
        }

        const tabBtns = document.querySelectorAll('.main-tabs .tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                playSound('navigate');
                cleanupActiveGame();
                
                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
                
                const sectionId = this.getAttribute('data-section');
                const targetSection = document.getElementById(sectionId + '-section');
                if (targetSection) {
                    targetSection.classList.add('active');
                }

                body.classList.remove('read-active', 'tafsir-active', 'games-active', 'general-games-active');
                body.classList.add(`${sectionId}-active`);

                // If switching to general games, load them
                if (sectionId === 'general-games') {
                    loadGeneralGames();
                } else if (sectionId === 'games') {
                    showGameGrid(); // Always show the game grid when navigating to the games tab
                }

                // Manage sidebar controls visibility
                const surahSelectElement = document.getElementById('surah-select');
                const verseRangeSelectorElement = document.getElementById('verse-range-selector');
                const generalGamesSidebarControls = document.getElementById('general-games-sidebar-controls');
                const surahSelectTitleElement = document.getElementById('surah-select-title');

                if (sectionId === 'general-games') {
                    if (surahSelectElement) surahSelectElement.classList.add('hidden');
                    if (verseRangeSelectorElement) {
                        verseRangeSelectorElement.classList.add('hidden');
                        verseRangeSelectorElement.classList.remove('grid'); // Ensure grid display is removed
                    }
                    if (generalGamesSidebarControls) generalGamesSidebarControls.classList.remove('hidden');
                    if (surahSelectTitleElement) surahSelectTitleElement.classList.add('hidden'); // Hide the title
                } else {
                    if (surahSelectElement) surahSelectElement.classList.remove('hidden');
                    if (verseRangeSelectorElement) {
                        verseRangeSelectorElement.classList.remove('hidden');
                        verseRangeSelectorElement.classList.add('grid'); // Re-add grid display
                    }
                    if (generalGamesSidebarControls) generalGamesSidebarControls.classList.add('hidden');
                    if (surahSelectTitleElement) surahSelectTitleElement.classList.remove('hidden'); // Show the title
                }
            });
        });

        const scrollTopBtn = document.getElementById('scroll-top-btn');
        if (scrollTopBtn) {
            scrollTopBtn.addEventListener('click', () => {
                document.getElementById('content-area').scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
            document.getElementById('content-area').addEventListener('scroll', () => {
                if (document.getElementById('content-area').scrollTop > 200) {
                    scrollTopBtn.style.display = 'block';
                } else {
                    scrollTopBtn.style.display = 'none';
                }
            });
        }

        const printBtn = document.getElementById('print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                playSound('click');
                printContent();
            });
        }
    }

    function showSidebar() {
        if (sidebar) sidebar.classList.add('sidebar-open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }

    function hideSidebar() {
        if (sidebar) sidebar.classList.remove('sidebar-open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            hideSidebar();
        }
    });

    function loadSurahRange() {
        if (!currentSurahData) return;
        const surah = currentSurahData;
        const startVerse = parseInt(verseStartInput.value) || 1;
        const endVerse = parseInt(verseEndInput.value) || surah.verses.length;

        // Determine the currently active section
        const activeTab = document.querySelector('.main-tabs .tab-btn.active');
        const activeSectionId = activeTab ? activeTab.getAttribute('data-section') : 'read'; // Default to 'read'

        switch (activeSectionId) {
            case 'read':
                displaySurah(surah, startVerse, endVerse);
                break;
            case 'tafsir':
                displayTafsir(surah, startVerse, endVerse);
                break;
            case 'games':
                displayGames(surah, startVerse, endVerse);
                break;
            case 'general-games':
                displayGeneralGames(surah, startVerse, endVerse);
                break;
            default:
                displaySurah(surah, startVerse, endVerse);
        }
    }

    function loadGeneralGames() {
        const generalSurahStartSelect = document.getElementById('general-surah-start-select');
        const generalSurahEndSelect = document.getElementById('general-surah-end-select');

        const startSurahId = parseInt(generalSurahStartSelect.value);
        const endSurahId = parseInt(generalSurahEndSelect.value);

        // Find the actual surah data for the start and end surahs
        const startSurah = surahIndex.find(s => s.id === startSurahId);
        const endSurah = surahIndex.find(s => s.id === endSurahId);

        if (!startSurah || !endSurah) {
            console.error("Invalid surah range selected for general games.");
            return;
        }

        // For general games, we might need to load data for multiple surahs
        // For now, we'll just pass the range and display a message.
        displayGeneralGames(startSurahId, endSurahId);
    }

    // --- Print Functionality ---
    function printContent() {
        // ... (print logic remains the same)
    }

    // --- Display Functions ---
    function displaySurah(surah, start, end) {
        const container = document.getElementById('surah-container');
        const title = document.getElementById('read-title');
        title.textContent = `سورة ${surah.name} (الآيات ${start}-${end})`;
        container.innerHTML = '';
        
        
        
        const versesToShow = surah.verses.filter(v => v.id >= start && v.id <= end);
        
        // البحث عن بسم الله الرحمن الرحيم في الآية الأولى
        let basmallahFound = false;
        let skipFirstVerse = false;
        if (versesToShow.length > 0 && surah.id !== 9) {
            const firstVerse = versesToShow[0];
            
            
            const basmallahStandard = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
            const normalizedFirstVerse = normalizeBasmallah(firstVerse.text.trim());
            const normalizedBasmallah = normalizeBasmallah(basmallahStandard);

            

            // إذا كانت أول آية هي البسملة فقط (سورة الفاتحة)
            if (normalizedFirstVerse === normalizedBasmallah) {
                
                container.innerHTML += `<div class="basmallah">${firstVerse.text.trim()}</div>`;
                basmallahFound = true;
                skipFirstVerse = true; // لا نعرض الآية الأولى
            }
            // إذا كانت أول آية تبدأ بالبسملة ثم نص آخر (السور الأخرى)
            else if (normalizedFirstVerse.startsWith(normalizedBasmallah) && surah.id !== 1) {
                // إيجاد موضع نهاية البسملة في النص الأصلي
                let original = firstVerse.text.trim();
                let normOriginal = normalizeBasmallah(original);
                // استخدام طريقة مختلفة لحساب موضع نهاية البسملة
                let basmallahEndIndex = 0;
                let normCount = 0;
                for (let i = 0; i < original.length; i++) {
                    let char = original[i];
                    let normChar = normalizeBasmallah(char);
                    if (normChar.length > 0) {
                        normCount += normChar.length;
                        if (normCount > normalizedBasmallah.length) {
                            break;
                        }
                    }
                    basmallahEndIndex = i + 1;
                }
                // عرض البسملة منفصلة مع الحفاظ على التشكيل الأصلي
                let basmallahText = original.slice(0, basmallahEndIndex);
                container.innerHTML += `<div class="basmallah">${basmallahText}</div>`;
                basmallahFound = true;
                
                // إزالة البسملة من نص الآية الأولى
                let remainingText = original.slice(basmallahEndIndex).trim();
                if (remainingText) {
                    container.innerHTML += `<span class="verse-block">${remainingText} <span class="verse-number">﴿${firstVerse.id}﴾</span></span>`;
                }
                skipFirstVerse = true;
            }
            // إذا لم توجد بسملة، لا نعرض شيء خاص بها
        } else {
        }
        
        // عرض باقي الآيات
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
            const startRange = verseRange[0];
            const endRange = verseRange[1] || startRange;
            return Math.max(start, startRange) <= Math.min(end, endRange);
        });
        if (tafsirToShow.length === 0) {
            container.innerHTML = '<p>لا يتوفر تفسير للآيات المحددة حاليًا.</p>';
            return;
        }
        tafsirToShow.forEach(item => {
            const tafsirItem = document.createElement('div');
            tafsirItem.className = 'tafsir-item';
            tafsirItem.innerHTML = `<h4>الآيات (${item.verses})</h4><p>${item.explanation}</p>`;
            container.appendChild(tafsirItem);
        });
    }

    function removeBasmallahFromVerse(verseText, surahId = null) {
        const basmallahStandard = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
        const normalizedVerse = normalizeBasmallah(verseText.trim());
        const normalizedBasmallah = normalizeBasmallah(basmallahStandard);
        
        // إذا كانت الآية هي البسملة فقط (وليس في سورة الفاتحة)، نعيد نص فارغ
        if (normalizedVerse === normalizedBasmallah && surahId !== 1) {
            return '';
        }
        
        // إذا كانت الآية تبدأ بالبسملة (وليس في سورة الفاتحة)، نزيلها
        if (normalizedVerse.startsWith(normalizedBasmallah) && surahId !== 1) {
            let original = verseText.trim();
            let basmallahEndIndex = 0;
            let normCount = 0;
            for (let i = 0; i < original.length; i++) {
                let char = original[i];
                let normChar = normalizeBasmallah(char);
                if (normChar.length > 0) {
                    normCount += normChar.length;
                    if (normCount > normalizedBasmallah.length) {
                        break;
                    }
                }
                basmallahEndIndex = i + 1;
            }
            return original.slice(basmallahEndIndex).trim();
        }
        
        // إذا لم توجد بسملة أو كانت سورة الفاتحة، نعيد النص كما هو
        return verseText;
    }

    // --- Game Logic ---
    // ... (Game logic remains the same)
    let gameScores = {
        'meaning-match': 0,
        'wheel': 0,
        'verse-order': 0
    };
    let lastWheelQuestionIndex = -1;
    let usedWheelVerseIndexes = [];
    let usedOrderVerseIndexes = [];

    function updateScore(game, delta) {
        gameScores[game] += delta;
        const el = document.getElementById(`${game}-score`);
        if (el) el.textContent = `نتيجتك: ${gameScores[game]}`;
    }

    function setupMeaningMatchGame(surah, start, end) {
        const container = document.getElementById('meaning-match-game');
        const gameContentArea = container.querySelector('.game-content-area');
        if (!gameContentArea) return;

        container.style.setProperty('--game-primary-color', '#8e44ad');
        container.style.setProperty('--game-secondary-color', '#9b59b6');

        if (!surah || !surah.vocabulary || surah.vocabulary.length < 2) {
            gameContentArea.innerHTML = '<p class="game-notice">لا توجد بيانات كافية لهذه اللعبة في السورة المحددة.</p>';
            return;
        }

        gameContentArea.innerHTML = `
            <div class="game-header">
                <h3 class="game-title">لعبة توصيل المعاني</h3>
                <p class="game-instructions">اسحب الكلمة من القائمة اليمنى وضعها على معناها الصحيح في القائمة اليسرى.</p>
            </div>
            <div id="meaning-game-area" class="meaning-game-area">
                <div id="words-container" class="words-container"></div>
                <div id="meanings-container" class="meanings-container"></div>
            </div>
            <div class="game-footer">
                <div id="meaning-match-score" class="game-score">النتيجة: 0</div>
                <button id="reset-game-btn" class="btn-reset-game"><span class="material-icons">refresh</span></button>
            </div>
        `;

        const wordsContainer = document.getElementById('words-container');
        const meaningsContainer = document.getElementById('meanings-container');
        const scoreElement = document.getElementById('meaning-match-score');
        let score = 0;

        const pairs = [...surah.vocabulary].sort(() => 0.5 - Math.random()).slice(0, 5);
        if (pairs.length < 2) {
            gameContentArea.innerHTML = '<p class="game-notice">لا توجد بيانات كافية لهذه اللعبة في السورة المحددة.</p>';
            return;
        }

        const words = pairs.map(p => p.word);
        const meanings = pairs.map(p => p.meaning);
        const shuffledWords = [...words].sort(() => 0.5 - Math.random());
        const shuffledMeanings = [...meanings].sort(() => 0.5 - Math.random());

        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        let selectedWordDiv = null;

        // Unified logic for handling a match attempt
        const handleMatchAttempt = (word, meaning, meaningBox) => {
            const correctPair = pairs.find(p => p.word === word && p.meaning === meaning);
            
            if (correctPair) {
                const wordItem = Array.from(wordsContainer.children).find(w => w.textContent === word);
                
                meaningBox.classList.add('correct');
                meaningBox.innerHTML = `<span>${word}</span> <span class="material-icons">check_circle</span>`;
                if (wordItem) {
                    wordItem.classList.add('matched');
                }
                
                score++;
                scoreElement.textContent = `النتيجة: ${score}`;
                playSound('correct');

                if (score === pairs.length) {
                    playSound('win');
                }
                return true;
            } else {
                meaningBox.classList.add('incorrect');
                setTimeout(() => meaningBox.classList.remove('incorrect'), 700);
                playSound('incorrect');
                return false;
            }
        };

        // Create Word Items
        shuffledWords.forEach(word => {
            const div = document.createElement('div');
            div.className = 'word-item';
            div.textContent = word;
            wordsContainer.appendChild(div);

            if (isTouchDevice) {
                div.addEventListener('click', () => {
                    if (div.classList.contains('matched')) return;
                    if (selectedWordDiv) {
                        selectedWordDiv.classList.remove('dragging');
                    }
                    div.classList.add('dragging');
                    selectedWordDiv = div;
                    playSound('drag_start');
                });
            } else {
                div.draggable = true;
                div.addEventListener('dragstart', e => {
                    if (div.classList.contains('matched')) {
                        e.preventDefault();
                        return;
                    }
                    e.dataTransfer.setData('text/plain', word);
                    e.target.classList.add('dragging');
                    playSound('drag_start');
                });
                div.addEventListener('dragend', e => {
                    e.target.classList.remove('dragging');
                });
            }
        });

        // Create Meaning Items
        shuffledMeanings.forEach(meaning => {
            const box = document.createElement('div');
            box.className = 'meaning-box';
            box.textContent = meaning;
            box.dataset.meaning = meaning;
            meaningsContainer.appendChild(box);

            if (isTouchDevice) {
                box.addEventListener('click', () => {
                    if (!selectedWordDiv || box.classList.contains('correct')) return;
                    
                    const success = handleMatchAttempt(selectedWordDiv.textContent, meaning, box);
                    
                    selectedWordDiv.classList.remove('dragging');
                    selectedWordDiv = null; // Always deselect after an attempt
                });
            } else { // Desktop logic
                box.addEventListener('dragover', e => {
                    e.preventDefault();
                    if (!box.classList.contains('correct')) box.classList.add('over');
                });
                box.addEventListener('dragleave', () => box.classList.remove('over'));
                box.addEventListener('drop', e => {
                    e.preventDefault();
                    if (box.classList.contains('correct')) return;
                    box.classList.remove('over');
                    
                    const droppedWord = e.dataTransfer.getData('text/plain');
                    const wordItem = Array.from(wordsContainer.children).find(w => w.textContent === droppedWord);

                    if (!wordItem || wordItem.classList.contains('matched')) return;

                    handleMatchAttempt(droppedWord, meaning, box);
                });
            }
        });

        document.getElementById('reset-game-btn').onclick = () => {
            playSound('navigate');
            setupMeaningMatchGame(surah, start, end);
        };
    }

    function displayGames(surah, start, end) {
        const gameArea = document.getElementById('game-area');
        const gameTitle = document.getElementById('games-title');
        gameTitle.textContent = `ألعاب مخصصة على سورة ${surah.name}`;
        localStorage.setItem('lastSurahId', surah.id);
        localStorage.setItem('lastStartVerse', start);
        localStorage.setItem('lastEndVerse', end);

        const games = [
            {
                key: 'meaning-match',
                label: 'لعبة توصيل المعاني',
                icon: 'sync_alt',
                desc: 'اختبر معرفتك بمعاني كلمات القرآن من خلال توصيل الكلمة بمعناها الصحيح.' ,
                cardGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                iconColor: '#fff'
            },
            {
                key: 'verse-order',
                label: 'ترتيب الآيات',
                icon: 'sort',
                desc: 'رتب الآيات بالترتيب الصحيح وتحدى ذاكرتك القرآنية.',
                cardGradient: 'linear-gradient(135deg, #2af598 0%, #009efd 100%)',
                iconColor: '#fff'
            },
            {
                key: 'verse-cascade',
                label: 'شلال الآيات',
                icon: 'waterfall_chart',
                desc: 'التقط الكلمات الصحيحة من الشلال وأكمل الآية قبل أن تسقط الكلمات.',
                cardGradient: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)',
                iconColor: '#fff'
            }
        ];

        const cardsGrid = document.querySelector('.games-cards-grid');
        cardsGrid.innerHTML = games.map(game => `
            <div class="game-card" tabindex="0" data-game="${game.key}">
                <div class="game-card-inner" style="background: ${game.cardGradient};">
                    <span class="material-icons icon" style="color: ${game.iconColor};">${game.icon}</span>
                    <div class="title">${game.label}</div>
                    <div class="desc">${game.desc}</div>
                    <button class="go-btn">ابدأ اللعبة</button>
                </div>
            </div>
        `).join('');
        cardsGrid.classList.remove('hidden');
        cardsGrid.classList.add('grid');

        document.querySelectorAll('.game-card').forEach((card, i) => {
            card.style.opacity = 0;
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s cubic-bezier(.34,1.56,.64,1)';
                card.style.opacity = 1;
            }, 100 + i * 120);

            card.addEventListener('click', function(e) {
                showGame(card.getAttribute('data-game'), surah, start, end);
            });
            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    showGame(card.getAttribute('data-game'), surah, start, end);
                }
            });
            card.querySelector('.go-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                showGame(card.getAttribute('data-game'), surah, start, end);
            });
            card.querySelector('.go-btn').addEventListener('mouseover', function() {
            });
        });

        // Ensure game cards grid is visible and all game containers are hidden initially
        document.querySelectorAll('.game-container').forEach(g => {
            g.classList.add('hidden');
            g.classList.remove('active');
            const backButton = g.querySelector('.back-to-games-btn');
            if (backButton) backButton.classList.add('hidden');
        });
    }

    function displayGeneralGames(startSurahId, endSurahId) {
        const generalGameArea = document.getElementById('general-game-area');
        const generalGamesTitle = document.getElementById('general-games-title');

        const startSurahName = surahIndex.find(s => s.id === startSurahId)?.name || 'غير محدد';
        const endSurahName = surahIndex.find(s => s.id === endSurahId)?.name || 'غير محدد';

        generalGamesTitle.textContent = `ألعاب عامة على السور من ${startSurahName} إلى ${endSurahName}`;

        const generalGames = [
            {
                key: 'wheel',
                label: 'العجلة الدوارة',
                icon: 'rotate_right',
                desc: 'أدر العجلة وأجب على الأسئلة القرآنية في جو من الحماس والتحدي.',
                cardGradient: 'linear-gradient(135deg, #ff8c42 0%, #ffc048 100%)',
                iconColor: '#fff'
            }
        ];

        generalGameArea.innerHTML = `<div class="games-cards-grid">${generalGames.map(game => `
            <div class="game-card" tabindex="0" data-game="${game.key}">
                <div class="game-card-inner" style="background: ${game.cardGradient};">
                    <span class="material-icons icon" style="color: ${game.iconColor};">${game.icon}</span>
                    <div class="title">${game.label}</div>
                    <div class="desc">${game.desc}</div>
                    <button class="go-btn">ابدأ اللعبة</button>
                </div>
            </div>
        `).join('')}</div>
        <div id="general-wheel-game" class="game-container hidden">
            <button class="back-to-games-btn"><span class="material-icons">arrow_back</span></button>
            <div class="game-content-area"></div>
        </div>
        `;
        generalGameArea.querySelector('.games-cards-grid').classList.remove('hidden');
        generalGameArea.querySelector('.games-cards-grid').classList.add('grid');

        document.querySelectorAll('#general-game-area .game-card').forEach((card, i) => {
            card.style.opacity = 0;
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s cubic-bezier(.34,1.56,.64,1)';
                card.style.opacity = 1;
            }, 100 + i * 120);

            card.addEventListener('click', function(e) {
                showGeneralGame(card.getAttribute('data-game'), startSurahId, endSurahId);
            });
            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    showGeneralGame(card.getAttribute('data-game'), startSurahId, endSurahId);
                }
            });
            card.querySelector('.go-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                showGeneralGame(card.getAttribute('data-game'), startSurahId, endSurahId);
            });
        });

        // Ensure game cards grid is visible and all game containers are hidden initially
        generalGameArea.querySelectorAll('.game-container').forEach(g => {
            g.classList.add('hidden');
            g.classList.remove('active');
            const backButton = g.querySelector('.back-to-games-btn');
            if (backButton) backButton.classList.add('hidden');
        });
    }

    function showGeneralGame(game, startSurahId, endSurahId) {
        // Need to load all surahs in the range first
        const surahsToLoad = [];
        for (let i = startSurahId; i <= endSurahId; i++) {
            surahsToLoad.push(i);
        }

        Promise.all(surahsToLoad.map(surahId => fetch(`./quran_data/${surahId}.js`).then(res => res.text())))
            .then(texts => {
                const allVerses = [];
                texts.forEach((text, index) => {
                    const surahVarName = `surah_${surahsToLoad[index]}`;
                    try {
                        const surahData = new Function(text + `; return ${surahVarName};`)();
                        if (surahData && surahData.verses) {
                            allVerses.push(...surahData.verses.map(v => ({ ...v, surahId: surahData.id })));
                        }
                    } catch (e) {
                        console.error('Error evaluating surah JS file for general game:', e);
                    }
                });

                // Now that all verses are loaded, proceed with game setup
                const generalGameArea = document.getElementById('general-game-area');
                const cardsGrid = generalGameArea.querySelector('.games-cards-grid');
                if (cardsGrid) {
                    cardsGrid.classList.add('hidden');
                    cardsGrid.classList.remove('grid'); // Remove grid class when hiding
                    console.log('general-games-cards-grid hidden:', cardsGrid.classList.contains('hidden'));
                }

                generalGameArea.querySelectorAll('.game-container').forEach(g => {
                    g.classList.add('hidden');
                    g.classList.remove('active');
                });

                const el = document.getElementById(`general-${game}-game`);
                if (!el) return;
                el.classList.remove('hidden');
                el.classList.add('active');

                                const backButton = el.querySelector('.back-to-games-btn');
                if (backButton) {
                    backButton.classList.remove('hidden');
                    backButton.classList.add('flex');
                    backButton.style.backgroundColor = 'var(--general-games-primary)';
                    backButton.style.color = 'white';
                }

                switch (game) {
                    case 'wheel':
                        // Pass all verses from the selected range to the wheel game
                        setupWheelGame( { verses: allVerses, surahIndex: surahIndex }, startSurahId, endSurahId);
                        break;
                }
            })
            .catch(error => {
                console.error('Error loading surah data for general games:', error);
            });
    }

    function showGeneralGameGrid() {
        const generalGameArea = document.getElementById('general-game-area');
        const cardsGrid = generalGameArea.querySelector('.games-cards-grid');
        if (cardsGrid) {
            cardsGrid.classList.remove('hidden');
            cardsGrid.classList.add('grid');
            console.log('general-games-cards-grid visible:', !cardsGrid.classList.contains('hidden'));
        }

        generalGameArea.querySelectorAll('.game-container').forEach(g => {
            g.classList.add('hidden');
            g.classList.remove('active');
            const backButton = g.querySelector('.back-to-games-btn');
            if (backButton) backButton.classList.add('hidden');
        });
    }

    // Add event listener for back button in general games section
    document.addEventListener('click', (e) => {
        if (e.target.closest('#general-game-area .back-to-games-btn')) {
            playSound('navigate');
            showGeneralGameGrid();
        }
    });

    function showGame(game, surah, start, end) {
        cleanupActiveGame();
        const cardsGrid = document.querySelector('.games-cards-grid');
        if (cardsGrid) {
            cardsGrid.classList.add('hidden');
            cardsGrid.classList.remove('grid'); // Remove grid class when hiding
            console.log('games-cards-grid hidden:', cardsGrid.classList.contains('hidden'));
        }

        document.querySelectorAll('.game-container').forEach(g => {
            g.classList.add('hidden');
            g.classList.remove('active');
            const backButton = g.querySelector('.back-to-games-btn');
            if (backButton) backButton.classList.add('hidden');
        });
        const el = document.getElementById(`${game}-game`);
        if (!el) return;
        el.classList.remove('hidden');
        el.classList.add('active');

        const backButton = document.getElementById('global-back-to-games-btn');
        if (backButton) backButton.classList.remove('hidden');
        if (backButton) backButton.classList.add('flex');

        switch (game) {
            case 'meaning-match':
                setupMeaningMatchGame(surah, start, end);
                break;
            case 'wheel':
                setupWheelGame(surah, start, end);
                break;
            case 'verse-order':
                setupVerseOrderGame(surah, start, end);
                break;
            case 'verse-cascade':
                setupVerseCascadeGame(surah, start, end);
                break;
        }
    }

    function showGameGrid() {
        document.querySelectorAll('.game-container').forEach(g => {
            g.classList.add('hidden');
            g.classList.remove('active');
        });
        const cardsGrid = document.querySelector('.games-cards-grid');
        if (cardsGrid) {
            cardsGrid.classList.remove('hidden');
            cardsGrid.classList.add('grid');
            console.log('games-cards-grid visible:', !cardsGrid.classList.contains('hidden'));
        }

        const backButton = document.getElementById('global-back-to-games-btn');
        if (backButton) backButton.classList.add('hidden');
    }

    // Add event listeners for back buttons
    const globalBackButton = document.getElementById('global-back-to-games-btn');
    if (globalBackButton) {
        globalBackButton.addEventListener('click', () => {
            playSound('navigate');
            showGameGrid();
        });
    }

    function setupWheelGame(surahData, startSurahId, endSurahId) {
        const container = document.getElementById('general-wheel-game');
        const gameContentArea = container.querySelector('.game-content-area');
        if (!gameContentArea) return;

        // Define color palettes for the wheel segments
        const wheelColorPalettes = [
            // Light Mode Palettes - Diverse and contrasting
            {
                light: ['#FFD700', '#4CAF50', '#2196F3', '#9C27B0'], // Gold, Green, Blue, Purple
                dark: ['#B8860B', '#388E3C', '#1976D2', '#7B1FA2'] // Darker Gold, Darker Green, Darker Blue, Darker Purple
            },
            {
                light: ['#FF5722', '#00BCD4', '#8BC34A', '#E91E63'], // Deep Orange, Cyan, Light Green, Pink
                dark: ['#D84315', '#00838F', '#689F38', '#C2185B'] // Darker Deep Orange, Darker Cyan, Darker Light Green, Darker Pink
            },
            {
                light: ['#FFC107', '#607D8B', '#795548', '#FF9800'], // Amber, Blue Grey, Brown, Orange
                dark: ['#FF8F00', '#455A64', '#5D4037', '#F57C00'] // Darker Amber, Darker Blue Grey, Darker Brown, Darker Orange
            },
            {
                light: ['#F44336', '#03A9F4', '#4CAF50', '#FFEB3B'], // Red, Light Blue, Green, Yellow
                dark: ['#D32F2F', '#0288D1', '#388E3C', '#FBC02D'] // Darker Red, Darker Light Blue, Darker Green, Darker Yellow
            },
            {
                light: ['#673AB7', '#009688', '#FFEB3B', '#FF4081'], // Deep Purple, Teal, Yellow, Pink Accent
                dark: ['#512DA8', '#00796B', '#FBC02D', '#C51162'] // Darker Deep Purple, Darker Teal, Darker Yellow, Darker Pink Accent
            }
        ];

        let currentPalette = null;

        function applyRandomWheelColors() {
            const randomIndex = Math.floor(Math.random() * wheelColorPalettes.length);
            currentPalette = wheelColorPalettes[randomIndex];

            const root = document.documentElement;
            const isDarkMode = document.body.classList.contains('dark-mode');
            
            const colors = isDarkMode ? currentPalette.dark : currentPalette.light;
            root.style.setProperty('--wheel-segment-1', colors[0]);
            root.style.setProperty('--wheel-segment-2', colors[1]);
            root.style.setProperty('--wheel-segment-3', colors[2]);
            root.style.setProperty('--wheel-segment-4', colors[3]);
        }

        // Initial color application
        applyRandomWheelColors();

        container.style.setProperty('--game-primary-color', 'var(--wheel-primary)');
        container.style.setProperty('--game-secondary-color', 'var(--wheel-secondary)');

        // Game State (local to this instance of the game)
        let score = 0;
        let isSpinning = false;
        let rotation = 0;
        let usedQuestionIdentifiers = new Set();

        // Question Types (can be customized)
        const questionTypes = [
            { id: 'next_ayah', text: 'الآية التالية' },
            { id: 'arrange', text: 'رتّب الآيات' },
            { id: 'identify_surah', text: 'ما هي السورة؟' },
            { id: 'complete', text: 'أكمل الآية' },
        ];

        // Filter verses based on the provided range (for general games)
        const allVerses = surahData.verses;

        if (allVerses.length < 10) { // Need a reasonable number of verses for the game
            gameContentArea.innerHTML = '<p style="color:#c00">لا توجد آيات كافية لهذه اللعبة في النطاق المحدد. يرجى اختيار نطاق أوسع.</p>';
            return;
        }

        gameContentArea.innerHTML = `
            <h1 class="wheel-game-title">عجلة الحظ القرآنية</h1>
            <p class="wheel-game-subtitle">راجع حفظك من سورة ${surahIndex.find(s => s.id === startSurahId)?.name || 'البداية'} إلى سورة ${surahIndex.find(s => s.id === endSurahId)?.name || 'النهاية'}</p>
            
            <div id="score-container" class="wheel-game-score-container">
                النقاط: <span id="score">0</span>
            </div>

            <div class="wheel-container">
                <div class="pointer"></div>
                <div id="wheel" class="wheel">
                    <div class="wheel-text-container">
                        <div class="wheel-text text-1">${questionTypes[0].text}</div>
                        <div class="wheel-text text-2">${questionTypes[1].text}</div>
                        <div class="wheel-text text-3">${questionTypes[2].text}</div>
                        <div class="wheel-text text-4">${questionTypes[3].text}</div>
                    </div>
                </div>
                <button id="spin-button" class="spin-button">أدر</button>
            </div>
            
            <button id="reset-button" class="wheel-game-reset-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg>
                <span>إعادة اللعب</span>
            </button>
        `;

        // --- DOM Elements (local to this game instance) ---
        const wheelElement = gameContentArea.querySelector('#wheel');
        const spinButton = gameContentArea.querySelector('#spin-button');
        const resetButton = gameContentArea.querySelector('#reset-button');
        const scoreElement = gameContentArea.querySelector('#score');

        // --- Event Listeners ---
        spinButton.addEventListener('click', spinWheel);
        resetButton.addEventListener('click', resetGame);

        // --- Game Logic ---
        function spinWheel() {
            if (isSpinning) return;
            isSpinning = true;
            spinButton.disabled = true;
            playSound('spin_start'); // Play sound on spin start
            
            rotation += Math.ceil(Math.random() * 2000) + 2500;
            wheelElement.style.transform = `rotate(${rotation}deg)`;
            
            wheelElement.addEventListener('transitionend', handleSpinEnd, { once: true });
        }

        function handleSpinEnd() {
            playSound('spin_stop'); // Play sound on spin stop
            const actualRotation = rotation % 360;
            const segmentIndex = Math.floor(actualRotation / 90);
            const selectedType = questionTypes[segmentIndex];
            presentNewQuestion(selectedType.id);
        }

        function resetGame() {
            score = 0;
            scoreElement.textContent = score;
            isSpinning = false;
            spinButton.disabled = false;
            usedQuestionIdentifiers.clear();
            wheelElement.style.transition = 'none';
            rotation = 0;
            wheelElement.style.transform = `rotate(0deg)`;
            applyRandomWheelColors(); // Apply new random colors
            setTimeout(() => { wheelElement.style.transition = 'transform 7s cubic-bezier(0.25, 1, 0.5, 1)'; }, 50);
        }

        // --- Question Handling ---
        function presentNewQuestion(type) {
            let question = null;
            let attempts = 0;
            const maxAttempts = 50;

            while (attempts < maxAttempts) {
                const generatedQuestion = generateQuestion(type);
                if (!generatedQuestion) {
                    attempts++;
                    continue;
                }
                if (!usedQuestionIdentifiers.has(generatedQuestion.id)) {
                    question = generatedQuestion;
                    break;
                }
                attempts++;
            }

            if (!question) {
                // Using a custom message box instead of alert()
                const modalOverlay = document.getElementById('game-modal-overlay');
                if (modalOverlay) {
                    const modalContent = modalOverlay.querySelector('.game-modal-content');
                    modalContent.innerHTML = `
                        <h2>لقد أجبت على جميع الأسئلة المتاحة!</h2>
                        <p>سيتم إعادة تعيين الأسئلة لتبدأ من جديد.</p>
                        <button class="action-button" id="modal-ok-btn">موافق</button>
                    `;
                    modalOverlay.classList.add('active');
                    document.getElementById('modal-ok-btn').onclick = () => {
                        modalOverlay.classList.remove('active');
                        usedQuestionIdentifiers.clear();
                        question = generateQuestion(type); // Try generating again after clearing
                        if (question) {
                            usedQuestionIdentifiers.add(question.id);
                            displayQuestion(question);
                        } else {
                            // Fallback if even after reset, question generation fails
                            const fallbackModal = document.getElementById('game-modal-overlay');
                            if (fallbackModal) {
                                fallbackModal.querySelector('.game-modal-content').innerHTML = `
                                    <h2>حدث خطأ</h2>
                                    <p>حدث خطأ أثناء إنشاء السؤال، يرجى إعادة المحاولة.</p>
                                    <button class="action-button" id="fallback-ok-btn">موافق</button>
                                `;
                                fallbackModal.classList.add('active');
                                document.getElementById('fallback-ok-btn').onclick = () => fallbackModal.classList.remove('active');
                            }
                            isSpinning = false;
                            spinButton.disabled = false;
                        }
                    };
                }
                return; // Stop here, modal handles next step
            }
            
            if (question) {
                usedQuestionIdentifiers.add(question.id);
                displayQuestion(question);
            } else {
                // Using a custom message box instead of alert()
                const modalOverlay = document.getElementById('game-modal-overlay');
                if (modalOverlay) {
                    modalOverlay.querySelector('.game-modal-content').innerHTML = `
                        <h2>حدث خطأ</h2>
                        <p>حدث خطأ أثناء إنشاء السؤال، يرجى إعادة المحاولة.</p>
                        <button class="action-button" id="error-ok-btn">موافق</button>
                    `;
                    modalOverlay.classList.add('active');
                    document.getElementById('error-ok-btn').onclick = () => modalOverlay.classList.remove('active');
                }
                isSpinning = false;
                spinButton.disabled = false;
            }
        }
        
        function generateQuestion(type) {
            // Select a random surah from the loaded verses' surah IDs
            const uniqueSurahIds = [...new Set(allVerses.map(v => v.surahId))];
            if (uniqueSurahIds.length === 0) return null;
            const randomSurahId = uniqueSurahIds[Math.floor(Math.random() * uniqueSurahIds.length)];
            const surah = surahIndex.find(s => s.id === randomSurahId);
            if (!surah) return null; // Should not happen if uniqueSurahIds is populated

            // Filter verses belonging to this surah
            const surahVerses = allVerses.filter(v => v.surahId === surah.id);
            if (surahVerses.length === 0) return null;

            let question = {};

            switch(type) {
                case 'identify_surah': {
                    const verse = surahVerses[Math.floor(Math.random() * surahVerses.length)];
                    const verseTextWithoutBasmallah = removeBasmallahFromVerse(verse.text, surah.id);
                    const otherSurahNames = surahIndex.filter(s => s.name !== surah.name).map(s => s.name).sort(() => 0.5 - Math.random()).slice(0, 2);
                    return { id: `identify_${surah.name}_${verse.id}`, type, surah, question: `"${verseTextWithoutBasmallah}"`, options: [surah.name, ...otherSurahNames].sort(() => 0.5 - Math.random()), answer: surah.name };
                }
                case 'complete': {
                    const verseToComplete = surahVerses[Math.floor(Math.random() * surahVerses.length)];
                    const verseTextWithoutBasmallah = removeBasmallahFromVerse(verseToComplete.text, surah.id);
                    const words = verseTextWithoutBasmallah.split(' ');
                    if (words.length < 2) return null;
                    const answerWord = words.pop();
                    const questionText = words.join(' ') + ' ______';
                    const otherWords = allVerses.flatMap(v => removeBasmallahFromVerse(v.text, v.surahId).split(' ')).filter(w => w !== answerWord && w.length > 2 && !w.includes('______')).sort(() => 0.5 - Math.random()).slice(0, 2);
                    return { id: `complete_${surah.name}_${verseToComplete.id}`, type, surah, question: questionText, options: [answerWord, ...otherWords].sort(() => 0.5 - Math.random()), answer: answerWord };
                }
                case 'next_ayah': {
                    if (surahVerses.length < 2) return null;
                    const verseIndex = Math.floor(Math.random() * (surahVerses.length - 1));
                    const currentVerse = surahVerses[verseIndex];
                    const nextVerse = surahVerses[verseIndex + 1];
                    const currentVerseTextWithoutBasmallah = removeBasmallahFromVerse(currentVerse.text, surah.id);
                    const nextVerseTextWithoutBasmallah = removeBasmallahFromVerse(nextVerse.text, surah.id);
                    const otherVerses = allVerses.filter(v => v.text !== nextVerse.text && v.text !== currentVerse.text).map(v => removeBasmallahFromVerse(v.text, v.surahId)).sort(() => 0.5 - Math.random()).slice(0, 2);
                    return { id: `next_${surah.name}_${currentVerse.id}`, type, surah, question: `ما هي الآية التي تلي: "${currentVerseTextWithoutBasmallah}"؟`, options: [nextVerseTextWithoutBasmallah, ...otherVerses].sort(() => 0.5 - Math.random()), answer: nextVerseTextWithoutBasmallah };
                }
                case 'arrange': {
                    if (surahVerses.length < 3) return null;
                    const start = Math.floor(Math.random() * (surahVerses.length - 2));
                    const versesToArrange = surahVerses.slice(start, start + 3);
                    const versesToArrangeWithoutBasmallah = versesToArrange.map(v => removeBasmallahFromVerse(v.text, surah.id));
                    return { id: `arrange_${surah.name}_${versesToArrange[0].id}`, type, surah, question: `رتّب الآيات التالية من سورة ${surah.name}`, options: versesToArrangeWithoutBasmallah.sort(() => 0.5 - Math.random()), answer: versesToArrangeWithoutBasmallah };
                }
            }
            return null;
        }

        // --- UI Display ---
        function displayQuestion(question) {
            // Create modal elements if they don't exist
            let modalOverlay = document.getElementById('game-modal-overlay');
            if (!modalOverlay) {
                modalOverlay = document.createElement('div');
                modalOverlay.id = 'game-modal-overlay';
                modalOverlay.className = 'game-modal-overlay';
                modalOverlay.innerHTML = `
                    <div class="game-modal-content">
                        <div class="game-modal-header">
                            <h2 id="modal-question-title"></h2>
                            <button class="game-modal-close-btn"><span class="material-icons">close</span></button>
                        </div>
                        <div class="game-modal-body">
                            <p id="modal-question-text" class="question-text"></p>
                            <div id="modal-options-container" class="question-options-container"></div>
                            <p id="modal-feedback" class="feedback-message"></p>
                            <div id="modal-action-buttons" class="action-buttons"></div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modalOverlay);
                modalOverlay.querySelector('.game-modal-close-btn').addEventListener('click', hideQuestionModal);
            }

            // Populate modal with question data
            const modalQuestionTitle = modalOverlay.querySelector('#modal-question-title');
            const modalQuestionText = modalOverlay.querySelector('#modal-question-text');
            const modalOptionsContainer = modalOverlay.querySelector('#modal-options-container');
            const modalFeedback = modalOverlay.querySelector('#modal-feedback');
            const modalActionButtons = modalOverlay.querySelector('#modal-action-buttons');

            const typeInfo = questionTypes.find(t => t.id === question.type);
            modalQuestionTitle.textContent = typeInfo.text;
            modalQuestionText.textContent = question.question;
            modalOptionsContainer.innerHTML = '';
            modalActionButtons.innerHTML = '';
            modalFeedback.textContent = '';
            modalFeedback.className = 'feedback-message'; // Reset class
            
            if (question.type === 'arrange') {
                setupArrangeQuestion(question, modalOptionsContainer, modalActionButtons, modalFeedback);
            } else {
                setupChoiceQuestion(question, modalOptionsContainer, modalActionButtons, modalFeedback);
            }

            modalOverlay.classList.add('active');
        }

        function hideQuestionModal() {
            const modalOverlay = document.getElementById('game-modal-overlay');
            if (modalOverlay) {
                modalOverlay.classList.remove('active');
                isSpinning = false;
                spinButton.disabled = false;
            }
        }

        function setupChoiceQuestion(question, optionsContainerEl, actionButtonsEl, feedbackEl) {
            question.options.forEach(option => {
                const button = document.createElement('button');
                button.textContent = option;
                button.className = 'option-button';
                button.onclick = (e) => {
                    // Ripple effect
                    const rect = e.target.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const ripple = document.createElement('span');
                    ripple.style.left = `${x}px`;
                    ripple.style.top = `${y}px`;
                    ripple.classList.add('ripple');
                    e.target.appendChild(ripple);
                    ripple.addEventListener('animationend', () => ripple.remove());

                    checkAnswer(option === question.answer, e.target, question, optionsContainerEl, actionButtonsEl, feedbackEl);
                };
                optionsContainerEl.appendChild(button);
            });
        }

        function checkAnswer(isCorrect, element, question, optionsContainerEl, actionButtonsEl, feedbackEl) {
            const allOptions = optionsContainerEl.querySelectorAll('button, .draggable');
            allOptions.forEach(opt => {
                if(opt.tagName === 'BUTTON') opt.disabled = true;
                if(opt.classList.contains('draggable')) opt.draggable = false;
            });

            if (isCorrect) {
                score += 10;
                scoreElement.textContent = score;
                feedbackEl.textContent = 'إجابة صحيحة! أحسنت!';
                feedbackEl.className = 'feedback-message feedback-correct';
                element.classList.add('correct-answer');
                playSound('correct');
                // Hide modal automatically after a short delay for correct answers
                setTimeout(() => {
                    hideQuestionModal();
                }, 1000); // Hide after 1 second
            } else {
                feedbackEl.textContent = 'إجابة خاطئة، حاول مرة أخرى!';
                feedbackEl.className = 'feedback-message feedback-incorrect';
                element.classList.add('wrong-answer');
                if (question.type !== 'arrange') {
                    const correctButton = Array.from(optionsContainerEl.querySelectorAll('.option-button')).find(btn => btn.textContent === question.answer);
                    if (correctButton) correctButton.classList.add('correct-answer');
                }
                playSound('incorrect');
                
                const continueBtn = document.createElement('button');
                continueBtn.textContent = 'متابعة';
                continueBtn.className = 'action-button';
                continueBtn.onclick = () => {
                    hideQuestionModal();
                };
                actionButtonsEl.appendChild(continueBtn);
            }
        }
        
        // The drag-and-drop functions
        let draggedItem = null;
        let isDragging = false;
        let offsetX, offsetY;

        function handleDragStart(e) {
            draggedItem = e.target;
            isDragging = true;
            playSound('drag_start');

            // Calculate offset for mouse/touch position relative to the element's top-left corner
            if (e.type === 'dragstart') {
                offsetX = e.clientX - draggedItem.getBoundingClientRect().left;
                offsetY = e.clientY - draggedItem.getBoundingClientRect().top;
                e.dataTransfer.setData('text/plain', draggedItem.id);
                e.dataTransfer.setDragImage(draggedItem, offsetX, offsetY);
            } else if (e.type === 'touchstart') {
                e.preventDefault(); // Prevent default touch behavior (e.g., scrolling)
                const touch = e.touches[0];
                // Calculate offset from the center of the element to the touch point
                offsetX = touch.clientX - (draggedItem.getBoundingClientRect().left + draggedItem.offsetWidth / 2);
                offsetY = touch.clientY - (draggedItem.getBoundingClientRect().top + draggedItem.offsetHeight / 2);

                // Store original styles to restore later
                draggedItem.dataset.originalTransition = draggedItem.style.transition;
                draggedItem.dataset.originalTransform = draggedItem.style.transform;

                // For touch, we manually control the element's position
                draggedItem.style.transition = 'none'; // Disable transitions during drag
                draggedItem.style.transform = 'none'; // Remove any existing transforms
                draggedItem.style.position = 'fixed';
                draggedItem.style.zIndex = '10000';
                draggedItem.style.pointerEvents = 'none'; // Allow events to pass through
            }
        }

        function handleDrag(e) {
            if (!isDragging || !draggedItem) return;

            // Only prevent default for touch events to allow native drag-and-drop for mouse
            if (e.type === 'touchmove') {
                e.preventDefault();
                const touch = e.touches[0];
                draggedItem.style.left = `${touch.clientX - offsetX}px`;
                draggedItem.style.top = `${touch.clientY - offsetY}px`;
            }
        }

        function handleDragEnd(e) {
            isDragging = false;
            // Only reset styles if it was a touch-based drag
            if (e.type === 'touchend' && draggedItem) {
                draggedItem.style.position = ''; // Reset position
                draggedItem.style.zIndex = ''; // Reset z-index
                draggedItem.style.pointerEvents = ''; // Reset pointer events
                draggedItem.style.left = ''; // Clear inline styles
                draggedItem.style.top = ''; // Clear inline styles
                // Restore original styles
                draggedItem.style.transition = draggedItem.dataset.originalTransition || '';
                draggedItem.style.transform = draggedItem.dataset.originalTransform || '';
                delete draggedItem.dataset.originalTransition;
                delete draggedItem.dataset.originalTransform;
            }
            draggedItem = null;
        }

        // Add global event listeners for drag and touch move/end
        document.addEventListener('drag', handleDrag);
        document.addEventListener('dragend', handleDragEnd);
        document.addEventListener('touchmove', handleDrag, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
        function checkArrangeAnswer(question, optionsContainerEl, actionButtonsEl, feedbackEl) {
            const dropZone = optionsContainerEl.querySelector('.drop-zone'); // Ensure we select from optionsContainer
            const arrangedItems = Array.from(dropZone.children).map(child => child.textContent);
            const isCorrect = JSON.stringify(arrangedItems) === JSON.stringify(question.answer);
            checkAnswer(isCorrect, dropZone, question, optionsContainerEl, actionButtonsEl, feedbackEl);
        }
        function setupArrangeQuestion(question, optionsContainerEl, actionButtonsEl, feedbackEl) {
            const draggablesContainer = document.createElement('div');
            draggablesContainer.className = 'draggables-container';
            draggablesContainer.id = 'draggables-container-arrange'; // Add an ID for specific targeting

            question.options.forEach((option, index) => {
                const div = document.createElement('div');
                div.textContent = option;
                div.className = 'draggable';
                div.draggable = true;
                div.id = `drag-${index}`;
                div.addEventListener('dragstart', handleDragStart);
                div.addEventListener('touchstart', handleDragStart, { passive: false });
                draggablesContainer.appendChild(div);
            });
            optionsContainerEl.appendChild(draggablesContainer);
            
            draggablesContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = getDragAfterElement(draggablesContainer, e.clientY);
                if (draggedItem && draggedItem !== e.target) {
                    if (afterElement == null) {
                        draggablesContainer.appendChild(draggedItem);
                    } else {
                        draggablesContainer.insertBefore(draggedItem, afterElement);
                    }
                }
            });

            draggablesContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedItem) {
                    // The actual reordering is handled by dragover/touchmove
                    // This drop event is mainly to finalize the drag operation
                    draggedItem.classList.remove('dragging');
                    draggedItem = null;
                }
            });

            draggablesContainer.addEventListener('drag', handleDrag);
            draggablesContainer.addEventListener('dragend', handleDragEnd);
            draggablesContainer.addEventListener('touchmove', handleDrag, { passive: false });
            draggablesContainer.addEventListener('touchend', handleDragEnd);

            draggablesContainer.addEventListener('touchmove', (e) => {
                if (draggedItem) {
                    e.preventDefault();
                    const afterElement = getDragAfterElement(draggablesContainer, e.touches[0].clientY);
                    if (afterElement == null) {
                        draggablesContainer.appendChild(draggedItem);
                    } else {
                        draggablesContainer.insertBefore(draggedItem, afterElement);
                    }
                }
            }, { passive: false });

            const checkButton = document.createElement('button');
            checkButton.textContent = 'تحقق من الترتيب';
            checkButton.className = 'action-button';
            checkButton.onclick = () => checkArrangeAnswer(question, optionsContainerEl, actionButtonsEl, feedbackEl);
            actionButtonsEl.appendChild(checkButton);
        }

        function checkArrangeAnswer(question, optionsContainerEl, actionButtonsEl, feedbackEl) {
            const draggablesContainer = optionsContainerEl.querySelector('#draggables-container-arrange');
            const arrangedItems = Array.from(draggablesContainer.children).map(child => child.textContent);
            const isCorrect = JSON.stringify(arrangedItems) === JSON.stringify(question.answer);
            checkAnswer(isCorrect, draggablesContainer, question, optionsContainerEl, actionButtonsEl, feedbackEl);
        }

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

    }

    function getRandomConsecutiveVerses(versesArray, count) {
        if (!versesArray || versesArray.length < count) {
            return [];
        }
        const maxStartIndex = versesArray.length - count;
        const startIndex = Math.floor(Math.random() * (maxStartIndex + 1));
        return versesArray.slice(startIndex, startIndex + count);
    }

    function setupVerseOrderGame(surah, start, end) {
        const container = document.getElementById('verse-order-game');
        const gameContentArea = container.querySelector('.game-content-area');
        if (!gameContentArea) return;
        container.style.setProperty('--game-primary-color', 'var(--verse-order-primary)');
        container.style.setProperty('--game-secondary-color', 'var(--verse-order-secondary)');

        gameContentArea.innerHTML = '';
        const versesToShow = surah && surah.verses ? surah.verses.filter(v => v.id >= start && v.id <= end) : [];

        if (versesToShow.length < 3) {
            gameContentArea.innerHTML = '<p>لا توجد آيات كافية لهذه اللعبة. حاول تحديد نطاق أكبر.</p>';
            return;
        }

        const count = Math.min(5, versesToShow.length);
        const gameVerses = getRandomConsecutiveVerses(versesToShow, count);
        const correctOrder = gameVerses.map(v => removeBasmallahFromVerse(v.text, surah.id)).filter(text => text);
        const shuffledOrder = [...correctOrder].sort(() => Math.random() - 0.5);

        gameContentArea.innerHTML = `
            <div class="game-header">
                <h3 class="game-title">لعبة ترتيب الآيات</h3>
                <p class="game-instructions">قم بسحب وإفلات الآيات لترتيبها بالترتيب الصحيح.</p>
            </div>
            <div id="verse-order-area"></div>
            <button id="check-order-btn" class="btn-check">تحقق من الترتيب</button>
            <button id="reset-verse-order-btn" class="btn-reset"><span class="material-icons">refresh</span> إعادة اللعبة</button>
            <div id="verse-order-feedback"></div>
            <div id="verse-order-score"></div>
        `;

        const verseArea = document.getElementById('verse-order-area');
        let draggedItem = null;
        
        shuffledOrder.forEach(verseText => {
            const verseDiv = document.createElement('div');
            verseDiv.className = 'verse-order-item';
            verseDiv.textContent = verseText;
            verseArea.appendChild(verseDiv);
            
            verseDiv.draggable = true;
            verseDiv.addEventListener('dragstart', () => {
                draggedItem = verseDiv;
                setTimeout(() => verseDiv.classList.add('dragging'), 0);
                playSound('drag_start');
            });
            verseDiv.addEventListener('dragend', () => {
                if (draggedItem) draggedItem.classList.remove('dragging');
                draggedItem = null;
            });

            verseDiv.addEventListener('touchstart', (e) => {
                draggedItem = verseDiv;
                verseDiv.classList.add('dragging');
                playSound('drag_start');
            }, { passive: false });

            verseDiv.addEventListener('touchend', () => {
                if (draggedItem) draggedItem.classList.remove('dragging');
                draggedItem = null;
            });
        });

        verseArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(verseArea, e.clientY);
            if (draggedItem) {
                if (afterElement == null) {
                    verseArea.appendChild(draggedItem);
                } else {
                    verseArea.insertBefore(draggedItem, afterElement);
                }
            }
        });

        verseArea.addEventListener('touchmove', (e) => {
            if (draggedItem) {
                e.preventDefault();
                const afterElement = getDragAfterElement(verseArea, e.touches[0].clientY);
                if (afterElement == null) {
                    verseArea.appendChild(draggedItem);
                } else {
                    verseArea.insertBefore(draggedItem, afterElement);
                }
            }
        }, { passive: false });

        document.getElementById('check-order-btn').addEventListener('click', () => {
            playSound('click');
            const userOrder = Array.from(verseArea.children).map(child => child.textContent);
            const feedbackDiv = document.getElementById('verse-order-feedback');
            
            // Create a sorted version of the correct order to compare against
            const sortedCorrectOrder = [...correctOrder].sort();
            const sortedUserOrder = [...userOrder].sort();

            let isCorrect = JSON.stringify(sortedCorrectOrder) === JSON.stringify(sortedUserOrder);

            if (isCorrect) {
                feedbackDiv.textContent = 'أحسنت! الترتيب صحيح.';
                feedbackDiv.className = 'feedback-correct';
                updateScore('verse-order', 1);
                playSound('win');
            } else {
                feedbackDiv.textContent = 'حاول مرة أخرى، الترتيب غير صحيح.';
                feedbackDiv.className = 'feedback-incorrect';
                playSound('incorrect');
            }
        });

        document.getElementById('reset-verse-order-btn').onclick = () => {
            usedOrderVerseIndexes = [];
            setupVerseOrderGame(surah, 1, surah.verses.length);
            playSound('navigate');
        };
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.verse-order-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function setupVerseCascadeGame(surah, start, end) {
        const container = document.getElementById('verse-cascade-game');
        const gameContentArea = container.querySelector('.game-content-area');
        if (!gameContentArea) return;
        container.style.setProperty('--game-primary-color', 'var(--verse-cascade-primary)');
        container.style.setProperty('--game-secondary-color', 'var(--verse-cascade-secondary)');

        let score, lives, currentVerseIndex, wordsToCatch, nextWordIndex, fallingWords, lastSpawnTime = 0, difficulty;
        const versesToShow = surah.verses.filter(v => v.id >= start && v.id <= end && v.text.split(' ').length >= 2);
        if (versesToShow.length === 0) {
            gameContentArea.innerHTML = '<p>لا توجد آيات مناسبة لهذه اللعبة في النطاق المحدد.</p>';
            return;
        }
        const difficultySettings = {
            easy: { speed: 8, interval: 1800, lives: 5 },
            medium: { speed: 6, interval: 1200, lives: 3 },
            hard: { speed: 4, interval: 700, lives: 2 }
        };

        function renderDifficultySelection() {
            cleanupGame();
            gameContentArea.innerHTML = `
                <div class="game-header">
                    <h3 class="game-title">لعبة شلال الآيات</h3>
                </div>
                <div class="difficulty-selector">
                    <h3>اختر مستوى الصعوبة</h3>
                    <button class="btn-difficulty" data-difficulty="easy">سهل</button>
                    <button class="btn-difficulty" data-difficulty="medium">متوسط</button>
                    <button class="btn-difficulty" data-difficulty="hard">صعب</button>
                </div>
            `;
            document.querySelectorAll('.btn-difficulty').forEach(btn => {
                btn.onclick = (e) => {
                    difficulty = e.target.dataset.difficulty;
                    renderGameUI();
                    startGame();
                };
            });
        }

        function renderGameUI() {
            gameContentArea.innerHTML = `
                <div id="cascade-header">
                    <div id="cascade-info">
                        <span>النتيجة: <span id="cascade-score">0</span></span>
                        <span>المحاولات: <span id="cascade-lives"></span></span>
                    </div>
                    <button id="reset-cascade-btn" class="btn-reset"><span class="material-icons">refresh</span></button>
                </div>
                <div id="cascade-area"></div>
                <div id="cascade-verse-display"></div>
            `;
            document.getElementById('reset-cascade-btn').onclick = renderDifficultySelection;
        }

        function startGame() {
            cleanupGame();
            score = 0;
            lives = difficultySettings[difficulty].lives;
            currentVerseIndex = 0;
            fallingWords = [];
            updateScoreDisplay();
            updateLivesDisplay();
            loadVerse();
            verseCascadeGameLoopId = requestAnimationFrame(gameLoop);
        }

        function cleanupGame() {
            if (verseCascadeGameLoopId) {
                cancelAnimationFrame(verseCascadeGameLoopId);
                verseCascadeGameLoopId = null;
            }
            const cascadeArea = document.getElementById('cascade-area');
            if (cascadeArea) cascadeArea.innerHTML = '';
            fallingWords = [];
        }

        function gameLoop(timestamp) {
            if (lives <= 0 || verseCascadeGameLoopId === null) return;
            if (timestamp - lastSpawnTime > difficultySettings[difficulty].interval) {
                lastSpawnTime = timestamp;
                spawnWord();
            }
            verseCascadeGameLoopId = requestAnimationFrame(gameLoop);
        }

        function loadVerse() {
            const cascadeArea = document.getElementById('cascade-area');
            if (cascadeArea) cascadeArea.innerHTML = '';
            fallingWords = [];
            if (lives <= 0) {
                endGame("حاول مرة أخرى يا بطل!");
                return;
            }
            if (currentVerseIndex >= versesToShow.length) {
                endGame("أحسنت! أنت بطل القرآن!");
                return;
            }
            const verseTextWithoutBasmallah = removeBasmallahFromVerse(versesToShow[currentVerseIndex].text, surah.id);
            wordsToCatch = verseTextWithoutBasmallah.split(' ').filter(w => w.trim() !== '');
            nextWordIndex = 0;
            updateVerseDisplay();
        }

        function spawnWord() {
            if (lives <= 0 || verseCascadeGameLoopId === null) return;
            const cascadeArea = document.getElementById('cascade-area');
            if (!cascadeArea) return;
            const nextWord = wordsToCatch[nextWordIndex];
            const isNextWordFalling = fallingWords.some(fw => fw.text === nextWord);
            let wordToSpawn;
            if (!isNextWordFalling && nextWordIndex < wordsToCatch.length) {
                wordToSpawn = nextWord;
            } else {
                wordToSpawn = wordsToCatch[Math.floor(Math.random() * wordsToCatch.length)];
            }
            createWordElement(wordToSpawn);
        }

        function createWordElement(word) {
            const cascadeArea = document.getElementById('cascade-area');
            if (!cascadeArea || verseCascadeGameLoopId === null) return;
            const wordEl = document.createElement('div');
            wordEl.className = 'cascade-word';
            wordEl.textContent = word;
            cascadeArea.appendChild(wordEl);
            const wordWidth = wordEl.offsetWidth;
            const maxRight = cascadeArea.offsetWidth - wordWidth - 10;
            wordEl.style.right = `${Math.max(0, Math.floor(Math.random() * maxRight))}px`;
            wordEl.style.animationDuration = `${(Math.random() * 2) + difficultySettings[difficulty].speed}s`;
            const wordObj = { el: wordEl, text: word, missed: true };
            fallingWords.push(wordObj);
            wordEl.addEventListener('click', () => handleWordClick(wordObj));
            wordEl.addEventListener('animationend', () => handleWordMiss(wordObj));
        }

        function handleWordClick(wordObj) {
            if (wordObj.text === wordsToCatch[nextWordIndex]) {
                wordObj.missed = false;
                nextWordIndex++;
                score += 10;
                playSound('correct');
                wordObj.el.remove();
                fallingWords = fallingWords.filter(w => w !== wordObj);
                updateVerseDisplay();
                updateScoreDisplay();
                if (nextWordIndex === wordsToCatch.length) {
                    score += 25;
                    updateScoreDisplay();
                    currentVerseIndex++;
                    setTimeout(loadVerse, 500);
                }
            } else {
                wordObj.el.classList.add('incorrect');
                playSound('incorrect');
                setTimeout(() => wordObj.el.classList.remove('incorrect'), 300);
            }
        }

        function handleWordMiss(wordObj) {
            if (wordObj.missed && wordObj.text === wordsToCatch[nextWordIndex]) {
                lives--;
                updateLivesDisplay();
                playSound('incorrect');
                currentVerseIndex++;
                setTimeout(loadVerse, 500);
            }
            wordObj.el.remove();
            fallingWords = fallingWords.filter(w => w !== wordObj);
        }

        function updateVerseDisplay() {
            const display = document.getElementById('cascade-verse-display');
            if(display) {
                const verseTextWithoutBasmallah = versesToShow[currentVerseIndex] ? removeBasmallahFromVerse(versesToShow[currentVerseIndex].text, surah.id) : "";
                const verseText = versesToShow[currentVerseIndex] ? `الآية: ${verseTextWithoutBasmallah}` : "";
                const caughtText = wordsToCatch.slice(0, nextWordIndex).join(' ');
                display.innerHTML = `<div class="full-verse-text">${verseText}</div><div class="caught-words-display">${caughtText} <span class="remaining-indicator">...</span></div>`;
            }
        }

        function updateScoreDisplay() {
            const scoreEl = document.getElementById('cascade-score');
            if(scoreEl) scoreEl.textContent = score;
        }

        function updateLivesDisplay() {
            const livesEl = document.getElementById('cascade-lives');
            if(livesEl) livesEl.textContent = lives > 0 ? '❤️'.repeat(lives) : '💔';
        }

        function endGame(message) {
            cleanupGame();
            const cascadeArea = document.getElementById('cascade-area');
            if(cascadeArea) {
                cascadeArea.innerHTML = `
                    <div class="cascade-end-message">
                        <h2>${message}</h2>
                        <p>نتيجتك النهائية: ${score}</p>
                        <button id="play-again-cascade-btn" class="btn-check">العب مرة أخرى</button>
                    </div>`;
                document.getElementById('play-again-cascade-btn').onclick = renderDifficultySelection;
            }
            const header = document.getElementById('cascade-header');
            if (header) header.style.display = 'none';
            const verseDisplay = document.getElementById('cascade-verse-display');
            if(verseDisplay) verseDisplay.style.display = 'none';
        }

        renderDifficultySelection();
    }

    // دالة لتوحيد نص البسملة (إزالة التشكيل وتوحيد الرموز)
    function normalizeBasmallah(text) {
        // إزالة كل أنواع التشكيل والرموز الخاصة
        let normalized = text
            .normalize("NFD")
            .replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, "") // إزالة كل أنواع التشكيل
            .replace(/ـ/g, "") // إزالة الكشيدة
            .replace(/ٱ/g, "ا") // توحيد الألف الصغيرة
            .replace(/ٰ/g, "ا") // توحيد الألف الممدودة
            .replace(/\s+/g, ""); // إزالة المسافات
        return normalized;
    }

    initializeApp();
});
