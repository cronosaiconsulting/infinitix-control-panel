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

    // Check tables exist
    const tablesExist = await database.checkTables();
    if (!tablesExist) {
      console.error('❌ Required tables not found. Production mode disabled.');
      return false;
    }

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
  // Note: DB row contains BOTH user_message and bot_response
  processMessageFromDB(dbMessage) {
    const conversationId = dbMessage.user_id; // Use phone number as conversation ID
    const userId = dbMessage.user_id;

    // Add user contact if not exists
    if (!this.contacts.has(userId)) {
      this.contacts.set(userId, {
        user_id: userId,
        name: dbMessage.user_name || `Usuario ${userId}`
      });
    }

    // Add bot contact if not exists
    if (!this.contacts.has('0')) {
      this.contacts.set('0', {
        user_id: '0',
        name: 'Infinitix'
      });
    }

    // Get or create conversation
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        id: conversationId,
        user_id: userId,
        messages: [],
        lastMessage: '',
        lastTimestamp: 0,
        unread: 0
      });
    }

    const conversation = this.conversations.get(conversationId);

    // Add user message
    if (dbMessage.user_message) {
      const userMessage = {
        id: `${dbMessage.timestamp}_user_${dbMessage.id}`,
        user_id: userId,
        message: dbMessage.user_message,
        timestamp: dbMessage.timestamp
      };

      // Check if message already exists (avoid duplicates)
      const exists = conversation.messages.some(m => m.id === userMessage.id);
      if (!exists) {
        conversation.messages.push(userMessage);
        conversation.lastMessage = dbMessage.user_message;
        conversation.lastTimestamp = dbMessage.timestamp;
      }
    }

    // Add bot response (if exists)
    if (dbMessage.bot_response) {
      const botMessage = {
        id: `${dbMessage.timestamp}_bot_${dbMessage.id}`,
        user_id: '0', // Bot user_id
        message: dbMessage.bot_response,
        timestamp: dbMessage.timestamp + 1 // +1ms to ensure bot message comes after user
      };

      // Check if message already exists
      const exists = conversation.messages.some(m => m.id === botMessage.id);
      if (!exists) {
        conversation.messages.push(botMessage);
        conversation.lastMessage = dbMessage.bot_response;
        conversation.lastTimestamp = dbMessage.timestamp + 1;
      }
    }

    // Sort messages by timestamp
    conversation.messages.sort((a, b) => a.timestamp - b.timestamp);
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
        const { phone_number, user_name, message, message_id, session_id } = req.body;

        console.log(`📨 User message received: ${phone_number} - ${message?.substring(0, 50) || 'no message'}...`);

        // Validate required fields
        if (!phone_number || !message) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: phone_number, message'
          });
        }

        // Get or find session
        let sessionIdToUse = session_id;
        if (!sessionIdToUse) {
          const session = await database.getSessionByPhone(phone_number);
          sessionIdToUse = session ? session.session_id : null;
        }

        // If no session found, return error (session should be created by n8n)
        if (!sessionIdToUse) {
          return res.status(400).json({
            success: false,
            error: 'No session found for phone number. Session must be created first.'
          });
        }

        // Generate message_id if not provided
        const finalMessageId = message_id || `msg_${Date.now()}_${phone_number}`;

        // Store in database
        const messageData = {
          session_id: sessionIdToUse,
          message_id: finalMessageId,
          user_message: message,
          bot_response: null,
          intent: null,
          metadata: { source: 'webhook', user_name }
        };

        await database.insertMessage(messageData);

        // Create DB message format for processing
        const dbMessage = {
          id: Date.now(),
          session_id: sessionIdToUse,
          message_id: finalMessageId,
          user_message: message,
          bot_response: null,
          timestamp: Date.now(),
          user_id: phone_number,
          user_name: user_name || phone_number
        };

        // Process and broadcast
        this.processMessageFromDB(dbMessage);

        const conversation = this.conversations.get(phone_number);

        // Broadcast contact update
        this.broadcast({
          type: 'contact_update',
          data: this.contacts.get(phone_number)
        });

        // Broadcast new message
        if (conversation) {
          this.broadcast({
            type: 'new_message',
            data: {
              conversation_id: phone_number,
              message: conversation.messages[conversation.messages.length - 1],
              conversation
            }
          });
        }

        res.json({ success: true, message: 'User message received', message_id: finalMessageId });
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
        const { message, message_id } = req.body;

        console.log(`🤖 Bot response received: ${message_id} - ${message?.substring(0, 50) || 'no message'}...`);

        // Validate required fields
        if (!message_id || !message) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: message_id, message'
          });
        }

        // Update bot response in database and get the message info
        const updatedId = await database.updateBotResponse(message_id, message);

        if (!updatedId) {
          return res.status(404).json({
            success: false,
            error: 'Message not found. Send user message first.'
          });
        }

        // Fetch the complete message from database to get phone_number
        const query = `
          SELECT
            cm.user_message,
            cm.bot_response,
            cm.timestamp,
            cs.phone_number as user_id,
            cs.user_name
          FROM chat_messages_v2 cm
          JOIN chat_sessions_v2 cs ON cm.session_id = cs.id
          WHERE cm.message_id = $1
        `;

        const result = await database.pool.query(query, [message_id]);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Message not found in database'
          });
        }

        const dbRow = result.rows[0];

        // Create DB message format for processing
        const dbMessage = {
          id: Date.now(),
          message_id,
          user_message: dbRow.user_message,
          bot_response: message,
          timestamp: Date.now(),
          user_id: dbRow.user_id, // phone_number from database
          user_name: dbRow.user_name
        };

        // Process and broadcast
        this.processMessageFromDB(dbMessage);

        const conversation = this.conversations.get(dbRow.user_id);

        // Broadcast contact update (bot)
        this.broadcast({
          type: 'contact_update',
          data: { user_id: '0', name: 'Infinitix' }
        });

        // Broadcast new message
        if (conversation) {
          this.broadcast({
            type: 'new_message',
            data: {
              conversation_id: dbRow.user_id,
              message: conversation.messages[conversation.messages.length - 1],
              conversation
            }
          });
        }

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
