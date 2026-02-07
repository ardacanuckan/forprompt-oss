/**
 * PostgreSQL database connection using Drizzle ORM
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

let db: Database | null = null;
let client: postgres.Sql | null = null;

export interface ConnectionOptions {
  connectionString: string;
  max?: number;
  idleTimeout?: number;
  connectTimeout?: number;
}

/**
 * Create a database connection
 */
export function createConnection(options: ConnectionOptions): Database {
  const {
    connectionString,
    max = 10,
    idleTimeout = 20,
    connectTimeout = 10,
  } = options;

  client = postgres(connectionString, {
    max,
    idle_timeout: idleTimeout,
    connect_timeout: connectTimeout,
  });

  db = drizzle(client, { schema });

  return db;
}

/**
 * Get the current database connection
 * @throws Error if no connection has been established
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error(
      'Database connection not established. Call createConnection() first.'
    );
  }
  return db;
}

/**
 * Close the database connection
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

/**
 * Create a connection for migrations (with single connection)
 */
export function createMigrationConnection(
  connectionString: string
): postgres.Sql {
  return postgres(connectionString, { max: 1 });
}
