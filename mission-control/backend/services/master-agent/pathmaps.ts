/**
 * Master Agent - PathMap Functions
 * Handles pathmap listing, details, and mission retrieval
 */

import { Request } from "express";
import pathMapModel from "../../models/pathMapModel";

// ============== FUNCTION DEFINITIONS ==============
export const pathmapFunctionDefinitions = [
  {
    name: "listPathMaps",
    description: "List all available pathmaps with their missions",
    parameters: {
      type: "object",
      properties: {
        frame: {
          type: "string",
          enum: ["utm", "odom", "lidar"],
          description: "Filter by frame type"
        }
      }
    }
  },
  {
    name: "getPathMapDetails",
    description: "Get details about a specific pathmap including all missions and stations",
    parameters: {
      type: "object",
      properties: {
        pathMapId: {
          type: "string",
          description: "PathMap ID or name"
        }
      },
      required: ["pathMapId"]
    }
  },
  {
    name: "getMissionsInPathMap",
    description: "Get all missions available in a specific pathmap",
    parameters: {
      type: "object",
      properties: {
        pathMapName: {
          type: "string",
          description: "PathMap name"
        }
      },
      required: ["pathMapName"]
    }
  }
];

// ============== FUNCTION IMPLEMENTATIONS ==============
export class PathmapFunctions {
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async listPathMaps(args: { frame?: string }) {
    const query: any = {};
    if (args.frame) query.frame = args.frame;

    const pathMaps = await pathMapModel.find(query)
      .select("id name frame missions stations");

    return {
      success: true,
      count: pathMaps.length,
      pathMaps: pathMaps.map(pm => ({
        id: pm.id,
        name: pm.name,
        frame: pm.frame,
        missionsCount: pm.missions?.length || 0,
        stationsCount: pm.stations?.length || 0
      }))
    };
  }

  async getPathMapDetails(args: { pathMapId: string }) {
    const pathMap = await pathMapModel.findOne({
      $or: [
        { _id: args.pathMapId },
        { name: { $regex: args.pathMapId, $options: "i" } }
      ]
    });

    if (!pathMap) {
      return { success: false, error: "PathMap not found" };
    }

    return {
      success: true,
      pathMap: {
        id: pathMap.id,
        name: pathMap.name,
        frame: pathMap.frame,
        missions: pathMap.missions,
        stations: pathMap.stations
      }
    };
  }

  async getMissionsInPathMap(args: { pathMapName: string }) {
    const pathMap = await pathMapModel.findOne({
      name: { $regex: args.pathMapName, $options: "i" }
    }).select("name missions");

    if (!pathMap) {
      return { success: false, error: "PathMap not found" };
    }

    return {
      success: true,
      pathMapName: pathMap.name,
      missions: pathMap.missions.map((m: any) => ({
        id: m._id,
        name: m.name,
        pathsCount: m.mission?.length || 0
      }))
    };
  }
}
