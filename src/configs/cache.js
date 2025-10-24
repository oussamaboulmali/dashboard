import { RedisStore } from "connect-redis";
import { createClient } from "redis";

// Create a Redis client and connect with password
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

const redisStore = new RedisStore({
  client: redisClient,
  prefix: "onlineapp:",
});

export default redisStore;
