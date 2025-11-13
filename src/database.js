// PostgreSQL Database Connection Module
// Connects to existing chat_messages_v2 and chat_sessions_v2 tables

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
      console.log(`📍 Database: ${client.database}`);
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

  // Check if tables exist (no creation needed - using existing tables)
  async checkTables() {
    try {
      const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('chat_messages_v2', 'chat_sessions_v2')
      `;

      const result = await this.pool.query(query);
      const tables = result.rows.map(row => row.table_name);

      console.log(`📊 Found tables: ${tables.join(', ')}`);

      if (tables.includes('chat_messages_v2') && tables.includes('chat_sessions_v2')) {
        console.log('✅ Required tables exist');
        return true;
      } else {
        console.warn('⚠️ Missing required tables');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to check tables:', error.message);
      return false;
    }
  }

  // Insert a new message (user message + bot response in same row)
  async insertMessage(messageData) {
    const query = `
      INSERT INTO chat_messages_v2
        (session_id, message_id, user_message, bot_response, intent, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (message_id) DO UPDATE
      SET bot_response = EXCLUDED.bot_response,
          metadata = EXCLUDED.metadata
      RETURNING id
    `;

    const values = [
      messageData.session_id,
      messageData.message_id,
      messageData.user_message,
      messageData.bot_response || null,
      messageData.intent || null,
      messageData.metadata || {}
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Failed to insert message:', error.message);
      throw error;
    }
  }

  // Update bot response for existing message
  async updateBotResponse(messageId, botResponse) {
    const query = `
      UPDATE chat_messages_v2
      SET bot_response = $1,
          metadata = metadata || '{"bot_response_updated": true}'::jsonb
      WHERE message_id = $2
      RETURNING id
    `;

    try {
      const result = await this.pool.query(query, [botResponse, messageId]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      console.error('❌ Failed to update bot response:', error.message);
      throw error;
    }
  }

  // Get all sessions with their latest messages
  async getSessions(limit = 100) {
    const query = `
      WITH latest_messages AS (
        SELECT DISTINCT ON (cm.session_id)
          cm.session_id,
          cm.user_message,
          cm.bot_response,
          cm.timestamp,
          cs.phone_number,
          cs.user_name,
          cs.status
        FROM chat_messages_v2 cm
        JOIN chat_sessions_v2 cs ON cm.session_id = cs.id
        ORDER BY cm.session_id, cm.timestamp DESC
      ),
      message_counts AS (
        SELECT
          session_id,
          COUNT(*) as message_count
        FROM chat_messages_v2
        GROUP BY session_id
      )
      SELECT
        lm.session_id,
        lm.phone_number as user_id,
        lm.user_name,
        COALESCE(lm.bot_response, lm.user_message) as last_message,
        EXTRACT(EPOCH FROM lm.timestamp) * 1000 as last_timestamp,
        mc.message_count,
        lm.status
      FROM latest_messages lm
      LEFT JOIN message_counts mc ON lm.session_id = mc.session_id
      ORDER BY lm.timestamp DESC
      LIMIT $1
    `;

    try {
      const result = await this.pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get sessions:', error.message);
      throw error;
    }
  }

  // Get messages for a specific session
  async getSessionMessages(sessionId, limit = 1000, offset = 0) {
    const query = `
      SELECT
        cm.id,
        cm.session_id,
        cm.message_id,
        cm.user_message,
        cm.bot_response,
        cm.intent,
        EXTRACT(EPOCH FROM cm.timestamp) * 1000 as timestamp,
        cm.metadata,
        cs.phone_number as user_id,
        cs.user_name
      FROM chat_messages_v2 cm
      JOIN chat_sessions_v2 cs ON cm.session_id = cs.id
      WHERE cm.session_id = $1
      ORDER BY cm.timestamp ASC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.pool.query(query, [sessionId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get messages:', error.message);
      throw error;
    }
  }

  // Get session info by phone number
  async getSessionByPhone(phoneNumber) {
    const query = `
      SELECT
        id as session_id,
        phone_number as user_id,
        user_name,
        status,
        created_at
      FROM chat_sessions_v2
      WHERE phone_number = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [phoneNumber]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Failed to get session by phone:', error.message);
      throw error;
    }
  }

  // Get recent messages (for initial load)
  async getRecentMessages(days = 7) {
    const query = `
      SELECT
        cm.id,
        cm.session_id,
        cm.message_id,
        cm.user_message,
        cm.bot_response,
        cm.intent,
        EXTRACT(EPOCH FROM cm.timestamp) * 1000 as timestamp,
        cm.metadata,
        cs.phone_number as user_id,
        cs.user_name
      FROM chat_messages_v2 cm
      JOIN chat_sessions_v2 cs ON cm.session_id = cs.id
      WHERE cm.timestamp >= NOW() - INTERVAL '${days} days'
      ORDER BY cm.timestamp ASC
    `;

    try {
      const result = await this.pool.query(query);
      console.log(`📥 Loaded ${result.rows.length} messages from last ${days} days`);
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
        cm.id,
        cm.session_id,
        cm.message_id,
        cm.user_message,
        cm.bot_response,
        cm.intent,
        EXTRACT(EPOCH FROM cm.timestamp) * 1000 as timestamp,
        cm.metadata,
        cs.phone_number as user_id,
        cs.user_name
      FROM chat_messages_v2 cm
      JOIN chat_sessions_v2 cs ON cm.session_id = cs.id
      WHERE EXTRACT(EPOCH FROM cm.timestamp) * 1000 > $1
      ORDER BY cm.timestamp ASC
    `;

    try {
      const result = await this.pool.query(query, [timestamp]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to sync messages:', error.message);
      throw error;
    }
  }

  // Search sessions by user name or phone number
  async searchSessions(searchTerm) {
    const query = `
      SELECT DISTINCT
        cs.id as session_id,
        cs.phone_number as user_id,
        cs.user_name
      FROM chat_sessions_v2 cs
      LEFT JOIN chat_messages_v2 cm ON cs.id = cm.session_id
      WHERE
        cs.user_name ILIKE $1 OR
        cs.phone_number ILIKE $1 OR
        cm.user_message ILIKE $1 OR
        cm.bot_response ILIKE $1
      ORDER BY cs.created_at DESC
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
        COUNT(DISTINCT cm.session_id) as total_sessions,
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE cm.user_message IS NOT NULL AND cm.user_message != '') as user_messages,
        COUNT(*) FILTER (WHERE cm.bot_response IS NOT NULL AND cm.bot_response != '') as bot_messages,
        COUNT(*) FILTER (WHERE cm.timestamp >= NOW() - INTERVAL '24 hours') as messages_24h,
        COUNT(DISTINCT cm.session_id) FILTER (WHERE cm.timestamp >= NOW() - INTERVAL '24 hours') as active_sessions_24h,
        COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'active') as active_sessions
      FROM chat_messages_v2 cm
      JOIN chat_sessions_v2 cs ON cm.session_id = cs.id
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
