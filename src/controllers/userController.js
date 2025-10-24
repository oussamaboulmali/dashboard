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

//extraire la partie @ ipv4 d'une @ ipv6
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

// Refactored BlockIpAddress function
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
