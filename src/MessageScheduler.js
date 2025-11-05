// Dynamic Message Scheduler for Infinitix Demo
// Intelligently schedules messages in real-time with priority-based queue

class MessageScheduler {
  constructor(conversations, sendWebhookFn, broadcastFn) {
    this.conversations = conversations; // All conversation templates
    this.sendWebhook = sendWebhookFn; // Function to send webhook
    this.broadcast = broadcastFn; // Function to broadcast progress

    // Seeded random number generator for reproducible randomness
    this.seed = Date.now(); // Use current timestamp as seed
    console.log(`🎲 Demo seed: ${this.seed}`);

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

    // Shuffle conversations based on seed for different order each time
    this.shuffleConversations();
  }

  // Seeded random number generator (Linear Congruential Generator)
  seededRandom() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Shuffle array using seeded random
  shuffleConversations() {
    const array = this.conversations;
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    console.log('📋 Conversation order:', this.conversations.map(c => c.userName).join(', '));
  }

  start() {
    this.isRunning = true;
    const now = Date.now();

    // Count total messages
    this.totalMessages = this.conversations.reduce((sum, conv) => sum + conv.messages.length, 0);

    console.log(`▶️ Starting demo with ${this.totalMessages} total messages`);

    // Send first message from first conversation IMMEDIATELY
    const firstConv = this.conversations[0];
    const firstMsg = firstConv.messages[0];

    this.sendMessageNow(firstConv, 0, now);

    // Fill the queue for the next 5 seconds
    this.fill_queue();
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

  // Fill queue with messages for the next 5 seconds
  // This function is called after each message is sent to maintain the queue
  fill_queue() {
    if (!this.isRunning) return;

    const now = Date.now();

    // IMPORTANT: Don't remove messages from queue based on time alone!
    // The setTimeout might not have fired yet, causing duplicates.
    // Only remove messages that are old enough that setTimeout definitely fired (500ms buffer)
    this.messageQueue = this.messageQueue.filter(msg => msg.scheduledTime > now - 500);

    // Calculate how far our queue extends
    let queueEndTime = this.messageQueue.length > 0 ?
      Math.max(...this.messageQueue.map(m => m.scheduledTime)) : now;

    const extendSeconds = Math.round((queueEndTime - now) / 1000);
    console.log(`🔄 Filling queue (current: ${this.messageQueue.length} messages, extends ${extendSeconds}s ahead)`);

    // Fill queue until it extends at least 5 seconds ahead
    let attempts = 0;
    while (queueEndTime - now < this.QUEUE_WINDOW && this.isRunning) {
      attempts++;
      if (attempts > 100) {
        console.log('⚠️ Max attempts reached in fill_queue');
        break; // Safety limit
      }

      // Find next available message slot
      const nextSlot = this.findNextAvailableSlot(Math.max(now, queueEndTime));

      if (!nextSlot) {
        console.log('✋ No more message slots available');
        break; // No more messages available
      }

      // Pick which conversation sends next message
      const pick = this.pickNextConversation(nextSlot.time);

      if (!pick) {
        console.log('✋ No conversations ready');
        break; // No conversations ready
      }

      // Add random delay (0-2000ms) using seeded random
      const randomDelay = Math.floor(this.seededRandom() * this.RANDOM_DELAY_MAX);
      const scheduledTime = nextSlot.time + randomDelay;

      // Add to queue
      this.messageQueue.push({
        conversation: pick.conversation,
        messageIndex: pick.messageIndex,
        scheduledTime: scheduledTime
      });

      console.log(`📤 Queued: ${pick.conversation.userName} msg ${pick.messageIndex + 1} at +${Math.round((scheduledTime - now) / 1000)}s`);

      // Schedule the actual sending
      const delay = scheduledTime - now;
      const timerId = setTimeout(() => {
        // Remove this specific message from queue when it's sent
        this.messageQueue = this.messageQueue.filter(msg =>
          !(msg.conversation.userId === pick.conversation.userId && msg.messageIndex === pick.messageIndex)
        );

        this.sendMessageNow(pick.conversation, pick.messageIndex, scheduledTime);
        // Refill queue after sending to maintain 5-second window
        this.fill_queue();
      }, delay);

      this.queueTimers.push(timerId);

      // Update queueEndTime for next iteration
      queueEndTime = Math.max(...this.messageQueue.map(m => m.scheduledTime));
    }

    console.log(`✅ Queue filled: ${this.messageQueue.length} messages queued, extends to +${Math.round((queueEndTime - now) / 1000)}s`);
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

      // Find what message index we should send next (considering what's already queued)
      const queuedIndicesForConv = this.messageQueue
        .filter(msg => msg.conversation.userId === convId)
        .map(msg => msg.messageIndex);

      // The next index to send is the highest queued index + 1, or currentIndex if nothing queued
      const nextIndexToQueue = queuedIndicesForConv.length > 0
        ? Math.max(...queuedIndicesForConv) + 1
        : state.currentIndex;

      // Check if we've run out of messages
      if (nextIndexToQueue >= conv.messages.length) {
        continue;
      }

      // Find the latest message time for this conversation (including queued messages)
      const queuedMessagesForConv = this.messageQueue
        .filter(msg => msg.conversation.userId === convId)
        .map(msg => msg.scheduledTime);

      const latestMessageTime = queuedMessagesForConv.length > 0
        ? Math.max(state.lastMessageTime, ...queuedMessagesForConv)
        : state.lastMessageTime;

      // Determine cooldown based on the last sender in this conversation
      // If there are queued messages, check the sender of the most recent one
      let lastSender = state.lastSender;
      if (queuedMessagesForConv.length > 0) {
        // Find the most recent queued message for this conversation
        const latestQueued = this.messageQueue
          .filter(msg => msg.conversation.userId === convId)
          .sort((a, b) => b.scheduledTime - a.scheduledTime)[0];

        if (latestQueued && latestQueued.scheduledTime > state.lastMessageTime) {
          lastSender = latestQueued.conversation.messages[latestQueued.messageIndex].sender;
        }
      }

      const cooldown = lastSender === 'bot' ? this.COOLDOWN_BOT : this.COOLDOWN_USER;
      const timeSinceLastMessage = currentTime - latestMessageTime;

      if (timeSinceLastMessage >= cooldown) {
        openCandidates.push({
          conversation: conv,
          messageIndex: nextIndexToQueue,
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
