import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { handleError } from "./src/middlewares/errorMiddleware.js";
import { morganConfig } from "./src/utils/logger.js";
import authRouter from "./src/routes/auth.js";
import agencyRouter from "./src/routes/agency.js";
import userRouter from "./src/routes/user.js";
import logRouter from "./src/routes/log.js";
import compression from "compression";
import { validateClient } from "./src/middlewares/authMiddleware.js";
import redisStore from "./src/configs/cache.js";
import { combinedRateLimitMiddleware } from "./src/middlewares/rateLimitMiddleware.js";
dotenv.config();

const app = express();

app.use(compression());

app.set("trust proxy", 1);

const isFortiGateProxy = (req) => {
  const forwardedHost = req.get("X-Forwarded-Host");
  const originalUrl = req.originalUrl || req.url;

  return forwardedHost && originalUrl.includes("/proxy/");
};

// Dynamic session configuration based on environment
const getSessionConfig = (req) => {
  const baseConfig = {
    secret: process.env.SESSION_SECRET,
    name: process.env.SESSION_NAME,
    store: redisStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
  };

  // Check if we're behind FortiGate proxy
  if (isFortiGateProxy(req)) {
    return {
      ...baseConfig,
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: "none", // Changed from "strict" to "none" for proxy compatibility
        maxAge: process.env.SESSION_TIME * 60 * 1000,
        path: "/", // Set to root path instead of proxy path
        domain: undefined, // Let browser handle domain automatically
      },
    };
  } else {
    return {
      ...baseConfig,
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: "strict",
        maxAge: process.env.SESSION_TIME * 60 * 1000,
      },
    };
  }
};

// Middleware to apply dynamic session configuration
app.use((req, res, next) => {
  const sessionConfig = getSessionConfig(req);
  session(sessionConfig)(req, res, next);
});

// Parse the CORS_ORIGINS as a JSON-like array
let allowedOrigins = [];
try {
  allowedOrigins = JSON.parse(process.env.CORS_ORIGINS || "[]");
} catch (error) {
  console.error("Error parsing CORS_ORIGINS:", error.message);
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["POST", "PUT"],
  })
);
app.use(helmet());
app.use(validateClient);
app.use(combinedRateLimitMiddleware);
app.use(morganConfig);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "1kb" }));

//Routes

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/agencies", agencyRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/logs", logRouter);

// Start the server

app.listen(process.env.PORT || 5000, () => {
  console.log("--------------------------------------");
  console.log(`Server is running on port ${process.env.PORT} `);
  console.log("--------------------------------------");
});

// error middlewares
app.use(handleError);
