// Production Server Module
// Handles real webhook integrations and database loading
// - Database is read ONLY on initial load (page reload)
// - Real-time updates come ONLY via webhooks (no periodic sync)

const database = require('./database');

class ProductionServer {
  constructor(app, broadcast) {
    this.app = app;
    this.broadcast = broadcast;
    this.conversations = new Map();
    this.contacts = new Map();
    this.lastSyncTimestamp = Date.now(); // Used for initial load only
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

    // Load historical messages (only on server startup / page reload)
    await this.loadHistoricalMessages();

    // NOTE: No periodic sync - updates come ONLY via webhooks while interface is open
    // Database is read ONLY on page reload to load historical messages

    // Setup production endpoints
    this.setupWebhookEndpoints();
    this.setupProductionAPI();

    console.log('✅ Production mode initialized');
    return true;
  }

  // Load historical messages from database
  async loadHistoricalMessages() {
    try {
      const days = parseInt(process.env.INITIAL_LOAD_DAYS || '365');
      console.log(`📥 Loading last ${days} days of messages (all historical data)...`);

      const messages = await database.getRecentMessages(days);
      console.log(`📥 Loaded ${messages.length} historical messages from database`);

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
  // @param {boolean} isRealtime - If true, increment unread for user messages (webhook). If false, don't increment (initial load)
  processMessageFromDB(dbMessage, isRealtime = false) {
    const metadata = dbMessage.metadata || {};
    const customUserId = metadata.user_id || '';
    const fullName = metadata.full_name || '';
    const customer_id = dbMessage.customer_id;

    // Conversation identification logic (PRIORITY ORDER):
    // 1. If customer_id exists: conversation_id = "customer_" + customer_id (HIGHEST PRIORITY - group all sessions for same customer)
    // 2. Else if metadata.user_id provided: conversation_id = metadata.user_id
    // 3. Else: conversation_id = "session_" + session_id
    const conversationId = customer_id ? `customer_${customer_id}` : (customUserId ? customUserId : `session_${dbMessage.session_id}`);

    console.log(`📊 Processing message: session=${dbMessage.session_id}, customer_id=${customer_id}, conv_id=${conversationId}`);

    // Track if we actually added new messages (to avoid duplicate broadcasts)
    let addedUserMessage = false;
    let addedBotMessage = false;

    // Display name priority: full_name > customer_name > phone_number > session_id
    const displayName = fullName || dbMessage.user_name || dbMessage.user_id || `Session ${dbMessage.session_id}`;

    // Add user contact if not exists
    const phoneNumber = dbMessage.user_id; // This is user_id (phone) from chat_sessions_v2
    if (!this.contacts.has(phoneNumber)) {
      this.contacts.set(phoneNumber, {
        user_id: phoneNumber,
        name: displayName
      });
    } else {
      // Update name if full_name is provided
      if (fullName) {
        this.contacts.get(phoneNumber).name = fullName;
      }
    }

    // Add bot contact if not exists
    if (!this.contacts.has('0')) {
      this.contacts.set('0', {
        user_id: '0',
        name: 'Infinitix'
      });
    }

    // Check if we need to merge conversations
    // Scenario 1: Migrate from session_XXX to customer_XXX when customer_id becomes available
    const sessionConvId = `session_${dbMessage.session_id}`;
    if (customer_id && this.conversations.has(sessionConvId) && !this.conversations.has(conversationId)) {
      console.log(`🔀 Migrating conversation: ${sessionConvId} → ${conversationId} (customer_id available)`);
      const sessionConv = this.conversations.get(sessionConvId);

      // Create new customer conversation with migrated messages
      this.conversations.set(conversationId, {
        id: conversationId,
        display_name: displayName,
        user_id: customUserId,
        customer_id: customer_id,
        sessions: [{
          session_id: dbMessage.session_id,
          started_at: sessionConv.messages.length > 0 ? sessionConv.messages[0].timestamp : Date.now(),
          phone_number: phoneNumber,
          message_count: sessionConv.messages.length
        }],
        messages: [...sessionConv.messages],
        lastMessage: sessionConv.lastMessage,
        lastTimestamp: sessionConv.lastTimestamp,
        unread: sessionConv.unread
      });

      // Delete old session conversation
      this.conversations.delete(sessionConvId);
    }
    // Scenario 2: Migrate from session_XXX to metadata user_id
    else if (customUserId && !customer_id && this.conversations.has(sessionConvId) && !this.conversations.has(customUserId)) {
      console.log(`🔀 Migrating conversation: ${sessionConvId} → ${customUserId} (metadata user_id)`);
      const sessionConv = this.conversations.get(sessionConvId);

      // Create new user conversation with migrated messages
      this.conversations.set(customUserId, {
        id: customUserId,
        display_name: displayName,
        user_id: customUserId,
        customer_id: null,
        sessions: [{
          session_id: dbMessage.session_id,
          started_at: sessionConv.messages.length > 0 ? sessionConv.messages[0].timestamp : Date.now(),
          phone_number: phoneNumber,
          message_count: sessionConv.messages.length
        }],
        messages: [...sessionConv.messages],
        lastMessage: sessionConv.lastMessage,
        lastTimestamp: sessionConv.lastTimestamp,
        unread: sessionConv.unread
      });

      // Delete old session conversation
      this.conversations.delete(sessionConvId);
    }

    // Get or create conversation
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        id: conversationId,
        display_name: displayName,
        user_id: customUserId || '',
        customer_id: customer_id || null,
        sessions: [{
          session_id: dbMessage.session_id,
          started_at: dbMessage.timestamp,
          phone_number: phoneNumber,
          message_count: 0
        }],
        messages: [],
        lastMessage: '',
        lastTimestamp: 0,
        unread: 0
      });
    }

