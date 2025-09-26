// scripts/audio.js

let isMuted = false;
let audioCtx = null;

/**
 * Initializes the Web Audio API context.
 * Must be called from a user interaction event (e.g., click).
 */
export function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser");
        }
    }
}

/**
 * Plays a sound of a specific type.
 * @param {string} type - The type of sound to play (e.g., 'correct', 'click').
 */
export function playSound(type) {
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

/**
 * Toggles the mute state.
 */
export function toggleMute() {
    isMuted = !isMuted;
    updateMuteButtonIcon();
    if (!isMuted && !audioCtx) {
        initAudio();
    }
}

/**
 * Updates the mute button icon based on the current mute state.
 */
export function updateMuteButtonIcon() {
    const muteBtnDesktop = document.getElementById('mute-btn-desktop');
    const muteBtnMobile = document.getElementById('mute-btn-mobile');
    const icon = isMuted ? 'volume_off' : 'volume_up';

    if (muteBtnDesktop) {
        muteBtnDesktop.innerHTML = `<span class="material-icons">${icon}</span>`;
    }
    if (muteBtnMobile) {
        muteBtnMobile.innerHTML = `<span class="material-icons">${icon}</span>`;
    }
}