# 🚀 Production Deployment Guide

## Quick Start (5 Minutes)

### Step 1: Add PostgreSQL to Railway

1. Go to your Railway project
2. Click **"New"** → **"Database"** → **"PostgreSQL"**
3. Wait for deployment (~30 seconds)
4. Railway automatically creates `DATABASE_URL` variable

### Step 2: Configure Environment Variables

In Railway project settings, add these variables:

```bash
# Required
MODE=production
WEBHOOK_SECRET=<generate-with-openssl-rand-hex-32>

# Optional (if you want to customize)
SYNC_INTERVAL=30000
INITIAL_LOAD_DAYS=7
```

**Generate WEBHOOK_SECRET:**
```bash
openssl rand -hex 32
# Example output: a7f8e3d2c1b4a9f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2
```

### Step 3: Deploy Code

```bash
git add .
git commit -m "Add production mode with PostgreSQL sync"
git push
```

Railway will automatically redeploy (takes ~2 minutes).

###Step 4: Configure n8n Workflow

See `PRODUCTION_SETUP.md` for detailed n8n node configuration.

**Quick n8n setup:**

1. **Node 1:** Webhook Trigger (receive WhatsApp message)
2. **Node 2:** Call your AI/Infinitix API
3. **Node 3:** Store in PostgreSQL (chat_messages_v2 table)
4. **Node 4a:** POST to `https://your-app.railway.app/webhook/user-message`
5. **Node 4b:** POST to `https://your-app.railway.app/webhook/bot-response`

---

## Testing

### 1. Test User Message Webhook

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

Expected response:
```json
{"success": true, "message": "User message received"}
```

### 2. Test Bot Response Webhook

```bash
curl -X POST https://your-app.railway.app/webhook/bot-response \
  -H "Content-Type: application/json" \
  -H "X-API-Key": your-webhook-secret" \
  -d '{
    "user_id": "34612345678",
    "conversation_id": "34612345678",
    "message": "Hello! How can I help you?",
    "timestamp": 1699534832000
  }'
```

### 3. Check Health

```bash
curl https://your-app.railway.app/health
```

### 4. View Logs

In Railway:
- Go to your service
- Click "Deployments"
- Click latest deployment
- Check logs for:
  - `✅ PostgreSQL connected successfully`
  - `✅ Database table initialized`
  - `🔥 PRODUCTION MODE ACTIVE`

---

## Database Schema

The table `chat_messages_v2` will be created automatically with this schema:

```sql
CREATE TABLE chat_messages_v2 (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255),
  message_type VARCHAR(10) NOT NULL, -- 'user' or 'bot'
  message TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**To verify table exists:**

In Railway PostgreSQL service:
1. Click "Data" tab
2. Run query: `SELECT * FROM chat_messages_v2 LIMIT 10;`

---

## Troubleshooting

### Issue: "Database connection failed"

**Solution:**
- Check Railway PostgreSQL service is running
- Verify `DATABASE_URL` variable exists
- Check logs for connection error details

### Issue: "Unauthorized: Invalid API key"

**Solution:**
- Verify `WEBHOOK_SECRET` matches in both:
  - Railway environment variables
  - n8n webhook node headers (`X-API-Key`)

### Issue: "No messages appearing in dashboard"

**Solution:**
1. Check webhook endpoints return `{"success": true}`
2. Open browser console, look for WebSocket messages
3. Check Railway logs for errors
4. Verify database has messages: `SELECT COUNT(*) FROM chat_messages_v2;`

### Issue: "Historical messages not loading"

**Solution:**
- Check `INITIAL_LOAD_DAYS` environment variable
- Verify database has historical data
- Check logs for: `📥 Loaded X historical messages`

---

## Features Enabled

### ✅ Real-time Monitoring
- Live WebSocket updates when messages arrive
- No page refresh needed

### ✅ Historical Messages
- Loads last 7 days on startup (configurable)
- All messages stored permanently in PostgreSQL

### ✅ Auto-Sync
- Syncs with database every 30 seconds
- Catches messages even if webhook fails

### ✅ Search & Filter
- Search conversations by user name
- Search message content
- Filter by date range

---

## Monitoring

### Check Statistics

```bash
curl https://your-app.railway.app/api/production/stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "total_conversations": 45,
    "total_messages": 523,
    "user_messages": 261,
    "bot_messages": 262,
    "messages_24h": 89,
    "active_conversations_24h": 12
  }
}
```

### Manual Sync

```bash
curl -X POST https://your-app.railway.app/api/production/sync
```

---

## Switching Between Demo and Production

### Demo Mode (for testing)
```bash
MODE=demo
```

### Production Mode (real data)
```bash
MODE=production
```

### Hybrid Mode (both)
```bash
MODE=hybrid
```

Redeploy after changing MODE.

---

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Configure environment variables
3. ✅ Set up n8n workflow
4. ✅ Test webhooks
5. ⏭️ Monitor logs and dashboard
6. ⏭️ Customize UI (optional)
7. ⏭️ Add analytics (optional)

---

## Support

For detailed technical documentation, see:
- `PRODUCTION_SETUP.md` - Full architecture and API docs
- `README.md` - General project information
- Railway logs - Real-time debugging

---

**You're ready to go! 🎉**

Visit your Railway app URL to see the live dashboard.
