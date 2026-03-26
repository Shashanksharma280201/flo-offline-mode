/**
 * Master Agent Utility Functions
 * Date parsing and common utilities
 */

import robotModel from "../../models/robotModel";
import pathMapModel from "../../models/pathMapModel";

// ============== DATE PARSING UTILITIES ==============

/**
 * Parse natural language dates to ISO format
 * Supports: "today", "yesterday", "feb 1st", "january 1st 2024", ISO dates
 */
export function parseNaturalDate(query: string): string | null {
  if (!query) return null;

  const normalized = query.trim().toLowerCase();
  const now = new Date();

  // Handle relative dates
  if (normalized === "today") {
    return now.toISOString();
  }

  if (normalized === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString();
  }

  // Handle "N days ago"
  const daysAgoMatch = normalized.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1]);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  }

  // Month name mapping
  const monthMap: { [key: string]: number } = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    sept: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11
  };

  // Handle "feb 1st", "february 1", "feb 1st 2024"
  const monthDayYearMatch = normalized.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/
  );
  if (monthDayYearMatch) {
    const month = monthMap[monthDayYearMatch[1]];
    const day = parseInt(monthDayYearMatch[2]);
    const year = monthDayYearMatch[3]
      ? parseInt(monthDayYearMatch[3])
      : now.getFullYear();

    if (month !== undefined && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      return date.toISOString();
    }
  }

  // Handle "1st feb", "1 february 2024"
  const dayMonthYearMatch = normalized.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?$/
  );
  if (dayMonthYearMatch) {
    const day = parseInt(dayMonthYearMatch[1]);
    const month = monthMap[dayMonthYearMatch[2]];
    const year = dayMonthYearMatch[3]
      ? parseInt(dayMonthYearMatch[3])
      : now.getFullYear();

    if (month !== undefined && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      return date.toISOString();
    }
  }

  // Try parsing as ISO date or standard Date format
  const parsed = new Date(query);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
}

/**
 * Parse date query to timestamp range
 * Supports: "today", "yesterday", "thisWeek", "lastWeek", "thisMonth", "lastMonth", ISO dates
 */
export function parseDateQuery(
  query: string
): { from: number; to: number } | null {
  const now = new Date();
  let from: Date;
  let to: Date;

  switch (query.toLowerCase()) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      to = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
      break;

    case "yesterday":
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      from = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        0,
        0,
        0
      );
      to = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        23,
        59,
        59
      );
      break;

    case "thisweek":
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      from = new Date(now);
      from.setDate(now.getDate() + diffToMonday);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      break;

    case "lastweek":
      const lastWeekStart = new Date(now);
      const lastWeekDayOfWeek = now.getDay();
      const lastWeekDiffToMonday = lastWeekDayOfWeek === 0 ? -6 : 1 - lastWeekDayOfWeek;
      lastWeekStart.setDate(now.getDate() + lastWeekDiffToMonday - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);
      from = lastWeekStart;
      to = lastWeekEnd;
      break;

    case "thismonth":
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;

    case "lastmonth":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;

    default:
      // Try parsing as ISO date
      const parsed = new Date(query);
      if (!isNaN(parsed.getTime())) {
        from = new Date(
          parsed.getFullYear(),
          parsed.getMonth(),
          parsed.getDate(),
          0,
          0,
          0
        );
        to = new Date(
          parsed.getFullYear(),
          parsed.getMonth(),
          parsed.getDate(),
          23,
          59,
          59
        );
      } else {
        return null;
      }
  }

  return {
    from: from.getTime(),
    to: to.getTime()
  };
}

// ============== ROBOT NORMALIZATION HELPERS ==============

/**
 * Normalize robot query to variations
 * Handles: "MMR-31", "MMR 31", "MMR_31", "mmr31", "robot 31", "31"
 */
