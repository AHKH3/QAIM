// scripts/games.js

import { playSound } from './audio.js';

// --- Helper Functions ---
function normalizeBasmallah(text) {
    if (!text) return "";
    return text
        .normalize("NFD")
        .replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, "")
        .replace(/ـ/g, "")
        .replace(/ٱ/g, "ا")
        .replace(/ٰ/g, "ا")
        .replace(/\s+/g, "");
}

function removeBasmallahFromVerse(verseText, surahId = null) {
    const basmallahStandard = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    const normalizedVerse = normalizeBasmallah(verseText.trim());
    const normalizedBasmallah = normalizeBasmallah(basmallahStandard);

    if (normalizedVerse === normalizedBasmallah && surahId !== 1) {
        return '';
    }

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

    return verseText;
}

// --- Game Logic ---
let gameScores = {
    'meaning-match': 0,
    'wheel': 0,
    'verse-order': 0
};
let lastWheelQuestionIndex = -1;
let usedWheelVerseIndexes = [];
let usedOrderVerseIndexes = [];
let verseCascadeGameLoopId = null;

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

    shuffledMeanings.forEach(meaning => {
        const box = document.createElement('div');
        box.className = 'meaning-box';
        box.textContent = meaning;
        box.dataset.meaning = meaning;
        meaningsContainer.appendChild(box);

        if (isTouchDevice) {
            box.addEventListener('click', () => {
                if (!selectedWordDiv || box.classList.contains('correct')) return;

                handleMatchAttempt(selectedWordDiv.textContent, meaning, box);

                selectedWordDiv.classList.remove('dragging');
                selectedWordDiv = null;
            });
        } else {
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

export function displayGames(surah, start, end) {
    const gameArea = document.getElementById('game-area');
    const gameTitle = document.getElementById('games-title');
    gameTitle.textContent = `ألعاب مخصصة على سورة ${surah.name}`;
    localStorage.setItem('lastSurahId', surah.id);
    localStorage.setItem('lastStartVerse', start);
    localStorage.setItem('lastEndVerse', end);

    const games = [
        { key: 'meaning-match', label: 'لعبة توصيل المعاني', icon: 'sync_alt', desc: 'اختبر معرفتك بمعاني كلمات القرآن.', cardGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
        { key: 'verse-order', label: 'ترتيب الآيات', icon: 'sort', desc: 'رتب الآيات بالترتيب الصحيح.', cardGradient: 'linear-gradient(135deg, #2af598 0%, #009efd 100%)' },
        { key: 'verse-cascade', label: 'شلال الآيات', icon: 'waterfall_chart', desc: 'التقط الكلمات الصحيحة لإكمال الآية.', cardGradient: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)' }
    ];

    const cardsGrid = document.querySelector('#games-section .games-cards-grid');
    cardsGrid.innerHTML = games.map(game => `
        <div class="game-card" tabindex="0" data-game="${game.key}">
            <div class="game-card-inner" style="background: ${game.cardGradient};">
                <span class="material-icons icon">${game.icon}</span>
                <div class="title">${game.label}</div>
                <div class="desc">${game.desc}</div>
                <button class="go-btn">ابدأ اللعبة</button>
            </div>
        </div>
    `).join('');
    cardsGrid.classList.remove('hidden');
    cardsGrid.classList.add('grid');

    document.querySelectorAll('#games-section .game-card').forEach((card, i) => {
        card.style.opacity = 0;
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s cubic-bezier(.34,1.56,.64,1)';
            card.style.opacity = 1;
        }, 100 + i * 120);

        card.addEventListener('click', () => showGame(card.getAttribute('data-game'), surah, start, end));
        card.addEventListener('keydown', e => { if (e.key === 'Enter') showGame(card.getAttribute('data-game'), surah, start, end); });
        card.querySelector('.go-btn').addEventListener('click', e => {
            e.stopPropagation();
            showGame(card.getAttribute('data-game'), surah, start, end);
        });
    });

    document.querySelectorAll('#games-section .game-container').forEach(g => g.classList.add('hidden'));
}

export function displayGeneralGames(startSurahId, endSurahId, surahIndex) {
    const generalGameArea = document.getElementById('general-game-area');
    const generalGamesTitle = document.getElementById('general-games-title');

    const startSurahName = surahIndex.find(s => s.id === startSurahId)?.name || 'غير محدد';
    const endSurahName = surahIndex.find(s => s.id === endSurahId)?.name || 'غير محدد';

    generalGamesTitle.textContent = `ألعاب عامة على السور من ${startSurahName} إلى ${endSurahName}`;

    const generalGames = [
        { key: 'wheel', label: 'العجلة الدوارة', icon: 'rotate_right', desc: 'أدر العجلة وأجب على الأسئلة القرآنية.', cardGradient: 'linear-gradient(135deg, #ff8c42 0%, #ffc048 100%)' }
    ];

    generalGameArea.innerHTML = `<div class="games-cards-grid">${generalGames.map(game => `
        <div class="game-card" tabindex="0" data-game="${game.key}">
            <div class="game-card-inner" style="background: ${game.cardGradient};">
                <span class="material-icons icon">${game.icon}</span>
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

        card.addEventListener('click', () => showGeneralGame(card.getAttribute('data-game'), startSurahId, endSurahId, surahIndex));
        card.addEventListener('keydown', e => { if (e.key === 'Enter') showGeneralGame(card.getAttribute('data-game'), startSurahId, endSurahId, surahIndex); });
        card.querySelector('.go-btn').addEventListener('click', e => {
            e.stopPropagation();
            showGeneralGame(card.getAttribute('data-game'), startSurahId, endSurahId, surahIndex);
        });
    });

    generalGameArea.querySelectorAll('.game-container').forEach(g => g.classList.add('hidden'));
}

