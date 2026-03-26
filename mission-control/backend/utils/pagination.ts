/**
 * Pagination utility
 * Provides consistent pagination defaults and helpers across all controllers
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, 1 | -1>;
}

/**
 * Default pagination limits
 */
export const DEFAULT_PAGE_LIMIT = 100;
export const MAX_PAGE_LIMIT = 1000;

/**
 * Parse and validate pagination parameters from request query
 * @param query - Express request query object
 * @returns Validated pagination parameters
 */
export function parsePaginationParams(query: any): PaginationResult {
  // Parse page number (default to 1)
  let page = parseInt(query.page as string, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  // Parse limit (default to DEFAULT_PAGE_LIMIT, max MAX_PAGE_LIMIT)
  let limit = parseInt(query.limit as string, 10);
  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_PAGE_LIMIT;
  }
  if (limit > MAX_PAGE_LIMIT) {
    limit = MAX_PAGE_LIMIT;
  }

  // Calculate skip
  const skip = (page - 1) * limit;

  // Parse sort options
  const sortField = (query.sort as string) || "createdAt";
  const sortOrder = (query.order as string) === "asc" ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

  return {
    page,
    limit,
    skip,
    sort
  };
}

/**
 * Build paginated response with metadata
 * @param data - Array of results
 * @param total - Total count of records
 * @param page - Current page number
 * @param limit - Records per page
 * @returns Paginated response object
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage
    }
  };
}
