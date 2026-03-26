import { Request } from "express";
import pathMapModel from "../models/pathMapModel";
import robotModel from "../models/robotModel";
import userModel from "../models/userModel";
// import operatorModel from "../models/operatorModel"; // TODO: Add when implementing operator functions
// import qcSubmissionModel from "../models/qcSubmissionModel"; // TODO: Add when implementing QC functions
// import issueModel from "../models/issueModel"; // TODO: Add when implementing issue functions
import { runInTransaction } from "./mongodb";

/**
 * Autonomy Agent Service - Command Executor
 *
 * This service handles all operational write operations for the voice command system.
 * Unlike the Master Agent (read-only), this agent can create, update, delete entities.
 *
 * Architecture: OpenAI Function Calling with GPT-4o
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate phonetic similarity score (0-100)
 * Uses simplified Soundex-like approach for voice transcription errors
 */
function phoneticSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Exact match
  if (s1 === s2) return 100;

  // Phonetic character mappings for common voice transcription errors
  const phoneticMap: { [key: string]: string } = {
    'i': 'y',  // mibot vs mybot
    'y': 'i',
    'f': 'v',  // phone vs vone
    'v': 'f',
    's': 'z',  // laser vs lazer
    'z': 's',
    'c': 'k',  // car vs kar
    'k': 'c',
    'x': 'ks', // box vs boks
  };

  // Normalize phonetically similar characters
  const normalize = (str: string): string => {
    return str.split('').map(char => phoneticMap[char] || char).join('');
  };

  const n1 = normalize(s1);
  const n2 = normalize(s2);

  // Check normalized match
  if (n1 === n2) return 95;
  if (s1.includes(s2) || s2.includes(s1)) return 90;
  if (n1.includes(n2) || n2.includes(n1)) return 85;

  // Levenshtein distance-based similarity
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(s1, s2);
  const similarity = Math.max(0, 100 - (distance / maxLen) * 100);

  return similarity;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize robot query to handle variations
 * Handles both numeric (MMR-31) and named (MMR-Mibot) robots
 */
function normalizeRobotQuery(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const variations: string[] = [normalized];

  // Extract number if present
  const numberMatch = normalized.match(/\d+/);
  if (numberMatch) {
    const number = numberMatch[0];
    const prefix = normalized.includes('mmr') ? 'mmr' :
                   normalized.includes('robot') ? 'mmr' : 'mmr';

    variations.push(
      `${prefix}-${number}`,
      `${prefix}_${number}`,
      `${prefix} ${number}`,
      `${prefix}${number}`,
      number
    );
  } else {
    // For named robots (e.g., "MMR-Mibot", "T1-Alpha")
    // Extract prefix and suffix
    const parts = normalized.split(/[-_\s]+/);
    if (parts.length >= 2) {
      const prefix = parts[0];
      const suffix = parts.slice(1).join('');

      variations.push(
        `${prefix}-${suffix}`,
        `${prefix}_${suffix}`,
        `${prefix} ${suffix}`,
        `${prefix}${suffix}`,
        suffix  // Just the name part
      );
    }
  }

  return variations;
}

/**
 * Normalize pathmap/mission names
 */
function normalizeEntityName(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const numberMatch = normalized.match(/\d+/);

  if (!numberMatch) return [normalized];

  const number = numberMatch[0];
  const text = normalized.replace(/\d+/g, '').trim();

  return [
    `${text}-${number}`,
    `${text}_${number}`,
    `${text} ${number}`,
    `${text}${number}`,
    normalized
  ];
}

/**
 * Score entity match for disambiguation
 * Enhanced with phonetic matching for voice transcription errors
 */
function scoreMatch(query: string, entityName: string): number {
  const queryLower = query.toLowerCase();
  const entityLower = entityName.toLowerCase();

  // Exact match
  if (queryLower === entityLower) return 100;

  // Separator-agnostic match
  const queryNorm = queryLower.replace(/[-_\s]/g, '');
  const entityNorm = entityLower.replace(/[-_\s]/g, '');
  if (queryNorm === entityNorm) return 95;

  // Phonetic similarity (for voice transcription errors like "mibot" vs "mybot")
  const phoneticScore = phoneticSimilarity(queryNorm, entityNorm);
  if (phoneticScore >= 95) return phoneticScore;

  // Contains match
  if (entityLower.includes(queryLower)) return 85;
  if (queryLower.includes(entityLower)) return 80;

  // Partial word matching (e.g., "mibot" matches "MMR-Mibot")
  const queryParts = queryLower.split(/[-_\s]+/);
  const entityParts = entityLower.split(/[-_\s]+/);

  for (const qPart of queryParts) {
    for (const ePart of entityParts) {
      const partPhoneticScore = phoneticSimilarity(qPart, ePart);
      if (partPhoneticScore >= 90) return 90; // High phonetic match on part
      if (partPhoneticScore >= 75) return 75; // Moderate phonetic match
    }
  }

  // Fall back to basic fuzzy similarity
  const commonChars = queryLower.split('').filter(c => entityLower.includes(c)).length;
  const basicScore = (commonChars / Math.max(queryLower.length, entityLower.length)) * 60;

  // Return the best of phonetic or basic score
  return Math.max(phoneticScore, basicScore);
}

// ============================================================================
// FUNCTION DEFINITIONS (For OpenAI Function Calling)
// ============================================================================

