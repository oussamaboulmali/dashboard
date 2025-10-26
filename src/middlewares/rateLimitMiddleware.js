/**
 * @fileoverview Rate Limiting Middleware
 * Protects API from abuse with rate limiting and IP blocking.
 * - Limits requests to 10 per second per IP
 * - Blocks violating IPs for 1 hour
 * - Sends email notifications for violations
 * @module middlewares/rateLimitMiddleware
 */

import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";

/**
 * Tracks IP addresses and their last notification time
 * Prevents spam of notification emails (max 1 per IP per 24 hours)
 * @type {Map<string, number>}
 */
const notificationTracker = new Map();

/**
 * Email transporter for sending rate limit notifications
 * @type {nodemailer.Transporter}
 */
const transporter = nodemailer.createTransport({
  host: "mail.aps.dz",
  port: 25,
  auth: {
    user: process.env.ADMIN_MAIL,
    pass: process.env.ADMIN_MAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Ignore certificate validation
  },
});

/**
 * Sends email notification when IP exceeds rate limit
 * @param {string} ipAddress - Blocked IP address
 * @param {string} endpoint - API endpoint that was hit
 * @returns {Promise<void>}
 * @private
 */
const sendNotificationEmail = async (ipAddress, endpoint) => {
  try {
    await transporter.sendMail({
      from: process.env.ADMIN_MAIL,
      to: process.env.RECEPTION_MAIL,
      subject: `🚨 Rate Limit Exceeded Alert - ${process.env.PROJECT_NAME}`,
      html: `
        <h2>Rate Limit Exceeded Alert</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>IP Address:</strong> ${ipAddress}</p>
        <p><strong>Endpoint:</strong> ${endpoint}</p>
        <h3>The IP address ${ipAddress} has exceeded the rate limit and has been blocked for 1 hour.</h3>
      `,
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

/**
 * Checks if we should send notification for this IP
 * Limits to one notification per IP per 24 hours
 * @param {string} ipAddress - IP address to check
 * @returns {boolean} True if notification should be sent
 * @private
 */
const shouldNotifyForIP = (ipAddress) => {
  const now = Date.now();
  const lastNotification = notificationTracker.get(ipAddress);

  if (!lastNotification || now - lastNotification > 24 * 60 * 60 * 1000) {
    notificationTracker.set(ipAddress, now);
    return true;
  }
  return false;
};

/**
 * Stores blocked IP addresses with timestamp and hit count
 * @type {Map<string, {timestamp: number, hitCount: number}>}
 */
const blockedIPs = new Map();

/**
 * Middleware to check if IP is currently blocked
 * Blocks last for 1 hour from last violation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const blockMiddleware = (req, res, next) => {
  const ipAddress =
    req.header("x-forwarded-for") || req.connection.remoteAddress;
  const now = Date.now();
  const blockData = blockedIPs.get(ipAddress);

  if (blockData) {
    const { timestamp, hitCount } = blockData;
    // Check if the IP is still in blocking period (1 hour)
    if (now - timestamp < 60 * 60 * 1000) {
      return res.status(429).json({
        success: false,
        hasSession: false,
        message:
          "Votre adresse IP a été bloquée pendant 1 heure en raison d'un nombre excessif de requêtes.",
        // remainingTime: Math.ceil(
        //   (timestamp + 60 * 60 * 1000 - now) / 1000 / 60
        // ), // remaining minutes
      });
    } else {
      // Block period expired, remove from blocked list
      blockedIPs.delete(ipAddress);
    }
  }
  next();
};

/**
 * Rate limiting middleware configuration
 * Limits: 10 requests per second per IP
 * @type {Function}
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: 1000, // 1 minute window for rate limiting
  limit: 10, // limit each IP to 100 requests per minute
  handler: async (req, res, next, options) => {
    const ipAddress =
      req.header("x-forwarded-for") || req.connection.remoteAddress;

    const endpoint = req.path;

    // Add or update IP in blocked list
    blockedIPs.set(ipAddress, {
      timestamp: Date.now(),
      hitCount: (blockedIPs.get(ipAddress)?.hitCount || 0) + 1,
    });

    // Send notification if needed
    if (shouldNotifyForIP(ipAddress)) {
      await sendNotificationEmail(ipAddress, endpoint);
    }

    return res.status(options.statusCode).json({
      success: false,
      hasSession: false,
      message:
        "Trop de requêtes créées à partir de cette adresse IP. Vous êtes bloqué pendant 1 heure.",
    });
  },
});

/**
 * Combined rate limiting middleware
 * Applies both IP block checking and rate limiting
 * @type {Array<Function>}
 */
export const combinedRateLimitMiddleware = [
  blockMiddleware,
  rateLimitMiddleware,
];