    const conversation = this.conversations.get(conversationId);

    // Update display name if full_name is provided
    if (fullName) {
      conversation.display_name = fullName;
    }

    // Check if this is a new session for the same conversation
    const existingSession = conversation.sessions.find(s => s.session_id === dbMessage.session_id);
    if (!existingSession) {
      // New session detected - add to sessions array
      conversation.sessions.push({
        session_id: dbMessage.session_id,
        started_at: dbMessage.timestamp,
        phone_number: phoneNumber,
        message_count: 0
      });

      // Sort sessions by started_at
      conversation.sessions.sort((a, b) => a.started_at - b.started_at);
    }

    // Add user message
    if (dbMessage.user_message) {
      // Use message_id for stable duplicate detection across webhook retries
      const messageId = dbMessage.message_id ? `${dbMessage.message_id}_user` : `${dbMessage.timestamp}_user_${dbMessage.id}`;

      const userMessage = {
        id: messageId,
        user_id: phoneNumber,
        message: dbMessage.user_message,
        timestamp: dbMessage.timestamp,
        session_id: dbMessage.session_id,
        metadata: metadata
      };

      // Check if message already exists (avoid duplicates)
      const exists = conversation.messages.some(m => m.id === userMessage.id);
      if (!exists) {
        conversation.messages.push(userMessage);
        conversation.lastMessage = dbMessage.user_message;
        conversation.lastTimestamp = dbMessage.timestamp;

        // Increment unread count for user messages (only for real-time webhook messages, not initial load)
        if (isRealtime) {
          conversation.unread = (conversation.unread || 0) + 1;
        }

        // Update session message count
        const session = conversation.sessions.find(s => s.session_id === dbMessage.session_id);
        if (session) session.message_count++;

        addedUserMessage = true;
      }
    }

    // Add bot response (if exists)
    if (dbMessage.bot_response) {
      // Use message_id for stable duplicate detection across webhook retries
      const messageId = dbMessage.message_id ? `${dbMessage.message_id}_bot` : `${dbMessage.timestamp}_bot_${dbMessage.id}`;

      const botMessage = {
        id: messageId,
        user_id: '0', // Bot user_id
        message: dbMessage.bot_response,
        timestamp: dbMessage.timestamp + 1, // +1ms to ensure bot message comes after user
        session_id: dbMessage.session_id,
        metadata: metadata
      };

      // Check if message already exists
      const exists = conversation.messages.some(m => m.id === botMessage.id);
      if (!exists) {
        conversation.messages.push(botMessage);
        conversation.lastMessage = dbMessage.bot_response;
        conversation.lastTimestamp = dbMessage.timestamp + 1;

        // Update session message count
        const session = conversation.sessions.find(s => s.session_id === dbMessage.session_id);
        if (session) session.message_count++;

        addedBotMessage = true;
      }
    }

    // Sort messages by timestamp
    conversation.messages.sort((a, b) => a.timestamp - b.timestamp);

    // Return info about what was processed
    return {
      conversationId,
      addedUserMessage,
      addedBotMessage
    };
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
        const { message, message_id, session_id, user_id, full_name } = req.body;

