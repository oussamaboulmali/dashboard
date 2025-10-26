/**
 * @fileoverview Database URL Builder
 * Constructs MySQL connection string from environment variables.
 * @module utils/dbUrl
 */

/**
 * Builds MySQL connection URL from environment variables
 * Properly encodes password to handle special characters
 * @returns {string} MySQL connection string
 * @example
 * // Returns: mysql://user:pass@localhost:3306/dbname
 */
export function buildDatabaseUrl() {
  const password = process.env.DATABASE_PASSWORD;
  const connectionString = `mysql://${
    process.env.DATABASE_USER
  }:${encodeURIComponent(password)}@${process.env.DATABASE_HOST}:${
    process.env.DATABASE_PORT
  }/${process.env.DATABASE_NAME}`;
  return connectionString;
}