export const availableAutonomyFunctions = [
  // MISSION CONTROL OPERATIONS
  {
    name: "executeRobotMission",
    description: "Execute a mission on a robot. Requires robot ID/name, pathmap name, and mission name. Optionally specify frame (utm/odom/lidar). CRITICAL: All parameters MUST match actual database entities. If robot/pathmap/mission not found, system will respond 'not found'. If multiple matches found (e.g., 'Mibot' matches MMR-Mibot and T1-Mibot), system will ask user to clarify. NEVER guess entity names - only use exact names from database.",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID from database (e.g., 'MMR-31', 'robot 31'). Must match an actual robot."
        },
        pathMapName: {
          type: "string",
          description: "PathMap name from database. Must match an actual pathmap."
        },
        missionName: {
          type: "string",
          description: "Mission name from database. Must exist in the specified pathmap."
        },
        frame: {
          type: "string",
          enum: ["utm", "odom", "lidar"],
          description: "Navigation frame (GPS=utm, Indoor=odom, LIDAR=lidar)"
        }
      },
      required: ["robotId", "pathMapName", "missionName"]
    }
  },
  {
    name: "abortRobotMission",
    description: "Abort currently running mission on a robot. DESTRUCTIVE - ask confirmation.",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID"
        }
      },
      required: ["robotId"]
    }
  },
  {
    name: "pauseRobotMission",
    description: "Pause currently running mission on a robot",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID"
        }
      },
      required: ["robotId"]
    }
  },
  {
    name: "resumeRobotMission",
    description: "Resume paused mission on a robot",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID"
        }
      },
      required: ["robotId"]
    }
  },
  {
    name: "returnRobotToStation",
    description: "Send robot back to charging/home station",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID"
        },
        stationName: {
          type: "string",
          description: "Station name (charging, home, base, dock)"
        }
      },
      required: ["robotId"]
    }
  },

  // PATHMAP MANAGEMENT OPERATIONS
  {
    name: "createPathMap",
    description: "Create a new pathmap with specified name and frame type",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "PathMap name (e.g., 'warehouse', 'office-floor-2')"
        },
        frame: {
          type: "string",
          enum: ["utm", "odom", "lidar"],
          description: "Navigation frame - utm=GPS/outdoor, odom=indoor/local, lidar=3D scanning"
        },
        lidarMapName: {
          type: "string",
          description: "Optional: LIDAR map name if using lidar frame"
        }
      },
      required: ["name", "frame"]
    }
  },
  {
    name: "deletePathMap",
    description: "Delete a pathmap. DESTRUCTIVE - ask confirmation. Check if in use first.",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name to delete"
        }
      },
      required: ["pathMapName"]
    }
  },
  {
    name: "addStationToPathMap",
    description: "Add a named station/waypoint to a pathmap. CALL THIS FUNCTION immediately with pathMapName and stationName — do NOT ask the user about position first. The function handles position capture automatically (frontend captures GPS position when function is called).",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name"
        },
        stationName: {
          type: "string",
          description: "Station name (e.g., 'kitchen', 'loading-dock')"
        },
        useCurrentPosition: {
          type: "boolean",
          description: "Use robot's current position (default: true). Always pass true unless user provides explicit coordinates."
        },
        x: {
          type: "number",
          description: "X coordinate (optional, only if user explicitly provides coordinates)"
        },
        y: {
          type: "number",
          description: "Y coordinate (optional, only if user explicitly provides coordinates)"
        }
      },
      required: ["pathMapName", "stationName"]
    }
  },
  {
    name: "removeStationFromPathMap",
    description: "Remove a station from pathmap",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name"
        },
        stationName: {
          type: "string",
          description: "Station name to remove"
        }
      },
      required: ["pathMapName", "stationName"]
    }
  },
  {
    name: "renameStation",
    description: "Rename a station in a pathmap",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name"
        },
        oldName: {
          type: "string",
          description: "Current station name"
        },
        newName: {
          type: "string",
          description: "New station name"
        }
      },
      required: ["pathMapName", "oldName", "newName"]
    }
  },

  // MISSION CREATION OPERATIONS
  {
    name: "createMission",
    description: "Create a new mission in a pathmap",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name"
        },
        missionName: {
          type: "string",
          description: "Mission name (e.g., 'delivery', 'patrol')"
        }
      },
      required: ["pathMapName", "missionName"]
    }
  },
  {
    name: "deleteMission",
    description: "Delete a mission from pathmap. DESTRUCTIVE - ask confirmation.",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name"
        },
        missionName: {
          type: "string",
          description: "Mission name to delete"
        }
      },
      required: ["pathMapName", "missionName"]
    }
  },

  // ROBOT CONFIGURATION
  {
    name: "activateRobot",
    description: "Activate a robot for mission execution",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID"
        }
      },
      required: ["robotId"]
    }
  },
  {
    name: "deactivateRobot",
    description: "Deactivate a robot. DESTRUCTIVE - ask confirmation if mission running.",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID"
        }
      },
      required: ["robotId"]
    }
  },
  {
    name: "setActiveOperator",
    description: "Assign an operator to a robot",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID"
        },
        operatorId: {
          type: "string",
          description: "Operator name, phone, or email"
        }
      },
      required: ["robotId", "operatorId"]
    }
  },

  // OPERATOR MANAGEMENT
  {
    name: "checkInOperator",
    description: "Check in an operator at a client site",
    parameters: {
      type: "object",
      properties: {
        operatorId: {
          type: "string",
          description: "Operator name, phone, or ID"
        },
        clientId: {
          type: "string",
          description: "Client/site name or ID"
        }
      },
      required: ["operatorId", "clientId"]
    }
  },
  {
    name: "checkOutOperator",
    description: "Check out an operator (end attendance session)",
    parameters: {
      type: "object",
      properties: {
        operatorId: {
          type: "string",
          description: "Operator name, phone, or ID"
        }
      },
      required: ["operatorId"]
    }
  },

  // QC OPERATIONS
  {
    name: "createQCSubmission",
    description: "Start a new QC submission for a robot",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID"
        }
      },
      required: ["robotId"]
    }
  },

  // ISSUE MANAGEMENT
  {
    name: "raiseRobotIssue",
    description: "Create a new issue/ticket for a robot",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID"
        },
        title: {
          type: "string",
          description: "Issue title/summary"
        },
        description: {
          type: "string",
          description: "Detailed issue description"
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Issue severity level"
        }
      },
      required: ["robotId", "title", "description"]
    }
  },
  {
    name: "closeRobotIssue",
    description: "Close/resolve an issue",
    parameters: {
      type: "object",
      properties: {
        issueId: {
          type: "string",
          description: "Issue ID or number"
        },
        resolutionNotes: {
          type: "string",
          description: "Resolution details"
        }
      },
      required: ["issueId"]
    }
  },

  // BATCH OPERATIONS
  {
    name: "executeFleetMission",
    description: "Execute mission on multiple robots matching criteria. BATCH OPERATION - ask confirmation.",
    parameters: {
      type: "object",
      properties: {
        fleetType: {
          type: "string",
          description: "Fleet type (T1, MMR, etc.) or 'all'"
        },
        status: {
          type: "string",
          enum: ["idle", "busy", "charging", "all"],
          description: "Robot status filter"
        },
        pathMapName: {
          type: "string",
          description: "PathMap name"
        },
        missionName: {
          type: "string",
          description: "Mission name"
        }
      },
      required: ["pathMapName", "missionName"]
    }
  },
  {
    name: "abortAllMissions",
    description: "Emergency abort all running missions. CRITICAL - require explicit confirmation.",
    parameters: {
      type: "object",
      properties: {
        confirm: {
          type: "boolean",
          description: "User confirmation required"
        }
      },
      required: ["confirm"]
    }
  },

  // DISAMBIGUATION HELPER
  {
    name: "selectDisambiguationChoice",
    description: "Select a numbered option when the user gives a number or choice in response to a disambiguation question (e.g., 'option 1', '2', 'the second one', 'pick number 3'). CALL THIS when user responds with a number/choice selection.",
    parameters: {
      type: "object",
      properties: {
        choice: {
          type: "string",
          description: "User's choice - number (1, 2, 3) or name"
        },
        disambiguationType: {
          type: "string",
          enum: ["robot", "pathmap", "mission", "operator", "client"],
          description: "Type of entity being disambiguated (use 'mission' if unclear)"
        }
      },
      required: ["choice"]
    }
  },

  // LIST OPERATIONS (read-only, for informational commands from autonomy context)
  {
    name: "listPathmaps",
    description: "List all pathmaps accessible by the user. ONLY returns actual pathmaps from database. If no pathmaps found, respond 'No pathmaps found'.",
    parameters: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Optional filter by name or frame (utm/odom/lidar)"
        }
      },
      required: []
    }
  },
  {
    name: "listMissions",
    description: "List all missions in a specific pathmap. CRITICAL: pathMapName must be exact database pathmap name. If pathmap not found, respond 'PathMap not found'. ONLY returns actual missions from database.",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "Exact PathMap name from database to list missions from"
        }
      },
      required: ["pathMapName"]
    }
  },
  {
    name: "listStations",
    description: "List all stations in a specific pathmap",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name to list stations from"
        }
      },
      required: ["pathMapName"]
    }
  },

  // SELECTION OPERATIONS (switch active context in frontend)
  {
    name: "selectPathMap",
    description: "Select and activate a pathmap on the dashboard (switches the active pathmap context)",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name to select"
        }
      },
      required: ["pathMapName"]
    }
  },
  {
    name: "selectMission",
    description: "Select and activate a mission on the dashboard (switches the active mission context)",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name containing the mission"
        },
        missionName: {
          type: "string",
          description: "Mission name to select"
        }
      },
      required: ["pathMapName", "missionName"]
    }
  },

  // PATH RECORDING OPERATIONS
  {
    name: "startPathRecording",
    description: "Start recording a path on the robot for the active pathmap. Robot must be connected.",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name to record path for (uses active pathmap if not specified)"
        }
      },
      required: []
    }
  },
  {
    name: "stopPathRecording",
    description: "Stop recording the current path and save it to the pathmap",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name (uses active pathmap if not specified)"
        }
      },
      required: []
    }
  },

  // MISSION PLANNING OPERATIONS
  {
    name: "startMissionPlanning",
    description: "Start mission planning mode - allows user to add paths to a mission",
    parameters: {
      type: "object",
      properties: {
        missionName: {
          type: "string",
          description: "Mission name to plan (uses active mission if not specified)"
        }
      },
      required: []
    }
  },
  {
    name: "stopMissionPlanning",
    description: "Stop mission planning mode",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "saveMission",
    description: "Save the current mission paths to the database",
    parameters: {
      type: "object",
      properties: {
        missionName: {
          type: "string",
          description: "Mission name to save (uses active mission if not specified)"
        },
        pathMapName: {
          type: "string",
          description: "PathMap name containing the mission"
        }
      },
      required: []
    }
  },
  {
    name: "clearMissionPoints",
    description: "Clear all path points from the current mission (reset without deleting the mission)",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },

  // STATUS OPERATIONS
  {
    name: "getMissionStatus",
    description: "Get the current mission execution status for the active robot",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID (uses active robot if not specified)"
        }
      },
      required: []
    }
  },
  {
    name: "getLocalizationStatus",
    description: "Get the robot's localization and GPS status",
    parameters: {
      type: "object",
      properties: {
        robotId: {
          type: "string",
          description: "Robot name or ID (uses active robot if not specified)"
        }
      },
      required: []
    }
  }
];

