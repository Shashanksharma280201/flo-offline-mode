/**
 * Master AI Agent - Main Entry Point
 * Consolidates all domain modules for the Master Agent
 * Provides unified interface for function definitions and execution
 */

import { Request } from "express";

// Import all function definitions
import { operatorFunctionDefinitions, OperatorFunctions } from "./operators";
import { clientFunctionDefinitions, ClientFunctions } from "./clients";
import { robotFunctionDefinitions, RobotFunctions } from "./robots";
import { missionFunctionDefinitions, MissionFunctions } from "./missions";
import { pathmapFunctionDefinitions, PathmapFunctions } from "./pathmaps";
import { issueFunctionDefinitions, IssueFunctions } from "./issues";
import { leadsFunctionDefinitions, LeadsFunctions } from "./leads";
import { navigationFunctionDefinitions, NavigationFunctions } from "./navigation";
import { analyticsFunctionDefinitions, AnalyticsFunctions } from "./analytics";
import { inventoryFunctionDefinitions, InventoryFunctions } from "./inventory";
import { shippingFunctionDefinitions, ShippingFunctions } from "./shipping";
import { overtimeFunctionDefinitions, OvertimeFunctions } from "./overtime";
import { materialsFunctionDefinitions, MaterialsFunctions } from "./materials";
import { billingFunctionDefinitions, BillingFunctions } from "./billing";

// ============== CONSOLIDATED FUNCTION DEFINITIONS ==============

/**
 * All available functions for OpenAI function calling
 * Consolidated from all domain modules
 */
export const availableFunctions = [
  ...operatorFunctionDefinitions,
  ...clientFunctionDefinitions,
  ...robotFunctionDefinitions,
  // NOTE: missionFunctionDefinitions REMOVED - Master Agent cannot execute missions
  // Use Autonomy Agent (/api/v1/autonomy-agent) for mission operations
  ...pathmapFunctionDefinitions,
  ...analyticsFunctionDefinitions,
  ...navigationFunctionDefinitions,
  ...issueFunctionDefinitions,
  ...leadsFunctionDefinitions,
  ...inventoryFunctionDefinitions,
  ...shippingFunctionDefinitions,
  ...overtimeFunctionDefinitions,
  ...materialsFunctionDefinitions,
  ...billingFunctionDefinitions
];

// ============== UNIFIED FUNCTION EXECUTOR ==============

/**
 * Master Agent Functions Class
 * Delegates to specialized domain function classes
 */
export class MasterAgentFunctions {
  private req: Request;

  // Domain function instances
  private operators: OperatorFunctions;
  private clients: ClientFunctions;
  private robots: RobotFunctions;
  private missions: MissionFunctions;
  private pathmaps: PathmapFunctions;
  private issues: IssueFunctions;
  private leads: LeadsFunctions;
  private navigation: NavigationFunctions;
  private analytics: AnalyticsFunctions;
  private inventory: InventoryFunctions;
  private shipping: ShippingFunctions;
  private overtime: OvertimeFunctions;
  private materials: MaterialsFunctions;
  private billing: BillingFunctions;

  constructor(req: Request) {
    this.req = req;

    // Initialize all domain function classes
    this.operators = new OperatorFunctions(req);
    this.clients = new ClientFunctions(req);
    this.robots = new RobotFunctions(req);
    this.missions = new MissionFunctions(req);
    this.pathmaps = new PathmapFunctions(req);
    this.issues = new IssueFunctions(req);
    this.leads = new LeadsFunctions(req);
    this.navigation = new NavigationFunctions(req);
    this.analytics = new AnalyticsFunctions(req);
    this.inventory = new InventoryFunctions(req);
    this.shipping = new ShippingFunctions(req);
    this.overtime = new OvertimeFunctions(req);
    this.materials = new MaterialsFunctions(req);
    this.billing = new BillingFunctions(req);
  }

  // ============== OPERATOR FUNCTIONS ==============
  async searchOperators(args: any) {
    return await this.operators.searchOperators(args);
  }

  async getOperatorDetails(args: any) {
    return await this.operators.getOperatorDetails(args);
  }

  async listOperators(args: any) {
    return await this.operators.listOperators(args);
  }

