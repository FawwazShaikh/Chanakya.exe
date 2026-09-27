/**
 * IKS-Bot — Chat Module
 * Handles message sending, rendering, and conversation flow.
 * Includes per-message action row (Copy, Share, Edit) on user messages.
 */

const ChatApp = (() => {
    // --- DOM Elements ---
    const chatArea = document.getElementById('chat-area');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-btn');

    // --- State ---
    let sessionId = generateSessionId();
    let isWaiting = false;
    let lastDetectedLocale = 'en-IN';

    /**
     * Message history: ordered array of { role: 'user'|'bot', text: string, el: HTMLElement }
     * Keeps the DOM and data model in sync so we can slice for edits.
     */
    let messages = [];

    /**
     * Index (into `messages`) of the message currently being edited, or null.
     * Only one message can be in edit mode at a time.
     */
    let editingIndex = null;

    function generateSessionId() {
        return 'iks_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }

    // --- Initialization ---
    function init() {
        sendBtn.addEventListener('click', handleSend);
        clearBtn.addEventListener('click', handleClear);

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        // Auto-resize textarea
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
        });

        // Suggestion cards
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const text = card.dataset.query;
                if (text) {
                    chatInput.value = text;
                    handleSend();
                }
            });
        });
    }

    // ================================================================
    //  CORE SEND FLOW — shared by normal sends and edit-resends
    // ================================================================

    /**
     * runTurn: sends `message` to the backend and appends the bot reply.
     * The caller is responsible for having already rendered the user bubble
     * and updated `messages[]`.
     */
    async function runTurn(message) {
        isWaiting = true;
        sendBtn.disabled = true;
        updateEditButtonStates(); // disable all Edit btns while in flight

        const typingEl = showTypingIndicator();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    session_id: sessionId,
                }),
            });

            const data = await response.json();

            if (typingEl) typingEl.remove();

            if (data.error) {
                renderMessage('Sorry, something went wrong. Please try again. 🙏', 'bot');
            } else {
                renderMessage(data.reply, 'bot', data.locale);
                lastDetectedLocale = data.locale || 'en-IN';
            }
        } catch (err) {
            console.error('Chat error:', err);
            if (typingEl) typingEl.remove();
            renderMessage(
                'I couldn\'t reach my knowledge base right now. Please check the connection and try again. 🙏',
                'bot'
            );
        }

        isWaiting = false;
        sendBtn.disabled = false;
        updateEditButtonStates();
        chatInput.focus();
    }

    // --- Send Message (normal, non-edit path) ---
    async function handleSend() {
        const message = chatInput.value.trim();
        if (!message || isWaiting) return;

        // Switch from welcome to chat
        if (welcomeScreen && !welcomeScreen.classList.contains('hidden')) {
            welcomeScreen.classList.add('hidden');
            chatArea.classList.add('active');
        }

        // Render user message
        renderMessage(message, 'user');

        // Clear input
        chatInput.value = '';
        chatInput.style.height = 'auto';

        await runTurn(message);
    }

    // ================================================================
    //  RENDER MESSAGE
    // ================================================================

    function renderMessage(text, role, locale) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.textContent = role === 'bot' ? '🕉️' : '🙏';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // The actual text container (will be swapped out during edit)
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.innerHTML = formatMessageText(text);
        contentDiv.appendChild(textDiv);

        // --- Action row ---
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';

        if (role === 'bot') {
            // Bot: speak + copy
            const speakBtn = document.createElement('button');
            speakBtn.className = 'msg-action-btn';
            speakBtn.innerHTML = '🔊';
            speakBtn.title = 'Listen';
            speakBtn.addEventListener('click', () => {
                if (window.VoiceModule) {
                    VoiceModule.speak(text, locale || lastDetectedLocale);
                    speakBtn.classList.add('speaking');
                    setTimeout(() => speakBtn.classList.remove('speaking'), 3000);
                }
            });

            const copyBtn = createCopyButton(text);

            actionsDiv.appendChild(speakBtn);
            actionsDiv.appendChild(copyBtn);
        } else {
            // User: copy + share + edit
            const copyBtn = createCopyButton(text);
            const shareBtn = createShareButton(text);
            const editBtn = createEditButton(messages.length); // index will be current length (pre-push)

            actionsDiv.appendChild(copyBtn);
            actionsDiv.appendChild(shareBtn);
            actionsDiv.appendChild(editBtn);
        }

        contentDiv.appendChild(actionsDiv);

        msgDiv.appendChild(avatarDiv);
        msgDiv.appendChild(contentDiv);
        chatArea.appendChild(msgDiv);

        // Track in message history
        messages.push({ role, text, el: msgDiv, locale: locale || lastDetectedLocale });

        scrollToBottom();
    }

    // ================================================================
    //  ACTION BUTTONS: Copy / Share / Edit
    // ================================================================

    /**
     * Copy button — replaces icon with ✓ for 1.5s on success.
     */
    function createCopyButton(text) {
        const btn = document.createElement('button');
        btn.className = 'msg-action-btn';
        btn.innerHTML = '📋';
        btn.title = 'Copy';
        btn.addEventListener('click', () => handleCopy(btn, text));
        return btn;
    }

    function handleCopy(btn, text) {
        navigator.clipboard.writeText(text).then(() => {
            const original = btn.innerHTML;
            btn.innerHTML = '✓';
            btn.classList.add('copy-confirmed');
            setTimeout(() => {
                btn.innerHTML = original;
                btn.classList.remove('copy-confirmed');
            }, 1500);
        }).catch(err => {
            console.warn('Clipboard write failed:', err);
        });
    }

    /**
     * Share button — OS share sheet if available, clipboard-copy fallback.
     */
    function createShareButton(text) {
        const btn = document.createElement('button');
        btn.className = 'msg-action-btn';
        btn.innerHTML = '🔗';
        btn.title = 'Share';
        btn.addEventListener('click', () => handleShare(btn, text));
        return btn;
    }

    function handleShare(btn, text) {
        if (navigator.share) {
            navigator.share({ text }).catch(() => { /* user cancelled */ });
        } else {
            // Fallback: copy to clipboard
            handleCopy(btn, text);
        }
    }

    /**
     * Edit button — enters inline-edit mode for message at `msgIndex`.
     */
    function createEditButton(msgIndex) {
        const btn = document.createElement('button');
        btn.className = 'msg-action-btn msg-edit-btn';
        btn.innerHTML = '✏️';
        btn.title = 'Edit';
        btn.dataset.msgIndex = msgIndex;
        btn.addEventListener('click', () => startEdit(parseInt(btn.dataset.msgIndex, 10)));
        return btn;
    }

    // ================================================================
    //  EDIT FLOW
    // ================================================================

    function startEdit(index) {
        if (editingIndex !== null || isWaiting) return;
        if (index < 0 || index >= messages.length) return;
        if (messages[index].role !== 'user') return;

        editingIndex = index;
        updateEditButtonStates();

        const entry = messages[index];
        const contentDiv = entry.el.querySelector('.message-content');
        const textDiv = contentDiv.querySelector('.message-text');
        const actionsDiv = contentDiv.querySelector('.message-actions');

        // Hide the normal text + action row
        textDiv.style.display = 'none';
        actionsDiv.style.display = 'none';

        // Saffron accent border
        contentDiv.classList.add('editing');

        // Create edit container
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';

        // Tiny "✏️ Editing" label
        const editLabel = document.createElement('div');
        editLabel.className = 'edit-label';
        editLabel.innerHTML = '<span class="edit-label-icon">✏️</span> Editing';

        // Textarea — borderless, blends into bubble
        const textarea = document.createElement('textarea');
        textarea.className = 'edit-textarea';
        textarea.value = entry.text;
        textarea.rows = 1;

        // Auto-grow: resize to fit content, cap at 160px
        const autoGrow = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
        };
        textarea.addEventListener('input', autoGrow);

        // Keyboard shortcuts
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });

        // Icon-only action buttons — ✕ (cancel) and ✓ (save)
        const btnRow = document.createElement('div');
        btnRow.className = 'edit-btn-row';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'edit-icon-btn edit-cancel-icon';
        cancelBtn.innerHTML = '✕';
        cancelBtn.title = 'Cancel (Esc)';
        cancelBtn.addEventListener('click', cancelEdit);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'edit-icon-btn edit-save-icon';
        saveBtn.innerHTML = '✓';
        saveBtn.title = 'Save & Resend (Enter)';
        saveBtn.addEventListener('click', saveEdit);

        // Disable save if textarea is empty
        const updateSaveState = () => {
            saveBtn.disabled = !textarea.value.trim();
        };
        textarea.addEventListener('input', updateSaveState);

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(saveBtn);

        editContainer.appendChild(editLabel);
        editContainer.appendChild(textarea);
        editContainer.appendChild(btnRow);
        contentDiv.insertBefore(editContainer, actionsDiv);

        // Focus and place cursor at end
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        // Trigger initial auto-grow
        requestAnimationFrame(autoGrow);
    }

    function cancelEdit() {
        if (editingIndex === null) return;

        const entry = messages[editingIndex];
        const contentDiv = entry.el.querySelector('.message-content');

        // Remove edit container
        const editContainer = contentDiv.querySelector('.edit-container');
        if (editContainer) editContainer.remove();

        // Restore original display
        contentDiv.querySelector('.message-text').style.display = '';
        contentDiv.querySelector('.message-actions').style.display = '';
        contentDiv.classList.remove('editing');

        editingIndex = null;
        updateEditButtonStates();
    }

    async function saveEdit() {
        if (editingIndex === null) return;

        const entry = messages[editingIndex];
        const contentDiv = entry.el.querySelector('.message-content');
        const textarea = contentDiv.querySelector('.edit-textarea');
        const newText = textarea.value.trim();

        if (!newText) return; // no-op on empty

        // 1. Remove the edit UI
        const editContainer = contentDiv.querySelector('.edit-container');
        if (editContainer) editContainer.remove();
        contentDiv.classList.remove('editing');

        // 2. Slice: remove everything AFTER editingIndex from DOM + state
        const sliceFrom = editingIndex + 1;
        for (let i = messages.length - 1; i >= sliceFrom; i--) {
            messages[i].el.remove();
        }
        messages.length = sliceFrom;

        // 3. Update this message's text in place
        entry.text = newText;
        const textDiv = contentDiv.querySelector('.message-text');
        textDiv.innerHTML = formatMessageText(newText);
        textDiv.style.display = '';
        contentDiv.querySelector('.message-actions').style.display = '';

        // Update the copy/share handlers to use new text
        rebindUserActions(contentDiv, newText, editingIndex);

        const savedIndex = editingIndex;
        editingIndex = null;

        // 4. Tell the backend to truncate its history
        try {
            await fetch('/chat/truncate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    keep_before: savedIndex, // number of messages to keep (0-based)
                }),
            });
        } catch (e) {
            console.warn('Truncate request failed (non-critical):', e);
        }

        // 5. Switch from welcome to chat (in case of editing the very first message)
        if (welcomeScreen && !welcomeScreen.classList.contains('hidden')) {
            welcomeScreen.classList.add('hidden');
            chatArea.classList.add('active');
        }

        // 6. Send the edited message as a new turn
        await runTurn(newText);
    }

    /**
     * Re-bind copy/share/edit click handlers on a user bubble after an edit
     * (because the text has changed).
     */
    function rebindUserActions(contentDiv, newText, index) {
        const actionsDiv = contentDiv.querySelector('.message-actions');
        actionsDiv.innerHTML = '';

        const copyBtn = createCopyButton(newText);
        const shareBtn = createShareButton(newText);
        const editBtn = createEditButton(index);

        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(shareBtn);
        actionsDiv.appendChild(editBtn);
    }

    /**
     * Enable/disable all Edit buttons based on current state.
     * Disabled when: another edit is in progress OR a reply is in flight.
     */
    function updateEditButtonStates() {
        document.querySelectorAll('.msg-edit-btn').forEach(btn => {
            const idx = parseInt(btn.dataset.msgIndex, 10);
            btn.disabled = isWaiting || (editingIndex !== null && editingIndex !== idx);
        });
    }

    // ================================================================
    //  UTILITIES
    // ================================================================

    // --- Format text (basic markdown-like) ---
    function formatMessageText(text) {
        // Escape HTML
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Bold: **text**
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic: *text*
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Line breaks → paragraphs
        html = html
            .split(/\n\n+/)
            .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
            .join('');

        return html;
    }

    // --- Typing Indicator ---
    function showTypingIndicator() {
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.id = 'typing-indicator';

        typing.innerHTML = `
            <div class="message-avatar">🕉️</div>
            <div class="typing-dots">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;

        chatArea.appendChild(typing);
        scrollToBottom();
        return typing;
    }

    // --- Clear Chat ---
    async function handleClear() {
        // Cancel any in-progress edit
        if (editingIndex !== null) cancelEdit();

        try {
            await fetch('/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId }),
            });
        } catch (e) {
            console.error('Clear error:', e);
        }

        // Reset UI
        chatArea.innerHTML = '';
        chatArea.classList.remove('active');
        welcomeScreen.classList.remove('hidden');
        messages = [];
        editingIndex = null;
        sessionId = generateSessionId();
        showToast('Conversation cleared');
    }

    // --- Scroll ---
    function scrollToBottom() {
        requestAnimationFrame(() => {
            chatArea.scrollTop = chatArea.scrollHeight;
        });
    }

    // --- Toast ---
    function showToast(msg) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // --- Public API ---
    return {
        init,
        insertText(text) {
            chatInput.value += text;
            chatInput.dispatchEvent(new Event('input'));
            chatInput.focus();
        },
        getLastLocale() {
            return lastDetectedLocale;
        },
    };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', ChatApp.init);
