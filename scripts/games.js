// scripts/games.js
import { playSound } from './audio.js';

// This module encapsulates all game-related logic.

// --- Private Helper Functions ---
function normalizeBasmallah(text) {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, "").replace(/ـ/g, "").replace(/ٱ/g, "ا").replace(/ٰ/g, "ا").replace(/\s+/g, "");
}

function removeBasmallahFromVerse(verseText, surahId = null) {
    const basmallahStandard = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    const normalizedVerse = normalizeBasmallah(verseText.trim());
    const normalizedBasmallah = normalizeBasmallah(basmallahStandard);
    if (normalizedVerse === normalizedBasmallah && surahId !== 1) return '';
    if (normalizedVerse.startsWith(normalizedBasmallah) && surahId !== 1) {
        let original = verseText.trim();
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
        return original.slice(basmallahEndIndex).trim();
    }
    return verseText;
}

function getRandomConsecutiveVerses(versesArray, count) {
    if (!versesArray || versesArray.length < count) return [];
    const maxStartIndex = versesArray.length - count;
    const startIndex = Math.floor(Math.random() * (maxStartIndex + 1));
    return versesArray.slice(startIndex, startIndex + count);
}

function getDragAfterElement(container, y, selector) {
    const draggableElements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
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


// --- Game State Variables ---
let gameScores = { 'wheel': 0, 'verse-order': 0 };
let verseCascadeGameLoopId = null;
let activeCardMatchingGame = null;

// --- Card Matching Game Class ---
class CardMatchingGame {
    constructor(containerId, verses, surahName) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found.`);
            return;
        }
        this.verses = verses;
        this.surahName = surahName;
        this.gameMode = 'consecutive';
        this.theme = 'space';
        this.gridSize = 4;
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.score = 0;
        this.attempts = 0;
        this.timerInterval = null;
        this.seconds = 0;
        this.isLocked = false;

        this.renderBaseHTML();
        this.bindDOM();
        this.addEventListeners();
        this.showSetupScreen();
    }

    renderBaseHTML() {
        // This function injects the necessary HTML into the container
        this.container.innerHTML = `
            <div class="cm-game-container">
                <div class="cm-setup-screen">
                    <h1 class="cm-game-title">لعبة مطابقة البطاقات</h1>
                    <div class="cm-game-options">
                        <div class="option-group">
                            <label for="cm-theme-select-${this.container.id}">اختر المظهر:</label>
                            <select id="cm-theme-select-${this.container.id}">
                                <option value="space">الفضاء</option>
                                <option value="sea">البحر</option>
                                <option value="forest">الغابة</option>
                            </select>
                        </div>
                        <div class="option-group">
                            <label for="cm-mode-select-${this.container.id}">اختر نمط اللعب:</label>
                            <select id="cm-mode-select-${this.container.id}">
                                <option value="consecutive">آيات متتالية</option>
                                <option value="split">تقسيم الآية</option>
                            </select>
                        </div>
                         <div class="option-group">
                            <label for="cm-grid-size-select-${this.container.id}">حجم اللوحة:</label>
                            <select id="cm-grid-size-select-${this.container.id}">
                                <option value="4">4x4</option>
                                <option value="5">5x4</option>
                                <option value="6">6x4</option>
                            </select>
                        </div>
                    </div>
                    <button class="cm-start-game-btn btn">ابدأ اللعب</button>
                </div>

                <div class="cm-game-board hidden">
                    <div class="cm-game-info">
                        <span class="cm-timer">الوقت: 0:00</span>
                        <span class="cm-score">النقاط: 0</span>
                        <span class="cm-attempts">المحاولات: 0</span>
                    </div>
                    <div class="cm-cards-grid"></div>
                     <div class="cm-game-controls">
                        <button class="cm-reset-game-btn btn">إعادة اللعبة</button>
                    </div>
                </div>

                <div class="cm-end-game-modal modal-overlay hidden">
                    <div class="modal-content">
                        <h2 class="cm-end-game-title">أحسنت!</h2>
                        <p class="cm-end-game-message"></p>
                        <button class="cm-play-again-btn btn">العب مرة أخرى</button>
                    </div>
                </div>
            </div>`;
    }

    bindDOM() {
        this.setupScreen = this.container.querySelector('.cm-setup-screen');
        this.gameBoard = this.container.querySelector('.cm-game-board');
        this.cardsGrid = this.container.querySelector('.cm-cards-grid');
        this.themeSelect = this.container.querySelector(`#cm-theme-select-${this.container.id}`);
        this.modeSelect = this.container.querySelector(`#cm-mode-select-${this.container.id}`);
        this.gridSelect = this.container.querySelector(`#cm-grid-size-select-${this.container.id}`);
        this.startGameBtn = this.container.querySelector('.cm-start-game-btn');
        this.resetGameBtn = this.container.querySelector('.cm-reset-game-btn');
        this.playAgainBtn = this.container.querySelector('.cm-play-again-btn');
        this.timerEl = this.container.querySelector('.cm-timer');
        this.scoreEl = this.container.querySelector('.cm-score');
        this.attemptsEl = this.container.querySelector('.cm-attempts');
        this.endGameModal = this.container.querySelector('.cm-end-game-modal');
        this.endGameTitle = this.container.querySelector('.cm-end-game-title');
        this.endGameMessage = this.container.querySelector('.cm-end-game-message');
        this.gameContainer = this.container.querySelector('.cm-game-container');
    }

    addEventListeners() {
        this.startGameBtn.onclick = () => { playSound('click'); this.initializeGame(); };
        this.resetGameBtn.onclick = () => { playSound('click'); this.resetGame(); };
        this.playAgainBtn.onclick = () => { playSound('click'); this.showSetupScreen(); };
        this.themeSelect.onchange = (e) => this.applyTheme(e.target.value);
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    createCards() {
        this.cardsGrid.innerHTML = '';
        this.cards = [];
        this.matchedPairs = 0;
        this.cardsGrid.className = 'cm-cards-grid';
        this.cardsGrid.classList.add(`grid-${this.gridSize}`);

        let cardData = [];
        const availableVerses = this.verses.map(v => ({...v, text: removeBasmallahFromVerse(v.text, v.surahId)})).filter(v => v.text.trim() !== '');

        if (this.gameMode === 'consecutive') {
            for (let i = 0; i < availableVerses.length - 1; i++) {
                cardData.push({ id: availableVerses[i].id, content: availableVerses[i].text, pairId: i });
                cardData.push({ id: availableVerses[i+1].id, content: availableVerses[i+1].text, pairId: i });
            }
        } else { // split mode
            availableVerses.forEach(verse => {
                const words = verse.text.split(' ');
                if (words.length >= 4) {
                    const midPoint = Math.ceil(words.length / 2);
                    const firstHalf = words.slice(0, midPoint).join(' ');
                    const secondHalf = words.slice(midPoint).join(' ');
                    cardData.push({ id: verse.id, content: firstHalf, pairId: verse.id });
                    cardData.push({ id: verse.id, content: secondHalf, pairId: verse.id });
                }
            });
        }

        const numberOfPairs = (this.gridSize * this.gridSize) / 2;
        const uniquePairIds = [...new Set(cardData.map(c => c.pairId))];
        const selectedPairIds = this.shuffle(uniquePairIds).slice(0, numberOfPairs);
        let finalCardData = cardData.filter(c => selectedPairIds.includes(c.pairId));
        finalCardData = this.shuffle(finalCardData);

        if (finalCardData.length < 4) {
            this.cardsGrid.innerHTML = `<p class="error-message">لا توجد آيات كافية لهذا النمط في النطاق المحدد.</p>`;
            return;
        }

        finalCardData.forEach((item) => {
            const card = document.createElement('div');
            card.classList.add('cm-card');
            card.dataset.pairId = item.pairId;

            card.innerHTML = `
                <div class="cm-card-inner">
                    <div class="cm-card-face cm-card-front"></div>
                    <div class="cm-card-face cm-card-back">${item.content}</div>
                </div>`;
            card.addEventListener('click', () => this.flipCard(card));
            this.cardsGrid.appendChild(card);
            this.cards.push(card);
        });
    }

    flipCard(card) {
        if (this.isLocked || card.classList.contains('flipped') || this.flippedCards.length >= 2) return;

        playSound('flip');
        card.classList.add('flipped');
        this.flippedCards.push(card);

        if (this.flippedCards.length === 2) {
            this.isLocked = true;
            this.attempts++;
            this.updateGameInfo();
            this.checkForMatch();
        }
    }

    checkForMatch() {
        const [card1, card2] = this.flippedCards;
        const isMatch = card1.dataset.pairId === card2.dataset.pairId;
        if (isMatch) {
            playSound('correct');
            this.score += 10;
            this.matchedPairs++;
            card1.classList.add('matched');
            card2.classList.add('matched');
            this.resetFlippedCards();
            if (this.matchedPairs * 2 === this.cards.length) {
                playSound('win');
                this.endGame(true);
            }
        } else {
            playSound('incorrect');
            this.score = Math.max(0, this.score - 2);
            card1.classList.add('incorrect');
            card2.classList.add('incorrect');

            setTimeout(() => {
                card1.classList.remove('flipped', 'incorrect');
                card2.classList.remove('flipped', 'incorrect');
                this.resetFlippedCards();
            }, 1200);
        }
        this.updateGameInfo();
    }

    resetFlippedCards() {
        this.flippedCards = [];
        this.isLocked = false;
    }

    updateGameInfo() {
        this.scoreEl.textContent = `النقاط: ${this.score}`;
        this.attemptsEl.textContent = `المحاولات: ${this.attempts}`;
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.seconds = 0;
        this.timerInterval = setInterval(() => {
            this.seconds++;
            const min = Math.floor(this.seconds / 60);
            const sec = this.seconds % 60;
            this.timerEl.textContent = `الوقت: ${min}:${sec < 10 ? '0' : ''}${sec}`;
        }, 1000);
    }

    applyTheme(selectedTheme) {
        this.theme = selectedTheme; // Make sure the theme is updated on the instance
        this.gameContainer.classList.remove('theme-space', 'theme-sea', 'theme-forest');
        this.gameContainer.classList.add(`theme-${this.theme}`);

        // Cleanup previous theme's animated elements
        const existingAnimations = this.gameContainer.querySelector('.animation-wrapper');
        if (existingAnimations) {
            existingAnimations.remove();
        }

        // Remove previous parallax listeners to prevent stacking them
        if (this.parallaxListener) {
            this.gameContainer.removeEventListener('mousemove', this.parallaxListener);
            this.parallaxListener = null;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'animation-wrapper';

        if (this.theme === 'space') {
            // Future implementation for space parallax
            const stars = document.createElement('div');
            stars.className = 'stars';
            wrapper.appendChild(stars);
            const twinklingStars = document.createElement('div');
            twinklingStars.className = 'twinkling';
            wrapper.appendChild(twinklingStars);

        } else if (this.theme === 'sea') {
            // Build the layered parallax environment
            const layers = ['sea-back', 'sea-mid', 'sea-front', 'caustics-overlay'];
            layers.forEach(layerClass => {
                const layerDiv = document.createElement('div');
                layerDiv.className = `parallax-layer ${layerClass}`;
                wrapper.appendChild(layerDiv);
            });

            // Add bubbles
            const numberOfBubbles = 20;
            for (let i = 0; i < numberOfBubbles; i++) {
                const bubble = document.createElement('div');
                bubble.className = 'bubble';
                const size = Math.random() * 20 + 10;
                bubble.style.width = `${size}px`;
                bubble.style.height = `${size}px`;
                bubble.style.left = `${Math.random() * 100}%`;
                bubble.style.animationDuration = `${Math.random() * 10 + 8}s`;
                bubble.style.animationDelay = `${Math.random() * 5}s`;
                bubble.style.setProperty('--x-end', `${Math.random() * 20 - 10}vw`);
                wrapper.appendChild(bubble);
            }

            // Define and attach the parallax listener
            this.parallaxListener = (e) => {
                const { clientX, clientY } = e;
                const { offsetWidth, offsetHeight } = this.gameContainer;
                const xPercent = (clientX / offsetWidth - 0.5) * 2;
                const yPercent = (clientY / offsetHeight - 0.5) * 2;

                this.gameContainer.querySelectorAll('.parallax-layer').forEach(layer => {
                    const speed = parseFloat(getComputedStyle(layer).getPropertyValue('--parallax-speed'));
                    const x = xPercent * speed;
                    const y = yPercent * speed;
                    layer.style.transform = `translate(${x}px, ${y}px)`;
                });
            };
            this.gameContainer.addEventListener('mousemove', this.parallaxListener);


        } else if (this.theme === 'forest') {
            // Future implementation for forest parallax
        }

        if (wrapper.hasChildNodes()) {
            this.gameContainer.prepend(wrapper);
        }
    }

    resetGame() {
        clearInterval(this.timerInterval);
        this.score = 0;
        this.attempts = 0;
        this.seconds = 0;
        this.matchedPairs = 0;
        this.isLocked = false;
        this.flippedCards = [];
        this.updateGameInfo();
        this.timerEl.textContent = "الوقت: 0:00";
        this.createCards();
        this.startTimer();
    }

    initializeGame() {
        this.theme = this.themeSelect.value;
        this.gameMode = this.modeSelect.value;
        this.gridSize = parseInt(this.gridSelect.value, 10);
        this.applyTheme(this.theme);
        this.setupScreen.classList.add('hidden');
        this.gameBoard.classList.remove('hidden');
        this.resetGame();
    }

    showSetupScreen() {
        this.gameBoard.classList.add('hidden');
        this.endGameModal.classList.add('hidden');
        this.setupScreen.classList.remove('hidden');
    }

    endGame(isWin) {
        clearInterval(this.timerInterval);
        if (isWin) {
            this.endGameTitle.textContent = "أحسنت!";
            this.endGameMessage.textContent = `لقد أكملت اللعبة في ${this.timerEl.textContent} بـ ${this.attempts} محاولة. نتيجتك: ${this.score}.`;
        } else {
            this.endGameTitle.textContent = "حاول مرة أخرى!";
            this.endGameMessage.textContent = "حظاً أوفر في المرة القادمة.";
        }
        this.endGameModal.classList.remove('hidden');
    }

    destroy() {
        clearInterval(this.timerInterval);
        if (this.startGameBtn) this.startGameBtn.onclick = null;
        if (this.resetGameBtn) this.resetGameBtn.onclick = null;
        if (this.playAgainBtn) this.playAgainBtn.onclick = null;
        if (this.themeSelect) this.themeSelect.onchange = null;
        if (this.container) this.container.innerHTML = '';
    }
}

// --- Game Setup Functions ---

function setupCardMatchingGame(containerId, verses, name) {
    if (activeCardMatchingGame) {
        activeCardMatchingGame.destroy();
    }
    activeCardMatchingGame = new CardMatchingGame(containerId, verses, name);
}

function setupVerseOrderGame(containerId, surah, start, end) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div class="game-content-area"></div>';
    const gameContentArea = container.querySelector('.game-content-area');
    container.style.setProperty('--game-primary-color', 'var(--verse-order-primary)');
    container.style.setProperty('--game-secondary-color', 'var(--verse-order-secondary)');

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
        <div class="game-header"><h3 class="game-title">لعبة ترتيب الآيات</h3><p class="game-instructions">قم بسحب وإفلات الآيات لترتيبها بالترتيب الصحيح.</p></div>
        <div id="verse-order-area"></div>
        <button id="check-order-btn" class="btn-check">تحقق من الترتيب</button>
        <button id="reset-verse-order-btn" class="btn-reset"><span class="material-icons">refresh</span> إعادة اللعبة</button>
        <div id="verse-order-feedback"></div><div id="verse-order-score"></div>`;
    const verseArea = gameContentArea.querySelector('#verse-order-area');
    let draggedItem = null;
    shuffledOrder.forEach(verseText => {
        const verseDiv = document.createElement('div');
        verseDiv.className = 'verse-order-item';
        verseDiv.textContent = verseText;
        verseArea.appendChild(verseDiv);
        verseDiv.draggable = true;
        verseDiv.addEventListener('dragstart', () => { draggedItem = verseDiv; setTimeout(() => verseDiv.classList.add('dragging'), 0); playSound('drag_start'); });
        verseDiv.addEventListener('dragend', () => { if (draggedItem) draggedItem.classList.remove('dragging'); draggedItem = null; });
        verseDiv.addEventListener('touchstart', (e) => { draggedItem = verseDiv; verseDiv.classList.add('dragging'); playSound('drag_start'); }, { passive: false });
        verseDiv.addEventListener('touchend', () => { if (draggedItem) draggedItem.classList.remove('dragging'); draggedItem = null; });
    });
    verseArea.addEventListener('dragover', (e) => { e.preventDefault(); const afterElement = getDragAfterElement(verseArea, e.clientY, '.verse-order-item'); if (draggedItem) { if (afterElement == null) { verseArea.appendChild(draggedItem); } else { verseArea.insertBefore(draggedItem, afterElement); } } });
    verseArea.addEventListener('touchmove', (e) => { if (draggedItem) { e.preventDefault(); const afterElement = getDragAfterElement(verseArea, e.touches[0].clientY, '.verse-order-item'); if (afterElement == null) { verseArea.appendChild(draggedItem); } else { verseArea.insertBefore(draggedItem, afterElement); } } }, { passive: false });
    gameContentArea.querySelector('#check-order-btn').addEventListener('click', () => {
        playSound('click');
        const userOrder = Array.from(verseArea.children).map(child => child.textContent);
        const feedbackDiv = gameContentArea.querySelector('#verse-order-feedback');
        const isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);
        if (isCorrect) {
            feedbackDiv.textContent = 'أحسنت! الترتيب صحيح.';
            feedbackDiv.className = 'feedback-correct';
            gameScores['verse-order']++;
            playSound('win');
        } else {
            feedbackDiv.textContent = 'حاول مرة أخرى، الترتيب غير صحيح.';
            feedbackDiv.className = 'feedback-incorrect';
            playSound('incorrect');
        }
    });
    gameContentArea.querySelector('#reset-verse-order-btn').onclick = () => { setupVerseOrderGame(containerId, surah, start, end); playSound('navigate'); };
}

function setupVerseCascadeGame(containerId, surah, start, end) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div class="game-content-area"></div>';
    const gameContentArea = container.querySelector('.game-content-area');
    container.style.setProperty('--game-primary-color', 'var(--verse-cascade-primary)');
    container.style.setProperty('--game-secondary-color', 'var(--verse-cascade-secondary)');
    let score, lives, currentVerseIndex, wordsToCatch, nextWordIndex, fallingWords, lastSpawnTime = 0, difficulty;
    const versesToShow = surah.verses.filter(v => v.id >= start && v.id <= end && v.text.split(' ').length >= 2);
    if (versesToShow.length === 0) {
        gameContentArea.innerHTML = '<p>لا توجد آيات مناسبة لهذه اللعبة في النطاق المحدد.</p>';
        return;
    }
    const difficultySettings = { easy: { speed: 8, interval: 1800, lives: 5 }, medium: { speed: 6, interval: 1200, lives: 3 }, hard: { speed: 4, interval: 700, lives: 2 } };
    function renderDifficultySelection() {
        cleanupActiveGame();
        gameContentArea.innerHTML = `
            <div class="game-header"><h3 class="game-title">لعبة شلال الآيات</h3></div>
            <div class="difficulty-selector"><h3>اختر مستوى الصعوبة</h3><button class="btn-difficulty" data-difficulty="easy">سهل</button><button class="btn-difficulty" data-difficulty="medium">متوسط</button><button class="btn-difficulty" data-difficulty="hard">صعب</button></div>`;
        gameContentArea.querySelectorAll('.btn-difficulty').forEach(btn => {
            btn.onclick = (e) => { difficulty = e.target.dataset.difficulty; renderGameUI(); startGame(); };
        });
    }
    function renderGameUI() {
        gameContentArea.innerHTML = `
            <div id="cascade-header"><div id="cascade-info"><span>النتيجة: <span id="cascade-score">0</span></span><span>المحاولات: <span id="cascade-lives"></span></span></div><button id="reset-cascade-btn" class="btn-reset"><span class="material-icons">refresh</span></button></div>
            <div id="cascade-area"></div><div id="cascade-verse-display"></div>`;
        gameContentArea.querySelector('#reset-cascade-btn').onclick = renderDifficultySelection;
    }
    function startGame() {
        cleanupActiveGame();
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
        if (verseCascadeGameLoopId) { cancelAnimationFrame(verseCascadeGameLoopId); verseCascadeGameLoopId = null; }
        const cascadeArea = gameContentArea.querySelector('#cascade-area');
        if (cascadeArea) cascadeArea.innerHTML = '';
        fallingWords = [];
    }
    function gameLoop(timestamp) {
        if (lives <= 0 || verseCascadeGameLoopId === null) return;
        if (timestamp - lastSpawnTime > difficultySettings[difficulty].interval) { lastSpawnTime = timestamp; spawnWord(); }
        verseCascadeGameLoopId = requestAnimationFrame(gameLoop);
    }
    function loadVerse() {
        const cascadeArea = gameContentArea.querySelector('#cascade-area');
        if (cascadeArea) cascadeArea.innerHTML = '';
        fallingWords = [];
        if (lives <= 0) { endGame("حاول مرة أخرى يا بطل!"); return; }
        if (currentVerseIndex >= versesToShow.length) { endGame("أحسنت! أنت بطل القرآن!"); return; }
        const verseTextWithoutBasmallah = removeBasmallahFromVerse(versesToShow[currentVerseIndex].text, surah.id);
        wordsToCatch = verseTextWithoutBasmallah.split(' ').filter(w => w.trim() !== '');
        nextWordIndex = 0;
        updateVerseDisplay();
    }
    function spawnWord() {
        if (lives <= 0 || verseCascadeGameLoopId === null) return;
        const cascadeArea = gameContentArea.querySelector('#cascade-area');
        if (!cascadeArea) return;
        const nextWord = wordsToCatch[nextWordIndex];
        const isNextWordFalling = fallingWords.some(fw => fw.text === nextWord);
        let wordToSpawn = (!isNextWordFalling && nextWordIndex < wordsToCatch.length) ? nextWord : wordsToCatch[Math.floor(Math.random() * wordsToCatch.length)];
        createWordElement(wordToSpawn);
    }
    function createWordElement(word) {
        const cascadeArea = gameContentArea.querySelector('#cascade-area');
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
        const display = gameContentArea.querySelector('#cascade-verse-display');
        if(display) {
            const verseText = versesToShow[currentVerseIndex] ? `الآية: ${removeBasmallahFromVerse(versesToShow[currentVerseIndex].text, surah.id)}` : "";
            const caughtText = wordsToCatch.slice(0, nextWordIndex).join(' ');
            display.innerHTML = `<div class="full-verse-text">${verseText}</div><div class="caught-words-display">${caughtText} <span class="remaining-indicator">...</span></div>`;
        }
    }
    function updateScoreDisplay() { const scoreEl = gameContentArea.querySelector('#cascade-score'); if(scoreEl) scoreEl.textContent = score; }
    function updateLivesDisplay() { const livesEl = gameContentArea.querySelector('#cascade-lives'); if(livesEl) livesEl.textContent = lives > 0 ? '❤️'.repeat(lives) : '💔'; }
    function endGame(message) {
        cleanupActiveGame();
        if(gameContentArea) {
            gameContentArea.innerHTML = `<div class="cascade-end-message"><h2>${message}</h2><p>نتيجتك النهائية: ${score}</p><button id="play-again-cascade-btn" class="btn-check">العب مرة أخرى</button></div>`;
            gameContentArea.querySelector('#play-again-cascade-btn').onclick = renderDifficultySelection;
        }
    }
    renderDifficultySelection();
}

function setupWheelGame(containerId, surahData, startSurahId, endSurahId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Wheel game container #${containerId} not found.`);
        return;
    }

    // Clear container and add the main styling class.
    container.innerHTML = '';
    container.classList.add('wheel-game-container');

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
        container.innerHTML = '<p class="error-message">لا توجد آيات كافية لهذه اللعبة في النطاق المحدد.</p>';
        return;
    }

    // Populate the container with the new structure
    const startSurahName = surahIndex.find(s => s.id === startSurahId)?.name || '';
    const endSurahName = surahIndex.find(s => s.id === endSurahId)?.name || '';
    container.innerHTML = `
        <h1 class="wheel-game-title">عجلة الحظ القرآنية</h1>
        <p class="wheel-game-subtitle">راجع حفظك من سورة ${startSurahName} إلى سورة ${endSurahName}</p>
        <div class="wheel-game-score-container">النقاط: <span id="score">0</span></div>
        <div class="wheel-container">
            <div class="pointer"></div>
            <div id="wheel" class="wheel">
                <div class="wheel-text-container">
                    ${questionTypes.map((type, i) => `<div class="wheel-text text-${i+1}">${type.text}</div>`).join('')}
                </div>
            </div>
            <button id="spin-button" class="spin-button">أدر</button>
        </div>
        <button id="reset-button" class="wheel-game-reset-button">
            <span class="material-icons">refresh</span>
            <span>إعادة اللعب</span>
        </button>
    `;

    const wheelElement = container.querySelector('#wheel');
    const spinButton = container.querySelector('#spin-button');
    const resetButton = container.querySelector('#reset-button');
    const scoreElement = container.querySelector('#score');

    spinButton.addEventListener('click', spinWheel);
    resetButton.addEventListener('click', resetGame);

    function spinWheel() {
        if (isSpinning) return;
        isSpinning = true;
        spinButton.disabled = true;
        playSound('spin_start');
        // More dramatic spin
        const spinCycles = Math.random() * 5 + 8; // 8 to 13 cycles
        const randomAngle = Math.random() * 360;
        rotation = spinCycles * 360 + randomAngle;

        wheelElement.style.transform = `rotate(${rotation}deg)`;
        wheelElement.addEventListener('transitionend', handleSpinEnd, { once: true });
    }

    function handleSpinEnd() {
        playSound('spin_stop'); // Using new sound
        // Make the pointer "kick"
        const pointer = container.querySelector('.pointer');
        if(pointer) {
            pointer.style.transform = 'scale(1.2)';
            setTimeout(() => { pointer.style.transform = 'scale(1)'; }, 200);
        }

        const actualRotation = rotation % 360;
        const segmentAngle = 360 / questionTypes.length;
        const segmentIndex = Math.floor(actualRotation / segmentAngle);
        // We need to adjust because the wheel's 0 is at 3 o'clock, but our segments are laid out from the top.
        // Let's adjust the segment calculation based on the visual layout.
        // The text is rotated 45, 135, 225, 315. The segments are 0-90, 90-180...
        // Let's assume the pointer points up. Then segment 0 is 270-360, 1 is 180-270, etc.
        const finalIndex = Math.floor((360 - (actualRotation % 360)) / segmentAngle) % questionTypes.length;

        presentNewQuestion(questionTypes[finalIndex].id);
    }

    function resetGame() {
        playSound('navigate');
        score = 0;
        scoreElement.textContent = score;
        isSpinning = false;
        spinButton.disabled = false;
        usedQuestionIdentifiers.clear();
        wheelElement.style.transition = 'none';
        rotation = 0;
        wheelElement.style.transform = `rotate(0deg)`;
        applyRandomWheelColors();
        // Force reflow before re-enabling transition
        void wheelElement.offsetWidth;
        wheelElement.style.transition = 'transform 7s cubic-bezier(0.25, 1, 0.5, 1)';
    }

    function generateQuestion(type) {
        const uniqueSurahIds = [...new Set(allVerses.map(v => v.surahId))];
        if (uniqueSurahIds.length === 0) return null;
        const randomSurahId = uniqueSurahIds[Math.floor(Math.random() * uniqueSurahIds.length)];
        const surah = surahIndex.find(s => s.id === randomSurahId);
        if (!surah) return null;
        const surahVerses = allVerses.filter(v => v.surahId === surah.id);
        if (surahVerses.length === 0) return null;
        switch(type) {
            case 'identify_surah': {
                const verse = surahVerses[Math.floor(Math.random() * surahVerses.length)];
                const verseText = removeBasmallahFromVerse(verse.text, surah.id);
                const otherNames = surahIndex.filter(s => s.name !== surah.name).map(s => s.name).sort(() => 0.5 - Math.random()).slice(0, 2);
                return { id: `identify_${surah.name}_${verse.id}`, type, surah, question: `"${verseText}"`, options: [surah.name, ...otherNames].sort(() => 0.5 - Math.random()), answer: surah.name };
            }
            case 'complete': {
                const verse = surahVerses[Math.floor(Math.random() * surahVerses.length)];
                const words = removeBasmallahFromVerse(verse.text, surah.id).split(' ').filter(w => w.trim() !== '');
                if (words.length < 2) return null;

                const answerWord = words.pop();
                const questionText = words.join(' ') + ' ______';

                const otherWords = new Set();
                let attempts = 0;
                // Try to find distractor words from the same surah first
                const sameSurahWords = surahVerses
                    .flatMap(v => removeBasmallahFromVerse(v.text, v.surahId).split(' '))
                    .filter(w => w.trim().length > 2 && w !== answerWord);

                while (otherWords.size < 2 && attempts < 50) {
                    if (sameSurahWords.length > otherWords.size) {
                        const randomWord = sameSurahWords[Math.floor(Math.random() * sameSurahWords.length)];
                        if (randomWord !== answerWord) {
                           otherWords.add(randomWord);
                        }
                    } else { // Fallback to any verse if not enough words in the same surah
                        const randomVerse = allVerses[Math.floor(Math.random() * allVerses.length)];
                        const randomVerseWords = removeBasmallahFromVerse(randomVerse.text, randomVerse.surahId).split(' ').filter(w => w.trim().length > 2);
                        if (randomVerseWords.length > 0) {
                            const randomWord = randomVerseWords[Math.floor(Math.random() * randomVerseWords.length)];
                            if (randomWord !== answerWord) {
                                otherWords.add(randomWord);
                            }
                        }
                    }
                    attempts++;
                }
                const finalOtherWords = [...otherWords];
                while(finalOtherWords.length < 2) { finalOtherWords.push("القرآن"); }

                return { id: `complete_${surah.name}_${verse.id}`, type, surah, question: questionText, options: [answerWord, ...finalOtherWords].sort(() => 0.5 - Math.random()), answer: answerWord };
            }
            case 'related_ayah': {
                if (surahVerses.length < 3) return null;
                const isNext = Math.random() > 0.5;
                const index = isNext ? Math.floor(Math.random() * (surahVerses.length - 1)) : Math.floor(Math.random() * (surahVerses.length - 1)) + 1;
                const current = surahVerses[index];
                const related = isNext ? surahVerses[index + 1] : surahVerses[index - 1];
                const qText = isNext ? `ما هي الآية التي تلي: "${removeBasmallahFromVerse(current.text, surah.id)}"` : `ما هي الآية التي تسبق: "${removeBasmallahFromVerse(current.text, surah.id)}"`
                const other = surahVerses.filter(v => v.id !== current.id && v.id !== related.id).sort((a, b) => Math.abs(a.id - current.id) - Math.abs(b.id - current.id)).slice(0, 2).map(v => removeBasmallahFromVerse(v.text, v.surahId));
                return { id: `related_${surah.name}_${current.id}`, type, surah, question: qText, options: [removeBasmallahFromVerse(related.text, surah.id), ...other].sort(() => 0.5 - Math.random()), answer: removeBasmallahFromVerse(related.text, surah.id) };
            }
            case 'arrange': {
                if (surahVerses.length < 3) return null;
                const start = Math.floor(Math.random() * (surahVerses.length - 2));
                const verses = surahVerses.slice(start, start + 3);
                const answer = verses.map(v => removeBasmallahFromVerse(v.text, surah.id));
                const options = [...answer].sort(() => 0.5 - Math.random());
                return { id: `arrange_${surah.name}_${verses[0].id}`, type, surah, question: `رتّب الآيات التالية من سورة ${surah.name}`, options: options, answer: answer };
            }
        }
        return null;
    }

    function presentNewQuestion(type) {
        let question = null;
        let attempts = 0;
        const maxAttempts = 50;
        while (attempts < maxAttempts) {
            const generatedQuestion = generateQuestion(type);
            if (!generatedQuestion) { attempts++; continue; }
            if (!usedQuestionIdentifiers.has(generatedQuestion.id)) { question = generatedQuestion; break; }
            attempts++;
        }
        if (!question) {
            // Fallback logic if no unique question can be generated
            console.warn("Could not generate a unique question. Resetting used questions.");
            usedQuestionIdentifiers.clear();
            question = generateQuestion(type);
        }
        if (question) {
            usedQuestionIdentifiers.add(question.id);
            displayQuestion(question);
        } else {
            console.error("Failed to generate any question.");
            isSpinning = false;
            spinButton.disabled = false;
        }
    }

    function displayQuestion(question) {
        let modalOverlay = document.getElementById('game-modal-overlay');
        if (!modalOverlay) {
            modalOverlay = document.createElement('div');
            modalOverlay.id = 'game-modal-overlay';
            modalOverlay.className = 'game-modal-overlay';
            modalOverlay.innerHTML = `<div class="game-modal-content"><div class="game-modal-header"><h2 id="modal-question-title"></h2><button class="game-modal-close-btn"><span class="material-icons">close</span></button></div><div class="game-modal-body"><p id="modal-question-text" class="question-text"></p><div id="modal-options-container" class="question-options-container"></div><p id="modal-feedback" class="feedback-message"></p><div id="modal-action-buttons" class="action-buttons"></div></div></div>`;
            document.body.appendChild(modalOverlay);
            modalOverlay.querySelector('.game-modal-close-btn').addEventListener('click', hideQuestionModal);
        }
        const modalQuestionTitle = modalOverlay.querySelector('#modal-question-title');
        const modalQuestionText = modalOverlay.querySelector('#modal-question-text');
        const modalOptionsContainer = modalOverlay.querySelector('#modal-options-container');
        const modalFeedback = modalOverlay.querySelector('#modal-feedback');
        const modalActionButtons = modalOverlay.querySelector('#modal-action-buttons');
        modalQuestionTitle.textContent = questionTypes.find(t => t.id === question.type).text;
        modalQuestionText.textContent = question.question;
        modalOptionsContainer.innerHTML = '';
        modalActionButtons.innerHTML = '';
        modalFeedback.textContent = '';
        modalFeedback.className = 'feedback-message';
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

    function setupChoiceQuestion(question, optionsEl, actionsEl, feedbackEl) {
        question.options.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'option-button';
            button.onclick = (e) => checkAnswer(option === question.answer, e.target, question, optionsEl, actionsEl, feedbackEl);
            optionsEl.appendChild(button);
        });
    }

    function setupArrangeQuestion(question, optionsEl, actionsEl, feedbackEl) {
        const draggablesContainer = document.createElement('div');
        draggablesContainer.className = 'draggables-container';
        draggablesContainer.id = 'draggables-container-arrange';
        let draggedItem = null;

        question.options.forEach((option, index) => {
            const div = document.createElement('div');
            div.textContent = option;
            div.className = 'draggable';
            div.draggable = true;
            div.id = `drag-${index}`;

            // Desktop drag events
            div.addEventListener('dragstart', () => {
                draggedItem = div;
                setTimeout(() => div.classList.add('dragging'), 0);
                playSound('drag_start');
            });
            div.addEventListener('dragend', () => {
                if (draggedItem) draggedItem.classList.remove('dragging');
                draggedItem = null;
            });

            // Mobile touch events
            div.addEventListener('touchstart', (e) => {
                draggedItem = div;
                div.classList.add('dragging');
                playSound('drag_start');
            }, { passive: true });
            div.addEventListener('touchend', () => {
                if (draggedItem) draggedItem.classList.remove('dragging');
                draggedItem = null;
            });

            draggablesContainer.appendChild(div);
        });

        // Dragover/Touchmove on the container
        draggablesContainer.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(draggablesContainer, e.clientY, '.draggable');
            if (draggedItem) {
                if (afterElement == null) {
                    draggablesContainer.appendChild(draggedItem);
                } else {
                    draggablesContainer.insertBefore(draggedItem, afterElement);
                }
            }
        });

        draggablesContainer.addEventListener('touchmove', e => {
            if (draggedItem) {
                e.preventDefault();
                const afterElement = getDragAfterElement(draggablesContainer, e.touches[0].clientY, '.draggable');
                if (afterElement == null) {
                    draggablesContainer.appendChild(draggedItem);
                } else {
                    draggablesContainer.insertBefore(draggedItem, afterElement);
                }
            }
        }, { passive: false });


        optionsEl.appendChild(draggablesContainer);
        const checkButton = document.createElement('button');
        checkButton.textContent = 'تحقق من الترتيب';
        checkButton.className = 'action-button';
        checkButton.onclick = () => checkArrangeAnswer(question, optionsEl, actionsEl, feedbackEl);
        actionsEl.appendChild(checkButton);
    }

    function checkAnswer(isCorrect, element, question, optionsEl, actionsEl, feedbackEl) {
        optionsEl.querySelectorAll('button, .draggable').forEach(opt => {
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
            setTimeout(hideQuestionModal, 1000);
        } else {
            feedbackEl.textContent = 'إجابة خاطئة، حاول مرة أخرى!';
            feedbackEl.className = 'feedback-message feedback-incorrect';
            element.classList.add('wrong-answer');
            if (question.type !== 'arrange') {
                const correctButton = Array.from(optionsEl.querySelectorAll('.option-button')).find(btn => btn.textContent === question.answer);
                if (correctButton) correctButton.classList.add('correct-answer');
            }
            playSound('incorrect');
            const continueBtn = document.createElement('button');
            continueBtn.textContent = 'متابعة';
            continueBtn.className = 'action-button';
            continueBtn.onclick = hideQuestionModal;
            actionsEl.appendChild(continueBtn);
        }
    }

    function checkArrangeAnswer(question, optionsEl, actionsEl, feedbackEl) {
        const draggablesContainer = optionsEl.querySelector('#draggables-container-arrange');
        const arrangedItems = Array.from(draggablesContainer.children).map(child => child.textContent);
        const isCorrect = JSON.stringify(arrangedItems) === JSON.stringify(question.answer);
        checkAnswer(isCorrect, draggablesContainer, question, optionsEl, actionsEl, feedbackEl);
    }
}


