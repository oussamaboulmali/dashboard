import path from "path";
import prisma from "../configs/database.js";
import fs from "fs";
import { ErrorHandler } from "../middlewares/errorMiddleware.js";

export const getAllSessionsLogs = async ({ date }) => {
  const dateToget = new Date(date);
  // Set time to beginning of the day
  dateToget.setHours(0, 0, 0, 0);

  // Fetch sessions for today from the database
  const sessions = await prisma.online2024_sessions.findMany({
    where: {
      login_date: {
        gte: dateToget, // Greater than or equal to start of the day
        lt: new Date(dateToget.getTime() + 24 * 60 * 60 * 1000), // Less than end of the day
      },
    },
    include: {
      online2024_users: {
        select: {
          username: true,
        },
      },
    },
    orderBy: {
      login_date: "desc",
    },
  });

  // Convert BigInt to regular number before sending response
  const sessionsFormatted = sessions.map((session) => {
    const { online2024_users, ...rest } = session;
    return {
      ...rest,
      id_session: Number(session.id_session),
      username: online2024_users.username,
    };
  });

  return sessionsFormatted;
};

export const getActiveSessionsLogs = async ({ date }) => {
  const dateToget = new Date(date);
  // Set time to beginning of the day
  dateToget.setHours(0, 0, 0, 0);

  // Fetch sessions for today from the database
  const sessions = await prisma.online2024_sessions.findMany({
    where: {
      login_date: {
        gte: dateToget, // Greater than or equal to start of the day
        lt: new Date(dateToget.getTime() + 24 * 60 * 60 * 1000), // Less than end of the day
      },
      is_active: true,
    },
    include: {
      online2024_users: {
        select: {
          username: true,
        },
      },
    },
    orderBy: {
      login_date: "desc",
    },
  });

  // Convert BigInt to regular number before sending response
  const sessionsFormatted = sessions.map((session) => {
    const { online2024_users, ...rest } = session;
    return {
      ...rest,
      id_session: Number(session.id_session),
      username: online2024_users.username,
    };
  });

  return sessionsFormatted;
};

export const clearSession = async (data) => {
  const { sessionId } = data;

  // Find the session by session ID
  const existingSession = await prisma.online2024_sessions.findUnique({
    where: {
      id_session: sessionId,
    },
  });

  if (!existingSession) {
    throw new ErrorHandler(401, "there is no session founded");
  }

  // Close the current session
  const session = await prisma.online2024_sessions.update({
    where: {
      id_session: sessionId,
    },
    data: {
      is_active: false,
      logout_date: new Date(),
    },
    include: {
      online2024_users: {
        select: {
          username: true,
        },
      },
    },
  });

  return session.online2024_users.username;
};

const parseJsonLogs = (data) => {
  // Split the data by newline characters to get individual JSON strings
  const jsonStrings = data.split("\n");

  const nonEmptyJsonStrings = jsonStrings.filter((str) => str.trim() !== "");

  // Parse each JSON string and return as an array of objects
  const parsedLogs = nonEmptyJsonStrings.map((jsonString) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return null;
    }
  });

  // Filter out any null values resulting from failed parsing
  return parsedLogs.filter((log) => log !== null);
};

export const getOneLog = async ({ filename }) => {
  const logFilePath = path.join(process.env.LOG_PATH, "logs_info", filename);
  try {
    // Read the log file and send its contents as response
    const data = await fs.promises.readFile(logFilePath, "utf-8");

    return parseJsonLogs(data);
  } catch (err) {
    throw new ErrorHandler(
      401,
      `Error reading logs directory: ${
        process.env.NODE_ENV !== "developpement" ? err.message : ""
      }`
    );
  }
};

export const getLogsFileName = async () => {
  const logsPath = path.join(process.env.LOG_PATH, "logs_info");
  try {
    // Read the logs directory
    const entries = await fs.promises.readdir(logsPath, {
      withFileTypes: true,
    });

    // Filter out only directories
    const folders = entries.filter((entry) => entry.isDirectory());

    // Prepare response data
    const responseData = await Promise.all(
      folders.map(async (folder) => {
        const folderName = folder.name;
        const folderPath = path.join(logsPath, folderName);
        const files = await fs.promises.readdir(folderPath);
        return {
          [folderName]: files,
        };
      })
    );
    // Merge objects to get a single object
    const result = Object.assign({}, ...responseData);

    return result;
  } catch (err) {
    throw new ErrorHandler(
      401,
      "Error reading logs directory:" + process.env.NODE_ENV !== "production"
        ? err.message
        : ""
    );
  }
};
