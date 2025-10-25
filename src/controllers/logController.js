/**
 * @fileoverview Log Controller
 * Handles system logs, session logs, and application monitoring operations.
 * @module controllers/logController
 */

import { ErrorHandler } from "../middlewares/errorMiddleware.js";
import {
  clearSession,
  getAllSessionsLogs,
  getLogsFileName,
  getOneLog,
} from "../services/logService.js";

import { infoLogger } from "../utils/logger.js";
import { tryCatch } from "../utils/tryCatch.js";
import {
  clearSessionSchema,
  frontlogSchema,
  logsSchema,
  sessionSchema,
} from "../validations/logValidation.js";

/**
 * Creates custom log entries from frontend
 * @param {Object} req - Express request object
 * @param {string} level - Log level (info, error)
 * @param {string} message - Log message
 * @param {string} action - Action being logged
 * @param {string} folder - Log folder/category
 */
const customLog = (req, level, message, action, folder) => {
  const logger = infoLogger(folder);
  const data = {
    ip: req.header("x-forwarded-for") || req.connection.remoteAddress,
    referrer: req.headers.referer || "-",
    userAgent: req.headers["user-agent"] || "-",
    username: req.session.username,
    message: message,
    action: action,
  };
  if (level === "info") {
    logger.info(data);
  } else {
    logger.error(data);
  }
};

/**
 * Retrieves all user sessions for a specific date
 * @route POST /api/v1/logs/session
 * @access Private (Menu ID: 4)
 * @param {string} req.body.date - Date to fetch sessions for (ISO format, required)
 * @returns {Object} 200 - Success response with array of sessions including username and status
 */
export const GetAllSessionsLogs = tryCatch(async (req, res) => {
  const { error } = sessionSchema.validate(req.body);

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
  const data = await getAllSessionsLogs(req.body);

  return res.status(200).json({
    success: true,
    message: "Sessions Logs Successfully fetched",
    data,
  });
});

/**
 * Retrieves all available log files organized by folder
 * @route POST /api/v1/logs
 * @access Private (Menu ID: 4)
 * @returns {Object} 200 - Success response with log files grouped by folder
 */
export const GetLogsFileName = tryCatch(async (req, res) => {
  const data = await getLogsFileName();

  return res.status(200).json({
    success: true,
    message: "Logs files name Successfully fetched",
    data,
  });
});

/**
 * Retrieves and parses a specific log file
 * @route POST /api/v1/logs/file
 * @access Private (Menu ID: 4)
 * @param {string} req.body.filename - Log filename to retrieve (required)
 * @returns {Object} 200 - Success response with parsed log entries
 * @returns {Object} 401 - Error reading log file
 */
export const GetOneLog = tryCatch(async (req, res) => {
  const { error } = logsSchema.validate(req.body);

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
  const data = await getOneLog(req.body);

  return res.status(200).json({
    success: true,
    message: "Log Successfully fetched",
    data,
  });
});

/**
 * Forcefully clears/terminates a user session (admin function)
 * @route PUT /api/v1/logs/session
 * @access Private (Menu ID: 4)
 * @param {number} req.body.sessionId - Session ID to clear (required)
 * @returns {Object} 201 - Success response
 * @returns {Object} 401 - Session not found
 */
export const ClearSession = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = clearSessionSchema.validate(req.body);

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

  const username = await clearSession(req.body);

  // customLog(
  //   req,
  //   `The user ${req.session.username} with ID ${req.session.userId} has Cleared the following User session :"${username}"`
  // );

  return res.status(201).json({
    success: true,
    message: `User Session cleared successfully`,
  });
});

/**
 * Creates a log entry from frontend application
 * @route POST /api/v1/logs/front
 * @access Public (No authentication required)
 * @param {string} req.body.level - Log level (max 10 chars, required)
 * @param {string} req.body.folder - Log folder/category (max 20 chars, required)
 * @param {string} req.body.action - Action being logged (max 50 chars, can be empty)
 * @param {string} req.body.message - Log message (required)
 * @returns {Object} 201 - Success response
 */
export const CreateFrontLog = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = frontlogSchema.validate(req.body);

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

  const { level, message, action, folder } = req.body;

  customLog(req, level, message, action, folder);

  return res.status(201).json({
    success: true,
    message: `Front log created successfully`,
  });
});
