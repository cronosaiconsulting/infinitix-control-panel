# Webhook Fields - Complete Specification & Call Stack

## 📋 EXACT Fields Required

### Webhook 1: User Message

**URL:** `POST /webhook/user-message`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "<your-webhook-secret>"
}
```

**Body Fields:**
```json
{
  "session_id": 123,                    // REQUIRED - INTEGER
  "message": "Hello",                   // REQUIRED - STRING
  "message_id": "msg_1699534829000",   // OPTIONAL - STRING (auto-generated if missing)
  "user_id": "usr_12345",              // OPTIONAL - STRING (empty string "" if not provided)
  "full_name": "María García López"    // OPTIONAL - STRING (empty string "" if not provided)
}
```

**Field Requirements:**
- ✅ `session_id` - **REQUIRED** - Must exist in `chat_sessions_v2.id`
- ✅ `message` - **REQUIRED** - The user's message text
- ⚠️ `message_id` - **OPTIONAL** - Generated as `msg_{timestamp}_{session_id}` if not provided
- ⚠️ `user_id` - **OPTIONAL** - External user identifier for conversation grouping
- ⚠️ `full_name` - **OPTIONAL** - Display name for the conversation

---

### Webhook 2: Bot Response

**URL:** `POST /webhook/bot-response`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "<your-webhook-secret>"
}
```

**Body Fields:**
```json
{
  "message_id": "msg_1699534829000",   // REQUIRED - STRING (must match user message)
  "message": "Hello! How can I help?", // REQUIRED - STRING
  "user_id": "usr_12345",              // OPTIONAL - STRING
  "full_name": "María García López"    // OPTIONAL - STRING
}
```

**Field Requirements:**
- ✅ `message_id` - **REQUIRED** - Must match the message_id from user message webhook
- ✅ `message` - **REQUIRED** - The bot's response text
- ⚠️ `user_id` - **OPTIONAL** - Updates metadata if provided (can override user message value)
- ⚠️ `full_name` - **OPTIONAL** - Updates metadata if provided (can override user message value)

---

## 🔍 Complete Call Stack Trace

### WEBHOOK 1: User Message Call Stack

```javascript
POST /webhook/user-message
│
├─ 1. EXTRACT FIELDS (Line 305)
│     const { message, message_id, session_id, user_id, full_name } = req.body;
│     • message: REQUIRED ✓
│     • message_id: OPTIONAL (can be undefined)
│     • session_id: REQUIRED ✓
│     • user_id: OPTIONAL (can be undefined)
│     • full_name: OPTIONAL (can be undefined)
│
├─ 2. VALIDATE REQUIRED (Line 310)
│     if (!session_id || !message) → 400 Error
│
├─ 3. LOOKUP SESSION (Line 327)
│     SELECT phone_number, user_name FROM chat_sessions_v2 WHERE id = session_id
│     • If not found → 404 Error: "Session not found"
│     • Returns: phone_number, user_name
│
├─ 4. GENERATE message_id IF MISSING (Line 341)
│     const finalMessageId = message_id || `msg_${Date.now()}_${session_id}`;
│     • Uses provided message_id OR generates new one
│     • Result: Always have a valid message_id
│
├─ 5. BUILD METADATA (Line 344)
│     const metadata = {
│       source: 'webhook',
│       user_id: user_id || '',           // Convert undefined → ''
│       full_name: full_name || '',       // Convert undefined → ''
│       session_info: {
│         session_id: session_id,
│         phone_number: phone_number
│       }
│     };
│
├─ 6. INSERT INTO DATABASE (Line 364)
│     database.insertMessage({
│       session_id: session_id,
│       message_id: finalMessageId,
│       user_message: message,
│       bot_response: null,              // NULL initially
│       intent: null,
│       metadata: metadata                // JSONB with user_id & full_name
│     })
│     ↓
│     SQL: INSERT INTO chat_messages_v2 (...) VALUES (...)
│     ON CONFLICT (message_id) DO UPDATE ...
│
├─ 7. DETERMINE CONVERSATION ID (Line 367)
│     const conversationId = user_id ? user_id : `session_${session_id}`;
│     • If user_id provided → conversationId = "usr_12345"
│     • If user_id empty → conversationId = "session_123"
│
├─ 8. PROCESS MESSAGE (Line 383)
│     processMessageFromDB(dbMessage)
│     ↓
│     ├─ Extract metadata.user_id and metadata.full_name
│     ├─ Check for conversation migration (session_XXX → user_id)
│     ├─ Create/update conversation with sessions array
│     ├─ Add message to conversation.messages
│     └─ Update display_name if full_name provided
│
├─ 9. BROADCAST TO FRONTEND (Line 388-403)
│     • Broadcast contact update
│     • Broadcast new message with conversation data
│
└─ 10. RETURN SUCCESS (Line 405)
      { success: true, message_id: finalMessageId }
```

