/**
 * @fileoverview Agency Controller
 * Handles all agency-related operations including creation, updates, article management,
 * and user-agency relationships.
 * @module controllers/agencyController
 */

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

/**
 * Creates a custom log object with request metadata
 * @param {Object} params - Parameters object
 * @param {Object} params.req - Express request object
 * @param {string} params.message - Log message
 * @param {string} params.action - Action being performed
 * @returns {Object} Formatted log object with IP, user agent, and other metadata
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
 * Creates a new news agency with logo upload
 * @route POST /api/v1/agencies/create
 * @access Private (Menu ID: 3)
 * @param {Object} req.body.name - Agency name (required, max 40 chars)
 * @param {Object} req.body.name_ar - Agency name in Arabic (required, max 50 chars)
 * @param {File} req.file - Agency logo image (required, max 1MB, jpg/png only)
 * @returns {Object} 201 - Success response with agency ID and logo URL
 * @returns {Object} 400 - Validation error
 * @returns {Object} 401 - Agency name already exists
 */
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

/**
 * Retrieves all news agencies
 * @route POST /api/v1/agencies
 * @access Private (Authenticated)
 * @returns {Object} 200 - Success response with array of all agencies
 */
export const GetAllAgencies = tryCatch(async (req, res) => {
  const data = await getAllAgencies(req.body);

  return res.status(200).json({
    success: true,
    message: "agencys Successfully fetched",
    data,
  });
});

/**
 * Retrieves detailed information about a specific agency
 * @route POST /api/v1/agencies/detail
 * @access Private (Authenticated)
 * @param {number} req.body.agencyId - Agency ID (required)
 * @returns {Object} 200 - Success response with agency details including assigned users
 * @returns {Object} 404 - Agency not found
 */
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

/**
 * Retrieves a single article by ID
 * @route POST /api/v1/agencies/articles/detail
 * @access Private (Menu ID: 2)
 * @param {number} req.body.articleId - Article ID (required)
 * @returns {Object} 200 - Success response with article details
 * @returns {Object} 404 - Article not found
 */
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

/**
 * Retrieves paginated articles for a specific agency
 * @route POST /api/v1/agencies/articles
 * @access Private (Menu ID: 2)
 * @param {number} req.body.agencyId - Agency ID (required)
 * @param {number} req.body.pageSize - Number of articles per page (required)
 * @param {number} req.body.page - Page number (required)
 * @param {string} req.body.date - Date filter (ISO format)
 * @param {Object} req.body.order - Sort order object {field: 'asc'|'desc'}
 * @returns {Object} 200 - Success response with articles array, count, and refresh time
 * @returns {Object} 401 - User doesn't have access to this agency
 */
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

/**
 * Retrieves all active agencies assigned to the current user
 * @route POST /api/v1/agencies/users/list
 * @access Private (Menu ID: 2)
 * @returns {Object} 200 - Success response with array of user's agencies
 */
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

/**
 * Searches articles within a specific agency
 * @route POST /api/v1/agencies/articles/search
 * @access Private (Menu ID: 2)
 * @param {number} req.body.agencyId - Agency ID (required)
 * @param {string} req.body.searchText - Search text (can be empty)
 * @param {number} req.body.pageSize - Number of results per page (required)
 * @param {number} req.body.page - Page number (required)
 * @param {string} req.body.date - Single date filter (ISO format)
 * @param {string} req.body.date_start - Start date for range filter (ISO format)
 * @param {string} req.body.date_finish - End date for range filter (ISO format)
 * @param {Object} req.body.order - Sort order
 * @returns {Object} 200 - Success response with matching articles and count
 */
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

/**
 * Searches articles across all user's assigned agencies
 * @route POST /api/v1/agencies/articles/searchAll
 * @access Private (Menu ID: 2)
 * @param {string} req.body.searchText - Search text (can be empty)
 * @param {number} req.body.pageSize - Number of results per page (default: 20)
 * @param {number} req.body.page - Page number (required)
 * @param {string} req.body.date - Single date filter (ISO format)
 * @param {string} req.body.date_start - Start date for range filter (ISO format)
 * @param {string} req.body.date_finish - End date for range filter (ISO format)
 * @param {Object} req.body.order - Sort order
 * @returns {Object} 200 - Success response with matching articles from all agencies
 */
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

/**
 * Toggles agency state (activate/deactivate)
 * When deactivating, all user-agency relationships are removed
 * @route PUT /api/v1/agencies/state
 * @access Private (Menu ID: 3)
 * @param {number} req.body.agencyId - Agency ID (required)
 * @returns {Object} 201 - Success response
 * @returns {Object} 401 - Agency not found
 */
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

/**
 * Retrieves all users who are NOT assigned to a specific agency
 * Used for assigning new users to an agency
 * @route POST /api/v1/agencies/other
 * @access Private (Menu ID: 3)
 * @param {number} req.body.agencyId - Agency ID (required)
 * @returns {Object} 200 - Success response with array of available users
 * @returns {Object} 401 - Agency not found
 */
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

/**
 * Updates agency information (name, Arabic name, logo)
 * @route PUT /api/v1/agencies/update
 * @access Private (Menu ID: 3)
 * @param {number} req.body.agencyId - Agency ID (required)
 * @param {string} req.body.name - New agency name (optional, max 40 chars)
 * @param {string} req.body.name_ar - New Arabic name (optional, max 50 chars)
 * @param {File} req.file - New logo image (optional, max 1MB)
 * @returns {Object} 200 - Success response with updated data
 * @returns {Object} 401 - Agency not found or name already taken
 */
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

/**
 * Assigns multiple users to an agency
 * Validates that Coopération service users can only access APS agencies (ID 1 & 2)
 * @route POST /api/v1/agencies/users
 * @access Private (Menu ID: 3)
 * @param {number} req.body.agencyId - Agency ID (required)
 * @param {number[]} req.body.users - Array of user IDs to assign (required, min 1)
 * @returns {Object} 200 - Success response
 * @returns {Object} 401 - Validation errors (agency not found, user not found, already assigned, etc.)
 */
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

/**
 * Removes a user's access to a specific agency
 * @route PUT /api/v1/agencies/users
 * @access Private (Menu ID: 3)
 * @param {number} req.body.agencyId - Agency ID (required)
 * @param {number} req.body.userId - User ID to remove (required)
 * @returns {Object} 200 - Success response
 * @returns {Object} 401 - Agency not found or user doesn't have this agency
 */
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
