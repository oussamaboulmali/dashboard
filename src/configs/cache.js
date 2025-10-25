/**
 * @fileoverview Redis Configuration
 * Sets up Redis client and session store for session management.
 * @module configs/cache
 */

import { RedisStore } from "connect-redis";
import { createClient } from "redis";

/**
 * Redis client instance
 * @type {RedisClientType}
 */
const redisClient = createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

redisClient.connect().catch((err) => {
  console.error("Error connecting to Redis:", err);
});

// Log success connection
redisClient.on("connect", () => {
  console.log("Successfully connected to Redis");
});

/**
 * Redis session store for Express sessions
 * @type {RedisStore}
 */
const redisStore = new RedisStore({
  client: redisClient,
  prefix: "onlineapp:",
});

export default redisStore;
