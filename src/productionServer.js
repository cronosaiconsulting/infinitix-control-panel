// Production Server Module
// Handles real webhook integrations and database synchronization

const database = require('./database');

class ProductionServer {
  constructor(app, broadcast) {
    this.app = app;
    this.broadcast = broadcast;
    this.conversations = new Map();
    this.contacts = new Map();
    this.lastSyncTimestamp = Date.now();
    this.syncInterval = null;
  }

  // Initialize production mode
  async initialize() {
    console.log('🚀 Initializing production mode...');

    // Connect to database
    const connected = await database.connect();
    if (!connected) {
      console.error('❌ Failed to connect to database. Production mode disabled.');
      return false;
    }

    // Initialize table
    await database.initializeTable();

    // Load historical messages
    await this.loadHistoricalMessages();

    // Start periodic sync
    this.startPeriodicSync();

    // Setup production endpoints
    this.setupWebhookEndpoints();
    this.setupProductionAPI();

    console.log('✅ Production mode initialized');
    return true;
  }

  // Load historical messages from database
  async loadHistoricalMessages() {
    try {
      const days = parseInt(process.env.INITIAL_LOAD_DAYS || '7');
      console.log(`📥 Loading last ${days} days of messages...`);

      const messages = await database.getRecentMessages(days);
      console.log(`📥 Loaded ${messages.length} historical messages`);

      // Process messages to rebuild conversations
      for (const dbMessage of messages) {
        this.processMessageFromDB(dbMessage);
      }

      // Broadcast initial state
      this.broadcast({
        type: 'init',
        data: {
          conversations: Array.from(this.conversations.values()),
          contacts: Array.from(this.contacts.values())
        }
      });

      this.lastSyncTimestamp = Date.now();
    } catch (error) {
      console.error('❌ Failed to load historical messages:', error);
    }
  }