  // ============== CLIENT FUNCTIONS ==============
  async searchClients(args: any) {
    return await this.clients.searchClients(args);
  }

  async getClientDetails(args: any) {
    return await this.clients.getClientDetails(args);
  }

  async listClients(args: any) {
    return await this.clients.listClients(args);
  }

  // ============== ROBOT FUNCTIONS ==============
  async searchRobots(args: any) {
    return await this.robots.searchRobots(args);
  }

  async getRobotDetails(args: any) {
    return await this.robots.getRobotDetails(args);
  }

  async listRobots(args: any) {
    return await this.robots.listRobots(args);
  }

  async getRobotsByStatus() {
    return await this.robots.getRobotsByStatus();
  }

  // ============== MISSION FUNCTIONS ==============
  async executeRobotMission(args: any) {
    return await this.missions.executeRobotMission(args);
  }

  async selectDisambiguationChoice(args: any) {
    return await this.missions.selectDisambiguationChoice(args);
  }

  async abortRobotMission(args: any) {
    return await this.missions.abortRobotMission(args);
  }

  async getRobotMissionStatus(args: any) {
    return await this.missions.getRobotMissionStatus(args);
  }

  // ============== PATHMAP FUNCTIONS ==============
  async listPathMaps(args: any) {
    return await this.pathmaps.listPathMaps(args);
  }

  async getPathMapDetails(args: any) {
    return await this.pathmaps.getPathMapDetails(args);
  }

  async getMissionsInPathMap(args: any) {
    return await this.pathmaps.getMissionsInPathMap(args);
  }

  // ============== ANALYTICS FUNCTIONS ==============
  async getTripAnalytics(args: any) {
    return await this.analytics.getTripAnalytics(args);
  }

  async getTripStats(args: any) {
    return await this.analytics.getTripStats(args);
  }

  async getTopPerformers(args: any) {
    return await this.analytics.getTopPerformers(args);
  }

  async getFleetOverview(args: any) {
    return await this.analytics.getFleetOverview(args);
  }

  // ============== NAVIGATION FUNCTIONS ==============
  async navigateToPage(args: any) {
    return await this.navigation.navigateToPage(args);
  }

  // ============== ISSUE MANAGEMENT FUNCTIONS ==============
  async listIssues(args: any) {
    return await this.issues.listIssues(args);
  }

  async getIssuesByDateRange(args: any) {
    return await this.issues.getIssuesByDateRange(args);
  }

  async searchIssues(args: any) {
    return await this.issues.searchIssues(args);
  }

  // ============== LEADS (CRM) FUNCTIONS ==============
  async searchLeads(args: any) {
    return await this.leads.searchLeads(args);
  }

  async getLeadDetails(args: any) {
    return await this.leads.getLeadDetails(args);
  }

  async getLeadsByStage(args: any) {
    return await this.leads.getLeadsByStage(args);
  }

  async getLeadsByProduct(args: any) {
    return await this.leads.getLeadsByProduct(args);
  }

  async getTotalACV(args: any) {
    return await this.leads.getTotalACV(args);
  }

  async getTotalTCV(args: any) {
    return await this.leads.getTotalTCV(args);
  }

  // ============== INVENTORY MANAGEMENT FUNCTIONS ==============
  async listInventory(args: any) {
    return await this.inventory.listInventory(args);
  }

  async searchInventory(args: any) {
    return await this.inventory.searchInventory(args);
  }

  // ============== SHIPPING MANAGEMENT FUNCTIONS ==============
  async listShipments(args: any) {
    return await this.shipping.listShipments(args);
  }

  // ============== OVERTIME MANAGEMENT FUNCTIONS ==============
  async listOvertimeRequests(args: any) {
    return await this.overtime.listOvertimeRequests(args);
  }

  // ============== MATERIALS MANAGEMENT FUNCTIONS ==============
  async listMaterials(args: any) {
    return await this.materials.listMaterials(args);
  }

  async searchMaterials(args: any) {
    return await this.materials.searchMaterials(args);
  }

  async getClientMaterials(args: any) {
    return await this.materials.getClientMaterials(args);
  }

  // ============== BILLING MANAGEMENT FUNCTIONS ==============
  async getBillingSummary(args: any) {
    return await this.billing.getBillingSummary(args);
  }

