import bcrypt from "bcryptjs";
import prisma from "../configs/database.js";
import { ErrorHandler } from "../middlewares/errorMiddleware.js";
import { deniedLogger } from "../utils/logger.js";
import { blockMessage } from "../utils/blockMessage.js";
import { subDays, startOfDay } from "date-fns";
import { sendEmail } from "../helpers/authHelper.js";

// Function to authenticate user login
export const login = async (userData, logdata) => {
  const { username, password, ip } = userData;

  // find a unique user (by username)
  const user = await prisma.online2024_users.findUnique({
    where: {
      username: username,
    },
  });

  // Handle error case when user is not found
  if (!user) {
    deniedLogger.error({
      ...logdata,
      username: username,
      message: `Une tentative de connexion avec un nom d'utilisateur inconnu a échoué.
       Informations de débogage :
       Nom d'utilisateur demandé : ${username}`,
    });
    throw new ErrorHandler(401, "Username ou password incorrect.");
  }

  // Handle error case when user is desactivated

  if (user.state === 0) {
    deniedLogger.error({
      ...logdata,
      username: username,
      message: `Une tentative de connexion a échoué en utilisant un compte désactivé.
      Informations de débogage :
      Nom d'utilisateur demandé : ${username}`,
    });
    throw new ErrorHandler(401, "Username ou password incorrect.");
  }

  // Handle error case when account is blocked due to too many login attempts

  if (user.state === 2) {
    deniedLogger.error({
      ...logdata,
      username: username,
      message: `Une tentative de connexion a échoué en utilisant un compte bloqué.
      Informations de débogage :
      Nom d'utilisateur demandé : ${username}`,
    });
    throw new ErrorHandler(403, blockMessage[user.block_code].message);
  }

  if (user.state === 3) {
    deniedLogger.error({
      ...logdata,
      username: username,
      message: `Une tentative de connexion a échoué en utilisant un compte supprimé.
      Informations de débogage :
      Nom d'utilisateur demandé : ${username}`,
    });
    throw new ErrorHandler(403, blockMessage[user.block_code].message);
  }

  // Handle error case when user has exceeded maximum login attempts
  if (user.login_attempts >= 5) {
    // block user
    await prisma.online2024_users.update({
      where: { id_user: user.id_user },
      data: {
        state: 2,
        block_code: 210,
        blocked_date: new Date(),
      },
    });
    deniedLogger.error({
      ...logdata,
      username: username,
      message: `Le compte de cet utilisateur est bloqué après 5 tentatives de connexion échoués.
      Informations de débogage :
      Nom d'utilisateur demandé : ${username}`,
    });

    await sendEmail(
      `Le compte de l'utilisateur "${username}" a été bloqué ${blockMessage[210].log} `
    );

    throw new ErrorHandler(
      403,
      "Votre compte est bloqué, vous avez dépassé 5 tentatives."
    );
  }

  // Check if the password is correct
  const isCorrectPassword = await bcrypt.compare(password, user.password);

  if (!isCorrectPassword) {
    // if the password is incorrect  Increment login attempts counter
    await prisma.online2024_users.update({
      where: { id_user: user.id_user },
      data: {
        login_attempts: user.login_attempts + 1,
      },
    });

    deniedLogger.error({
      ...logdata,
      username: username,
      message: `Une tentative de connexion avec un mot de passe incorrect a échoué.
      Informations de débogage :
      Nom d'utilisateur demandé : ${username}`,
    });
    throw new ErrorHandler(401, "Username ou password incorrect.");
  }

  // Check if user has an active session in database
  const existingSession = await prisma.online2024_sessions.findFirst({
    where: {
      id_user: user.id_user,
      is_active: true,
      login_date: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Search only on the last day
      },
    },
  });

  if (existingSession) {
    // If user has an active session, prompt to close it
    return {
      hasSession: true,
      data: {
        userId: user.id_user,
        sessionId: Number(existingSession.id_session),
      },
    };
  }

  // if user doesn't have an active session
  await prisma.online2024_users.update({
    where: { id_user: user.id_user },
    data: {
      login_attempts: 0,
      lastvisit_date: new Date(),
    },
  });

  // Create a new session for the user
  const newSession = await prisma.online2024_sessions.create({
    data: {
      id_user: user.id_user,
      adresse_ip: ip,
      is_active: true,
    },
  });

  return {
    hasSession: false,
    data: {
      userId: user.id_user,
      sessionId: Number(newSession.id_session),
      username: user.username,
      designation: user.designation,
      lang: user.lang,
    },
  };
};

