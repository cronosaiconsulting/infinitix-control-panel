// Dynamic Message Scheduler for Infinitix Demo
// Intelligently schedules messages in real-time with priority-based queue

class MessageScheduler {
  constructor(conversations, sendWebhookFn, broadcastFn) {
    this.conversations = conversations; // All conversation templates
    this.sendWebhook = sendWebhookFn; // Function to send webhook
    this.broadcast = broadcastFn; // Function to broadcast progress

    // State tracking
    this.conversationStates = new Map(); // convId -> { currentIndex, lastMessageTime, nextSender }
    this.openConversations = new Set(); // Conversations that are active (started but not ended)
    this.messageQueue = []; // Scheduled messages
    this.queueTimers = []; // setTimeout IDs
    this.isRunning = false;

    // Configuration
    this.QUEUE_WINDOW = 5000; // Always have 5s of messages queued
    this.MAX_MESSAGES_PER_5S = 3;
    this.COOLDOWN_BOT = 3000; // 3 seconds for Infinitix
    this.COOLDOWN_USER = 6000; // 6 seconds for users
    this.RANDOM_DELAY_MAX = 2000; // 0-2000ms random delay

    // Statistics
    this.totalMessages = 0;
    this.sentMessages = 0;
  }

  start() {
    this.isRunning = true;
    const now = Date.now();

    // Count total messages
    this.totalMessages = this.conversations.reduce((sum, conv) => sum + conv.messages.length, 0);

    // Send first message from first conversation IMMEDIATELY
    const firstConv = this.conversations[0];
    const firstMsg = firstConv.messages[0];

    this.sendMessageNow(firstConv, 0, now);

    // Start the scheduler
    this.scheduleNextBatch();
  }

  stop() {
    this.isRunning = false;
    // Clear all pending timers
    this.queueTimers.forEach(timer => clearTimeout(timer));
    this.queueTimers = [];
    this.messageQueue = [];
  }

  sendMessageNow(conversation, messageIndex, timestamp) {
    const message = conversation.messages[messageIndex];
    const isBot = message.sender === 'bot';

    // Send contact webhook first if this is the first message from this user
    if (messageIndex === 0 && !isBot) {
      this.sendWebhook({
        type: 'contact',
        data: {
          user_id: conversation.userId,
          name: conversation.userName
        }
      });
    }

    // Send contact for bot if it's a bot message
    if (isBot) {
      this.sendWebhook({
        type: 'contact',
        data: {
          user_id: '0',
          name: 'Infinitix'
        }
      });
    }

    // Send the message webhook
    setTimeout(() => {
      this.sendWebhook({
        type: 'message',
        data: {
          user_id: isBot ? '0' : conversation.userId,
          message: message.text,
          conversation_id: conversation.userId
        }
      });
    }, isBot ? 50 : (messageIndex === 0 ? 100 : 50));

    // Update conversation state
    const nextIndex = messageIndex + 1;
    const nextSender = nextIndex < conversation.messages.length ?
      conversation.messages[nextIndex].sender : null;

    this.conversationStates.set(conversation.userId, {
      currentIndex: nextIndex,
      lastMessageTime: timestamp,
      lastSender: message.sender,
      nextSender: nextSender
    });

    // Add to open conversations if not there
    if (nextIndex < conversation.messages.length) {
      this.openConversations.add(conversation.userId);
    } else {
      this.openConversations.delete(conversation.userId);
    }

    // Update stats
    this.sentMessages++;
    this.broadcast({
      type: 'demo_progress',
      data: {
        completed: this.sentMessages,
        total: this.totalMessages,
        percentage: Math.floor((this.sentMessages / this.totalMessages) * 100)
      }
    });

    // Check if demo complete
    if (this.sentMessages >= this.totalMessages) {
      this.isRunning = false;
      this.broadcast({
        type: 'demo_complete',
        data: {
          message: 'Demo simulation completed!',
          totalMessages: this.sentMessages
        }
      });
    }
  }

