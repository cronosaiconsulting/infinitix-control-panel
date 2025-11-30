// Infinitix Control Panel - Client Side Application

class InfinitixControlPanel {
    constructor() {
        this.ws = null;
        this.conversations = new Map();
        this.contacts = new Map();
        this.currentConversationId = null;
        this.searchQuery = '';
        this.activeFilter = 'all';
        this.sourceFilter = 'all'; // 'all', 'whatsapp', 'web'
        this.searchDebounceTimer = null;
        this.lastSoundPlayedTime = 0;

        // Message pagination
        this.messagesPerPage = 50; // Initial messages to show
        this.messagesLoadIncrement = 10; // Messages to load when scrolling up
        this.displayedMessageCount = 0; // Current number of displayed messages
        this.isLoadingMoreMessages = false; // Prevent multiple simultaneous loads

        // Dev tools state
        this.devToolsOpen = false;
        this.devToolsLogs = [];
        this.debugState = null;

        // Sending state
        this.isSendingMessage = false;

        this.init();
    }

    init() {
        this.setupWebSocket();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.ws = new WebSocket(`${protocol}//${host}`);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.updateConnectionStatus(true);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateConnectionStatus(false);
            // Attempt to reconnect after 3 seconds
            setTimeout(() => this.setupWebSocket(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus(false);
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };
    }

    handleWebSocketMessage(message) {
        console.log('Received message:', message.type, message.data);

        switch (message.type) {
            case 'init':
                this.handleInit(message.data);
                break;
            case 'contact_update':
                this.handleContactUpdate(message.data);
                break;
            case 'new_message':
                this.handleNewMessage(message.data);
                break;
            case 'conversation_read':
                this.handleConversationRead(message.data);
                break;
            case 'manual_message':
                this.handleManualMessage(message.data);
                break;
        }
    }

    handleManualMessage(data) {
        const { conversation_id, message, conversation } = data;

        console.log(`📝 Manual message in conversation ${conversation_id}:`, message.message?.substring(0, 50));
        this.addDevLog('info', `Manual message sent to ${conversation_id}`);

        // Update conversation
        this.conversations.set(conversation_id, conversation);

        // Update conversations list
        this.renderConversations();

        // If this is the current conversation, re-render messages
        if (this.currentConversationId === conversation_id) {
            console.log('📝 Re-rendering current conversation with manual message');
            this.renderMessages(conversation);
        }
    }

    handleInit(data) {
        console.log(`🔄 Initializing: ${data.conversations.length} conversations, ${data.contacts.length} contacts`);

        // Initialize with existing conversations
        data.conversations.forEach(conv => {
            this.conversations.set(conv.id, conv);
            if (conv.unread > 0) {
                console.log(`   📬 Conversation ${conv.id} has ${conv.unread} unread messages on init`);
            }
        });

        data.contacts.forEach(contact => {
            this.contacts.set(contact.user_id, contact);
        });

        // Add agent contact for manual messages
        this.contacts.set('agent', { user_id: 'agent', name: 'Agente HITL' });

        if (this.conversations.size > 0) {
            this.renderConversations();
            console.log('✅ Conversations rendered');
        }
    }

    handleContactUpdate(data) {
        console.log('👤 Contact updated:', data.user_id, data.name);
        this.contacts.set(data.user_id, data);
    }

    handleNewMessage(data) {
        const { conversation_id, message, conversation } = data;

        console.log(`💬 New message in conversation ${conversation_id}:`, message.message?.substring(0, 50));
        console.log(`   Conversation unread count:`, conversation.unread, `(type: ${typeof conversation.unread})`);

        // Update conversation
        this.conversations.set(conversation_id, conversation);

        // Update conversations list
        this.renderConversations();

        // If this is the current conversation, re-render all messages to avoid duplication
        if (this.currentConversationId === conversation_id) {
            console.log('📝 Re-rendering current conversation with new message');
            this.renderMessages(conversation);

            // Mark as read
            this.markConversationAsRead(conversation_id);
        } else {
            console.log('🔔 Message in different conversation - showing notification');
        }

        // Play notification sound for user messages
        this.playNotificationSound(message);
    }

    handleConversationRead(data) {
        console.log('✔️ Conversation marked as read:', data.conversation_id);
        const conv = this.conversations.get(data.conversation_id);
        if (conv) {
            conv.unread = 0;
            this.conversations.set(data.conversation_id, conv);
            this.renderConversations();
        }
    }

    setupEventListeners() {
        // Search input handler with debouncing
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value.toLowerCase();

                // Show/hide clear button immediately
                const clearBtn = document.getElementById('clearSearch');
                if (clearBtn) {
                    clearBtn.style.display = value ? 'flex' : 'none';
                }

                // Debounce the actual search
                if (this.searchDebounceTimer) {
                    clearTimeout(this.searchDebounceTimer);
                }

                this.searchDebounceTimer = setTimeout(() => {
                    this.searchQuery = value;
                    this.renderConversations();
                }, 150); // 150ms debounce
            });
        }

        // Clear search button
        const clearSearch = document.getElementById('clearSearch');
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = '';
                    this.searchQuery = '';
                    clearSearch.style.display = 'none';
                    this.renderConversations();
                }
            });
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Update filter
                this.activeFilter = e.target.dataset.filter;
                this.renderConversations();
            });
        });

        // Source tabs (WhatsApp / Web / All)
        document.querySelectorAll('.source-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Update active state
                document.querySelectorAll('.source-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Update source filter
                this.sourceFilter = e.currentTarget.dataset.source;
                this.renderConversations();
            });
        });

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                console.log('📥 Export button clicked');
                this.exportConversation();
            });
        }

        // Help button
        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showKeyboardShortcuts();
            });
        }

        // Info button click handler
        document.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn[title="Información"]') || e.target.closest('.action-btn[title="Information"]')) {
                console.log('🔘 Info button clicked');
                this.showConversationInfo();
            }
        });

        // Bot control button (Pause/Resume AI)
        const botControlBtn = document.getElementById('botControlBtn');
        if (botControlBtn) {
            botControlBtn.addEventListener('click', () => {
                this.toggleBotStatus();
            });
        }

        // Template button (TODO: requires whatsapp_templates table)
        const sendTemplateBtn = document.getElementById('sendTemplateBtn');
        if (sendTemplateBtn) {
            sendTemplateBtn.addEventListener('click', () => {
                console.log('📝 Template button clicked');
                alert('⚠️ Sistema de plantillas no disponible.\n\nTODO: Requiere crear la tabla whatsapp_templates en PostgreSQL.');
            });
        }

        // Dev tools button
        const devToolsBtn = document.getElementById('devToolsBtn');
        if (devToolsBtn) {
            devToolsBtn.addEventListener('click', () => {
                this.toggleDevTools();
            });
        }

        // Message send button and input
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        const messageInput = document.getElementById('messageInput');

        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                this.sendManualMessage();
            });
        }

        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendManualMessage();
                }
            });
        }

        // Scroll to bottom button
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        if (scrollToBottomBtn) {
            scrollToBottomBtn.addEventListener('click', () => {
                this.scrollToBottom();
            });
        }

        // Setup scroll detection for scroll-to-bottom button visibility
        this.setupScrollToBottomDetection();

        console.log('✅ Event listeners setup complete');
    }

    // Setup scroll detection to show/hide scroll-to-bottom button
    setupScrollToBottomDetection() {
        const chatMessages = document.getElementById('chatMessages');
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');

        if (!chatMessages || !scrollToBottomBtn) return;

        // Scroll handler to show/hide button
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = chatMessages;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

            // Show button if user has scrolled up more than 200px from bottom
            if (distanceFromBottom > 200) {
                scrollToBottomBtn.classList.add('visible');
            } else {
                scrollToBottomBtn.classList.remove('visible');
            }
        };

        // Remove existing listener if any
        if (chatMessages._scrollToBottomHandler) {
            chatMessages.removeEventListener('scroll', chatMessages._scrollToBottomHandler);
        }

        // Store and add new listener
        chatMessages._scrollToBottomHandler = handleScroll;
        chatMessages.addEventListener('scroll', handleScroll);

        // Initial check
        handleScroll();
    }

    // Send manual message via API
    async sendManualMessage() {
        if (this.isSendingMessage) return;

        const messageInput = document.getElementById('messageInput');
        const message = messageInput?.value?.trim();

        if (!message || !this.currentConversationId) {
            console.log('⚠️ No message or no conversation selected');
            return;
        }

        const conversation = this.conversations.get(this.currentConversationId);
        if (!conversation) {
            console.log('⚠️ Conversation not found');
            return;
        }

        // Check if session is active (for WhatsApp)
        const source = this.getConversationSource(conversation);
        if (source === 'whatsapp' && !this.isSessionActive(conversation)) {
            this.showNotification('La sesión de WhatsApp ha expirado. Usa una plantilla para reabrir.', 'error');
            return;
        }

        // Get wa_id (phone number) and session_id from the active session
        const sessions = conversation.sessions || [];

        // Helper: Check if value looks like a valid phone number (not UUID)
        const isValidPhoneNumber = (value) => {
            if (!value) return false;
            // Convert to string for regex testing (handles numbers)
            const strValue = String(value);
            // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidPattern.test(strValue)) return false;
            // Phone number: digits, possibly with + prefix
            const phonePattern = /^\+?\d{6,}$/;
            return phonePattern.test(strValue);
        };

        // Helper: Get valid phone from session
        const getValidPhone = (session) => {
            if (isValidPhoneNumber(session.wa_id)) return String(session.wa_id);
            if (isValidPhoneNumber(session.phone_number)) return String(session.phone_number);
            return null;
        };

        // Debug: Log all sessions
        console.log('📋 All sessions:', sessions.map(s => ({
            id: s.session_id,
            wa_id: s.wa_id,
            phone: s.phone_number,
            validPhone: getValidPhone(s),
            started_at: s.started_at
        })));

        // Find the best session: MUST have valid phone number for WhatsApp
        let activeSession = null;

        // First, try to find a session with a valid wa_id (actual phone number)
        const sessionsWithValidPhone = sessions.filter(s => getValidPhone(s) !== null);

        console.log('📋 Sessions with valid phone:', sessionsWithValidPhone.length);

        if (sessionsWithValidPhone.length > 0) {
            // Sort by: 1) started_at descending, 2) session_id descending (as tiebreaker)
            activeSession = sessionsWithValidPhone.sort((a, b) => {
                const timeDiff = (b.started_at || 0) - (a.started_at || 0);
                if (timeDiff !== 0) return timeDiff;
                // Tiebreaker: higher session_id = more recent
                return (b.session_id || 0) - (a.session_id || 0);
            })[0];
        } else {
            // Fallback: get the most recent session by started_at/session_id
            activeSession = [...sessions].sort((a, b) => {
                const timeDiff = (b.started_at || 0) - (a.started_at || 0);
                if (timeDiff !== 0) return timeDiff;
                return (b.session_id || 0) - (a.session_id || 0);
            })[0];
        }

        // Extract wa_id: prefer valid phone, then wa_id field, then phone_number, then user_id
        const validPhone = activeSession ? getValidPhone(activeSession) : null;
        const wa_id = validPhone || activeSession?.wa_id || activeSession?.phone_number || conversation.user_id;
        const session_id = activeSession?.session_id;

        console.log('📤 Sending message - Active session:', session_id, 'wa_id:', wa_id, 'validPhone:', validPhone);

        this.isSendingMessage = true;
        const chatInput = document.getElementById('chatInput');
        if (chatInput) chatInput.classList.add('sending');

        this.addDevLog('info', `Sending message to ${wa_id}...`);

        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversation_id: this.currentConversationId,
                    wa_id: wa_id,
                    message: message,
                    session_id: session_id
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Message sent successfully');
                this.addDevLog('success', `Message sent (ID: ${result.message_id})`);
                this.showNotification('Mensaje enviado correctamente', 'success');
                messageInput.value = '';
            } else {
                console.error('❌ Failed to send message:', result.error);
                this.addDevLog('error', `Failed: ${result.error}`);
                this.showNotification(`Error al enviar: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
            this.addDevLog('error', `Error: ${error.message}`);
            this.showNotification('Error de conexión al enviar mensaje', 'error');
        } finally {
            this.isSendingMessage = false;
            if (chatInput) chatInput.classList.remove('sending');
        }
    }

    // Toggle dev tools panel
    toggleDevTools() {
        this.devToolsOpen = !this.devToolsOpen;

        if (this.devToolsOpen) {
            this.showDevTools();
        } else {
            this.hideDevTools();
        }
    }

    // Show dev tools panel
    async showDevTools() {
        // Fetch current debug state
        try {
            const response = await fetch('/api/debug/state');
            this.debugState = await response.json();
        } catch (error) {
            console.error('Failed to fetch debug state:', error);
            this.debugState = { error: error.message };
        }

        const panelHtml = `
            <div class="dev-tools-panel" id="devToolsPanel">
                <div class="dev-tools-header">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
                        </svg>
                        Dev Tools
                    </h3>
                    <button class="dev-tools-close" onclick="window.controlPanel.hideDevTools()">&times;</button>
                </div>
                <div class="dev-tools-body">
                    <div class="dev-tools-section">
                        <h4>
                            <span class="status-indicator ${this.debugState?.success ? 'ok' : 'error'}"></span>
                            Estado del Sistema
                        </h4>
                        <div class="dev-tools-item">
                            <span class="label">Conversaciones</span>
                            <span class="value">${this.debugState?.conversations_count || 0}</span>
                        </div>
                        <div class="dev-tools-item">
                            <span class="label">Contactos</span>
                            <span class="value">${this.debugState?.contacts_count || 0}</span>
                        </div>
                        <div class="dev-tools-item">
                            <span class="label">WebSocket</span>
                            <span class="value ${this.ws?.readyState === 1 ? 'success' : 'error'}">${this.ws?.readyState === 1 ? 'Conectado' : 'Desconectado'}</span>
                        </div>
                    </div>

                    <div class="dev-tools-section">
                        <h4>
                            <span class="status-indicator ${this.debugState?.config?.n8n_webhook_configured ? 'ok' : 'error'}"></span>
                            Configuración n8n
                        </h4>
                        <div class="dev-tools-item">
                            <span class="label">Webhook HITL</span>
                            <span class="value ${this.debugState?.config?.n8n_webhook_configured ? 'success' : 'error'}">${this.debugState?.config?.n8n_webhook_configured ? 'Configurado' : 'No configurado'}</span>
                        </div>
                        <div class="dev-tools-item">
                            <span class="label">Webhook Secret</span>
                            <span class="value ${this.debugState?.config?.webhook_secret_configured ? 'success' : 'warning'}">${this.debugState?.config?.webhook_secret_configured ? 'Configurado' : 'No configurado'}</span>
                        </div>
                        <div class="dev-tools-item">
                            <span class="label">Días de carga</span>
                            <span class="value">${this.debugState?.config?.initial_load_days || '365'}</span>
                        </div>
                    </div>

                    <div class="dev-tools-section">
                        <h4>Logs Recientes</h4>
                        <div class="dev-tools-logs" id="devToolsLogs">
                            ${this.devToolsLogs.length === 0 ? '<div class="dev-tools-log-entry info">Sin logs recientes</div>' :
                              this.devToolsLogs.slice(-10).map(log => `
                                <div class="dev-tools-log-entry ${log.type}">
                                    <span class="timestamp">${log.time}</span>
                                    ${log.message}
                                </div>
                              `).join('')
                            }
                        </div>
                    </div>

                    <button class="dev-tools-btn-refresh" onclick="window.controlPanel.refreshDevTools()">
                        Actualizar Estado
                    </button>
                </div>
            </div>
        `;

        // Remove existing panel
        this.hideDevTools();

        // Add new panel
        document.body.insertAdjacentHTML('beforeend', panelHtml);
    }

    // Hide dev tools panel
    hideDevTools() {
        const existing = document.getElementById('devToolsPanel');
        if (existing) existing.remove();
        this.devToolsOpen = false;
    }

    // Refresh dev tools data
    async refreshDevTools() {
        await this.showDevTools();
        this.showNotification('Estado actualizado', 'info', 1500);
    }

    // Add log entry to dev tools
    addDevLog(type, message) {
        const time = new Date().toLocaleTimeString('es-ES');
        this.devToolsLogs.push({ type, message, time });

        // Keep only last 50 logs
        if (this.devToolsLogs.length > 50) {
            this.devToolsLogs = this.devToolsLogs.slice(-50);
        }

        // Update logs panel if open
        const logsContainer = document.getElementById('devToolsLogs');
        if (logsContainer) {
            logsContainer.innerHTML = this.devToolsLogs.slice(-10).map(log => `
                <div class="dev-tools-log-entry ${log.type}">
                    <span class="timestamp">${log.time}</span>
                    ${log.message}
                </div>
            `).join('');
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }
    }

    // Toggle bot status (pause/resume AI)
    async toggleBotStatus() {
        if (!this.currentConversationId) return;

        const conversation = this.conversations.get(this.currentConversationId);
        if (!conversation) return;

        const newStatus = conversation.bot_status === 'paused' ? 'active' : 'paused';

        console.log(`🤖 Toggling bot status to: ${newStatus}`);

        try {
            // TODO: Send to backend to update bot_status in database
            // For now, just update locally
            conversation.bot_status = newStatus;
            this.conversations.set(this.currentConversationId, conversation);
            this.updateBotControlButton(conversation);

            // Show feedback
            const action = newStatus === 'paused' ? 'pausada' : 'reanudada';
            console.log(`✅ IA ${action} para esta conversación`);
        } catch (error) {
            console.error('❌ Error toggling bot status:', error);
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F - Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.focus();
            }

            // Ctrl/Cmd + E - Export current conversation
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                if (this.currentConversationId) {
                    this.exportConversation();
                }
            }

            // Ctrl/Cmd + I - Show info panel
            if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                e.preventDefault();
                if (this.currentConversationId) {
                    this.showConversationInfo();
                }
            }

            // End key - Scroll to bottom of messages
            if (e.key === 'End' && this.currentConversationId) {
                e.preventDefault();
                this.scrollToBottom();
            }

            // Escape - Clear search or close panels
            if (e.key === 'Escape') {
                // Close shortcuts modal if open
                const shortcutsOverlay = document.getElementById('shortcutsOverlay');
                if (shortcutsOverlay) {
                    shortcutsOverlay.remove();
                    return;
                }

                // Close export modal if open
                const exportModal = document.getElementById('exportModalOverlay');
                if (exportModal) {
                    exportModal.remove();
                    return;
                }

                // Close info panel if open
                const infoPanel = document.getElementById('infoPanelOverlay');
                if (infoPanel) {
                    infoPanel.remove();
                    return;
                }

                // Clear search
                const searchInput = document.getElementById('searchInput');
                if (searchInput && searchInput.value) {
                    searchInput.value = '';
                    this.searchQuery = '';
                    const clearBtn = document.getElementById('clearSearch');
                    if (clearBtn) clearBtn.style.display = 'none';
                    this.renderConversations();
                }
            }
        });

        console.log('✅ Keyboard shortcuts setup complete');
    }

    showConversationInfo() {
        if (!this.currentConversationId) {
            console.log('⚠️ No conversation selected');
            return;
        }

        const conversation = this.conversations.get(this.currentConversationId);
        if (!conversation) {
            console.log('⚠️ Conversation not found:', this.currentConversationId);
            return;
        }

        console.log('📊 Showing conversation info:', conversation);

        // Build info panel content
        const sessions = conversation.sessions || [];
        const sessionsHtml = sessions.map(s => {
            // Use wa_id if available (WhatsApp phone), otherwise phone_number
            const phoneDisplay = s.wa_id || s.phone_number || 'No disponible';

            // Handle invalid dates gracefully
            let startedAtDisplay = 'No disponible';
            if (s.started_at && !isNaN(s.started_at) && s.started_at > 0) {
                const startDate = new Date(s.started_at);
                if (!isNaN(startDate.getTime())) {
                    startedAtDisplay = startDate.toLocaleString('es-ES');
                }
            }

            return `
                <div class="info-session">
                    <strong>Sesión #${s.session_id}</strong>
                    <div>Teléfono: ${phoneDisplay}</div>
                    <div>Iniciada: ${startedAtDisplay}</div>
                    <div>Mensajes: ${s.message_count || 0}</div>
                </div>
            `;
        }).join('');

        const infoHtml = `
            <div class="info-panel-overlay" id="infoPanelOverlay">
                <div class="info-panel">
                    <div class="info-header">
                        <h3>Información de la Conversación</h3>
                        <button class="info-close" onclick="document.getElementById('infoPanelOverlay').remove()">✕</button>
                    </div>
                    <div class="info-body">
                        <div class="info-section">
                            <h4>General</h4>
                            <div><strong>ID:</strong> ${conversation.id}</div>
                            <div><strong>Nombre:</strong> ${conversation.display_name}</div>
                            ${conversation.customer_id ? `<div><strong>Customer ID:</strong> ${conversation.customer_id}</div>` : ''}
                            ${conversation.user_id ? `<div><strong>User ID:</strong> ${conversation.user_id}</div>` : ''}
                        </div>
                        <div class="info-section">
                            <h4>Estadísticas</h4>
                            <div><strong>Total Mensajes:</strong> ${conversation.messages.length}</div>
                            <div><strong>Total Sesiones:</strong> ${sessions.length}</div>
                            <div><strong>Último mensaje:</strong> ${conversation.lastTimestamp && !isNaN(conversation.lastTimestamp) ? new Date(conversation.lastTimestamp).toLocaleString('es-ES') : 'No disponible'}</div>
                        </div>
                        <div class="info-section">
                            <h4>Sesiones</h4>
                            ${sessionsHtml || '<div>No hay sesiones registradas</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing info panel
        const existing = document.getElementById('infoPanelOverlay');
        if (existing) existing.remove();

        // Add info panel to DOM
        document.body.insertAdjacentHTML('beforeend', infoHtml);

        console.log('✅ Info panel displayed');
    }

    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connectionStatus');
        const statusDot = statusEl.querySelector('.status-dot');

        if (connected) {
            statusEl.innerHTML = '<span class="status-dot connected"></span> Conectado';
            statusDot.classList.add('connected');
        } else {
            statusEl.innerHTML = '<span class="status-dot"></span> Desconectado';
            statusDot.classList.remove('connected');
        }
    }

    // Determine conversation source (whatsapp or web)
    getConversationSource(conv) {
        // If explicitly set by server, use it (new approach)
        if (conv.source) return conv.source;

        // Helper: Check if value is a valid phone number (not UUID)
        const isValidPhone = (val) => {
            if (!val) return false;
            const str = String(val);
            // UUID pattern - not a phone
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return false;
            // Phone pattern - digits with optional +, at least 6 digits
            return /^\+?\d{6,}$/.test(str.replace(/[\s-]/g, ''));
        };

        // Check if any session has a valid wa_id (WhatsApp ID)
        const sessions = conv.sessions || [];
        for (const session of sessions) {
            // wa_id is the primary indicator - if it's a valid phone, it's WhatsApp
            if (isValidPhone(session.wa_id)) {
                return 'whatsapp';
            }
        }

        // Fallback: check phone_number in sessions
        for (const session of sessions) {
            if (isValidPhone(session.phone_number)) {
                return 'whatsapp';
            }
        }

        // Check user_id pattern (might be phone for WhatsApp)
        const userId = conv.user_id || '';
        if (isValidPhone(userId)) {
            return 'whatsapp';
        }

        // Default to web for everything else (including UUIDs)
        return 'web';
    }

    renderConversations() {
        const conversationList = document.getElementById('conversationList');
        if (!conversationList) return;

        // Sort conversations by last message time
        let sortedConversations = Array.from(this.conversations.values())
            .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

        // Debug: Log unread counts
        const totalUnread = sortedConversations.filter(c => c.unread > 0).length;
        console.log(`📊 Rendering ${sortedConversations.length} conversations, ${totalUnread} with unread messages`);

        // Apply source filter
        if (this.sourceFilter !== 'all') {
            sortedConversations = sortedConversations.filter(conv => {
                const source = this.getConversationSource(conv);
                return source === this.sourceFilter;
            });
        }

        // Apply search filter
        if (this.searchQuery) {
            sortedConversations = sortedConversations.filter(conv => {
                const displayName = (conv.display_name || '').toLowerCase();
                const lastMessage = (conv.lastMessage || '').toLowerCase();
                const convId = (conv.id || '').toString().toLowerCase();
                const userId = (conv.user_id || '').toString().toLowerCase();

                return displayName.includes(this.searchQuery) ||
                       lastMessage.includes(this.searchQuery) ||
                       convId.includes(this.searchQuery) ||
                       userId.includes(this.searchQuery);
            });
        }

        // Apply unread filter
        if (this.activeFilter === 'unread') {
            sortedConversations = sortedConversations.filter(conv => conv.unread > 0);
        }

        if (sortedConversations.length === 0) {
            const emptyMessage = this.searchQuery ?
                'No se encontraron conversaciones' :
                this.activeFilter === 'unread' ?
                'No hay conversaciones sin leer' :
                this.sourceFilter !== 'all' ?
                `No hay conversaciones de ${this.sourceFilter === 'whatsapp' ? 'WhatsApp' : 'Web'}` :
                'No hay conversaciones activas';
            conversationList.innerHTML = `<div class="empty-state"><p>${emptyMessage}</p></div>`;
            return;
        }

        conversationList.innerHTML = sortedConversations.map(conv => {
            // Use display_name from conversation (new logic), fallback to contact name
            const displayName = conv.display_name || (this.contacts.get(conv.user_id) || { name: `Usuario ${conv.id}` }).name;
            const time = this.formatTime(conv.lastTimestamp);
            const isActive = this.currentConversationId === conv.id;
            const source = this.getConversationSource(conv);

            // Debug: Log unread status for each conversation
            if (conv.unread > 0) {
                console.log(`🔴 Conv ${conv.id} (${displayName}): unread=${conv.unread}, typeof=${typeof conv.unread}`);
            }

            // Show session count if multiple sessions
            const sessionInfo = conv.sessions && conv.sessions.length > 1 ?
                `<span class="session-count">${conv.sessions.length} sesiones</span>` : '';

            return `
                <div class="conversation-item ${isActive ? 'active' : ''} ${conv.unread > 0 ? 'has-unread' : ''}" data-id="${conv.id}" data-source="${source}">
                    <div class="conversation-header">
                        <span class="source-indicator ${source}"></span>
                        <span class="conversation-name">${this.escapeHtml(displayName)}</span>
                        <span class="conversation-time">${time}</span>
                    </div>
                    <div class="conversation-preview">${this.escapeHtml(conv.lastMessage || 'Nueva conversación')}</div>
                    <div class="conversation-footer">
                        <span class="conversation-id">ID: ${conv.id}</span>
                        ${sessionInfo}
                        ${conv.unread > 0 ? `<span class="unread-badge">${conv.unread}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        conversationList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.dataset.id;
                console.log(`👆 User clicked conversation: ${conversationId}`);
                this.openConversation(conversationId);
            });
        });
    }

    openConversation(conversationId) {
        console.log(`📂 Opening conversation: ${conversationId}`);
        this.currentConversationId = conversationId;
        const conversation = this.conversations.get(conversationId);

        if (!conversation) {
            console.log('⚠️ Conversation not found:', conversationId);
            return;
        }

        console.log(`✅ Conversation loaded: ${conversation.display_name}, ${conversation.messages.length} messages`);

        this.showChatActive();
        this.renderChatHeader(conversation);
        this.renderMessages(conversation);
        this.updateSessionStatus(conversation);
        this.updateBotControlButton(conversation);
        this.renderConversations(); // Update the list to show active state
        this.markConversationAsRead(conversationId);
    }

    // Get last user message timestamp for 24h window calculation
    getLastUserMessageTimestamp(conversation) {
        const messages = conversation.messages || [];
        // Find last message from user (not bot)
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].user_id !== '0') {
                return messages[i].timestamp;
            }
        }
        return null;
    }

    // Check if WhatsApp 24h session is active
    isSessionActive(conversation) {
        const source = this.getConversationSource(conversation);
        if (source !== 'whatsapp') return true; // Web chat always active

        const lastUserMessageTime = this.getLastUserMessageTimestamp(conversation);
        if (!lastUserMessageTime) return false;

        const now = Date.now();
        const diff = now - lastUserMessageTime;
        const hours24 = 24 * 60 * 60 * 1000;

        return diff < hours24;
    }

    // Update session status badge and input state
    updateSessionStatus(conversation) {
        const source = this.getConversationSource(conversation);
        const sessionStatus = document.getElementById('sessionStatus');
        const statusBadge = document.getElementById('statusBadge');
        const chatInputContainer = document.getElementById('chatInputContainer');
        const templateSelector = document.getElementById('templateSelector');
        const messageInput = document.getElementById('messageInput');

        // Only show session status for WhatsApp
        if (source !== 'whatsapp') {
            if (sessionStatus) sessionStatus.style.display = 'none';
            if (chatInputContainer) chatInputContainer.classList.remove('locked');
            if (templateSelector) templateSelector.style.display = 'none';
            if (messageInput) messageInput.placeholder = 'Escribe un mensaje...';
            return;
        }

        // Show session status for WhatsApp
        if (sessionStatus) sessionStatus.style.display = 'flex';

        const isActive = this.isSessionActive(conversation);

        if (statusBadge) {
            statusBadge.classList.toggle('active', isActive);
            statusBadge.classList.toggle('expired', !isActive);
            statusBadge.textContent = isActive ? 'Sesión Activa' : 'Sesión Cerrada';
        }

        // Lock/unlock input based on session status
        if (chatInputContainer) {
            chatInputContainer.classList.toggle('locked', !isActive);
        }

        if (templateSelector) {
            templateSelector.style.display = isActive ? 'none' : 'flex';
        }

        if (messageInput) {
            messageInput.placeholder = isActive
                ? 'Escribe un mensaje...'
                : 'Sesión expirada. Usa una plantilla para reabrir.';
            messageInput.disabled = !isActive;
        }

        const sendBtn = document.getElementById('sendMessageBtn');
        if (sendBtn) {
            sendBtn.disabled = !isActive;
        }
    }

    // Update bot control button state
    updateBotControlButton(conversation) {
        const botControlBtn = document.getElementById('botControlBtn');
        const botControlLabel = document.getElementById('botControlLabel');
        const botControlIcon = document.getElementById('botControlIcon');

        if (!botControlBtn) return;

        const isPaused = conversation.bot_status === 'paused';

        botControlBtn.classList.toggle('paused', isPaused);
        if (botControlLabel) {
            botControlLabel.textContent = isPaused ? 'Reanudar IA' : 'Pausar IA';
        }

        // Update icon (pause or play)
        if (botControlIcon) {
            botControlIcon.innerHTML = isPaused
                ? '<path d="M6 4l12 6-12 6V4z"/>' // Play icon
                : '<path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z"/>'; // Pause icon
        }
    }

    showChatEmpty() {
        document.getElementById('chatEmpty').style.display = 'flex';
        document.getElementById('chatActive').style.display = 'none';
    }

    showChatActive() {
        document.getElementById('chatEmpty').style.display = 'none';
        document.getElementById('chatActive').style.display = 'flex';
    }

    renderChatHeader(conversation) {
        // Use display_name from conversation (new logic)
        const displayName = conversation.display_name || (this.contacts.get(conversation.user_id) || { name: `Usuario ${conversation.id}` }).name;
        const initial = displayName.charAt(0).toUpperCase();

        document.getElementById('userInitial').textContent = initial;
        document.getElementById('userName').textContent = displayName;

        // Show user_id or session_id in subtitle
        const subtitle = conversation.user_id ?
            `Usuario: ${conversation.user_id}` :
            `Conversación: ${conversation.id}`;
        document.getElementById('userId').textContent = subtitle;
    }

    renderMessages(conversation, appendOlder = false) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const allMessages = conversation.messages || [];
        const totalMessages = allMessages.length;

        // Determine how many messages to show
        if (!appendOlder) {
            // Initial load: show last N messages
            this.displayedMessageCount = Math.min(this.messagesPerPage, totalMessages);
        }

        // Get the messages to display (from the end)
        const startIndex = Math.max(0, totalMessages - this.displayedMessageCount);
        const messagesToShow = allMessages.slice(startIndex);

        // Check if there are more messages to load
        const hasMoreMessages = startIndex > 0;

        let html = '';

        // Add "Load more" button at the top if there are older messages
        if (hasMoreMessages) {
            const remainingCount = startIndex;
            html += `
                <div class="load-more-container" id="loadMoreContainer">
                    <button class="load-more-btn" id="loadMoreBtn">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8z"/>
                        </svg>
                        Cargar mensajes anteriores (${remainingCount} más)
                    </button>
                </div>
            `;
        }

        // Add loading indicator (hidden by default)
        html += `
            <div class="loading-messages" id="loadingMessages" style="display: none;">
                <div class="loading-spinner"></div>
                <span>Cargando mensajes anteriores...</span>
            </div>
        `;

        let lastSessionId = null;

        messagesToShow.forEach((msg, index) => {
            const actualIndex = startIndex + index;

            // Check if session changed - insert session banner
            if (msg.session_id && msg.session_id !== lastSessionId) {
                // Find session info
                const session = conversation.sessions && conversation.sessions.find(s => s.session_id === msg.session_id);

                if (session && actualIndex > 0) { // Don't show banner for first session
                    const sessionTime = this.formatSessionTime(session.started_at);
                    html += `
                        <div class="session-banner">
                            <div class="session-banner-line"></div>
                            <div class="session-banner-content">
                                <div class="session-banner-title">Sesión #${session.session_id} iniciada</div>
                                <div class="session-banner-time">${sessionTime}</div>
                            </div>
                            <div class="session-banner-line"></div>
                        </div>
                    `;
                }

                lastSessionId = msg.session_id;
            }

            html += this.createMessageHTML(msg);
        });

        chatMessages.innerHTML = html;

        // Setup load more button handler
        this.setupLoadMoreHandler(conversation);

        // Setup scroll detection for auto-loading
        this.setupScrollLoadDetection(conversation);

        // Setup scroll-to-bottom button detection
        this.setupScrollToBottomDetection();

        // Scroll to bottom on initial load (without animation), preserve position on load more
        if (!appendOlder) {
            this.scrollToBottom(false); // Use instant scroll on initial load
        }
    }

    // Setup load more button click handler
    setupLoadMoreHandler(conversation) {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadOlderMessages(conversation);
            });
        }
    }

    // Setup scroll detection to auto-load when reaching top
    setupScrollLoadDetection(conversation) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        // Remove existing listener to avoid duplicates
        chatMessages.removeEventListener('scroll', chatMessages._scrollHandler);

        // Create scroll handler
        chatMessages._scrollHandler = () => {
            // If scrolled near top (within 100px) and not already loading
            if (chatMessages.scrollTop < 100 && !this.isLoadingMoreMessages) {
                const allMessages = conversation.messages || [];
                const startIndex = Math.max(0, allMessages.length - this.displayedMessageCount);

                // Only load if there are more messages
                if (startIndex > 0) {
                    this.loadOlderMessages(conversation);
                }
            }
        };

        chatMessages.addEventListener('scroll', chatMessages._scrollHandler);
    }

    // Load older messages
    async loadOlderMessages(conversation) {
        if (this.isLoadingMoreMessages) return;

        const allMessages = conversation.messages || [];
        const totalMessages = allMessages.length;
        const startIndex = Math.max(0, totalMessages - this.displayedMessageCount);

        // Check if there are more messages to load
        if (startIndex <= 0) return;

        this.isLoadingMoreMessages = true;

        // Show loading indicator
        const loadingIndicator = document.getElementById('loadingMessages');
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';

        // Simulate a small delay for UX (and to prevent rapid firing)
        await new Promise(resolve => setTimeout(resolve, 300));

        // Get current scroll position and height
        const chatMessages = document.getElementById('chatMessages');
        const previousScrollHeight = chatMessages ? chatMessages.scrollHeight : 0;

        // Increase displayed message count
        this.displayedMessageCount = Math.min(
            this.displayedMessageCount + this.messagesLoadIncrement,
            totalMessages
        );

        // Re-render messages
        this.renderMessages(conversation, true);

        // Restore scroll position to keep user at same place
        if (chatMessages) {
            const newScrollHeight = chatMessages.scrollHeight;
            const scrollDiff = newScrollHeight - previousScrollHeight;
            chatMessages.scrollTop = scrollDiff;
        }

        this.isLoadingMoreMessages = false;

        console.log(`📜 Loaded older messages. Now showing ${this.displayedMessageCount}/${totalMessages} messages`);
    }

    renderMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        // Check if scrolled to bottom before adding message
        const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 50;

        const messageHTML = this.createMessageHTML(message);
        chatMessages.insertAdjacentHTML('beforeend', messageHTML);

        // Auto-scroll if was at bottom
        if (isScrolledToBottom) {
            this.scrollToBottom();
        }

        // Play sound for user messages
        this.playNotificationSound(message);
    }

    createMessageHTML(message) {
        const isBot = message.user_id === '0';
        const isAgent = message.user_id === 'agent' || message.is_manual;
        const contact = this.contacts.get(message.user_id) || { name: `Usuario ${message.user_id}` };
        const time = this.formatTime(message.timestamp);

        // Determine message type and styling
        let messageType = 'user';
        let senderName = contact.name;
        let avatarContent = contact.name.charAt(0).toUpperCase();

        if (isBot) {
            messageType = 'bot';
            senderName = 'Infinitix';
            avatarContent = ''; // Image will show via CSS
        } else if (isAgent) {
            messageType = 'agent';
            senderName = 'Agente HITL';
            avatarContent = 'A';
        }

        // Status indicator for agent messages
        let statusHtml = '';
        if (isAgent && message.status) {
            const statusText = message.status === 'sent' ? 'Enviado' :
                               message.status === 'failed' ? 'Error' :
                               message.status === 'pending' ? 'Pendiente' : message.status;
            const statusIcon = message.status === 'sent' ? '✓' :
                               message.status === 'failed' ? '✗' : '⏳';
            statusHtml = `<div class="message-status ${message.status}">${statusIcon} ${statusText}</div>`;
        }

        return `
            <div class="message ${messageType}">
                <div class="message-avatar">${avatarContent}</div>
                <div class="message-content">
                    <div class="message-sender">${this.escapeHtml(senderName)}</div>
                    <div class="message-bubble">${this.escapeHtml(message.message).replace(/\n/g, '<br>')}</div>
                    <div class="message-time">${time}</div>
                    ${statusHtml}
                </div>
            </div>
        `;
    }

    async markConversationAsRead(conversationId) {
        try {
            const response = await fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to mark conversation as read');
            }
        } catch (error) {
            console.error('Error marking conversation as read:', error);
            // Don't show notification for this - it's a background operation
        }
    }

    scrollToBottom(smooth = true) {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            if (smooth) {
                chatMessages.scrollTo({
                    top: chatMessages.scrollHeight,
                    behavior: 'smooth'
                });
            } else {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }

        // Hide scroll-to-bottom button after scrolling
        const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        if (scrollToBottomBtn) {
            setTimeout(() => {
                scrollToBottomBtn.classList.remove('visible');
            }, 300);
        }
    }

    formatTime(timestamp) {
        // Validate timestamp
        if (!timestamp || isNaN(timestamp)) {
            console.log('⚠️ Invalid timestamp:', timestamp);
            return '--';
        }

        // Convert to integer to handle timestamps with microseconds from PostgreSQL
        const timestampMs = Math.floor(Number(timestamp));
        const date = new Date(timestampMs);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.log('⚠️ Invalid date from timestamp:', timestamp, 'converted to:', timestampMs);
            return '--';
        }

        const now = new Date();
        const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        // Check if today
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) {
            return time;
        }

        // Check if yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        if (isYesterday) {
            return `Ayer ${time}`;
        }

        // Check if within past week (not today, not yesterday)
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        if (date > oneWeekAgo) {
            // Spanish day abbreviations
            const dayNames = ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'];
            const dayName = dayNames[date.getDay()];
            return `${dayName} ${time}`;
        }

        // Older than a week: dd/mm/yyyy hh:mm
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year} ${time}`;
    }

    formatSessionTime(timestamp) {
        // Validate timestamp
        if (!timestamp || isNaN(timestamp)) {
            console.log('⚠️ Invalid session timestamp:', timestamp);
            return 'Fecha no disponible';
        }

        // Convert to integer to handle timestamps with microseconds from PostgreSQL
        const timestampMs = Math.floor(Number(timestamp));
        const date = new Date(timestampMs);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.log('⚠️ Invalid session date from timestamp:', timestamp, 'converted to:', timestampMs);
            return 'Fecha no disponible';
        }

        const now = new Date();
        const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        // Check if today
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) {
            return `Hoy a las ${time}`;
        }

        // Check if yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        if (isYesterday) {
            return `Ayer a las ${time}`;
        }

        // Check if within past week
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        if (date > oneWeekAgo) {
            // Spanish day names (full for session banners)
            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const dayName = dayNames[date.getDay()];
            return `${dayName} a las ${time}`;
        }

        // Older than a week: dd/mm/yyyy hh:mm
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year} ${time}`;
    }

    exportConversation() {
        if (!this.currentConversationId) {
            console.log('⚠️ No conversation selected for export');
            return;
        }

        const conversation = this.conversations.get(this.currentConversationId);
        if (!conversation) {
            console.log('⚠️ Conversation not found for export');
            return;
        }

        console.log('📥 Exporting conversation:', conversation.id);

        // Create export data
        const exportData = {
            conversation_id: conversation.id,
            display_name: conversation.display_name,
            user_id: conversation.user_id,
            customer_id: conversation.customer_id,
            exported_at: new Date().toISOString(),
            total_messages: conversation.messages.length,
            sessions: conversation.sessions || [],
            messages: conversation.messages.map(msg => ({
                timestamp: new Date(msg.timestamp).toISOString(),
                user_id: msg.user_id,
                sender: this.contacts.get(msg.user_id)?.name || `Usuario ${msg.user_id}`,
                message: msg.message,
                session_id: msg.session_id
            }))
        };

        // Generate transcript text format
        let transcript = `INFINITIX - EXPORTACIÓN DE CONVERSACIÓN\n`;
        transcript += `===========================================\n\n`;
        transcript += `Conversación: ${conversation.display_name}\n`;
        transcript += `ID: ${conversation.id}\n`;
        if (conversation.user_id) transcript += `Usuario: ${conversation.user_id}\n`;
        if (conversation.customer_id) transcript += `Customer ID: ${conversation.customer_id}\n`;
        transcript += `Total Mensajes: ${conversation.messages.length}\n`;
        transcript += `Exportado: ${new Date().toLocaleString('es-ES')}\n`;
        transcript += `\n===========================================\n\n`;

        let lastSessionId = null;
        conversation.messages.forEach(msg => {
            // Add session separator
            if (msg.session_id && msg.session_id !== lastSessionId) {
                const session = conversation.sessions?.find(s => s.session_id === msg.session_id);
                if (session) {
                    transcript += `\n--- SESIÓN #${session.session_id} ---\n`;
                    transcript += `Iniciada: ${new Date(session.started_at).toLocaleString('es-ES')}\n\n`;
                }
                lastSessionId = msg.session_id;
            }

            const time = new Date(msg.timestamp).toLocaleTimeString('es-ES');
            const sender = this.contacts.get(msg.user_id)?.name || `Usuario ${msg.user_id}`;
            transcript += `[${time}] ${sender}:\n${msg.message}\n\n`;
        });

        // Create download options modal
        this.showExportModal(exportData, transcript, conversation.display_name);
    }

    showExportModal(exportData, transcript, conversationName) {
        // Create modal HTML
        const modalHtml = `
            <div class="info-panel-overlay" id="exportModalOverlay" onclick="if(event.target.id==='exportModalOverlay') this.remove()">
                <div class="info-panel" style="max-width: 500px;">
                    <div class="info-header">
                        <h3>Exportar Conversación</h3>
                        <button class="info-close" onclick="document.getElementById('exportModalOverlay').remove()">✕</button>
                    </div>
                    <div class="info-body">
                        <p style="margin-bottom: 1rem; color: var(--text-secondary);">
                            Selecciona el formato de exportación para la conversación "${this.escapeHtml(conversationName)}".
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <button class="export-format-btn" onclick="window.controlPanel.downloadExport('json', ${this.currentConversationId})">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M4 4h12v2H4V4zm0 4h12v2H4V8zm0 4h8v2H4v-2z"/>
                                </svg>
                                <div>
                                    <strong>JSON</strong>
                                    <small>Formato estructurado con todos los datos</small>
                                </div>
                            </button>
                            <button class="export-format-btn" onclick="window.controlPanel.downloadExport('txt', ${this.currentConversationId})">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M4 2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm1 3v2h10V5H5zm0 4v2h10V9H5zm0 4v2h7v-2H5z"/>
                                </svg>
                                <div>
                                    <strong>TXT</strong>
                                    <small>Transcripción legible en texto plano</small>
                                </div>
                            </button>
                            <button class="export-format-btn" onclick="window.controlPanel.downloadExport('csv', ${this.currentConversationId})">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M3 3h14a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zm1 2v2h12V5H4zm0 4v2h12V9H4zm0 4v2h12v-2H4z"/>
                                </svg>
                                <div>
                                    <strong>CSV</strong>
                                    <small>Formato tabular para Excel/Sheets</small>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existing = document.getElementById('exportModalOverlay');
        if (existing) existing.remove();

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Store export data temporarily
        this._exportData = exportData;
        this._exportTranscript = transcript;

        console.log('✅ Export modal displayed');
    }

    downloadExport(format, conversationId) {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) {
            console.error('Conversation not found for export');
            return;
        }

        // Null safety checks
        if (!conversation.messages || conversation.messages.length === 0) {
            this.showNotification('No hay mensajes para exportar', 'error');
            const modal = document.getElementById('exportModalOverlay');
            if (modal) modal.remove();
            return;
        }

        let content, filename, mimeType;
        const displayName = conversation.display_name || `Conversacion_${conversationId}`;
        const sanitizedName = displayName.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().split('T')[0];

        switch (format) {
            case 'json':
                content = JSON.stringify(this._exportData, null, 2);
                filename = `conversacion_${sanitizedName}_${timestamp}.json`;
                mimeType = 'application/json';
                break;

            case 'txt':
                content = this._exportTranscript;
                filename = `conversacion_${sanitizedName}_${timestamp}.txt`;
                mimeType = 'text/plain';
                break;

            case 'csv':
                // Create CSV format
                content = 'Timestamp,Fecha,Hora,Usuario,Remitente,Mensaje,Sesion\n';
                conversation.messages.forEach(msg => {
                    const date = new Date(msg.timestamp);
                    const sender = this.contacts.get(msg.user_id)?.name || `Usuario ${msg.user_id}`;
                    const message = msg.message.replace(/"/g, '""'); // Escape quotes
                    content += `${msg.timestamp},"${date.toLocaleDateString('es-ES')}","${date.toLocaleTimeString('es-ES')}","${msg.user_id}","${sender}","${message}","${msg.session_id || ''}"\n`;
                });
                filename = `conversacion_${sanitizedName}_${timestamp}.csv`;
                mimeType = 'text/csv';
                break;

            default:
                return;
        }

        // Create and trigger download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`✅ Downloaded ${format.toUpperCase()} export: ${filename}`);

        // Show success notification
        this.showNotification(`Conversación exportada exitosamente como ${format.toUpperCase()}`, 'success');

        // Clean up export data
        this._exportData = null;
        this._exportTranscript = null;

        // Close modal
        const modal = document.getElementById('exportModalOverlay');
        if (modal) modal.remove();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    playNotificationSound(message) {
        // Only play sound for user messages (not bot messages)
        if (!message || message.user_id === '0') {
            return;
        }

        // Throttle: Don't play sound if less than 2 seconds since last sound
        const now = Date.now();
        if (now - this.lastSoundPlayedTime < 2000) {
            console.log('🔇 Sound throttled (less than 2 seconds since last sound)');
            return;
        }

        try {
            // Use Google Pixel popcorn notification sound
            const audio = new Audio('/google-pixel-popcorn-notification-sound.mp3');
            audio.volume = 0.3; // Set volume to 30%
            audio.play().catch(e => {
                console.log('Audio playback failed:', e.message);
            });

            // Update last played time
            this.lastSoundPlayedTime = now;
            console.log('🔔 Played notification sound for user message');
        } catch (e) {
            // Silently fail if audio not supported
            console.log('Audio not supported:', e.message);
        }
    }

    showKeyboardShortcuts() {
        const shortcuts = [
            { keys: 'Ctrl/Cmd + F', description: 'Buscar conversaciones' },
            { keys: 'Ctrl/Cmd + E', description: 'Exportar conversación actual' },
            { keys: 'Ctrl/Cmd + I', description: 'Ver información de conversación' },
            { keys: 'End', description: 'Ir al final de los mensajes' },
            { keys: 'Esc', description: 'Cerrar paneles o limpiar búsqueda' }
        ];

        const shortcutsHtml = shortcuts.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--text-secondary);">${s.description}</span>
                <kbd style="background: var(--bg-color); padding: 0.25rem 0.5rem; border-radius: 0.25rem; border: 1px solid var(--border-color); font-family: monospace; font-size: 0.875rem;">${s.keys}</kbd>
            </div>
        `).join('');

        const modalHtml = `
            <div class="info-panel-overlay" id="shortcutsOverlay" onclick="if(event.target.id==='shortcutsOverlay') this.remove()">
                <div class="info-panel" style="max-width: 500px;">
                    <div class="info-header">
                        <h3>Atajos de Teclado</h3>
                        <button class="info-close" onclick="document.getElementById('shortcutsOverlay').remove()">✕</button>
                    </div>
                    <div class="info-body" style="padding: 0;">
                        ${shortcutsHtml}
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existing = document.getElementById('shortcutsOverlay');
        if (existing) existing.remove();

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        document.querySelectorAll('.notification-toast').forEach(n => n.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;

        // Icon based on type
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="color: var(--success-color);"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
                break;
            case 'error':
                icon = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="color: var(--danger-color);"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
                break;
            default:
                icon = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style="color: var(--primary-color);"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
        }

        notification.innerHTML = `
            ${icon}
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.controlPanel = new InfinitixControlPanel();
});