// Close the current session and send OTP  to the user's email for re-verification.
export const closeSessionAndLogin = async (userData, logdata) => {
  const { sessionId, userId, password, username } = userData;

  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
    select: {
      password: true,
      state: true,
      username: true,
    },
  });

  // Handle error case when user is not found
  if (!user) {
    deniedLogger.error({
      ...logdata,
      username: username,
      message: `Une tentative de fermer une session avec un id d'utilisateur inconnu a échoué.
       Informations de débogage :
       ID d'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Username ou password incorrect.");
  }

  if (user.state !== 1) {
    deniedLogger.error({
      ...logdata,
      message: `Une tentative de fermer une session avec un utilisateur inactif a échoué.
      Informations de débogage :
      Id utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Compte utilisateur inactif ou bloqué");
  }

  if (user.username !== username) {
    deniedLogger.error({
      ...logdata,
      message: `Une tentative de fermer une session avec un nom d'utilisateur incorrect.
      Informations de débogage :
      Id utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Username ou password incorrect.");
  }

  // Check if the password is correct
  const isCorrectPassword = await bcrypt.compare(password, user.password);

  if (!isCorrectPassword) {
    deniedLogger.error({
      ...logdata,
      username: user.username,
      message: `Une tentative de connexion avec un mot de passe incorrect a échoué.
        Informations de débogage :
        Nom d'utilisateur demandé : ${user.username}`,
    });
    throw new ErrorHandler(401, "Username ou password incorrect.");
  }

  // Find the session by session ID
  const existingSession = await prisma.online2024_sessions.findUnique({
    where: {
      id_session: sessionId,
      is_active: true,
      id_user: userId,
    },
  });

  if (!existingSession) {
    deniedLogger.error({
      ...logdata,
      message: `Une tentative de fermer une session active a echoué.
      Informations de débogage :
      Id utilisateur demandé : ${userId}
      Id session demandé: ${sessionId}`,
    });
    throw new ErrorHandler(404, "Aucune session trouvé.");
  }

  // Close the current session

  await prisma.online2024_sessions.update({
    where: {
      id_session: sessionId,
    },
    data: {
      is_active: false,
      logout_date: new Date(),
    },
  });

  await prisma.online2024_users.update({
    where: { id_user: userId },
    data: {
      login_attempts: 0,
    },
  });
};

// Log out the user by closing the current session.
export const logout = async (userData, logdata) => {
  const { sessionId } = userData;

  if (!sessionId) {
    throw new ErrorHandler(404, "Aucune session trouvée.", null, true);
  }

  const existingSession = await prisma.online2024_sessions.findUnique({
    where: {
      id_session: sessionId,
    },
  });

  if (!existingSession) {
    throw new ErrorHandler(404, "Aucune session trouvée.", null, true);
  }

  // Update session to mark it as inactive
  await prisma.online2024_sessions.update({
    where: { id_session: sessionId },
    data: { is_active: false, logout_date: new Date() },
  });
};
// Log out the user by closing the current session.
export const logoutOtherUser = async (userData) => {
  const { userId } = userData;

  // Find the session by session ID
  const existingSession = await prisma.online2024_sessions.findFirst({
    where: {
      id_user: userId,
      is_active: true,
      login_date: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Search only on the last day
      },
    },
  });

  if (existingSession) {
    // Close the current session
    await prisma.online2024_sessions.update({
      where: {
        id_session: existingSession.id_session,
      },
      data: {
        is_active: false,
        logout_date: new Date(),
      },
    });
  }
};

