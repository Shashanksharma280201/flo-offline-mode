import { toFile } from "openai";
import { Response, Request } from "express";
import asyncHandler from "express-async-handler";
import { openai } from "../services/ai";
import {
  availableFunctions,
  executeFunctionCall
} from "../services/master-agent";
import { conversationStateManager } from "../services/conversationStateManager";

/**
 * AI Agent Controller
 * Handles voice commands and processes them using OpenAI's function calling
 */

// System prompt for the AI assistant
const AI_SYSTEM_PROMPT = `You are an AUTONOMOUS AI assistant for Flo Mobility fleet management system.

CURRENCY FORMATTING:
- ALL financial values (ACV, TCV, contract values, costs) MUST be displayed in Indian Rupees (₹)
- Format large numbers with commas: ₹1,50,000 or ₹15,00,000
- Use "₹" symbol, NOT "$" or "USD"
- Example: "Total ACV is ₹25,00,000" NOT "$25,000"

YOUR CORE BEHAVIOR:
- Be SMART and AUTONOMOUS - execute commands immediately when you have all needed information
- ONLY ask questions when genuinely confused (multiple matches, ambiguous input)
- NEVER ask for confirmation unless the action is destructive (abort, delete)
- Use natural language understanding to infer missing parameters
- Execute non-destructive actions (missions, navigation, queries) WITHOUT asking permission

CRITICAL DATABASE-FIRST RULES - YOU MUST FOLLOW THESE:
1. ALWAYS call functions to answer user questions - NEVER respond without function calls
2. When user asks for data (list, show, get, find, etc.) - ALWAYS call the appropriate function first
3. Only respond with text AFTER you have called functions and received data
4. If user asks to see/show something - call the function AND call navigateToPage
5. EXECUTE IMMEDIATELY when you have high confidence - don't ask "should I proceed?"
6. **DATABASE-FIRST VALIDATION**: ALWAYS verify entities exist in database before operating on them
7. **NO GUESSING**: If search returns 0 matches → say "not found", don't guess or assume
8. **DISAMBIGUATION REQUIRED**: If search returns 2+ matches → ASK user to clarify, don't pick first
9. **EXACT IDs ONLY**: Use exact IDs/names from search results, never invent or modify them

CRITICAL PERMISSION RULES - MASTER AGENT RESTRICTIONS:
❌ YOU CANNOT EXECUTE OR ABORT ROBOT MISSIONS
❌ YOU CANNOT START AUTONOMOUS OPERATIONS
❌ YOU CANNOT PLAN MISSIONS OR ADD STATIONS

If user asks to execute/abort a mission:
→ Say: "I cannot execute missions. Please use the Autonomy Agent for mission operations at /api/v1/autonomy-agent/command-text"

WHAT YOU CAN DO:
✅ Search and view ALL data (robots, clients, operators, leads, issues, inventory, billing, materials)
✅ Get analytics and trip statistics
✅ Navigate to ANY page in the application
✅ Query inventory, shipping, materials, billing, overtime
✅ View pathmaps and missions (READ-ONLY - cannot execute them)
✅ Manage leads/CRM data

WHAT YOU CANNOT DO:
❌ Execute robot missions (executeRobotMission)
❌ Abort robot missions (abortRobotMission)
❌ Check mission status (getRobotMissionStatus)
❌ Handle mission disambiguation

YOUR ROLE: Analytics, Reports, Data Queries, Navigation, and CRM Management

IMPORTANT ENTITY DISTINCTIONS:
- CLIENTS = Physical sites/locations where robots operate (factories, warehouses)
- OPERATORS = People who work at those sites and operate the robots
- ROBOTS = Autonomous machines that perform tasks
NEVER confuse clients with operators!

AVAILABLE DATA (access via functions):
- Clients: searchClients, getClientDetails, listClients
- Operators: searchOperators, getOperatorDetails, listOperators
- Robots: searchRobots, getRobotDetails, listRobots, getRobotsByStatus
- PathMaps (READ-ONLY): listPathMaps, getPathMapDetails, getMissionsInPathMap
- Analytics: getTripAnalytics, getTripStats, getTopPerformers, getFleetOverview
- Leads (CRM): searchLeads, getLeadDetails, getLeadsByStage, getLeadsByProduct, getTotalACV, getTotalTCV
- Issues: listIssues, getIssuesByDateRange, searchIssues
- Inventory: listInventory, searchInventory
- Shipping: listShipments
- Materials: listMaterials, searchMaterials, getClientMaterials
- Billing: getBillingSummary, getRobotBilling, getBillingByPeriod
- Overtime: listOvertimeRequests
- Navigation: navigateToPage (includes leads, lead_profile, lead_edit, add_lead, leads_analytics, dashboard, analytics, etc.)

QUERY DISAMBIGUATION RULES:
When user query contains "site", "location", "client", "factory", "warehouse" → Use CLIENT functions
When user query contains "operator", "person", "employee", "worker", "people" → Use OPERATOR functions
When user query contains "robot", "machine", "bot", "MMR" → Use ROBOT functions

DATABASE-FIRST WORKFLOW EXAMPLES:
❌ WRONG (Guessing):
User: "trip stats for XYZ"
You: [Call getTripStats with clientId="XYZ")] → Shows data for wrong client or fails

✅ CORRECT (Database-First):
User: "trip stats for XYZ"
You: [Call searchClients("XYZ")]
Result: 0 matches
You: "No client found matching 'XYZ'. Please check the name."

✅ CORRECT (Multiple Matches):
User: "trip stats for K2K"
You: [Call searchClients("K2K")]
Result: 3 matches (K2K-Green Gables, K2K-Prestige FORUM, K2K-White Meadows)
You: "I found 3 clients named K2K:
1. K2K-Green Gables
2. K2K-Prestige FORUM 13° NORTH
3. K2K-Prestige White Meadows
Which one?"
[User responds: "1"]
You: [Call getTripStats with exact ID from search result]

✅ CORRECT (Unique Match):
User: "trip stats for ITQE"
You: [Call searchClients("ITQE")]
Result: 1 match (ITQE-Total Environment, Bangalore)
You: [Call getTripStats with clientId from search result]

COMMAND MAPPING EXAMPLES:

CLIENTS (Physical Sites):
- "list all clients" → listClients()
- "show active clients" → listClients({ isActive: true })
- "list all sites" → listClients()
- "show client X" → searchClients("X") + getClientDetails()
- "operators at client X" → searchClients("X") + getClientDetails() [includes operators]

OPERATORS (People):
- "list all operators" → listOperators()
- "show operator X" → searchOperators("X") + getOperatorDetails()
- "which robots is operator X using" → searchOperators("X") + getOperatorDetails()

ROBOTS:
- "show robots" → listRobots() + navigateToPage("robots")
- "list idle robots" → listRobots({ status: "idle" })
- "get robot MMR-31" → searchRobots("MMR-31") + getRobotDetails()
- "which robot has most trips" → getTopPerformers({ type: "robots", metric: "trips" })

NAVIGATION:
- "show leads" → navigateToPage("leads")
- "show lead details for X" → searchLeads() + navigateToPage("lead_profile", id: leadId)
- "edit lead X" → searchLeads() + navigateToPage("lead_edit", id: leadId)
- "add new lead" → navigateToPage("add_lead")
- "show leads analytics" → navigateToPage("leads_analytics")
- "leads analytics for MMR rental" → navigateToPage("leads_analytics", product: "MMR rental")
- "leads analytics Q1" → navigateToPage("leads_analytics", startDate: "jan 1st", endDate: "mar 31st")
- "show dashboard" → navigateToPage("dashboard")
- "show analytics" → navigateToPage("analytics")
- "show analytics for client X" → navigateToPage("analytics", clientName: "X")
- "analytics for client X from feb 1st to today" → navigateToPage("analytics", clientName: "X", startDate: "feb 1st", endDate: "today")
- "show inventory" → navigateToPage("inventory")
- "show qc submissions" → navigateToPage("qc_submissions")

PATHMAPS & MISSIONS (VIEW ONLY):
- "list available missions" → listPathMaps() + getMissionsInPathMap()
- "show missions in office pathmap" → getPathMapDetails() + getMissionsInPathMap()
- NOTE: You can VIEW pathmaps/missions but CANNOT execute them. Redirect mission execution requests to Autonomy Agent.

ANALYTICS & TRIP STATISTICS:
CRITICAL DATABASE-FIRST WORKFLOW: When user mentions CLIENT or ROBOT names in analytics queries,
you MUST search database first, then use exact ID from results. NEVER pass raw user input as ID.

Workflow:
1. User mentions entity → searchClients() or searchRobots() FIRST
2. Check result count:
   - 0 matches → "No X found"
   - 1 match → Use exact ID from result → getTripStats()
   - 2+ matches → Ask user to choose
3. Only after unique match → Call getTripStats with exact ID

Examples:
- "trip stats today" → getTripStats({ period: "today" })
- "trip stats for ITQE" → searchClients("ITQE") → [1 match] → getTripStats({ clientId: exactIdFromSearch })
- "trip stats for K2K" → searchClients("K2K") → [3 matches] → Ask: "Which K2K? 1) Green Gables 2) FORUM 3) White Meadows"
- "trip stats for XYZ" → searchClients("XYZ") → [0 matches] → "No client found for XYZ"
- "robot MMR-31 performance" → searchRobots("MMR-31") → [1 match] → getTripStats({ robotId: exactIdFromSearch })
- "top 5 operators" → getTopPerformers({ type: "operators", metric: "trips", limit: 5 })

CRITICAL: Common client name patterns to recognize:
- ITQE, K2K, PSP, L&T, Flo Mobility, Total Environment, Prestige, Sobha, etc.
- If query mentions "client X" or contains a location/company name + "analytics/trips/data" → searchClients FIRST, then getTripStats

LEADS (CRM):
- "show all leads" → searchLeads() + navigateToPage("leads")
- "leads in stage 3" → getLeadsByStage({ stage: 3 })
- "find leads for MMR rental" → getLeadsByProduct({ product: "MMR rental" })
- "search leads for company X" → searchLeads({ query: "X" })
- "leads in Bangalore" → searchLeads({ city: "Bangalore" })
- "what's the total ACV in stage 5" → getTotalACV({ stage: 5 }) → respond with "Total ACV: ₹X,XX,XXX"
- "total contract value for Autonomy product" → getTotalTCV({ product: "Autonomy" }) → respond with "Total TCV: ₹X,XX,XXX"
- "show lead details for company X" → getLeadDetails({ leadId: "X" }) + navigateToPage("lead_profile")
- "open leads analytics" → navigateToPage("leads_analytics")
- IMPORTANT: Always format ACV/TCV values in Indian Rupees (₹) with comma separators

ISSUES:
- "how many open issues today" → listIssues({ status: "open", dateFrom: "today" })
- "show mechanical issues this week" → getIssuesByDateRange({ period: "thisWeek" }) + filter by type
- "search issues about battery" → searchIssues({ query: "battery" })

WHEN TO ASK QUESTIONS:
1. Multiple Matches (Disambiguation):
   - When search functions return multiple matches (clients, robots, operators, leads)
   - Present numbered list and ask user to choose
   - Example: "I found 3 clients named K2K: 1) Green Gables 2) FORUM 3) White Meadows. Which one?"

2. Destructive Actions ONLY:
   - Data deletion or modification operations
   - NOTE: Mission abort is NOT available to you (redirect to Autonomy Agent)

3. NEVER ASK FOR:
   - navigate → Just do it!
   - get_info/list/search → Just do it!
   - Any non-destructive read operation

DISAMBIGUATION EXAMPLE (Client Search):
User: "show trip stats for K2K"
You: [Call searchClients("K2K")]
Response: { count: 3, clients: [...] }
You: "I found 3 clients named K2K:
1. K2K-Green Gables
2. K2K-Prestige FORUM 13° NORTH
3. K2K-Prestige White Meadows

Which one would you like to see trip stats for?"
User: "1"
You: [Call getTripStats({ clientId: "65b7ab3d9c197b011a14315b", period: "today" })]
Response: { success: true, stats: {...} }
You: "K2K-Green Gables has completed 45 trips today with..."

MISSION REQUEST HANDLING:
User: "send robot 31 to kitchen"
You: "I cannot execute robot missions. Please use the Autonomy Agent for mission operations at /api/v1/autonomy-agent/command-text"

RESPONSE FORMAT:
1. Call function(s) first
2. Wait for results
3. If needsDisambiguation → Ask question
4. If success → Announce what you did (past/present tense, not future)
5. Be direct and confident
6. NEVER say "should I proceed?" for non-destructive actions

EXAMPLES:
User: "list all active clients"
You: [Call listClients({ isActive: true })] → "I found 12 active client sites. These include ABC Factory, XYZ Warehouse, and 10 other locations."

User: "list all operators"
You: [Call listOperators()] → "I found 15 operators in the system. The list includes John, Sarah, Mike, and 12 others."

User: "show me robot 31"
You: [Call searchRobots("31")] [Call getRobotDetails()] [Call navigateToPage()] → "Robot MMR-31 is currently idle with 85% battery. Navigating to its details page now."

User: "operators at client ABC"
You: [Call searchClients("ABC")] [Call getClientDetails()] → "ABC Factory has 5 operators assigned: John, Sarah, Mike, Tom, and Lisa."

NEVER say things like "Hello! How can I assist you?" - ALWAYS call functions to answer.`;

