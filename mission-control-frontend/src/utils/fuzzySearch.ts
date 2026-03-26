import Fuse from 'fuse.js';
import { ClientData, RobotType } from '@/data/types';

/**
 * Normalize a string for better matching
 * Removes/replaces special characters like hyphens, underscores, spaces
 * Example: "K2K-Green Gables" -> "k2kgreengables"
 */
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[-_\s]/g, '') // Remove hyphens, underscores, spaces
    .trim();
};

/**
 * Fuzzy search options configuration
 * Enhanced for phonetic similarity in voice transcription
 */
const FUZZY_SEARCH_OPTIONS = {
  threshold: 0.4, // Increased from 0.5 to 0.4 for stricter but still phonetically-aware matching
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  ignoreLocation: true, // Don't care where in the string the match is
  // Extended search helps find matches across all properties
  useExtendedSearch: false,
  // Keys to search across
  findAllMatches: true, // Find all matches, not just first
};

export interface FuzzySearchResult<T> {
  item: T;
  score: number; // 0 = perfect match, 1 = no match
  matches?: string[];
}

/**
 * Fuzzy search for clients by name
 */
export const fuzzySearchClients = (
  query: string,
  clients: ClientData[],
  maxResults: number = 5
): FuzzySearchResult<ClientData>[] => {
  if (!query || !clients.length) return [];

  const fuse = new Fuse(clients, {
    ...FUZZY_SEARCH_OPTIONS,
    keys: ['name', 'id'],
  });

  const results = fuse.search(query, { limit: maxResults });

  return results.map((result) => ({
    item: result.item,
    score: result.score || 0,
    matches: result.matches?.map((m) => m.key).filter((key): key is string => key !== undefined),
  }));
};

/**
 * Fuzzy search for robots by name or ID
 */
export const fuzzySearchRobots = (
  query: string,
  robots: RobotType[] | { id: string; name: string }[],
  maxResults: number = 5
): FuzzySearchResult<{ id: string; name: string }>[] => {
  if (!query || !robots.length) return [];

  const fuse = new Fuse(robots, {
    ...FUZZY_SEARCH_OPTIONS,
    keys: ['name', 'id'],
  });

  const results = fuse.search(query, { limit: maxResults });

  return results.map((result) => ({
    item: result.item,
    score: result.score || 0,
    matches: result.matches?.map((m) => m.key).filter((key): key is string => key !== undefined),
  }));
};

/**
 * Find exact match or closest matches
 * Returns exact match if found, otherwise returns fuzzy matches
 * Enhanced with partial prefix match detection
 */
export const findClientWithFallback = (
  query: string,
  clients: ClientData[]
): {
  exactMatch: ClientData | null;
  fuzzyMatches: FuzzySearchResult<ClientData>[];
  needsDisambiguation: boolean;
  isPartialPrefix: boolean;
} => {
  if (!query || !clients.length) {
    return { exactMatch: null, fuzzyMatches: [], needsDisambiguation: false, isPartialPrefix: false };
  }

  const normalizedQuery = normalizeString(query);
  const queryLower = query.toLowerCase();

  // Try exact match first (case-insensitive and normalized)
  const exactMatch = clients.find(
    (client) =>
      client.name.toLowerCase() === queryLower ||
      client.id.toLowerCase() === queryLower ||
      normalizeString(client.name) === normalizedQuery ||
      normalizeString(client.id) === normalizedQuery
  );

  if (exactMatch) {
    return { exactMatch, fuzzyMatches: [], needsDisambiguation: false, isPartialPrefix: false };
  }

  // If no exact match, perform fuzzy search
  const fuzzyMatches = fuzzySearchClients(query, clients, 10); // Get more results for better disambiguation

  if (fuzzyMatches.length === 0) {
    return { exactMatch: null, fuzzyMatches: [], needsDisambiguation: false, isPartialPrefix: false };
  }

  // Check if query is a partial prefix match (e.g., "K2K" matching "K2K - Green Gables", "K2K - Blue Valley")
  // This forces disambiguation when user's query is the start of multiple client names
  const prefixMatches = clients.filter((client) => {
    const clientNameLower = client.name.toLowerCase();
    const clientNameNormalized = normalizeString(client.name);
    // Check if client name starts with query (in either original or normalized form)
    // AND is not an exact match (already handled above)
    return (
      (clientNameLower.startsWith(queryLower) || clientNameNormalized.startsWith(normalizedQuery)) &&
      clientNameLower !== queryLower &&
      clientNameNormalized !== normalizedQuery
    );
  });

  const isPartialPrefix = prefixMatches.length > 1;

  // Determine if disambiguation is needed:
  // 1. If it's a partial prefix match (multiple clients start with the query)
  // 2. If multiple fuzzy matches have very similar scores (within 0.02 threshold)
  // 3. If the best match score is not good enough (> 0.02 means uncertain)
  let needsDisambiguation = false;

  if (isPartialPrefix) {
    needsDisambiguation = true;
  } else if (fuzzyMatches.length > 1) {
    const bestScore = fuzzyMatches[0].score;
    const secondScore = fuzzyMatches[1].score;
    const scoreDifference = secondScore - bestScore;

    // If top match score > 0.02 (not very confident) OR score difference < 0.05 (too close)
    if (bestScore > 0.02 || scoreDifference < 0.05) {
      needsDisambiguation = true;
    }
  }

  return {
    exactMatch: null,
    fuzzyMatches: isPartialPrefix ? prefixMatches.map((client, idx) => ({
      item: client,
      score: 0.01, // Give prefix matches a good score
      matches: ['name']
    })) : fuzzyMatches,
    needsDisambiguation,
    isPartialPrefix
  };
};

