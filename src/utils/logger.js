import morgan from "morgan";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import dotenv from "dotenv";
dotenv.config();
// Log errors to the file logger
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);
export const userErrorLogger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm " }),
    winston.format.printf(
      ({
        timestamp,
        level,
        ip,
        method,
        url,
        statusCode,
        referrer,
        userAgent,
        message,
        stack,
      }) => {
        return `${timestamp} [${level}] [${ip}] ${method} ${url} ${statusCode} ${referrer} ${userAgent}\n ${message} \n${stack}`;
      },
      winston.format.json()
    )
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Adds color to the log level
        winston.format.printf(
          ({
            timestamp,
            level,
            ip,
            method,
            url,
            statusCode,
            referrer,
            userAgent,
            message,
            stack,
          }) => {
            return `${timestamp} [${level}] [${ip}] ${method} ${url} ${statusCode} ${referrer} ${userAgent}\n ${message} \n ${
              process.env.NODE_ENV === "production" ? " " : stack
            }`;
          }
        )
      ),
    }),
    new DailyRotateFile({
      level: "error",
      filename: `${process.env.LOG_PATH}/logs/user-errors/%DATE%.log`,
      datePattern: "YYYY-MM-DD",
    }),
    // new DailyRotateFile({
    //   level: "info",
    //   filename: `${process.env.LOG_SYS}/logs/user-errors/%DATE%.log`,
    //   datePattern: "YYYY-MM-DD",
    // }),
  ],
});

export const serverErrorLogger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm " }),
    winston.format.printf(
      ({
        timestamp,
        level,
        ip,
        method,
        url,
        statusCode,
        referrer,
        userAgent,
        message,
        stack,
      }) => {
        return `${timestamp} [${level}] [${ip}] ${method} ${url} ${statusCode} ${referrer} ${userAgent}\n ${message}\n${stack}`;
      }
    )
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Adds color to the log level
        winston.format.printf(
          ({
            timestamp,
            level,
            ip,
            method,
            url,
            statusCode,
            referrer,
            userAgent,
            message,
            stack,
          }) => {
            return `${timestamp} [${level}] [${ip}] ${method} ${url} ${statusCode} ${referrer} ${userAgent}\n ${message} \n ${
              process.env.NODE_ENV === "production" ? " " : stack
            }`;
          }
        )
      ),
    }),
    new DailyRotateFile({
      level: "error",
      filename: `${process.env.LOG_PATH}/logs/server-errors/%DATE%.log`,
      datePattern: "YYYY-MM-DD",
    }),
    // new DailyRotateFile({
    //   level: "info",
    //   filename: `${process.env.LOG_SYS}/logs/server-errors/%DATE%.log`,
    //   datePattern: "YYYY-MM-DD",
    // }),
  ],
});

export const dbErrorLogger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm " }),
    winston.format.printf(
      ({
        timestamp,
        level,
        ip,
        method,
        url,
        statusCode,
        referrer,
        userAgent,
        message,
        stack,
      }) => {
        return `${timestamp} [${level}] [${ip}] ${method} ${url} ${statusCode} ${referrer} ${userAgent}\n ${message}\n${stack}`;
      }
    )
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Adds color to the log level
        winston.format.printf(
          ({
            timestamp,
            level,
            ip,
            method,
            url,
            statusCode,
            referrer,
            userAgent,
            message,
            stack,
          }) => {
            return `${timestamp} [${level}] [${ip}] ${method} ${url} ${statusCode} ${referrer} ${userAgent}\n ${message} \n ${
              process.env.NODE_ENV === "production" ? " " : stack
            }`;
          }
        )
      ),
    }),
    new DailyRotateFile({
      level: "error",
      filename: `${process.env.LOG_PATH}/logs/db-errors/%DATE%.log`,
      datePattern: "YYYY-MM-DD",
    }),
    // new DailyRotateFile({
    //   level: "info",
    //   filename: `${process.env.LOG_SYS}/logs/db-errors/%DATE%.log`,
    //   datePattern: "YYYY-MM-DD",
    // }),
  ],
});