// ============================================================================
// FUNCTION IMPLEMENTATIONS
// ============================================================================

/**
 * Execute function calls from OpenAI
 */
export async function executeAutonomyFunctionCall(
  functionName: string,
  args: any,
  req: Request
): Promise<any> {
  console.log(`[Autonomy Agent] Executing function: ${functionName}`, args);

  try {
    switch (functionName) {
      // MISSION CONTROL
      case "executeRobotMission":
        return await handleExecuteRobotMission(args, req);
      case "abortRobotMission":
        return await handleAbortRobotMission(args);
      case "pauseRobotMission":
        return await handlePauseRobotMission(args);
      case "resumeRobotMission":
        return await handleResumeRobotMission(args);
      case "returnRobotToStation":
        return await handleReturnRobotToStation(args);

      // PATHMAP MANAGEMENT
      case "createPathMap":
        return await handleCreatePathMap(args, req);
      case "deletePathMap":
        return await handleDeletePathMap(args, req);
      case "addStationToPathMap":
        return await handleAddStation(args);
      case "removeStationFromPathMap":
        return await handleRemoveStation(args);
      case "renameStation":
        return await handleRenameStation(args);

      // MISSION CREATION
      case "createMission":
        return await handleCreateMission(args);
      case "deleteMission":
        return await handleDeleteMission(args);

      // ROBOT CONFIGURATION
      case "activateRobot":
        return await handleActivateRobot(args);
      case "deactivateRobot":
        return await handleDeactivateRobot(args);
      case "setActiveOperator":
        return await handleSetActiveOperator(args);

      // OPERATOR MANAGEMENT
      case "checkInOperator":
        return await handleCheckInOperator(args);
      case "checkOutOperator":
        return await handleCheckOutOperator(args);

      // QC OPERATIONS
      case "createQCSubmission":
        return await handleCreateQCSubmission(args, req);

      // ISSUE MANAGEMENT
      case "raiseRobotIssue":
        return await handleRaiseRobotIssue(args, req);
      case "closeRobotIssue":
        return await handleCloseRobotIssue(args);

      // BATCH OPERATIONS
      case "executeFleetMission":
        return await handleExecuteFleetMission(args, req);
      case "abortAllMissions":
        return await handleAbortAllMissions(args);

      // DISAMBIGUATION
      case "selectDisambiguationChoice":
        return await handleDisambiguationChoice(args, req);

      // LIST OPERATIONS
      case "listPathmaps":
        return await handleListPathmaps(args, req);
      case "listMissions":
        return await handleListMissions(args, req);
      case "listStations":
        return await handleListStations(args);

      // SELECTION OPERATIONS
      case "selectPathMap":
        return await handleSelectPathMap(args, req);
      case "selectMission":
        return await handleSelectMission(args);

      // PATH RECORDING OPERATIONS
      case "startPathRecording":
        return await handleStartPathRecording(args);
      case "stopPathRecording":
        return await handleStopPathRecording(args);

      // MISSION PLANNING OPERATIONS
      case "startMissionPlanning":
        return await handleStartMissionPlanning(args);
      case "stopMissionPlanning":
        return await handleStopMissionPlanning(args);
      case "saveMission":
        return await handleSaveMission(args);
      case "clearMissionPoints":
        return await handleClearMissionPoints(args);

      // STATUS OPERATIONS
      case "getMissionStatus":
        return await handleGetMissionStatus(args, req);
      case "getLocalizationStatus":
        return await handleGetLocalizationStatus(args, req);

      default:
        return {
          success: false,
          message: `Unknown function: ${functionName}`
        };
    }
  } catch (error: any) {
    console.error(`[Autonomy Agent] Error in ${functionName}:`, error);
    return {
      success: false,
      message: `Error executing ${functionName}: ${error.message}`
    };
  }
}