export function showGame(game, surah, start, end) {
    cleanupActiveGame();
    const cardsGrid = document.querySelector('#games-section .games-cards-grid');
    if (cardsGrid) {
        cardsGrid.classList.add('hidden');
        cardsGrid.classList.remove('grid');
    }

    document.querySelectorAll('#games-section .game-container').forEach(g => g.classList.add('hidden'));
    const el = document.getElementById(`${game}-game`);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('active');

    const backButton = document.getElementById('global-back-to-games-btn');
    if (backButton) {
        backButton.classList.remove('hidden');
        backButton.classList.add('flex');
    }

    switch (game) {
        case 'meaning-match':
            setupMeaningMatchGame(surah, start, end);
            break;
        case 'verse-order':
            setupVerseOrderGame(surah, start, end);
            break;
        case 'verse-cascade':
            setupVerseCascadeGame(surah, start, end);
            break;
    }
}

export function showGameGrid() {
    cleanupActiveGame();
    document.querySelectorAll('#games-section .game-container').forEach(g => g.classList.add('hidden'));

    const cardsGrid = document.querySelector('#games-section .games-cards-grid');
    if (cardsGrid) {
        cardsGrid.classList.remove('hidden');
        cardsGrid.classList.add('grid');
    }

    const backButton = document.getElementById('global-back-to-games-btn');
    if (backButton) backButton.classList.add('hidden');
}

export function showGeneralGame(game, startSurahId, endSurahId, surahIndex) {
    const surahsToLoad = [];
    for (let i = startSurahId; i <= endSurahId; i++) {
        surahsToLoad.push(i);
    }

    Promise.all(surahsToLoad.map(surahId =>
        fetch(`./quran_data/${surahId}.json`).then(res => {
            if (!res.ok) throw new Error(`Failed to load surah ${surahId}`);
            return res.json();
        })
    ))
    .then(surahDataArray => {
        const allVerses = [];
        surahDataArray.forEach(surahData => {
            if (surahData && surahData.verses) {
                allVerses.push(...surahData.verses.map(v => ({ ...v, surahId: surahData.id })));
            }
        });

        const generalGameArea = document.getElementById('general-game-area');
        const cardsGrid = generalGameArea.querySelector('.games-cards-grid');
        if (cardsGrid) {
            cardsGrid.classList.add('hidden');
            cardsGrid.classList.remove('grid');
        }

        generalGameArea.querySelectorAll('.game-container').forEach(g => g.classList.add('hidden'));

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
                setupWheelGame({ verses: allVerses, surahIndex: surahIndex }, startSurahId, endSurahId);
                break;
        }
    })
    .catch(error => {
        console.error('Error loading surah data for general games:', error);
    });
}

export function showGeneralGameGrid() {
    const generalGameArea = document.getElementById('general-game-area');
    const cardsGrid = generalGameArea.querySelector('.games-cards-grid');
    if (cardsGrid) {
        cardsGrid.classList.remove('hidden');
        cardsGrid.classList.add('grid');
    }

    generalGameArea.querySelectorAll('.game-container').forEach(g => {
        g.classList.add('hidden');
        g.classList.remove('active');
        const backButton = g.querySelector('.back-to-games-btn');
        if (backButton) backButton.classList.add('hidden');
    });
}

