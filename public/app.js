// Infinitix Control Panel - Client Side Application

class InfinitixControlPanel {
    constructor() {
        this.ws = null;
        this.conversations = new Map();
        this.contacts = new Map();
        this.currentConversationId = null;
        this.init();
    }

    init() {
        this.setupWebSocket();
        this.setupEventListeners();
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
        }
    }

    handleInit(data) {
        console.log(`🔄 Initializing: ${data.conversations.length} conversations, ${data.contacts.length} contacts`);

        // Initialize with existing conversations
        data.conversations.forEach(conv => {
            this.conversations.set(conv.id, conv);
        });

        data.contacts.forEach(contact => {
            this.contacts.set(contact.user_id, contact);
        });

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

        // Update conversation
        this.conversations.set(conversation_id, conversation);

        // Update conversations list
        this.renderConversations();

        // If this is the current conversation, add message to chat
        if (this.currentConversationId === conversation_id) {
            console.log('📝 Adding message to current conversation');
            this.renderMessage(message);
            this.scrollToBottom();

            // Mark as read
            this.markConversationAsRead(conversation_id);
        } else {
            console.log('🔔 Message in different conversation - showing notification');
        }

        // Play notification sound (optional)
        this.playNotificationSound();
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
        // Info button click handler
        document.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn[title="Información"]') || e.target.closest('.action-btn[title="Information"]')) {
                console.log('🔘 Info button clicked');
                this.showConversationInfo();
            }
        });

        console.log('✅ Event listeners setup complete');
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
        const sessionsHtml = sessions.map(s => `
            <div class="info-session">
                <strong>Sesión #${s.session_id}</strong>
                <div>Teléfono: ${s.phone_number}</div>
                <div>Iniciada: ${new Date(s.started_at).toLocaleString('es-ES')}</div>
                <div>Mensajes: ${s.message_count}</div>
            </div>
        `).join('');

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
                            <div><strong>Último mensaje:</strong> ${new Date(conversation.lastTimestamp).toLocaleString('es-ES')}</div>
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

    renderConversations() {
        const conversationList = document.getElementById('conversationList');
        if (!conversationList) return;

        // Sort conversations by last message time
        const sortedConversations = Array.from(this.conversations.values())
            .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

        if (sortedConversations.length === 0) {
            conversationList.innerHTML = '<div class="empty-state"><p>No hay conversaciones activas</p></div>';
            return;
        }

        conversationList.innerHTML = sortedConversations.map(conv => {
            // Use display_name from conversation (new logic), fallback to contact name
            const displayName = conv.display_name || (this.contacts.get(conv.user_id) || { name: `Usuario ${conv.id}` }).name;
            const time = this.formatTime(conv.lastTimestamp);
            const isActive = this.currentConversationId === conv.id;

            // Show session count if multiple sessions
            const sessionInfo = conv.sessions && conv.sessions.length > 1 ?
                `<span class="session-count">${conv.sessions.length} sesiones</span>` : '';

            return `
                <div class="conversation-item ${isActive ? 'active' : ''}" data-id="${conv.id}">
                    <div class="conversation-header">
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
        this.renderConversations(); // Update the list to show active state
        this.markConversationAsRead(conversationId);
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

    renderMessages(conversation) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        let html = '';
        let lastSessionId = null;

        conversation.messages.forEach((msg, index) => {
            // Check if session changed - insert session banner
            if (msg.session_id && msg.session_id !== lastSessionId) {
                // Find session info
                const session = conversation.sessions && conversation.sessions.find(s => s.session_id === msg.session_id);

                if (session && index > 0) { // Don't show banner for first session
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
        this.scrollToBottom();
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

        // Play sound
        this.playNotificationSound();
    }

    createMessageHTML(message) {
        const contact = this.contacts.get(message.user_id) || { name: `Usuario ${message.user_id}` };
        const isBot = message.user_id === '0';
        const time = this.formatTime(message.timestamp);
        const initial = contact.name.charAt(0).toUpperCase();

        return `
            <div class="message ${isBot ? 'bot' : 'user'}">
                <div class="message-avatar">${initial}</div>
                <div class="message-content">
                    <div class="message-sender">${this.escapeHtml(contact.name)}</div>
                    <div class="message-bubble">${this.escapeHtml(message.message).replace(/\n/g, '<br>')}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }

    async markConversationAsRead(conversationId) {
        try {
            await fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' });
        } catch (error) {
            console.error('Error marking conversation as read:', error);
        }
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    formatTime(timestamp) {
        // Validate timestamp
        if (!timestamp || isNaN(timestamp)) {
            console.log('⚠️ Invalid timestamp:', timestamp);
            return '--';
        }

        const date = new Date(timestamp);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.log('⚠️ Invalid date from timestamp:', timestamp);
            return '--';
        }

        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) {
            return 'Ahora';
        }

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m`;
        }

        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h`;
        }

        // Show time
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    formatSessionTime(timestamp) {
        // Validate timestamp
        if (!timestamp || isNaN(timestamp)) {
            console.log('⚠️ Invalid session timestamp:', timestamp);
            return 'Fecha no disponible';
        }

        const date = new Date(timestamp);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.log('⚠️ Invalid session date from timestamp:', timestamp);
            return 'Fecha no disponible';
        }

        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return `Hoy a las ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        }

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isYesterday) {
            return `Ayer a las ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        }

        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    playNotificationSound() {
        try {
            // Use MP3 notification sound
            const audio = new Audio('/new-notification-010-352755.mp3');
            audio.volume = 0.3; // Set volume to 30%
            audio.play().catch(e => {
                console.log('Audio playback failed:', e.message);
            });
        } catch (e) {
            // Silently fail if audio not supported
            console.log('Audio not supported:', e.message);
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.controlPanel = new InfinitixControlPanel();
});
