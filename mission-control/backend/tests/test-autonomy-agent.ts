/**
 * Autonomy Agent End-to-End Test Suite
 *
 * Tests the Autonomy Voice Agent across two modes:
 *
 * MODE 1 — LLM Unit Tests (--mode=llm)
 *   Calls OpenAI directly with the Autonomy Agent system prompt.
 *   Checks that GPT-4o picks the correct function + arguments.
 *   No server or DB needed.
 *
 * MODE 2 — HTTP Integration Tests (--mode=http)
 *   Hits the real /api/v1/autonomy-agent/command-text endpoint.
 *   Tests full round-trip: text → GPT-4o → function execution → DB → response.
 *   Requires: server running on PORT 5000, valid JWT in TEST_TOKEN env var.
 *
 * Run:
 *   npx tsx backend/tests/test-autonomy-agent.ts --mode=llm
 *   npx tsx backend/tests/test-autonomy-agent.ts --mode=http
 *   npx tsx backend/tests/test-autonomy-agent.ts            (defaults to llm)
 *
 * For HTTP mode, set env vars:
 *   TEST_TOKEN=<jwt>  TEST_BASE_URL=http://localhost:5000
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { fileURLToPath } from "url";

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ────────────────────────────────────────────────────────────────

const MODE = (process.argv.find(a => a.startsWith("--mode="))?.split("=")[1] || "llm") as "llm" | "http" | "all";
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const TEST_TOKEN = process.env.TEST_TOKEN || "";
const DELAY_MS = 1500; // throttle between LLM calls (increased to avoid 429)
const HTTP_DELAY_MS = 2000; // throttle between HTTP calls (avoids OpenAI TPM limit)

// ─── Types ─────────────────────────────────────────────────────────────────

interface AutonomyContext {
  robotId?: string;
  robotName?: string;
  robotType?: string;
  robotStatus?: string;
  isRobotConnected?: boolean;
  pathMapId?: string;
  pathMapName?: string;
  pathMapFrame?: string;
  missionId?: string;
  missionName?: string;
  isMissionExecuting?: boolean;
  isPathMapping?: boolean;
  isMissionPlanning?: boolean;
  isNonRTKMode?: boolean;
  isLocalized?: boolean;
}

interface TestCase {
  id: string;
  category: string;
  query: string;
  context?: AutonomyContext;
  // LLM checks
  expectedFunctions: string[];           // must be called
  forbiddenFunctions?: string[];         // must NOT be called
  expectedArgs?: Record<string, any>;    // spot-check args on first function
  // HTTP checks (in addition to LLM checks)
  expectedResponseFields?: string[];     // keys that must exist in response
  expectSuccess?: boolean;               // result.success value
  expectConfirmation?: boolean;          // requiresConfirmation in result
  expectDisambiguation?: boolean;        // needsDisambiguation in result
  expectAction?: string;                 // result.action value
}

interface TestResult {
  id: string;
  category: string;
  query: string;
  mode: string;
  passed: boolean;
  actualFunctions: string[];
  expectedFunctions: string[];
  argsCheck?: { passed: boolean; detail: string };
  responseCheck?: { passed: boolean; detail: string };
  agentResponse?: string;
  error?: string;
  durationMs?: number;
}

// ─── System Prompt (mirrors autonomyAgentController.ts) ────────────────────

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
9. For addStationToPathMap: CALL THE FUNCTION IMMEDIATELY with pathMapName and stationName. Do NOT ask about position — the function handles it.

AVAILABLE OPERATIONS (38 functions):
- executeRobotMission, abortRobotMission, pauseRobotMission, resumeRobotMission, returnRobotToStation
- createPathMap, deletePathMap, addStationToPathMap, removeStationFromPathMap, renameStation
- createMission, deleteMission
- activateRobot, deactivateRobot, setActiveOperator
- checkInOperator, checkOutOperator
- createQCSubmission, raiseRobotIssue, closeRobotIssue
- executeFleetMission, abortAllMissions
- selectDisambiguationChoice
- listPathmaps, listMissions, listStations  ← USE for "list pathmaps/missions/stations" requests
- selectPathMap, selectMission
- startPathRecording, stopPathRecording
- startMissionPlanning, stopMissionPlanning, saveMission, clearMissionPoints
- getMissionStatus, getLocalizationStatus  ← USE for status queries

REMEMBER: ALWAYS call functions, NEVER just respond with text.`;

// ─── Test Cases ─────────────────────────────────────────────────────────────

const TEST_CASES: TestCase[] = [

  // ── MISSION CONTROL ──────────────────────────────────────────────────────

  {
    id: "MC-1",
    category: "Mission Control",
    query: "Send MMR-31 to kitchen in office",
    expectedFunctions: ["executeRobotMission"],
    expectedArgs: { robotId: "MMR-31", pathMapName: "office", missionName: "kitchen" },
    // Note: expectAction NOT set — "office"/"kitchen" may not exist in staging DB
  },
  {
    id: "MC-2",
    category: "Mission Control",
    query: "send robot 31 to delivery in warehouse",
    expectedFunctions: ["executeRobotMission"],
    expectedArgs: { pathMapName: "warehouse", missionName: "delivery" },
  },
  {
    id: "MC-3",
    category: "Mission Control - Context",
    query: "abort mission",
    context: {
      robotId: "MMR-31",
      robotName: "MMR-31",
      isMissionExecuting: true,
      isRobotConnected: true,
    },
    expectedFunctions: ["abortRobotMission"],
    expectedArgs: { robotId: "MMR-31" },
    // Note: expectConfirmation NOT checked — robot MMR-31 not in staging, so function returns
    // success:false (not found) instead of requiresConfirmation. Function call is what matters.
  },
  {
    id: "MC-4",
    category: "Mission Control - Context",
    query: "pause it",
    context: {
      robotId: "MMR-17",
      robotName: "MMR-17",
      isMissionExecuting: true,
    },
    expectedFunctions: ["pauseRobotMission"],
    expectedArgs: { robotId: "MMR-17" },
  },
  {
    id: "MC-5",
    category: "Mission Control - Context",
    query: "resume the mission on MMR-17",
    context: {
      robotId: "MMR-17",
      robotName: "MMR-17",
      pathMapName: "office",
      missionName: "delivery",
    },
    expectedFunctions: ["resumeRobotMission"],
    expectedArgs: { robotId: "MMR-17" },
  },
  {
    id: "MC-6",
    category: "Mission Control",
    query: "send MMR-31 back to charging station",
    expectedFunctions: ["returnRobotToStation"],
    expectedArgs: { robotId: "MMR-31" },
    // Note: expectConfirmation NOT checked — robot MMR-31 not in staging DB
  },

  // ── PATHMAP MANAGEMENT ───────────────────────────────────────────────────

  {
    id: "PM-1",
    category: "PathMap Management",
    query: "Create a pathmap named warehouse in GPS mode",
    expectedFunctions: ["createPathMap"],
    expectedArgs: { name: "warehouse", frame: "utm" },
    // Note: expectSuccess NOT checked — pathmap may already exist in staging DB
  },
  {
    id: "PM-2",
    category: "PathMap Management",
    query: "create pathmap test-indoor in indoor mode",
    expectedFunctions: ["createPathMap"],
    expectedArgs: { frame: "odom" },
    // Note: expectSuccess NOT checked — pathmap may already exist in staging DB
  },
  {
    id: "PM-3",
    category: "PathMap Management",
    query: "delete pathmap old-office",
    expectedFunctions: ["deletePathMap"],
    expectedArgs: { pathMapName: "old-office" },
    // Note: expectConfirmation NOT checked — "old-office" doesn't exist in staging, returns success:false
  },
  {
    id: "PM-4",
    category: "PathMap Management",
    query: "add station named loading dock to warehouse",
    expectedFunctions: ["addStationToPathMap"],
    expectedArgs: { pathMapName: "warehouse", stationName: "loading dock" },
    // Note: function should be called; may fail if robot not connected or no GPS position
  },
  {
    id: "PM-5",
    category: "PathMap Management",
    query: "remove station kitchen from office",
    expectedFunctions: ["removeStationFromPathMap"],
    expectedArgs: { pathMapName: "office", stationName: "kitchen" },
  },
  {
    id: "PM-6",
    category: "PathMap Management",
    query: "rename station dock to loading bay in warehouse",
    expectedFunctions: ["renameStation"],
    expectedArgs: { pathMapName: "warehouse", oldName: "dock", newName: "loading bay" },
  },

  // ── MISSION CRUD ─────────────────────────────────────────────────────────

  {
    id: "MI-1",
    category: "Mission CRUD",
    query: "create mission delivery in office pathmap",
    expectedFunctions: ["createMission"],
    expectedArgs: { pathMapName: "office", missionName: "delivery" },
    // Note: expectSuccess NOT checked — mission may already exist in staging DB
  },
  {
    id: "MI-2",
    category: "Mission CRUD",
    query: "delete mission old-patrol from warehouse",
    expectedFunctions: ["deleteMission"],
    expectedArgs: { pathMapName: "warehouse", missionName: "old-patrol" },
    // Note: expectConfirmation NOT checked — "old-patrol" doesn't exist in staging DB
  },
  {
    id: "MI-3",
    category: "Mission CRUD",
    query: "create a new mission called test-run in office",
    expectedFunctions: ["createMission"],
    expectedArgs: { missionName: "test-run" },
  },

  // ── LIST OPERATIONS ──────────────────────────────────────────────────────

  {
    id: "LI-1",
    category: "List Operations",
    query: "list all pathmaps",
    expectedFunctions: ["listPathmaps"],
    expectAction: "list_pathmaps",
  },
  {
    id: "LI-2",
    category: "List Operations",
    query: "show me GPS pathmaps only",
    expectedFunctions: ["listPathmaps"],
    expectedArgs: { filter: "utm" },
  },
  {
    id: "LI-3",
    category: "List Operations",
    query: "list missions in office",
    expectedFunctions: ["listMissions"],
    expectedArgs: { pathMapName: "office" },
    expectAction: "list_missions",
  },
  {
    id: "LI-4",
    category: "List Operations",
    query: "show all stations in warehouse",
    expectedFunctions: ["listStations"],
    expectedArgs: { pathMapName: "warehouse" },
    expectAction: "list_stations",
  },

  // ── SELECTION OPERATIONS ─────────────────────────────────────────────────

  {
    id: "SE-1",
    category: "Selection",
    query: "switch to office pathmap",
    expectedFunctions: ["selectPathMap"],
    expectedArgs: { pathMapName: "office" },
    // Note: expectAction NOT set — "office" pathmap may not exist in staging DB
  },
  {
    id: "SE-2",
    category: "Selection",
    query: "select mission delivery in office",
    expectedFunctions: ["selectMission"],
    expectedArgs: { pathMapName: "office", missionName: "delivery" },
    expectAction: "select_mission",
  },

  // ── PATH RECORDING ───────────────────────────────────────────────────────

  {
    id: "RE-1",
    category: "Path Recording",
    query: "start recording path",
    context: {
      pathMapId: "test-id",
      pathMapName: "office",
      isRobotConnected: true,
    },
    expectedFunctions: ["startPathRecording"],
    expectAction: "start_recording",
    expectSuccess: true,
  },
  {
    id: "RE-2",
    category: "Path Recording",
    query: "stop recording",
    context: {
      pathMapName: "office",
      isPathMapping: true,
    },
    expectedFunctions: ["stopPathRecording"],
    expectAction: "stop_recording",
    expectSuccess: true,
  },

  // ── MISSION PLANNING ─────────────────────────────────────────────────────

  {
    id: "PL-1",
    category: "Mission Planning",
    query: "start mission planning",
    context: {
      missionName: "delivery",
    },
    expectedFunctions: ["startMissionPlanning"],
    expectAction: "start_planning",
    expectSuccess: true,
  },
  {
    id: "PL-2",
    category: "Mission Planning",
    query: "stop mission planning",
    expectedFunctions: ["stopMissionPlanning"],
    expectAction: "stop_planning",
    expectSuccess: true,
  },
  {
    id: "PL-3",
    category: "Mission Planning",
    query: "save the mission",
    context: {
      missionName: "delivery",
      pathMapName: "office",
      isMissionPlanning: true,
    },
    expectedFunctions: ["saveMission"],
    expectAction: "save_mission",
    expectSuccess: true,
  },
  {
    id: "PL-4",
    category: "Mission Planning",
    query: "clear mission points",
    context: { isMissionPlanning: true },
    expectedFunctions: ["clearMissionPoints"],
    expectAction: "clear_mission",
    expectSuccess: true,
  },

  // ── STATUS ───────────────────────────────────────────────────────────────

  {
    id: "ST-1",
    category: "Status",
    query: "what is the mission status of MMR-31",
    expectedFunctions: ["getMissionStatus"],
    // Note: success depends on robot existing in staging DB
  },
  {
    id: "ST-2",
    category: "Status",
    query: "is the robot localized",
    context: {
      robotId: "MMR-31",
      robotName: "MMR-31",
      isLocalized: true,
    },
    expectedFunctions: ["getLocalizationStatus"],
    // Note: success depends on robot existing in staging DB
  },

  // ── CONTEXT AWARENESS ────────────────────────────────────────────────────

  {
    id: "CA-1",
    category: "Context Awareness",
    query: "stop it",
    context: {
      robotId: "MMR-31",
      robotName: "MMR-31",
      isMissionExecuting: true,
    },
    expectedFunctions: ["abortRobotMission"],
    // Should use context robot, not ask user
  },
  {
    id: "CA-2",
    category: "Context Awareness",
    query: "execute the mission",
    context: {
      robotId: "sim-bot",
      robotName: "sim-bot",
      pathMapId: "abc",
      pathMapName: "office",
      missionId: "xyz",
      missionName: "delivery",
    },
    expectedFunctions: ["executeRobotMission"],
    expectedArgs: { robotId: "sim-bot" },
  },
  {
    id: "CA-3",
    category: "Context Awareness",
    query: "add station named checkpoint here",
    context: {
      pathMapName: "office",
      pathMapId: "test-id",
      isRobotConnected: true,
    },
    expectedFunctions: ["addStationToPathMap"],
    expectedArgs: { pathMapName: "office", stationName: "checkpoint" },
  },
  {
    id: "CA-4",
    category: "Context Awareness",
    query: "list missions in the active pathmap",   // Explicitly references active pathmap
    context: {
      pathMapName: "warehouse",
    },
    expectedFunctions: ["listMissions"],
    expectedArgs: { pathMapName: "warehouse" },
  },

  // ── DISAMBIGUATION ───────────────────────────────────────────────────────

  {
    id: "DI-1",
    category: "Disambiguation",
    query: "execute mission test in office",  // 'test' likely ambiguous
    expectedFunctions: ["executeRobotMission"],
  },
  {
    id: "DI-2",
    category: "Disambiguation",
    query: "send MMR-31 to delivery in office",  // all params specified — should execute directly
    context: {
      robotId: "MMR-31",
      robotName: "MMR-31",
    },
    expectedFunctions: ["executeRobotMission"],
    expectedArgs: { robotId: "MMR-31", missionName: "delivery", pathMapName: "office" },
  },
  {
    id: "DI-3",
    category: "Disambiguation",
    query: "option 2 please",  // selecting a disambiguation choice by number
    context: {
      robotName: "MMR-31",
      pathMapName: "office",
    },
    // GPT should call selectDisambiguationChoice when receiving a numbered choice
    expectedFunctions: ["selectDisambiguationChoice"],
    expectedArgs: { choice: "2" },
  },

  // ── ERROR CASES ──────────────────────────────────────────────────────────

  {
    id: "ER-1",
    category: "Error Cases",
    query: "send MMR-999 to kitchen in office",
    expectedFunctions: ["executeRobotMission"],
    expectedArgs: { robotId: "MMR-999", pathMapName: "office", missionName: "kitchen" },
    // Note: function should be called, result.success will be false (robot not found)
    // We check function was called but not the success value (agent may respond with text)
  },
  {
    id: "ER-2",
    category: "Error Cases",
    query: "list missions in nonexistent-pathmap",
    expectedFunctions: ["listMissions"],
    expectSuccess: false,
  },

  // ── VOICE PHRASING VARIATIONS ────────────────────────────────────────────

  {
    id: "VP-1",
    category: "Voice Phrasing",
    query: "go to the kitchen",
    context: {
      robotId: "MMR-31",
      robotName: "MMR-31",
      pathMapName: "office",
    },
    expectedFunctions: ["executeRobotMission"],
  },
  {
    id: "VP-2",
    category: "Voice Phrasing",
    query: "kill the mission now",
    context: {
      robotId: "MMR-31",
      robotName: "MMR-31",
      isMissionExecuting: true,
    },
    expectedFunctions: ["abortRobotMission"],
  },
  {
    id: "VP-3",
    category: "Voice Phrasing",
    query: "make a new pathmap called outdoor-gps using GPS",
    expectedFunctions: ["createPathMap"],
    expectedArgs: { frame: "utm" },
  },
  {
    id: "VP-4",
    category: "Voice Phrasing",
    query: "what pathmaps do I have",
    expectedFunctions: ["listPathmaps"],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function buildContextBlock(context: AutonomyContext): string {
  const lines: string[] = ["\n\n--- CURRENT DASHBOARD CONTEXT ---"];

  if (context.robotId || context.robotName) {
    lines.push(`Active Robot: ${context.robotName || context.robotId}${context.robotType ? ` (${context.robotType})` : ""}${context.robotStatus ? ` [${context.robotStatus}]` : ""}`);
    lines.push(`Robot Connected: ${context.isRobotConnected ? "YES" : "NO"}`);
  } else {
    lines.push("Active Robot: None selected");
  }

  if (context.pathMapName) lines.push(`Active PathMap: ${context.pathMapName}${context.pathMapFrame ? ` (${context.pathMapFrame} frame)` : ""}`);
  if (context.missionName) lines.push(`Active Mission: ${context.missionName}`);
  if (context.isMissionExecuting !== undefined) lines.push(`Mission Executing: ${context.isMissionExecuting ? "YES" : "NO"}`);
  if (context.isPathMapping !== undefined) lines.push(`Path Recording Active: ${context.isPathMapping ? "YES" : "NO"}`);
  if (context.isMissionPlanning !== undefined) lines.push(`Mission Planning Active: ${context.isMissionPlanning ? "YES" : "NO"}`);
  if (context.isLocalized !== undefined) lines.push(`Robot Localized: ${context.isLocalized ? "YES" : "NO"}`);

  lines.push("");
  lines.push("IMPORTANT CONTEXT RULES:");
  lines.push("- When user says 'abort', 'pause', 'resume', 'stop', 'send it' WITHOUT specifying a robot — use the Active Robot above automatically.");
  lines.push("- When user references 'this pathmap', 'current pathmap', 'it', 'the pathmap' — use the Active PathMap above.");
  lines.push("- When user references 'this mission', 'current mission', 'the mission' — use the Active Mission above.");
  lines.push("- If mission is executing and user says 'stop' or 'abort' — call abortRobotMission with Active Robot.");
  lines.push("- If robot name/id is in context, ALWAYS prefer it over asking the user.");
  lines.push("- For 'add station [name] here' — pathmap = Active PathMap, position = current robot position (call addStationToPathMap immediately).");
  lines.push("- If Active PathMap is set and user says 'list missions' — use Active PathMap as pathMapName.");
  lines.push("--- END CONTEXT ---");

  return lines.join("\n");
}

function checkArgs(expected: Record<string, any>, toolCalls: any[]): { passed: boolean; detail: string } {
  if (!toolCalls || toolCalls.length === 0) return { passed: false, detail: "No tool calls made" };

  const firstCall = toolCalls[0];
  let actual: Record<string, any> = {};
  try {
    actual = JSON.parse(firstCall.function.arguments || "{}");
  } catch {
    return { passed: false, detail: "Failed to parse arguments JSON" };
  }

  const failures: string[] = [];
  for (const [key, val] of Object.entries(expected)) {
    const actualVal = actual[key];
    if (actualVal === undefined) {
      failures.push(`missing '${key}'`);
    } else if (typeof val === "string" && typeof actualVal === "string") {
      // Case-insensitive partial match for flexibility
      if (!actualVal.toLowerCase().includes(val.toLowerCase()) &&
          !val.toLowerCase().includes(actualVal.toLowerCase())) {
        failures.push(`'${key}': expected "${val}", got "${actualVal}"`);
      }
    } else if (val !== actualVal) {
      failures.push(`'${key}': expected ${JSON.stringify(val)}, got ${JSON.stringify(actualVal)}`);
    }
  }

  return failures.length === 0
    ? { passed: true, detail: `OK — ${JSON.stringify(actual)}` }
    : { passed: false, detail: failures.join("; ") };
}

function httpPost(url: string, body: any, token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const lib = urlObj.protocol === "https:" ? https : http;

    const req = lib.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "Authorization": `Bearer ${token}`,
      },
    }, (res) => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ _raw: raw, _status: res.statusCode }); }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ─── Mode 1: LLM Unit Test ──────────────────────────────────────────────────

async function runLLMTest(tc: TestCase, openai: any, functions: any[]): Promise<TestResult> {
  const start = Date.now();
  try {
    const systemPrompt = AUTONOMY_AGENT_PROMPT +
      (tc.context ? buildContextBlock(tc.context) : "");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: tc.query },
      ],
      tools: functions.map((f: any) => ({ type: "function" as const, function: f })),
      tool_choice: "auto",
      temperature: 0.2,
    });

    const message = response.choices[0].message;
    const toolCalls = message.tool_calls || [];
    const actualFunctions = toolCalls.map((tc: any) => tc.function.name);

    // Check expected functions called
    const missingFns = tc.expectedFunctions.filter(fn => !actualFunctions.includes(fn));
    const forbiddenFns = (tc.forbiddenFunctions || []).filter(fn => actualFunctions.includes(fn));

    const fnPass = missingFns.length === 0 && forbiddenFns.length === 0;

    // Check args if specified
    let argsCheck: { passed: boolean; detail: string } | undefined;
    if (tc.expectedArgs && toolCalls.length > 0) {
      argsCheck = checkArgs(tc.expectedArgs, toolCalls);
    }

    const passed = fnPass && (argsCheck ? argsCheck.passed : true);

    if (!fnPass) {
      if (missingFns.length > 0) process.stdout.write(`   MISSING: ${missingFns.join(", ")}\n`);
      if (forbiddenFns.length > 0) process.stdout.write(`   FORBIDDEN CALLED: ${forbiddenFns.join(", ")}\n`);
    }

    // Show what was called with args for inspection
    toolCalls.forEach((call: any) => {
      process.stdout.write(`   >> ${call.function.name}(${call.function.arguments})\n`);
    });

    return {
      id: tc.id,
      category: tc.category,
      query: tc.query,
      mode: "llm",
      passed,
      actualFunctions,
      expectedFunctions: tc.expectedFunctions,
      argsCheck,
      agentResponse: message.content || undefined,
      durationMs: Date.now() - start,
    };

  } catch (error: any) {
    return {
      id: tc.id,
      category: tc.category,
      query: tc.query,
      mode: "llm",
      passed: false,
      actualFunctions: [],
      expectedFunctions: tc.expectedFunctions,
      error: error.message,
      durationMs: Date.now() - start,
    };
  }
}

// ─── Mode 2: HTTP Integration Test ──────────────────────────────────────────

async function runHTTPTest(tc: TestCase): Promise<TestResult> {
  const start = Date.now();
  try {
    const body: any = {
      text: tc.query,
      conversationId: `test-${tc.id}-${Date.now()}`,
      context: tc.context || null,
    };

    // Retry with backoff on 429 rate limit errors
    let data: any;
    let retries = 0;
    const maxRetries = 3;
    while (retries <= maxRetries) {
      data = await httpPost(
        `${BASE_URL}/api/v1/autonomy-agent/command-text`,
        body,
        TEST_TOKEN
      );
      // Check for 429 in error message (our server passes it through)
      const is429 = data?.error?.includes("429") || data?.error?.includes("Rate limit");
      if (!is429) break;
      retries++;
      const waitMs = 5000 * retries;
      process.stdout.write(`   ⏳ Rate limited (429), retrying in ${waitMs/1000}s... (attempt ${retries}/${maxRetries})\n`);
      await sleep(waitMs);
    }

    if (!data.success && data.error && !data.executedFunctions) {
      return {
        id: tc.id,
        category: tc.category,
        query: tc.query,
        mode: "http",
        passed: false,
        actualFunctions: [],
        expectedFunctions: tc.expectedFunctions,
        error: `HTTP error: ${data.error}`,
        durationMs: Date.now() - start,
      };
    }

    // Extract which functions were called from executedFunctions
    const execFns: any[] = data.executedFunctions || [];
    const actualFunctions = execFns.map((ef: any) => ef.function);

    // Function presence check
    const missingFns = tc.expectedFunctions.filter(fn => !actualFunctions.includes(fn));
    const fnPass = missingFns.length === 0;

    // Args check on first executed function
    let argsCheck: { passed: boolean; detail: string } | undefined;
    if (tc.expectedArgs && execFns.length > 0) {
      const fakeToolCalls = execFns.map((ef: any) => ({
        function: { name: ef.function, arguments: JSON.stringify(ef.arguments || {}) }
      }));
      argsCheck = checkArgs(tc.expectedArgs, fakeToolCalls);
    }

    // Response field checks (look inside executedFunctions results)
    let responseCheck: { passed: boolean; detail: string } | undefined;
    const checks: string[] = [];

    if (tc.expectSuccess !== undefined) {
      const firstResult = execFns[0]?.result;
      const actualSuccess = firstResult?.success;
      if (actualSuccess !== tc.expectSuccess) {
        checks.push(`result.success: expected ${tc.expectSuccess}, got ${actualSuccess}`);
      }
    }

    if (tc.expectConfirmation) {
      const hasConfirm = execFns.some((ef: any) => ef.result?.requiresConfirmation === true);
      if (!hasConfirm) checks.push("expected requiresConfirmation=true in result");
    }

    if (tc.expectDisambiguation) {
      const hasDisamb = execFns.some((ef: any) => ef.result?.needsDisambiguation === true);
      if (!hasDisamb) checks.push("expected needsDisambiguation=true in result");
    }

    if (tc.expectAction) {
      const hasAction = execFns.some((ef: any) => ef.result?.action === tc.expectAction);
      if (!hasAction) checks.push(`expected action="${tc.expectAction}" in result`);
    }

    if (checks.length > 0) {
      responseCheck = { passed: false, detail: checks.join("; ") };
    } else if (tc.expectSuccess !== undefined || tc.expectConfirmation || tc.expectDisambiguation || tc.expectAction) {
      responseCheck = { passed: true, detail: "All response checks passed" };
    }

    // Show called functions and their results
    execFns.forEach((ef: any) => {
      const result = ef.result || {};
      process.stdout.write(`   >> ${ef.function}(${JSON.stringify(ef.arguments)}) → success:${result.success} action:${result.action || "-"}\n`);
    });
    if (data.response) {
      process.stdout.write(`   Agent: "${data.response.slice(0, 100)}${data.response.length > 100 ? "..." : ""}"\n`);
    }

    const passed = fnPass && (argsCheck ? argsCheck.passed : true) && (responseCheck ? responseCheck.passed : true);

    return {
      id: tc.id,
      category: tc.category,
      query: tc.query,
      mode: "http",
      passed,
      actualFunctions,
      expectedFunctions: tc.expectedFunctions,
      argsCheck,
      responseCheck,
      agentResponse: data.response,
      durationMs: Date.now() - start,
    };

  } catch (error: any) {
    return {
      id: tc.id,
      category: tc.category,
      query: tc.query,
      mode: "http",
      passed: false,
      actualFunctions: [],
      expectedFunctions: tc.expectedFunctions,
      error: error.message,
      durationMs: Date.now() - start,
    };
  }
}

// ─── Reporter ────────────────────────────────────────────────────────────────

function printSummary(results: TestResult[]) {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const rate = ((passed / total) * 100).toFixed(1);

  console.log("\n" + "=".repeat(80));
  console.log("📊  SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total : ${total}`);
  console.log(`Passed: ${passed}  (${rate}%)`);
  console.log(`Failed: ${failed}`);

  // By category
  const categories = [...new Set(results.map(r => r.category))];
  console.log("\n📂  By Category:");
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catPassed = catResults.filter(r => r.passed).length;
    const catTotal = catResults.length;
    const marker = catPassed === catTotal ? "✅" : catPassed > 0 ? "⚠️ " : "❌";
    console.log(`  ${marker} ${cat}: ${catPassed}/${catTotal}`);

    for (const r of catResults.filter(r => !r.passed)) {
      console.log(`     ❌ ${r.id}: "${r.query}"`);
      if (r.error) console.log(`        Error: ${r.error}`);
      if (r.argsCheck && !r.argsCheck.passed) console.log(`        Args : ${r.argsCheck.detail}`);
      if (r.responseCheck && !r.responseCheck.passed) console.log(`        Resp : ${r.responseCheck.detail}`);
      const missing = r.expectedFunctions.filter(fn => !r.actualFunctions.includes(fn));
      if (missing.length > 0) console.log(`        Missing fns: ${missing.join(", ")}`);
      const extra = r.actualFunctions.filter(fn => !r.expectedFunctions.includes(fn));
      if (extra.length > 0) console.log(`        Extra fns: ${extra.join(", ")}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  if (parseFloat(rate) === 100) {
    console.log("🎉  ALL TESTS PASSED — Autonomy Agent is fully functional!");
  } else if (parseFloat(rate) >= 80) {
    console.log("✅  Most tests passed. Check failures above for details.");
  } else {
    console.log("⚠️   Many tests failed. Review agent prompt and function implementations.");
  }
  console.log("=".repeat(80));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(80));
  console.log("🤖  AUTONOMY AGENT END-TO-END TEST SUITE");
  console.log("=".repeat(80));
  console.log(`Mode   : ${MODE.toUpperCase()}`);
  console.log(`Cases  : ${TEST_CASES.length}`);
  if (MODE === "http" || MODE === "all") {
    console.log(`Server : ${BASE_URL}`);
    console.log(`Token  : ${TEST_TOKEN ? TEST_TOKEN.slice(0, 20) + "..." : "NOT SET — set TEST_TOKEN env var"}`);
  }
  console.log();

  const results: TestResult[] = [];

  // ── LLM Mode ──────────────────────────────────────────────────────────────
  if (MODE === "llm" || MODE === "all") {
    // Lazy import so HTTP-only runs don't need dotenv/openai
    require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
    const { openai } = require("../services/ai");
    const { availableAutonomyFunctions } = require("../services/autonomyAgentService");

    console.log("── LLM Unit Tests ──────────────────────────────────────────────────────────");

    for (const tc of TEST_CASES) {
      process.stdout.write(`\n🧪 [${tc.id}] ${tc.category} — "${tc.query}"\n`);
      if (tc.context) {
        const ctx = [
          tc.context.robotName && `robot=${tc.context.robotName}`,
          tc.context.pathMapName && `pathmap=${tc.context.pathMapName}`,
          tc.context.missionName && `mission=${tc.context.missionName}`,
          tc.context.isMissionExecuting && "executing",
        ].filter(Boolean).join(", ");
        process.stdout.write(`   context: { ${ctx} }\n`);
      }
      process.stdout.write(`   expect : [${tc.expectedFunctions.join(", ")}]\n`);

      const result = await runLLMTest(tc, openai, availableAutonomyFunctions);
      results.push(result);

      const icon = result.passed ? "✅" : "❌";
      const fns = result.actualFunctions.length > 0 ? result.actualFunctions.join(", ") : "(no functions)";
      process.stdout.write(`   ${icon} actual : [${fns}]  (${result.durationMs}ms)\n`);
      if (result.error) process.stdout.write(`   error  : ${result.error}\n`);

      await sleep(DELAY_MS);
    }
  }

  // ── HTTP Mode ──────────────────────────────────────────────────────────────
  if (MODE === "http" || MODE === "all") {
    console.log("\n── HTTP Integration Tests ───────────────────────────────────────────────────");

    if (!TEST_TOKEN) {
      console.log("⚠️   TEST_TOKEN not set. Skipping HTTP tests.");
      console.log("    Set it with: TEST_TOKEN=<jwt> npx tsx backend/tests/test-autonomy-agent.ts --mode=http");
    } else {
      const httpResults: TestResult[] = [];

      for (const tc of TEST_CASES) {
        process.stdout.write(`\n🌐 [${tc.id}] "${tc.query}"\n`);

        const result = await runHTTPTest(tc);
        result.mode = "http";
        httpResults.push(result);
        results.push(result);

        const icon = result.passed ? "✅" : "❌";
        process.stdout.write(`   ${icon} (${result.durationMs}ms)\n`);
        if (result.error) process.stdout.write(`   error: ${result.error}\n`);

        await sleep(HTTP_DELAY_MS); // throttle to avoid OpenAI TPM rate limits
      }
    }
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  printSummary(results);

  // Save JSON results
  const outPath = path.resolve(__dirname, "test-autonomy-results.json");
  fs.writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    mode: MODE,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      passRate: ((results.filter(r => r.passed).length / results.length) * 100).toFixed(1) + "%",
    },
    results,
  }, null, 2));
  console.log(`\n💾  Full results → ${outPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