        console.log(`📨 User message received: session ${session_id}, user_id: ${user_id || 'none'} - ${message?.substring(0, 50) || 'no message'}...`);

        // Validate required fields
        if (!session_id || !message) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: session_id, message'
          });
        }

        // Fetch session info from database to get user_id, customer_id and customer_name
        const sessionQuery = `
          SELECT
            id as session_id,
            user_id,
            customer_id,
            customer_name
          FROM chat_sessions_v2
          WHERE id = $1
        `;

        const sessionResult = await database.pool.query(sessionQuery, [session_id]);

        if (sessionResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Session not found. Create session in chat_sessions_v2 first.'
          });
        }

        const session = sessionResult.rows[0];
        const phone_number = session.user_id;
        const customer_id = session.customer_id;
        const user_name = session.customer_name;

        // Generate message_id if not provided (for response)
        const finalMessageId = message_id || `msg_${Date.now()}_${session_id}`;

        // Build metadata with user_id and full_name
        const metadata = {
          source: 'webhook',
          user_id: user_id || '',
          full_name: full_name || '',
          session_info: {
            session_id: session_id,
            phone_number: phone_number
          }
        };

        console.log(`📌 User message webhook: NO database write - only broadcasting to interface`);

        // Create DB message format for processing
        const dbMessage = {
          id: Date.now(),
          session_id: session_id,
          message_id: finalMessageId,
          user_message: message,
          bot_response: null,
          timestamp: Date.now(),
          user_id: phone_number,
          customer_id: customer_id,
          user_name: user_name || phone_number,
          metadata: metadata
        };

        // Process message and get result (isRealtime = true to increment unread)
        const result = this.processMessageFromDB(dbMessage, true);
        const { conversationId, addedUserMessage } = result;

        // Only broadcast if we actually added a new message (avoid duplicates)
        if (addedUserMessage) {
          const conversation = this.conversations.get(conversationId);

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
                conversation_id: conversationId,
                message: conversation.messages[conversation.messages.length - 1],
                conversation
              }
            });
          }
        } else {
          console.log(`⏭️ Message already exists - skipping broadcast to avoid duplicate`);
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
        const { message, message_id, user_id, full_name } = req.body;

        console.log(`🤖 Bot response received: ${message_id}, user_id: ${user_id || 'none'} - ${message?.substring(0, 50) || 'no message'}...`);

        // Validate required fields
        if (!message_id || !message) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: message_id, message'
          });
        }

        // Fetch the complete message from database to get existing metadata
        const fetchQuery = `
          SELECT
            cm.session_id,
            cm.user_message,
            cm.bot_response,
            cm.timestamp,
            cm.metadata,
            cs.user_id,
            cs.customer_id,
            cs.customer_name as user_name
          FROM chat_messages_v2 cm
          JOIN chat_sessions_v2 cs ON cm.session_id = cs.id
          WHERE cm.message_id = $1
        `;

        const fetchResult = await database.pool.query(fetchQuery, [message_id]);

        if (fetchResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Message not found. Send user message first.'
          });
        }

        const dbRow = fetchResult.rows[0];
        const existingMetadata = dbRow.metadata || {};

        // Build metadata with user_id and full_name if provided (for in-memory conversation)
        const updatedMetadata = {
          ...existingMetadata,
          user_id: user_id || existingMetadata.user_id || '',
          full_name: full_name || existingMetadata.full_name || '',
          source: 'webhook'
        };

        console.log(`📌 Bot response webhook: NO database write - only broadcasting to interface`);

        // Create DB message format for processing
        const dbMessage = {
          id: Date.now(),
          session_id: dbRow.session_id,
          message_id,
          user_message: dbRow.user_message,
          bot_response: message,
          timestamp: Date.now(),
          user_id: dbRow.user_id, // phone_number from database
          customer_id: dbRow.customer_id,
          user_name: dbRow.user_name,
          metadata: updatedMetadata
        };

        // Process message and get result
        const result = this.processMessageFromDB(dbMessage);
        const { conversationId, addedBotMessage } = result;

        // Only broadcast if we actually added a new bot message (avoid duplicates)
        if (addedBotMessage) {
          const conversation = this.conversations.get(conversationId);

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
                conversation_id: conversationId,
                message: conversation.messages[conversation.messages.length - 1],
                conversation
              }
            });
          }
        } else {
          console.log(`⏭️ Bot response already exists - skipping broadcast to avoid duplicate`);
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
