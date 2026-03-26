/**
 * Conversational AI Agent
 * Orchestrates multi-turn conversations with intent detection, question generation, and execution
 */

import { Request } from 'express';
import { conversationStateManager } from '../conversationStateManager';
import { IntentDetector } from './intentDetector';
import { QuestionGenerator } from './questionGenerator';
import { AIAgentFunctions } from '../aiAgentService';
import robotModel from '../../models/robotModel';
import pathMapModel from '../../models/pathMapModel';

export class ConversationalAgent {
  private intentDetector: IntentDetector;
  private questionGenerator: QuestionGenerator;

  constructor() {
    this.intentDetector = new IntentDetector();
    this.questionGenerator = new QuestionGenerator();
  }

  /**
   * Process a user message in a conversation
   */
  async process(conversationId: string, userMessage: string, req: Request): Promise<{
    message: string;
    status: string;
    needsInput: boolean;
    executedAction?: any;
    conversationId: string;
  }> {
    console.log(`\n[ConversationalAI] Processing message: "${userMessage}"`);
    console.log(`[ConversationalAI] Conversation ID: ${conversationId}`);

    // Check if conversation should reset
    if (conversationStateManager.shouldReset(conversationId)) {
      console.log(`[ConversationalAI] Resetting conversation ${conversationId}`);
      conversationStateManager.delete(conversationId);
    }

    // Get or create conversation state
    const state = conversationStateManager.getOrCreate(conversationId, userMessage);

    // First turn - detect intent
    if (state.turnCount === 0) {
      return await this.handleFirstTurn(state, userMessage, req);
    }

    // Subsequent turns - handle based on current status
    if (state.status === 'confirming') {
      return await this.handleConfirmation(state, userMessage, req);
    } else if (state.status === 'gathering') {
      return await this.handleGathering(state, userMessage, req);
    }

    // Fallback
    return {
      message: "I'm not sure what to do. Could you rephrase your request?",
      status: 'completed',
      needsInput: false,
      conversationId
    };
  }

  /**
   * Handle first turn - detect intent and extract initial parameters
   */
  private async handleFirstTurn(state: any, userMessage: string, req: Request): Promise<any> {
    console.log(`[ConversationalAI] First turn - detecting intent`);

    // Detect intent
    const detected = this.intentDetector.detectIntent(userMessage);
    console.log(`[ConversationalAI] Detected intent: ${detected.intent} (confidence: ${detected.confidence})`);
    console.log(`[ConversationalAI] Extracted params:`, detected.extractedParams);

    // Update state with intent
    state.intent = detected.intent;
    state.collectedData = { ...detected.extractedParams };

    // Increment turn
    conversationStateManager.incrementTurn(state.conversationId);

    // Handle unclear intent
    if (detected.intent === 'unclear' || detected.confidence < 0.5) {
      conversationStateManager.update(state.conversationId, { status: 'completed' });
      return {
        message: "I didn't quite understand that. Could you rephrase? For example:\n- \"Send robot 31 to kitchen\"\n- \"Show robot status\"\n- \"List all robots\"",
        status: 'completed',
        needsInput: false,
        conversationId: state.conversationId
      };
    }

    // Determine what parameters are missing
    const missingData = this.determineMissingData(detected.intent, state.collectedData);
    state.missingData = missingData;

    console.log(`[ConversationalAI] Missing data:`, missingData);

    // If all parameters collected, move to confirmation
    if (missingData.length === 0) {
      // Try to resolve entities
      const resolved = await this.resolveEntities(state, req);

      if (!resolved.success) {
        // Entity resolution failed - ask for clarification
        return {
          message: resolved.message,
          status: 'completed',
          needsInput: false,
          conversationId: state.conversationId
        };
      }

      // Move to confirmation
      state.status = 'confirming';
      conversationStateManager.update(state.conversationId, state);

      const confirmQuestion = await this.questionGenerator.generateNextQuestion(state);
      return {
        message: confirmQuestion || "Should I proceed?",
        status: 'confirming',
        needsInput: true,
        conversationId: state.conversationId
      };
    }

    // Ask for first missing parameter
    state.status = 'gathering';
    conversationStateManager.update(state.conversationId, state);

    const question = await this.questionGenerator.generateNextQuestion(state);
    return {
      message: question || "I need more information. What would you like to do?",
      status: 'gathering',
      needsInput: true,
      conversationId: state.conversationId
    };
  }