export function normalizeRobotQuery(query: string): string[] {
  const normalized = query.trim().toLowerCase();
  const variations: string[] = [];

  // Pattern 1: "robot 31" or "robot31" -> Extract number
  const robotMatch = normalized.match(/robot\s*(\d+)/);
  if (robotMatch) {
    const num = robotMatch[1];
    variations.push(`mmr-${num}`);
    variations.push(`mmr_${num}`);
    variations.push(`mmr ${num}`);
    variations.push(`mmr${num}`);
  }

  // Pattern 2: "MMR 31" or "MMR31" -> Normalize to all variations
  const mmrMatch = normalized.match(/mmr[\s_-]?(\d+)/);
  if (mmrMatch) {
    const num = mmrMatch[1];
    variations.push(`mmr-${num}`);
    variations.push(`mmr_${num}`);
    variations.push(`mmr ${num}`);
    variations.push(`mmr${num}`);
  }

  // Pattern 3: Just a number "31" -> Try all MMR variations
  if (/^\d+$/.test(normalized)) {
    variations.push(`mmr-${normalized}`);
    variations.push(`mmr_${normalized}`);
    variations.push(`mmr ${normalized}`);
    variations.push(`mmr${normalized}`);
  }

  // Pattern 4: Already contains separator -> Keep as-is and add variations
  if (normalized.includes("-") || normalized.includes("_")) {
    variations.push(normalized);
    const base = normalized.split(/[-_]/)[0];
    const num = normalized.split(/[-_]/)[1];
    if (base && num) {
      variations.push(`${base}-${num}`);
      variations.push(`${base}_${num}`);
      variations.push(`${base} ${num}`);
      variations.push(`${base}${num}`);
    }
  }

  // Pattern 5: No pattern matched, use original query
  if (variations.length === 0) {
    variations.push(normalized);
  }

  return variations;
}

/**
 * Score robot match quality
 */
export function scoreRobotMatch(query: string, robotName: string): number {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedName = robotName.trim().toLowerCase();

  // Exact match = 100 points
  if (normalizedName === normalizedQuery) {
    return 100;
  }

  // Exact match ignoring separators = 95 points
  const queryNoSep = normalizedQuery.replace(/[-_\s]/g, "");
  const nameNoSep = normalizedName.replace(/[-_\s]/g, "");
  if (nameNoSep === queryNoSep) {
    return 95;
  }

  // Starts with query = 90 points
  if (normalizedName.startsWith(normalizedQuery)) {
    return 90;
  }

  // Contains query = 70 points
  if (normalizedName.includes(normalizedQuery)) {
    return 70;
  }

  return 0;
}

// ============== PATHMAP NORMALIZATION HELPERS ==============

/**
 * Normalize pathmap query to variations
 */
export function normalizePathMapQuery(query: string): string[] {
  const normalized = query.trim().toLowerCase();
  const variations: string[] = [];

  // Add original query
  variations.push(normalized);

  // Handle "office" vs "office-1" vs "office 1"
  const matchNum = normalized.match(/^(.+?)[\s-]?(\d+)$/);
  if (matchNum) {
    const [, base, num] = matchNum;
    variations.push(`${base}-${num}`);
    variations.push(`${base} ${num}`);
    variations.push(`${base}${num}`);
    variations.push(base);
  }

  // Handle "the office" -> "office"
  if (normalized.startsWith("the ")) {
    variations.push(normalized.substring(4));
  }

  // Add variations with common separators
  if (normalized.includes(" ") && !normalized.match(/\d+$/)) {
    variations.push(normalized.replace(/\s+/g, ""));
    variations.push(normalized.replace(/\s+/g, "_"));
    variations.push(normalized.replace(/\s+/g, "-"));
  }

  return variations;
}

/**
 * Score pathmap match quality
 */