function setupWheelGame(surahData, startSurahId, endSurahId) {
    const container = document.getElementById('general-wheel-game');
    const gameContentArea = container.querySelector('.game-content-area');
    if (!gameContentArea) return;

    const wheelColorPalettes = [
        { light: ['#FFD700', '#4CAF50', '#2196F3', '#9C27B0'], dark: ['#B8860B', '#388E3C', '#1976D2', '#7B1FA2'] },
        { light: ['#FF5722', '#00BCD4', '#8BC34A', '#E91E63'], dark: ['#D84315', '#00838F', '#689F38', '#C2185B'] },
    ];

    function applyRandomWheelColors() {
        const randomIndex = Math.floor(Math.random() * wheelColorPalettes.length);
        const currentPalette = wheelColorPalettes[randomIndex];
        const root = document.documentElement;
        const isDarkMode = document.body.classList.contains('dark-mode');
        const colors = isDarkMode ? currentPalette.dark : currentPalette.light;
        root.style.setProperty('--wheel-segment-1', colors[0]);
        root.style.setProperty('--wheel-segment-2', colors[1]);
        root.style.setProperty('--wheel-segment-3', colors[2]);
        root.style.setProperty('--wheel-segment-4', colors[3]);
    }

    applyRandomWheelColors();

    container.style.setProperty('--game-primary-color', 'var(--wheel-primary)');
    container.style.setProperty('--game-secondary-color', 'var(--wheel-secondary)');

    let score = 0, isSpinning = false, rotation = 0, usedQuestionIdentifiers = new Set();
    const questionTypes = [
        { id: 'related_ayah', text: 'الآية التالية أو السابقة' },
        { id: 'arrange', text: 'رتّب الآيات' },
        { id: 'identify_surah', text: 'ما هي السورة؟' },
        { id: 'complete', text: 'أكمل الآية' },
    ];
    const allVerses = surahData.verses;
    const surahIndex = surahData.surahIndex;

    if (allVerses.length < 10) {
        gameContentArea.innerHTML = '<p>لا توجد آيات كافية لهذه اللعبة في النطاق المحدد.</p>';
        return;
    }

    gameContentArea.innerHTML = `
        <h1 class="wheel-game-title">عجلة الحظ القرآنية</h1>
        <p class="wheel-game-subtitle">راجع حفظك من سورة ${surahIndex.find(s => s.id === startSurahId)?.name} إلى سورة ${surahIndex.find(s => s.id === endSurahId)?.name}</p>
        <div id="score-container" class="wheel-game-score-container">النقاط: <span id="score">0</span></div>
        <div class="wheel-container">
            <div class="pointer"></div>
            <div id="wheel" class="wheel">
                <div class="wheel-text-container">
                    ${questionTypes.map((type, i) => `<div class="wheel-text text-${i+1}">${type.text}</div>`).join('')}
                </div>
            </div>
            <button id="spin-button" class="spin-button">أدر</button>
        </div>
        <button id="reset-button" class="wheel-game-reset-button"><span>إعادة اللعب</span></button>
    `;

    const wheelElement = gameContentArea.querySelector('#wheel');
    const spinButton = gameContentArea.querySelector('#spin-button');
    const resetButton = gameContentArea.querySelector('#reset-button');
    const scoreElement = gameContentArea.querySelector('#score');

    spinButton.addEventListener('click', spinWheel);
    resetButton.addEventListener('click', resetGame);

    function spinWheel() {
        if (isSpinning) return;
        isSpinning = true;
        spinButton.disabled = true;
        playSound('spin_start');
        rotation += Math.ceil(Math.random() * 2000) + 2500;
        wheelElement.style.transform = `rotate(${rotation}deg)`;
        wheelElement.addEventListener('transitionend', handleSpinEnd, { once: true });
    }

    function handleSpinEnd() {
        playSound('spin_stop');
        const actualRotation = rotation % 360;
        const segmentIndex = Math.floor(actualRotation / 90);
        presentNewQuestion(questionTypes[segmentIndex].id);
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
        applyRandomWheelColors();
        setTimeout(() => { wheelElement.style.transition = 'transform 7s cubic-bezier(0.25, 1, 0.5, 1)'; }, 50);
    }

    function presentNewQuestion(type) {
        // ... (Implementation is complex and remains the same, so omitted for brevity)
    }
    // ... (rest of the wheel game logic, generateQuestion, displayQuestion etc.)
}

function getRandomConsecutiveVerses(versesArray, count) {
    if (!versesArray || versesArray.length < count) return [];
    const maxStartIndex = versesArray.length - count;
    const startIndex = Math.floor(Math.random() * (maxStartIndex + 1));
    return versesArray.slice(startIndex, startIndex + count);
}

function setupVerseOrderGame(surah, start, end) {
    // ... (Implementation remains the same)
}

function getDragAfterElement(container, y) {
    // ... (Implementation remains the same)
}

function setupVerseCascadeGame(surah, start, end) {
    // ... (Implementation remains the same)
}

export function cleanupActiveGame() {
    if (verseCascadeGameLoopId) {
        cancelAnimationFrame(verseCascadeGameLoopId);
        verseCascadeGameLoopId = null;
        const cascadeArea = document.getElementById('cascade-area');
        if (cascadeArea) cascadeArea.innerHTML = '';
    }
}