import prisma from "../configs/database.js";
import { ErrorHandler } from "./errorMiddleware.js";
// Middleware function to authenticate user session and if he has an active session
export const authenticate = async (req, res, next) => {
  try {
    // Check if session exists
    const sessionId = req.session ? req.session.sessionId : null;

    // If no session found, throw unauthorized error
    if (!sessionId) {
      throw new ErrorHandler(
        403,
        "Votre session a expiré. Veuillez vous reconnecter pour continuer.",
        false
      );
    }

    // Check if session is active in the database
    const existingSession = await prisma.online2024_sessions.findUnique({
      where: {
        id_session: sessionId,
        is_active: true,
        online2024_users: {
          state: 1,
        },
      },
    });

    // If session not found or inactive, throw unauthorized error
    if (!existingSession) {
      throw new ErrorHandler(
        403,
        "Votre session a expiré, veuillez vous reconnecter pour continuer.",
        false
      );
    }
  } catch (error) {
    // If any error occurs, pass it to the error handler middleware
    return next(error);
  }

  // If authentication succeeds, move to the next middleware/controller
  next();
};

export const restrict = (menuId) => async (req, res, next) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return next(new ErrorHandler(401, "Utilisateur non authentifié."));
    }

    const hasAccess = await prisma.online2024_users.findFirst({
      where: {
        id_user: userId,
        online2024_roles: {
          online2024_roles_menu: {
            some: {
              id_menu: menuId,
            },
          },
        },
      },
    });

    if (!hasAccess) {
      return next(
        new ErrorHandler(403, "Vous n'êtes pas autorisé à faire cela.")
      );
    }

    next(); // User has the correct role, proceed to the next middleware
  } catch (error) {
    return next(error); // Pass any errors to error-handling middleware
  }
};

export const validateClient = async (req, res, next) => {
  try {
    const validApiKey = process.env.API_KEY;
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      throw new ErrorHandler(401, "Vous n'êtes pas autorisé.");
    }

    if (apiKey !== validApiKey) {
      throw new ErrorHandler(401, "Vous n'êtes pas autorisé à faire cela");
    }
  } catch (error) {
    // If any error occurs, pass it to the error handler middleware
    return next(error);
  }
  // API key is valid
  next();
};
