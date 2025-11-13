# Infinitix Control Panel - Production Setup Guide

## Overview
Transform the demo into a production monitoring system that:
- Receives real-time messages from n8n workflow
- Stores and syncs with PostgreSQL database (chat_messages_v2)
- Displays historical and live conversations
- Provides real-time monitoring dashboard

---

## Architecture

```
┌─────────────────┐
│  WhatsApp User  │
└────────┬────────┘
         │ Message
         ▼
┌─────────────────────────┐
│   n8n Workflow          │
│  ┌──────────────────┐   │
│  │ 1. Receive Msg   │   │
│  │ 2. Call Infinitix│   │
│  │    AI (OpenAI)   │   │
│  │ 3. Store in DB   │   │
│  │ 4. Send Webhooks │◄──┼── Two webhooks to Control Panel
│  └──────────────────┘   │
└─────────────────────────┘
         │
         │ Webhooks (2)
         ▼
┌─────────────────────────────────────┐
│  Infinitix Control Panel (Railway)  │
│  ┌──────────────────────────────┐   │
│  │  POST /webhook/user-message  │   │
│  │  POST /webhook/bot-response  │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   WebSocket Broadcasting     │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  PostgreSQL Sync             │   │
│  │  - Load historical messages  │   │
│  │  - Periodic sync             │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
         │
         │ WebSocket
         ▼
┌─────────────────┐
│   Dashboard UI  │
└─────────────────┘
```

---

## n8n Workflow Configuration

### Node 1: Webhook Trigger (WhatsApp Message Received)
**Type:** Webhook
- Method: POST
- Path: `infinitix-webhook` (or your preferred path)
- Response Code: 200

**Expected Payload:**
```json
{
  "user_id": "34612345678",
  "user_name": "María García",
  "message": "Hola, necesito ayuda con mi pedido",
  "timestamp": 1699534829000,
  "conversation_id": "34612345678"
}
```

---

### Node 2: Call Infinitix AI (OpenAI/Your LLM)
**Type:** HTTP Request / OpenAI / Custom Function

**Input:** User message from Node 1
**Output:** AI-generated response

Example:
```json
{
  "user_message": "Hola, necesito ayuda con mi pedido",
  "bot_response": "¡Hola María! Claro, estaré encantado de ayudarte. ¿Cuál es tu número de pedido?",
  "timestamp": 1699534832000
}
```

---

### Node 3: Store in PostgreSQL (chat_messages_v2)
**Type:** PostgreSQL
**Operation:** Insert

**Table:** `chat_messages_v2`

**Expected Schema:**
```sql
CREATE TABLE chat_messages_v2 (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  message_type VARCHAR(10) NOT NULL, -- 'user' or 'bot'
  message TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_timestamp (timestamp)
);
```

**Insert Query:**
```sql
-- User message
INSERT INTO chat_messages_v2 (conversation_id, user_id, user_name, message_type, message, timestamp)
VALUES ($1, $2, $3, 'user', $4, $5);

-- Bot response
INSERT INTO chat_messages_v2 (conversation_id, user_id, user_name, message_type, message, timestamp)
VALUES ($1, $2, $3, 'bot', $4, $5);
```

---

### Node 4a: Send User Message Webhook
**Type:** HTTP Request
**Method:** POST
**URL:** `https://your-railway-app.railway.app/webhook/user-message`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "${WEBHOOK_SECRET}"
}
```

**Body:**
```json
{
  "user_id": "{{$node['Webhook'].json.user_id}}",
  "user_name": "{{$node['Webhook'].json.user_name}}",
  "message": "{{$node['Webhook'].json.message}}",
  "timestamp": "{{$node['Webhook'].json.timestamp}}",
  "conversation_id": "{{$node['Webhook'].json.conversation_id}}"
}
```

---

### Node 4b: Send Bot Response Webhook
**Type:** HTTP Request
**Method:** POST
**URL:** `https://your-railway-app.railway.app/webhook/bot-response`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "${WEBHOOK_SECRET}"
}
```

**Body:**
```json
{
  "user_id": "{{$node['Webhook'].json.user_id}}",
  "conversation_id": "{{$node['Webhook'].json.conversation_id}}",
  "message": "{{$node['AI Response'].json.response}}",
  "timestamp": "{{Date.now()}}"
}
```

---

## Environment Variables (Railway)

Add these to your Railway project:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# PostgreSQL Database (same Railway project)
DATABASE_URL=postgresql://user:password@host:5432/database
# OR separate components:
DB_HOST=postgres.railway.internal
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=<your-password>

# Security
WEBHOOK_SECRET=<generate-random-secret>
# Generate with: openssl rand -hex 32

# Optional: Message Sync
SYNC_INTERVAL=30000  # Sync every 30 seconds
INITIAL_LOAD_DAYS=7  # Load last 7 days on startup
```