  async getRobotBilling(args: any) {
    return await this.billing.getRobotBilling(args);
  }

  async getBillingByPeriod(args: any) {
    return await this.billing.getBillingByPeriod(args);
  }
}

// ============== FUNCTION EXECUTION DISPATCHER ==============

/**
 * Execute a function by name
 * Routes function calls to the appropriate domain module
 */
export async function executeFunctionCall(
  functionName: string,
  functionArgs: any,
  req: Request
): Promise<any> {
  const functions = new MasterAgentFunctions(req);

  switch (functionName) {
    // Operators
    case "searchOperators":
      return await functions.searchOperators(functionArgs);
    case "getOperatorDetails":
      return await functions.getOperatorDetails(functionArgs);
    case "listOperators":
      return await functions.listOperators(functionArgs);

    // Clients
    case "searchClients":
      return await functions.searchClients(functionArgs);
    case "getClientDetails":
      return await functions.getClientDetails(functionArgs);
    case "listClients":
      return await functions.listClients(functionArgs);

    // Robots
    case "searchRobots":
      return await functions.searchRobots(functionArgs);
    case "getRobotDetails":
      return await functions.getRobotDetails(functionArgs);
    case "listRobots":
      return await functions.listRobots(functionArgs);
    case "getRobotsByStatus":
      return await functions.getRobotsByStatus();

    // Missions
    case "executeRobotMission":
      return await functions.executeRobotMission(functionArgs);
    case "selectDisambiguationChoice":
      return await functions.selectDisambiguationChoice(functionArgs);
    case "abortRobotMission":
      return await functions.abortRobotMission(functionArgs);
    case "getRobotMissionStatus":
      return await functions.getRobotMissionStatus(functionArgs);

    // PathMaps
    case "listPathMaps":
      return await functions.listPathMaps(functionArgs);
    case "getPathMapDetails":
      return await functions.getPathMapDetails(functionArgs);
    case "getMissionsInPathMap":
      return await functions.getMissionsInPathMap(functionArgs);

    // Analytics
    case "getTripAnalytics":
      return await functions.getTripAnalytics(functionArgs);
    case "getTripStats":
      return await functions.getTripStats(functionArgs);
    case "getTopPerformers":
      return await functions.getTopPerformers(functionArgs);
    case "getFleetOverview":
      return await functions.getFleetOverview(functionArgs);

    // Navigation
    case "navigateToPage":
      return await functions.navigateToPage(functionArgs);

    // Issues
    case "listIssues":
      return await functions.listIssues(functionArgs);
    case "getIssuesByDateRange":
      return await functions.getIssuesByDateRange(functionArgs);
    case "searchIssues":
      return await functions.searchIssues(functionArgs);

    // Leads (CRM)
    case "searchLeads":
      return await functions.searchLeads(functionArgs);
    case "getLeadDetails":
      return await functions.getLeadDetails(functionArgs);
    case "getLeadsByStage":
      return await functions.getLeadsByStage(functionArgs);
    case "getLeadsByProduct":
      return await functions.getLeadsByProduct(functionArgs);
    case "getTotalACV":
      return await functions.getTotalACV(functionArgs);
    case "getTotalTCV":
      return await functions.getTotalTCV(functionArgs);

    // Inventory
    case "listInventory":
      return await functions.listInventory(functionArgs);
    case "searchInventory":
      return await functions.searchInventory(functionArgs);

    // Shipping
    case "listShipments":
      return await functions.listShipments(functionArgs);

    // Overtime
    case "listOvertimeRequests":
      return await functions.listOvertimeRequests(functionArgs);

    // Materials
    case "listMaterials":
      return await functions.listMaterials(functionArgs);
    case "searchMaterials":
      return await functions.searchMaterials(functionArgs);
    case "getClientMaterials":
      return await functions.getClientMaterials(functionArgs);

    // Billing
    case "getBillingSummary":
      return await functions.getBillingSummary(functionArgs);
    case "getRobotBilling":
      return await functions.getRobotBilling(functionArgs);
    case "getBillingByPeriod":
      return await functions.getBillingByPeriod(functionArgs);

    default:
      return {
        success: false,
        error: `Function ${functionName} not implemented`
      };
  }
}