export const Httplogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf((msg) => {
      return `${msg.timestamp} [${msg.level}] ${msg.message}`;
    })
  ),
  transports: [new winston.transports.Console({ level: "http" })],
});

export const morganConfig = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  {
    stream: {
      write: (message) => Httplogger.http(message.trim()),
    },
  }
);

const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [new winston.transports.Console()],
  exceptionHandlers: [
    new DailyRotateFile({
      level: "error",
      filename: `${process.env.LOG_PATH}/logs/exception/%DATE%.log`,
      datePattern: "YYYY-MM-DD",
    }),
    new DailyRotateFile({
      level: "info",
      filename: `${process.env.LOG_SYS}/logs/exception/%DATE%.log`,
      datePattern: "YYYY-MM-DD",
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      level: "error",
      filename: `${process.env.LOG_PATH}/logs/rejections/%DATE%.log`,
      datePattern: "YYYY-MM-DD",
    }),
    // new DailyRotateFile({
    //   level: "info",
    //   filename: `${process.env.LOG_SYS}/logs/rejections/%DATE%.log`,
    //   datePattern: "YYYY-MM-DD",
    // }),
  ],
});

export const infoLogger = (folderName) => {
  return winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm" }),
      winston.format.printf(
        ({ timestamp, level, ip, referrer, userAgent, message, username }) => {
          return `${timestamp} [${level.toUpperCase()}] [Client ${ip}] ${
            username ? `[user ${username}]` : ""
          } ${message} \nreferer: ${referrer} agent: ${userAgent}`;
        }
      ),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(), // Apply color to all fields
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm" }),
          winston.format.printf(
            ({
              timestamp,
              level,
              ip,
              referrer,
              userAgent,
              message,
              username,
            }) => {
              // Remove debug console.log calls for cleaner output
              return `${timestamp} [${level.toUpperCase()}] [Client ${ip}] ${
                username ? `[user ${username}]` : ""
              } ${message} \nreferer: ${referrer}, agent: ${userAgent}`;
            }
          )
        ),
      }),
      new DailyRotateFile({
        level: "info",
        filename: `${process.env.LOG_PATH}/logs_info/${folderName}/%DATE%.log`,
        datePattern: "YYYY-MM-DD",
      }),
      // new DailyRotateFile({
      //   level: "info",
      //   filename: `${process.env.LOG_SYS}/logs_info/${folderName}/%DATE%.log`,
      //   datePattern: "YYYY-MM-DD",
      // }),
    ],
  });
};

export const deniedLogger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm" }),
    winston.format.printf(
      ({ timestamp, level, ip, referrer, userAgent, message, username }) => {
        return `${timestamp} [${level.toUpperCase()}] [Client ${ip}] ${
          username ? `[user ${username}]` : ""
        }${message} \nreferer: ${referrer} agent: ${userAgent} `;
      }
    ),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Adds color to the log level
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm" }),
        winston.format.printf(
          ({
            timestamp,
            level,
            ip,
            referrer,
            userAgent,
            message,
            username,
          }) => {
            return `${timestamp} [${level.toUpperCase()}] [Client ${ip}] ${
              username ? `[user ${username}]` : ""
            } ${message} \nreferer: ${referrer} agent: ${userAgent} `;
          }
        )
      ),
    }),
    new DailyRotateFile({
      level: "info",
      filename: `${process.env.LOG_PATH}/logs_info/erreurs_connexion/%DATE%.log`,
      datePattern: "YYYY-MM-DD",
    }),
    // new DailyRotateFile({
    //   level: "info",
    //   filename: `${process.env.LOG_SYS}/logs_info/erreurs_connexion/%DATE%.log`,
    //   datePattern: "YYYY-MM-DD",
    // }),
  ],
});
