/**
 * @fileoverview User Controller
 * Handles user management operations including CRUD, authentication, role management,
 * agency assignments, and account state management.
 * @module controllers/userController
 */

import { ErrorHandler } from "../middlewares/errorMiddleware.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
  createUser,
  getAllUsers,
  getOneUser,
  resetUserPassword,
  changeUserPassword,
  unblockUser,
  updateUser,
  addAgencyToUser,
  removeAgenciesFromUser,
  activateUser,
  getOtherAgenciesOfUser,
  getAllMenu,
  blockUser,
  setRefreshTime,
  getLoggedUserDetails,
  updateLoggedUser,
  getAllRoles,
  changeStateUser,
} from "../services/userService.js";
import { infoLogger } from "../utils/logger.js";
import { tryCatch } from "../utils/tryCatch.js";
import {
  blockSchema,
  changeStateSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  updateUserSchema,
  userIdSchema,
  userAgenciesRemoveSchema,
  userAgenciesSchema,
  userSchema,
  refreshTimeSchema,
} from "../validations/userValidation.js";
import { blockMessage } from "../utils/blockMessage.js";
import { logout, logoutOtherUser } from "../services/authService.js";
import { sendEmail } from "../helpers/authHelper.js";
const logger = infoLogger("utilisateurs");

/**
 * Creates a custom log object for user operations
 * @param {Object} params - Parameters object
 * @param {Object} params.req - Express request object
 * @param {string} params.message - Log message
 * @param {string} params.action - Action being performed
 * @returns {Object} Formatted log object
 */
const customLog = ({ req, message, action }) => {
  const msg = message ?? "";
  return {
    ip: req.header("x-forwarded-for") || req.connection.remoteAddress,
    referrer: req.headers.referer || "-",
    userAgent: req.headers["user-agent"] || "-",
    action: action,
    username: req.session.username,
    message: msg,
  };
};

/**
 * Retrieves all users filtered by service based on current user's role
 * Users are sorted by state (active first, then blocked, then deactivated)
 * @route POST /api/v1/users
 * @access Private (Authenticated)
 * @returns {Object} 200 - Success response with array of users including roles, services, and agencies
 */
export const GetAllUsers = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = userIdSchema.validate({ userId: req.session.userId });
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

  const data = await getAllUsers({ userId: req.session.userId });

  return res.status(200).json({
    success: true,
    message: "users Successfully fetched",
    data,
  });
});

/**
 * Retrieves all available roles and services based on current user's permissions
 * Admin users see all roles, non-admin users only see role ID 2
 * @route POST /api/v1/users/roles
 * @access Private (Menu ID: 5)
 * @returns {Object} 200 - Success response with roles and services arrays
 */
export const GetAllRoles = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = userIdSchema.validate({ userId: req.session.userId });
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

  const data = await getAllRoles({ userId: req.session.userId });

  return res.status(200).json({
    success: true,
    message: "Roles Successfully fetched",
    data,
  });
});

/**
 * Retrieves detailed information about a specific user
 * @route POST /api/v1/users/detail
 * @access Private (Menu ID: 5)
 * @param {number} req.body.userId - User ID (required)
 * @returns {Object} 200 - Success response with user details including assigned agencies
 * @returns {Object} 404 - User not found
 */
export const GetOneUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = userIdSchema.validate(req.body);
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

  const data = await getOneUser(req.body);

  return res.status(200).json({
    success: true,
    message: "user Successfully fetched",
    data,
  });
});

/**
 * Retrieves detailed information about the currently logged-in user
 * @route POST /api/v1/users/detailme
 * @access Private (Authenticated)
 * @returns {Object} 200 - Success response with current user's details
 * @returns {Object} 404 - User not found
 */
export const GetLoggedUserDetails = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = userIdSchema.validate({ userId: req.session.userId });
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

  const data = await getLoggedUserDetails({ userId: req.session.userId });

  return res.status(200).json({
    success: true,
    message: "user Successfully fetched",
    data,
  });
});

/**
 * Retrieves all agencies NOT assigned to a specific user
 * Used for assigning new agencies to the user
 * @route POST /api/v1/users/other
 * @access Private (Menu ID: 5)
 * @param {number} req.body.userId - User ID (required)
 * @returns {Object} 200 - Success response with array of available agencies
 * @returns {Object} 401 - User not found
 */
export const GetOtherAgenciesOfUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = userIdSchema.validate(req.body);

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

  const data = await getOtherAgenciesOfUser(req.body, req.session.userId);

  return res.status(200).json({
    success: true,
    message: "other agencies Successfully fetched",
    data,
  });
});

/**
 * Creates a new user with assigned agencies
 * @route POST /api/v1/users/create
 * @access Private (Menu ID: 5)
 * @param {string} req.body.username - Username (required, max 30 chars)
 * @param {string} req.body.password - Password (required, 6-20 chars)
 * @param {string} req.body.designation - Full name/designation (required, max 60 chars)
 * @param {number[]} req.body.agencies - Array of agency IDs to assign (required, min 1)
 * @param {number} req.body.roleId - Role ID (required)
 * @param {number} req.body.serviceId - Service ID (required)
 * @param {number} req.body.lang - Language preference (required: 1=Arabic, 2=French, 3=English)
 * @param {string} req.body.email - Email address (optional, max 30 chars)
 * @param {string} req.body.contact - Contact info (optional, max 50 chars)
 * @param {string} req.body.fonction - Function/position (optional, max 50 chars)
 * @param {string} req.body.contact_numbers - Additional contact numbers (optional)
 * @param {string} req.body.contact_emails - Additional contact emails (optional)
 * @returns {Object} 201 - Success response with created user info
 * @returns {Object} 401 - Username taken, role/service/agency not found
 */
export const CreateUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = userSchema.validate(req.body);

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

  // Call the signUp service function to create a new user
  const data = await createUser(
    {
      ...req.body,
      assignedby: req.session.username,
    },
    customLog({ req, action: "creation" })
  );

  logger.info(
    customLog({
      req,
      message: `L'utilisateur "${
        data.username
      }" a été créé avec les agencies suivants : ${data.agencies.map(
        (name) => name
      )}`,
      action: "creation",
    })
  );

  return res.status(201).json({
    success: true,
    message: "Un utilisateur créé avec succès.",
    data,
  });
});

/**
 * Resets a user's password (admin function) and logs out the user
 * @route PUT /api/v1/users/reset
 * @access Private (Menu ID: 5)
 * @param {number} req.body.userId - User ID (required)
 * @param {string} req.body.password - New password (required, 6-20 chars)
 * @returns {Object} 201 - Success response
 * @returns {Object} 401 - User not found or deactivated
 */
export const ResetUserPassword = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = resetPasswordSchema.validate(req.body);

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

  // Call the signUp service function to create a new user
  const username = await resetUserPassword(
    {
      ...req.body,
      modifiedby: req.session.username,
    },
    customLog({ req, action: "modification" })
  );

  logger.info(
    customLog({
      req,
      message: `Le mot de passe de l'utilisateur "${username}" a été réinitialisé.`,
      action: "modification",
    })
  );

  // logout other users
  await logoutOtherUser(req.body);

  return res.status(201).json({
    success: true,
    message: "Mot de passe de l'utilisateur a été réinitialisé avec succès.",
  });
});

/**
 * Allows a user to change their own password
 * @route PUT /api/v1/users/changepassword
 * @access Private (Authenticated)
 * @param {number} req.body.userId - User ID (required)
 * @param {string} req.body.oldPassword - Current password (required, 6-20 chars)
 * @param {string} req.body.newPassword - New password (required, 6-20 chars)
 * @returns {Object} 200 - Success response
 * @returns {Object} 401 - User not found
 * @returns {Object} 403 - Incorrect old password
 */
export const ChangeUserPassword = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = updatePasswordSchema.validate(req.body);

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

  // Call the changeUserPassword service function to create a new user
  await changeUserPassword(
    { ...req.body, modifiedby: req.session.username },
    customLog({ req, action: "modification" })
  );

  logger.info(
    customLog({
      req,
      message: `L'utilisateur a changé son mot de passe avec succès.`,
      action: "modification",
    })
  );

  return res.status(200).json({
    success: true,
    message: "Mot de passe a été changé avec succès.",
  });
});

/**
 * Changes user account state (activate/deactivate/delete) and logs out the user
 * States: 0=Deactivated, 1=Active, 3=Deleted/Trashed
 * @route PUT /api/v1/users/state
 * @access Private (Menu ID: 5)
 * @param {number} req.body.userId - User ID (required)
 * @param {number} req.body.state - New state (required, valid: 0, 1, 3)
 * @param {string} req.body.note - Reason for state change (required, min 5 chars)
 * @returns {Object} 201 - Success response
 * @returns {Object} 401 - User not found
 */
