// Load environment variables
require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');
const ProductionServer = require('./productionServer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store connections
let clients = new Set();
let productionServer = null;

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  // Send current state to new client (from ProductionServer)
  if (productionServer) {
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        conversations: Array.from(productionServer.conversations.values()),
        contacts: Array.from(productionServer.contacts.values())
      }
    }));
  }

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

// Mark conversation as read
app.post('/api/conversations/:id/read', (req, res) => {
  if (productionServer) {
    const conversation = productionServer.conversations.get(req.params.id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.unread = 0;
    productionServer.conversations.set(req.params.id, conversation);

    broadcast({
      type: 'conversation_read',
      data: { conversation_id: req.params.id }
    });

    return res.json({ success: true });
  }

  res.status(503).json({ error: 'Production server not initialized' });
});

// Health check
app.get('/health', (req, res) => {
  const healthData = {
    status: 'ok',
    clients: clients.size,
    production: productionServer ? {
      conversations: productionServer.conversations.size,
      contacts: productionServer.contacts.size,
      database_connected: productionServer.isConnected || false
    } : null
  };
  res.json(healthData);
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
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  console.log('✨ Server started successfully!');

  // Initialize production mode
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
  } else {
    console.error('❌ Failed to initialize production server');
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
