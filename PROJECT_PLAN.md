# Infinitix WhatsApp Chatbot Management System - Project Plan

## Executive Summary

This document outlines the complete plan to upgrade the current demo version into a production-ready WhatsApp conversation management system for Infinitix, the AI chatbot serving OCC Sport Plus customers in Spain.

**Current Status**: Demo Version ✅
**Target**: Production WhatsApp Integration
**Timeline**: 8-12 weeks
**Budget**: Medium (dependent on WhatsApp Business API costs)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technical Architecture](#technical-architecture)
3. [Phase 1: WhatsApp Integration](#phase-1-whatsapp-integration)
4. [Phase 2: Backend Enhancement](#phase-2-backend-enhancement)
5. [Phase 3: Frontend Improvements](#phase-3-frontend-improvements)
6. [Phase 4: AI Integration](#phase-4-ai-integration)
7. [Phase 5: Analytics & Monitoring](#phase-5-analytics--monitoring)
8. [Phase 6: Security & Compliance](#phase-6-security--compliance)
9. [Infrastructure & Deployment](#infrastructure--deployment)
10. [Testing Strategy](#testing-strategy)
11. [Timeline & Milestones](#timeline--milestones)
12. [Cost Estimation](#cost-estimation)
13. [Risk Assessment](#risk-assessment)
14. [Success Metrics](#success-metrics)

---

## System Overview

### Current Capabilities (Demo)

- ✅ Real-time WebSocket communication
- ✅ Multi-conversation UI
- ✅ Message display and organization
- ✅ Webhook endpoint architecture
- ✅ Demo data generation
- ✅ Responsive web interface

### Required Capabilities (Production)

- 🔲 WhatsApp Business API integration
- 🔲 Real customer conversation handling
- 🔲 AI-powered response system (Infinitix)
- 🔲 Agent handoff capability
- 🔲 Customer database integration
- 🔲 Order management system integration
- 🔲 Media handling (images, documents)
- 🔲 Conversation history persistence
- 🔲 Analytics and reporting
- 🔲 Multi-agent support
- 🔲 Authentication and authorization
- 🔲 GDPR compliance
- 🔲 Automated responses and workflows
- 🔲 CRM integration

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Mobile App  │  │   Admin     │      │
│  │  (Agents)    │  │   (Agents)   │  │   Panel     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │        Load Balancer (Railway)        │
         └───────────────────┬───────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Express.js API Server                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│   │
│  │  │  REST API    │  │  WebSocket   │  │   GraphQL  ││   │
│  │  │  Endpoints   │  │   Server     │  │    API     ││   │
│  │  └──────────────┘  └──────────────┘  └────────────┘│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Business Logic Layer                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│   │
│  │  │ Message  │ │Conversation│ │  Agent   │ │  Auth   ││   │
│  │  │ Handler  │ │  Manager   │ │  Manager │ │ Service ││   │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘│   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │   AI     │ │ Workflow │ │Analytics │            │   │
│  │  │ Service  │ │  Engine  │ │ Service  │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼────────┐  ┌───────▼───────┐  ┌──────▼──────┐
│   PostgreSQL    │  │     Redis     │  │  S3/Storage │
│   (Primary DB)  │  │    (Cache)    │  │   (Media)   │
└─────────────────┘  └───────────────┘  └─────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                  Integration Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   WhatsApp   │  │     CRM      │  │   Payment    │      │
│  │  Business    │  │  (Optional)  │  │   Gateway    │      │
│  │     API      │  │              │  │  (Optional)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Email     │  │     SMS      │  │  Analytics   │      │
│  │   Service    │  │   Service    │  │   Platform   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack - Production

#### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js 4.x
- **WebSocket**: ws + Socket.io (for enhanced features)
- **Database**: PostgreSQL 15+ (primary), Redis 7+ (cache/queue)
- **ORM**: Prisma or TypeORM
- **API**: REST + GraphQL (Apollo Server)
- **Queue**: Bull/BullMQ for job processing
- **File Storage**: AWS S3 or Railway Volume

#### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit / Zustand
- **UI Library**: Material-UI or Tailwind CSS
- **Real-time**: Socket.io Client
- **Form Handling**: React Hook Form
- **Data Fetching**: React Query / TanStack Query

#### AI & NLP
- **LLM**: OpenAI GPT-4 or Claude API
- **NLP**: Custom intent recognition
- **Fallback**: Rule-based responses

#### DevOps & Infrastructure
- **Hosting**: Railway (primary), Vercel (frontend alternative)
- **CI/CD**: GitHub Actions
- **Monitoring**: DataDog / New Relic / Sentry
- **Logging**: Winston + CloudWatch
- **CDN**: CloudFlare
- **Domain**: Custom domain with SSL

#### WhatsApp Integration
- **Provider**: Twilio / Meta Business API / MessageBird
- **Webhook**: Secure HTTPS endpoint
- **Media**: WhatsApp Media API

---

## Phase 1: WhatsApp Integration

### Week 1-2: WhatsApp Business API Setup

#### Tasks

1. **Choose WhatsApp Provider**
   - **Option A**: Twilio WhatsApp Business API
     - Pros: Easy setup, good documentation, reliable
     - Cons: Higher cost, limited customization
   - **Option B**: Meta (Facebook) WhatsApp Business API
     - Pros: Official, full features, lower cost
     - Cons: Complex approval process, more setup
   - **Option C**: MessageBird / Vonage
     - Pros: Competitive pricing, good support
     - Cons: Additional layer of abstraction

   **Recommendation**: Start with Twilio for rapid development, migrate to Meta later if cost becomes an issue.

2. **Register WhatsApp Business Account**
   - Create Meta Business Manager account
   - Verify OCC Sport Plus business
   - Apply for WhatsApp Business API access
   - Set up phone number (+34 Spanish number)
   - Configure business profile

3. **Implement Webhook Handler**
   ```javascript
   // Enhanced webhook endpoint
   app.post('/webhook/whatsapp', async (req, res) => {
     // Verify webhook signature
     const signature = req.headers['x-whatsapp-signature'];
     if (!verifyWebhookSignature(signature, req.body)) {
       return res.status(401).json({ error: 'Invalid signature' });
     }

     const { type, data } = req.body;

     switch (type) {
       case 'message':
         await handleIncomingMessage(data);
         break;
       case 'status':
         await handleMessageStatus(data);
         break;
       case 'notification':
         await handleNotification(data);
         break;
     }

     res.status(200).json({ success: true });
   });
   ```

4. **Message Types Support**
   - Text messages
   - Media messages (images, documents, videos)
   - Location messages
   - Contact messages
   - Interactive messages (buttons, lists)
   - Template messages

5. **Test Environment**
   - Set up WhatsApp Sandbox (Twilio)
   - Test message sending/receiving
   - Validate webhook delivery
   - Test media handling

#### Deliverables
- ✅ WhatsApp Business account activated
- ✅ Webhook endpoint receiving messages
- ✅ Message sending capability
- ✅ Media handling working
- ✅ Test conversations successful

---

## Phase 2: Backend Enhancement

### Week 3-4: Database & Persistence

#### Database Schema

```sql
-- Users/Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_id VARCHAR(50) UNIQUE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  language VARCHAR(10) DEFAULT 'es',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  status VARCHAR(20) DEFAULT 'active', -- active, resolved, archived
  assigned_agent_id UUID REFERENCES agents(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP,
  metadata JSONB
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_type VARCHAR(20) NOT NULL, -- customer, agent, bot
  sender_id VARCHAR(255) NOT NULL,
  message_type VARCHAR(20) NOT NULL, -- text, image, document, etc.
  content TEXT,
  media_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  whatsapp_message_id VARCHAR(255) UNIQUE
);

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'agent', -- agent, supervisor, admin
  status VARCHAR(20) DEFAULT 'offline', -- online, offline, busy
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- AI Responses Log
CREATE TABLE ai_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),
  prompt TEXT,
  response TEXT,
  model VARCHAR(50),
  tokens_used INTEGER,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'es',
  category VARCHAR(50), -- greeting, product_info, delivery, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  conversation_id UUID REFERENCES conversations(id),
  customer_id UUID REFERENCES customers(id),
  agent_id UUID REFERENCES agents(id),
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_conversations_customer ON conversations(customer_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_customers_whatsapp_id ON customers(whatsapp_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
```

#### Services Implementation

1. **Customer Service**
   ```javascript
   class CustomerService {
     async findOrCreateByWhatsApp(whatsappId, phoneNumber, name) {
       let customer = await Customer.findOne({ whatsapp_id: whatsappId });

       if (!customer) {
         customer = await Customer.create({
           whatsapp_id: whatsappId,
           phone_number: phoneNumber,
           name: name
         });
       }

       return customer;
     }

     async updateCustomerInfo(customerId, data) {
       return await Customer.update(customerId, data);
     }

     async getCustomerHistory(customerId) {
       return await Conversation.find({
         customer_id: customerId
       }).include('messages');
     }
   }
   ```

2. **Conversation Service**
   ```javascript
   class ConversationService {
     async createConversation(customerId) {
       return await Conversation.create({
         customer_id: customerId,
         status: 'active',
         created_at: new Date()
       });
     }

     async assignToAgent(conversationId, agentId) {
       await Conversation.update(conversationId, {
         assigned_agent_id: agentId,
         status: 'assigned'
       });

       await this.notifyAgent(agentId, conversationId);
     }

     async closeConversation(conversationId, reason) {
       await Conversation.update(conversationId, {
         status: 'resolved',
         closed_at: new Date(),
         close_reason: reason
       });
     }

     async getActiveConversations(agentId = null) {
       const query = { status: 'active' };
       if (agentId) query.assigned_agent_id = agentId;

       return await Conversation.find(query)
         .include('customer', 'messages')
         .orderBy('last_message_at', 'DESC');
     }
   }
   ```

3. **Message Service**
   ```javascript
   class MessageService {
     async saveMessage(conversationId, senderType, senderId, content, metadata = {}) {
       const message = await Message.create({
         conversation_id: conversationId,
         sender_type: senderType,
         sender_id: senderId,
         message_type: metadata.type || 'text',
         content: content,
         media_url: metadata.media_url,
         metadata: metadata,
         whatsapp_message_id: metadata.whatsapp_id
       });

       // Update conversation last_message_at
       await Conversation.update(conversationId, {
         last_message_at: new Date()
       });

       // Broadcast to WebSocket clients
       await this.broadcastMessage(message);

       return message;
     }

     async sendToWhatsApp(conversationId, content, type = 'text') {
       const conversation = await Conversation.findById(conversationId)
         .include('customer');

       const result = await whatsappClient.sendMessage(
         conversation.customer.phone_number,
         content,
         type
       );

       await this.saveMessage(
         conversationId,
         'bot',
         'infinitix',
         content,
         { whatsapp_id: result.messageId, type }
       );

       return result;
     }
   }
   ```

#### Deliverables
- ✅ PostgreSQL database deployed
- ✅ Redis cache configured
- ✅ All database tables created
- ✅ Services implemented
- ✅ Data persistence working
- ✅ Database backups configured

---

## Phase 3: Frontend Improvements

### Week 5-6: Enhanced UI/UX

#### React Migration

1. **Component Structure**
   ```
   src/
   ├── components/
   │   ├── layout/
   │   │   ├── Header.tsx
   │   │   ├── Sidebar.tsx
   │   │   └── Layout.tsx
   │   ├── conversations/
   │   │   ├── ConversationList.tsx
   │   │   ├── ConversationItem.tsx
   │   │   └── ConversationFilter.tsx
   │   ├── chat/
   │   │   ├── ChatHeader.tsx
   │   │   ├── MessageList.tsx
   │   │   ├── Message.tsx
   │   │   ├── MessageInput.tsx
   │   │   └── MediaPreview.tsx
   │   ├── agents/
   │   │   ├── AgentStatus.tsx
   │   │   ├── AgentList.tsx
   │   │   └── AgentSelector.tsx
   │   └── common/
   │       ├── Button.tsx
   │       ├── Avatar.tsx
   │       ├── Badge.tsx
   │       └── Loader.tsx
   ├── features/
   │   ├── auth/
   │   ├── conversations/
   │   ├── messages/
   │   └── analytics/
   ├── hooks/
   │   ├── useWebSocket.ts
   │   ├── useConversations.ts
   │   └── useMessages.ts
   ├── services/
   │   ├── api.ts
   │   ├── websocket.ts
   │   └── auth.ts
   ├── store/
   │   ├── index.ts
   │   └── slices/
   ├── types/
   │   └── index.ts
   └── utils/
       ├── formatters.ts
       └── validators.ts
   ```

2. **Key Features to Add**
   - Agent authentication system
   - Multi-agent conversation assignment
   - Conversation filtering (active, pending, resolved)
   - Search functionality
   - Customer information panel
   - Quick replies/templates
   - Typing indicators
   - Read receipts
   - File upload interface
   - Emoji picker
   - Rich text formatting
   - Agent notes
   - Conversation tagging
   - Export conversations

3. **Mobile Responsive Design**
   - Mobile-first approach
   - Touch-optimized controls
   - Swipe gestures
   - Progressive Web App (PWA) capabilities

#### Deliverables
- ✅ React application migrated
- ✅ All components implemented
- ✅ State management configured
- ✅ Authentication UI working
- ✅ Mobile responsive
- ✅ Performance optimized

---

## Phase 4: AI Integration

### Week 7-8: Infinitix AI Assistant

#### AI Response System

1. **Intent Recognition**
   ```javascript
   class IntentRecognizer {
     async recognizeIntent(message) {
       const intents = {
         GREETING: /^(hola|buenos días|buenas tardes|hey)/i,
         PRODUCT_INQUIRY: /(precio|cuanto cuesta|disponible|stock)/i,
         ORDER_STATUS: /(pedido|envío|entrega|tracking)/i,
         RETURN_REQUEST: /(devolver|devolución|cambiar|reembolso)/i,
         COMPLAINT: /(queja|problema|mal|error|incorrecto)/i,
         THANKS: /(gracias|perfecto|genial|vale)/i
       };

       for (const [intent, pattern] of Object.entries(intents)) {
         if (pattern.test(message)) {
           return intent;
         }
       }

       return 'GENERAL_INQUIRY';
     }
   }
   ```

2. **LLM Integration**
   ```javascript
   class InfinitixAI {
     constructor() {
       this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
       this.systemPrompt = this.buildSystemPrompt();
     }

     buildSystemPrompt() {
       return `
Eres Infinitix, el asistente virtual de OCC Sport Plus, una tienda online especializada en accesorios para automóviles en España.

INFORMACIÓN DE LA EMPRESA:
- Nombre: OCC Sport Plus
- Especialización: Accesorios para automóviles
- País: España
- Idioma: Español
- Horario de atención: Lunes a Viernes 9:00-18:00

TU PERSONALIDAD:
- Amable, profesional y servicial
- Empático con las necesidades del cliente
- Conocedor de productos de automoción
- Resolutivo y eficiente

CAPACIDADES:
1. Información de productos (fundas, alfombrillas, portaesquís, organizadores, etc.)
2. Consulta de pedidos y seguimiento
3. Gestión de devoluciones y cambios
4. Información sobre envíos y plazos
5. Precios y promociones
6. Compatibilidad de productos con vehículos

PRODUCTOS PRINCIPALES:
- Fundas de asiento (universales, a medida, cuero)
- Alfombrillas (goma, moqueta, premium)
- Portaesquís y portabicicletas
- Organizadores de maletero
- Accesorios de limpieza
- Ambientadores

POLÍTICA DE ENVÍOS:
- Envío estándar: 2-3 días laborables (gratuito >30€)
- Envío express: 24h (5,99€)
- Península: 3-5 días
- Islas: 5-7 días

DEVOLUCIONES:
- Plazo: 30 días desde recepción
- Condición: Producto sin usar, embalaje original
- Reembolso: 7-10 días laborables

INSTRUCCIONES:
- Responde siempre en español
- Sé conciso pero completo
- Si no sabes algo, ofrece contactar con un agente
- Sugiere productos relevantes cuando sea apropiado
- Usa emojis ocasionalmente para ser más cercano 😊
- Si el cliente está frustrado, muestra empatía primero

LÍMITES:
- No puedes procesar pagos directamente
- No puedes acceder a datos bancarios
- Para modificar pedidos en proceso, deriva a agente
- Para reclamaciones complejas, deriva a agente
`;
     }

     async generateResponse(message, conversationHistory = []) {
       const messages = [
         { role: 'system', content: this.systemPrompt },
         ...conversationHistory.map(msg => ({
           role: msg.sender_type === 'customer' ? 'user' : 'assistant',
           content: msg.content
         })),
         { role: 'user', content: message }
       ];

       try {
         const completion = await this.openai.chat.completions.create({
           model: 'gpt-4-turbo-preview',
           messages: messages,
           temperature: 0.7,
           max_tokens: 500
         });

         return {
           response: completion.choices[0].message.content,
           tokens: completion.usage.total_tokens,
           model: 'gpt-4-turbo-preview'
         };
       } catch (error) {
         console.error('AI generation error:', error);
         return {
           response: this.getFallbackResponse(message),
           tokens: 0,
           model: 'fallback'
         };
       }
     }

     getFallbackResponse(message) {
       const responses = [
         'Gracias por tu mensaje. Un agente te atenderá en breve.',
         'He recibido tu consulta. ¿Puedes darme más detalles?',
         'Entiendo. Déjame consultar eso con mi equipo y te respondo enseguida.'
       ];
       return responses[Math.floor(Math.random() * responses.length)];
     }

     async shouldEscalateToAgent(conversationHistory, customerSentiment) {
       const escalationTriggers = [
         'Conversación muy larga (>15 mensajes)',
         'Sentimiento negativo persistente',
         'Solicitud de hablar con persona',
         'Problema técnico complejo',
         'Reclamación formal',
         'Solicitud de reembolso',
         'Modificación de pedido urgente'
       ];

       // AI-powered escalation decision
       const prompt = `
Basándote en el historial de conversación, ¿debería escalarse a un agente humano?
Considera: sentimiento del cliente, complejidad del problema, número de mensajes.

Historial: ${JSON.stringify(conversationHistory.slice(-5))}
Sentimiento: ${customerSentiment}

Responde solo: SI o NO
`;

       const decision = await this.askAI(prompt);
       return decision.trim().toUpperCase() === 'SI';
     }
   }
   ```

3. **Automated Workflows**
   ```javascript
   class WorkflowEngine {
     async processMessage(message, conversation) {
       const intent = await this.recognizeIntent(message.content);

       switch (intent) {
         case 'ORDER_STATUS':
           return await this.handleOrderStatusInquiry(message, conversation);

         case 'PRODUCT_INQUIRY':
           return await this.handleProductInquiry(message, conversation);

         case 'RETURN_REQUEST':
           return await this.handleReturnRequest(message, conversation);

         default:
           return await this.handleGeneralInquiry(message, conversation);
       }
     }

     async handleOrderStatusInquiry(message, conversation) {
       // Extract order number
       const orderNumber = this.extractOrderNumber(message.content);

       if (orderNumber) {
         const order = await this.getOrderInfo(orderNumber);
         if (order) {
           return this.formatOrderStatus(order);
         }
       }

       return 'Para consultar tu pedido, necesito el número de orden. Lo puedes encontrar en el email de confirmación. ¿Podrías compartirlo conmigo? 📦';
     }

     async handleProductInquiry(message, conversation) {
       const products = await this.searchProducts(message.content);
       return this.formatProductRecommendations(products);
     }
   }
   ```

4. **Sentiment Analysis**
   ```javascript
   class SentimentAnalyzer {
     analyze(text) {
       const positiveWords = ['gracias', 'perfecto', 'genial', 'excelente', 'bien'];
       const negativeWords = ['mal', 'problema', 'error', 'queja', 'pesimo'];

       let score = 0;
       const lowerText = text.toLowerCase();

       positiveWords.forEach(word => {
         if (lowerText.includes(word)) score++;
       });

       negativeWords.forEach(word => {
         if (lowerText.includes(word)) score--;
       });

       if (score > 0) return 'positive';
       if (score < 0) return 'negative';
       return 'neutral';
     }
   }
   ```

#### Deliverables
- ✅ AI response system working
- ✅ Intent recognition functional
- ✅ Automated workflows implemented
- ✅ Agent escalation logic
- ✅ Sentiment analysis
- ✅ Response quality metrics

---

## Phase 5: Analytics & Monitoring

### Week 9: Metrics & Reporting

#### Analytics Dashboard

1. **Key Metrics**
   - Total conversations
   - Active conversations
   - Average response time
   - Resolution time
   - Customer satisfaction
   - Agent performance
   - Bot vs Agent handling ratio
   - Common inquiries
   - Peak hours
   - Conversion rate

2. **Implementation**
   ```javascript
   class AnalyticsService {
     async trackEvent(eventType, data) {
       await AnalyticsEvent.create({
         event_type: eventType,
         conversation_id: data.conversation_id,
         customer_id: data.customer_id,
         agent_id: data.agent_id,
         data: data.metadata
       });
     }

     async getDashboardMetrics(dateRange) {
       const metrics = await Promise.all([
         this.getTotalConversations(dateRange),
         this.getAverageResponseTime(dateRange),
         this.getResolutionRate(dateRange),
         this.getAgentPerformance(dateRange),
         this.getBotAccuracy(dateRange)
       ]);

       return {
         totalConversations: metrics[0],
         avgResponseTime: metrics[1],
         resolutionRate: metrics[2],
         agentPerformance: metrics[3],
         botAccuracy: metrics[4]
       };
     }
   }
   ```

3. **Reporting Features**
   - Real-time dashboard
   - Daily/weekly/monthly reports
   - Export to CSV/PDF
   - Custom date ranges
   - Conversation transcripts
   - Agent leaderboard

#### Deliverables
- ✅ Analytics dashboard
- ✅ Real-time metrics
- ✅ Report generation
- ✅ Data visualization
- ✅ Export functionality

---

## Phase 6: Security & Compliance

### Week 10: Security Implementation

#### Security Measures

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control (RBAC)
   - Multi-factor authentication (MFA)
   - Session management
   - Password policies

2. **Data Encryption**
   - HTTPS only (TLS 1.3)
   - Database encryption at rest
   - Encrypted backups
   - Secure environment variables

3. **GDPR Compliance**
   ```javascript
   class GDPRService {
     async exportCustomerData(customerId) {
       const customer = await Customer.findById(customerId)
         .include('conversations', 'messages');

       return {
         personal_info: customer.toJSON(),
         conversations: customer.conversations,
         messages: customer.messages,
         exported_at: new Date(),
         format: 'JSON'
       };
     }

     async deleteCustomerData(customerId) {
       await Message.deleteMany({ customer_id: customerId });
       await Conversation.deleteMany({ customer_id: customerId });
       await Customer.delete(customerId);

       await this.logDataDeletion(customerId);
     }

     async anonymizeData(customerId) {
       await Customer.update(customerId, {
         name: '[DELETED]',
         email: null,
         phone_number: '[REDACTED]',
         whatsapp_id: `deleted_${Date.now()}`
       });
     }
   }
   ```

4. **Audit Logging**
   - All data access logged
   - Admin actions tracked
   - Automatic alerts for suspicious activity

#### Deliverables
- ✅ Authentication system
- ✅ Authorization implemented
- ✅ Data encryption configured
- ✅ GDPR compliance features
- ✅ Audit logging active

---

## Infrastructure & Deployment

### Railway Deployment Configuration

```javascript
// railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "environments": {
    "production": {
      "variables": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    },
    "staging": {
      "variables": {
        "NODE_ENV": "staging",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
API_URL=https://api.infinitix.occsportplus.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/infinitix
REDIS_URL=redis://host:6379

# WhatsApp
WHATSAPP_API_KEY=xxx
WHATSAPP_PHONE_NUMBER=+34xxxxxxxxx
WHATSAPP_WEBHOOK_SECRET=xxx

# AI
OPENAI_API_KEY=sk-xxx
AI_MODEL=gpt-4-turbo-preview

# Authentication
JWT_SECRET=xxx
JWT_EXPIRY=7d
SESSION_SECRET=xxx

# Storage
S3_BUCKET=infinitix-media
S3_REGION=eu-west-1
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
DATADOG_API_KEY=xxx

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=xxx
EMAIL_FROM=noreply@occsportplus.com
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches:
      - main
      - staging

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm i -g @railway/cli
          railway up --service infinitix-api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Testing Strategy

### Testing Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │  ← 10%
                    │  (Playwright)   │
                    └─────────────────┘
                ┌───────────────────────┐
                │  Integration Tests    │  ← 30%
                │   (Supertest)         │
                └───────────────────────┘
            ┌───────────────────────────────┐
            │     Unit Tests                │  ← 60%
            │   (Jest + React Testing)      │
            └───────────────────────────────┘
```

### Test Coverage Goals
- Unit Tests: >80%
- Integration Tests: >70%
- E2E Tests: Critical paths only
- Manual QA: Before each release

### Test Scenarios

1. **WhatsApp Integration Tests**
   - Receive text message
   - Receive media message
   - Send message
   - Handle webhook failures
   - Rate limiting

2. **AI Response Tests**
   - Intent recognition accuracy
   - Response quality
   - Fallback handling
   - Escalation logic

3. **Performance Tests**
   - Load testing (1000+ concurrent conversations)
   - Response time (<200ms for API)
   - WebSocket stability
   - Database query optimization

---

## Timeline & Milestones

### 12-Week Implementation Plan

```
Week 1-2:  WhatsApp Integration
  └─ Milestone: First message sent/received via WhatsApp ✓

Week 3-4:  Database & Backend
  └─ Milestone: Data persistence working ✓

Week 5-6:  Frontend Enhancement
  └─ Milestone: Agent UI fully functional ✓

Week 7-8:  AI Integration
  └─ Milestone: Bot handling 70% of inquiries ✓

Week 9:    Analytics & Monitoring
  └─ Milestone: Dashboard showing real metrics ✓

Week 10:   Security & Compliance
  └─ Milestone: GDPR compliance certified ✓

Week 11:   Testing & QA
  └─ Milestone: All tests passing, bugs fixed ✓

Week 12:   Production Launch
  └─ Milestone: System live with real customers ✓
```

### Phased Rollout

1. **Alpha (Week 11)**: Internal testing with team
2. **Beta (Week 12)**: Limited rollout to 50 customers
3. **Production (Week 13)**: Full deployment
4. **Post-Launch (Week 14+)**: Monitoring & optimization

---

## Cost Estimation

### Monthly Operating Costs

| Service | Description | Cost (€/month) |
|---------|-------------|----------------|
| **Infrastructure** |
| Railway Hosting | API + WebSocket server | 20-50 |
| PostgreSQL | Database (Railway addon) | 10-25 |
| Redis | Cache & queue | 10 |
| S3/Storage | Media files | 5-15 |
| CDN | CloudFlare Pro | 20 |
| **WhatsApp** |
| Twilio WhatsApp | ~1000 conversations/month | 50-100 |
| **AI Services** |
| OpenAI GPT-4 | ~10K messages/month | 100-200 |
| **Monitoring** |
| Sentry | Error tracking | 26 |
| DataDog | APM & logs (optional) | 0-50 |
| **Communication** |
| SendGrid | Email service | 15 |
| **Domain & SSL** |
| Domain + SSL | Custom domain | 15 |
| **Total** | | **271-516 €/month** |

### One-Time Costs

| Item | Cost (€) |
|------|----------|
| Development | 15,000-25,000 |
| WhatsApp Business API setup | 0-500 |
| Design & branding | 1,000-2,000 |
| Security audit | 1,500-3,000 |
| Training materials | 500-1,000 |
| **Total One-Time** | **18,000-31,500 €** |

### Cost Optimization Strategies

1. Start with Twilio, migrate to Meta WhatsApp API later (-40%)
2. Use Railway's free tier initially for staging
3. Implement aggressive caching to reduce AI calls (-30%)
4. Use GPT-3.5 for simple queries, GPT-4 for complex ones (-50% AI cost)
5. Self-host some services if traffic grows significantly

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| WhatsApp API rate limits | High | Medium | Implement queuing, monitor usage |
| AI response accuracy issues | High | Medium | Fallback to agents, continuous training |
| Database performance | Medium | Low | Proper indexing, caching, query optimization |
| WebSocket connection drops | Medium | Medium | Auto-reconnect, fallback to polling |
| Third-party service downtime | High | Low | Circuit breakers, graceful degradation |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Customer adoption low | High | Low | Comprehensive training, gradual rollout |
| AI costs exceed budget | Medium | Medium | Usage monitoring, cost alerts, optimize prompts |
| GDPR compliance issues | High | Low | Legal review, compliance audit |
| Competition | Medium | Medium | Continuous improvement, unique features |

### Mitigation Strategies

1. **Phased Rollout**: Beta test with subset of customers
2. **Monitoring**: Real-time alerts for issues
3. **Fallbacks**: Human agents always available
4. **Documentation**: Comprehensive guides for agents
5. **Budget Buffer**: 20% contingency for unexpected costs

---

## Success Metrics

### Key Performance Indicators (KPIs)

#### Customer Satisfaction
- Target: CSAT score > 4.5/5
- Measurement: Post-conversation surveys
- Timeline: Continuous monitoring

#### Efficiency
- Target: 70% of inquiries handled by AI
- Measurement: Bot vs Agent resolution ratio
- Timeline: Month 3 post-launch

#### Response Time
- Target: <30 seconds average first response
- Measurement: Time from message to first reply
- Timeline: Daily monitoring

#### Resolution Time
- Target: 80% resolved in <10 minutes
- Measurement: Time from first message to resolution
- Timeline: Weekly reports

#### Cost per Conversation
- Target: <2€ per conversation
- Measurement: Total costs / Total conversations
- Timeline: Monthly review

#### Agent Productivity
- Target: 15-20 conversations per agent per day
- Measurement: Assigned conversations / Active agents
- Timeline: Daily tracking

### Success Criteria

✅ **Phase 1 Success** (Week 2)
- WhatsApp integration working
- Messages sent/received successfully
- Webhook stable

✅ **Phase 2 Success** (Week 4)
- Database handling 1000+ conversations
- Data persistence reliable
- Backup/restore working

✅ **Phase 3 Success** (Week 6)
- Agent UI fully functional
- Real-time updates working
- Mobile responsive

✅ **Phase 4 Success** (Week 8)
- AI handling 50%+ of inquiries
- Escalation logic working
- Response quality >4/5

✅ **Launch Success** (Month 1)
- System stable (99.5% uptime)
- Customer satisfaction >4/5
- No critical bugs
- Costs within budget

---

## Next Steps

### Immediate Actions (This Week)

1. ✅ **Review & Approve Plan**: Stakeholder sign-off
2. ✅ **Set Up Project Management**: Jira/Trello board
3. ✅ **Create Development Environment**: Staging on Railway
4. ✅ **WhatsApp Business Application**: Start approval process
5. ✅ **Hire/Assign Team**: 2-3 developers, 1 QA, 1 PM

### Week 1 Kickoff

1. Development environment setup
2. Repository structure creation
3. WhatsApp sandbox configuration
4. First sprint planning
5. Team onboarding

### Questions to Resolve

- [ ] Confirm WhatsApp provider (Twilio vs Meta)
- [ ] Approve budget and timeline
- [ ] Identify pilot customers for beta
- [ ] Define agent training schedule
- [ ] Confirm integrations needed (CRM, ERP, etc.)

---

## Appendices

### A. Technology Alternatives

#### Backend Framework
- **Express.js** ✓ (Recommended)
- NestJS (More structure, TypeScript native)
- Fastify (Higher performance)

#### Database
- **PostgreSQL** ✓ (Recommended)
- MongoDB (Document-based alternative)
- MySQL (Traditional RDBMS)

#### Frontend Framework
- **React** ✓ (Recommended)
- Vue.js (Lighter, easier learning curve)
- Svelte (Modern, performant)

#### AI Provider
- **OpenAI GPT-4** ✓ (Recommended)
- Anthropic Claude (Strong reasoning)
- Google PaLM (Good multilingual)
- Open-source (Llama 2, Mistral) - Lower cost but requires more setup

### B. Glossary

- **CSAT**: Customer Satisfaction Score
- **GDPR**: General Data Protection Regulation
- **LLM**: Large Language Model
- **NLP**: Natural Language Processing
- **PWA**: Progressive Web App
- **RBAC**: Role-Based Access Control
- **WebSocket**: Full-duplex communication protocol
- **Webhook**: HTTP callback for event notifications

### C. References

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [GDPR Compliance Guide](https://gdpr.eu)

---

## Document Control

**Version**: 1.0
**Last Updated**: November 4, 2025
**Author**: Claude (Anthropic AI)
**Status**: Draft - Pending Approval
**Next Review**: After stakeholder feedback

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Sponsor | | | |
| Technical Lead | | | |
| Product Manager | | | |
| Legal/Compliance | | | |

---

**End of Project Plan**

For questions or clarifications, please contact the project team.