---

## Database Setup

### Option 1: Use Railway's PostgreSQL Plugin
1. Go to your Railway project
2. Click "New" → "Database" → "PostgreSQL"
3. Railway automatically creates `DATABASE_URL`
4. Use internal hostname: `postgres.railway.internal`

### Option 2: Connect to Existing Database
If your PostgreSQL is already in Railway:
1. Get connection details from the database service
2. Use private network: `<service-name>.railway.internal:5432`

### Create Table (if not exists)
```sql
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
```

---

## API Endpoints

### Production Endpoints

#### 1. POST `/webhook/user-message`
Receive user message from n8n

**Request:**
```json
{
  "user_id": "34612345678",
  "user_name": "María García",
  "message": "Hola, necesito ayuda",
  "timestamp": 1699534829000,
  "conversation_id": "34612345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User message received"
}
```

---

#### 2. POST `/webhook/bot-response`
Receive bot response from n8n

**Request:**
```json
{
  "user_id": "34612345678",
  "conversation_id": "34612345678",
  "message": "¡Hola María! ¿En qué puedo ayudarte?",
  "timestamp": 1699534832000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bot response received"
}
```

---

#### 3. GET `/api/conversations`
Get all conversations

**Response:**
```json
{
  "conversations": [
    {
      "conversation_id": "34612345678",
      "user_id": "34612345678",
      "user_name": "María García",
      "last_message": "¿En qué puedo ayudarte?",
      "last_timestamp": 1699534832000,
      "unread": 0,
      "message_count": 12
    }
  ]
}
```

---

#### 4. GET `/api/conversations/:id/messages`
Get messages for a conversation

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "user_id": "34612345678",
      "message": "Hola, necesito ayuda",
      "message_type": "user",
      "timestamp": 1699534829000
    },
    {
      "id": 2,
      "user_id": "0",
      "message": "¡Hola María! ¿En qué puedo ayudarte?",
      "message_type": "bot",
      "timestamp": 1699534832000
    }
  ]
}
```

---

#### 5. POST `/api/sync-database`
Manually trigger database sync

**Response:**
```json
{
  "success": true,
  "synced_messages": 45,
  "synced_conversations": 8
}
```

---

## Features

### ✅ Real-time Message Monitoring
- Live WebSocket updates
- New messages appear instantly
- Conversation list auto-updates

### ✅ Historical Message Loading
- Load last 7 days on startup
- Infinite scroll for older messages
- Search and filter conversations

### ✅ Database Synchronization
- Periodic sync every 30 seconds
- Manual sync button
- Conflict resolution

### ✅ Production Features
- Webhook authentication (X-API-Key header)
- Error handling and logging
- Connection pooling
- Graceful shutdown

---

## Deployment Checklist

- [ ] Add PostgreSQL database to Railway project
- [ ] Set environment variables in Railway
- [ ] Run database migration (create table)
- [ ] Update n8n workflow with webhook URLs
- [ ] Configure WEBHOOK_SECRET in both n8n and Railway
- [ ] Test webhook endpoints
- [ ] Verify database sync
- [ ] Monitor logs for errors

---

## Testing

### Test User Message Webhook
```bash
curl -X POST https://your-app.railway.app/webhook/user-message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-webhook-secret" \
  -d '{
    "user_id": "34612345678",
    "user_name": "Test User",
    "message": "Hello from test",
    "timestamp": 1699534829000,
    "conversation_id": "34612345678"
  }'
```

### Test Bot Response Webhook
```bash
curl -X POST https://your-app.railway.app/webhook/bot-response \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-webhook-secret" \
  -d '{
    "user_id": "34612345678",
    "conversation_id": "34612345678",
    "message": "Hello! How can I help you?",
    "timestamp": 1699534832000
  }'
```

---

## Migration Path

### Phase 1: Keep Demo + Add Production Mode
- Add `/webhook/user-message` and `/webhook/bot-response` endpoints
- Keep existing `/api/start-demo` for testing
- Add environment variable `MODE=demo|production`

### Phase 2: Add Database Connection
- Add PostgreSQL connection pool
- Create sync service
- Load historical messages

### Phase 3: Full Production
- Remove demo code
- Optimize database queries
- Add monitoring and alerts