  /**
   * Handle gathering phase - collect missing parameters
   */
  private async handleGathering(state: any, userMessage: string, req: Request): Promise<any> {
    console.log(`[ConversationalAI] Gathering phase - collecting missing data`);
    console.log(`[ConversationalAI] Missing: ${state.missingData.join(', ')}`);

    const nextMissing = state.missingData[0];
    const answer = this.intentDetector.extractAnswer(userMessage, nextMissing);

    console.log(`[ConversationalAI] User answer for ${nextMissing}: "${answer}"`);

    // Check if answer was extracted
    if (!answer) {
      return {
        message: `I didn't understand that. Could you please provide ${nextMissing}?`,
        status: 'gathering',
        needsInput: true,
        conversationId: state.conversationId
      };
    }

    // Try to resolve the entity based on user's answer
    const resolved = await this.resolveEntity(nextMissing, answer, state, req);

    if (!resolved.success) {
      // Resolution failed - ask again or provide error
      return {
        message: resolved.message,
        status: 'gathering',
        needsInput: true,
        conversationId: state.conversationId
      };
    }

    // Entity resolved - update state
    state.collectedData[nextMissing] = answer;
    if (resolved.entity) {
      state.collectedData[nextMissing.replace('Id', '').replace('Name', '')] = resolved.entity;
    }

    // Remove from missing data
    state.missingData = state.missingData.filter((d: string) => d !== nextMissing);

    // Increment turn
    const { maxReached } = conversationStateManager.incrementTurn(state.conversationId);

    if (maxReached) {
      conversationStateManager.update(state.conversationId, { status: 'completed' });
      return {
        message: "Maximum conversation turns reached. Please start over with a complete request.",
        status: 'completed',
        needsInput: false,
        conversationId: state.conversationId
      };
    }

    // Check if all parameters collected
    if (state.missingData.length === 0) {
      // Move to confirmation
      state.status = 'confirming';
      conversationStateManager.update(state.conversationId, state);

      const confirmQuestion = await this.questionGenerator.generateNextQuestion(state);
      return {
        message: confirmQuestion || "Should I proceed?",
        status: 'confirming',
        needsInput: true,
        conversationId: state.conversationId
      };
    }

    // Ask for next missing parameter
    conversationStateManager.update(state.conversationId, state);
    const question = await this.questionGenerator.generateNextQuestion(state);

    return {
      message: question || "What's next?",
      status: 'gathering',
      needsInput: true,
      conversationId: state.conversationId
    };
  }

  /**
   * Handle confirmation phase - execute action after user confirms
   */
  private async handleConfirmation(state: any, userMessage: string, req: Request): Promise<any> {
    console.log(`[ConversationalAI] Confirmation phase`);

    const answer = this.intentDetector.extractAnswer(userMessage, 'confirmation');

    if (answer === 'yes') {
      console.log(`[ConversationalAI] User confirmed - executing action`);

      // Execute the action
      const result = await this.executeAction(state, req);

      // Mark as completed
      state.status = 'completed';
      conversationStateManager.update(state.conversationId, state);

      return {
        message: result.message,
        status: 'completed',
        needsInput: false,
        executedAction: result.action,
        conversationId: state.conversationId
      };
    } else if (answer === 'no') {
      console.log(`[ConversationalAI] User cancelled`);

      state.status = 'completed';
      conversationStateManager.update(state.conversationId, state);

      return {
        message: "Action cancelled. Let me know if you need anything else!",
        status: 'completed',
        needsInput: false,
        conversationId: state.conversationId
      };
    } else {
      // Didn't understand confirmation
      return {
        message: "Please confirm with 'yes' or 'no'.",
        status: 'confirming',
        needsInput: true,
        conversationId: state.conversationId
      };
    }
  }

  /**
   * Determine what parameters are missing for an intent
   */
  private determineMissingData(intent: string, collectedData: any): string[] {
    const missing: string[] = [];

    if (intent === 'execute_mission') {
      if (!collectedData.robotId) missing.push('robotId');
      if (!collectedData.pathMapName) missing.push('pathMapName');
      if (!collectedData.missionName) missing.push('missionName');
    } else if (intent === 'abort_mission' || intent === 'get_robot_info') {
      if (!collectedData.robotId) missing.push('robotId');
    }

    return missing;
  }

