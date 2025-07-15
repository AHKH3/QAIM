document.addEventListener('DOMContentLoaded', () => {
    let currentSurahData = null; // To store the currently loaded surah data

    // عناصر الـ DOM
    let surahSelect = document.getElementById('surah-select');
    let verseStartInput = document.getElementById('verse-start');
    let verseEndInput = document.getElementById('verse-end');
    var themeDropdown = document.getElementById('theme-dropdown');
    var themeDropdownMobile = document.getElementById('theme-dropdown-mobile');
    let activitiesSurahSelect = document.getElementById('activities-surah-select');
    let activitiesSurahFrom = document.getElementById('activities-surah-from');
    let activitiesSurahTo = document.getElementById('activities-surah-to');
    const body = document.body;
    const contentNavButtons = document.querySelectorAll('#content-nav .nav-btn');
    const contentSections = document.querySelectorAll('.content-section');
    const muteBtn = document.getElementById('mute-btn');
    const muteBtnMobile = document.getElementById('mute-btn-mobile');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Theme handling
    let lastSelectedTheme = localStorage.getItem('selectedTheme') || 'theme-classic';
    body.classList.add(lastSelectedTheme); // Apply initial theme

    // Sound Functionality
    let isMuted = false;
    let audioCtx = null;

    function showLoading() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
    }

    function hideLoading() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
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
        updateMuteButtonIcon(); // Call the new function
        if (!isMuted && !audioCtx) {
            initAudio();
        }
    }

    function updateMuteButtonIcon() {
        const muteBtn = document.getElementById('mute-btn');
        const muteBtnMobile = document.getElementById('mute-btn-mobile');

        if (muteBtn) {
            muteBtn.innerHTML = `<span class="material-icons">${isMuted ? 'volume_off' : 'volume_up'}</span>`;
        }
        if (muteBtnMobile) {
            muteBtnMobile.innerHTML = `<span class="material-icons">${isMuted ? 'volume_off' : 'volume_up'}</span>`;
        }
    }

    // --- Initialization ---
    async function initializeApp() {
        populateSurahSelect(surahSelect);
        setupEventListeners();
        updateMuteButtonIcon(); // Set initial mute button icon
        if (themeDropdown) {
            themeDropdown.value = lastSelectedTheme;
        }
        if (themeDropdownMobile) {
            themeDropdownMobile.value = lastSelectedTheme;
        }
        // Load the first surah by default
        if (surahSelect.options.length > 0) {
            await loadAndDisplaySurah(surahSelect.value);
        }
    }

    function populateSurahSelect(selectElement) {
        if (typeof surahIndex === 'undefined' || !Array.isArray(surahIndex)) {
            console.error('surahIndex is not loaded!');
            return;
        }
        surahIndex.forEach((surah, index) => {
            const option = document.createElement('option');
            option.value = surah.id; // Use surah ID as value
            option.textContent = `${surah.id}. ${surah.name}`;
            selectElement.appendChild(option);
        });
    }

    async function loadAndDisplaySurah(surahId) {
        showLoading();
        try {
            const response = await fetch(`./quran_data/${surahId}.js`);
            const text = await response.text();
            // بدل محاولة استخراج JSON، ننفذ الكود ونعيد المتغير مباشرة
            const surahVarName = `surah_${surahId}`;
            let surahData = null;
            try {
                // ننفذ الكود ونعيد المتغير مباشرة
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
            console.error('Error loading surah data:', error);
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

    function setTheme(theme) {
        body.className = '';
        body.classList.add(theme);
        lastSelectedTheme = theme;
        if (themeDropdown) {
            themeDropdown.value = theme;
        }
        if (themeDropdownMobile) {
            themeDropdownMobile.value = theme;
        }
    }

    async function loadSurahRange() {
        if (!currentSurahData) return;
        const surah = currentSurahData;
        const startVerse = parseInt(verseStartInput.value) || 1;
        const endVerse = parseInt(verseEndInput.value) || surah.verses.length;
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
        // Initialize audio on the first user interaction
        document.body.addEventListener('click', initAudio, { once: true });
        document.body.addEventListener('keydown', initAudio, { once: true });

        // Surah and Verse Selection
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

        // Theme Dropdowns
        if (themeDropdown) {
            themeDropdown.addEventListener('change', (e) => {
                setTheme(e.target.value);
                playSound('navigate');
            });
        }
        if (themeDropdownMobile) {
            themeDropdownMobile.addEventListener('change', (e) => {
                setTheme(e.target.value);
                playSound('navigate');
            });
        }

        // Mute Buttons
        if (muteBtn) {
            muteBtn.addEventListener('click', toggleMute);
        }
        if (muteBtnMobile) {
            muteBtnMobile.addEventListener('click', toggleMute);
        }

        // Content Navigation
        contentNavButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                playSound('navigate');
                cleanupActiveGame();
                
                contentNavButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                contentSections.forEach(s => s.classList.remove('active'));
                
                const sectionId = btn.dataset.section + '-section';
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
            });
        });

        // Scroll to Top Button
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

        // Print Button
        const printBtn = document.getElementById('print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                playSound('click');
                printContent();
            });
        }
    }

    // --- Print Functionality ---
    function printContent() {
        const contentToPrint = document.getElementById('content-area').cloneNode(true);
        // Remove elements not needed for print
        contentToPrint.querySelector('#game-area').remove();
        contentToPrint.querySelector('#game-selector').remove();
        contentToPrint.querySelectorAll('.btn-reset, .btn-check, .option-btn, .game-select-btn').forEach(el => el.remove());

        const printWindow = window.open('', '', 'height=800,width=800');
        printWindow.document.write('<html><head><title>طباعة</title>');
        // Copy styles
        Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(link => {
            printWindow.document.write('<link rel="stylesheet" href="' + link.href + '">');
        });
        printWindow.document.write('<style>');
        printWindow.document.write(`
            body { font-family: 'Cairo', sans-serif; direction: rtl; text-align: right; }
            .content-section { display: block !important; }
            #surah-container, .tafsir-item {
                box-shadow: none;
                border: 1px solid #eee;
                margin-bottom: 1rem;
                padding: 1rem;
            }
            .section-title { border-bottom: 2px solid #eee; padding-bottom: 0.5rem; margin-bottom: 1rem; }
            .verse-block { display: block; margin-bottom: 0.5rem; }
            .verse-number { font-size: 0.9em; color: #666; }
            .basmallah { 
                text-align: center; 
                font-size: 2rem; 
                font-weight: bold; 
                color: #333; 
                margin-bottom: 1.5rem; 
                padding: 0.8rem; 
                border-bottom: 2px solid #ccc; 
                background: #f9f9f9; 
                border-radius: 8px; 
            }
            @page { size: auto;  margin: 15mm; }
            @media print {
                header, #sidebar, #scroll-top-btn, #print-btn, .header-controls, .sidebar-header-controls, #game-area, #game-selector, .btn-reset, .btn-check, .option-btn, .game-select-btn {
                    display: none !important;
                }
                #app-container, main#explorer-view, #content-area {
                    display: block;
                    width: 100%;
                    height: auto;
                    overflow: visible;
                    padding: 0;
                    margin: 0;
                }
                body { margin: 0; }
            }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(contentToPrint.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // --- Display Functions ---
    function displaySurah(surah, start, end) {
        const container = document.getElementById('surah-container');
        const title = document.getElementById('read-title');
        if (title) {
            title.textContent = `سورة ${surah.name} (الآيات ${start}-${end})`;
        }
        if (container) {
            container.innerHTML = '';
        } else {
            console.error('surah-container element not found');
            return;
        }
        
        console.log('Displaying surah:', surah.name, 'ID:', surah.id); // للتصحيح
        
        const versesToShow = surah.verses.filter(v => v.id >= start && v.id <= end);
        
        // البحث عن بسم الله الرحمن الرحيم في الآية الأولى
        let basmallahFound = false;
        let skipFirstVerse = false;
        if (versesToShow.length > 0 && surah.id !== 9) {
            const firstVerse = versesToShow[0];
            console.log('First verse text:', firstVerse.text); // للتصحيح
            
            const basmallahStandard = 'بسم الله الرحمن الرحيم';
            const normalizedFirstVerse = normalizeBasmallah(firstVerse.text.trim());
            const normalizedBasmallah = normalizeBasmallah(basmallahStandard);

            console.log('Normalized first verse:', normalizedFirstVerse); // للتصحيح
            console.log('Normalized basmallah:', normalizedBasmallah); // للتصحيح
            console.log('Starts with basmallah?', normalizedFirstVerse.startsWith(normalizedBasmallah)); // للتصحيح
            console.log('Equals basmallah?', normalizedFirstVerse === normalizedBasmallah); // للتصحيح

            // إذا كانت أول آية هي البسملة فقط (سورة الفاتحة)
            if (normalizedFirstVerse === normalizedBasmallah) {
                console.log('First verse is basmallah only (Al-Fatiha)'); // للتصحيح
                if (container) {
                    container.innerHTML += `<div class="basmallah">${firstVerse.text.trim()}</div>`;
                }
                basmallahFound = true;
                skipFirstVerse = true; // لا نعرض الآية الأولى
            }
            // إذا كانت أول آية تبدأ بالبسملة ثم نص آخر (السور الأخرى)
            else if (normalizedFirstVerse.startsWith(normalizedBasmallah) && surah.id !== 1) {
                console.log('Found basmallah at start of verse'); // للتصحيح
                // إيجاد موضع نهاية البسملة في النص الأصلي
                let original = firstVerse.text.trim();
                let normOriginal = normalizeBasmallah(original);
                console.log('Original text:', original); // للتصحيح
                console.log('Normalized text:', normOriginal); // للتصحيح
                console.log('Normalized basmallah:', normalizedBasmallah); // للتصحيح
                
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
                console.log('Basmallah end index:', basmallahEndIndex); // للتصحيح
                
                // عرض البسملة منفصلة مع الحفاظ على التشكيل الأصلي
                let basmallahText = original.slice(0, basmallahEndIndex);
                console.log('Basmallah text to display:', basmallahText); // للتصحيح
                if (container) {
                    container.innerHTML += `<div class="basmallah">${basmallahText}</div>`;
                }
                basmallahFound = true;
                
                // إزالة البسملة من نص الآية الأولى
                let remainingText = original.slice(basmallahEndIndex).trim();
                console.log('Remaining text after basmallah:', remainingText); // للتصحيح
                if (remainingText && container) {
                    container.innerHTML += `<span class="verse-block">${remainingText} <span class="verse-number">﴿${firstVerse.id}﴾</span></span>`;
                }
                skipFirstVerse = true;
            }
            // إذا لم توجد بسملة، لا نعرض شيء خاص بها
        } else {
            console.log('Surah ID is 9 or no verses to show'); // للتصحيح
        }
        
        // عرض باقي الآيات
        for (let i = skipFirstVerse ? 1 : 0; i < versesToShow.length; i++) {
            const verse = versesToShow[i];
            if (container) {
                container.innerHTML += `<span class="verse-block">${verse.text} <span class="verse-number">﴿${verse.id}﴾</span></span>`;
            }
        }
    }

    function displayTafsir(surah, start, end) {
        const container = document.getElementById('tafsir-container');
        const title = document.getElementById('tafsir-title');
        if (title) {
            title.textContent = `تفسير سورة ${surah.name} (الآيات ${start}-${end})`;
        }
        if (container) {
            container.innerHTML = '';
        } else {
            console.error('tafsir-container element not found');
            return;
        }
        if (!surah.tafsir || surah.tafsir.length === 0) {
            if (container) {
                container.innerHTML = '<p>لا يتوفر تفسير لهذه السورة حاليًا.</p>';
            }
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
            if (container) {
                container.innerHTML = '<p>لا يتوفر تفسير للآيات المحددة حاليًا.</p>';
            }
            return;
        }
        tafsirToShow.forEach(item => {
            const tafsirItem = document.createElement('div');
            tafsirItem.className = 'tafsir-item';
            tafsirItem.innerHTML = `<h4>الآيات (${item.verses})</h4><p>${item.explanation}</p>`;
            if (container) {
                container.appendChild(tafsirItem);
            }
        });
    }

    // دالة إزالة البسملة من نص الآية
    function removeBasmallahFromVerse(verseText, surahId = null) {
        const basmallahStandard = 'بسم الله الرحمن الرحيم';
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
    let gameScores = {
        'meaning-match': 0,
        'wheel': 0,
        'verse-order': 0
    };
    let lastWheelQuestionIndex = -1; // To prevent repeating the same question twice in a row
    // متغيرات لتتبع الآيات المستخدمة في كل لعبة
    let usedWheelVerseIndexes = [];
    let usedOrderVerseIndexes = [];
    function updateScore(game, delta) {
        gameScores[game] += delta;
        const el = document.getElementById(`${game}-score`);
        if (el) el.textContent = `نتيجتك: ${gameScores[game]}`;
    }

    function setupMeaningMatchGame(surah, start, end) {
        const container = document.getElementById('meaning-match-game');
        if (!container) return;
        container.innerHTML = '<p>اسحب الكلمة من اليمين وضعها على معناها الصحيح في اليسار.</p><div id="meaning-game-area"><div id="words-container"></div><div id="meanings-container"></div></div><button id="reset-game-btn" class="btn-reset"><span class="material-icons">refresh</span> إعادة اللعبة</button><div id="meaning-game-feedback"></div><div id="meaning-match-score"></div>';
        const wordsContainer = document.getElementById('words-container');
        const meaningsContainer = document.getElementById('meanings-container');
        
        if (!surah.vocabulary || surah.vocabulary.length < 2) {
            if (wordsContainer) {
                wordsContainer.innerHTML = '<p>لا توجد بيانات معاني كافية لهذه اللعبة.</p>';
            }
            return;
        }

        const pairs = [...surah.vocabulary].sort(() => 0.5 - Math.random()).slice(0, 5);
        const words = pairs.map(p => p.word);
        const meanings = pairs.map(p => p.meaning);
        const shuffledWords = [...words].sort(() => 0.5 - Math.random());
        const shuffledMeanings = [...meanings].sort(() => 0.5 - Math.random());

        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        let selectedWordDiv = null;

        const handleDropLogic = (droppedWord, meaning) => {
            const meaningBox = Array.from(meaningsContainer.children).find(b => b.dataset.meaning === meaning);
            if (!meaningBox || meaningBox.classList.contains('correct')) return;

            const correctPair = pairs.find(p => p.word === droppedWord);
            if (correctPair && correctPair.meaning === meaning) {
                meaningBox.classList.add('correct');
                meaningBox.textContent = `${droppedWord} ✔`;
                
                const wordItem = Array.from(wordsContainer.children).find(w => w.textContent === droppedWord);
                if (wordItem) wordItem.style.visibility = 'hidden';
                
                updateScore('meaning-match', 1);
                if (Array.from(meaningsContainer.children).every(b => b.classList.contains('correct'))) {
                    playSound('win');
                } else {
                    playSound('correct');
                }
            } else {
                meaningBox.classList.add('incorrect');
                setTimeout(() => meaningBox.classList.remove('incorrect'), 700);
                playSound('incorrect');
            }
        };

        shuffledWords.forEach(word => {
            const div = document.createElement('div');
            div.className = 'word-item';
            div.textContent = word;
            if (wordsContainer) {
                wordsContainer.appendChild(div);
            }

            if (isTouchDevice) {
                div.addEventListener('click', e => {
                    if (div.style.visibility === 'hidden') return;
                    
                    if (selectedWordDiv) {
                        selectedWordDiv.classList.remove('dragging');
                    }
                    selectedWordDiv = div;
                    div.classList.add('dragging'); // Use 'dragging' class for styling the selected word
                    playSound('drag_start');
                });
            } else {
                div.draggable = true;
                div.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('text/plain', word);
                    e.target.classList.add('dragging');
                    playSound('drag_start');
                });
                div.addEventListener('dragend', e => {
                    e.target.classList.remove('dragging');
                });
            }
        });

        shuffledMeanings.forEach(meaning => {
            const box = document.createElement('div');
            box.className = 'meaning-box';
            box.textContent = meaning;
            box.dataset.meaning = meaning;
            if (meaningsContainer) {
                meaningsContainer.appendChild(box);
            }

            if (isTouchDevice) {
                box.addEventListener('click', e => {
                    if (selectedWordDiv && !box.classList.contains('correct')) {
                        const wordToDrop = selectedWordDiv.textContent;
                        handleDropLogic(wordToDrop, meaning);
                        selectedWordDiv.classList.remove('dragging');
                        selectedWordDiv = null;
                    }
                });
            } else {
                box.addEventListener('dragover', e => {
                    e.preventDefault();
                    if (!box.classList.contains('correct')) box.classList.add('over');
                });
                box.addEventListener('dragleave', e => {
                    box.classList.remove('over');
                });
                box.addEventListener('drop', e => {
                    e.preventDefault();
                    box.classList.remove('over');
                    const droppedWord = e.dataTransfer.getData('text/plain');
                    handleDropLogic(droppedWord, meaning);
                });
            }
        });

        const resetBtn = document.getElementById('reset-game-btn');
        if (resetBtn) {
            resetBtn.onclick = () => { setupMeaningMatchGame(surah, start, end); playSound('navigate'); };
        }
    }

    function displayGames(surah, start, end) {
        console.log('Setting up games for surah:', surah.name); // للتصحيح
        
        const gameArea = document.getElementById('game-area');
        const gameTitle = document.getElementById('games-title');
        
        if (gameTitle) {
            gameTitle.textContent = `أنشطة على سورة ${surah.name}`;
        }
        
        if (!gameArea) {
            console.error('Game area not found!'); // للتصحيح
            return;
        }
        const games = [
            { key: 'meaning-match', label: 'لعبة توصيل المعاني', icon: 'sync_alt' },
            { key: 'wheel', label: 'العجلة الدوارة', icon: 'rotate_right' },
            { key: 'verse-order', label: 'ترتيب الآيات', icon: 'sort' },
            { key: 'verse-cascade', label: 'شلال الآيات', icon: 'waterfall_chart' }
        ];
        const selector = document.getElementById('game-selector');
        if (selector) {
            selector.innerHTML = '';
        }
        games.forEach((g, i) => {
            const btn = document.createElement('button');
            btn.className = 'game-select-btn' + (i === 0 ? ' active' : '');
            btn.dataset.game = g.key;
            btn.innerHTML = `<span class="material-icons">${g.icon}</span> ${g.label}`;
            btn.onclick = function() {
                playSound('click');
                if (selector) {
                    selector.querySelectorAll('.game-select-btn').forEach(b => b.classList.remove('active'));
                }
                btn.classList.add('active');
                showGame(g.key, surah, start, end);
            };
            if (selector) {
                selector.appendChild(btn);
            }
        });
        if (gameArea) {
            gameArea.querySelectorAll('.game-container').forEach(e => e.style.display = 'none');
        }
        games.forEach((g, i) => {
            let div = document.getElementById(`${g.key}-game`);
            if (!div) {
                div = document.createElement('div');
                div.id = `${g.key}-game`;
                div.className = 'game-container';
                if (gameArea) {
                    gameArea.appendChild(div);
                    console.log(`Created game container: ${g.key}-game`); // للتصحيح
                }
            }
            div.style.display = (i === 0 ? 'block' : 'none');
            console.log(`Game ${g.key} display: ${div.style.display}`); // للتصحيح
        });
        showGame(games[0].key, surah, start, end);
        setupMeaningMatchGame(surah, start, end);
        setupWheelGame(surah, start, end);
        setupVerseOrderGame(surah, start, end);
        setupVerseCascadeGame(surah, start, end);
    }

    function showGame(game, surah, start, end) {
        cleanupActiveGame(); // Ensure any active game is cleaned up before showing a new one
        
        // إخفاء جميع الألعاب
        const gameContainers = document.querySelectorAll('.game-container');
        gameContainers.forEach(g => g.style.display = 'none');
        
        // عند تغيير اللعبة، امسح سؤال العجلة إذا كان ظاهرًا
        const wheelQuestionArea = document.getElementById('wheel-question-area');
        if (wheelQuestionArea) wheelQuestionArea.innerHTML = '';
        
        // إظهار اللعبة المختارة
        const el = document.getElementById(`${game}-game`);
        if (el) {
            el.style.display = 'block';
            console.log(`Showing game: ${game}`); // للتصحيح
        } else {
            console.error(`Game container not found: ${game}-game`); // للتصحيح
        }

        // إعادة تهيئة اللعبة المختارة
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

    function setupVerseCascadeGame(surah, start, end) {
        const container = document.getElementById('verse-cascade-game');
        if (!container) return;

        let score, lives, currentVerseIndex, wordsToCatch, nextWordIndex, fallingWords, lastSpawnTime = 0;

        const versesToShow = surah.verses.filter(v => v.id >= start && v.id <= end && v.text.split(' ').length >= 2);

        if (versesToShow.length === 0) {
            if (container) {
                container.innerHTML = '<p>لا توجد آيات مناسبة لهذه اللعبة في النطاق المحدد.</p>';
            }
            return;
        }

        const difficultySettings = {
            easy: { speed: 6, interval: 1400 },
            medium: { speed: 5, interval: 1100 },
            hard: { speed: 4, interval: 800 }
        };

        function renderDifficultySelection() {
            cleanupGame();
            container.innerHTML = `
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
            container.innerHTML = `
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
            lives = 3;
            currentVerseIndex = 0;
            fallingWords = []; // Re-initialize for good measure
            updateScoreDisplay();
            updateLivesDisplay();
            loadVerse();
            // Start the game loop only after all setup is done
            verseCascadeGameLoopId = requestAnimationFrame(gameLoop);
        }

        function cleanupGame() {
            if (verseCascadeGameLoopId) {
                cancelAnimationFrame(verseCascadeGameLoopId);
                verseCascadeGameLoopId = null;
            }
            const cascadeArea = document.getElementById('cascade-area');
            if (cascadeArea) cascadeArea.innerHTML = ''; // Clear all word elements from DOM
            fallingWords = []; // Clear the array of falling word objects
        }

        function gameLoop(timestamp) {
            if (lives <= 0 || verseCascadeGameLoopId === null) { // Added check for null gameLoopId
                return; // Stop the loop if game is over or explicitly stopped
            }

            if (timestamp - lastSpawnTime > difficultySettings[difficulty].interval) {
                lastSpawnTime = timestamp;
                spawnWord();
            }

            verseCascadeGameLoopId = requestAnimationFrame(gameLoop);
        }

        function loadVerse() {
            // Clear all existing falling words before loading a new verse
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
            if (lives <= 0 || verseCascadeGameLoopId === null) return; // Do not spawn if game is not active
            const cascadeArea = document.getElementById('cascade-area');
            if (!cascadeArea) return;

            const nextWord = wordsToCatch[nextWordIndex];
            const isNextWordFalling = fallingWords.some(fw => fw.text === nextWord);

            let wordToSpawn;
            // Always prioritize spawning the next required word if it's not already falling
            if (!isNextWordFalling && nextWordIndex < wordsToCatch.length) {
                wordToSpawn = nextWord;
            } else {
                // Otherwise, spawn a random word from the current verse
                wordToSpawn = wordsToCatch[Math.floor(Math.random() * wordsToCatch.length)];
            }
            createWordElement(wordToSpawn);
        }

        function createWordElement(word) {
            const cascadeArea = document.getElementById('cascade-area');
            if (!cascadeArea || verseCascadeGameLoopId === null) return; // Do not create if game is not active

            const wordEl = document.createElement('div');
            wordEl.className = 'cascade-word';
            wordEl.textContent = word;
            
            // Append first to measure width accurately
            cascadeArea.appendChild(wordEl);

            const wordWidth = wordEl.offsetWidth;
            const maxRight = cascadeArea.offsetWidth - wordWidth - 10; // 10px padding from edge
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
                    score += 25; // Bonus
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
                display.innerHTML = `<small>${verseText}</small><br>${caughtText} ...`;
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

    function getRandomUniqueIndexes(arrayLength, count, excludeIndexes = []) {
        // تُعيد مصفوفة من أرقام فريدة عشوائية من 0 إلى arrayLength-1، مع استبعاد excludeIndexes
        const available = [];
        for (let i = 0; i < arrayLength; i++) {
            if (!excludeIndexes.includes(i)) available.push(i);
        }
        const result = [];
        while (result.length < count && available.length > 0) {
            const idx = Math.floor(Math.random() * available.length);
            result.push(available[idx]);
            available.splice(idx, 1);
        }
        return result;
    }

    function getRandomConsecutiveVerses(verses, count) {
        if (verses.length <= count) return verses.slice();
        const maxStart = verses.length - count;
        const startIdx = Math.floor(Math.random() * (maxStart + 1));
        return verses.slice(startIdx, startIdx + count);
    }

    function setupWheelGame(surah, start, end) {
        const container = document.getElementById('wheel-game');
        if (!container) return;
        container.innerHTML = '';
        if (!surah.verses || surah.verses.length < 1) {
            container.innerHTML = '<p>لا توجد آيات كافية لهذه اللعبة.</p>';
            return;
        }
        // اختيار آيات عشوائية بدون تكرار مطلق في نفس الجلسة
        const versesInRange = surah.verses.filter(v => v.id >= start && v.id <= end);
        // إذا انتهت الآيات المتاحة، أعد تعيين القائمة
        if (usedWheelVerseIndexes.length >= versesInRange.length) usedWheelVerseIndexes = [];
        // استبعد الآيات المستخدمة
        const availableIndexes = [];
        for (let i = 0; i < versesInRange.length; i++) {
            if (!usedWheelVerseIndexes.includes(i)) availableIndexes.push(i);
        }
        // اختر حتى 8 آيات فريدة
        let verseIndexes = [];
        while (verseIndexes.length < 8 && availableIndexes.length > 0) {
            const idx = Math.floor(Math.random() * availableIndexes.length);
            verseIndexes.push(availableIndexes[idx]);
            usedWheelVerseIndexes.push(availableIndexes[idx]);
            availableIndexes.splice(idx, 1);
        }
        if (verseIndexes.length < 5) {
            // إذا لم نجد 5 آيات، أعد تعيين القائمة واختر من جديد
            usedWheelVerseIndexes = [];
            for (let i = 0; i < versesInRange.length && verseIndexes.length < 5; i++) {
                if (!verseIndexes.includes(i)) verseIndexes.push(i);
            }
        }
        let questions = [];
        for (let i = 0; i < verseIndexes.length; i++) {
            const verse = versesInRange[verseIndexes[i]];
            const verseTextWithoutBasmallah = removeBasmallahFromVerse(verse.text, surah.id);
            if (!verseTextWithoutBasmallah) continue;
            const words = verseTextWithoutBasmallah.split(' ');
            if (words.length > 3) {
                const blankIndex = Math.floor(Math.random() * (words.length - 2)) + 1;
                const answer = words[blankIndex];
                let options = [answer];
                while (options.length < 4) {
                    const randomVerse = versesInRange[Math.floor(Math.random() * versesInRange.length)];
                    const randomVerseText = removeBasmallahFromVerse(randomVerse.text, surah.id);
                    if (randomVerseText) {
                        const randomWord = randomVerseText.split(' ')[0];
                        if (!options.includes(randomWord)) options.push(randomWord);
                    }
                }
                questions.push({ type: 'fill-blank', verse: verseTextWithoutBasmallah, blankIndex, answer, options: [...options].sort(() => 0.5 - Math.random()) });
            }
        }
        if (questions.length < 5) questions = questions.concat(questions).slice(0, 5);
        if (questions.length === 0) {
            if (container) {
                container.innerHTML = '<p>لا توجد أسئلة كافية لهذه اللعبة.</p>';
            }
            return;
        }
        // ترتيب العناصر: العجلة، ثم صندوق السؤال، ثم زر العجلة
        if (container) {
            container.innerHTML = `
                <p>اضغط زر "أدر العجلة" لتحديد السؤال!</p>
                <div id="wheel-area"></div>
                <div id="wheel-question-area"></div>
                <button id="spin-wheel-btn">أدر العجلة</button>
                <div id="wheel-score"></div>
                <button id="reset-wheel-btn" class="btn-reset"><span class="material-icons">refresh</span> إعادة اللعبة</button>
            `;
        }
        const wheelArea = document.getElementById('wheel-area');
        const numOptions = questions.length;
        const angle = 360 / numOptions;
        const colors = ['#fbc02d', '#4fc3f7', '#43e97b', '#38f9d7', '#ff6f91', '#6a1b9a', '#d81b60', '#00897b'];
        
        let wheelPaths = '';
        let wheelTexts = '';

        for (let i = 0; i < numOptions; i++) {
            const startAngle = i * angle;
            const endAngle = (i + 1) * angle;
            const largeArc = angle > 180 ? 1 : 0;
            
            const x1 = 160 + 150 * Math.cos(Math.PI / 180 * (startAngle - 90));
            const y1 = 160 + 150 * Math.sin(Math.PI / 180 * (startAngle - 90));
            const x2 = 160 + 150 * Math.cos(Math.PI / 180 * (endAngle - 90));
            const y2 = 160 + 150 * Math.sin(Math.PI / 180 * (endAngle - 90));
            
            const color = colors[i % colors.length];
            wheelPaths += `<path d="M160,160 L${x1},${y1} A150,150 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}" stroke="white" stroke-width="4"/>`;

            const midAngle = startAngle + angle / 2;
            const textX = 160 + 105 * Math.cos(Math.PI / 180 * (midAngle - 90));
            const textY = 160 + 105 * Math.sin(Math.PI / 180 * (midAngle - 90));
            
            wheelTexts += `<text x="${textX}" y="${textY}" fill="white" font-family="Cairo, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" dominant-baseline="central" transform="rotate(${midAngle}, ${textX}, ${textY})">?</text>`;
        }

        const wheelSVG = `
            <div class="wheel-container">
                <svg id="wheel-svg" width="320" height="320" viewBox="0 0 320 320">
                    <defs>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.15"/>
                        </filter>
                    </defs>
                    <g class="wheel-body" style="filter: url(#shadow);">
                        ${wheelPaths}
                    </g>
                    <g class="wheel-text">
                        ${wheelTexts}
                    </g>
                    <circle cx="160" cy="160" r="35" fill="white" stroke="#E0E0E0" stroke-width="5" class="wheel-center-pin"/>
                    <circle cx="160" cy="160" r="10" fill="var(--primary-color, #0d47a1)" class="wheel-center-dot"/>
                </svg>
                <div class="wheel-pointer"></div>
            </div>
        `;

        if (wheelArea) {
            wheelArea.innerHTML = wheelSVG;
        }
        let spinning = false;
        const spinBtn = document.getElementById('spin-wheel-btn');
        if (spinBtn) {
            spinBtn.onclick = function() {
                if (spinning) return;
                spinning = true;
                playSound('wheel_start_spin');
                const svg = document.getElementById('wheel-svg');
                
                const currentRotationMatch = svg.style.transform.match(/rotate\(([-]?\d*\.?\d*)deg\)/);
                const currentRotation = currentRotationMatch ? parseFloat(currentRotationMatch[1]) : 0;

                const randomSpins = Math.floor(Math.random() * 3) + 4; // 4 to 6 full spins
                const selectedIdx = Math.floor(Math.random() * numOptions);
                const stopAngle = selectedIdx * angle + (angle / 2);
                const finalRotation = (360 * randomSpins) + stopAngle;

                svg.style.transition = 'transform 5s cubic-bezier(0.1, 0.7, 0.3, 1)';
                svg.style.transform = `rotate(${finalRotation}deg)`;

                setTimeout(() => {
                    spinning = false;
                    playSound('spin_stop');
                    showWheelQuestion(questions[selectedIdx]);
                }, 5100);
            };
        }
        function showWheelQuestion(q) {
            const qDiv = document.getElementById('wheel-question-area');
            if (!qDiv) return;
            const words = q.verse.split(' ');
            const displayWords = words.map((w, i) => i === q.blankIndex ? '<span class="blank-slot"></span>' : w);
            qDiv.innerHTML = `<div class="verse-question">${displayWords.join(' ')}</div><div id="wheel-options"></div><div id="wheel-feedback"></div>`;
            const optsDiv = document.getElementById('wheel-options');
            if (optsDiv) {
                q.options.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.className = 'option-btn';
                    btn.textContent = opt;
                    btn.onclick = function() {
                        optsDiv.querySelectorAll('button').forEach(b => b.disabled = true);
                        if (opt === q.answer) {
                            btn.classList.add('correct');
                            playSound('correct');
                        } else {
                            btn.classList.add('incorrect');
                            playSound('incorrect');
                        }
                        setTimeout(() => { qDiv.innerHTML = ''; }, 1500);
                    };
                    optsDiv.appendChild(btn);
                });
            }
        }
        const resetWheelBtn = document.getElementById('reset-wheel-btn');
        if (resetWheelBtn) {
            resetWheelBtn.onclick = () => {
                usedWheelVerseIndexes = [];
                setupWheelGame(surah, start, end);
                playSound('navigate');
            };
        }
    }

    function setupVerseOrderGame(surah, start, end) {
        const container = document.getElementById('verse-order-game');
        if (!container) return;
        container.innerHTML = ''; // Clear previous game
        const versesToShow = surah.verses.filter(v => v.id >= start && v.id <= end);

        if (versesToShow.length < 3) {
            container.innerHTML = '<p>لا توجد آيات كافية لهذه اللعبة. حاول تحديد نطاق أكبر.</p>';
            return;
        }

        // اختيار آيات متتالية عشوائية
        const count = Math.min(5, versesToShow.length);
        const gameVerses = getRandomConsecutiveVerses(versesToShow, count);
        const correctOrder = gameVerses.map(v => removeBasmallahFromVerse(v.text, surah.id)).filter(text => text);
        const shuffledOrder = [...correctOrder].sort(() => Math.random() - 0.5);

        container.innerHTML = `
            <p>قم بسحب وإفلات الآيات لترتيبها بالترتيب الصحيح.</p>
            <div id="verse-order-area"></div>
            <button id="check-order-btn" class="btn-check">تحقق من الترتيب</button>
            <button id="reset-verse-order-btn" class="btn-reset"><span class="material-icons">refresh</span> إعادة اللعبة</button>
            <div id="verse-order-feedback"></div>
            <div id="verse-order-score"></div>
        `;

        const verseArea = document.getElementById('verse-order-area');
        
        shuffledOrder.forEach(verseText => {
            const verseDiv = document.createElement('div');
            verseDiv.className = 'verse-order-item';
            verseDiv.textContent = verseText;
            verseArea.appendChild(verseDiv);
            
            // Desktop Drag & Drop
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

            // Mobile Touch Drag & Drop
            verseDiv.addEventListener('touchstart', (e) => {
                draggedItem = verseDiv;
                verseDiv.classList.add('dragging');
                playSound('drag_start');
            }, { passive: true });

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
            let isCorrect = true;
            for (let i = 0; i < correctOrder.length; i++) {
                if (userOrder[i] !== correctOrder[i]) {
                    isCorrect = false;
                    break;
                }
            }

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
            setupVerseOrderGame(surah, start, end);
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

    // Sidebar toggle for mobile
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function showSidebar() {
        if (sidebar) sidebar.classList.add('sidebar-open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }
    function hideSidebar() {
        if (sidebar) sidebar.classList.remove('sidebar-open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }
    if (sidebarToggleBtn && sidebar && sidebarOverlay) {
        sidebarToggleBtn.addEventListener('click', showSidebar);
        sidebarOverlay.addEventListener('click', hideSidebar);
    }
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            hideSidebar();
        }
    });

    // تفعيل التبويبات الرئيسية
    function activateTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
      const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
      const sec = document.getElementById(`tab-${tab}`);
      if (btn) btn.classList.add('active');
      if (sec) sec.classList.add('active');
    }
    // تفعيل تبويبات الأنشطة العامة
    function activateActivitiesTab(tab) {
      document.querySelectorAll('.activities-tab-btn').forEach(btn => btn.classList.remove('active'));
      const btn = document.querySelector(`.activities-tab-btn[data-tab="${tab}"]`);
      if (btn) btn.classList.add('active');
      // إظهار محتوى التبويب المناسب (يمكن التوسعة لاحقًا)
      const content = document.getElementById('activities-content');
      if (content) {
        if (tab === 'games') {
          content.innerHTML = '<div id="game-area">(سيتم عرض الألعاب هنا بناءً على السور المختارة)</div>';
          // TODO: ربط منطق الألعاب مع السور المختارة لاحقًا
        } else if (tab === 'tafsir') {
          content.innerHTML = '<div id="activities-tafsir-area">(تفسير الأنشطة العامة)</div>';
        }
      }
    }
    // تفعيل القائمة الجانبية
    function activateSidebar(section) {
      document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
      const btn = document.querySelector(`.sidebar-btn[data-section="${section}"]`);
      if (btn) btn.classList.add('active');
      // إظهار/إخفاء الأقسام مع التأكد من وجود العناصر
      const mainBar = document.getElementById('main-bar');
      const tabQuran = document.getElementById('tab-quran');
      const tabTafsir = document.getElementById('tab-tafsir');
      const tabActivities = document.getElementById('tab-activities');
      const generalActivities = document.getElementById('general-activities-section');
      const settingsSection = document.getElementById('settings-section');
      // إخفاء جميع الأقسام أولاً
      if (mainBar) mainBar.style.display = 'none';
      if (tabQuran) tabQuran.style.display = 'none';
      if (tabTafsir) tabTafsir.style.display = 'none';
      if (tabActivities) tabActivities.style.display = 'none';
      if (generalActivities) generalActivities.style.display = 'none';
      if (settingsSection) settingsSection.style.display = 'none';
      
      if (section === 'home') {
        if (mainBar) mainBar.style.display = '';
        if (tabQuran) tabQuran.style.display = '';
        if (tabTafsir) tabTafsir.style.display = '';
        if (tabActivities) tabActivities.style.display = '';
        activateTab('quran');
      } else if (section === 'general-activities') {
        if (generalActivities) generalActivities.style.display = '';
        activateActivitiesTab('games');
      } else if (section === 'settings') {
        if (settingsSection) {
          console.log('Opening settings section');
          settingsSection.style.display = 'block';
          // تحميل وتطبيق الإعدادات عند فتح صفحة الإعدادات
          loadSettings();
          setupSettingsEventListeners();
        } else {
          console.error('Settings section not found');
        }
      }
    }
    // تفعيل التبويبات عند الضغط
    if (document.getElementById('main-tabs')) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          activateTab(this.dataset.tab);
        });
      });
    }
    // تفعيل تبويبات الأنشطة العامة عند الضغط
    if (document.querySelector('.activities-tabs')) {
      document.querySelectorAll('.activities-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          activateActivitiesTab(this.dataset.tab);
        });
      });
    }
    // تفعيل القائمة الجانبية عند الضغط
    if (document.querySelector('.sidebar')) {
      document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          activateSidebar(this.dataset.section);
        });
      });
    }
    
    // إعدادات التطبيق
    let appSettings = {
        theme: 'classic',
        isMuted: false,
        textSize: 'medium',
        gameDifficulty: 'medium'
    };

    // تحميل الإعدادات من localStorage
    function loadSettings() {
        const saved = localStorage.getItem('quranExplorerSettings');
        if (saved) {
            appSettings = { ...appSettings, ...JSON.parse(saved) };
        }
        applySettings();
    }

    // حفظ الإعدادات
    function saveSettings() {
        localStorage.setItem('quranExplorerSettings', JSON.stringify(appSettings));
    }

    // تطبيق الإعدادات
    function applySettings() {
        // تطبيق الثيم
        document.body.className = `theme-${appSettings.theme}`;
        
        // تطبيق حجم النص
        document.documentElement.style.setProperty('--text-size-base', 
            appSettings.textSize === 'small' ? '0.9rem' :
            appSettings.textSize === 'medium' ? '1.1rem' :
            appSettings.textSize === 'large' ? '1.3rem' : '1.5rem'
        );
        
        // تطبيق كتم الصوت
        if (appSettings.isMuted) {
            document.body.classList.add('muted');
        } else {
            document.body.classList.remove('muted');
        }
        
        // تحديث واجهة الإعدادات
        updateSettingsUI();
    }

    // تحديث واجهة الإعدادات
    function updateSettingsUI() {
        console.log('Updating settings UI');
        const themeDropdown = document.getElementById('settings-theme-dropdown');
        const muteBtn = document.getElementById('settings-mute-btn');
        const textSizeDropdown = document.getElementById('text-size-dropdown');
        const difficultyDropdown = document.getElementById('game-difficulty-dropdown');
        
        console.log('Found elements:', {
            themeDropdown: !!themeDropdown,
            muteBtn: !!muteBtn,
            textSizeDropdown: !!textSizeDropdown,
            difficultyDropdown: !!difficultyDropdown
        });
        
        if (themeDropdown) themeDropdown.value = appSettings.theme;
        if (textSizeDropdown) textSizeDropdown.value = appSettings.textSize;
        if (difficultyDropdown) difficultyDropdown.value = appSettings.gameDifficulty;
        
        if (muteBtn) {
            const icon = muteBtn.querySelector('.material-icons');
            if (appSettings.isMuted) {
                icon.textContent = 'volume_off';
                muteBtn.classList.add('muted');
            } else {
                icon.textContent = 'volume_up';
                muteBtn.classList.remove('muted');
            }
        }
    }

    // إعداد مستمعي أحداث الإعدادات
    function setupSettingsEventListeners() {
        console.log('Setting up settings event listeners');
        const themeDropdown = document.getElementById('settings-theme-dropdown');
        const muteBtn = document.getElementById('settings-mute-btn');
        const textSizeDropdown = document.getElementById('text-size-dropdown');
        const difficultyDropdown = document.getElementById('game-difficulty-dropdown');
        
        console.log('Setting up listeners for:', {
            themeDropdown: !!themeDropdown,
            muteBtn: !!muteBtn,
            textSizeDropdown: !!textSizeDropdown,
            difficultyDropdown: !!difficultyDropdown
        });
        
        if (themeDropdown) {
            themeDropdown.addEventListener('change', function() {
                console.log('Theme changed to:', this.value);
                appSettings.theme = this.value;
                applySettings();
                saveSettings();
            });
        }
        
        if (muteBtn) {
            muteBtn.addEventListener('click', function() {
                console.log('Mute button clicked');
                appSettings.isMuted = !appSettings.isMuted;
                applySettings();
                saveSettings();
            });
        }
        
        if (textSizeDropdown) {
            textSizeDropdown.addEventListener('change', function() {
                console.log('Text size changed to:', this.value);
                appSettings.textSize = this.value;
                applySettings();
                saveSettings();
            });
        }
        
        if (difficultyDropdown) {
            difficultyDropdown.addEventListener('change', function() {
                console.log('Difficulty changed to:', this.value);
                appSettings.gameDifficulty = this.value;
                saveSettings();
            });
        }
    }
    
    // عند تحميل الصفحة، افتراضيًا الرئيسية
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM Content Loaded');
      // تحميل الإعدادات أولاً
      loadSettings();
      // تأكد من تحميل جميع العناصر
      setTimeout(() => {
        activateSidebar('home');
      }, 100);
    });

    // تفعيل اختيار السورة ونطاق الآيات
    if (surahSelect && verseStartInput && verseEndInput) {
      surahSelect.addEventListener('change', () => {
        cleanupActiveGame && cleanupActiveGame();
        loadAndDisplaySurah && loadAndDisplaySurah(surahSelect.value);
      });
      verseStartInput.addEventListener('change', () => {
        cleanupActiveGame && cleanupActiveGame();
        loadSurahRange && loadSurahRange();
      });
      verseEndInput.addEventListener('change', () => {
        cleanupActiveGame && cleanupActiveGame();
        loadSurahRange && loadSurahRange();
      });
    }

    // ملاحظات للتوسعة:
    // - يمكن تطوير واجهة الأنشطة العامة لاحقًا
    // - يمكن إضافة دعم لتغيير الثيمات أو تخصيص الألوان
    // دالة توحيد نص البسملة (إزالة التشكيل وتوحيد الرموز)
    function normalizeBasmallah(text) {
        // إزالة التشكيل والرموز الخاصة
        let normalized = text
            .normalize("NFD")
            .replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, "") // إزالة كل أنواع التشكيل
            .replace(/ـ/g, "") // إزالة الكشيدة
            .replace(/ٱ/g, "ا") // توحيد الألف الصغيرة
            .replace(/ٰ/g, "ا") // توحيد الألف الممدودة
            .replace(/\s+/g, ""); // إزالة المسافات
        return normalized;
    }

    // تحميل السورة وعرضها في جميع التبويبات
    async function loadAndDisplayAll(surahId, start, end) {
      currentSurahId = surahId;
      currentStart = start;
      currentEnd = end;
      await loadAndDisplaySurah(surahId);
      if (currentSurahData) {
        displaySurah(currentSurahData, start, end);
        displayTafsir(currentSurahData, start, end);
        displayGames(currentSurahData, start, end);
      }
    }
    // تحديث التبويبات عند التغيير
    function updateTabs() {
      if (currentSurahData) {
        displaySurah(currentSurahData, currentStart, currentEnd);
        displayTafsir(currentSurahData, currentStart, currentEnd);
        displayGames(currentSurahData, currentStart, currentEnd);
      }
    }
    // تفعيل التبويبات الرئيسية
    function activateTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
      const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
      const sec = document.getElementById(`tab-${tab}`);
      if (btn) btn.classList.add('active');
      if (sec) sec.classList.add('active');
      // عرض المحتوى المناسب
      if (tab === 'quran' && currentSurahData) {
        displaySurah(currentSurahData, currentStart, currentEnd);
      } else if (tab === 'tafsir' && currentSurahData) {
        displayTafsir(currentSurahData, currentStart, currentEnd);
      } else if (tab === 'activities' && currentSurahData) {
        displayGames(currentSurahData, currentStart, currentEnd);
      }
    }
    // تفعيل تبويبات الأنشطة العامة
    function activateActivitiesTab(tab) {
      document.querySelectorAll('.activities-tab-btn').forEach(btn => btn.classList.remove('active'));
      const btn = document.querySelector(`.activities-tab-btn[data-tab="${tab}"]`);
      if (btn) btn.classList.add('active');
      const content = document.getElementById('activities-content');
      if (content) {
        if (tab === 'games') {
          displayGeneralGames();
        } else if (tab === 'tafsir') {
          content.innerHTML = '<div id="activities-tafsir-area">(تفسير الأنشطة العامة)</div>';
        }
      }
    }

    // دالة عرض الألعاب العامة
    function displayGeneralGames() {
      const content = document.getElementById('activities-content');
      if (!content) return;

      content.innerHTML = `
        <div class="general-games-container">
          <h2>ألعاب القرآن العامة</h2>
          <p class="games-description">اختر لعبة من الألعاب التالية للاستمتاع بتعلم القرآن الكريم</p>
          
          <div class="games-grid">
            <div class="game-card" data-game="wheel">
              <div class="game-icon">🎯</div>
              <h3>العجلة الدوارة</h3>
              <p>أدر العجلة واجب على الأسئلة المتعلقة بالقرآن الكريم</p>
              <button class="play-game-btn" onclick="startGeneralGame('wheel')">العب الآن</button>
            </div>
            
            <div class="game-card" data-game="verse-order">
              <div class="game-icon">📝</div>
              <h3>ترتيب الآيات</h3>
              <p>رتب الآيات بالترتيب الصحيح لتحسين حفظك</p>
              <button class="play-game-btn" onclick="startGeneralGame('verse-order')">العب الآن</button>
            </div>
            
            <div class="game-card" data-game="verse-cascade">
              <div class="game-icon">🌊</div>
              <h3>شلال الآيات</h3>
              <p>التقط الكلمات المتساقطة لتكوين الآيات بشكل صحيح</p>
              <button class="play-game-btn" onclick="startGeneralGame('verse-cascade')">العب الآن</button>
            </div>
          </div>
        </div>
      `;
    }

    // دالة بدء اللعبة العامة
    function startGeneralGame(gameType) {
      // الحصول على السور المختارة
      const selectedSurahs = getSelectedSurahs();
      
      if (selectedSurahs.length === 0) {
        alert('يرجى اختيار سورة واحدة على الأقل من القائمة');
        return;
      }

      // اختيار سورة عشوائية من السور المختارة
      const randomSurah = selectedSurahs[Math.floor(Math.random() * selectedSurahs.length)];
      
      // تحميل السورة وعرض اللعبة
      loadAndDisplaySurah(randomSurah.id).then(() => {
        if (currentSurahData) {
          const start = 1;
          const end = currentSurahData.verses.length;
          
          // عرض اللعبة المختارة
          const content = document.getElementById('activities-content');
          if (content) {
            content.innerHTML = `
              <div class="game-container-wrapper">
                <div class="game-header">
                  <h3>${getGameTitle(gameType)} - سورة ${currentSurahData.name}</h3>
                  <button class="back-to-games-btn" onclick="displayGeneralGames()">
                    <span class="material-icons">arrow_back</span>
                    العودة للألعاب
                  </button>
                </div>
                <div id="general-game-area"></div>
              </div>
            `;
            
            // إعداد اللعبة المختارة
            setupGeneralGame(gameType, currentSurahData, start, end);
          }
        }
      });
    }

    // دالة الحصول على السور المختارة
    function getSelectedSurahs() {
      const selectedSurahs = [];
      
      // من القائمة المتعددة
      if (activitiesSurahSelect) {
        Array.from(activitiesSurahSelect.selectedOptions).forEach(option => {
          const surah = surahIndex.find(s => s.id === parseInt(option.value));
          if (surah) selectedSurahs.push(surah);
        });
      }
      
      // من نطاق من-إلى
      if (activitiesSurahFrom && activitiesSurahTo) {
        const fromId = parseInt(activitiesSurahFrom.value);
        const toId = parseInt(activitiesSurahTo.value);
        
        if (fromId && toId) {
          for (let i = fromId; i <= toId; i++) {
            const surah = surahIndex.find(s => s.id === i);
            if (surah && !selectedSurahs.find(s => s.id === i)) {
              selectedSurahs.push(surah);
            }
          }
        }
      }
      
      return selectedSurahs;
    }

    // دالة الحصول على عنوان اللعبة
    function getGameTitle(gameType) {
      const titles = {
        'wheel': 'العجلة الدوارة',
        'verse-order': 'ترتيب الآيات',
        'verse-cascade': 'شلال الآيات'
      };
      return titles[gameType] || 'لعبة';
    }

    // دالة إعداد اللعبة العامة
    function setupGeneralGame(gameType, surah, start, end) {
      const gameArea = document.getElementById('general-game-area');
      if (!gameArea) return;

      switch (gameType) {
        case 'wheel':
          setupWheelGame(surah, start, end);
          // نقل محتوى العجلة إلى المنطقة العامة
          const wheelGame = document.getElementById('wheel-game');
          if (wheelGame) {
            gameArea.innerHTML = wheelGame.innerHTML;
          }
          break;
          
        case 'verse-order':
          setupVerseOrderGame(surah, start, end);
          // نقل محتوى ترتيب الآيات إلى المنطقة العامة
          const verseOrderGame = document.getElementById('verse-order-game');
          if (verseOrderGame) {
            gameArea.innerHTML = verseOrderGame.innerHTML;
          }
          break;
          
        case 'verse-cascade':
          setupVerseCascadeGame(surah, start, end);
          // نقل محتوى شلال الآيات إلى المنطقة العامة
          const verseCascadeGame = document.getElementById('verse-cascade-game');
          if (verseCascadeGame) {
            gameArea.innerHTML = verseCascadeGame.innerHTML;
          }
          break;
      }
    }
    // عند تحميل الصفحة: حمّل السورة الافتراضية
    window.addEventListener('DOMContentLoaded', async () => {
      if (surahSelect && surahSelect.options.length > 0) {
        const surahId = surahSelect.value;
        const start = parseInt(verseStartInput.value) || 1;
        const end = parseInt(verseEndInput.value) || 1;
        await loadAndDisplayAll(surahId, start, end);
      }
    });
    // عند تغيير السورة أو النطاق
    if (surahSelect && verseStartInput && verseEndInput) {
      surahSelect.addEventListener('change', async () => {
        const surahId = surahSelect.value;
        const start = parseInt(verseStartInput.value) || 1;
        const end = parseInt(verseEndInput.value) || 1;
        await loadAndDisplayAll(surahId, start, end);
      });
      verseStartInput.addEventListener('change', async () => {
        const surahId = surahSelect.value;
        const start = parseInt(verseStartInput.value) || 1;
        const end = parseInt(verseEndInput.value) || 1;
        await loadAndDisplayAll(surahId, start, end);
      });
      verseEndInput.addEventListener('change', async () => {
        const surahId = surahSelect.value;
        const start = parseInt(verseStartInput.value) || 1;
        const end = parseInt(verseEndInput.value) || 1;
        await loadAndDisplayAll(surahId, start, end);
      });
    }
    // تفعيل نظام اختيار السور في الأنشطة العامة (قائمة متعددة أو من-إلى)
    if (activitiesSurahSelect && typeof surahIndex !== 'undefined') {
      activitiesSurahSelect.innerHTML = '';
      surahIndex.forEach(surah => {
        const option = document.createElement('option');
        option.value = surah.id;
        option.textContent = `${surah.id}. ${surah.name}`;
        if (activitiesSurahSelect) {
          activitiesSurahSelect.appendChild(option);
        }
      });
    }
    if (activitiesSurahFrom && activitiesSurahTo && typeof surahIndex !== 'undefined') {
      if (activitiesSurahFrom) activitiesSurahFrom.innerHTML = '';
      if (activitiesSurahTo) activitiesSurahTo.innerHTML = '';
      surahIndex.forEach(surah => {
        const optionFrom = document.createElement('option');
        optionFrom.value = surah.id;
        optionFrom.textContent = `${surah.id}. ${surah.name}`;
        if (activitiesSurahFrom) {
          activitiesSurahFrom.appendChild(optionFrom);
        }
        const optionTo = document.createElement('option');
        optionTo.value = surah.id;
        optionTo.textContent = `${surah.id}. ${surah.name}`;
        if (activitiesSurahTo) {
          activitiesSurahTo.appendChild(optionTo);
        }
      });
    }
    // ملاحظات للتوسعة:
    // - يمكن تطوير واجهة الأنشطة العامة لاحقًا
    // - يمكن إضافة دعم لتغيير الثيمات أو تخصيص الألوان

    // إضافة الدوال إلى النطاق العام للوصول إليها من HTML
    window.startGeneralGame = startGeneralGame;
    window.displayGeneralGames = displayGeneralGames;

    initializeApp();
});