---

### WEBHOOK 2: Bot Response Call Stack

```javascript
POST /webhook/bot-response
│
├─ 1. EXTRACT FIELDS (Line 418)
│     const { message, message_id, user_id, full_name } = req.body;
│     • message: REQUIRED ✓
│     • message_id: REQUIRED ✓
│     • user_id: OPTIONAL (can be undefined)
│     • full_name: OPTIONAL (can be undefined)
│
├─ 2. VALIDATE REQUIRED (Line 423)
│     if (!message_id || !message) → 400 Error
│
├─ 3. FETCH EXISTING MESSAGE (Line 445)
│     SELECT cm.*, cs.phone_number, cs.user_name
│     FROM chat_messages_v2 cm
│     JOIN chat_sessions_v2 cs ON cm.session_id = cs.id
│     WHERE cm.message_id = $1
│     • If not found → 404 Error: "Message not found. Send user message first."
│     • Returns: session_id, user_message, metadata, phone_number, user_name
│
├─ 4. MERGE METADATA (Line 455-463)
│     const existingMetadata = dbRow.metadata || {};
│     const updatedMetadata = {
│       ...existingMetadata,             // Keep existing fields
│       user_id: user_id || existingMetadata.user_id || '',
│       full_name: full_name || existingMetadata.full_name || '',
│       bot_response_updated: true
│     };
│     • Priority: webhook field > existing metadata > empty string
│     • Preserves session_info and other metadata fields
│
├─ 5. UPDATE DATABASE (Line 474)
│     UPDATE chat_messages_v2
│     SET bot_response = $1,
│         metadata = $2
│     WHERE message_id = $3
│     • Updates the SAME ROW created by user message webhook
│     • Metadata now contains both user_id and full_name
│
├─ 6. DETERMINE CONVERSATION ID (Line 484-485)
│     const customUserId = updatedMetadata.user_id || '';
│     const conversationId = customUserId ? customUserId : `session_${dbRow.session_id}`;
│     • Uses updated metadata (might be different from user message if user_id provided here)
│
├─ 7. PROCESS MESSAGE (Line 501)
│     processMessageFromDB(dbMessage)
│     ↓
│     ├─ Extract metadata.user_id and metadata.full_name
│     ├─ Check for conversation migration (if user_id changed)
│     ├─ Update conversation with bot response
│     ├─ Add bot message to conversation.messages
│     └─ Update display_name if full_name provided
│
├─ 8. BROADCAST TO FRONTEND (Line 505-521)
│     • Broadcast bot contact update
│     • Broadcast bot message with conversation data
│
└─ 9. RETURN SUCCESS (Line 523)
      { success: true, message: 'Bot response received' }
```

---

## ✅ Verification: Field Handling

### ✓ REQUIRED Fields Handled Correctly

**User Message:**
- `session_id` - Validated (line 310), used for DB lookup
- `message` - Validated (line 310), stored as user_message

**Bot Response:**
- `message_id` - Validated (line 423), used to find existing row
- `message` - Validated (line 423), stored as bot_response

### ✓ OPTIONAL Fields Handled Correctly

**message_id (user message only):**
- If provided: Used directly (line 341)
- If missing: Auto-generated as `msg_{timestamp}_{session_id}` (line 341)
- Always returned in response for use in bot webhook

**user_id (both webhooks):**
- If provided: Stored in metadata, used for conversation grouping
- If missing: Defaults to empty string `''` (lines 346, 460)
- Conversation ID logic: `user_id ? user_id : "session_" + session_id` (lines 367, 485)

**full_name (both webhooks):**
- If provided: Stored in metadata, updates display_name
- If missing: Defaults to empty string `''` (lines 347, 461)
- Display name priority: full_name > user_name > phone_number > session_id

---

## 🔄 Complete Message Flow Example

### Example 1: Message without user_id

```javascript
// STEP 1: User message webhook
POST /webhook/user-message
{
  "session_id": 123,
  "message": "Hello"
  // message_id not provided → auto-generated
  // user_id not provided → defaults to ''
  // full_name not provided → defaults to ''
}

→ Database row created:
{
  session_id: 123,
  message_id: "msg_1699534829000_123",  // Auto-generated
  user_message: "Hello",
  bot_response: NULL,
  metadata: {
    source: "webhook",
    user_id: "",                         // Empty
    full_name: "",                       // Empty
    session_info: { session_id: 123, phone_number: "34612345678" }
  }
}

→ Conversation created: "session_123"
→ Response: { success: true, message_id: "msg_1699534829000_123" }


// STEP 2: Bot response webhook (using returned message_id)
POST /webhook/bot-response
{
  "message_id": "msg_1699534829000_123",  // From step 1 response
  "message": "Hi! How can I help?"
}

→ Database row updated:
{
  session_id: 123,
  message_id: "msg_1699534829000_123",
  user_message: "Hello",
  bot_response: "Hi! How can I help?",  // Now filled
  metadata: {
    source: "webhook",
    user_id: "",                         // Still empty
    full_name: "",                       // Still empty
    session_info: { session_id: 123, phone_number: "34612345678" },
    bot_response_updated: true           // Added
  }
}

→ Conversation: "session_123" (unchanged)
→ Response: { success: true }
```

