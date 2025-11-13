// Load environment variables
require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const { generateDemoData } = require('./demoData');
const MessageScheduler = require('./MessageScheduler');
const ProductionServer = require('./productionServer');

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
let messageScheduler = null;
let productionServer = null;

// Determine mode (demo or production)
const MODE = process.env.MODE || 'demo';
const isDemoMode = MODE === 'demo';
const isProductionMode = MODE === 'production' || MODE === 'hybrid';

console.log(`🎯 Running in ${MODE} mode`);

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
  // If demo is already running, stop it first
  if (demoRunning && messageScheduler) {
    console.log('Demo already running, stopping it first...');
    messageScheduler.stop();
    messageScheduler = null;
  }

  console.log('Starting dynamic demo simulation...');
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

  // Generate demo conversations
  const demoConversations = generateDemoData();
  console.log(`Loaded ${demoConversations.length} demo conversations`);

  // Create webhook sender function
  const PORT = process.env.PORT || 3000;
  const webhookUrl = `http://localhost:${PORT}/webhook`;

  const sendWebhookFn = async (webhookData) => {
    try {
      await axios.post(webhookUrl, webhookData);
    } catch (error) {
      console.error('Error sending webhook:', error.message);
    }
  };

  // Create message scheduler
  messageScheduler = new MessageScheduler(demoConversations, sendWebhookFn, broadcast);

  // Calculate total messages for response
  const totalMessages = demoConversations.reduce((sum, conv) => sum + conv.messages.length, 0);

  res.json({
    success: true,
    message: 'Demo started with intelligent scheduling',
    totalMessages: totalMessages,
    conversations: demoConversations.length
  });

  // Start the scheduler (first message sent immediately)
  messageScheduler.start();
});

// Stop demo endpoint
app.post('/api/stop-demo', (req, res) => {
  console.log('Stopping demo...');

  // Stop the message scheduler
  if (messageScheduler) {
    messageScheduler.stop();
    messageScheduler = null;
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

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║      INFINITIX CHATBOT CONTROL PANEL                      ║
║      WhatsApp Conversation Management System               ║
║                                                           ║
║      ✅ Server running on: 0.0.0.0:${PORT}                 ║
║      ✅ WebSocket ready for real-time updates              ║
║      ✅ Health check: http://localhost:${PORT}/health      ║
║      ⚙️  Mode: ${MODE}                                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  console.log('✨ Server started successfully!');

  // Initialize production mode if enabled
  if (isProductionMode) {
    productionServer = new ProductionServer(app, broadcast);
    const initialized = await productionServer.initialize();

    if (initialized) {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║      🔥 PRODUCTION MODE ACTIVE                             ║
║      📊 Database: Connected                                ║
║      🔄 Auto-sync: Enabled                                 ║
║      📡 Webhooks: /webhook/user-message                    ║
║                  /webhook/bot-response                     ║
╚═══════════════════════════════════════════════════════════╝
      `);
    }
  } else {
    console.log('💡 Running in DEMO mode. Start demo from the dashboard.');
  }
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
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, closing server gracefully...`);

  // Stop demo if running
  if (messageScheduler) {
    messageScheduler.stop();
  }

  // Stop production server if running
  if (productionServer) {
    await productionServer.shutdown();
  }

  // Close HTTP server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
