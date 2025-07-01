document.addEventListener('DOMContentLoaded', () => {
    let draggedItem = null;

    // Main Views
    const explorerView = document.getElementById('explorer-view');

    // Surah Explorer Elements
    const surahSelect = document.getElementById('surah-select');
    const verseStartInput = document.getElementById('verse-start');
    const verseEndInput = document.getElementById('verse-end');
    const contentNavButtons = document.querySelectorAll('#content-nav .nav-btn');
    const contentSections = document.querySelectorAll('.content-section');
    
    // Theme
    const themeDropdown = document.getElementById('theme-dropdown');
    const themeDropdownMobile = document.getElementById('theme-dropdown-mobile');
    const body = document.body;
    let lastSelectedTheme = body.className || 'theme-classic';

    let surahList = [];

    // Sound Functionality
    const muteBtn = document.getElementById('mute-btn');
    const muteBtnMobile = document.getElementById('mute-btn-mobile');
    let isMuted = false;
    let audioCtx = null;

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
    function initializeApp() {
        loadSurahList();
        populateSurahSelect();
        setupEventListeners();
        updateMuteButtonIcon(); // Set initial mute button icon
        if (surahList.length > 0) {
            displayFullSurah(0);
        }
        if (themeDropdown) {
            themeDropdown.value = lastSelectedTheme;
        }
        if (themeDropdownMobile) {
            themeDropdownMobile.value = lastSelectedTheme;
        }
    }

    function loadSurahList() {
        const loadedSurahs = [];
        for (let i = 1; i <= 114; i++) {
            const surahVar = window[`surah_${i}`];
            if (typeof surahVar !== 'undefined') {
                loadedSurahs.push(surahVar);
            }
        }
        surahList = loadedSurahs.sort((a, b) => a.id - b.id);
    }

    function populateSurahSelect() {
        surahList.forEach((surah, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${surah.id}. ${surah.name}`;
            surahSelect.appendChild(option);
        });
    }

    function displayFullSurah(surahIndex) {
        const surah = surahList[surahIndex];
        if (!surah) return;
        const startVerse = 1;
        const endVerse = surah.verses.length;
        verseStartInput.value = startVerse;
        verseStartInput.max = endVerse;
        verseEndInput.value = endVerse;
        verseEndInput.max = endVerse;
        displaySurah(surahIndex, startVerse, endVerse);
        displayTafsir(surahIndex, startVerse, endVerse);
        displayGames(surahIndex, startVerse, endVerse);
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

    function loadSurahRange() {
        const surahIndex = surahSelect.value;
        if (!surahList[surahIndex]) return;
        const startVerse = parseInt(verseStartInput.value) || 1;
        const endVerse = parseInt(verseEndInput.value) || surahList[surahIndex].verses.length;
        displaySurah(surahIndex, startVerse, endVerse);
        displayTafsir(surahIndex, startVerse, endVerse);
        displayGames(surahIndex, startVerse, endVerse);
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        // Initialize audio on the first user interaction
        document.body.addEventListener('click', initAudio, { once: true });
        document.body.addEventListener('keydown', initAudio, { once: true });

        // Surah and Verse Selection
        surahSelect.addEventListener('change', () => {
            playSound('navigate');
            displayFullSurah(surahSelect.value);
        });
        verseStartInput.addEventListener('change', () => {
            playSound('click');
            loadSurahRange();
        });
        verseEndInput.addEventListener('change', () => {
            playSound('click');
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
    }

    // --- Display Functions ---
    function displaySurah(surahIndex, start, end) {
        const surah = surahList[surahIndex];
        const container = document.getElementById('surah-container');
        const title = document.getElementById('read-title');
        title.textContent = `سورة ${surah.name} (الآيات ${start}-${end})`;
        container.innerHTML = '';
        const versesToShow = surah.verses.filter(v => v.id >= start && v.id <= end);
        versesToShow.forEach(verse => {
            container.innerHTML += `<span class="verse-block">${verse.text} <span class="verse-number">﴿${verse.id}﴾</span></span>`;
        });
    }

    function displayTafsir(surahIndex, start, end) {
        const surah = surahList[surahIndex];
        const container = document.getElementById('tafsir-container');
        const title = document.getElementById('tafsir-title');
        title.textContent = `تفسير سورة ${surah.name} (الآيات ${start}-${end})`;
        container.innerHTML = '';
        if (!surah.tafsir || surah.tafsir.length === 0) {
            container.innerHTML = '<p>لا يتوفر تفسير لهذه السورة حاليًا.</p>';
            return;
        }
        const tafsirToShow = surah.tafsir.filter(t => {
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

    // --- Game Logic ---
    let gameScores = {
        'meaning-match': 0,
        'wheel': 0,
        'verse-order': 0
    };
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
            wordsContainer.innerHTML = '<p>لا توجد بيانات معاني كافية لهذه اللعبة.</p>';
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
            wordsContainer.appendChild(div);

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
            meaningsContainer.appendChild(box);

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

        document.getElementById('reset-game-btn').onclick = () => { setupMeaningMatchGame(surah, start, end); playSound('navigate'); };
    }

    function displayGames(surahIndex, start, end) {
        const surah = surahList[surahIndex];
        const gameArea = document.getElementById('game-area');
        const gameTitle = document.getElementById('games-title');
        gameTitle.textContent = `أنشطة على سورة ${surah.name}`;
        const games = [
            { key: 'meaning-match', label: 'لعبة توصيل المعاني', icon: 'sync_alt' },
            { key: 'wheel', label: 'العجلة الدوارة', icon: 'rotate_right' },
            { key: 'verse-order', label: 'ترتيب الآيات', icon: 'sort' }
        ];
        const selector = document.getElementById('game-selector');
        selector.innerHTML = '';
        games.forEach((g, i) => {
            const btn = document.createElement('button');
            btn.className = 'game-select-btn' + (i === 0 ? ' active' : '');
            btn.dataset.game = g.key;
            btn.innerHTML = `<span class="material-icons">${g.icon}</span> ${g.label}`;
            btn.onclick = function() {
                playSound('click');
                selector.querySelectorAll('.game-select-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                showGame(g.key);
            };
            selector.appendChild(btn);
        });
        gameArea.querySelectorAll('.game-container').forEach(e => e.style.display = 'none');
        games.forEach((g, i) => {
            let div = document.getElementById(`${g.key}-game`);
            if (!div) {
                div = document.createElement('div');
                div.id = `${g.key}-game`;
                div.className = 'game-container';
                gameArea.appendChild(div);
            }
            div.style.display = (i === 0 ? 'block' : 'none');
        });
        showGame(games[0].key);
        setupMeaningMatchGame(surah, start, end);
        setupWheelGame(surah, start, end);
        setupVerseOrderGame(surah, start, end);
    }

    function showGame(game) {
        document.querySelectorAll('.game-container').forEach(g => g.style.display = 'none');
        const el = document.getElementById(`${game}-game`);
        if (el) el.style.display = 'block';
    }

    function setupWheelGame(surah, start, end) {
        const container = document.getElementById('wheel-game');
        container.innerHTML = '';
        if (!surah.verses || surah.verses.length < 1) {
            container.innerHTML = '<p>لا توجد آيات كافية لهذه اللعبة.</p>';
            return;
        }
        let questions = [];
        for (let i = 0; i < 8; i++) {
            const verse = surah.verses[Math.floor(Math.random() * surah.verses.length)];
            const words = verse.text.split(' ');
            if (words.length > 3) {
                const blankIndex = Math.floor(Math.random() * (words.length - 2)) + 1;
                const answer = words[blankIndex];
                let options = [answer];
                while (options.length < 4) {
                    const randomWord = surah.verses[Math.floor(Math.random() * surah.verses.length)].text.split(' ')[0];
                    if (!options.includes(randomWord)) options.push(randomWord);
                }
                questions.push({ type: 'fill-blank', verse: verse.text, blankIndex, answer, options: [...options].sort(() => 0.5 - Math.random()) });
            }
        }
        if (questions.length < 5) questions = questions.concat(questions).slice(0, 5);
        if (questions.length === 0) {
            container.innerHTML = '<p>لا توجد أسئلة كافية لهذه اللعبة.</p>';
            return;
        }
        container.innerHTML = `
            <p>اضغط زر "أدر العجلة" لتحديد السؤال!</p>
            <div id="wheel-area"></div>
            <button id="spin-wheel-btn">أدر العجلة</button>
            <div id="wheel-question-area"></div>
            <div id="wheel-score"></div>
            <button id="reset-wheel-btn" class="btn-reset"><span class="material-icons">refresh</span> إعادة اللعبة</button>
        `;
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

        wheelArea.innerHTML = wheelSVG;
        let spinning = false;
        document.getElementById('spin-wheel-btn').onclick = function() {
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
        function showWheelQuestion(q) {
            const qDiv = document.getElementById('wheel-question-area');
            const words = q.verse.split(' ');
            const displayWords = words.map((w, i) => i === q.blankIndex ? '<span class="blank-slot"></span>' : w);
            qDiv.innerHTML = `<div class="verse-question">${displayWords.join(' ')}</div><div id="wheel-options"></div><div id="wheel-feedback"></div>`;
            const optsDiv = document.getElementById('wheel-options');
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
        document.getElementById('reset-wheel-btn').onclick = () => { setupWheelGame(surah, start, end); playSound('navigate'); };
    }

    function setupVerseOrderGame(surah, start, end) {
        const container = document.getElementById('verse-order-game');
        container.innerHTML = ''; // Clear previous game
        const versesToShow = surah.verses.filter(v => v.id >= start && v.id <= end);

        if (versesToShow.length < 3) {
            container.innerHTML = '<p>لا توجد آيات كافية لهذه اللعبة. حاول تحديد نطاق أكبر.</p>';
            return;
        }

        const gameVerses = versesToShow.slice(0, 5); // Take up to 5 verses
        const correctOrder = gameVerses.map(v => v.text);
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

        document.getElementById('reset-verse-order-btn').onclick = () => { setupVerseOrderGame(surah, start, end); playSound('navigate'); };
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
        sidebar.classList.add('sidebar-open');
        sidebarOverlay.classList.add('active');
    }
    function hideSidebar() {
        sidebar.classList.remove('sidebar-open');
        sidebarOverlay.classList.remove('active');
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

    initializeApp();
});
