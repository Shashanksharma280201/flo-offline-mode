/**
 * Question Generator
 * Generates appropriate questions based on missing information
 */

import robotModel from '../../models/robotModel';
import pathMapModel from '../../models/pathMapModel';

export class QuestionGenerator {
  /**
   * Generate the next question based on conversation state
   */
  async generateNextQuestion(state: any): Promise<string | null> {
    const { intent, collectedData, missingData, status } = state;

    // If confirming, generate confirmation question
    if (status === 'confirming') {
      return this.generateConfirmationQuestion(intent, collectedData);
    }

    // If gathering, ask for next missing parameter
    if (status === 'gathering' && missingData.length > 0) {
      const nextMissing = missingData[0];

      if (intent === 'execute_mission') {
        if (nextMissing === 'robotId') {
          return await this.askForRobot();
        } else if (nextMissing === 'pathMapName') {
          return await this.askForPathMap(collectedData.missionName);
        } else if (nextMissing === 'missionName') {
          return await this.askForMission(collectedData.pathMapName);
        }
      }

      if (intent === 'abort_mission' || intent === 'get_robot_info') {
        if (nextMissing === 'robotId') {
          return await this.askForRobot();
        }
      }
    }

    return null;
  }

  /**
   * Ask user to select a robot
   */
  private async askForRobot(): Promise<string> {
    try {
      const availableRobots = await robotModel
        .find({ robotType: 'autonomous' })
        .select('_id name status batteryPercentage')
        .limit(5);

      if (availableRobots.length === 0) {
        return "I couldn't find any available robots. Please check the fleet status.";
      }

      const robotList = availableRobots
        .map((r, i) => {
          const battery = (r as any).batteryPercentage ? `${(r as any).batteryPercentage}% battery` : 'battery unknown';
          return `${i + 1}. ${r._id} (${r.status}, ${battery})`;
        })
        .join('\n');

      return `Which robot would you like to use?\n\n${robotList}\n\nSay the number or robot ID.`;
    } catch (error) {
      console.error('[QuestionGenerator] Error fetching robots:', error);
      return "I'm having trouble fetching the robot list. Which robot ID would you like to use?";
    }
  }

  /**
   * Ask user to select a pathmap/location
   */
  private async askForPathMap(missionName?: string): Promise<string> {
    try {
      // If we know the mission name, find pathmaps that contain it
      let pathmaps;

      if (missionName) {
        pathmaps = await pathMapModel
          .find({
            'missions.name': { $regex: new RegExp(missionName, 'i') }
          })
          .select('name missions')
          .limit(8);

        if (pathmaps.length > 0) {
          const pathmapList = pathmaps
            .map((pm, i) => `${i + 1}. ${pm.name}`)
            .join('\n');

          return `I found "${missionName}" in these locations:\n\n${pathmapList}\n\nWhich location would you like to use?`;
        }
      }

      // If mission not found or not specified, show all pathmaps
      pathmaps = await pathMapModel
        .find({})
        .select('name missions')
        .limit(8);

      if (pathmaps.length === 0) {
        return "I couldn't find any pathmaps. Please check the configuration.";
      }

      const pathmapList = pathmaps
        .map((pm, i) => `${i + 1}. ${pm.name}`)
        .join('\n');

      return `Which location/pathmap would you like to use?\n\n${pathmapList}\n\nSay the number or location name.`;
    } catch (error) {
      console.error('[QuestionGenerator] Error fetching pathmaps:', error);
      return "Which location/pathmap would you like to use?";
    }
  }

  /**
   * Ask user to select a mission
   */
  private async askForMission(pathMapName?: string): Promise<string> {
    try {
      if (!pathMapName) {
        return "Which mission would you like to execute? (e.g., kitchen, dispenser, office)";
      }

      // Find the pathmap and list its missions
      const pathMap = await pathMapModel.findOne({
        name: { $regex: new RegExp(pathMapName, 'i') }
      }).select('name missions');

      if (!pathMap || !pathMap.missions || pathMap.missions.length === 0) {
        return `No missions found in "${pathMapName}". Which mission would you like to execute?`;
      }

      const missionList = pathMap.missions
        .map((m: any, i: number) => `${i + 1}. ${m.name}`)
        .join('\n');

      return `Which mission in "${pathMap.name}" would you like to execute?\n\n${missionList}\n\nSay the number or mission name.`;
    } catch (error) {
      console.error('[QuestionGenerator] Error fetching missions:', error);
      return "Which mission would you like to execute?";
    }
  }

  /**
   * Generate confirmation question before executing
   */
  private generateConfirmationQuestion(intent: string, collectedData: any): string {
    if (intent === 'execute_mission') {
      const robot = collectedData.robot?._id || collectedData.robotId;
      const mission = collectedData.mission?.name || collectedData.missionName;
      const pathmap = collectedData.pathMap?.name || collectedData.pathMapName;

      return `Ready to send ${robot} to "${mission}" in "${pathmap}".\n\nShould I proceed? (yes/no)`;
    }

    if (intent === 'abort_mission') {
      const robot = collectedData.robot?._id || collectedData.robotId;
      return `Abort mission on ${robot}?\n\nConfirm? (yes/no)`;
    }

    return "Should I proceed? (yes/no)";
  }

  /**
   * Generate disambiguation question when multiple matches found
   */
  generateDisambiguationQuestion(
    type: 'robot' | 'pathmap' | 'mission',
    query: string,
    options: any[]
  ): string {
    const optionsList = options
      .map((opt, i) => {
        if (type === 'robot') {
          return `${i + 1}. ${opt.robot._id} (${opt.robot.robotType}, status: ${opt.robot.status})`;
        } else if (type === 'pathmap') {
          return `${i + 1}. ${opt.pathmap.name}`;
        } else {
          return `${i + 1}. ${opt.name}`;
        }
      })
      .join('\n');

    return `I found multiple matches for "${query}":\n\n${optionsList}\n\nWhich one would you like? Say the number or exact name.`;
  }
}