export function scorePathmapMatch(query: string, pathmapName: string): number {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedName = pathmapName.trim().toLowerCase();

  // Exact match = 100 points
  if (normalizedName === normalizedQuery) {
    return 100;
  }

  // Exact match ignoring separators = 95 points
  const queryNoSep = normalizedQuery.replace(/[-_\s]/g, "");
  const nameNoSep = normalizedName.replace(/[-_\s]/g, "");
  if (nameNoSep === queryNoSep) {
    return 95;
  }

  // Starts with query = 90 points
  if (normalizedName.startsWith(normalizedQuery)) {
    return 90;
  }

  // Contains query = 70 points
  if (normalizedName.includes(normalizedQuery)) {
    return 70;
  }

  // Partial word match = 60 points
  const queryWords = normalizedQuery.split(/[-_\s]+/);
  const nameWords = normalizedName.split(/[-_\s]+/);
  const matchingWords = queryWords.filter((qw) =>
    nameWords.some((nw) => nw === qw)
  );
  if (matchingWords.length > 0) {
    return 50 + (matchingWords.length / queryWords.length) * 20;
  }

  return 0;
}

// ============== MISSION NORMALIZATION HELPERS ==============

/**
 * Normalize mission query to variations
 */
export function normalizeMissionQuery(query: string): string[] {
  const normalized = query.trim().toLowerCase();
  const variations: string[] = [];

  // Add original query
  variations.push(normalized);

  // Handle "the kitchen" -> "kitchen"
  if (normalized.startsWith("the ")) {
    variations.push(normalized.substring(4));
  }

  // Handle "to kitchen" -> "kitchen"
  if (normalized.startsWith("to ")) {
    variations.push(normalized.substring(3));
  }

  return variations;
}

// ============== SCORING WITH DATABASE QUERIES ==============

/**
 * Find robots with scoring
 */
export async function findRobotsWithScoring(query: string): Promise<Array<{ robot: any; score: number }>> {
  const variations = normalizeRobotQuery(query);

  console.log(`[AI Agent] Robot search variations:`, variations);

  // Build OR conditions for all variations
  // NOTE: _id contains UUIDs, not robot names. Robot names are in the `name` field.
  const orConditions = variations.flatMap(variation => [
    { name: { $regex: new RegExp(`^${variation}$`, "i") } },  // Exact name match
    { name: { $regex: new RegExp(variation, "i") } }           // Contains name match
  ]);

  const allMatches = await robotModel.find({
    $or: orConditions
  }).select("id name status robotType fleet").limit(20);

  console.log(`[AI Agent] Found ${allMatches.length} robot candidates`);

  // Score each match - use name field, not _id (which is a UUID)
  const scoredMatches = allMatches.map(robot => ({
    robot: robot,
    score: scoreRobotMatch(query, robot.name || robot._id)
  }));

  // Sort by score descending
  scoredMatches.sort((a, b) => b.score - a.score);

  // Filter out very low scores (< 50)
  const goodMatches = scoredMatches.filter(m => m.score >= 50);

  console.log(`[AI Agent] Good matches (score >= 50):`,
    goodMatches.map(m => `${m.robot._id} (${m.score})`));

  return goodMatches;
}

/**
 * Find pathmaps with scoring
 */
export async function findPathmapsWithScoring(query: string): Promise<Array<{ pathmap: any; score: number }>> {
  const variations = normalizePathMapQuery(query);

  console.log(`[AI Agent] Pathmap search variations:`, variations);

  // Build OR conditions for all variations
  const orConditions = variations.flatMap(variation => [
    { name: { $regex: new RegExp(`^${variation}$`, "i") } },  // Exact match
    { name: { $regex: new RegExp(variation, "i") } }           // Contains match
  ]);

  const allMatches = await pathMapModel.find({
    $or: orConditions
  }).select("id name frame missions").limit(20);

  console.log(`[AI Agent] Found ${allMatches.length} pathmap candidates`);

  // Score each match
  const scoredMatches = allMatches.map(pm => ({
    pathmap: pm,
    score: scorePathmapMatch(query, pm.name)
  }));

  // Sort by score descending
  scoredMatches.sort((a, b) => b.score - a.score);

  // Filter out very low scores (< 50)
  const goodMatches = scoredMatches.filter(m => m.score >= 50);

  console.log(`[AI Agent] Good matches (score >= 50):`,
    goodMatches.map(m => `${m.pathmap.name} (${m.score})`));

  return goodMatches;
}
