import { toFile } from "openai";
import { Response, Request } from "express";
import asyncHandler from "express-async-handler";
import { openai } from "../services/ai";
import {
  availableAutonomyFunctions,
  executeAutonomyFunctionCall
} from "../services/autonomyAgentService";
import { conversationStateManager } from "../services/conversationStateManager";

/**
 * Autonomy Agent Controller - Command Executor
 *
 * Handles operational voice commands for creating, updating, and executing
 * fleet management tasks. Uses GPT-4o function calling for intelligent
 * command understanding and execution.
 */

// System prompt for the Autonomy Agent
const AUTONOMY_AGENT_PROMPT = `You are the COMMAND EXECUTOR for Flo Mobility fleet management system.

YOUR CORE ROLE:
- Execute operational tasks and commands
- Create, update, and delete entities (robots, pathmaps, missions, operators, etc.)
- Guide users through multi-step operations with clear feedback
- Confirm destructive actions before execution

CRITICAL RULES:
1. YOU CAN EXECUTE OPERATIONS - You have write access to the system
2. ALWAYS call functions FIRST even for destructive actions — the function returns requiresConfirmation if needed
3. GUIDE users step-by-step through complex operations
4. PROVIDE clear, actionable feedback at each step
5. YOU CAN ALSO LIST and CHECK STATUS - use listPathmaps, listMissions, listStations, getMissionStatus, getLocalizationStatus when users ask for information related to pathmaps, missions, stations, or robot status. ONLY redirect to the Information Assistant for requests about robots, operators, clients, issues that are outside your available functions.
6. ALWAYS call functions — NEVER just respond with text without calling a function. This includes cases where the robot or entity may not exist — ALWAYS CALL THE FUNCTION and let it handle the error.
7. NEVER refuse list/status requests — always call the appropriate list or status function.
8. Use Active Robot/PathMap/Mission from context when user doesn't specify — NEVER ask if context has it.
9. For addStationToPathMap: CALL THE FUNCTION IMMEDIATELY with pathMapName and stationName. Do NOT ask "should I use robot's current position?" — the function handles position automatically.

CRITICAL PERMISSION RULES - AUTONOMY AGENT RESTRICTIONS:
❌ YOU CANNOT ACCESS ANALYTICS OR TRIP STATISTICS
❌ YOU CANNOT NAVIGATE TO OTHER PAGES (dashboard, analytics, leads, billing, inventory)
❌ YOU CANNOT QUERY LEADS, CRM, BILLING, INVENTORY, SHIPPING, MATERIALS, OVERTIME DATA
❌ YOU CANNOT VIEW CLIENT DETAILS, OPERATOR DETAILS, OR GENERAL ROBOT INFORMATION

If user asks for analytics/trip stats/navigation:
→ Say: "I cannot access analytics or other pages. Please use the Master Agent (Information Assistant) at /api/v1/ai-agent/command-text for data queries and analytics."

WHAT YOU CAN DO:
✅ Execute and control robot missions (execute, abort, pause, resume)
✅ Create, delete, and manage pathmaps
✅ Create, delete, and manage missions
✅ Add/remove/rename stations in pathmaps
✅ Record paths and plan missions
✅ Configure robots (activate, deactivate, assign operators)
✅ Check-in/check-out operators
✅ Create QC submissions
✅ Raise and close robot issues
✅ List pathmaps, missions, and stations
✅ Check mission status and localization status

WHAT YOU CANNOT DO:
❌ Get trip statistics or analytics (getTripStats, getTripAnalytics)
❌ Navigate to analytics, dashboard, leads, billing pages
❌ Access CRM/leads data (searchLeads, getLeadDetails, getTotalACV)
❌ Access inventory, shipping, materials, billing data
❌ Get client or operator details beyond mission context
❌ View general robot information (use Master Agent for that)

YOUR ROLE: Mission Execution, Pathmap Management, and Operational Control ONLY

AVAILABLE OPERATIONS (38 functions):

**Mission Control:**
- executeRobotMission: Send robot to destination (requires robot, pathmap, mission, optional frame)
- abortRobotMission: Stop current mission (DESTRUCTIVE - confirm first)
- pauseRobotMission: Pause current mission
- resumeRobotMission: Resume paused mission
- returnRobotToStation: Send robot back to charging/home

**Pathmap Management:**
- createPathMap: Create new pathmap (requires name, frame: utm/odom/lidar)
- deletePathMap: Delete pathmap (DESTRUCTIVE - confirm first)
- addStationToPathMap: Add waypoint/station to pathmap
- removeStationFromPathMap: Remove station
- renameStation: Rename existing station

**Mission Creation:**
- createMission: Create new mission in pathmap
- deleteMission: Delete mission (DESTRUCTIVE - confirm first)

**Robot Configuration:**
- activateRobot: Enable robot for missions
- deactivateRobot: Disable robot (DESTRUCTIVE if mission running)
- setActiveOperator: Assign operator to robot

**Operator Management:**
- checkInOperator: Check in operator at site
- checkOutOperator: Check out operator

**QC Operations:**
- createQCSubmission: Start QC for robot

**Issue Management:**
- raiseRobotIssue: Create issue/ticket for robot
- closeRobotIssue: Resolve issue

**Batch Operations:**
- executeFleetMission: Send multiple robots on mission (CONFIRM first)
- abortAllMissions: Emergency stop all robots (CRITICAL - CONFIRM first)

**Disambiguation:**
- selectDisambiguationChoice: Choose from multiple matches

**List Operations (USE THESE for information requests about pathmaps/missions/stations):**
- listPathmaps: List all pathmaps (optionally filter by name or frame). USE when user asks "list pathmaps", "what pathmaps do I have", "show GPS pathmaps", etc.
- listMissions: List all missions in a pathmap. USE when user asks "list missions in X", "what missions does X have", etc.
- listStations: List all stations in a pathmap. USE when user asks "show stations in X", "what stations are in X", etc.

**Selection Operations:**
- selectPathMap: Switch the active pathmap on the dashboard
- selectMission: Switch the active mission on the dashboard

**Path Recording:**
- startPathRecording: Begin recording path on robot
- stopPathRecording: Stop recording and save path

**Mission Planning:**
- startMissionPlanning: Enter mission planning mode
- stopMissionPlanning: Exit mission planning mode
- saveMission: Save current mission paths
- clearMissionPoints: Clear all paths from current mission

**Status Operations (USE THESE for status queries):**
- getMissionStatus: Check mission execution status. USE when user asks "what is mission status", "is the mission running", etc.
- getLocalizationStatus: Check robot localization/GPS. USE when user asks "is robot localized", "GPS status", etc.

EXECUTION FLOW:

1. UNDERSTAND INTENT
   - Parse user command
   - Extract action + parameters
   - Identify which function to call

2. RESOLVE ENTITIES (from context first!)
   - If Active Robot/PathMap/Mission is in context AND user doesn't specify → use context values
   - Use smart matching for robots, pathmaps, missions
   - If multiple matches found: Present numbered options

3. COLLECT MISSING PARAMETERS (only if truly missing)
   - Check context first — if robotId is in context, USE IT, do not ask
   - Ask one question at a time only for genuinely missing info
   - Be conversational: "Which pathmap?" not "Specify pathmap parameter"

4. EXECUTE — ALWAYS CALL THE FUNCTION FIRST
   ⚡ CRITICAL: ALWAYS CALL THE FUNCTION. The function itself handles confirmation.
   - Do NOT ask "are you sure?" before calling — CALL THE FUNCTION FIRST
   - If the function returns requiresConfirmation=true, THEN present the confirmation message
   - NEVER ask for confirmation without first calling the function

5. PROVIDE FEEDBACK
   - Success: "Mission started. MMR-31 is heading to kitchen. ETA: 2 minutes."
   - Failure: "Failed to start mission. Error: Robot is offline."
   - Confirmation needed: Present the confirmationMessage from the function result
   - Next steps: "Say 'yes' to confirm or 'no' to cancel."

CONFIRMATION PATTERNS:

IMPORTANT: For ALL operations, including destructive ones — CALL THE FUNCTION FIRST.
The function will return { requiresConfirmation: true, confirmationMessage: "..." } for destructive ops.
You then present that message to the user. Do NOT skip the function call.

Examples:
✅ User: "abort mission"  →  [Call abortRobotMission(robotId: "MMR-31")]  →  Function returns requiresConfirmation  →  You present the message
✅ User: "delete pathmap test"  →  [Call deletePathMap(pathMapName: "test")]  →  Function returns requiresConfirmation  →  You present the message
✅ User: "send robot back to charging"  →  [Call returnRobotToStation(robotId: "MMR-31")]  →  Function returns requiresConfirmation  →  You present the message

❌ WRONG: User: "abort mission"  →  You ask "Are you sure?" WITHOUT calling any function — THIS IS WRONG
❌ WRONG: User: "delete pathmap"  →  You say "This will delete the pathmap, confirm?" WITHOUT calling any function — THIS IS WRONG

EXAMPLES:

**Simple Command:**
User: "Send MMR-31 to kitchen in office"
You: [Call executeRobotMission(robotId: "MMR-31", pathMapName: "office", missionName: "kitchen")]
Response: { success: true, message: "Sending MMR-31 to kitchen in office" }
You: "Mission started! MMR-31 is heading to kitchen in office. ETA: 2 minutes. Say 'pause' to pause or 'abort' to stop."

**Disambiguation:**
User: "Send robot 31 to test"
You: [Call executeRobotMission(robotId: "31", pathMapName: "", missionName: "test")]
Response: { needsDisambiguation: true, message: "I found 2 pathmaps with 'test':\n1. office-1\n2. warehouse-2", options: [...] }
You: "I found mission 'test' in 2 locations:\n1. office-1\n2. warehouse-2\n\nWhich one?"
User: "office"
You: [Call selectDisambiguationChoice(choice: "office", type: "pathmap")]
Response: { success: true, message: "Sending MMR-31 to test in office-1" }
You: "Got it! Sending MMR-31 to test in office-1."

**Multi-Step Operation:**
User: "Create a pathmap named warehouse in GPS mode"
You: [Call createPathMap(name: "warehouse", frame: "utm")]
Response: { success: true, message: "Created pathmap 'warehouse' in UTM frame", nextSteps: "..." }
You: "Perfect! I've created the 'warehouse' pathmap in GPS mode. The pathmap is ready. To add locations, say 'add station named [name]' or start recording a path by saying 'create mission'."

**Complex Command:**
User: "Create pathmap office in GPS, add station kitchen, then create mission delivery"
You: [Call createPathMap(name: "office", frame: "utm")]
Response: { success: true }
You: "Created pathmap 'office' in GPS mode. Now adding the kitchen station..."
You: [Call addStationToPathMap(pathMapName: "office", stationName: "kitchen")]
Response: { success: true, needsRobotPosition: true }
You: "Position the robot at the kitchen location, then confirm. Should I use the current position?"
User: "yes"
You: [Frontend will capture position and save]
You: "Kitchen station added. Now creating the delivery mission..."
You: [Call createMission(pathMapName: "office", missionName: "delivery")]
Response: { success: true }
You: "All done! Pathmap 'office' created with kitchen station, and mission 'delivery' is ready. Navigate the path and say 'save mission' to record it."

**Destructive Action:**
User: "Delete pathmap test"
You: [Call deletePathMap(pathMapName: "test")]
Response: { requiresConfirmation: true, message: "Delete pathmap 'test'? This will remove 3 missions..." }
You: "Delete pathmap 'test'? This will remove 3 missions. This cannot be undone. Confirm deletion?"
User: "yes"
You: [Frontend executes deletion]
You: "Pathmap 'test' has been deleted along with its 3 missions."

**Batch Operation:**
User: "Send all idle T1 robots to charging"
You: [Call executeFleetMission(fleetType: "T1", status: "idle", missionName: "charging")]
Response: { success: true, robotCount: 5, robots: [...], requiresConfirmation: true }
You: "I found 5 idle T1 robots:\n• MMR-12\n• MMR-15\n• MMR-18\n• MMR-21\n• MMR-24\n\nSend all 5 to charging station?"
User: "yes"
You: [Execute batch]
You: "Executing... MMR-12 started ✓ ... MMR-15 started ✓ ... MMR-18 started ✓ ... MMR-21 started ✓ ... MMR-24 failed ✗ (offline). 4 out of 5 robots heading to charging."

**Error Handling:**
User: "Send MMR-99 to kitchen"
You: [Call executeRobotMission(robotId: "MMR-99", ...)]
Response: { success: false, message: "Robot 'MMR-99' not found..." }
You: "I couldn't find robot 'MMR-99'. Please check the robot name. Try 'MMR-31' or ask the Information Assistant to list available robots."

**List Operation:**
User: "List all pathmaps"
You: [Call listPathmaps()]
Response: { success: true, message: "Found 3 pathmaps:\n1. office (UTM)\n2. warehouse (UTM)\n3. test (ODOM)", pathmaps: [...] }
You: "You have 3 pathmaps:\n1. office (GPS)\n2. warehouse (GPS)\n3. test (indoor)"

**Status Check:**
User: "Is the robot localized?"
You: [Call getLocalizationStatus(robotId: <active robot from context>)]
Response: { success: true, message: "MMR-31 localization info..." }
You: "MMR-31 is localized according to the context. Check the GPS indicator on the dashboard."

**Context-Aware Command:**
User: "Stop it" (when Active Robot=MMR-31, Mission Executing=YES)
You: [Call abortRobotMission(robotId: "MMR-31")]
Response: { requiresConfirmation: true, confirmationMessage: "Abort mission on MMR-31?" }
You: "Abort mission on MMR-31? Say 'yes' to confirm."

**Information Request - Redirect to Master Agent:**
User: "Show me all robots" OR "Show analytics" OR "Trip stats for client X" OR "Show dashboard"
You: "I'm the Mission Execution specialist for operational tasks only. I cannot access analytics, trip statistics, or other pages. Please use the Master Agent (Information Assistant) at /api/v1/ai-agent/command-text for:
• Analytics and trip statistics
• Viewing robot, client, operator information
• Navigating to dashboard, leads, billing, inventory pages
• CRM and business data

I can help with:
• Executing missions ('send MMR-31 to kitchen')
• Managing pathmaps ('create pathmap office', 'list pathmaps')
• Managing missions ('create mission', 'list missions in office')
• Operational control ('abort mission', 'pause', 'resume')"

**Frame-Specific Command:**
User: "Execute mission to warehouse dock in outdoor mode"
You: [Call executeRobotMission(pathMapName: "warehouse", missionName: "dock", frame: "utm")]
Response: { success: true }
You: "Mission started in GPS mode (UTM frame). Robot heading to dock in warehouse."

VOICE FEEDBACK STYLE:
- Be concise but informative
- Use action words: "Sending...", "Created...", "Deleted..."
- Give ETAs when available
- Confirm what was done: "MMR-31 is heading to kitchen"
- Suggest next actions: "Say 'pause' to pause"
- For errors: Explain what went wrong + suggest fix

REMEMBER:
- ALWAYS call functions, NEVER just respond with text
- Confirm destructive actions
- Guide through multi-step operations
- Be conversational and helpful
- Focus on EXECUTION, not information retrieval`;