// ============================================================================
// MISSION CONTROL IMPLEMENTATIONS
// ============================================================================

async function handleExecuteRobotMission(args: any, req: Request) {
  const { robotId, pathMapName, missionName, frame } = args;

  // 1. Resolve robot with fuzzy matching and scoring
  // First try exact and variation matches
  const robotVariations = normalizeRobotQuery(robotId);
  let robots = await robotModel.find({
    $or: robotVariations.map(v => ({ name: { $regex: new RegExp(`^${v}$`, "i") } }))
  }).limit(10);

  // If no exact matches found, get all robots and score them (fuzzy search)
  if (robots.length === 0) {
    const allRobots = await robotModel.find({}).limit(50);
    const scoredAll = allRobots.map(r => ({
      robot: r,
      score: scoreMatch(robotId, r.name)
    })).filter(sr => sr.score >= 60) // Minimum score threshold
       .sort((a, b) => b.score - a.score);

    if (scoredAll.length === 0) {
      return {
        success: false,
        message: `Robot '${robotId}' not found. Please check the robot name or try saying it differently.`
      };
    }

    robots = scoredAll.slice(0, 10).map(sr => sr.robot);
  }

  // Score all matched robots
  const scoredRobots = robots.map(r => ({
    robot: r,
    score: scoreMatch(robotId, r.name)
  })).sort((a, b) => b.score - a.score);

  // Disambiguation if needed (when score is not high enough or multiple matches)
  if (scoredRobots.length > 1 && scoredRobots[0].score < 95) {
    return {
      success: false,
      needsDisambiguation: true,
      disambiguationType: "robot",
      query: robotId,
      message: `I found ${scoredRobots.length} robots matching '${robotId}':\n${scoredRobots.slice(0, 5).map((sr, i) => `${i + 1}. ${sr.robot.name} (${sr.robot.status})`).join('\n')}\n\nWhich robot did you mean?`,
      options: scoredRobots.slice(0, 5).map((sr, i) => ({
        number: i + 1,
        name: sr.robot.name,
        id: sr.robot._id,
        status: sr.robot.status
      })),
      context: { pathMapName, missionName, frame }
    };
  }

  // Use the best match (highest score)
  const robot = scoredRobots[0].robot;

  // Check robot type
  if (robot.robotType !== "autonomous") {
    return {
      success: false,
      message: `Robot ${robot.name} is ${robot.robotType} type. Voice commands only work for autonomous robots.`
    };
  }

  // 2. Resolve pathmap
  const pathMapVariations = normalizeEntityName(pathMapName);
  const pathMapQuery: any = {
    $or: pathMapVariations.map(v => ({ name: { $regex: new RegExp(`^${v}$`, "i") } }))
  };

  if (frame) {
    pathMapQuery.frame = frame;
  }

  const pathMaps = await pathMapModel.find(pathMapQuery).limit(10);

  if (pathMaps.length === 0) {
    const frameMsg = frame ? ` with frame '${frame}'` : "";
    return {
      success: false,
      message: `PathMap '${pathMapName}'${frameMsg} not found.`
    };
  }

  // Score and disambiguate pathmaps
  const scoredPathMaps = pathMaps.map(pm => ({
    pathMap: pm,
    score: scoreMatch(pathMapName, pm.name)
  })).sort((a, b) => b.score - a.score);

  if (scoredPathMaps.length > 1 && scoredPathMaps[0].score < 95) {
    return {
      success: false,
      needsDisambiguation: true,
      disambiguationType: "pathmap",
      query: pathMapName,
      message: `I found ${scoredPathMaps.length} pathmaps matching '${pathMapName}':\n${scoredPathMaps.slice(0, 5).map((spm, i) => `${i + 1}. ${spm.pathMap.name} (${spm.pathMap.frame})`).join('\n')}\n\nWhich pathmap?`,
      options: scoredPathMaps.slice(0, 5).map((spm, i) => ({
        number: i + 1,
        name: spm.pathMap.name,
        id: spm.pathMap._id,
        frame: spm.pathMap.frame
      })),
      context: { robotId: robot._id, robotName: robot.name, missionName, frame }
    };
  }

  const pathMap = scoredPathMaps[0].pathMap;

  // 3. Resolve mission
  const missionVariations = normalizeEntityName(missionName);
  const missions = pathMap.missions.filter((m: any) =>
    missionVariations.some(v =>
      m.name.toLowerCase().includes(v.toLowerCase()) ||
      v.toLowerCase().includes(m.name.toLowerCase())
    )
  );

  if (missions.length === 0) {
    return {
      success: false,
      message: `Mission '${missionName}' not found in pathmap '${pathMap.name}'. Available missions: ${pathMap.missions.map((m: any) => m.name).join(', ')}`
    };
  }

  // Score and disambiguate missions
  const scoredMissions = missions.map((m: any) => ({
    mission: m,
    score: scoreMatch(missionName, m.name)
  })).sort((a, b) => b.score - a.score);

  if (scoredMissions.length > 1 && scoredMissions[0].score < 95) {
    return {
      success: false,
      needsDisambiguation: true,
      disambiguationType: "mission",
      query: missionName,
      message: `I found ${scoredMissions.length} missions matching '${missionName}' in ${pathMap.name}:\n${scoredMissions.slice(0, 5).map((sm, i) => `${i + 1}. ${sm.mission.name}`).join('\n')}\n\nWhich mission?`,
      options: scoredMissions.slice(0, 5).map((sm, i) => ({
        number: i + 1,
        name: sm.mission.name,
        id: sm.mission._id
      })),
      context: {
        robotId: robot._id,
        robotName: robot.name,
        pathMapId: pathMap._id,
        pathMapName: pathMap.name,
        frame: pathMap.frame
      }
    };
  }

  const mission = scoredMissions[0].mission;

  // 4. Return execution data (frontend handles ROS execution)
  return {
    success: true,
    action: "execute",
    message: `Sending ${robot.name} to ${mission.name} in ${pathMap.name}`,
    robot: {
      id: robot._id,
      name: robot.name,
      status: robot.status,
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
      pathCount: mission.mission?.length || 0
    },
    // Frontend will use this for ROS execution
    executeNow: true
  };
}

