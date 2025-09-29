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
let gameScores = { 'meaning-match': 0, 'wheel': 0, 'verse-order': 0 };
let verseCascadeGameLoopId = null;

// --- Game Setup Functions ---

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
        <div class="game-header"><h3 class="game-title">لعبة توصيل المعاني</h3><p class="game-instructions">اسحب الكلمة من القائمة اليمنى وضعها على معناها الصحيح في القائمة اليسرى.</p></div>
        <div id="meaning-game-area" class="meaning-game-area"><div id="words-container" class="words-container"></div><div id="meanings-container" class="meanings-container"></div></div>
        <div class="game-footer"><div id="meaning-match-score" class="game-score">النتيجة: 0</div><button id="reset-game-btn" class="btn-reset-game"><span class="material-icons">refresh</span></button></div>`;
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
            if (wordItem) wordItem.classList.add('matched');
            score++;
            scoreElement.textContent = `النتيجة: ${score}`;
            playSound('correct');
            if (score === pairs.length) playSound('win');
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
                if (selectedWordDiv) selectedWordDiv.classList.remove('dragging');
                div.classList.add('dragging');
                selectedWordDiv = div;
                playSound('drag_start');
            });
        } else {
            div.draggable = true;
            div.addEventListener('dragstart', e => {
                if (div.classList.contains('matched')) { e.preventDefault(); return; }
                e.dataTransfer.setData('text/plain', word);
                e.target.classList.add('dragging');
                playSound('drag_start');
            });
            div.addEventListener('dragend', e => e.target.classList.remove('dragging'));
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
            box.addEventListener('dragover', e => { e.preventDefault(); if (!box.classList.contains('correct')) box.classList.add('over'); });
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
    document.getElementById('reset-game-btn').onclick = () => { playSound('navigate'); setupMeaningMatchGame(surah, start, end); };
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
        <div class="game-header"><h3 class="game-title">لعبة ترتيب الآيات</h3><p class="game-instructions">قم بسحب وإفلات الآيات لترتيبها بالترتيب الصحيح.</p></div>
        <div id="verse-order-area"></div>
        <button id="check-order-btn" class="btn-check">تحقق من الترتيب</button>
        <button id="reset-verse-order-btn" class="btn-reset"><span class="material-icons">refresh</span> إعادة اللعبة</button>
        <div id="verse-order-feedback"></div><div id="verse-order-score"></div>`;
    const verseArea = document.getElementById('verse-order-area');
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
    document.getElementById('check-order-btn').addEventListener('click', () => {
        playSound('click');
        const userOrder = Array.from(verseArea.children).map(child => child.textContent);
        const feedbackDiv = document.getElementById('verse-order-feedback');
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
    document.getElementById('reset-verse-order-btn').onclick = () => { setupVerseOrderGame(surah, start, end); playSound('navigate'); };
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
    const difficultySettings = { easy: { speed: 8, interval: 1800, lives: 5 }, medium: { speed: 6, interval: 1200, lives: 3 }, hard: { speed: 4, interval: 700, lives: 2 } };
    function renderDifficultySelection() {
        cleanupActiveGame();
        gameContentArea.innerHTML = `
            <div class="game-header"><h3 class="game-title">لعبة شلال الآيات</h3></div>
            <div class="difficulty-selector"><h3>اختر مستوى الصعوبة</h3><button class="btn-difficulty" data-difficulty="easy">سهل</button><button class="btn-difficulty" data-difficulty="medium">متوسط</button><button class="btn-difficulty" data-difficulty="hard">صعب</button></div>`;
        document.querySelectorAll('.btn-difficulty').forEach(btn => {
            btn.onclick = (e) => { difficulty = e.target.dataset.difficulty; renderGameUI(); startGame(); };
        });
    }
    function renderGameUI() {
        gameContentArea.innerHTML = `
            <div id="cascade-header"><div id="cascade-info"><span>النتيجة: <span id="cascade-score">0</span></span><span>المحاولات: <span id="cascade-lives"></span></span></div><button id="reset-cascade-btn" class="btn-reset"><span class="material-icons">refresh</span></button></div>
            <div id="cascade-area"></div><div id="cascade-verse-display"></div>`;
        document.getElementById('reset-cascade-btn').onclick = renderDifficultySelection;
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
        const cascadeArea = document.getElementById('cascade-area');
        if (cascadeArea) cascadeArea.innerHTML = '';
        fallingWords = [];
    }
    function gameLoop(timestamp) {
        if (lives <= 0 || verseCascadeGameLoopId === null) return;
        if (timestamp - lastSpawnTime > difficultySettings[difficulty].interval) { lastSpawnTime = timestamp; spawnWord(); }
        verseCascadeGameLoopId = requestAnimationFrame(gameLoop);
    }
    function loadVerse() {
        const cascadeArea = document.getElementById('cascade-area');
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
        const cascadeArea = document.getElementById('cascade-area');
        if (!cascadeArea) return;
        const nextWord = wordsToCatch[nextWordIndex];
        const isNextWordFalling = fallingWords.some(fw => fw.text === nextWord);
        let wordToSpawn = (!isNextWordFalling && nextWordIndex < wordsToCatch.length) ? nextWord : wordsToCatch[Math.floor(Math.random() * wordsToCatch.length)];
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
            const verseText = versesToShow[currentVerseIndex] ? `الآية: ${removeBasmallahFromVerse(versesToShow[currentVerseIndex].text, surah.id)}` : "";
            const caughtText = wordsToCatch.slice(0, nextWordIndex).join(' ');
            display.innerHTML = `<div class="full-verse-text">${verseText}</div><div class="caught-words-display">${caughtText} <span class="remaining-indicator">...</span></div>`;
        }
    }
    function updateScoreDisplay() { const scoreEl = document.getElementById('cascade-score'); if(scoreEl) scoreEl.textContent = score; }
    function updateLivesDisplay() { const livesEl = document.getElementById('cascade-lives'); if(livesEl) livesEl.textContent = lives > 0 ? '❤️'.repeat(lives) : '💔'; }
    function endGame(message) {
        cleanupActiveGame();
        const cascadeArea = document.getElementById('cascade-area');
        if(cascadeArea) {
            cascadeArea.innerHTML = `<div class="cascade-end-message"><h2>${message}</h2><p>نتيجتك النهائية: ${score}</p><button id="play-again-cascade-btn" class="btn-check">العب مرة أخرى</button></div>`;
            document.getElementById('play-again-cascade-btn').onclick = renderDifficultySelection;
        }
        const header = document.getElementById('cascade-header');
        if (header) header.style.display = 'none';
        const verseDisplay = document.getElementById('cascade-verse-display');
        if(verseDisplay) verseDisplay.style.display = 'none';
    }
    renderDifficultySelection();
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
                while (otherWords.size < 2 && attempts < 50) {
                    const randomVerse = allVerses[Math.floor(Math.random() * allVerses.length)];
                    const randomVerseWords = removeBasmallahFromVerse(randomVerse.text, randomVerse.surahId).split(' ').filter(w => w.trim().length > 2);
                    if (randomVerseWords.length > 0) {
                        const randomWord = randomVerseWords[Math.floor(Math.random() * randomVerseWords.length)];
                        if (randomWord !== answerWord) {
                            otherWords.add(randomWord);
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
        { key: 'meaning-match', label: 'لعبة توصيل المعاني', icon: 'sync_alt', desc: 'اختبر معرفتك بمعاني كلمات القرآن من خلال توصيل الكلمة بمعناها الصحيح.' , cardGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', iconColor: '#fff' },
        { key: 'verse-order', label: 'ترتيب الآيات', icon: 'sort', desc: 'رتب الآيات بالترتيب الصحيح وتحدى ذاكرتك القرآنية.', cardGradient: 'linear-gradient(135deg, #2af598 0%, #009efd 100%)', iconColor: '#fff' },
        { key: 'verse-cascade', label: 'شلال الآيات', icon: 'waterfall_chart', desc: 'التقط الكلمات الصحيحة من الشلال وأكمل الآية قبل أن تسقط الكلمات.', cardGradient: 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)', iconColor: '#fff' }
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
        { key: 'wheel', label: 'العجلة الدوارة', icon: 'rotate_right', desc: 'أدر العجلة وأجب على الأسئلة القرآنية في جو من الحماس والتحدي.', cardGradient: 'linear-gradient(135deg, #ff8c42 0%, #ffc048 100%)', iconColor: '#fff' }
    ];

    generalGameArea.innerHTML = `<div class="games-cards-grid">${generalGames.map(game => `
        <div class="game-card" tabindex="0" data-game="${game.key}">
            <div class="game-card-inner" style="background: ${game.cardGradient};">
                <span class="material-icons icon" style="color: ${game.iconColor};">${game.icon}</span>
                <div class="title">${game.label}</div>
                <div class="desc">${game.desc}</div>
                <button class="go-btn">ابدأ اللعبة</button>
            </div>
        </div>`).join('')}</div>
    <div id="general-wheel-game" class="game-container hidden">
        <button class="back-to-games-btn"><span class="material-icons">arrow_back</span></button>
        <div class="game-content-area"></div>
    </div>`;

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

    generalGameArea.querySelectorAll('.game-container').forEach(g => g.classList.add('hidden'));
}

export function showGame(game, surah, start, end) {
    cleanupActiveGame();
    document.querySelector('#games-section .games-cards-grid').classList.add('hidden');
    document.querySelectorAll('#games-section .game-container').forEach(g => g.classList.add('hidden'));
    const el = document.getElementById(`${game}-game`);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('active');
    document.getElementById('global-back-to-games-btn').classList.remove('hidden');
    document.getElementById('global-back-to-games-btn').classList.add('flex');

    switch (game) {
        case 'meaning-match': setupMeaningMatchGame(surah, start, end); break;
        case 'verse-order': setupVerseOrderGame(surah, start, end); break;
        case 'verse-cascade': setupVerseCascadeGame(surah, start, end); break;
    }
}

export function showGameGrid() {
    cleanupActiveGame();
    document.querySelectorAll('#games-section .game-container').forEach(g => g.classList.add('hidden'));
    document.querySelector('#games-section .games-cards-grid').classList.remove('hidden');
    document.getElementById('global-back-to-games-btn').classList.add('hidden');
}

export function showGeneralGame(game, startSurahId, endSurahId, surahIndex) {
    const surahsToLoad = [];
    for (let i = startSurahId; i <= endSurahId; i++) {
        surahsToLoad.push(i);
    }

    Promise.all(surahsToLoad.map(id => fetch(`./quran_data/${id}.json`).then(res => res.ok ? res.json() : Promise.reject(`Failed to load surah ${id}`))))
        .then(surahDataArray => {
            const allVerses = surahDataArray.flatMap(surahData => surahData.verses.map(v => ({ ...v, surahId: surahData.id })));
            const generalGameArea = document.getElementById('general-game-area');
            generalGameArea.querySelector('.games-cards-grid').classList.add('hidden');
            generalGameArea.querySelectorAll('.game-container').forEach(g => g.classList.add('hidden'));
            const el = document.getElementById(`general-${game}-game`);
            if (!el) return;
            el.classList.remove('hidden');
            el.classList.add('active');
            const backButton = el.querySelector('.back-to-games-btn');
            backButton.classList.remove('hidden');
            backButton.classList.add('flex');
            if (game === 'wheel') {
                setupWheelGame({ verses: allVerses, surahIndex: surahIndex }, startSurahId, endSurahId);
            }
        })
        .catch(error => console.error('Error loading surah data for general games:', error));
}

export function showGeneralGameGrid() {
    const generalGameArea = document.getElementById('general-game-area');
    generalGameArea.querySelector('.games-cards-grid').classList.remove('hidden');
    generalGameArea.querySelectorAll('.game-container').forEach(g => g.classList.add('hidden'));
}

export function cleanupActiveGame() {
    if (verseCascadeGameLoopId) {
        cancelAnimationFrame(verseCascadeGameLoopId);
        verseCascadeGameLoopId = null;
        const cascadeArea = document.getElementById('cascade-area');
        if (cascadeArea) cascadeArea.innerHTML = '';
    }
}