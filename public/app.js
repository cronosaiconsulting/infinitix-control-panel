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
        this.showDemoStartScreen();
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
            case 'demo_progress':
                this.handleDemoProgress(message.data);
                break;
            case 'demo_complete':
                this.handleDemoComplete(message.data);
                break;
            case 'demo_stopped':
                this.handleDemoStopped(message.data);
                break;
            case 'reset':
                this.handleReset();
                break;
        }
    }

    handleInit(data) {
        // Initialize with existing conversations
        data.conversations.forEach(conv => {
            this.conversations.set(conv.id, conv);
        });

        data.contacts.forEach(contact => {
            this.contacts.set(contact.user_id, contact);
        });

        if (this.conversations.size > 0) {
            this.renderConversations();
        }
    }

    handleContactUpdate(data) {
        this.contacts.set(data.user_id, data);
    }

    handleNewMessage(data) {
        const { conversation_id, message, conversation } = data;

        // Update conversation
        this.conversations.set(conversation_id, conversation);

        // Update conversations list
        this.renderConversations();

        // If this is the current conversation, add message to chat
        if (this.currentConversationId === conversation_id) {
            this.renderMessage(message);
            this.scrollToBottom();

            // Mark as read
            this.markConversationAsRead(conversation_id);
        }

        // Play notification sound (optional)
        this.playNotificationSound();
    }

    handleConversationRead(data) {
        const conv = this.conversations.get(data.conversation_id);
        if (conv) {
            conv.unread = 0;
            this.conversations.set(data.conversation_id, conv);
            this.renderConversations();
        }
    }

    handleDemoProgress(data) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressFill && progressText) {
            progressFill.style.width = `${data.percentage}%`;
            progressText.textContent = `${data.completed} / ${data.total} mensajes enviados (${data.percentage}%)`;
        }
    }

    handleDemoComplete(data) {
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = `✓ Demo completado! ${data.totalConversations} conversaciones activas`;
        }

        setTimeout(() => {
            const demoProgress = document.getElementById('demoProgress');
            if (demoProgress) {
                demoProgress.style.display = 'none';
            }
        }, 3000);
    }

    handleDemoStopped(data) {
        const demoProgress = document.getElementById('demoProgress');
        if (demoProgress) {
            demoProgress.style.display = 'none';
        }
        alert(data.message);
    }

    handleReset() {
        this.conversations.clear();
        this.contacts.clear();
        this.contacts.set('0', { user_id: '0', name: 'Infinitix' });
        this.currentConversationId = null;
        this.renderConversations();
        this.showChatEmpty();
    }

    setupEventListeners() {
        const startDemoBtn = document.getElementById('startDemoBtn');
        if (startDemoBtn) {
            startDemoBtn.addEventListener('click', () => this.startDemo());
        }

        const stopDemoBtn = document.getElementById('stopDemoBtn');
        if (stopDemoBtn) {
            stopDemoBtn.addEventListener('click', () => this.stopDemo());
        }
    }

    async startDemo() {
        try {
            const response = await fetch('/api/start-demo', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                this.showMainContent();
                this.showDemoProgress();
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error starting demo:', error);
            alert('Error al iniciar el demo');
        }
    }

    async stopDemo() {
        if (confirm('¿Estás seguro de que quieres detener el demo?')) {
            try {
                const response = await fetch('/api/stop-demo', { method: 'POST' });
                const data = await response.json();

                if (data.success) {
                    console.log('Demo stopped');
                }
            } catch (error) {
                console.error('Error stopping demo:', error);
            }
        }
    }

    showDemoStartScreen() {
        document.getElementById('demoStartScreen').style.display = 'flex';
        document.getElementById('mainContent').style.display = 'none';
    }

    showMainContent() {
        document.getElementById('demoStartScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'flex';
    }

    showDemoProgress() {
        const demoProgress = document.getElementById('demoProgress');
        if (demoProgress) {
            demoProgress.style.display = 'block';
        }
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
            const contact = this.contacts.get(conv.user_id) || { name: `Usuario ${conv.user_id}` };
            const time = this.formatTime(conv.lastTimestamp);
            const isActive = this.currentConversationId === conv.id;

            return `
                <div class="conversation-item ${isActive ? 'active' : ''}" data-id="${conv.id}">
                    <div class="conversation-header">
                        <span class="conversation-name">${this.escapeHtml(contact.name)}</span>
                        <span class="conversation-time">${time}</span>
                    </div>
                    <div class="conversation-preview">${this.escapeHtml(conv.lastMessage || 'Nueva conversación')}</div>
                    <div class="conversation-footer">
                        <span class="conversation-id">ID: ${conv.user_id}</span>
                        ${conv.unread > 0 ? `<span class="unread-badge">${conv.unread}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        conversationList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.dataset.id;
                this.openConversation(conversationId);
            });
        });
    }

    openConversation(conversationId) {
        this.currentConversationId = conversationId;
        const conversation = this.conversations.get(conversationId);

        if (!conversation) return;

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
        const contact = this.contacts.get(conversation.user_id) || { name: `Usuario ${conversation.user_id}` };
        const initial = contact.name.charAt(0).toUpperCase();

        document.getElementById('userInitial').textContent = initial;
        document.getElementById('userName').textContent = contact.name;
        document.getElementById('userId').textContent = `ID: ${conversation.user_id}`;
    }

    renderMessages(conversation) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        chatMessages.innerHTML = conversation.messages.map(msg => {
            return this.createMessageHTML(msg);
        }).join('');

        this.scrollToBottom();
    }

    renderMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageHTML = this.createMessageHTML(message);
        chatMessages.insertAdjacentHTML('beforeend', messageHTML);
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
        const date = new Date(timestamp);
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    playNotificationSound() {
        // Optional: Add notification sound
        // const audio = new Audio('/notification.mp3');
        // audio.play().catch(e => console.log('Could not play sound:', e));
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.controlPanel = new InfinitixControlPanel();
});
