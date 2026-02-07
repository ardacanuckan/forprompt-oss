/**
 * Drizzle ORM PostgreSQL Integration
 *
 * This module provides database connection utilities and exports
 * the complete schema for ForPrompt's PostgreSQL backend.
 */

// Database connection utilities
export {
  createConnection,
  getDatabase,
  closeConnection,
  createMigrationConnection,
  type Database,
  type ConnectionOptions,
} from './connection';

// Re-export all schema definitions
export * from './schema';
