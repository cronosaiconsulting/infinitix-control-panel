# Infinitix Control Panel

Real-time WhatsApp conversation management system for Infinitix AI Chatbot.

## 🚀 Features

- **Real-time Dashboard**: Monitor all conversations in real-time using WebSockets
- **Interactive Demo**: Click "START DEMO" to simulate 10 realistic customer service conversations
- **Multi-conversation Management**: Handle multiple simultaneous chats efficiently
- **Spanish Customer Service**: Pre-loaded with realistic Spanish e-commerce scenarios
- **Webhook Integration**: Simulates WhatsApp webhook system
- **Beautiful UI**: Modern, responsive interface built with vanilla JavaScript

## 📋 Demo Scenarios

The demo simulates 10 different customer conversations with OCC Sport Plus, a Spanish auto accessories e-commerce:

1. **Seat Covers** - Polite customer inquiring about seat covers
2. **Delivery Status** - Impatient customer checking order status
3. **Product Compatibility** - Confused customer verifying product fit
4. **Price Inquiry** - Direct customer asking about ski racks
5. **Invoice Request** - Friendly customer requesting invoice
6. **Stock Availability** - Polite customer checking trunk organizer stock
7. **Return Policy** - Confused customer handling returns
8. **Bulk Order** - Direct customer placing large order
9. **Product Recommendation** - Friendly customer seeking gift ideas
10. **Payment Issue** - Impatient customer resolving payment problems

Each conversation includes:
- Realistic Spanish text with occasional typos
- Natural timing (bot: 3-6s, users: 5-30s)
- Different customer personalities
- Authentic e-commerce scenarios

## 🛠️ Technology Stack

- **Backend**: Node.js, Express
- **WebSocket**: ws library for real-time communication
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Data Generation**: Custom demo data generator with realistic timing

## 📦 Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode with auto-reload
npm run dev
```

## 🌐 Deployment

### Railway

This application is configured for Railway deployment:

1. Push to GitHub
2. Connect repository to Railway
3. Railway will auto-detect and deploy
4. Environment variable `PORT` is automatically provided

### Manual Deployment

```bash
# Set PORT environment variable
export PORT=3000

# Start server
npm start
```

## 📡 API Endpoints

### HTTP Endpoints

- `GET /` - Serve control panel interface
- `GET /health` - Health check endpoint
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id` - Get specific conversation
- `POST /api/start-demo` - Start demo simulation
- `POST /api/stop-demo` - Stop demo simulation
- `POST /api/conversations/:id/read` - Mark conversation as read
- `POST /webhook` - Webhook endpoint for incoming messages

### WebSocket Events

#### Received by Client:
- `init` - Initial state with existing conversations
- `new_message` - New message received
- `contact_update` - Contact information update
- `conversation_read` - Conversation marked as read
- `demo_progress` - Demo simulation progress
- `demo_complete` - Demo simulation completed
- `demo_stopped` - Demo simulation stopped
- `reset` - Clear all data

## 🎯 Usage

### Starting the Demo

1. Open the application in your browser
2. Click the big **"START DEMO"** button
3. Watch as 10 conversations unfold in real-time over ~5 minutes
4. Click on any conversation to view the full chat history
5. Messages are automatically marked as read when viewed

### Webhook Integration

The demo automatically POSTs to its own webhook endpoint to simulate external message sources:

```javascript
// Message webhook
POST /webhook
{
  "type": "message",
  "data": {
    "user_id": "34612345001",
    "message": "Hola, buenos días",
    "conversation_id": "34612345001"
  }
}

// Contact webhook
POST /webhook
{
  "type": "contact",
  "data": {
    "user_id": "34612345001",
    "name": "María García"
  }
}
```

## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## 📊 Architecture

```
┌─────────────┐
│   Browser   │
│  (WebSocket)│
└──────┬──────┘
       │
┌──────▼──────┐
│   Express   │
│   Server    │
└──────┬──────┘
       │
┌──────▼──────┐
│  WebSocket  │
│   Server    │
└──────┬──────┘
       │
┌──────▼──────┐
│  Demo Data  │
│  Generator  │
└─────────────┘
```

## 🚦 Project Status

Current: **Demo Version** ✅

This is a demonstration version with simulated data. For production use with real WhatsApp integration, additional development is required (see PROJECT_PLAN.md).

## 📝 License

MIT License

## 🙋 Support

For issues or questions, please open a GitHub issue.

---

**Built for OCC Sport Plus** - Auto accessories e-commerce
**Powered by Infinitix AI Assistant**