  scheduleNextBatch() {
    if (!this.isRunning) return;

    const now = Date.now();

    // Remove already-sent messages from queue
    this.messageQueue = this.messageQueue.filter(msg => msg.scheduledTime > now);

    // Calculate how far our queue extends
    const queueEndTime = this.messageQueue.length > 0 ?
      Math.max(...this.messageQueue.map(m => m.scheduledTime)) : now;

    // Fill queue until it extends 5 seconds ahead
    while (queueEndTime - now < this.QUEUE_WINDOW && this.isRunning) {
      // Find next available message slot
      const nextSlot = this.findNextAvailableSlot(now);

      if (!nextSlot) {
        break; // No more messages available
      }

      // Pick which conversation sends next message
      const pick = this.pickNextConversation(nextSlot.time);

      if (!pick) {
        break; // No conversations ready
      }

      // Add random delay (0-2000ms)
      const randomDelay = Math.floor(Math.random() * this.RANDOM_DELAY_MAX);
      const scheduledTime = nextSlot.time + randomDelay;

      // Add to queue
      this.messageQueue.push({
        conversation: pick.conversation,
        messageIndex: pick.messageIndex,
        scheduledTime: scheduledTime
      });

      // Schedule the actual sending
      const delay = scheduledTime - now;
      const timerId = setTimeout(() => {
        this.sendMessageNow(pick.conversation, pick.messageIndex, scheduledTime);
        this.scheduleNextBatch(); // Refill queue after sending
      }, delay);

      this.queueTimers.push(timerId);

      // Temporarily mark this conversation as used (for this iteration)
      const state = this.conversationStates.get(pick.conversation.userId);
      if (state) {
        state.currentIndex++; // Increment so we don't pick same message again
      }
    }
  }

  findNextAvailableSlot(fromTime) {
    // Find the earliest time we can schedule a message
    // considering the "max 3 messages per 5 seconds" rule

    let candidateTime = fromTime;

    // Check 5-second windows
    for (let attempt = 0; attempt < 100; attempt++) { // Safety limit
      const windowStart = Math.floor(candidateTime / 5000) * 5000;
      const windowEnd = windowStart + 5000;

      // Count messages in this window
      const messagesInWindow = this.messageQueue.filter(msg =>
        msg.scheduledTime >= windowStart && msg.scheduledTime < windowEnd
      ).length;

      if (messagesInWindow < this.MAX_MESSAGES_PER_5S) {
        return { time: candidateTime, window: windowStart };
      }

      // Window full, try next window
      candidateTime = windowEnd;
    }

    return null; // Couldn't find a slot
  }

  pickNextConversation(currentTime) {
    // Priority 1: Open conversations (already started)
    const openCandidates = [];

    for (const convId of this.openConversations) {
      const state = this.conversationStates.get(convId);
      const conv = this.conversations.find(c => c.userId === convId);

      if (!state || !conv) continue;

      // Check if conversation has more messages
      if (state.currentIndex >= conv.messages.length) {
        this.openConversations.delete(convId);
        continue;
      }

      // Check cooldown
      const cooldown = state.lastSender === 'bot' ? this.COOLDOWN_BOT : this.COOLDOWN_USER;
      const timeSinceLastMessage = currentTime - state.lastMessageTime;

      if (timeSinceLastMessage >= cooldown) {
        openCandidates.push({
          conversation: conv,
          messageIndex: state.currentIndex,
          priority: timeSinceLastMessage // Higher priority for longer waits
        });
      }
    }

    // If we have open conversations ready, pick the one waiting longest
    if (openCandidates.length > 0) {
      openCandidates.sort((a, b) => b.priority - a.priority);
      return openCandidates[0];
    }

    // Priority 2: Start new conversation
    for (const conv of this.conversations) {
      if (!this.conversationStates.has(conv.userId)) {
        return {
          conversation: conv,
          messageIndex: 0
        };
      }
    }

    return null; // No conversations available
  }
}

module.exports = MessageScheduler;
