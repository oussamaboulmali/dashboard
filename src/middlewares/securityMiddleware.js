import nodemailer from "nodemailer";
import { ErrorHandler } from "./errorMiddleware.js";
export class SecurityValidator {
  constructor() {
    // SQL Injection patterns
    this.sqlInjectionPattern = new RegExp(
      "\\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\\b.*\\b(FROM|TABLE|DATABASE)\\b|" +
        "['\"].*?(OR|AND).*?['\"].*?=|" +
        "\\s+(OR|AND)\\s+['\"]?\\w+['\"]?\\s*=|" +
        "1\\s*=\\s*1|" +
        "true\\s*--|" +
        "'|\"|" +
        "['\"]\\s*--",
      "i"
    );

    // XSS attack patterns
    this.xssPattern = new RegExp(
      "<script.*?>|" +
        "javascript:|" +
        "on\\w+\\s*=|" +
        "data:text\\/html|" +
        "&#x[0-9A-Fa-f]+|" +
        "eval\\(",
      "i"
    );

    // Path traversal patterns
    this.pathTraversalPattern = new RegExp(
      "\\.{2,}[\\/\\\\]|" + // matches ../ or ..\
        "~[\\/\\\\]|" + // matches ~/
        "\\/etc\\/[^/]*$|" + // matches /etc/passwd etc
        "[A-Za-z]:[\\/\\\\]|" + // matches C:/ or C:\
        "\\/proc\\/|" + // matches /proc/
        "\\/var\\/|" + // matches /var/
        "\\/srv\\/", // matches /srv/
      "i"
    );

    // Command injection patterns
    this.commandInjectionPattern = new RegExp(
      ";\\s*\\w+|" + // Command chaining
        "\\|\\s*\\w+|" + // Pipe commands
        "`.*`|" + // Backtick execution
        "\\$\\(.*\\)|" + // Command substitution
        "&\\s*\\w+|" + // Background execution
        "\\\\n|" + // Newline injection
        "\\\\r|" + // Carriage return injection
        "\\|\\||" + // OR operator
        "&&", // AND operator
      "i"
    );

    // Maximum input length to process
    this.MAX_INPUT_LENGTH = 10000;

    // Setup email transport
    this.transporter = nodemailer.createTransport({
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
  }

  async sendSecurityAlert(threats, ip, endpoint) {
    const emailContent = {
      from: process.env.ADMIN_MAIL,
      to: process.env.RECEPTION_MAIL,
      subject: `🚨 Security Threat Detected - ${process.env.PROJECT_NAME}`,
      html: `
        <h2>Security Threat Alert</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>IP Address:</strong> ${ip}</p>
        <p><strong>Endpoint:</strong> ${endpoint}</p>
        <h3>Detected Threats:</h3>
        <pre>${JSON.stringify(threats, null, 2)}</pre>
      `,
    };

    try {
      this.transporter.sendMail(emailContent);
    } catch (error) {
      console.error("Failed to send security alert:", error);
    }
  }

  async validateInput(inputData, ip = "0.0.0.0", endpoint = "default") {
    const threats = {
      sqlInjection: [],
      xss: [],
      pathTraversal: [],
      commandInjection: [],
      overflow: [],
    };

    // Early exit for empty input
    if (!inputData || Object.keys(inputData).length === 0) {
      return threats;
    }

    for (const [field, value] of Object.entries(inputData)) {
      // Skip non-string values
      if (typeof value !== "string") continue;

      // Check input length first
      if (value.length > this.MAX_INPUT_LENGTH) {
        threats.overflow.push({
          field,
          length: value.length,
          maxAllowed: this.MAX_INPUT_LENGTH,
        });
        continue;
      }

      // SQL Injection check
      if (this.sqlInjectionPattern.test(value)) {
        threats.sqlInjection.push({ field, value });
      }

      // XSS check
      if (this.xssPattern.test(value)) {
        threats.xss.push({ field, value });
      }

      // Path traversal check
      if (this.pathTraversalPattern.test(value)) {
        threats.pathTraversal.push({ field, value });
      }

      // Command injection check
      if (this.commandInjectionPattern.test(value)) {
        threats.commandInjection.push({ field, value });
      }
    }

    // If any threats detected, send email alert
    const hasThreats = Object.values(threats).some((arr) => arr.length > 0);
    if (hasThreats) {
      await this.sendSecurityAlert(threats, ip, endpoint);
    }

    return threats;
  }
}

// Express middleware
export const securityMiddleware = async (req, res, next) => {
  const validator = new SecurityValidator();

  try {
    const threats = await validator.validateInput(
      req.body,
      req.header("x-forwarded-for") || req.connection.remoteAddress,
      req.path
    );

    const hasThreats = Object.values(threats).some((arr) => arr.length > 0);

    if (hasThreats) {
      throw new ErrorHandler(403, "Username ou password incorrect.", false);
    }

    next();
  } catch (error) {
    next(error);
  }
};