export const getStatistics = async ({ userId }) => {
  const today = startOfDay(new Date());
  const oneWeekAgo = subDays(today, 6); // Includes today, total of 7 days
  const dateToget = new Date();
  // Set time to beginning of the day
  dateToget.setHours(0, 0, 0, 0);
  // Fetch statistics in parallel

  const roleId = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
    select: {
      id_role: true,
    },
  });

  const userRoleAndServices = await prisma.online2024_service.findMany({
    where: {
      online2024_roles: {
        online2024_users: {
          some: {
            id_user: userId,
          },
        },
      },
    },
  });

  if (roleId.id_role === 2) {
    // First get the relevant agency IDs for the user (can be cached)
    const userAgencies = await prisma.online2024_user_agency.findMany({
      where: {
        id_user: userId,
        online2024_agencies: {
          state: true,
        },
      },
      include: {
        online2024_agencies: {
          select: {
            id_agency: true,
            name: true,
            name_ar: true,
            alias: true,
            url: true,
          },
        },
      },
    });

    const agencyIds = userAgencies
      .filter((ua) => ua.online2024_agencies)
      .map((ua) => ua.online2024_agencies.id_agency);

    // Then get the articles directly with the agency IDs
    const lastArticles = await prisma.online2024_articles.findMany({
      take: 20,
      orderBy: {
        created_date: "desc",
      },
      where: {
        id_agency: {
          in: agencyIds,
        },
      },
    });

    // Combine the data and handle BigInt serialization
    const result = lastArticles.map((article) => {
      const agency = userAgencies.find(
        (ua) => ua.online2024_agencies.id_agency === article.id_agency
      );
      return {
        id_article: String(article.id_article), // Convert BigInt to String
        id_agency: article.id_agency,
        name: agency.online2024_agencies.name,
        name_ar: agency.online2024_agencies.name_ar,
        alias: agency.online2024_agencies.alias,
        url: agency.online2024_agencies.url,
        label: article.label,
        title: article.title,
        slug: article.slug,
        full_text: article.full_text,
        file_name: article.file_name,
        created_date: article.created_date,
      };
    });

    return {
      lastArtciles: result, // Keep the same property name as original
    };
  } else {
    const [
      agenciesStatistics,
      totalUsersCount,
      usersConnectedCount,
      activeUsersCount,
      desctivatedUsersCount,
      blockedUsersCount,
      trashedUsersCount,
      totalArticlesCount,
      articlesLastWeek,
      articlesByAgenciesToday,
    ] = await Promise.all([
      prisma.online2024_agencies.findMany({
        where: {
          state: true,
          online2024_user_agency: {
            some: {
              id_user: userId,
            },
          },
        },
        select: {
          id_agency: true,
          name: true,
          name_ar: true,
          alias: true,
          _count: {
            select: {
              online2024_user_agency: true,
              online2024_articles: true,
            },
          },
        },
      }),
      prisma.online2024_users.count({
        where: {
          online2024_service: {
            name: {
              in: userRoleAndServices.map((service) => service.name),
            },
          },
        },
      }),
      prisma.online2024_sessions.findMany({
        where: {
          is_active: true,
          login_date: {
            gte: dateToget, // Greater than or equal to start of the day
            lt: new Date(dateToget.getTime() + 24 * 60 * 60 * 1000), // Less than end of the day
          },
          online2024_users: {
            online2024_service: {
              name: {
                in: userRoleAndServices.map((service) => service.name),
              },
            },
          },
        },
        select: {
          login_date: true,
          online2024_users: {
            select: {
              id_user: true,
              username: true,
              designation: true,
            },
          },
        },
      }),
      prisma.online2024_users.count({
        where: {
          state: 1,
          online2024_service: {
            name: {
              in: userRoleAndServices.map((service) => service.name),
            },
          },
        },
      }),
      prisma.online2024_users.count({
        where: {
          state: 0,
          online2024_service: {
            name: {
              in: userRoleAndServices.map((service) => service.name),
            },
          },
        },
      }),
      prisma.online2024_users.count({
        where: {
          state: 2,
          online2024_service: {
            name: {
              in: userRoleAndServices.map((service) => service.name),
            },
          },
        },
      }),
      prisma.online2024_users.count({
        where: {
          state: 3,
          online2024_service: {
            name: {
              in: userRoleAndServices.map((service) => service.name),
            },
          },
        },
      }),
      prisma.online2024_articles.count({
        where: {
          online2024_agencies: {
            online2024_user_agency: {
              some: {
                id_user: userId,
              },
            },
          },
        },
      }),
      prisma.online2024_articles.groupBy({
        by: ["created_date"],
        where: {
          created_date: {
            gte: oneWeekAgo,
            lte: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        _count: { id_article: true },
      }),
      prisma.online2024_articles.groupBy({
        by: ["id_agency"],
        where: {
          created_date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
          online2024_agencies: {
            state: true,
            online2024_user_agency: {
              some: {
                id_user: userId,
              },
            },
          },
        },
        _count: { id_article: true },
      }),
    ]);

    // Format the results to group by day
    const formattedArticlesLastWeek = articlesLastWeek.map((article) => {
      const formattedDate = article.created_date.toLocaleDateString("en-CA"); // 'en-CA' gives yyyy-MM-dd format
      return {
        date: formattedDate,
        articlesCount: article._count.id_article,
      };
    });

    // Aggregate counts for each day
    const aggregatedResults = formattedArticlesLastWeek.reduce(
      (acc, current) => {
        const existingEntry = acc.find((item) => item.date === current.date);
        if (existingEntry) {
          existingEntry.articlesCount += current.articlesCount;
        } else {
          acc.push(current);
        }
        return acc;
      },
      []
    );

    // Fill in days with no articles
    const resultWithAllDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      const formattedDate = new Date(
        date.setDate(date.getDate() - i)
      ).toLocaleDateString("en-CA"); // 'en-CA' gives yyyy-MM-dd format
      const dayData = aggregatedResults.find(
        (entry) => entry.date === formattedDate
      );

      resultWithAllDays.push({
        date: formattedDate,
        articlesCount: dayData ? dayData.articlesCount : 0,
      });
    }

    // Combine articles count with agency names
    const articlesByAgenciesWithNames = agenciesStatistics.map(
      (agencyStats) => {
        const agency = articlesByAgenciesToday.find(
          (a) => a.id_agency === agencyStats.id_agency
        );
        return {
          id_agency: agencyStats.id_agency,
          name: agencyStats.name,
          name_ar: agencyStats.name_ar,
          alias: agencyStats.alias,
          usersCount: agencyStats._count.online2024_user_agency,
          articlesCount: agency ? agency._count.id_article : 0,
        };
      }
    );

    // Format agency statistics
    const formattedAgencyStatistics = agenciesStatistics.map((agency) => ({
      name: agency.name,
      name_ar: agency.name_ar,
      articlesCount: agency._count.online2024_articles,
    }));

    return {
      usersConnected: usersConnectedCount.map((user) => {
        return { ...user.online2024_users, login_date: user.login_date };
      }),
      usersStatistics: {
        totalUsers: totalUsersCount,
        activeUsers: activeUsersCount,
        desctivatedUsers: desctivatedUsersCount,
        blockedUsers: blockedUsersCount,
        trashedUsers: trashedUsersCount,
      },
      totalArticlesCount,
      articlesLastWeek: resultWithAllDays,
      agencies: formattedAgencyStatistics,
      articlesToday: articlesByAgenciesWithNames,
    };
  }
};
