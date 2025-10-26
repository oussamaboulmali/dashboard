/**
 * @fileoverview Error Handling Middleware
 * Centralized error handling with custom error class and logging.
 * @module middlewares/errorMiddleware
 */

import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library.js";
import {
  dbErrorLogger,
  serverErrorLogger,
  userErrorLogger,
} from "../utils/logger.js";

/**
 * Custom error class for application errors
 * @class ErrorHandler
 * @extends Error
 */
export class ErrorHandler extends Error {
  /**
   * Creates an ErrorHandler instance
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {boolean} [hasSession] - Whether user has an active session
   * @param {boolean} [logout] - Whether to logout the user
   * @param {string} [inputError] - Input validation error details
   */
  constructor(statusCode, message, hasSession, logout, inputError) {
    super();
    this.status = "error";
    this.statusCode = statusCode;
    this.hasSession = hasSession;
    this.logout = logout;
    this.message = message;
    this.inputError = inputError;
  }
}
/**
 * Global error handling middleware
 * Handles different error types:
 * - Custom ErrorHandler errors
 * - Prisma database errors
 * - Generic server errors
 * Logs errors appropriately and sends formatted responses
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON error response
 */
export const handleError = (err, req, res, next) => {
  const { statusCode, message } = err;

  // If error is an instance of custom ErrorHandler, send custom error response
  if (err instanceof ErrorHandler) {
    userErrorLogger.error(customLog(req, err));
    return res.status(err.statusCode).json({
      success: false,
      ...(err.hasSession !== null && { hasSession: err.hasSession }),
      logout: err.logout,
      message: err.message,
    });
  }
  if (
    err instanceof PrismaClientValidationError ||
    err instanceof PrismaClientKnownRequestError ||
    err instanceof PrismaClientUnknownRequestError
  ) {
    dbErrorLogger.error(customLog(req, err));

    return res.status(500).json({
      status: "error",
      message:
        process.env.NODE_ENV === "production"
          ? "An error occurred from server try again"
          : message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  }
  // Log error to file logger
  serverErrorLogger.error(customLog(req, err));

  // Send generic error response with status code and message
  return res.status(statusCode || 500).json({
    status: "error",
    statusCode: statusCode || 500,
    message:
      process.env.NODE_ENV === "production"
        ? "An error occurred from server"
        : message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

/**
 * Creates a detailed log object for errors
 * @param {Object} req - Express request object
 * @param {Error} err - Error object
 * @returns {Object} Formatted log object with request metadata
 * @private
 */
const customLog = (req, err) => {
  return {
    statusCode: err.statusCode,
    ip: req.header("x-forwarded-for") || req.connection.remoteAddress,
    method: req.method || "-",
    url: req.originalUrl || "-",
    referrer: req.headers.referer || "-",
    userAgent: req.headers["user-agent"] || "-",
    hasSession: err.hasSession,
    message: err.message + (err.inputError ? " --> " + err.inputError : ""),
    stack: err.stack,
    timestamp: new Date().toISOString(),
  };
};