/**
 * Retry wrapper for OpenAI API calls with exponential backoff
 * Handles 429 rate limit errors automatically
 */
async function retryOpenAICall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429)
      const isRateLimit = error?.status === 429 ||
                          error?.code === 'rate_limit_exceeded' ||
                          error?.message?.toLowerCase().includes('rate limit');

      if (!isRateLimit || attempt === maxRetries - 1) {
        // If not rate limit or last attempt, throw immediately
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⏳ Rate limited (429), retrying in ${delay/1000}s... (attempt ${attempt + 1}/${maxRetries})`);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Build dynamic context block string from parsed context object
 * Injects dashboard state into the system prompt so GPT-4o knows
 * which robot, pathmap, and mission are currently active
 */
function buildContextBlock(context: any): string {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }

  const lines: string[] = ["\n\n--- CURRENT DASHBOARD CONTEXT ---"];

  if (context.robotId || context.robotName) {
    lines.push(`Active Robot: ${context.robotName || context.robotId}${context.robotType ? ` (${context.robotType})` : ""}${context.robotStatus ? ` [${context.robotStatus}]` : ""}`);
    lines.push(`Robot Connected: ${context.isRobotConnected ? "YES" : "NO"}`);
    if (!context.isRobotConnected) {
      lines.push(`⚠️ Robot not connected - BUT STILL CALL FUNCTIONS. Let the function handle the error.`);
    }
  } else {
    lines.push("Active Robot: None selected");
  }

  if (context.pathMapId || context.pathMapName) {
    lines.push(`Active PathMap: ${context.pathMapName || context.pathMapId}${context.pathMapFrame ? ` (${context.pathMapFrame} frame)` : ""}`);
  } else {
    lines.push("Active PathMap: None selected");
  }

  if (context.missionId || context.missionName) {
    lines.push(`Active Mission: ${context.missionName || context.missionId}`);
  } else {
    lines.push("Active Mission: None selected");
  }

  if (context.isMissionExecuting !== undefined) {
    lines.push(`Mission Executing: ${context.isMissionExecuting ? "YES" : "NO"}`);
  }
  if (context.isPathMapping !== undefined) {
    lines.push(`Path Recording Active: ${context.isPathMapping ? "YES" : "NO"}`);
  }
  if (context.isMissionPlanning !== undefined) {
    lines.push(`Mission Planning Active: ${context.isMissionPlanning ? "YES" : "NO"}`);
  }
  if (context.isLocalized !== undefined) {
    lines.push(`Robot Localized: ${context.isLocalized ? "YES" : "NO"}`);
  }
  if (context.isNonRTKMode !== undefined) {
    lines.push(`Non-RTK Mode: ${context.isNonRTKMode ? "YES" : "NO"}`);
  }

  lines.push("");
  lines.push("IMPORTANT CONTEXT RULES:");
  lines.push("- When user says 'abort', 'pause', 'resume', 'stop', 'send it' WITHOUT specifying a robot — use the Active Robot above automatically.");
  lines.push("- When user references 'this pathmap', 'current pathmap', 'it', 'the pathmap' — use the Active PathMap above.");
  lines.push("- When user references 'this mission', 'current mission', 'the mission' — use the Active Mission above.");
  lines.push("- If mission is executing and user says 'stop' or 'abort' — call abortRobotMission with Active Robot.");
  lines.push("- If robot name/id is in context, ALWAYS prefer it over asking the user.");
  lines.push("- For 'add station [name] here' — pathmap = Active PathMap, position = current robot position (call addStationToPathMap immediately).");
  lines.push("- If Active PathMap is set and user says 'list missions' — use Active PathMap as pathMapName.");
  lines.push("");
  lines.push("⚠️ CRITICAL: ALWAYS CALL FUNCTIONS EVEN IF CONTEXT SHOWS ISSUES:");
  lines.push("- If 'Robot Connected: NO' — STILL call mission control functions (resume, pause, abort, execute). Let the function return the error.");
  lines.push("- If 'Mission Executing: NO' — STILL call abort/pause if user requests it. Let the function handle it.");
  lines.push("- If 'Robot Localized: NO' — STILL call navigation functions. Let the function decide if it's safe.");
  lines.push("- NEVER make decisions based on context status. ALWAYS call the function first. The function will return appropriate errors.");
  lines.push("--- END CONTEXT ---");

  return lines.join("\n");
}

/**
 * Core function to process a text query through GPT-4o with function calling
 * Used by both voice command and text command handlers
 */
async function processTextQuery(
  userQuery: string,
  req: Request,
  existingConversationId?: string,
  context?: any
) {
  const conversationId = existingConversationId || `autonomy_conv_${Date.now()}`;
  const conversationState = conversationStateManager.getOrCreate(conversationId, userQuery);

  // Build dynamic system prompt with context
  const contextBlock = context ? buildContextBlock(context) : "";
  const systemPrompt = AUTONOMY_AGENT_PROMPT + contextBlock;

  const messages: any[] = [
    {
      role: "system",
      content: systemPrompt
    }
  ];

  // Add conversation history if exists
  if (conversationState.messageHistory && conversationState.messageHistory.length > 0) {
    conversationState.messageHistory.forEach((msg: any) => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
  }

  // Add current user message
  messages.push({
    role: "user",
    content: userQuery
  });

  // Update conversation history
  conversationState.messageHistory = conversationState.messageHistory || [];
  conversationState.messageHistory.push({
    role: "user",
    content: userQuery,
    timestamp: new Date()
  });

  // Initial GPT call with retry logic for rate limiting
  let aiResponse = await retryOpenAICall(() =>
    openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      tools: availableAutonomyFunctions.map(f => ({
        type: "function" as const,
        function: f
      })),
      tool_choice: "auto",
      temperature: 0.1  // Low temperature for consistent function calling behavior
    })
  );

  let finalMessage = aiResponse.choices[0].message;
  console.log("Initial AI response:", {
    hasContent: !!finalMessage.content,
    content: finalMessage.content,
    hasToolCalls: !!finalMessage.tool_calls,
    toolCalls: finalMessage.tool_calls
  });

  const executedFunctions: any[] = [];
  const maxIterations = 10;
  let iterations = 0;
  let needsUserInput = false;
  let disambiguationData: any = null;
  let requiresConfirmation = false;
  let confirmationData: any = null;

  while (finalMessage.tool_calls && finalMessage.tool_calls.length > 0 && iterations < maxIterations) {
    iterations++;

    messages.push({
      role: "assistant",
      content: null,
      tool_calls: finalMessage.tool_calls
    });

    for (const toolCall of finalMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

      console.log(`Calling function: ${functionName}`, functionArgs);

      const functionResult = await executeAutonomyFunctionCall(
        functionName,
        functionArgs,
        req
      );

      console.log(`Function result:`, functionResult);

      executedFunctions.push({
        function: functionName,
        arguments: functionArgs,
        result: functionResult
      });

      if (functionResult.needsDisambiguation) {
        needsUserInput = true;
        disambiguationData = {
          type: functionResult.disambiguationType,
          query: functionResult.query,
          options: functionResult.options,
          message: functionResult.message,
          context: functionResult.context
        };
      }

      if (functionResult.requiresConfirmation) {
        requiresConfirmation = true;
        confirmationData = {
          message: functionResult.confirmationMessage,
          action: functionResult.action,
          data: functionResult
        };
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(functionResult)
      });
    }

    if (needsUserInput || requiresConfirmation) {
      conversationState.status = needsUserInput ? 'awaiting_disambiguation' : 'awaiting_confirmation';
      conversationState.disambiguationData = disambiguationData || confirmationData;
      conversationStateManager.update(conversationId, conversationState);
      break;
    }

    // Follow-up GPT call with retry logic
    aiResponse = await retryOpenAICall(() =>
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        tools: availableAutonomyFunctions.map(f => ({
          type: "function" as const,
          function: f
        })),
        tool_choice: "auto",
        temperature: 0.1  // Low temperature for consistent function calling behavior
      })
    );

    finalMessage = aiResponse.choices[0].message;
  }

  conversationState.messageHistory.push({
    role: "assistant",
    content: finalMessage.content || "",
    timestamp: new Date()
  });
  conversationStateManager.update(conversationId, conversationState);

  const executionData = executedFunctions.find(
    f => f.function === "executeRobotMission" && f.result.success
  );

  const missionControlData = executedFunctions.find(
    f => ["abortRobotMission", "pauseRobotMission", "resumeRobotMission", "returnRobotToStation"].includes(f.function)
  );

  return {
    success: true,
    response: finalMessage.content || "Command processed",
    executedFunctions,
    conversationId,
    executionData: executionData?.result || null,
    missionControlData: missionControlData?.result || null,
    needsInput: needsUserInput || requiresConfirmation,
    disambiguationData,
    confirmationData,
    iterations,
    messageCount: messages.length
  };
}

/**
 * Handle Autonomy Agent voice command
 * @route POST /api/v1/autonomy-agent/command
 */
export const handleAutonomyCommand = asyncHandler(
  async (req: Request, res: Response) => {
    const { file } = req;
    const existingConversationId = req.body.conversationId;
    const contextRaw = req.body.context;
    const context = contextRaw ? JSON.parse(contextRaw) : null;

    if (!file) {
      res.status(400);
      throw new Error("Missing audio file");
    }

    try {
      // Step 1: Transcribe audio using Whisper
      console.log("Step 1: Transcribing audio...");
      const transcription = await openai.audio.transcriptions.create({
        file: await toFile(file.buffer, "audio.wav"),
        model: "whisper-1",
        language: "en", // Restrict to English only (ISO-639-1 code)
        prompt: "Robot commands: MMR, pathmap, mission, station, kitchen, office, warehouse" // Context for better accuracy
      });

      if (!transcription || !transcription.text) {
        res.status(400).json({
          success: false,
          error: "Audio transcription failed"
        });
        return;
      }

      const userQuery = transcription.text;
      console.log("Transcription:", userQuery);

      // Step 2: Process with GPT-4o using function calling
      console.log("Step 2: Processing command with GPT-4o...");

      const result = await processTextQuery(userQuery, req, existingConversationId, context);

      // Step 3: Send response
      console.log("Step 3: Sending response");

      res.status(200).json({
        ...result,
        transcription: userQuery
      });

    } catch (error: any) {
      console.error("Autonomy Agent Error:", error);

      res.status(500).json({
        success: false,
        error: error.message || "Command processing failed",
        details: error.response?.data || null
      });
    }
  }
);

/**
 * Get conversation history for debugging
 * @route GET /api/v1/autonomy-agent/conversation/:conversationId
 */
export const getConversationHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;

    const conversation = conversationStateManager.getOrCreate(conversationId);

    res.status(200).json({
      success: true,
      conversation: {
        id: conversation.conversationId,
        status: conversation.status,
        messageCount: conversation.messageHistory?.length || 0,
        messages: conversation.messageHistory || [],
        disambiguationData: conversation.disambiguationData || null
      }
    });
  }
);

/**
 * Clear conversation (reset)
 * @route DELETE /api/v1/autonomy-agent/conversation/:conversationId
 */
export const clearConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;

    conversationStateManager.delete(conversationId);

    res.status(200).json({
      success: true,
      message: "Conversation cleared"
    });
  }
);

/**
 * Handle Autonomy Agent text command (for disambiguation choices)
 * Continues an existing conversation with a text input (no audio)
 * @route POST /api/v1/autonomy-agent/command-text
 */
export const handleAutonomyTextCommand = asyncHandler(
  async (req: Request, res: Response) => {
    const { text, conversationId, context } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "Missing or invalid text"
      });
      return;
    }

    if (!conversationId) {
      res.status(400).json({
        success: false,
        error: "conversationId is required for text commands"
      });
      return;
    }

    try {
      console.log(`[Text Command] conversationId=${conversationId}, text="${text}"`);

      const result = await processTextQuery(
        text.trim(),
        req,
        conversationId,
        context || null
      );

      res.status(200).json({
        ...result,
        transcription: text.trim() // Use text directly as "transcription"
      });

    } catch (error: any) {
      console.error("Autonomy Text Command Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Text command processing failed",
        details: error.response?.data || null
      });
    }
  }
);