// --- Exported Functions ---

export function displayGames(surah, start, end) {
    const gameArea = document.getElementById('game-area');
    const gameTitle = document.getElementById('games-title');
    gameTitle.textContent = `ألعاب مخصصة على سورة ${surah.name}`;
    localStorage.setItem('lastSurahId', surah.id);
    localStorage.setItem('lastStartVerse', start);
    localStorage.setItem('lastEndVerse', end);

    const games = [
        { key: 'card-matching-special', label: 'لعبة مطابقة البطاقات', icon: 'style', desc: 'اختبر قوة ذاكرتك بمطابقة الآيات المتشابهة أو أجزاء الآية الواحدة.', cardGradient: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)', iconColor: '#fff' },
        { key: 'verse-order-special', label: 'ترتيب الآيات', icon: 'sort', desc: 'رتب الآيات بالترتيب الصحيح وتحدى ذاكرتك القرآنية.', cardGradient: 'linear-gradient(135deg, #2af598 0%, #009efd 100%)', iconColor: '#fff' },
        { key: 'verse-cascade-special', label: 'شلال الآيات', icon: 'waterfall_chart', desc: 'التقط الكلمات الصحيحة من الشلال وأكمل الآية قبل أن تسقط الكلمات.', cardGradient: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)', iconColor: '#fff' }
    ];

    const cardsGrid = document.querySelector('#games-section .games-cards-grid');
    cardsGrid.innerHTML = games.map(game => `
        <div class="game-card" tabindex="0" data-game="${game.key}">
            <div class="game-card-inner" style="background: ${game.cardGradient};">
                <span class="material-icons icon" style="color: ${game.iconColor};">${game.icon}</span>
                <div class="title">${game.label}</div>
                <div class="desc">${game.desc}</div>
                <button class="go-btn">ابدأ اللعبة</button>
            </div>
        </div>`).join('');

    cardsGrid.classList.remove('hidden');
    cardsGrid.classList.add('grid');

    document.querySelectorAll('#games-section .game-card').forEach((card, i) => {
        card.style.opacity = 0;
        setTimeout(() => { card.style.transition = 'opacity 0.5s cubic-bezier(.34,1.56,.64,1)'; card.style.opacity = 1; }, 100 + i * 120);
        const gameKey = card.getAttribute('data-game');
        card.addEventListener('click', () => showGame(gameKey, surah, start, end));
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter') showGame(gameKey, surah, start, end); });
        card.querySelector('.go-btn').addEventListener('click', (e) => { e.stopPropagation(); showGame(gameKey, surah, start, end); });
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
        { key: 'wheel-general', label: 'العجلة الدوارة', icon: 'rotate_right', desc: 'أدر العجلة وأجب على الأسئلة القرآنية في جو من الحماس والتحدي.', cardGradient: 'linear-gradient(135deg, #ff8c42 0%, #ffc048 100%)', iconColor: '#fff' },
        { key: 'card-matching-general', label: 'لعبة مطابقة البطاقات', icon: 'style', desc: 'طابق الآيات المتتالية أو أجزاء الآية من مجموعة سور مختارة.', cardGradient: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)', iconColor: '#fff' }
    ];

    generalGameArea.innerHTML = `<div class="games-cards-grid">${generalGames.map(game => `
        <div class="game-card" tabindex="0" data-game="${game.key}">
            <div class="game-card-inner" style="background: ${game.cardGradient};">
                <span class="material-icons icon" style="color: ${game.iconColor};">${game.icon}</span>
                <div class="title">${game.label}</div>
                <div class="desc">${game.desc}</div>
                <button class="go-btn">ابدأ اللعبة</button>
            </div>
        </div>`).join('')}</div>`;

    const cardsGrid = generalGameArea.querySelector('.games-cards-grid');
    cardsGrid.classList.remove('hidden');
    cardsGrid.classList.add('grid');

    document.querySelectorAll('#general-game-area .game-card').forEach((card, i) => {
        card.style.opacity = 0;
        setTimeout(() => { card.style.transition = 'opacity 0.5s cubic-bezier(.34,1.56,.64,1)'; card.style.opacity = 1; }, 100 + i * 120);
        const gameKey = card.getAttribute('data-game');
        card.addEventListener('click', () => showGeneralGame(gameKey, startSurahId, endSurahId, surahIndex));
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter') showGeneralGame(gameKey, startSurahId, endSurahId, surahIndex); });
        card.querySelector('.go-btn').addEventListener('click', (e) => { e.stopPropagation(); showGeneralGame(gameKey, startSurahId, endSurahId, surahIndex); });
    });

    document.querySelectorAll('#general-games-section .game-container').forEach(g => g.classList.add('hidden'));
}

export function showGame(gameKey, surah, start, end) {
    cleanupActiveGame();
    document.querySelector('#games-section .games-cards-grid').classList.add('hidden');
    document.querySelectorAll('#games-section .game-container').forEach(g => g.classList.add('hidden'));

    const el = document.getElementById(gameKey);
    if (!el) {
        console.error(`Game container with ID "${gameKey}" not found.`);
        return;
    }
    el.classList.remove('hidden');
    el.classList.add('active');
    document.getElementById('global-back-to-games-btn').classList.remove('hidden');
    document.getElementById('global-back-to-games-btn').classList.add('flex');

    const gameId = gameKey.replace('-special', '');
    switch (gameId) {
        case 'card-matching':
            const verses = surah.verses.filter(v => v.id >= start && v.id <= end);
            setupCardMatchingGame(gameKey, verses, surah.name);
            break;
        case 'verse-order':
            setupVerseOrderGame(gameKey, surah, start, end);
            break;
        case 'verse-cascade':
            setupVerseCascadeGame(gameKey, surah, start, end);
            break;
    }
}

export function showGameGrid() {
    cleanupActiveGame();
    document.querySelectorAll('#games-section .game-container').forEach(g => g.classList.add('hidden'));
    document.querySelector('#games-section .games-cards-grid').classList.remove('hidden');
    document.getElementById('global-back-to-games-btn').classList.add('hidden');
}

export function showGeneralGame(gameKey, startSurahId, endSurahId, surahIndex) {
    const surahsToLoad = [];
    for (let i = startSurahId; i <= endSurahId; i++) {
        surahsToLoad.push(i);
    }

    Promise.all(surahsToLoad.map(id => fetch(`./quran_data/${id}.json`).then(res => res.ok ? res.json() : Promise.reject(`Failed to load surah ${id}`))))
        .then(surahDataArray => {
            const allVerses = surahDataArray.flatMap(surahData => surahData.verses.map(v => ({ ...v, surahId: surahData.id })));
            const generalGameArea = document.getElementById('general-game-area');
            const generalGamesSection = document.getElementById('general-games-section');
            generalGameArea.classList.add('hidden');
            generalGamesSection.querySelectorAll('.game-container').forEach(g => g.classList.add('hidden'));

            const el = document.getElementById(gameKey);
            if (!el) {
                 console.error(`Game container with ID "${gameKey}" not found.`);
                return;
            }
            el.classList.remove('hidden');
            el.classList.add('active');

            document.getElementById('general-back-to-games-btn').classList.remove('hidden');

            const gameId = gameKey.replace('-general', '');
            if (gameId === 'wheel') {
                setupWheelGame(gameKey, { verses: allVerses, surahIndex: surahIndex }, startSurahId, endSurahId);
            } else if (gameId === 'card-matching') {
                const gameName = `من ${surahIndex.find(s=>s.id === startSurahId).name} إلى ${surahIndex.find(s=>s.id === endSurahId).name}`;
                setupCardMatchingGame(gameKey, allVerses, gameName);
            }
        })
        .catch(error => console.error('Error loading surah data for general games:', error));
}

export function showGeneralGameGrid() {
    cleanupActiveGame();
    document.getElementById('general-game-area').classList.remove('hidden');
    document.querySelectorAll('#general-games-section .game-container').forEach(g => g.classList.add('hidden'));
    document.getElementById('general-back-to-games-btn').classList.add('hidden');
}

export function cleanupActiveGame() {
    if (activeCardMatchingGame) {
        activeCardMatchingGame.destroy();
        activeCardMatchingGame = null;
    }
    if (verseCascadeGameLoopId) {
        cancelAnimationFrame(verseCascadeGameLoopId);
        verseCascadeGameLoopId = null;
        const cascadeContainer = document.getElementById('verse-cascade-special');
        if (cascadeContainer) cascadeContainer.innerHTML = '';
    }
    const wheelContainer = document.getElementById('wheel-general');
    if (wheelContainer) wheelContainer.innerHTML = '';

    const verseOrderContainer = document.getElementById('verse-order-special');
    if(verseOrderContainer) verseOrderContainer.innerHTML = '';
}