async function handleAbortRobotMission(args: any) {
  const { robotId } = args;

  const robotVariations = normalizeRobotQuery(robotId);
  const robot = await robotModel.findOne({
    $or: robotVariations.map(v => ({ name: { $regex: new RegExp(`^${v}$`, "i") } }))
  });

  if (!robot) {
    return {
      success: false,
      message: `Robot '${robotId}' not found.`
    };
  }

  // Return abort command (frontend handles ROS)
  return {
    success: true,
    action: "abort",
    message: `Aborting mission on ${robot.name}`,
    robot: {
      id: robot._id,
      name: robot.name
    },
    requiresConfirmation: true,
    confirmationMessage: `Abort mission on ${robot.name}? This will stop the current task.`
  };
}

async function handlePauseRobotMission(args: any) {
  const { robotId } = args;

  const robotVariations = normalizeRobotQuery(robotId);
  const robot = await robotModel.findOne({
    $or: robotVariations.map(v => ({ name: { $regex: new RegExp(`^${v}$`, "i") } }))
  });

  if (!robot) {
    return {
      success: false,
      message: `Robot '${robotId}' not found.`
    };
  }

  return {
    success: true,
    action: "pause",
    message: `Pausing mission on ${robot.name}`,
    robot: {
      id: robot._id,
      name: robot.name
    }
  };
}

async function handleResumeRobotMission(args: any) {
  const { robotId } = args;

  const robotVariations = normalizeRobotQuery(robotId);
  const robot = await robotModel.findOne({
    $or: robotVariations.map(v => ({ name: { $regex: new RegExp(`^${v}$`, "i") } }))
  });

  if (!robot) {
    return {
      success: false,
      message: `Robot '${robotId}' not found.`
    };
  }

  return {
    success: true,
    action: "resume",
    message: `Resuming mission on ${robot.name}`,
    robot: {
      id: robot._id,
      name: robot.name
    }
  };
}

async function handleReturnRobotToStation(args: any) {
  const { robotId, stationName = "charging" } = args;

  const robotVariations = normalizeRobotQuery(robotId);
  const robot = await robotModel.findOne({
    $or: robotVariations.map(v => ({ name: { $regex: new RegExp(`^${v}$`, "i") } }))
  });

  if (!robot) {
    return {
      success: false,
      message: `Robot '${robotId}' not found.`
    };
  }

  return {
    success: true,
    action: "return",
    message: `Sending ${robot.name} back to ${stationName} station`,
    robot: {
      id: robot._id,
      name: robot.name
    },
    stationName,
    requiresConfirmation: true,
    confirmationMessage: `Send ${robot.name} back to ${stationName}? This will override the current task.`
  };
}

// ============================================================================
// PATHMAP MANAGEMENT IMPLEMENTATIONS
// ============================================================================

