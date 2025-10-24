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

// Utility function to extract log request data and send it to the authService
const Logdata = (req, action) => {
  return {
    ip: req.header("x-forwarded-for") || req.connection.remoteAddress,
    referrer: req.headers.referer || "-",
    userAgent: req.headers["user-agent"] || "-",
    action: action,
  };
};

// Controller function for user login
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

// Controller function for closing an active session and sending OTP
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

export const GetStatistics = tryCatch(async (req, res) => {
  const data = await getStatistics({ userId: req.session.userId });

  return res.status(200).json({
    success: true,
    message: "Statistics Successfully fetched",
    data,
  });
});
