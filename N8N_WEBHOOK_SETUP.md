# n8n Webhook Configuration for Existing Schema

## Your Database Schema

Your existing `chat_messages_v2` table stores:
- **One row** per message exchange (user message + bot response together)
- Linked to `chat_sessions_v2` via `session_id`
- Fields: `session_id`, `message_id`, `user_message`, `bot_response`, `intent`, `timestamp`, `metadata`

---

## n8n Workflow Nodes

### Node 1: Webhook Trigger (WhatsApp Message)
Standard WhatsApp webhook - no changes needed.

### Node 2: Get/Create Session

Before sending messages, ensure session exists in `chat_sessions_v2`:

**Check if session exists:**
```sql
SELECT id, phone_number, user_name, status
FROM chat_sessions_v2
WHERE phone_number = $1
LIMIT 1
```

**If not exists, create:**
```sql
INSERT INTO chat_sessions_v2 (phone_number, user_name, status)
VALUES ($1, $2, 'active')
RETURNING id
```

### Node 3: Call Infinitix AI
Your existing OpenAI/LLM integration - no changes needed.

### Node 4: Store in PostgreSQL

**Insert user message + bot response:**
```sql
INSERT INTO chat_messages_v2
  (session_id, message_id, user_message, bot_response, intent, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (message_id) DO UPDATE
SET bot_response = EXCLUDED.bot_response,
    metadata = EXCLUDED.metadata
RETURNING id
```

**Parameters:**
- `$1` = session_id (from Node 2)
- `$2` = message_id (generate unique ID, e.g., `msg_{{$now}}_{{phone_number}}`)
- `$3` = user_message (from WhatsApp)
- `$4` = bot_response (from AI)
- `$5` = intent (optional)
- `$6` = metadata (JSON object)

### Node 5a: Send User Message Webhook

**URL:** `https://your-app.railway.app/webhook/user-message`

**Method:** POST

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "your-webhook-secret"
}
```

**Body:**
```json
{
  "phone_number": "{{$json.phone_number}}",
  "user_name": "{{$json.user_name}}",
  "message": "{{$json.user_message}}",
  "message_id": "{{$json.message_id}}",
  "session_id": {{$json.session_id}}
}
```

**Required Fields:**
- `phone_number` - User's phone number (used as conversation ID)
- `message` - User's message text
- `session_id` - Database session ID from chat_sessions_v2

**Optional Fields:**
- `user_name` - User's name
- `message_id` - Unique message ID (auto-generated if not provided)

### Node 5b: Send Bot Response Webhook

**URL:** `https://your-app.railway.app/webhook/bot-response`

**Method:** POST

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "your-webhook-secret"
}
```

**Body:**
```json
{
  "message": "{{$json.bot_response}}",
  "message_id": "{{$json.message_id}}"
}
```

**Required Fields:**
- `message_id` - Same message_id from user message webhook (links to existing row)
- `message` - Bot's response text

**Note:** `phone_number` is NOT needed - it's looked up from the database using `message_id`

---

## Workflow Flow

```
1. WhatsApp Message Received
   ↓
2. Get/Create Session in chat_sessions_v2
   ↓ (session_id)
3. Call Infinitix AI
   ↓ (bot_response)
4. Store in chat_messages_v2
   ↓
5a. POST /webhook/user-message
    (phone_number, message, session_id, message_id)
   ↓
5b. POST /webhook/bot-response
    (message_id, message)
```

---

## Important Notes

### 1. Session Management
- Sessions MUST exist in `chat_sessions_v2` before sending webhooks
- Use phone_number to find or create sessions
- session_id is required for user message webhook

### 2. Message ID
- Must be unique for each message pair
- Recommended format: `msg_{timestamp}_{phone_number}`
- Used to link user message with bot response
- Same message_id is used for both webhooks

### 3. Database Row Structure
```
One row = One complete conversation exchange

| session_id | message_id    | user_message      | bot_response          |
|------------|---------------|-------------------|-----------------------|
| 1          | msg_123_5551  | "Hello"           | "Hi! How can I help?" |
| 1          | msg_124_5551  | "I need help"     | "Sure, what with?"    |
```

### 4. Webhook Order
- Send **user message webhook** first (creates/updates row)
- Then send **bot response webhook** (updates same row)
- Both webhooks broadcast to dashboard via WebSocket

---

## Testing Webhooks

### Test User Message
```bash
curl -X POST https://your-app.railway.app/webhook/user-message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret" \
  -d '{
    "phone_number": "34612345678",
    "user_name": "Test User",
    "message": "Hello, test message",
    "message_id": "msg_test_123",
    "session_id": 1
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User message received",
  "message_id": "msg_test_123"
}
```

### Test Bot Response
```bash
curl -X POST https://your-app.railway.app/webhook/bot-response \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret" \
  -d '{
    "message": "Hello! How can I help you?",
    "message_id": "msg_test_123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Bot response received"
}
```

---

## Dashboard Display

The control panel will:
1. Load all existing messages from `chat_messages_v2`
2. Show conversations grouped by phone_number
3. Display user messages and bot responses as separate bubbles
4. Update in real-time when webhooks are received
5. Sync with database every 30 seconds

---

## Troubleshooting

### Error: "No session found for phone number"
**Solution:** Create session in `chat_sessions_v2` first (Node 2)

### Error: "Missing required fields"
**Solution:** Ensure phone_number, message, and session_id are provided

### Messages not appearing
**Solution:**
- Check Railway logs for errors
- Verify `DATABASE_URL` is correct
- Ensure tables exist in database
- Test webhooks with curl

### Duplicate messages
**Solution:** Use unique message_id for each exchange

---

## Environment Variables

Set these in Railway:
```bash
MODE=production
DATABASE_URL=postgresql://railway:password@postgres.railway.internal:5432/railway
WEBHOOK_SECRET=your-random-secret-key
SYNC_INTERVAL=30000
INITIAL_LOAD_DAYS=7
```

---

## Next Steps

1. ✅ Update n8n workflow with correct webhook body format
2. ✅ Ensure session management is in place
3. ✅ Set WEBHOOK_SECRET in both Railway and n8n
4. ✅ Test webhooks
5. ✅ Monitor Railway logs
6. ✅ Check dashboard for real-time updates