async function handleCreatePathMap(args: any, req: Request) {
  const { name, frame, lidarMapName } = args;
  const userId = req.user!.id;

  // Check if pathmap already exists
  const existing = await pathMapModel.findOne({ name, owner: userId });
  if (existing) {
    return {
      success: false,
      message: `PathMap '${name}' already exists. Choose a different name.`
    };
  }

  try {
    const { createdPathMap } = await runInTransaction(async (session) => {
      const pathMapInTransaction = await pathMapModel.create([{
        name,
        owner: userId,
        frame: frame || "utm",
        lidarMapName: lidarMapName || undefined,
        users: [userId],
        stations: [],
        missions: []
      }], { session });

      await userModel.findByIdAndUpdate(
        userId,
        { $addToSet: { pathMaps: pathMapInTransaction[0]._id } },
        { session, new: true }
      );

      return { createdPathMap: pathMapInTransaction[0] };
    });

    return {
      success: true,
      message: `Created pathmap '${name}' in ${frame.toUpperCase()} frame. Ready to add stations.`,
      pathMap: {
        id: createdPathMap._id,
        name: createdPathMap.name,
        frame: createdPathMap.frame
      },
      nextSteps: "Say 'add station' to start adding locations to this pathmap."
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create pathmap: ${error.message}`
    };
  }
}

async function handleDeletePathMap(args: any, req: Request) {
  const { pathMapName } = args;
  const userId = req.user!.id;

  const pathMap = await pathMapModel.findOne({
    name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
  });

  if (!pathMap) {
    return {
      success: false,
      message: `PathMap '${pathMapName}' not found.`
    };
  }

  // Check if in use by any robot
  const robotsUsingPathMap = await robotModel.find({
    // This depends on your robot schema - adjust if needed
    // Assuming robots have currentPathMap or similar field
  });

  return {
    success: true,
    action: "delete_pathmap",
    requiresConfirmation: true,
    confirmationMessage: `Delete pathmap '${pathMap.name}'? This will remove ${pathMap.missions.length} missions. This cannot be undone.`,
    pathMap: {
      id: pathMap._id,
      name: pathMap.name,
      missionCount: pathMap.missions.length
    },
    // After confirmation, frontend will call existing deletePathMap endpoint
    deleteEndpoint: "/api/v1/pathMaps/delete",
    deletePayload: { id: pathMap._id }
  };
}

async function handleAddStation(args: any) {
  const { pathMapName, stationName, useCurrentPosition = true, x, y } = args;

  const pathMap = await pathMapModel.findOne({
    name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
  });

  if (!pathMap) {
    return {
      success: false,
      message: `PathMap '${pathMapName}' not found.`
    };
  }

  // Check if station already exists (using id as identifier)
  const stationExists = pathMap.stations.some((s: any) =>
    s.id.toLowerCase() === stationName.toLowerCase()
  );

  if (stationExists) {
    return {
      success: false,
      message: `Station '${stationName}' already exists in ${pathMap.name}. Choose a different name.`
    };
  }

  if (useCurrentPosition) {
    return {
      success: true,
      action: "add_station",
      message: `Ready to add station '${stationName}' to ${pathMap.name}`,
      pathMap: {
        id: pathMap._id,
        name: pathMap.name
      },
      stationName,
      needsRobotPosition: true,
      instruction: "Position the robot at the desired location, then confirm to save the station."
    };
  } else {
    if (x === undefined || y === undefined) {
      return {
        success: false,
        needsInput: true,
        message: `Please provide X and Y coordinates for station '${stationName}'.`
      };
    }

    // Add station with specified coordinates
    const updatedPathMap = await pathMapModel.findByIdAndUpdate(
      pathMap._id,
      {
        $push: {
          stations: {
            id: stationName,
            x: x,
            y: y,
            lat: 0, // TODO: Convert from x,y to lat/lng based on frame
            lng: 0,
            theta: 0 // Default orientation
          }
        }
      },
      { new: true }
    );

    return {
      success: true,
      message: `Added station '${stationName}' to ${pathMap.name} at position (${x}, ${y})`,
      pathMap: {
        id: updatedPathMap!._id,
        name: updatedPathMap!.name,
        stationCount: updatedPathMap!.stations.length
      }
    };
  }
}

async function handleRemoveStation(args: any) {
  const { pathMapName, stationName } = args;

  const pathMap = await pathMapModel.findOne({
    name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
  });

  if (!pathMap) {
    return {
      success: false,
      message: `PathMap '${pathMapName}' not found.`
    };
  }

  const station = pathMap.stations.find((s: any) =>
    s.id.toLowerCase() === stationName.toLowerCase()
  );

  if (!station) {
    return {
      success: false,
      message: `Station '${stationName}' not found in ${pathMap.name}.`
    };
  }

  // Check if used in any missions
  // This would require checking mission paths - implement if needed

  const updatedPathMap = await pathMapModel.findByIdAndUpdate(
    pathMap._id,
    {
      $pull: {
        stations: { _id: (station as any)._id }
      }
    },
    { new: true }
  );

  return {
    success: true,
    message: `Removed station '${stationName}' from ${pathMap.name}`,
    pathMap: {
      id: updatedPathMap!._id,
      name: updatedPathMap!.name,
      stationCount: updatedPathMap!.stations.length
    }
  };
}

async function handleRenameStation(args: any) {
  const { pathMapName, oldName, newName } = args;

  const pathMap = await pathMapModel.findOne({
    name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
  });

  if (!pathMap) {
    return {
      success: false,
      message: `PathMap '${pathMapName}' not found.`
    };
  }

  const stationIndex = pathMap.stations.findIndex((s: any) =>
    s.id.toLowerCase() === oldName.toLowerCase()
  );

  if (stationIndex === -1) {
    return {
      success: false,
      message: `Station '${oldName}' not found in ${pathMap.name}.`
    };
  }

  // Check if new name already exists
  const newNameExists = pathMap.stations.some((s: any) =>
    s.id.toLowerCase() === newName.toLowerCase()
  );

  if (newNameExists) {
    return {
      success: false,
      message: `Station '${newName}' already exists in ${pathMap.name}.`
    };
  }

  // Update station id (which serves as the name)
  pathMap.stations[stationIndex].id = newName;
  await pathMap.save();

  return {
    success: true,
    message: `Renamed station '${oldName}' to '${newName}' in ${pathMap.name}`,
    pathMap: {
      id: pathMap._id,
      name: pathMap.name
    }
  };
}

// ============================================================================
// MISSION CREATION IMPLEMENTATIONS
// ============================================================================

async function handleCreateMission(args: any) {
  const { pathMapName, missionName } = args;

  const pathMap = await pathMapModel.findOne({
    name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
  });

  if (!pathMap) {
    return {
      success: false,
      message: `PathMap '${pathMapName}' not found.`
    };
  }

  // Check if mission already exists
  const missionExists = pathMap.missions.some((m: any) =>
    m.name.toLowerCase() === missionName.toLowerCase()
  );

  if (missionExists) {
    return {
      success: false,
      message: `Mission '${missionName}' already exists in ${pathMap.name}. Choose a different name.`
    };
  }

  const updatedPathMap = await pathMapModel.findByIdAndUpdate(
    pathMap._id,
    {
      $push: {
        missions: {
          name: missionName,
          mission: []
        }
      }
    },
    { new: true }
  );

  return {
    success: true,
    message: `Created mission '${missionName}' in ${pathMap.name}. Ready to record path.`,
    pathMap: {
      id: updatedPathMap!._id,
      name: updatedPathMap!.name,
      missionCount: updatedPathMap!.missions.length
    },
    mission: {
      name: missionName
    },
    nextSteps: "Navigate the robot along the desired path, then say 'save mission' to record it."
  };
}

async function handleDeleteMission(args: any) {
  const { pathMapName, missionName } = args;

  const pathMap = await pathMapModel.findOne({
    name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
  });

  if (!pathMap) {
    return {
      success: false,
      message: `PathMap '${pathMapName}' not found.`
    };
  }

  const mission = pathMap.missions.find((m: any) =>
    m.name.toLowerCase() === missionName.toLowerCase()
  );

  if (!mission) {
    return {
      success: false,
      message: `Mission '${missionName}' not found in ${pathMap.name}.`
    };
  }

  return {
    success: true,
    action: "delete_mission",
    requiresConfirmation: true,
    confirmationMessage: `Delete mission '${missionName}' from ${pathMap.name}? This cannot be undone.`,
    pathMap: {
      id: pathMap._id,
      name: pathMap.name
    },
    mission: {
      id: (mission as any)._id,
      name: (mission as any).name
    },
    deleteEndpoint: "/api/v1/pathMaps/delete-mission",
    deletePayload: { pathMapId: pathMap._id, missionId: (mission as any)._id }
  };
}

// ============================================================================
// STUB IMPLEMENTATIONS (To be completed)
// ============================================================================

async function handleActivateRobot(args: any) {
  return { success: false, message: "Not implemented yet" };
}

async function handleDeactivateRobot(args: any) {
  return { success: false, message: "Not implemented yet" };
}

async function handleSetActiveOperator(args: any) {
  return { success: false, message: "Not implemented yet" };
}

async function handleCheckInOperator(args: any) {
  return { success: false, message: "Not implemented yet" };
}

async function handleCheckOutOperator(args: any) {
  return { success: false, message: "Not implemented yet" };
}

async function handleCreateQCSubmission(args: any, req: Request) {
  return { success: false, message: "Not implemented yet" };
}

async function handleRaiseRobotIssue(args: any, req: Request) {
  return { success: false, message: "Not implemented yet" };
}

async function handleCloseRobotIssue(args: any) {
  return { success: false, message: "Not implemented yet" };
}

async function handleExecuteFleetMission(args: any, req: Request) {
  return { success: false, message: "Not implemented yet" };
}

async function handleAbortAllMissions(args: any) {
  return { success: false, message: "Not implemented yet" };
}

async function handleDisambiguationChoice(args: any, req: Request) {
  // Disambiguation is handled by the conversation continuation via /command-text endpoint
  // When user sends choice as text, the conversation history provides context
  return {
    success: true,
    message: "Choice received. Processing...",
    choice: args.choice,
    disambiguationType: args.disambiguationType
  };
}

// ============================================================================
// LIST OPERATIONS
// ============================================================================

async function handleListPathmaps(args: any, req: Request) {
  const { filter } = args;
  const userId = req.user!.id;

  const query: any = { users: userId };
  if (filter) {
    const isFrame = ["utm", "odom", "lidar"].includes(filter.toLowerCase());
    if (isFrame) {
      query.frame = filter.toLowerCase();
    } else {
      query.name = { $regex: new RegExp(filter, "i") };
    }
  }

  const pathMaps = await pathMapModel.find(query, {
    name: 1,
    frame: 1,
    missions: 1,
    stations: 1
  }).limit(50);

  if (pathMaps.length === 0) {
    return {
      success: true,
      action: "list_pathmaps",
      message: filter
        ? `No pathmaps found matching '${filter}'.`
        : "No pathmaps found. Say 'create pathmap [name]' to get started.",
      pathmaps: []
    };
  }

  const list = pathMaps.map((pm, i) => ({
    number: i + 1,
    id: pm._id,
    name: pm.name,
    frame: pm.frame,
    missionCount: pm.missions?.length || 0,
    stationCount: pm.stations?.length || 0
  }));

  return {
    success: true,
    action: "list_pathmaps",
    message: `Found ${pathMaps.length} pathmap${pathMaps.length > 1 ? "s" : ""}:\n${list.map(pm => `${pm.number}. ${pm.name} (${(pm.frame || "utm").toUpperCase()}) — ${pm.missionCount} missions, ${pm.stationCount} stations`).join("\n")}`,
    pathmaps: list
  };
}

async function handleListMissions(args: any, req: Request) {
  const { pathMapName } = args;

  const pathMap = await pathMapModel.findOne({
    name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
  });

  if (!pathMap) {
    return {
      success: false,
      message: `PathMap '${pathMapName}' not found.`
    };
  }

  const missions = pathMap.missions;

  if (!missions || missions.length === 0) {
    return {
      success: true,
      action: "list_missions",
      message: `No missions in '${pathMap.name}'. Say 'create mission [name]' to add one.`,
      missions: []
    };
  }

  const list = missions.map((m: any, i: number) => ({
    number: i + 1,
    id: m._id,
    name: m.name,
    pathCount: m.mission?.length || 0
  }));

  return {
    success: true,
    action: "list_missions",
    message: `'${pathMap.name}' has ${missions.length} mission${missions.length > 1 ? "s" : ""}:\n${list.map((m: any) => `${m.number}. ${m.name} (${m.pathCount} paths)`).join("\n")}`,
    missions: list
  };
}

async function handleListStations(args: any) {
  const { pathMapName } = args;

  const pathMap = await pathMapModel.findOne({
    name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
  });

  if (!pathMap) {
    return {
      success: false,
      message: `PathMap '${pathMapName}' not found.`
    };
  }

  const stations = pathMap.stations;

  if (!stations || stations.length === 0) {
    return {
      success: true,
      action: "list_stations",
      message: `No stations in '${pathMap.name}'. Say 'add station [name]' to add one.`,
      stations: []
    };
  }

  const list = stations.map((s: any, i: number) => ({
    number: i + 1,
    id: s.id,
    name: s.id,
    x: s.x,
    y: s.y,
    lat: s.lat,
    lng: s.lng
  }));

  return {
    success: true,
    action: "list_stations",
    message: `'${pathMap.name}' has ${stations.length} station${stations.length > 1 ? "s" : ""}:\n${list.map((s: any) => `${s.number}. ${s.name}`).join("\n")}`,
    stations: list
  };
}

// ============================================================================
// SELECTION OPERATIONS
// ============================================================================

async function handleSelectPathMap(args: any, req: Request) {
  const { pathMapName } = args;
  const userId = req.user!.id;

  const pathMaps = await pathMapModel.find({
    users: userId,
    name: { $regex: new RegExp(pathMapName, "i") }
  }).limit(5);

  if (pathMaps.length === 0) {
    return {
      success: false,
      message: `PathMap '${pathMapName}' not found.`
    };
  }

  // Score and pick best match
  const scored = pathMaps.map(pm => ({
    pathMap: pm,
    score: scoreMatch(pathMapName, pm.name)
  })).sort((a, b) => b.score - a.score);

  if (scored.length > 1 && scored[0].score < 90) {
    return {
      success: false,
      needsDisambiguation: true,
      disambiguationType: "pathmap",
      query: pathMapName,
      message: `Multiple pathmaps found:\n${scored.slice(0, 5).map((s, i) => `${i + 1}. ${s.pathMap.name} (${s.pathMap.frame})`).join("\n")}\n\nWhich one?`,
      options: scored.slice(0, 5).map((s, i) => ({
        number: i + 1,
        name: s.pathMap.name,
        id: s.pathMap._id,
        frame: s.pathMap.frame
      }))
    };
  }

  const pm = scored[0].pathMap;

  return {
    success: true,
    action: "select_pathmap",
    message: `Selected pathmap '${pm.name}' (${(pm.frame || "utm").toUpperCase()}) with ${pm.missions?.length || 0} missions and ${pm.stations?.length || 0} stations.`,
    pathMap: {
      id: pm._id,
      name: pm.name,
      frame: pm.frame || "utm",
      missionCount: pm.missions?.length || 0,
      stationCount: pm.stations?.length || 0,
      fullObject: pm
    }
  };
}

async function handleSelectMission(args: any) {
  const { pathMapName, missionName } = args;

  const pathMap = await pathMapModel.findOne({
    name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
  });

  if (!pathMap) {
    return {
      success: false,
      message: `PathMap '${pathMapName}' not found.`
    };
  }

  const scored = pathMap.missions.map((m: any) => ({
    mission: m,
    score: scoreMatch(missionName, m.name)
  })).filter((s: any) => s.score >= 60)
     .sort((a: any, b: any) => b.score - a.score);

  if (scored.length === 0) {
    return {
      success: false,
      message: `Mission '${missionName}' not found in '${pathMap.name}'. Available: ${pathMap.missions.map((m: any) => m.name).join(", ")}`
    };
  }

  if (scored.length > 1 && scored[0].score < 90) {
    return {
      success: false,
      needsDisambiguation: true,
      disambiguationType: "mission",
      query: missionName,
      message: `Multiple missions match '${missionName}':\n${scored.slice(0, 5).map((s: any, i: number) => `${i + 1}. ${s.mission.name}`).join("\n")}\n\nWhich one?`,
      options: scored.slice(0, 5).map((s: any, i: number) => ({
        number: i + 1,
        name: s.mission.name,
        id: s.mission._id
      }))
    };
  }

  const mission = scored[0].mission;

  return {
    success: true,
    action: "select_mission",
    message: `Selected mission '${mission.name}' with ${mission.mission?.length || 0} paths.`,
    mission: {
      id: mission._id,
      name: mission.name,
      pathCount: mission.mission?.length || 0,
      fullObject: mission
    }
  };
}

// ============================================================================
// PATH RECORDING OPERATIONS
// ============================================================================

async function handleStartPathRecording(args: any) {
  const { pathMapName } = args;

  let pathMapContext: any = null;
  if (pathMapName) {
    pathMapContext = await pathMapModel.findOne({
      name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
    });
  }

  return {
    success: true,
    action: "start_recording",
    message: pathMapContext
      ? `Starting path recording for '${pathMapContext.name}'. Drive the robot along the desired path, then say 'stop recording' when done.`
      : "Starting path recording. Drive the robot along the desired path, then say 'stop recording' when done.",
    pathMapId: pathMapContext?._id,
    pathMapName: pathMapContext?.name
  };
}

async function handleStopPathRecording(args: any) {
  const { pathMapName } = args;

  let pathMapContext: any = null;
  if (pathMapName) {
    pathMapContext = await pathMapModel.findOne({
      name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
    });
  }

  return {
    success: true,
    action: "stop_recording",
    message: "Stopping path recording and saving...",
    pathMapId: pathMapContext?._id,
    pathMapName: pathMapContext?.name
  };
}

// ============================================================================
// MISSION PLANNING OPERATIONS
// ============================================================================

async function handleStartMissionPlanning(args: any) {
  const { missionName } = args;

  return {
    success: true,
    action: "start_planning",
    message: missionName
      ? `Starting mission planning for '${missionName}'. Click on path segments to add them to the mission.`
      : "Starting mission planning mode. Click on path segments to add them to the mission.",
    missionName
  };
}

async function handleStopMissionPlanning(args: any) {
  return {
    success: true,
    action: "stop_planning",
    message: "Mission planning stopped."
  };
}

async function handleSaveMission(args: any) {
  const { missionName, pathMapName } = args;

  let missionId: any = null;
  let pathMapId: any = null;

  if (missionName && pathMapName) {
    const pathMap = await pathMapModel.findOne({
      name: { $regex: new RegExp(`^${pathMapName}$`, "i") }
    });

    if (pathMap) {
      pathMapId = pathMap._id;
      const mission = pathMap.missions.find((m: any) =>
        m.name.toLowerCase() === missionName.toLowerCase()
      );
      if (mission) {
        missionId = (mission as any)._id;
      }
    }
  }

  return {
    success: true,
    action: "save_mission",
    message: missionName
      ? `Saving mission '${missionName}'...`
      : "Saving current mission...",
    missionId,
    pathMapId,
    missionName
  };
}

async function handleClearMissionPoints(args: any) {
  return {
    success: true,
    action: "clear_mission",
    message: "Mission points cleared. You can re-plan the mission."
  };
}

// ============================================================================
// STATUS OPERATIONS
// ============================================================================

async function handleGetMissionStatus(args: any, req: Request) {
  const { robotId } = args;

  let robot: any = null;
  if (robotId) {
    const robotVariations = normalizeRobotQuery(robotId);
    robot = await robotModel.findOne({
      $or: robotVariations.map(v => ({ name: { $regex: new RegExp(`^${v}$`, "i") } }))
    });
  }

  if (!robot && robotId) {
    return {
      success: false,
      message: `Robot '${robotId}' not found.`
    };
  }

  if (!robot) {
    return {
      success: true,
      action: "mission_status",
      message: "Check the mission control panel for mission status. The dashboard shows real-time execution progress.",
      robotId: null
    };
  }

  // Return basic status from DB (real-time comes from ROS)
  return {
    success: true,
    action: "mission_status",
    message: `${robot.name} status: ${robot.status || "unknown"}. Check the live dashboard for real-time mission progress.`,
    robot: {
      id: robot._id,
      name: robot.name,
      status: robot.status,
      robotType: robot.robotType
    }
  };
}

async function handleGetLocalizationStatus(args: any, req: Request) {
  const { robotId } = args;

  let robot: any = null;
  if (robotId) {
    const robotVariations = normalizeRobotQuery(robotId);
    robot = await robotModel.findOne({
      $or: robotVariations.map(v => ({ name: { $regex: new RegExp(`^${v}$`, "i") } }))
    });
  }

  if (!robot && robotId) {
    return {
      success: false,
      message: `Robot '${robotId}' not found.`
    };
  }

  return {
    success: true,
    action: "localization_status",
    message: robot
      ? `${robot.name} localization info is available in real-time on the dashboard. Check the GPS indicator and the localization panel.`
      : "Real-time localization status is shown in the dashboard's GPS and localization panels.",
    robot: robot ? {
      id: robot._id,
      name: robot.name,
      status: robot.status
    } : null,
    note: "Real-time localization data (isLocalized, GPS quality) is visible in the dashboard context."
  };
}
