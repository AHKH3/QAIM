// --- DOM Elements ---
const setupScreen = document.getElementById('setup-screen');
const gameBoard = document.getElementById('game-board');
const cardsGrid = document.getElementById('cards-grid');
const themeSelect = document.getElementById('theme-select');
const modeSelect = document.getElementById('mode-select');
const startGameBtn = document.getElementById('start-game-btn');
const resetGameBtn = document.getElementById('reset-game-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const attemptsEl = document.getElementById('attempts');
const endGameModal = document.getElementById('end-game-modal');
const endGameTitle = document.getElementById('end-game-title');
const endGameMessage = document.getElementById('end-game-message');

// --- Game State ---
let verses = [];
let surahName = '';
let gameMode = 'consecutive'; // 'consecutive' or 'split'
let theme = 'space';
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let score = 0;
let attempts = 0;
let timerInterval = null;
let seconds = 0;
let isLocked = false; // To prevent clicking more than 2 cards

// --- Helper Functions ---
function normalizeBasmallah(text) {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, "").replace(/ـ/g, "").replace(/ٱ/g, "ا").replace(/ٰ/g, "ا").replace(/\s+/g, "");
}

function removeBasmallahFromVerse(verseText) {
    const basmallahStandard = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    const normalizedVerse = normalizeBasmallah(verseText.trim());
    const normalizedBasmallah = normalizeBasmallah(basmallahStandard);
    if (normalizedVerse.startsWith(normalizedBasmallah)) {
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

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Game Logic ---
function createCards() {
    cardsGrid.innerHTML = '';
    cards = [];
    matchedPairs = 0;

    let cardData = [];
    const availableVerses = verses.map(v => ({...v, text: removeBasmallahFromVerse(v.text)})).filter(v => v.text.trim() !== '');

    if (gameMode === 'consecutive') {
        // Find pairs of consecutive verses
        for (let i = 0; i < availableVerses.length - 1; i++) {
            cardData.push({ id: availableVerses[i].id, content: availableVerses[i].text, pairId: i });
            cardData.push({ id: availableVerses[i+1].id, content: availableVerses[i+1].text, pairId: i });
        }
    } else { // split mode
        availableVerses.forEach(verse => {
            const words = verse.text.split(' ');
            if (words.length >= 4) { // Only use verses long enough to be split
                const midPoint = Math.ceil(words.length / 2);
                const firstHalf = words.slice(0, midPoint).join(' ');
                const secondHalf = words.slice(midPoint).join(' ');
                cardData.push({ id: verse.id, content: firstHalf, pairId: verse.id });
                cardData.push({ id: verse.id, content: secondHalf, pairId: verse.id });
            }
        });
    }

    // Take a limited number of pairs to keep the game playable, e.g., 8 pairs (16 cards)
    const uniquePairIds = [...new Set(cardData.map(c => c.pairId))];
    const selectedPairIds = shuffle(uniquePairIds).slice(0, 8);
    const finalCardData = cardData.filter(c => selectedPairIds.includes(c.pairId));

    if (finalCardData.length < 4) {
        cardsGrid.innerHTML = `<p class="error-message">لا توجد آيات كافية لهذا النمط في النطاق المحدد. حاول توسيع نطاق الآيات أو تغيير النمط.</p>`;
        return;
    }

    shuffle(finalCardData).forEach((item, index) => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.pairId = item.pairId;
        card.dataset.id = item.id;

        card.innerHTML = `
            <div class="card-inner">
                <div class="card-face card-front">
                    <span class="material-icons">memory</span>
                </div>
                <div class="card-face card-back">
                    ${item.content}
                </div>
            </div>
        `;
        card.addEventListener('click', () => flipCard(card));
        cardsGrid.appendChild(card);
        cards.push(card);
    });
}

function flipCard(card) {
    if (isLocked || card.classList.contains('flipped') || flippedCards.length >= 2) {
        return;
    }

    card.classList.add('flipped');
    flippedCards.push(card);

    if (flippedCards.length === 2) {
        isLocked = true;
        attempts++;
        updateGameInfo();
        checkForMatch();
    }
}

function checkForMatch() {
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.pairId === card2.dataset.pairId;

    if (isMatch) {
        score += 10;
        matchedPairs++;
        card1.classList.add('matched');
        card2.classList.add('matched');
        resetFlippedCards();
        if (matchedPairs * 2 === cards.length) {
            endGame(true);
        }
    } else {
        score = Math.max(0, score - 2);
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            resetFlippedCards();
        }, 1500);
    }
    updateGameInfo();
}

function resetFlippedCards() {
    flippedCards = [];
    isLocked = false;
}

// --- UI & Timer ---
function updateGameInfo() {
    scoreEl.textContent = `النقاط: ${score}`;
    attemptsEl.textContent = `المحاولات: ${attempts}`;
}

function startTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    timerInterval = setInterval(() => {
        seconds++;
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        timerEl.textContent = `الوقت: ${min}:${sec < 10 ? '0' : ''}${sec}`;
    }, 1000);
}

function applyTheme(selectedTheme) {
    document.body.classList.remove('sea-theme', 'forest-theme', 'space-theme');
    document.body.classList.add(`${selectedTheme}-theme`);
}

function resetGame() {
    clearInterval(timerInterval);
    score = 0;
    attempts = 0;
    seconds = 0;
    matchedPairs = 0;
    isLocked = false;
    flippedCards = [];
    updateGameInfo();
    timerEl.textContent = "الوقت: 0:00";
    createCards();
    startTimer();
}

function initializeGame() {
    theme = themeSelect.value;
    gameMode = modeSelect.value;
    applyTheme(theme);
    setupScreen.classList.add('hidden');
    gameBoard.classList.remove('hidden');
    resetGame();
}

function showSetupScreen() {
    gameBoard.classList.add('hidden');
    endGameModal.classList.add('hidden');
    setupScreen.classList.remove('hidden');
}

function endGame(isWin) {
    clearInterval(timerInterval);
    if (isWin) {
        endGameTitle.textContent = "أحسنت!";
        endGameMessage.textContent = `لقد أكملت اللعبة في ${timerEl.textContent} بـ ${attempts} محاولة. نتيجتك: ${score}.`;
    } else {
        // This case is not currently used but can be implemented for a loss condition
        endGameTitle.textContent = "حاول مرة أخرى!";
        endGameMessage.textContent = "حظاً أوفر في المرة القادمة.";
    }
    endGameModal.classList.remove('hidden');
}

// --- Event Listeners ---
startGameBtn.addEventListener('click', initializeGame);
resetGameBtn.addEventListener('click', resetGame);
playAgainBtn.addEventListener('click', showSetupScreen);
themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));

// --- Communication with Main App ---
window.addEventListener('message', (event) => {
    // A basic security check for the origin can be added here
    // if (event.origin !== 'expected_origin') return;

    const data = event.data;

    if (data.type === 'startGame') {
        verses = data.verses || [];
        surahName = data.surahName || 'محدد';

        // Update UI elements if needed, e.g., a title
        // const gameTitle = document.getElementById('game-title');
        // if(gameTitle) gameTitle.textContent = `لعبة الذاكرة - سورة ${surahName}`;

        // Reset and show the setup screen for the new data
        showSetupScreen();
    }
});

// Signal to the parent window that the iframe is ready to receive data
window.parent.postMessage({ type: 'ready' }, '*');
console.log("Memory game iframe is ready and has sent the 'ready' message.");