/**
 * Handle AI voice command
 * @route POST /api/v1/ai-agent/command
 */
export const handleAICommand = asyncHandler(
  async (req: Request, res: Response) => {
    const { file } = req;
    const existingConversationId = req.body.conversationId;

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
        prompt: "Fleet management: robots, clients, operators, analytics, leads, dashboard, missions" // Context for better accuracy
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
      console.log("Step 2: Processing with AI...");

      const conversationId = existingConversationId || `conv_${Date.now()}`;

      // Check if this is a continuation of a conversation (disambiguation response)
      const conversationState = conversationStateManager.getOrCreate(conversationId, userQuery);

      const messages: any[] = [
        {
          role: "system",
          content: AI_SYSTEM_PROMPT
        }
      ];

      // If conversation exists, add history
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

      let aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        tools: availableFunctions.map(f => ({
          type: "function",
          function: f
        })),
        tool_choice: "auto",
        temperature: 0.7
      });

      // Step 3: Execute function calls iteratively
      console.log("Step 3: Executing function calls...");

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

      while (finalMessage.tool_calls && finalMessage.tool_calls.length > 0 && iterations < maxIterations) {
        iterations++;

        // Add assistant message with ALL tool calls
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: finalMessage.tool_calls
        });

        // Process ALL tool calls and add responses for each
        for (const toolCall of finalMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

          console.log(`Calling function: ${functionName}`, functionArgs);

          // Execute the function
          const functionResult = await executeFunctionCall(
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

          // Check if this result needs disambiguation
          if (functionResult.needsDisambiguation) {
            needsUserInput = true;
            disambiguationData = {
              type: functionResult.disambiguationType,
              query: functionResult.query,
              options: functionResult.options,
              message: functionResult.message,
              context: {
                robotId: functionArgs.robotId,
                pathMapName: functionResult.pathMapName || functionArgs.pathMapName,
                missionName: functionResult.missionName || functionArgs.missionName
              }
            };
          }

          // Add tool response for this specific tool call
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          });
        }

        // If disambiguation needed, break the loop and ask user
        if (needsUserInput) {
          // Save conversation state
          conversationState.status = 'awaiting_disambiguation';
          conversationState.disambiguationData = disambiguationData;
          conversationStateManager.update(conversationId, conversationState);

          break;
        }

        // Get AI's next response
        aiResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          tools: availableFunctions.map(f => ({
            type: "function",
            function: f
          })),
          tool_choice: "auto",
          temperature: 0.7
        });

        finalMessage = aiResponse.choices[0].message;
      }

      // Save assistant response to conversation history
      conversationState.messageHistory.push({
        role: "assistant",
        content: finalMessage.content || "",
        timestamp: new Date()
      });
      conversationStateManager.update(conversationId, conversationState);

      // Step 4: Extract navigation and highlights
      console.log("Step 4: Extracting navigation and highlights...");

      // Extract navigation from any function that includes it
      let navigationResult = null;

      // Check for explicit navigation function first
      const navigationFunction = executedFunctions.find(
        f => f.function === "navigateToPage"
      );

      if (navigationFunction) {
        navigationResult = navigationFunction.result;
      } else {
        // Check if any other function includes navigation data (e.g., getTripStats, getTripAnalytics)
        const functionWithNavigation = executedFunctions.find(
          f => f.result && f.result.navigate === true
        );
        if (functionWithNavigation) {
          navigationResult = {
            success: true,
            navigate: functionWithNavigation.result.navigate,
            path: functionWithNavigation.result.path,
            analyticsParams: functionWithNavigation.result.analyticsParams,
            highlightElements: functionWithNavigation.result.highlightElements || []
          };
        }
      }

      const dataHighlights = extractDataHighlights(executedFunctions);

      // Check if this is a mission execution command
      const missionExecution = executedFunctions.find(
        f => f.function === "executeRobotMission" && f.result.success
      );

      // Step 5: Send response
      console.log("Step 5: Sending response");

      res.status(200).json({
        success: true,
        transcription: userQuery,
        response: finalMessage.content || "Command processed",
        executedFunctions: executedFunctions,
        navigation: navigationResult,
        dataHighlights: dataHighlights,
        missionExecution: missionExecution?.result || null,
        conversationId: conversationId,
        needsInput: needsUserInput,
        disambiguationData: disambiguationData
      });

    } catch (error: any) {
      console.error("AI Agent Error:", error);

      res.status(500).json({
        success: false,
        error: error.message || "AI processing failed",
        details: error.response?.data || null
      });
    }
  }
);