/**
 * Find exact robot match or closest matches
 */
export const findRobotWithFallback = (
  query: string,
  robots: RobotType[] | { id: string; name: string }[]
): {
  exactMatch: { id: string; name: string } | null;
  fuzzyMatches: FuzzySearchResult<{ id: string; name: string }>[];
} => {
  if (!query || !robots.length) {
    return { exactMatch: null, fuzzyMatches: [] };
  }

  const normalizedQuery = normalizeString(query);

  // Try exact match first (case-insensitive and normalized)
  const exactMatch = robots.find(
    (robot) =>
      robot.name.toLowerCase() === query.toLowerCase() ||
      robot.id.toLowerCase() === query.toLowerCase() ||
      normalizeString(robot.name) === normalizedQuery ||
      normalizeString(robot.id) === normalizedQuery
  );

  if (exactMatch) {
    return { exactMatch, fuzzyMatches: [] };
  }

  // If no exact match, perform fuzzy search
  const fuzzyMatches = fuzzySearchRobots(query, robots);

  return { exactMatch: null, fuzzyMatches };
};

/**
 * Generic fuzzy search for any array of objects with name/id fields
 */
export const fuzzySearchGeneric = <T extends { name: string; id: string }>(
  query: string,
  items: T[],
  maxResults: number = 5
): FuzzySearchResult<T>[] => {
  if (!query || !items.length) return [];

  const fuse = new Fuse(items, {
    ...FUZZY_SEARCH_OPTIONS,
    keys: ['name', 'id'],
  });

  const results = fuse.search(query, { limit: maxResults });

  return results.map((result) => ({
    item: result.item,
    score: result.score || 0,
    matches: result.matches?.map((m) => m.key).filter((key): key is string => key !== undefined),
  }));
};

/**
 * Check if fuzzy match is good enough (score < threshold)
 * Lower score = better match
 */
export const isGoodMatch = (score: number): boolean => {
  return score < 0.3; // Scores below 0.3 are considered good matches
};

/**
 * Format fuzzy search results for disambiguation
 */
export const formatFuzzyResultsForDisambiguation = <T extends { name: string; id: string }>(
  results: FuzzySearchResult<T>[],
  query: string,
  entityType: 'client' | 'robot' | 'pathmap' | 'mission'
): {
  message: string;
  options: Array<{ number: number; name: string; id: string }>;
} => {
  const options = results.map((result, index) => ({
    number: index + 1,
    name: result.item.name,
    id: result.item.id,
  }));

  const message = `I couldn't find an exact match for "${query}". Did you mean one of these ${entityType}s?`;

  return { message, options };
};
