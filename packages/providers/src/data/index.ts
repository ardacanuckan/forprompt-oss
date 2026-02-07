/**
 * Data provider abstractions
 *
 * This module defines interfaces for data/database providers,
 * allowing ForPrompt to support multiple backends (Convex, PostgreSQL, etc.)
 */

export interface QueryOptions {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface DataProvider {
  /**
   * Query records from a table/collection
   */
  query<T>(
    table: string,
    filter: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<PaginatedResult<T>>;

  /**
   * Get a single record by ID
   */
  get<T>(table: string, id: string): Promise<T | null>;

  /**
   * Insert a new record
   */
  insert<T>(table: string, data: Omit<T, 'id'>): Promise<T>;

  /**
   * Update an existing record
   */
  update<T>(table: string, id: string, data: Partial<T>): Promise<T>;

  /**
   * Delete a record
   */
  delete(table: string, id: string): Promise<void>;

  /**
   * Execute a transaction
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export type DataProviderFactory = () => DataProvider;