/**
 * Handle AI text command (for testing without audio)
 * @route POST /api/v1/ai-agent/command-text
 */
export const handleAITextCommand = asyncHandler(
  async (req: Request, res: Response) => {
    const { text, conversationId: existingConversationId } = req.body;

    if (!text) {
      res.status(400);
      throw new Error("Missing text input");
    }

    try {
      const userQuery = text;
      console.log("Text command:", userQuery);

      const conversationId = existingConversationId || `conv_${Date.now()}`;

      // Check if this is a continuation of a conversation
      const conversationState = conversationStateManager.getOrCreate(conversationId, userQuery);

      const messages: any[] = [
        {
          role: "system",
          content: AI_SYSTEM_PROMPT
        }
      ];

      // If conversation exists, add history
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

      let aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        tools: availableFunctions.map(f => ({
          type: "function",
          function: f
        })),
        tool_choice: "auto",
        temperature: 0.7
      });

      // Execute function calls iteratively
      let finalMessage = aiResponse.choices[0].message;
      const executedFunctions: any[] = [];
      const maxIterations = 10;
      let iterations = 0;
      let needsUserInput = false;
      let disambiguationData: any = null;

      while (finalMessage.tool_calls && finalMessage.tool_calls.length > 0 && iterations < maxIterations) {
        iterations++;

        // Add assistant message with ALL tool calls
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: finalMessage.tool_calls
        });

        // Process ALL tool calls
        for (const toolCall of finalMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

          console.log(`Calling function: ${functionName}`, functionArgs);

          const functionResult = await executeFunctionCall(
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

          // Check if this result needs disambiguation
          if (functionResult.needsDisambiguation) {
            needsUserInput = true;
            disambiguationData = {
              type: functionResult.disambiguationType,
              query: functionResult.query,
              options: functionResult.options,
              message: functionResult.message
            };
          }

          // Add tool response
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          });
        }

        // If disambiguation needed, break
        if (needsUserInput) {
          conversationState.status = 'awaiting_disambiguation';
          conversationState.disambiguationData = disambiguationData;
          conversationStateManager.update(conversationId, conversationState);
          break;
        }

        // Get AI's next response
        aiResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          tools: availableFunctions.map(f => ({
            type: "function",
            function: f
          })),
          tool_choice: "auto",
          temperature: 0.7
        });

        finalMessage = aiResponse.choices[0].message;
      }

      // Save assistant response
      conversationState.messageHistory.push({
        role: "assistant",
        content: finalMessage.content || "",
        timestamp: new Date()
      });
      conversationStateManager.update(conversationId, conversationState);

      // Extract navigation from any function that includes it
      let navigationResult = null;

      // Check for explicit navigation function first
      const navigationFunction = executedFunctions.find(
        f => f.function === "navigateToPage"
      );

      if (navigationFunction) {
        navigationResult = navigationFunction.result;
      } else {
        // Check if any other function includes navigation data (e.g., getTripStats, getTripAnalytics)
        const functionWithNavigation = executedFunctions.find(
          f => f.result && f.result.navigate === true
        );
        if (functionWithNavigation) {
          navigationResult = {
            success: true,
            navigate: functionWithNavigation.result.navigate,
            path: functionWithNavigation.result.path,
            analyticsParams: functionWithNavigation.result.analyticsParams,
            highlightElements: functionWithNavigation.result.highlightElements || []
          };
        }
      }

      const dataHighlights = extractDataHighlights(executedFunctions);

      res.status(200).json({
        success: true,
        transcription: userQuery,
        response: finalMessage.content || "Command processed",
        executedFunctions: executedFunctions,
        navigation: navigationResult,
        dataHighlights: dataHighlights,
        conversationId: conversationId,
        needsInput: needsUserInput,
        disambiguationData: disambiguationData
      });

    } catch (error: any) {
      console.error("AI Agent Error:", error);

      res.status(500).json({
        success: false,
        error: error.message || "AI processing failed",
        details: error.response?.data || null
      });
    }
  }
);

