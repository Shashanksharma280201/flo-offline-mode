/**
 * Master Agent - Mission Functions
 * PERMISSION RESTRICTED: Master Agent cannot execute missions
 * Use Autonomy Agent for mission operations
 */

import { Request } from "express";

// ============== FUNCTION DEFINITIONS ==============
// Mission functions are NOT available to Master Agent
// These exist only to provide helpful error messages

export const missionFunctionDefinitions: any[] = [];

// ============== PERMISSION-DENIED STUBS ==============
export class MissionFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async executeRobotMission(args: any) {
    return {
      success: false,
      error: "Permission denied. Master Agent cannot execute missions.",
      suggestAgent: "autonomy-agent",
      suggestEndpoint: "/api/v1/autonomy-agent/command-text",
      message: "Please use the Autonomy Agent for mission execution. Use endpoint: /api/v1/autonomy-agent/command-text"
    };
  }

  async selectDisambiguationChoice(args: any) {
    return {
      success: false,
      error: "Permission denied. Master Agent cannot handle mission disambiguation.",
      suggestAgent: "autonomy-agent",
      suggestEndpoint: "/api/v1/autonomy-agent/command-text",
      message: "Please use the Autonomy Agent for mission operations. Use endpoint: /api/v1/autonomy-agent/command-text"
    };
  }

  async abortRobotMission(args: any) {
    return {
      success: false,
      error: "Permission denied. Master Agent cannot abort missions.",
      suggestAgent: "autonomy-agent",
      suggestEndpoint: "/api/v1/autonomy-agent/command-text",
      message: "Please use the Autonomy Agent to abort missions. Use endpoint: /api/v1/autonomy-agent/command-text"
    };
  }

  async getRobotMissionStatus(args: any) {
    return {
      success: false,
      error: "Permission denied. Master Agent cannot check mission status.",
      suggestAgent: "autonomy-agent",
      suggestEndpoint: "/api/v1/autonomy-agent/command-text",
      message: "Please use the Autonomy Agent to check mission status. Use endpoint: /api/v1/autonomy-agent/command-text"
    };
  }
}
