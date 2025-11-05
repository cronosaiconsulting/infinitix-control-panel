const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const { generateDemoData, generateWebhookCalls } = require('./demoData');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store conversations and connections in memory
const conversations = new Map();
const contacts = new Map();
let clients = new Set();
let demoRunning = false;
let demoTimeout = null;

// Add default bot contact
contacts.set('0', { user_id: '0', name: 'Infinitix' });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  // Send current state to new client
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      conversations: Array.from(conversations.values()),
      contacts: Array.from(contacts.values())
    }
  }));

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Webhook endpoint for messages
app.post('/webhook', (req, res) => {
  const { type, data } = req.body;

  console.log(`Received webhook: ${type}`, data);

  if (type === 'contact') {
    // Store contact information
    const { user_id, name } = data;
    contacts.set(user_id, { user_id, name });

    // Broadcast contact update
    broadcast({
      type: 'contact_update',
      data: { user_id, name }
    });
  } else if (type === 'message') {
    // Process message
    const { user_id, message, conversation_id } = data;
    const convId = conversation_id || user_id;

    // Get or create conversation
    if (!conversations.has(convId)) {
      conversations.set(convId, {
        id: convId,
        user_id: convId,
        messages: [],
        lastMessage: null,
        lastTimestamp: Date.now(),
        unread: 0
      });
    }

    const conversation = conversations.get(convId);
    const newMessage = {
      id: `${Date.now()}_${Math.random()}`,
      user_id,
      message,
      timestamp: Date.now()
    };

    conversation.messages.push(newMessage);
    conversation.lastMessage = message;
    conversation.lastTimestamp = newMessage.timestamp;

    // Increment unread if not from current user
    if (user_id !== '0') {
      conversation.unread++;
    }

    conversations.set(convId, conversation);

    // Broadcast message update
    broadcast({
      type: 'new_message',
      data: {
        conversation_id: convId,
        message: newMessage,
        conversation: conversation
      }
    });
  }

  res.json({ success: true });
});

// Start demo endpoint
app.post('/api/start-demo', async (req, res) => {
  if (demoRunning) {
    return res.json({ success: false, message: 'Demo already running' });
  }

  console.log('Starting demo simulation...');
  demoRunning = true;

  // Clear existing data
  conversations.clear();
  contacts.clear();
  contacts.set('0', { user_id: '0', name: 'Infinitix' });

  // Broadcast reset
  broadcast({
    type: 'reset',
    data: {}
  });

  // Generate demo data
  const demoConversations = generateDemoData();
  const webhookCalls = generateWebhookCalls(demoConversations);

  console.log(`Generated ${webhookCalls.length} webhook calls`);

  // Use localhost for self-calls (more reliable than going through proxy)
  const PORT = process.env.PORT || 3000;
  const webhookUrl = `http://localhost:${PORT}/webhook`;
  console.log(`Using webhook URL: ${webhookUrl}`);

  // Schedule all webhook calls
  const startTime = Date.now();

  res.json({
    success: true,
    message: 'Demo started',
    totalMessages: webhookCalls.length,
    duration: webhookCalls[webhookCalls.length - 1].timestamp
  });

  // Send webhook calls with timing
  let completedCalls = 0;

  webhookCalls.forEach((call, index) => {
    const delay = call.timestamp * 1000; // Convert to milliseconds

    demoTimeout = setTimeout(async () => {
      try {
        await axios.post(webhookUrl, {
          type: call.type,
          data: call.data
        });

        completedCalls++;

        // Broadcast progress
        broadcast({
          type: 'demo_progress',
          data: {
            completed: completedCalls,
            total: webhookCalls.length,
            percentage: Math.floor((completedCalls / webhookCalls.length) * 100)
          }
        });

        if (completedCalls === webhookCalls.length) {
          console.log('Demo simulation completed');
          demoRunning = false;

          broadcast({
            type: 'demo_complete',
            data: {
              message: 'Demo simulation completed!',
              totalConversations: conversations.size,
              totalMessages: completedCalls
            }
          });
        }
      } catch (error) {
        console.error('Error sending webhook:', error.message);
      }
    }, delay);
  });
});

// Stop demo endpoint
app.post('/api/stop-demo', (req, res) => {
  if (demoTimeout) {
    clearTimeout(demoTimeout);
    demoTimeout = null;
  }

  demoRunning = false;

  broadcast({
    type: 'demo_stopped',
    data: { message: 'Demo stopped' }
  });

  res.json({ success: true, message: 'Demo stopped' });
});

// Get all conversations
app.get('/api/conversations', (req, res) => {
  res.json({
    conversations: Array.from(conversations.values()),
    contacts: Array.from(contacts.values())
  });
});

// Get specific conversation
app.get('/api/conversations/:id', (req, res) => {
  const conversation = conversations.get(req.params.id);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  res.json(conversation);
});

// Mark conversation as read
app.post('/api/conversations/:id/read', (req, res) => {
  const conversation = conversations.get(req.params.id);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  conversation.unread = 0;
  conversations.set(req.params.id, conversation);

  broadcast({
    type: 'conversation_read',
    data: { conversation_id: req.params.id }
  });

  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    conversations: conversations.size,
    contacts: contacts.size,
    clients: clients.size,
    demoRunning
  });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Infinitix Control Panel...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 PORT from env: ${process.env.PORT || 'not set (using default 3000)'}`);
console.log(`🌐 Binding to: 0.0.0.0:${PORT}`);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║      INFINITIX CHATBOT CONTROL PANEL                      ║
║      WhatsApp Conversation Management System               ║
║                                                           ║
║      ✅ Server running on: 0.0.0.0:${PORT}                 ║
║      ✅ WebSocket ready for real-time updates              ║
║      ✅ Health check: http://localhost:${PORT}/health      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  console.log('✨ Server started successfully!');
});

// Log any server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
