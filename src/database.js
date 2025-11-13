// PostgreSQL Database Connection Module
// Connects to chat_messages_v2 table for message synchronization

const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  // Initialize database connection
  async connect() {
    try {
      // Create connection pool
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Test connection
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL connected successfully');
      client.release();

      this.isConnected = true;

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('❌ Unexpected database error:', err);
        this.isConnected = false;
      });

      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  // Create table if not exists
  async initializeTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS chat_messages_v2 (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(255),
        message_type VARCHAR(10) NOT NULL CHECK (message_type IN ('user', 'bot')),
        message TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_conversation_id ON chat_messages_v2(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON chat_messages_v2(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_created_at ON chat_messages_v2(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_user_id ON chat_messages_v2(user_id);
    `;

    try {
      await this.pool.query(query);
      console.log('✅ Database table initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize table:', error.message);
      return false;
    }
  }

  // Insert a new message
  async insertMessage(messageData) {
    const query = `
      INSERT INTO chat_messages_v2
        (conversation_id, user_id, user_name, message_type, message, timestamp, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    const values = [
      messageData.conversation_id,
      messageData.user_id,
      messageData.user_name || null,
      messageData.message_type, // 'user' or 'bot'
      messageData.message,
      messageData.timestamp,
      messageData.metadata || null
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Failed to insert message:', error.message);
      throw error;
    }
  }

  // Get all conversations (grouped by conversation_id)
  async getConversations(limit = 100) {
    const query = `
      WITH latest_messages AS (
        SELECT DISTINCT ON (conversation_id)
          conversation_id,
          user_id,
          user_name,
          message as last_message,
          timestamp as last_timestamp,
          message_type
        FROM chat_messages_v2
        ORDER BY conversation_id, timestamp DESC
      ),
      message_counts AS (
        SELECT
          conversation_id,
          COUNT(*) as message_count
        FROM chat_messages_v2
        GROUP BY conversation_id
      )
      SELECT
        lm.conversation_id,
        lm.user_id,
        lm.user_name,
        lm.last_message,
        lm.last_timestamp,
        mc.message_count
      FROM latest_messages lm
      LEFT JOIN message_counts mc ON lm.conversation_id = mc.conversation_id
      ORDER BY lm.last_timestamp DESC
      LIMIT $1
    `;

    try {
      const result = await this.pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get conversations:', error.message);
      throw error;
    }
  }

  // Get messages for a specific conversation
  async getConversationMessages(conversationId, limit = 1000, offset = 0) {
    const query = `
      SELECT
        id,
        conversation_id,
        user_id,
        user_name,
        message_type,
        message,
        timestamp,
        created_at
      FROM chat_messages_v2
      WHERE conversation_id = $1
      ORDER BY timestamp ASC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.pool.query(query, [conversationId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get messages:', error.message);
      throw error;
    }
  }

  // Get recent messages (for initial load)
  async getRecentMessages(days = 7) {
    const query = `
      SELECT
        id,
        conversation_id,
        user_id,
        user_name,
        message_type,
        message,
        timestamp,
        created_at
      FROM chat_messages_v2
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY timestamp ASC
    `;

    try {
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get recent messages:', error.message);
      throw error;
    }
  }

  // Get messages since a specific timestamp (for sync)
  async getMessagesSince(timestamp) {
    const query = `
      SELECT
        id,
        conversation_id,
        user_id,
        user_name,
        message_type,
        message,
        timestamp,
        created_at
      FROM chat_messages_v2
      WHERE timestamp > $1
      ORDER BY timestamp ASC
    `;

    try {
      const result = await this.pool.query(query, [timestamp]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to sync messages:', error.message);
      throw error;
    }
  }

  // Search conversations by user name or message content
  async searchConversations(searchTerm) {
    const query = `
      SELECT DISTINCT
        conversation_id,
        user_id,
        user_name
      FROM chat_messages_v2
      WHERE
        user_name ILIKE $1 OR
        message ILIKE $1
      ORDER BY timestamp DESC
      LIMIT 50
    `;

    try {
      const result = await this.pool.query(query, [`%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to search:', error.message);
      throw error;
    }
  }

  // Get conversation statistics
  async getStats() {
    const query = `
      SELECT
        COUNT(DISTINCT conversation_id) as total_conversations,
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE message_type = 'user') as user_messages,
        COUNT(*) FILTER (WHERE message_type = 'bot') as bot_messages,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as messages_24h,
        COUNT(DISTINCT conversation_id) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as active_conversations_24h
      FROM chat_messages_v2
    `;

    try {
      const result = await this.pool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to get stats:', error.message);
      throw error;
    }
  }

  // Close database connection
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connection closed');
      this.isConnected = false;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.pool.query('SELECT NOW()');
      return { healthy: true, timestamp: result.rows[0].now };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;
