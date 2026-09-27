/**
 * Chanakya — Voice Module
 * Handles Speech-to-Text (mic input) and Text-to-Speech (bot replies).
 * Uses the browser's Web Speech API — zero backend cost.
 */

const VoiceModule = (() => {
    const micBtn = document.getElementById('mic-btn');
    const chatInput = document.getElementById('chat-input');

    let recognition = null;
    let isListening = false;

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasSpeechRecognition = !!SpeechRecognition;
    const hasSpeechSynthesis = 'speechSynthesis' in window;

    // --- Initialization ---
    function init() {
        if (!hasSpeechRecognition) {
            micBtn.title = 'Voice input not supported in this browser';
            micBtn.style.opacity = '0.4';
            micBtn.style.cursor = 'not-allowed';
            return;
        }

        micBtn.addEventListener('click', toggleListening);
    }

    // --- Speech-to-Text ---
    function toggleListening() {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }

    function startListening() {
        if (!hasSpeechRecognition) return;

        // Determine locale: use last detected locale from chat, or default to en-IN
        const locale = (typeof ChatApp !== 'undefined' && ChatApp.getLastLocale)
            ? ChatApp.getLastLocale()
            : 'en-IN';

        recognition = new SpeechRecognition();
        recognition.lang = locale;
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
            micBtn.innerHTML = '⏹️';
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            chatInput.value = transcript;
            chatInput.dispatchEvent(new Event('input'));
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove('listening');
            micBtn.innerHTML = '🎙️';
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            isListening = false;
            micBtn.classList.remove('listening');
            micBtn.innerHTML = '🎙️';

            if (event.error === 'not-allowed') {
                showVoiceToast('Microphone access denied. Please allow microphone permissions.');
            } else if (event.error === 'no-speech') {
                showVoiceToast('No speech detected. Try again.');
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
        }
    }

    function stopListening() {
        if (recognition) {
            recognition.stop();
        }
    }

    // --- Text-to-Speech ---
    function speak(text, locale = 'en-IN') {
        if (!hasSpeechSynthesis) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Clean up text: remove markdown, emojis, etc.
        const cleanText = text
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/[🕉️🙏🩺📋🔊🪷✨💡]/g, '')
            .replace(/\n+/g, '. ')
            .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = locale;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find a matching voice
        const voices = window.speechSynthesis.getVoices();
        const matchedVoice = voices.find(v => v.lang === locale)
            || voices.find(v => v.lang.startsWith(locale.split('-')[0]));

        if (matchedVoice) {
            utterance.voice = matchedVoice;
        }

        window.speechSynthesis.speak(utterance);
    }

    // --- Helper ---
    function showVoiceToast(msg) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // --- Public API ---
    return {
        init,
        speak,
        isListening: () => isListening,
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    VoiceModule.init();

    // Preload voices (some browsers need this)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
});