export const ChangeStateUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = changeStateSchema.validate(req.body);

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
  let action;
  let actionMsg;
  switch (req.body.state) {
    case 0:
      action = "desactivation";
      actionMsg = "désactivé";
      break;
    case 1:
      action = "activation";
      actionMsg = "activé";
      break;
    case 3:
      action = "supperssion";
      actionMsg = "supprimé";
      break;
    default:
      break;
  }
  const username = await changeStateUser(
    {
      ...req.body,
      changeBy: req.session.username,
    },
    customLog({ req, action: action })
  );

  logger.info(
    customLog({
      req,
      message: `${action} du compte utilisateur suivant : "${username}"`,
      action: action,
    })
  );
  // logout other users
  await logoutOtherUser(req.body);

  return res.status(201).json({
    success: true,
    message: `L'utilisateur a été ${actionMsg} avec succès.`,
  });
});

/**
 * Blocks a user account with a specific block code and sends email notification
 * Block codes: 210 (5 failed login attempts), 220 (ToS violation)
 * @route PUT /api/v1/users/block
 * @access Private (Authenticated)
 * @param {number} req.body.userId - User ID (required)
 * @param {number} req.body.blockCode - Block reason code (required, valid: 210, 220)
 * @returns {Object} 201 - Success response
 * @returns {Object} 401 - User not found
 */
export const BlockUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = blockSchema.validate({
    userId: req.session.userId,
    ...req.body,
  });

  if (error) {
    throw new ErrorHandler(400, "Input validation error ");
  }

  const username = await blockUser(
    { userId: req.session.userId, ...req.body },
    customLog({ req, action: "blocage" })
  );

  logger.info(
    customLog({
      req,
      message: `Le compte de l'utilisateur "${username}" a été bloqué ${
        blockMessage[req.body.blockCode].log
      } `,
      action: "blocage",
    })
  );

  await sendEmail(
    `Le compte de l'utilisateur "${username}" a été bloqué ${
      blockMessage[req.body.blockCode].log
    } `
  );

  // logout other users
  await logoutOtherUser(req.body);

  return res.status(201).json({
    success: true,
    message: blockMessage[req.body.blockCode].message,
  });
});

/**
 * Extracts IPv4 address from IPv6 format (::ffff:x.x.x.x)
 * @param {string} ipv6 - IPv6 or mixed format IP address
 * @returns {string} IPv4 address
 */
export function ipv6ToIpv4(ipv6) {
  // Split the input string by commas to handle multiple IPs
  const ipList = ipv6.split(",").map((ip) => ip.trim());

  // Process the first IP in the list
  const firstIp = ipList[0];

  if (firstIp.includes("::ffff:")) {
    const ipv4Part = firstIp.split("::ffff:")[1];
    return ipv4Part;
  } else {
    return firstIp;
  }
}

/**
 * Blocks an IP address at the system level using Python script
 * Sends email notification when IP is blocked
 * @route PUT /api/v1/users/blockip
 * @access Private (Authenticated)
 * @returns {Object} 200 - Success response
 * @returns {Object} 500 - Error executing block script
 */
export const BlockIpAddress = async (req, res) => {
  // Retrieve and normalize the IP address
  const ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
  const ipAddress = ipv6ToIpv4(ip);

  // Define the script path and log file
  const scriptPath = "/home/block_ip.py";

  // Spawn the child process to run the script
  const child = spawn(scriptPath, [ipAddress]);

  // Capture stderr for errors
  child.stderr.on("data", (data) => {
    const errorMessage = `stderr: ${data.toString().trim()}`;
    console.error(errorMessage);
  });

  // Handle errors in spawning the child process
  child.on("error", (error) => {
    const errorMessage = `Process error: ${error.message}`;
    console.error(errorMessage);
  });
  // Handle process close event
  child.on("close", async (code) => {
    if (code === 0) {
      const successMessage = `IP ${ipAddress} has been successfully blocked.`;
      console.log(successMessage);
      await sendEmail(
        `L'addresse IP "${ipAddress}" a été bloqué en raison d'une violation des termes d'utilisation.`
      );

      return res.status(200).json({
        success: true,
        message: `Account has been successfully blocked.`,
      });
    } else {
      const failureMessage = `Failed to block IP ${ipAddress} (Exit code: ${code}).`;
      console.log(failureMessage);
    }
  });
};