---

### Example 2: Message WITH user_id (conversation grouping)

```javascript
// STEP 1: User message webhook
POST /webhook/user-message
{
  "session_id": 123,
  "message": "Hello",
  "message_id": "msg_custom_001",       // Provided explicitly
  "user_id": "usr_12345",               // User identified!
  "full_name": "María García López"     // With name
}

→ Database row created:
{
  session_id: 123,
  message_id: "msg_custom_001",
  user_message: "Hello",
  bot_response: NULL,
  metadata: {
    source: "webhook",
    user_id: "usr_12345",                // Stored
    full_name: "María García López",     // Stored
    session_info: { session_id: 123, phone_number: "34612345678" }
  }
}

→ Conversation created: "usr_12345" (not "session_123"!)
→ Display name: "María García López"
→ Response: { success: true, message_id: "msg_custom_001" }


// STEP 2: Bot response webhook
POST /webhook/bot-response
{
  "message_id": "msg_custom_001",
  "message": "Hi María! How can I help?"
}

→ Database row updated:
{
  session_id: 123,
  message_id: "msg_custom_001",
  user_message: "Hello",
  bot_response: "Hi María! How can I help?",
  metadata: {
    source: "webhook",
    user_id: "usr_12345",                // Preserved
    full_name: "María García López",     // Preserved
    session_info: { session_id: 123, phone_number: "34612345678" },
    bot_response_updated: true
  }
}

→ Conversation: "usr_12345" (unchanged)
→ Display name: "María García López" (unchanged)
→ Response: { success: true }
```

---

### Example 3: User identification AFTER anonymous conversation

```javascript
// MESSAGE 1: Anonymous
POST /webhook/user-message
{ "session_id": 123, "message": "Hello" }
→ Conversation: "session_123"

POST /webhook/bot-response
{ "message_id": "msg_1699534829000_123", "message": "Hi!" }
→ Conversation: "session_123"


// MESSAGE 2: User now identified
POST /webhook/user-message
{
  "session_id": 123,
  "message": "My name is María",
  "user_id": "usr_12345",
  "full_name": "María García"
}

→ MIGRATION TRIGGERED!
   • Finds existing conversation "session_123"
   • Creates new conversation "usr_12345"
   • Moves ALL messages from "session_123" to "usr_12345"
   • Deletes "session_123"
   • All future messages use "usr_12345"

→ Conversation: "usr_12345" (migrated)
→ Display name: "María García"

POST /webhook/bot-response
{
  "message_id": "msg_1699534829001_123",
  "message": "Nice to meet you, María!"
}
→ Conversation: "usr_12345" (continues using user conversation)
```

---

## 🎯 Summary: What You Need to Pass

### Minimum Required (Works without user identification):
```json
// User message
{
  "session_id": 123,
  "message": "Hello"
}

// Bot response
{
  "message_id": "msg_1699534829000_123",  // From user message response
  "message": "Hi!"
}
```

### Recommended (With user identification):
```json
// User message
{
  "session_id": 123,
  "message": "Hello",
  "message_id": "msg_custom_001",         // Your own ID
  "user_id": "usr_12345",                 // Group sessions
  "full_name": "María García López"       // Nice display name
}

// Bot response
{
  "message_id": "msg_custom_001",         // Same as above
  "message": "Hi!",
  "user_id": "usr_12345",                 // Optional, for consistency
  "full_name": "María García López"       // Optional, can update name
}
```

---

## ⚠️ Important Notes

1. **message_id Generation:**
   - If you DON'T provide `message_id` in user message webhook, save the returned `message_id` from the response
   - Use that EXACT `message_id` in the bot response webhook

2. **Session Must Exist:**
   - Before calling user message webhook, ensure session exists in `chat_sessions_v2`
   - The webhook will return 404 if session_id doesn't exist

3. **Webhook Order:**
   - ALWAYS call user message webhook FIRST
   - Bot response webhook will fail if message_id doesn't exist

4. **Optional Fields:**
   - All optional fields can be omitted entirely from JSON
   - Or pass `null` / `""` (empty string) - both treated as "not provided"
   - Do NOT pass `undefined` (invalid JSON)

5. **Metadata Priority:**
   - Bot response webhook can override user_id/full_name from user message
   - Latest value wins: bot webhook > user webhook > existing metadata > ""
