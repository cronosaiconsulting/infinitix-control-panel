# Database Schema Analysis

## chat_messages_v2 Structure

```sql
CREATE TABLE IF NOT EXISTS public.chat_messages_v2
(
    id integer NOT NULL,
    session_id integer NOT NULL,               -- FK to chat_sessions_v2.id
    message_id character varying(255) NOT NULL UNIQUE,
    user_message text NOT NULL,
    bot_response text,
    intent character varying(100),
    timestamp timestamp without time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,       -- ✅ Available for custom data

    FOREIGN KEY (session_id) REFERENCES chat_sessions_v2 (id)
)
```

## chat_sessions_v2 Structure

```sql
CREATE TABLE chat_sessions_v2
(
    id integer NOT NULL,
    phone_number character varying,
    user_name character varying,
    status character varying,
    created_at timestamp
)
```

## Available Data Points

From tables:
- ✅ `session_id` - Always available
- ✅ `phone_number` - From chat_sessions_v2
- ✅ `user_name` - From chat_sessions_v2 (but might be empty)
- ✅ `metadata` (JSONB) - Can store custom data per message

From webhooks (to be added):
- ✅ `user_id` - External user identifier (optional, can be empty)
- ✅ `full_name` - User's full name (optional, updates conversation name)

## Conversation Identification Logic

### Priority System:
1. **If `user_id` is provided** (not empty):
   - `conversation_id = user_id`
   - Groups ALL sessions for this user into ONE conversation

2. **If `user_id` is empty**:
   - `conversation_id = "session_" + session_id`
   - Each session is a separate conversation

### Migration Logic:
When `user_id` becomes available for a session:
1. Find conversation with `conversation_id = "session_" + session_id`
2. Move all messages to conversation with `conversation_id = user_id`
3. Delete old session_XXX conversation
4. Mark session boundary in merged conversation

## Metadata Schema

Store in `chat_messages_v2.metadata`:
```json
{
  "user_id": "usr_12345" | "",
  "full_name": "María García López",
  "source": "webhook",
  "session_started": true | false,
  "session_info": {
    "session_id": 123,
    "phone_number": "34612345678"
  }
}
```

## Frontend Conversation Structure

```javascript
{
  id: "usr_12345" | "session_123",
  display_name: "María García López",  // Latest full_name received
  user_id: "usr_12345" | "",
  sessions: [
    {
      session_id: 123,
      started_at: 1699534829000,
      phone_number: "34612345678",
      message_count: 15
    },
    {
      session_id: 124,
      started_at: 1699620000000,
      phone_number: "34612345678",
      message_count: 8
    }
  ],
  messages: [
    // All messages from all sessions, sorted by timestamp
  ],
  lastMessage: "...",
  lastTimestamp: 1699625000000
}
```

## Session Banners

Display when `session_id` changes within a conversation:
```
┌─────────────────────────────────────┐
│  Session #123 Started               │
│  📅 Nov 9, 2023 10:30 AM            │
└─────────────────────────────────────┘
│  User: Hello                        │
│  Bot: Hi! How can I help?           │
│  ...                                │
┌─────────────────────────────────────┐
│  Session #124 Started               │
│  📅 Nov 10, 2023 14:15 PM           │
└─────────────────────────────────────┘
│  User: I need help again            │
│  Bot: Sure! What do you need?       │
```

## Info Panel Data

```javascript
{
  conversation_id: "usr_12345",
  display_name: "María García López",
  user_id: "usr_12345",

  current_session: {
    session_id: 124,
    phone_number: "34612345678",
    started_at: "2023-11-10 14:15:00",
    status: "active"
  },

  all_sessions: [
    { session_id: 123, started: "...", messages: 15 },
    { session_id: 124, started: "...", messages: 8 }
  ],

  statistics: {
    total_messages: 46,
    total_sessions: 2,
    first_contact: "2023-11-09 10:30:00",
    last_activity: "2023-11-10 15:45:00"
  }
}
```

## Webhook Updates

### User Message Webhook
```json
POST /webhook/user-message
{
  "session_id": 123,
  "message": "Hello",
  "message_id": "msg_123",
  "user_id": "usr_12345",      // NEW: Optional, can be ""
  "full_name": "María García"  // NEW: Optional, updates display name
}
```

### Bot Response Webhook
```json
POST /webhook/bot-response
{
  "message_id": "msg_123",
  "message": "Hi!",
  "user_id": "usr_12345",      // NEW: Optional for consistency
  "full_name": "María García"  // NEW: Optional
}
```

## Example Scenarios

### Scenario 1: User with ID from start
```
Message 1: session_id=123, user_id="usr_001", full_name="María"
→ Creates conversation "usr_001" named "María"

Message 2: session_id=123, user_id="usr_001", full_name="María García"
→ Updates name to "María García"

Message 3: session_id=124, user_id="usr_001", full_name="María García López"
→ Same conversation "usr_001", updates name to "María García López"
→ Shows "Session #124 Started" banner
```

### Scenario 2: Anonymous to identified
```
Message 1: session_id=123, user_id="", full_name=""
→ Creates conversation "session_123" named "Usuario 34612345678"

Message 2: session_id=123, user_id="", full_name="María"
→ Updates "session_123" name to "María"

Message 3: session_id=123, user_id="usr_001", full_name="María García"
→ Migrates "session_123" → "usr_001"
→ Updates name to "María García"
→ All previous messages now belong to "usr_001"
```

### Scenario 3: Multiple sessions, same user
```
Session 123: user_id="usr_001", messages 1-10
→ Conversation "usr_001"

Session 124: user_id="usr_001", messages 11-18
→ SAME conversation "usr_001"
→ Shows session banner before message 11

Session 125: user_id="usr_001", messages 19-25
→ SAME conversation "usr_001"
→ Shows session banner before message 19
```

## Database Queries Needed

### Get conversation with session grouping:
```sql
SELECT
  cm.id,
  cm.session_id,
  cm.message_id,
  cm.user_message,
  cm.bot_response,
  cm.timestamp,
  cm.metadata,
  cs.phone_number,
  cs.user_name,
  cs.created_at as session_created_at
FROM chat_messages_v2 cm
JOIN chat_sessions_v2 cs ON cm.session_id = cs.id
WHERE cm.metadata->>'user_id' = 'usr_001'
   OR cm.session_id IN (
     SELECT id FROM chat_sessions_v2 WHERE phone_number = '...'
   )
ORDER BY cm.timestamp ASC
```

### Mark session boundaries:
Look for changes in `session_id` within ordered messages.