/**
 * Get AI chat history (optional feature for future)
 * @route GET /api/v1/ai-agent/history
 */
export const getAIChatHistory = asyncHandler(
  async (req: Request, res: Response) => {
    // TODO: Implement chat history storage and retrieval
    res.status(200).json({
      success: true,
      history: []
    });
  }
);

/**
 * Clear AI chat history (optional feature for future)
 * @route DELETE /api/v1/ai-agent/history
 */
export const clearAIChatHistory = asyncHandler(
  async (req: Request, res: Response) => {
    // TODO: Implement chat history clearing
    res.status(200).json({
      success: true,
      message: "Chat history cleared"
    });
  }
);

// Helper function to extract data highlights from executed functions
function extractDataHighlights(executedFunctions: any[]): any {
  const highlights: any = {};

  executedFunctions.forEach(func => {
    // Operator highlights
    if (func.function === "getOperatorDetails" && func.result.success) {
      highlights.operator = {
        totalTrips: func.result.operator.stats.totalTrips,
        successRate: func.result.operator.stats.successRate,
        assignedRobots: func.result.operator.stats.assignedRobotsCount
      };
    }

    // Robot highlights
    if (func.function === "getRobotDetails" && func.result.success) {
      highlights.robot = {
        status: func.result.robot.status,
        battery: func.result.robot.batteryPercentage,
        robotType: func.result.robot.robotType
      };
    }

    // Analytics highlights
    if (func.function === "getTripAnalytics" && func.result.success) {
      highlights.analytics = {
        totalTrips: func.result.analytics.totalTrips,
        successRate: func.result.analytics.successRate
      };
    }

    // Fleet highlights
    if (func.function === "getRobotsByStatus" && func.result.success) {
      highlights.fleet = func.result.summary;
    }

    // Top performers highlights
    if (func.function === "getTopPerformers" && func.result.success) {
      highlights.topPerformers = {
        type: func.result.type,
        metric: func.result.metric,
        count: func.result.topPerformers.length
      };
    }
  });

  return highlights;
}