  /**
   * Resolve a single entity (robot, pathmap, etc.)
   */
  private async resolveEntity(
    entityType: string,
    userAnswer: string,
    state: any,
    req: Request
  ): Promise<{ success: boolean; message?: string; entity?: any }> {
    const functions = new AIAgentFunctions(req);

    if (entityType === 'robotId') {
      // Try to find robot with scoring
      const robotMatches = await (functions as any).findRobotsWithScoring(userAnswer);

      if (robotMatches.length === 0) {
        return {
          success: false,
          message: `I couldn't find a robot matching "${userAnswer}". Please try again with a different robot ID.`
        };
      }

      if (robotMatches.length > 1 &&
          (robotMatches[0].score < 95 || robotMatches[0].score - robotMatches[1].score < 20)) {
        // Multiple matches - show disambiguation
        const question = this.questionGenerator.generateDisambiguationQuestion('robot', userAnswer, robotMatches.slice(0, 5));
        return {
          success: false,
          message: question
        };
      }

      // Single high-confidence match
      return {
        success: true,
        entity: robotMatches[0].robot
      };
    }

    if (entityType === 'pathMapName') {
      const pathmapMatches = await (functions as any).findPathmapsWithScoring(userAnswer);

      if (pathmapMatches.length === 0) {
        return {
          success: false,
          message: `I couldn't find a pathmap matching "${userAnswer}". Please try again.`
        };
      }

      if (pathmapMatches.length > 1 &&
          (pathmapMatches[0].score < 95 || pathmapMatches[0].score - pathmapMatches[1].score < 20)) {
        const question = this.questionGenerator.generateDisambiguationQuestion('pathmap', userAnswer, pathmapMatches.slice(0, 8));
        return {
          success: false,
          message: question
        };
      }

      return {
        success: true,
        entity: pathmapMatches[0].pathmap
      };
    }

    if (entityType === 'missionName') {
      // Mission resolution happens in context of a pathmap
      const pathMap = state.collectedData.pathMap;
      if (!pathMap) {
        return {
          success: false,
          message: "I need to know the location first before selecting a mission."
        };
      }

      const missionVariations = (functions as any).normalizeMissionQuery(userAnswer);
      let mission = null;

      for (const variation of missionVariations) {
        mission = pathMap.missions.find((m: any) =>
          m.name.toLowerCase() === variation
        );
        if (mission) break;
      }

      if (!mission) {
        const availableMissions = pathMap.missions.map((m: any) => m.name).join(', ');
        return {
          success: false,
          message: `Mission "${userAnswer}" not found in "${pathMap.name}". Available missions: ${availableMissions}`
        };
      }

      return {
        success: true,
        entity: mission
      };
    }

    return { success: true };
  }

  /**
   * Resolve all entities at once
   */
  private async resolveEntities(state: any, req: Request): Promise<{ success: boolean; message?: string }> {
    const functions = new AIAgentFunctions(req);

    // Resolve robot
    if (state.collectedData.robotId && !state.collectedData.robot) {
      const result = await this.resolveEntity('robotId', state.collectedData.robotId, state, req);
      if (!result.success) return result;
      state.collectedData.robot = result.entity;
    }

    // Resolve pathmap
    if (state.collectedData.pathMapName && !state.collectedData.pathMap) {
      const result = await this.resolveEntity('pathMapName', state.collectedData.pathMapName, state, req);
      if (!result.success) return result;
      state.collectedData.pathMap = result.entity;
    }

    // Resolve mission
    if (state.collectedData.missionName && !state.collectedData.mission) {
      const result = await this.resolveEntity('missionName', state.collectedData.missionName, state, req);
      if (!result.success) return result;
      state.collectedData.mission = result.entity;
    }

    return { success: true };
  }

  /**
   * Execute the action based on intent and collected data
   */
  private async executeAction(state: any, req: Request): Promise<{ message: string; action: any }> {
    const functions = new AIAgentFunctions(req);
    const { intent, collectedData } = state;

    if (intent === 'execute_mission') {
      const robot = collectedData.robot;
      const pathMap = collectedData.pathMap;
      const mission = collectedData.mission;

      const result = {
        success: true,
        action: 'execute_mission',
        robot: {
          id: robot._id,
          name: robot.name,
          robotType: robot.robotType
        },
        pathMap: {
          id: pathMap._id,
          name: pathMap.name,
          frame: pathMap.frame
        },
        mission: {
          id: mission._id,
          name: mission.name,
          pathsCount: mission.mission?.length || 0
        }
      };

      return {
        message: `Mission started! ${robot._id} is heading to "${mission.name}" in "${pathMap.name}".`,
        action: result
      };
    }

    if (intent === 'abort_mission') {
      const robot = collectedData.robot;
      const result = await functions.abortRobotMission({ robotId: robot._id });

      return {
        message: result.message || `Abort command sent to ${robot._id}.`,
        action: result
      };
    }

    return {
      message: "Action executed.",
      action: { success: true }
    };
  }
}
