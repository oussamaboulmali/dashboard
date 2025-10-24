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

export const GetLogsFileName = tryCatch(async (req, res) => {
  const data = await getLogsFileName();

  return res.status(200).json({
    success: true,
    message: "Logs files name Successfully fetched",
    data,
  });
});

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
