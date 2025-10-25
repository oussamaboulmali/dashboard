/**
 * @fileoverview Authentication Controller
 * Handles user authentication, login, logout, and session management operations.
 * @module controllers/authController
 */

import { ErrorHandler } from "../middlewares/errorMiddleware.js";
import { SecurityValidator } from "../middlewares/securityMiddleware.js";
import {
  closeSessionAndLogin,
  getStatistics,
  login,
  logout,
} from "../services/authService.js";
import { tryCatch } from "../utils/tryCatch.js";
import {
  signInSchema,
  closeSessionSchema,
  logOutSchema,
} from "../validations/authValidation.js";

/**
 * Extracts log data from request for authentication events
 * @param {Object} req - Express request object
 * @param {string} action - Authentication action (login, logout, etc.)
 * @returns {Object} Log data object with IP, referrer, user agent, and action
 */
const Logdata = (req, action) => {
  return {
    ip: req.header("x-forwarded-for") || req.connection.remoteAddress,
    referrer: req.headers.referer || "-",
    userAgent: req.headers["user-agent"] || "-",
    action: action,
  };
};

/**
 * Handles user login with security validation
 * - Validates username and password
 * - Checks for SQL injection, XSS, and other security threats
 * - Verifies account status (active, blocked, deleted)
 * - Enforces maximum login attempts (5 attempts before blocking)
 * - Detects existing active sessions
 * @route POST /api/v1/auth/login
 * @access Public
 * @param {string} req.body.username - Username (required, max 30 chars)
 * @param {string} req.body.password - Password (required, max 30 chars)
 * @returns {Object} 200 - Successful login with session data or hasSession flag
 * @returns {Object} 400 - Validation error
 * @returns {Object} 401 - Invalid credentials
 * @returns {Object} 403 - Account blocked or has active session
 */
export const Login = tryCatch(async (req, res) => {
  // Get IP address from request headers
  const ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
  // Validate the request body against the schema
  const { error } = signInSchema.validate(req.body);

  // Throw an error if validation fails
  if (error) {
    throw new ErrorHandler(
      400,
      `Input validation error ${
        process.env.NODE_ENV !== "production" ? error.details[0].message : ""
      } `,
      null,
      null,
      error.details[0].message
    );
  }

  const validator = new SecurityValidator();
  const threats = await validator.validateInput(req.body, ip, req.path);

  const hasThreats = Object.values(threats).some((arr) => arr.length > 0);

  if (hasThreats) {
    throw new ErrorHandler(403, "Username ou password incorrect.", false);
  }

  // Call the signIn service function to authenticate user
  const { hasSession, data } = await login(
    { ...req.body, ip },
    Logdata(req, "login")
  );

  if (hasSession) {
    return res.status(200).json({
      success: true,
      message: "You have a session , do you want to close it ?",
      hasSession,
      data,
    });
  } else {
    // Set data in session cookies to send
    req.session.sessionId = data.sessionId;
    req.session.username = data.username;
    req.session.userId = data.userId;

    return res.status(200).json({
      success: true,
      message: "Authentication successful. You are now logged in.",
      hasSession,
      data,
    });
  }
});

/**
 * Closes an existing active session and logs the user in with a new session
 * Used when a user tries to login but already has an active session
 * @route POST /api/v1/auth/close
 * @access Public
 * @param {number} req.body.sessionId - Existing session ID (required)
 * @param {number} req.body.userId - User ID (required)
 * @param {string} req.body.username - Username (required, max 30 chars)
 * @param {string} req.body.password - Password (required, max 20 chars)
 * @returns {Object} 200 - Success response with new session data
 * @returns {Object} 401 - Invalid credentials or session not found
 */
export const CloseRunningSession = tryCatch(async (req, res) => {
  // Validate the request body against the schema
  const { error } = closeSessionSchema.validate(req.body);
  // Throw an error if validation fails
  if (error) {
    throw new ErrorHandler(
      400,
      `Input validation error ${
        process.env.NODE_ENV !== "production" ? error.details[0].message : ""
      } `,
      null,
      null,
      error.details[0].message
    );
  }

  const ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
  // Call the closeSessionAndLogin service function to close session and send OTP
  await closeSessionAndLogin(req.body, Logdata(req, "login"));

  const { hasSession, data } = await login(
    { ...req.body, ip },
    Logdata(req, "login")
  );

  // Set data in session cookies to send
  req.session.sessionId = data.sessionId;
  req.session.username = data.username;
  req.session.userId = data.userId;

  // Respond with success message and data (userId,email)
  return res.status(200).json({
    success: true,
    message: "Authentication successful. You are now logged in.",
    hasSession,
    data,
  });
});

/**
 * Logs out the current user by destroying their session
 * @route POST /api/v1/auth/logout
 * @access Private (Authenticated)
 * @param {string} req.body.username - Username (optional, max 30 chars)
 * @returns {Object} 200 - Success response
 * @returns {Object} 404 - Session not found
 * @returns {Object} 500 - Error destroying session
 */
export const Logout = tryCatch(async (req, res) => {
  // Validate the request body against the schema
  const { error } = logOutSchema.validate(req.body);
  // Throw an error if validation fails
  if (error) {
    throw new ErrorHandler(
      400,
      `Input validation error ${
        process.env.NODE_ENV !== "production" ? error.details[0].message : ""
      } `,
      null,
      null,
      error.details[0].message
    );
  }

  // Call the logOut service function to log out user
  await logout(
    { ...req.body, sessionId: req.session.sessionId },
    Logdata(req, "logout")
  );

  // Destroy session and clear cookie upon successful logout
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.clearCookie(process.env.SESSION_NAME);
      return res
        .status(200)
        .json({ success: true, message: "Logged out successfully" });
    }
  });
});

/**
 * Retrieves dashboard statistics based on user role
 * - For regular users (role 2): Returns last 20 articles from assigned agencies
 * - For admin users: Returns comprehensive statistics including:
 *   - Connected users today
 *   - User statistics by state (active, deactivated, blocked, trashed)
 *   - Total articles count
 *   - Articles per day for last 7 days
 *   - Articles per agency today
 *   - Agency statistics
 * @route POST /api/v1/auth/stats
 * @access Private (Authenticated)
 * @returns {Object} 200 - Success response with statistics data
 */
export const GetStatistics = tryCatch(async (req, res) => {
  const data = await getStatistics({ userId: req.session.userId });

  return res.status(200).json({
    success: true,
    message: "Statistics Successfully fetched",
    data,
  });
});
