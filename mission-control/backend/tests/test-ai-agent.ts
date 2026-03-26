/**
 * AI Agent End-to-End Test Script
 *
 * This script tests the AI agent's ability to:
 * 1. Understand user requirements correctly
 * 2. Call the right functions with right parameters
 * 3. Navigate to correct pages
 * 4. Fetch and return relevant data
 *
 * Run with: npx ts-node backend/tests/test-ai-agent.ts
 */

import { openai } from "../services/ai";
import { availableFunctions } from "../services/aiAgentService";

// AI System Prompt (same as in controller)
const AI_SYSTEM_PROMPT = `You are an AI assistant for Flo Mobility fleet management system.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. ALWAYS call functions to answer user questions - NEVER respond without function calls
2. When user asks for data (list, show, get, find, etc.) - ALWAYS call the appropriate function first
3. Only respond with text AFTER you have called functions and received data
4. If user asks to see/show something - call the function AND call navigateToPage

IMPORTANT ENTITY DISTINCTIONS:
- CLIENTS = Physical sites/locations where robots operate (factories, warehouses)
- OPERATORS = People who work at those sites and operate the robots
- ROBOTS = Autonomous machines that perform tasks
NEVER confuse clients with operators!

AVAILABLE DATA (access via functions):
- Clients: searchClients, getClientDetails, listClients
- Operators: searchOperators, getOperatorDetails, listOperators
- Robots: searchRobots, getRobotDetails, listRobots, getRobotsByStatus
- Missions: executeRobotMission, abortRobotMission, getRobotMissionStatus
- PathMaps: listPathMaps, getPathMapDetails, getMissionsInPathMap
- Analytics: getTripAnalytics, getTopPerformers
- Fleet: getFleetOverview
- Navigation: navigateToPage (includes leads, dashboard, analytics, etc.)

QUERY DISAMBIGUATION RULES:
When user query contains "site", "location", "client", "factory", "warehouse" → Use CLIENT functions
When user query contains "operator", "person", "employee", "worker", "people" → Use OPERATOR functions
When user query contains "robot", "machine", "bot", "MMR" → Use ROBOT functions

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
- "show dashboard" → navigateToPage("dashboard")
- "show analytics" → navigateToPage("analytics")
- "show inventory" → navigateToPage("inventory")
- "show qc submissions" → navigateToPage("qc_submissions")

MISSIONS:
- "send robot X to kitchen" → searchRobots("X") + executeRobotMission()
- "abort robot X mission" → searchRobots("X") + abortRobotMission()
- "list available missions" → listPathMaps() + getMissionsInPathMap()

ANALYTICS:
- "trip stats today" → getTripAnalytics({ period: "today" })
- "robot X performance" → getTripAnalytics({ robotId: "X" })
- "top 5 operators" → getTopPerformers({ type: "operators", metric: "trips", limit: 5 })

RESPONSE FORMAT:
1. Call function(s) first
2. Wait for results
3. Summarize the data in 1-2 sentences
4. Be direct and specific

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

interface TestCase {
  id: string;
  query: string;
  expectedFunctions: string[];
  category: string;
}

const TEST_CASES: TestCase[] = [
  // Operator Tests
  { id: "OP-1", query: "list all operators", expectedFunctions: ["listOperators"], category: "Operators" },
  { id: "OP-2", query: "show operators", expectedFunctions: ["listOperators", "navigateToPage"], category: "Operators" },

  // Client Tests
  { id: "CL-1", query: "list all clients", expectedFunctions: ["listClients"], category: "Clients" },
  { id: "CL-2", query: "list all active clients", expectedFunctions: ["listClients"], category: "Clients" },
  { id: "CL-3", query: "show clients", expectedFunctions: ["listClients", "navigateToPage"], category: "Clients" },

  // Robot Tests - Name Variations
  { id: "RO-1", query: "list all robots", expectedFunctions: ["listRobots"], category: "Robots" },
  { id: "RO-2", query: "list idle robots", expectedFunctions: ["listRobots"], category: "Robots" },
  { id: "RO-3", query: "show robot MMR-31", expectedFunctions: ["searchRobots", "getRobotDetails"], category: "Robots" },
  { id: "RO-4", query: "show robot 31", expectedFunctions: ["searchRobots", "getRobotDetails"], category: "Robots - Smart Match" },
  { id: "RO-5", query: "what is the status of robot 31", expectedFunctions: ["searchRobots", "getRobotDetails"], category: "Robots - Smart Match" },

  // Mission Tests
  { id: "MI-1", query: "send MMR-31 to the kitchen in the office", expectedFunctions: ["executeRobotMission"], category: "Missions" },
  { id: "MI-2", query: "send robot 31 to kitchen", expectedFunctions: ["executeRobotMission"], category: "Missions - Smart Match" },
  { id: "MI-3", query: "abort mission on robot 31", expectedFunctions: ["abortRobotMission"], category: "Missions" },

  // Analytics Tests
  { id: "AN-1", query: "which robot has most trips", expectedFunctions: ["getTopPerformers"], category: "Analytics" },
  { id: "AN-2", query: "show top 5 operators", expectedFunctions: ["getTopPerformers"], category: "Analytics" },

  // Navigation Tests
  { id: "NAV-1", query: "show dashboard", expectedFunctions: ["navigateToPage"], category: "Navigation" },
  { id: "NAV-2", query: "show leads", expectedFunctions: ["navigateToPage"], category: "Navigation" },
  { id: "NAV-3", query: "show analytics", expectedFunctions: ["navigateToPage"], category: "Navigation" },
  { id: "NAV-4", query: "show inventory", expectedFunctions: ["navigateToPage"], category: "Navigation" },

  // Disambiguation Tests
  { id: "DIS-1", query: "list all sites", expectedFunctions: ["listClients"], category: "Disambiguation" },
  { id: "DIS-2", query: "list all workers", expectedFunctions: ["listOperators"], category: "Disambiguation" },
  { id: "DIS-3", query: "list all machines", expectedFunctions: ["listRobots"], category: "Disambiguation" },
];

interface TestResult {
  id: string;
  query: string;
  category: string;
  passed: boolean;
  actualFunctions: string[];
  expectedFunctions: string[];
  error?: string;
  response?: string;
}

async function testQuery(testCase: TestCase): Promise<TestResult> {
  try {
    console.log(`\n🧪 Testing [${testCase.id}]: "${testCase.query}"`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content: testCase.query }
      ],
      tools: availableFunctions.map(f => ({
        type: "function" as const,
        function: f
      })),
      tool_choice: "auto",
      temperature: 0.3 // Lower temperature for more consistent results
    });

    const message = response.choices[0].message;

    // Extract function calls
    const actualFunctions = message.tool_calls?.map(tc => tc.function.name) || [];

    // Check if expected functions were called
    const passed = testCase.expectedFunctions.every(fn =>
      actualFunctions.includes(fn)
    ) && actualFunctions.every(fn =>
      testCase.expectedFunctions.includes(fn)
    );

    const result: TestResult = {
      id: testCase.id,
      query: testCase.query,
      category: testCase.category,
      passed,
      actualFunctions,
      expectedFunctions: testCase.expectedFunctions,
      response: message.content || undefined
    };

    if (passed) {
      console.log(`✅ PASS - Called: ${actualFunctions.join(", ")}`);
    } else {
      console.log(`❌ FAIL`);
      console.log(`   Expected: ${testCase.expectedFunctions.join(", ")}`);
      console.log(`   Actual: ${actualFunctions.join(", ")}`);
    }

    // Log function arguments for inspection
    if (message.tool_calls) {
      message.tool_calls.forEach(tc => {
        console.log(`   📋 ${tc.function.name}(${tc.function.arguments})`);
      });
    }

    return result;

  } catch (error: any) {
    console.log(`❌ ERROR: ${error.message}`);
    return {
      id: testCase.id,
      query: testCase.query,
      category: testCase.category,
      passed: false,
      actualFunctions: [],
      expectedFunctions: testCase.expectedFunctions,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log("=".repeat(80));
  console.log("🤖 AI AGENT END-TO-END TEST SUITE");
  console.log("=".repeat(80));
  console.log(`\nTesting ${TEST_CASES.length} queries across multiple categories...\n`);

  const results: TestResult[] = [];

  for (const testCase of TEST_CASES) {
    const result = await testQuery(testCase);
    results.push(result);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate Report
  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(80));

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests} (${passRate}%)`);
  console.log(`❌ Failed: ${failedTests}`);

  // Group by category
  const categories = [...new Set(results.map(r => r.category))];
  console.log("\n📂 Results by Category:");

  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const categoryPassed = categoryResults.filter(r => r.passed).length;
    const categoryTotal = categoryResults.length;
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(0);

    console.log(`\n  ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);

    // Show failed tests in this category
    const failed = categoryResults.filter(r => !r.passed);
    if (failed.length > 0) {
      failed.forEach(f => {
        console.log(`    ❌ ${f.id}: "${f.query}"`);
        console.log(`       Expected: ${f.expectedFunctions.join(", ")}`);
        console.log(`       Got: ${f.actualFunctions.join(", ") || "No functions"}`);
      });
    }
  });

  console.log("\n" + "=".repeat(80));

  if (passRate === "100.0") {
    console.log("🎉 ALL TESTS PASSED! AI Agent is working perfectly!");
  } else if (parseFloat(passRate) >= 80) {
    console.log("✅ Most tests passed. AI Agent is working well with minor issues.");
  } else {
    console.log("⚠️  Many tests failed. AI Agent needs improvements.");
  }

  console.log("=".repeat(80));

  // Save results to file
  const fs = require('fs');
  const resultsFile = __dirname + '/test-results.json';
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      passRate: parseFloat(passRate)
    },
    results
  }, null, 2));

  console.log(`\n💾 Detailed results saved to: ${resultsFile}\n`);
}

// Run tests
runAllTests().catch(console.error);
