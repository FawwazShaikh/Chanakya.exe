/**
 * Chanakya — Sanskrit Keypad Module
 * A virtual on-screen Devanagari keyboard with two modes:
 *   1. Direct Devanagari key taps
 *   2. ITRANS transliteration (type Roman → get Devanagari live)
 *
 * Includes a built-in lightweight ITRANS→Devanagari transliterator
 * (no external dependency needed, but can be swapped for Sanscript.js).
 */

const SanskritKeypad = (() => {
    // --- ITRANS to Devanagari mapping ---
    const ITRANS_MAP = {
        // Vowels
        'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'u': 'उ', 'uu': 'ऊ',
        'R^i': 'ऋ', 'R^I': 'ॠ', 'L^i': 'ऌ', 'e': 'ए', 'ai': 'ऐ',
        'o': 'ओ', 'au': 'औ', 'aM': 'अं', 'aH': 'अः',

        // Consonants
        'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ', '~Na': 'ङ',
        'cha': 'च', 'Cha': 'छ', 'ja': 'ज', 'jha': 'झ', '~na': 'ञ',
        'Ta': 'ट', 'Tha': 'ठ', 'Da': 'ड', 'Dha': 'ढ', 'Na': 'ण',
        'ta': 'त', 'tha': 'थ', 'da': 'द', 'dha': 'ध', 'na': 'न',
        'pa': 'प', 'pha': 'फ', 'ba': 'ब', 'bha': 'भ', 'ma': 'म',
        'ya': 'य', 'ra': 'र', 'la': 'ल', 'va': 'व', 'wa': 'व',
        'sha': 'श', 'Sha': 'ष', 'sa': 'स', 'ha': 'ह',

        // Special
        'kSha': 'क्ष', 'tra': 'त्र', 'j~na': 'ज्ञ', 'GYa': 'ज्ञ',
        'shra': 'श्र',

        // Matras (vowel signs for conjuncts — used internally)
        'A': 'ा', 'I': 'ी', 'U': 'ू', 'E': 'े', 'AI': 'ै',
        'O': 'ो', 'AU': 'ौ',

        // Numerals
        '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
        '5': '५', '6': '६', '7': '७', '8': '८', '9': '९',

        // Punctuation
        '.': '।', '..': '॥', 'OM': 'ॐ', 'om': 'ॐ',
    };

    // Simple word-level transliterator
    function transliterateITRANS(input) {
        if (!input) return '';

        let result = '';
        const words = input.split(/(\s+)/);

        for (const word of words) {
            if (/^\s+$/.test(word)) {
                result += word;
                continue;
            }

            // Try to find longest matches first
            let i = 0;
            let converted = '';
            while (i < word.length) {
                let matched = false;

                // Try decreasing lengths (max 5 chars)
                for (let len = Math.min(5, word.length - i); len >= 1; len--) {
                    const chunk = word.substring(i, i + len);
                    if (ITRANS_MAP[chunk]) {
                        converted += ITRANS_MAP[chunk];
                        i += len;
                        matched = true;
                        break;
                    }
                }

                if (!matched) {
                    converted += word[i];
                    i++;
                }
            }
            result += converted;
        }

        return result;
    }

    // --- Devanagari Key Layout ---
    const SWARAS = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः'];
    const VYANJANAS_ROW1 = ['क', 'ख', 'ग', 'घ', 'ङ'];
    const VYANJANAS_ROW2 = ['च', 'छ', 'ज', 'झ', 'ञ'];
    const VYANJANAS_ROW3 = ['ट', 'ठ', 'ड', 'ढ', 'ण'];
    const VYANJANAS_ROW4 = ['त', 'थ', 'द', 'ध', 'न'];
    const VYANJANAS_ROW5 = ['प', 'फ', 'ब', 'भ', 'म'];
    const ANTAHSTHA = ['य', 'र', 'ल', 'व'];
    const USHMA = ['श', 'ष', 'स', 'ह'];
    const SPECIAL = ['क्ष', 'त्र', 'ज्ञ', 'श्र', 'ॐ'];
    const MATRAS = ['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः', '्'];
    const NUMERALS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    const PUNCTUATION = ['।', '॥', ' '];

    // --- DOM State ---
    let isOpen = false;
    let mode = 'direct'; // 'direct' or 'translit'

    function init() {
        const toggleBtn = document.getElementById('keypad-toggle');
        const container = document.getElementById('keypad-container');

        if (!toggleBtn || !container) return;

        toggleBtn.addEventListener('click', () => {
            isOpen = !isOpen;
            container.classList.toggle('open', isOpen);
            toggleBtn.classList.toggle('active', isOpen);
        });

        renderKeypad(container);
    }

    function renderKeypad(container) {
        const glass = container.querySelector('.keypad-glass');
        if (!glass) return;

        glass.innerHTML = '';

        // Header with mode toggle
        const header = document.createElement('div');
        header.className = 'keypad-header';
        header.innerHTML = `
            <span class="keypad-title">संस्कृत कीबोर्ड</span>
            <div class="keypad-mode-toggle">
                <button class="mode-btn active" data-mode="direct">Direct</button>
                <button class="mode-btn" data-mode="translit">Transliterate</button>
            </div>
        `;
        glass.appendChild(header);

        // Mode toggle handlers
        header.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                header.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                mode = btn.dataset.mode;
                updateKeypadView();
            });
        });

        // Transliteration input row
        const translitRow = document.createElement('div');
        translitRow.className = 'translit-input-row';
        translitRow.id = 'translit-row';
        translitRow.innerHTML = `
            <span class="translit-label">Type ITRANS →</span>
            <span class="translit-preview" id="translit-preview"></span>
        `;
        glass.appendChild(translitRow);

        // Scrollable key area
        const scrollArea = document.createElement('div');
        scrollArea.className = 'keypad-scroll';
        scrollArea.id = 'keypad-keys-area';
        glass.appendChild(scrollArea);

        renderDirectKeys(scrollArea);
        setupTransliteration();
    }

    function renderDirectKeys(container) {
        container.innerHTML = '';

        const sections = [
            { label: 'स्वर (Vowels)', keys: SWARAS },
            { label: 'वर्ग — क', keys: VYANJANAS_ROW1 },
            { label: 'वर्ग — च', keys: VYANJANAS_ROW2 },
            { label: 'वर्ग — ट', keys: VYANJANAS_ROW3 },
            { label: 'वर्ग — त', keys: VYANJANAS_ROW4 },
            { label: 'वर्ग — प', keys: VYANJANAS_ROW5 },
            { label: 'अन्तःस्थ + ऊष्म', keys: [...ANTAHSTHA, ...USHMA] },
            { label: 'संयुक्त + विशेष', keys: SPECIAL },
            { label: 'मात्राएँ (Matras)', keys: MATRAS },
            { label: 'अंक (Numerals)', keys: NUMERALS },
            { label: 'विराम', keys: PUNCTUATION },
        ];

        sections.forEach(section => {
            const label = document.createElement('div');
            label.className = 'keypad-section-label';
            label.textContent = section.label;
            container.appendChild(label);

            const row = document.createElement('div');
            row.className = 'keypad-keys';

            section.keys.forEach(key => {
                const btn = document.createElement('button');
                btn.className = 'key-btn';
                btn.textContent = key === ' ' ? '␣' : key;
                btn.dataset.char = key;
                btn.addEventListener('click', () => insertChar(key));
                row.appendChild(btn);
            });

            // Add backspace and space to first section
            if (section === sections[0]) {
                const bksp = document.createElement('button');
                bksp.className = 'key-btn special';
                bksp.textContent = '⌫';
                bksp.addEventListener('click', handleBackspace);
                row.appendChild(bksp);
            }

            container.appendChild(row);
        });
    }

    function setupTransliteration() {
        const chatInput = document.getElementById('chat-input');
        const preview = document.getElementById('translit-preview');

        if (!chatInput || !preview) return;

        chatInput.addEventListener('input', () => {
            if (mode === 'translit') {
                const converted = transliterateITRANS(chatInput.value);
                preview.textContent = converted;
            }
        });
    }

    function updateKeypadView() {
        const translitRow = document.getElementById('translit-row');
        const keysArea = document.getElementById('keypad-keys-area');
        const chatInput = document.getElementById('chat-input');
        const preview = document.getElementById('translit-preview');

        if (mode === 'translit') {
            translitRow.classList.add('active');
            keysArea.style.opacity = '0.5';
            // Show current transliteration
            if (chatInput && preview) {
                preview.textContent = transliterateITRANS(chatInput.value);
            }
        } else {
            translitRow.classList.remove('active');
            keysArea.style.opacity = '1';
        }
    }

    function insertChar(char) {
        if (typeof ChatApp !== 'undefined' && ChatApp.insertText) {
            ChatApp.insertText(char);
        }
    }

    function handleBackspace() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;

        const pos = chatInput.selectionStart;
        if (pos > 0) {
            const before = chatInput.value.substring(0, pos - 1);
            const after = chatInput.value.substring(pos);
            chatInput.value = before + after;
            chatInput.selectionStart = chatInput.selectionEnd = pos - 1;
            chatInput.dispatchEvent(new Event('input'));
            chatInput.focus();
        }
    }

    // Public method: get transliterated text (for "insert transliteration" button)
    function getTransliterated() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return '';
        return transliterateITRANS(chatInput.value);
    }

    function applyTransliteration() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        chatInput.value = transliterateITRANS(chatInput.value);
        chatInput.dispatchEvent(new Event('input'));
    }

    return {
        init,
        transliterate: transliterateITRANS,
        getTransliterated,
        applyTransliteration,
    };
})();

document.addEventListener('DOMContentLoaded', SanskritKeypad.init);
