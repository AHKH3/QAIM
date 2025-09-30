// scripts/quran-worker.js

const surahCache = {}; // Cache to store loaded surah data

self.onmessage = async (event) => {
    const { type, surahId } = event.data;

    if (type === 'loadSurah') {
        try {
            // Check cache first
            if (surahCache[surahId]) {
                self.postMessage({ status: 'success', surahId, data: surahCache[surahId] });
                return;
            }

            // If not in cache, fetch from network
            const response = await fetch(`../quran_data/${surahId}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const surahData = await response.json();
            if (!surahData || typeof surahData !== 'object') {
                throw new Error('Parsed data is not a valid object.');
            }

            // Store in cache and send back to main thread
            surahCache[surahId] = surahData;
            self.postMessage({ status: 'success', surahId, data: surahData });

        } catch (error) {
            self.postMessage({ status: 'error', surahId, error: error.message });
        }
    }
};