  // Process a message from database
  processMessageFromDB(dbMessage) {
    const conversationId = dbMessage.conversation_id;
    const isBot = dbMessage.message_type === 'bot';
    const userId = isBot ? '0' : dbMessage.user_id;

    // Add contact if not exists
    if (!this.contacts.has(userId)) {
      this.contacts.set(userId, {
        user_id: userId,
        name: isBot ? 'Infinitix' : (dbMessage.user_name || `Usuario ${userId}`)
      });
    }

    // Get or create conversation
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        id: conversationId,
        user_id: dbMessage.user_id,
        messages: [],
        lastMessage: '',
        lastTimestamp: 0,
        unread: 0
      });
    }

    const conversation = this.conversations.get(conversationId);

    // Add message to conversation
    const message = {
      id: `${dbMessage.timestamp}_${dbMessage.id}`,
      user_id: userId,
      message: dbMessage.message,
      timestamp: dbMessage.timestamp
    };

    conversation.messages.push(message);
    conversation.lastMessage = dbMessage.message;
    conversation.lastTimestamp = dbMessage.timestamp;
  }

  // Periodic sync with database
  startPeriodicSync() {
    const interval = parseInt(process.env.SYNC_INTERVAL || '30000'); // 30 seconds default
    console.log(`🔄 Starting periodic sync (every ${interval / 1000}s)`);

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncWithDatabase();
      } catch (error) {
        console.error('❌ Sync error:', error);
      }
    }, interval);
  }

  // Sync new messages from database
  async syncWithDatabase() {
    try {
      const newMessages = await database.getMessagesSince(this.lastSyncTimestamp);

      if (newMessages.length > 0) {
        console.log(`🔄 Synced ${newMessages.length} new messages from database`);

        for (const dbMessage of newMessages) {
          this.processMessageFromDB(dbMessage);

          // Broadcast the new message
          const conversationId = dbMessage.conversation_id;
          const conversation = this.conversations.get(conversationId);

          if (conversation) {
            this.broadcast({
              type: 'new_message',
              data: {
                conversation_id: conversationId,
                message: conversation.messages[conversation.messages.length - 1],
                conversation: conversation
              }
            });
          }
        }

        this.lastSyncTimestamp = Date.now();
      }
    } catch (error) {
      console.error('❌ Failed to sync:', error);
    }
  }

  // Setup webhook endpoints for n8n
  setupWebhookEndpoints() {
    // Middleware to verify webhook secret
    const verifyWebhook = (req, res, next) => {
      const webhookSecret = process.env.WEBHOOK_SECRET;

      if (webhookSecret) {
        const providedSecret = req.headers['x-api-key'];
        if (providedSecret !== webhookSecret) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized: Invalid API key'
          });
        }
      }

      next();
    };

    // Webhook: Receive user message
    this.app.post('/webhook/user-message', verifyWebhook, async (req, res) => {
      try {
        const { user_id, user_name, message, timestamp, conversation_id } = req.body;

        console.log(`📨 User message received: ${user_id} - ${message.substring(0, 50)}...`);

        // Validate required fields
        if (!user_id || !message || !conversation_id) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: user_id, message, conversation_id'
          });
        }

        // Store in database
        const messageData = {
          conversation_id,
          user_id,
          user_name,
          message_type: 'user',
          message,
          timestamp: timestamp || Date.now()
        };

        await database.insertMessage(messageData);

        // Process and broadcast
        this.processMessageFromDB({
          ...messageData,
          id: Date.now() // Temporary ID
        });

        const conversation = this.conversations.get(conversation_id);

        // Broadcast contact update
        this.broadcast({
          type: 'contact_update',
          data: this.contacts.get(user_id)
        });

        // Broadcast new message
        this.broadcast({
          type: 'new_message',
          data: {
            conversation_id,
            message: conversation.messages[conversation.messages.length - 1],
            conversation
          }
        });

        res.json({ success: true, message: 'User message received' });
      } catch (error) {
        console.error('❌ Error processing user message:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Webhook: Receive bot response
    this.app.post('/webhook/bot-response', verifyWebhook, async (req, res) => {
      try {
        const { user_id, conversation_id, message, timestamp } = req.body;

        console.log(`🤖 Bot response received: ${conversation_id} - ${message.substring(0, 50)}...`);

        // Validate required fields
        if (!conversation_id || !message) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: conversation_id, message'
          });
        }

        // Store in database
        const messageData = {
          conversation_id,
          user_id: user_id || '0', // Bot has user_id '0'
          user_name: 'Infinitix',
          message_type: 'bot',
          message,
          timestamp: timestamp || Date.now()
        };

        await database.insertMessage(messageData);

        // Process and broadcast
        this.processMessageFromDB({
          ...messageData,
          id: Date.now()
        });

        const conversation = this.conversations.get(conversation_id);

        // Broadcast contact update (bot)
        this.broadcast({
          type: 'contact_update',
          data: { user_id: '0', name: 'Infinitix' }
        });

        // Broadcast new message
        this.broadcast({
          type: 'new_message',
          data: {
            conversation_id,
            message: conversation.messages[conversation.messages.length - 1],
            conversation
          }
        });

        res.json({ success: true, message: 'Bot response received' });
      } catch (error) {
        console.error('❌ Error processing bot response:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    console.log('✅ Webhook endpoints configured');
  }

  // Setup production API endpoints
  setupProductionAPI() {
    // Get all conversations
    this.app.get('/api/production/conversations', async (req, res) => {
      try {
        const conversations = await database.getConversations();
        res.json({ success: true, conversations });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Get messages for a conversation
    this.app.get('/api/production/conversations/:id/messages', async (req, res) => {
      try {
        const messages = await database.getConversationMessages(req.params.id);
        res.json({ success: true, messages });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Manual database sync
    this.app.post('/api/production/sync', async (req, res) => {
      try {
        await this.syncWithDatabase();
        res.json({ success: true, message: 'Sync completed' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Get statistics
    this.app.get('/api/production/stats', async (req, res) => {
      try {
        const stats = await database.getStats();
        res.json({ success: true, stats });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Search conversations
    this.app.get('/api/production/search', async (req, res) => {
      try {
        const { q } = req.query;
        if (!q) {
          return res.status(400).json({ success: false, error: 'Missing query parameter: q' });
        }

        const results = await database.searchConversations(q);
        res.json({ success: true, results });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    console.log('✅ Production API endpoints configured');
  }

  // Stop periodic sync
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      console.log('🛑 Periodic sync stopped');
    }
  }

  // Graceful shutdown
  async shutdown() {
    this.stop();
    await database.close();
  }
}

module.exports = ProductionServer;
