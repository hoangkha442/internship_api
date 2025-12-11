export interface PaginationOptions {
  page?: number | string;
  limit?: number | string;
  maxLimit?: number;
}

export interface PaginationResult<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: T[];
}

export function parsePaginationQuery(options: PaginationOptions) {
  let page = Number(options.page) || 1;
  let limit = Number(options.limit) || 10;

  if (page < 1) page = 1;

  if (limit < 1) limit = 10;

  const maxAllowed = options.maxLimit ?? 100;
  if (limit > maxAllowed) limit = maxAllowed;

  return { page, limit };
}

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginationResult<T> {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data,
  };
}