/**
 * Unblocks a blocked user account
 * @route PUT /api/v1/users/unblock
 * @access Private (Menu ID: 5)
 * @param {number} req.body.userId - User ID (required)
 * @param {number} req.body.state - New state (required)
 * @returns {Object} 201 - Success response
 * @returns {Object} 401 - User not found
 */
export const UnblockUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = changeStateSchema.validate(req.body);

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

  const username = await unblockUser(
    {
      ...req.body,
      unblockedBy: req.session.username,
    },
    customLog({ req, action: "deblocage" })
  );

  logger.info(
    customLog({
      req,
      message: `Le compte de l'utilisateur "${username}" a été débloqué.`,
      action: "deblocage",
    })
  );

  return res.status(201).json({
    success: true,
    message: "Le déblocage de l'utilisateur a été effectué avec succés.",
  });
});

/**
 * @deprecated Use ChangeStateUser instead
 * Activates or deactivates a user account and logs out the user
 * @route PUT /api/v1/users/activate
 * @access Private (Menu ID: 5)
 * @param {number} req.body.userId - User ID (required)
 * @param {boolean} req.body.type - true for activate, false for deactivate
 * @returns {Object} 201 - Success response
 */
export const ActivateUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = changeStateSchema.validate(req.body);

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
  const action = req.body.type ? "activation" : "desactivation";
  const username = await activateUser(
    {
      ...req.body,
      changeBy: req.session.username,
    },
    customLog({ req, action: action })
  );

  logger.info(
    customLog({
      req,
      message: `${action} du compte utilisateur suivant : "${username}"`,
      action: action,
    })
  );
  // logout other users
  await logoutOtherUser(req.body);

  return res.status(201).json({
    success: true,
    message: `L'utilisateur a été ${
      req.body.type ? "activé" : "désactivé"
    } avec succès.`,
  });
});

/**
 * Updates user information (admin function)
 * Can update profile info, password, and service assignment
 * @route PUT /api/v1/users/update
 * @access Private (Menu ID: 5)
 * @param {number} req.body.userId - User ID (required)
 * @param {string} req.body.designation - Full name (optional, max 60 chars)
 * @param {string} req.body.phone_number - Phone number (optional, max 10 chars)
 * @param {number} req.body.lang - Language preference (optional)
 * @param {string} req.body.email - Email (optional, max 30 chars)
 * @param {string} req.body.oldPassword - Current password (optional, 6-20 chars)
 * @param {string} req.body.newPassword - New password (required if oldPassword provided, 6-20 chars)
 * @param {number} req.body.serviceId - Service ID (optional)
 * @param {string} req.body.contact - Contact info (optional, max 50 chars)
 * @param {string} req.body.fonction - Function (optional, max 50 chars)
 * @param {string} req.body.contact_numbers - Contact numbers (optional)
 * @param {string} req.body.contact_emails - Contact emails (optional)
 * @returns {Object} 201 - Success response with log message of changes
 * @returns {Object} 401 - User not found or deactivated
 * @returns {Object} 403 - Incorrect old password
 */
export const UpdateUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = updateUserSchema.validate(req.body);

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
  const logMsg = await updateUser(
    {
      ...req.body,
      modified_by: req.session.username,
    },
    customLog({ req, action: "modification" })
  );

  logger.info(
    customLog({
      req,
      message: logMsg,
      action: "modification",
    })
  );

  return res.status(201).json({
    success: true,
    message: "Les informations de l'utilisateur ont été modifié avec succés.",
  });
});

/**
 * Allows logged-in user to update their own profile information
 * Similar to UpdateUser but uses session userId and cannot change service
 * @route PUT /api/v1/users/updateme
 * @access Private (Authenticated)
 * @param {string} req.body.designation - Full name (optional, max 60 chars)
 * @param {string} req.body.phone_number - Phone number (optional, max 10 chars)
 * @param {number} req.body.lang - Language preference (optional)
 * @param {string} req.body.email - Email (optional, max 30 chars)
 * @param {string} req.body.oldPassword - Current password (optional, 6-20 chars)
 * @param {string} req.body.newPassword - New password (required if oldPassword provided)
 * @param {string} req.body.contact - Contact info (optional)
 * @param {string} req.body.fonction - Function (optional)
 * @param {string} req.body.contact_numbers - Contact numbers (optional)
 * @param {string} req.body.contact_emails - Contact emails (optional)
 * @returns {Object} 201 - Success response
 * @returns {Object} 401 - User not found or deactivated
 * @returns {Object} 403 - Incorrect old password
 */
