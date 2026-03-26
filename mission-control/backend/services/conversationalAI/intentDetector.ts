/**
 * Intent Detection and Parameter Extraction
 * Analyzes user messages to determine intent and extract parameters
 */

export interface DetectedIntent {
  intent: string;
  confidence: number;
  extractedParams: {
    robotId?: string;
    pathMapName?: string;
    missionName?: string;
    operatorId?: string;
    clientId?: string;
    page?: string;
    status?: string;
  };
}

export class IntentDetector {
  /**
   * Detect user intent from message
   */
  detectIntent(message: string): DetectedIntent {
    const lowerMsg = message.toLowerCase().trim();

    // Intent: Execute Mission
    if (this.matchesPattern(lowerMsg, [
      /send .* to/i,
      /navigate .* to/i,
      /go to/i,
      /execute mission/i,
      /start mission/i,
      /robot .* go/i
    ])) {
      return {
        intent: 'execute_mission',
        confidence: 0.9,
        extractedParams: this.extractMissionParams(message)
      };
    }

    // Intent: Abort Mission
    if (this.matchesPattern(lowerMsg, [
      /abort/i,
      /stop/i,
      /cancel mission/i,
      /halt/i,
      /emergency stop/i
    ])) {
      return {
        intent: 'abort_mission',
        confidence: 0.95,
        extractedParams: this.extractRobotParam(message)
      };
    }

    // Intent: Get Robot Info
    if (this.matchesPattern(lowerMsg, [
      /show .* robot/i,
      /robot .* status/i,
      /where is .* robot/i,
      /status of .* robot/i,
      /robot .* details/i
    ])) {
      return {
        intent: 'get_robot_info',
        confidence: 0.85,
        extractedParams: this.extractRobotParam(message)
      };
    }

    // Intent: List Entities
    if (this.matchesPattern(lowerMsg, [
      /list all/i,
      /show all/i,
      /how many/i,
      /get all/i
    ])) {
      return {
        intent: 'list_entities',
        confidence: 0.8,
        extractedParams: this.extractListParams(message)
      };
    }

    // Intent: Navigate
    if (this.matchesPattern(lowerMsg, [
      /show dashboard/i,
      /show leads/i,
      /show analytics/i,
      /navigate to/i,
      /go to page/i,
      /open .* page/i
    ])) {
      return {
        intent: 'navigate',
        confidence: 0.9,
        extractedParams: this.extractNavigationParams(message)
      };
    }

    // Default: Unclear intent
    return {
      intent: 'unclear',
      confidence: 0.3,
      extractedParams: {}
    };
  }

  /**
   * Extract parameters for mission execution
   */
  private extractMissionParams(message: string): any {
    const params: any = {};

    // Extract robot (MMR-31, robot 31, etc.)
    const robotMatch = message.match(/(?:robot\s+|MMR[-_\s]?)(\d+)/i);
    if (robotMatch) {
      params.robotId = robotMatch[1];  // Just the number
    }

    // Extract mission name (to kitchen, to dispenser, etc.)
    const missionMatch = message.match(/(?:to|go to|navigate to)\s+(?:the\s+)?(\w+)/i);
    if (missionMatch) {
      params.missionName = missionMatch[1];
    }

    // Extract pathmap/location (in office, in warehouse, etc.)
    const pathmapMatch = message.match(/(?:in|at|from)\s+(?:the\s+)?(\w+[-\s]?\d*)/i);
    if (pathmapMatch) {
      params.pathMapName = pathmapMatch[1];
    }

    return params;
  }

  /**
   * Extract robot parameter only
   */
  private extractRobotParam(message: string): any {
    const params: any = {};

    const robotMatch = message.match(/(?:robot\s+|MMR[-_\s]?)(\d+)/i);
    if (robotMatch) {
      params.robotId = robotMatch[1];
    }

    return params;
  }

  /**
   * Extract parameters for list queries
   */
  private extractListParams(message: string): any {
    const params: any = {};

    if (message.match(/robot/i)) {
      params.entityType = 'robots';
    } else if (message.match(/operator|worker|people/i)) {
      params.entityType = 'operators';
    } else if (message.match(/client|site|location/i)) {
      params.entityType = 'clients';
    }

    // Extract status filter
    if (message.match(/idle/i)) params.status = 'idle';
    if (message.match(/active/i)) params.status = 'active';
    if (message.match(/charging/i)) params.status = 'charging';

    return params;
  }

  /**
   * Extract navigation parameters
   */
  private extractNavigationParams(message: string): any {
    const params: any = {};

    const pageMap: Record<string, string> = {
      'dashboard': 'dashboard',
      'leads': 'leads',
      'analytics': 'analytics',
      'robots': 'robots',
      'operators': 'operators',
      'clients': 'clients',
      'inventory': 'inventory',
      'qc': 'qc_submissions',
      'master': 'master_data'
    };

    for (const [keyword, page] of Object.entries(pageMap)) {
      if (message.toLowerCase().includes(keyword)) {
        params.page = page;
        break;
      }
    }

    return params;
  }

  /**
   * Check if message matches any pattern
   */
  private matchesPattern(message: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(message));
  }

  /**
   * Extract answer from follow-up response (number or name)
   */
  extractAnswer(message: string, questionType: 'robot' | 'pathmap' | 'mission' | 'confirmation'): string | null {
    const lowerMsg = message.toLowerCase().trim();

    // Confirmation responses
    if (questionType === 'confirmation') {
      if (this.matchesPattern(lowerMsg, [/^yes$/i, /^y$/i, /^yep$/i, /^sure$/i, /^ok$/i, /^proceed$/i, /^confirm$/i])) {
        return 'yes';
      }
      if (this.matchesPattern(lowerMsg, [/^no$/i, /^n$/i, /^nope$/i, /^cancel$/i, /^abort$/i])) {
        return 'no';
      }
      return null;
    }

    // Number selection (1, 2, 3, etc.)
    const numberMatch = message.match(/(?:number\s+)?(\d+)/i);
    if (numberMatch) {
      return numberMatch[1];
    }

    // Named selection (return the whole message, will be used for searching)
    return message.trim();
  }
}
