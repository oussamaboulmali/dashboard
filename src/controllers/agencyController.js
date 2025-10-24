import { ErrorHandler } from "../middlewares/errorMiddleware.js";
import {
  addUsersToAgency,
  changeStateAgency,
  createAgency,
  getAgenciesOfuser,
  getAllAgencies,
  getArticlesOfAgency,
  getOneAgency,
  getOneArticle,
  getOtherUsersOfAgencie,
  removeUsersFromAgency,
  searchArticlesGlobale,
  searchArticlesOfAgency,
  updateAgency,
} from "../services/agencyService.js";
import { infoLogger } from "../utils/logger.js";
import { tryCatch } from "../utils/tryCatch.js";
import {
  agencyIdSchema,
  agencySchema,
  agencyUpdateSchema,
  agencyUserRemoveSchema,
  agencyUsersSchema,
  articleIdSchema,
  getArticlesSchema,
  searchArticlesSchema,
  searchGlobaleSchema,
  userIdSchema,
} from "../validations/agencyValidation.js";

const logger = infoLogger("agences");
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

// Controller function for creating a new agency
export const CreateAgency = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = agencySchema.validate({
    ...req.body,
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

  // Call the createAgency service function to create a new agency
  const data = await createAgency(
    {
      ...req.body,
      file: req.file,
      createdBy: req.session.username,
    },
    customLog({ req, action: "creation" })
  );

  logger.info(
    customLog({
      req,
      message: `l'agence "${req.body.name}" a été créé avec succès`,
      action: "creation",
    })
  );

  return res.status(201).json({
    success: true,
    message: "Une agence créé avec succès.",
    data,
  });
});

// Controller function for creating a new agency
export const GetAllAgencies = tryCatch(async (req, res) => {
  const data = await getAllAgencies(req.body);

  return res.status(200).json({
    success: true,
    message: "agencys Successfully fetched",
    data,
  });
});

export const GetOneAgency = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = agencyIdSchema.validate(req.body);

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

  const data = await getOneAgency(req.body);

  return res.status(200).json({
    success: true,
    message: "agency Successfully fetched",
    data,
  });
});

export const GetOneArticle = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = articleIdSchema.validate(req.body);

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

  const data = await getOneArticle(req.body);

  return res.status(200).json({
    success: true,
    message: "Article Successfully fetched",
    data,
  });
});

export const GetArticlesOfAgency = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = getArticlesSchema.validate(req.body);

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

  const data = await getArticlesOfAgency({
    ...req.body,
    userId: req.session.userId,
  });

  return res.status(200).json({
    success: true,
    message: "articles Successfully fetched",
    data,
  });
});

export const GetAgenciesOfuser = tryCatch(async (req, res) => {
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

  const data = await getAgenciesOfuser({ userId: req.session.userId });

  return res.status(200).json({
    success: true,
    message: "Agencies of user Successfully fetched",
    data,
  });
});

// export const GetArticlesOfAgency2 = tryCatch(async (req, res) => {
//   // Validate the request body
//   const { error } = getArticlesSchema.validate(req.body);

//   if (error) {
//     throw new ErrorHandler(
//       400,
//       `Input validation error ${
//         process.env.NODE_ENV !== "production" ? error.details[0].message : ""
//       } `,
//       null,
//       null,
//       error.details[0].message
//     );
//   }

//   const data = await getArticlesOfAgency2({
//     ...req.body,
//     userId: req.session.userId,
//   });

//   return res.status(200).json({
//     success: true,
//     message: "articles Successfully fetched",
//     data,
//   });
// });

export const SearchArticlesOfAgency = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = searchArticlesSchema.validate(req.body);

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

  const data = await searchArticlesOfAgency({
    ...req.body,
    userId: req.session.userId,
  });

  return res.status(200).json({
    success: true,
    message: "articles Successfully fetched",
    data,
  });
});

export const SearchArticlesGlobale = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = searchGlobaleSchema.validate(req.body);

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

  const data = await searchArticlesGlobale({
    ...req.body,
    userId: req.session.userId,
  });

  return res.status(200).json({
    success: true,
    message: "articles Successfully fetched",
    data,
  });
});

// Controller function to change the state of a category (activate/deactivate)
export const ChangeStateAgency = tryCatch(async (req, res) => {
  // Validate the request body against schema
  const { error } = agencyIdSchema.validate(req.body);

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

  // Change the state of the category and retrieve its name and new state
  const { name, state } = await changeStateAgency(
    {
      ...req.body,
      changeBy: req.session.username,
    },
    customLog({ req })
  );

  // Log category state change
  logger.info(
    customLog({
      req,
      message: `L'agence' : "${name}" a été ${
        state ? "desactivé" : "activé"
      } avec succés.`,
      action: `${state ? "desactivation" : "activation"}`,
    })
  );

  // Respond with success message
  return res.status(201).json({
    success: true,
    message: "L'état de l'agence a été modifié avec succés.",
  });
});

export const GetUsersWithOtherAgencies = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = agencyIdSchema.validate(req.body);

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

  const data = await getOtherUsersOfAgencie(req.body);

  return res.status(200).json({
    success: true,
    message: "users Successfully fetched",
    data,
  });
});

export const UpdateAgency = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = agencyUpdateSchema.validate({
    ...req.body,
    agencyId: JSON.parse(req.body.agencyId),
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

  const { logMsg, ...data } = await updateAgency(
    {
      ...req.body,
      agencyId: JSON.parse(req.body.agencyId),
      file: req.file,
      modifiedBy: req.session.username,
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

  return res.status(200).json({
    success: true,
    message: "l'agence modifié avec succés.",
    data,
  });
});

export const AddUsersToAgency = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = agencyUsersSchema.validate(req.body);

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

  const { agencyName, usersName } = await addUsersToAgency(
    { ...req.body, assignedBy: req.session.username },
    customLog({ req, action: "attribuer utilisateurs/agency" })
  );

  logger.info(
    customLog({
      req,
      message: `l'agence "${agencyName}" a été attribué aux utilisateurs" ${usersName.map(
        (user) =>
          `[ID : ${user.userId}, nom d'utilisateur : ${user.username}] avec succés.`
      )}`,
      action: "attribuer utilisateurs/agency",
    })
  );

  return res.status(200).json({
    success: true,
    message: "l'agence a été attribué aux utilisateurs avec succés.",
  });
});

export const RemoveUsersFromAgency = tryCatch(async (req, res) => {
  // Validate the request body
  const { error } = agencyUserRemoveSchema.validate(req.body);

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

  const { agencyName, username } = await removeUsersFromAgency(
    req.body,
    customLog({ req, action: "retirer utilisateurs/agency" })
  );

  logger.info(
    customLog({
      req,
      message: `l'agence "${agencyName}" a été retiré de l'utilisateur 
        [ID : ${req.body.userId}, nom d'utilisateur : ${username}] avec succés.
      `,
      action: "retirer utilisateurs/agency",
    })
  );

  return res.status(200).json({
    success: true,
    message: "l'agence a été retiré de l'utilisateur avec succés.",
  });
});