export const UpdateLoggedUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = updateUserSchema.validate({
    ...req.body,
    userId: req.session.userId,
  });

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

  const logMsg = await updateLoggedUser(
    {
      ...req.body,
      userId: req.session.userId,
      modified_by: req.session.username,
    },
    customLog({ req, action: "modification" })
  );

  logger.info(
    customLog({
      req,
      message: logMsg,
      action: "modification",
    })
  );

  return res.status(201).json({
    success: true,
    message: "Les informations de l'utilisateur ont été modifié avec succés.",
  });
});

/**
 * Assigns multiple agencies to a user
 * Validates Coopération service restriction (only APS agencies ID 1 & 2)
 * @route POST /api/v1/users/agencies
 * @access Private (Authenticated)
 * @param {number} req.body.userId - User ID (required)
 * @param {number[]} req.body.agencies - Array of agency IDs to assign (required, min 1)
 * @returns {Object} 201 - Success response
 * @returns {Object} 401 - User/agency not found, deactivated, already assigned, or service restriction
 */
export const AddAgencyToUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = userAgenciesSchema.validate(req.body);

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
  const { agencyName, username } = await addAgencyToUser(
    {
      ...req.body,
      assignedBy: req.session.username,
    },
    customLog({ req, action: "attribuer agency/utlisateur" })
  );

  logger.info(
    customLog({
      req,
      message: `Les agencies [ ${agencyName.map(
        (name) => name
      )} ] ont été attribués à l'utilisateur ${username} avec succés `,
      action: "attribuer agency/utlisateur",
    })
  );

  return res.status(201).json({
    success: true,
    message: "Les agencies ont été attribués à l'utilisateur avec succès.",
  });
});

/**
 * Removes an agency from a user's assigned agencies
 * Prevents removal of the last agency (users must have at least one agency)
 * @route PUT /api/v1/users/agencies
 * @access Private (Authenticated)
 * @param {number} req.body.userId - User ID (required)
 * @param {number} req.body.agencyId - Agency ID to remove (required)
 * @returns {Object} 201 - Success response
 * @returns {Object} 401 - User not found, deactivated, doesn't have agency, or last agency
 */
export const RemoveAgenciesFromUser = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = userAgenciesRemoveSchema.validate(req.body);

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

  const { agencyname, username } = await removeAgenciesFromUser(
    req.body,
    customLog({ req, action: "retirer agency/utlisateur" })
  );

  logger.info(
    customLog({
      req,
      message: `Le agency "${agencyname}" a été retiré du utilisateur "${username}" avec succés.`,
      action: "retirer agency/utlisateur",
    })
  );

  return res.status(201).json({
    success: true,
    message: "Un agency a été retiré d'utilsateur avec succés.",
  });
});

/**
 * Retrieves menu items available to the current user based on their role
 * If menu includes 'Agences', it's populated with user's assigned agencies
 * @route POST /api/v1/users/menu
 * @access Private (Authenticated)
 * @returns {Object} 200 - Success response with menu array
 */
export const GetAllMenu = tryCatch(async (req, res) => {
  //oussama => req.session.userId
  // dont forgate to change it
  const { error } = userIdSchema.validate({ userId: req.session.userId });

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

  const data = await getAllMenu({ userId: req.session.userId });

  return res.status(200).json({
    success: true,
    message: "Menu Successfully fetched",
    data,
  });
});

/**
 * Sets the article refresh interval for the current user
 * @route PUT /api/v1/users/refresh
 * @access Private (Authenticated)
 * @param {number} req.body.refreshTime - Refresh interval in seconds (required)
 * @returns {Object} 200 - Success response
 * @returns {Object} 401 - User not found
 */
export const SetRefreshTime = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = refreshTimeSchema.validate(req.body);
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

  await setRefreshTime({ userId: req.session.userId, ...req.body });

  return res.status(200).json({
    success: true,
    message: "Refresh Time Successfully updated",
  });
});
