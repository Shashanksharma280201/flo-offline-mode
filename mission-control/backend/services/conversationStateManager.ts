/**
 * In-Memory Conversation State Manager
 * Stores conversation context for multi-turn AI conversations
 * Auto-expires after 10 minutes of inactivity
 */

interface ConversationState {
  conversationId: string;
  intent: string | null;
  turnCount: number;
  status: 'gathering' | 'confirming' | 'executing' | 'completed' | 'awaiting_disambiguation' | 'awaiting_confirmation';
  collectedData: {
    robotId?: string;
    robot?: any;  // Full robot object after resolution
    pathMapName?: string;
    pathMap?: any;  // Full pathmap object after resolution
    missionName?: string;
    mission?: any;  // Full mission object after resolution
    operatorId?: string;
    clientId?: string;
    page?: string;
  };
  missingData: string[];
  lastActivity: Date;
  originalQuery: string;
  messageHistory?: Array<{
    role: string;
    content: string;
    timestamp: Date;
  }>;
  disambiguationData?: any;
}

class ConversationStateManager {
  private states: Map<string, ConversationState>;
  private readonly MAX_TURNS = 3;
  private readonly EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.states = new Map();

    // Cleanup expired conversations every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Create or get conversation state
   */
  getOrCreate(conversationId: string, originalQuery: string = ''): ConversationState {
    let state = this.states.get(conversationId);

    if (!state) {
      state = {
        conversationId,
        intent: null,
        turnCount: 0,
        status: 'gathering',
        collectedData: {},
        missingData: [],
        lastActivity: new Date(),
        originalQuery
      };
      this.states.set(conversationId, state);
      console.log(`[ConversationState] Created new conversation: ${conversationId}`);
    } else {
      state.lastActivity = new Date();
    }

    return state;
  }

  /**
   * Update conversation state
   */
  update(conversationId: string, updates: Partial<ConversationState>): ConversationState {
    const state = this.states.get(conversationId);
    if (!state) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    Object.assign(state, updates);
    state.lastActivity = new Date();

    console.log(`[ConversationState] Updated ${conversationId}:`, {
      intent: state.intent,
      status: state.status,
      turnCount: state.turnCount,
      collectedData: Object.keys(state.collectedData),
      missingData: state.missingData
    });

    return state;
  }

  /**
   * Increment turn count and check if max reached
   */
  incrementTurn(conversationId: string): { turnCount: number; maxReached: boolean } {
    const state = this.states.get(conversationId);
    if (!state) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    state.turnCount++;
    state.lastActivity = new Date();

    const maxReached = state.turnCount >= this.MAX_TURNS;

    console.log(`[ConversationState] Turn ${state.turnCount}/${this.MAX_TURNS} for ${conversationId}`);

    return { turnCount: state.turnCount, maxReached };
  }

  /**
   * Check if conversation has expired or reached max turns
   */
  shouldReset(conversationId: string): boolean {
    const state = this.states.get(conversationId);
    if (!state) return true;

    const expired = Date.now() - state.lastActivity.getTime() > this.EXPIRY_MS;
    const maxTurns = state.turnCount >= this.MAX_TURNS;

    return expired || maxTurns || state.status === 'completed';
  }

  /**
   * Delete conversation state
   */
  delete(conversationId: string): void {
    this.states.delete(conversationId);
    console.log(`[ConversationState] Deleted conversation: ${conversationId}`);
  }

  /**
   * Cleanup expired conversations
   */
  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [id, state] of this.states.entries()) {
      if (now - state.lastActivity.getTime() > this.EXPIRY_MS) {
        this.states.delete(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`[ConversationState] Cleaned up ${deletedCount} expired conversations`);
    }
  }

  /**
   * Get conversation stats (for debugging)
   */
  getStats(): { total: number; byStatus: Record<string, number> } {
    const byStatus: Record<string, number> = {};

    for (const state of this.states.values()) {
      byStatus[state.status] = (byStatus[state.status] || 0) + 1;
    }

    return {
      total: this.states.size,
      byStatus
    };
  }
}

// Singleton instance
export const conversationStateManager = new ConversationStateManager();
