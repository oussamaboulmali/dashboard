import { urlencoded } from "express";
import prisma from "../configs/database.js";
import { processAndStoreImages } from "../helpers/imageHelper.js";
import { ErrorHandler } from "../middlewares/errorMiddleware.js";
import { infoLogger } from "../utils/logger.js";
import redisClient from "../configs/cache.js";

const logger = infoLogger("agences");

const createAlias = (input) => {
  return input
    .toLowerCase() // Convert to lowercase
    .replace(/[\s_]+/g, "-") // Replace spaces or underscores with hyphens
    .replace(/[^\w-]/g, ""); // Remove any character that is not a word, hyphen, or underscore
};

export const createAgency = async (data, logData) => {
  const { file, createdBy, name, name_ar } = data;
  if (file === undefined) {
    logger.error({
      ...logData,
      message: `Une tentative de créer une cahier sans image.`,
    });
    throw new ErrorHandler(
      401,
      "Vous ne pouvez pas créer une cahier sans image"
    );
  }

  const { path: imagePath, filename, originalname } = file;
  // Process and store images
  const processedImageUrl = await processAndStoreImages(
    imagePath,
    filename,
    originalname
  );

  // Check if agency name is already taken
  const existingAgency = await prisma.online2024_agencies.findUnique({
    where: { name: name },
  });

  if (existingAgency) {
    logger.error({
      ...logData,
      message: `Une tentative de créer une nouvelle agonce avec un nom ${existingAgency.name} déjà pris.
      Informations de débogage :
      Nom demandé : ${name}`,
    });
    throw new ErrorHandler(401, "agency déjà pris");
  }

  const newAgency = await prisma.online2024_agencies.create({
    data: {
      name,
      name_ar,
      alias: createAlias(name),
      url: processedImageUrl,
      created_by: createdBy,
    },
  });

  return { agencyId: newAgency.id_agency, url: newAgency.url };
};

export const getAllAgencies = async () => {
  const agencys = await prisma.online2024_agencies.findMany({
    orderBy: {
      created_date: "desc",
    },
  });

  if (!agencys) {
    throw new ErrorHandler(404, "No Agency found");
  }

  return agencys;
};

export const getAgenciesOfuser = async ({ userId }) => {
  const userAgencies = await prisma.online2024_agencies.findMany({
    where: {
      online2024_user_agency: {
        some: {
          id_user: userId,
        },
      },
      state: true,
    },
    orderBy: {
      created_date: "asc",
    },
    select: {
      name: true,
      id_agency: true,
      url: true,
      alias: true,
      name_ar: true,
    },
  });

  return userAgencies;
};

export const getOneAgency = async ({ agencyId }) => {
  const agency = await prisma.online2024_agencies.findUnique({
    where: { id_agency: agencyId },
    include: {
      online2024_user_agency: {
        select: {
          assigned_by: true,
          assigned_date: true,
          online2024_users: {
            select: {
              id_user: true,
              username: true,
              designation: true,
            },
          },
        },
      },
    },
  });

  if (!agency) {
    throw new ErrorHandler(404, "No Agency found");
  }

  const { id_agency, online2024_user_agency, ...rest } = agency;

  return {
    id_agecy: agency.id_agency,
    ...rest,
    users: agency.online2024_user_agency.map((user) => ({
      id_user: user.online2024_users.id_user,
      username: user.online2024_users.username,
      designation: user.online2024_users.designation,
      assigned_date: user.assigned_date,
      assigned_by: user.assigned_by,
    })),
  };
};

export const getOtherUsersOfAgencie = async ({ agencyId }) => {
  const existingAgency = await prisma.online2024_agencies.findUnique({
    where: { id_agency: agencyId, state: true },
  });

  if (!existingAgency) {
    throw new ErrorHandler(401, "No Agency Founded ");
  }
  // find users who do not have a agency equal to the provided agencyId
  const usersWithOtherAgencies = await prisma.online2024_users.findMany({
    where: {
      NOT: {
        online2024_user_agency: {
          some: {
            id_agency: agencyId,
          },
        },
      },
      state: { not: 0 },
    },
    select: {
      id_user: true,
      username: true,
      designation: true,
      online2024_roles: {
        select: {
          name: true,
        },
      },
      online2024_service: {
        select: {
          name: true,
        },
      },
    },
  });

  const formatedUsers = usersWithOtherAgencies.map((user) => {
    const { online2024_roles, online2024_service, ...rest } = user;
    return {
      ...rest,
      role: online2024_roles.name,
      service: online2024_service.name,
    };
  });

  return formatedUsers;
};

export const updateAgency = async (data, logData) => {
  const { file, modifiedBy, agencyId, name, name_ar } = data;
  let processedImageUrl;

  if (file != undefined) {
    const { path: imagePath, filename, originalname } = file;
    // Process and store images
    processedImageUrl = await processAndStoreImages(
      imagePath,
      filename,
      originalname
    );
  }
  const existingAgency = await prisma.online2024_agencies.findUnique({
    where: { id_agency: agencyId },
    select: {
      name: true,
      name_ar: true,
      url: true,
    },
  });

  if (!existingAgency) {
    logger.error({
      ...logData,
      message: `Une tentative de modification d'une agence inexistant.
      Informations de débogage :
      ID de l'agence demandé : ${agencyId}`,
    });
    throw new ErrorHandler(401, "Agency inexistante");
  }

  // Check if new agency name is already taken
  const existingAgencyWithName = await prisma.online2024_agencies.findFirst({
    where: { name: name ? name : "" },
  });

  if (existingAgencyWithName) {
    logger.error({
      ...logData,
      message: `Une tentative de modification de l'agence avec un nom ${existingAgency.name} déjà pris.
      Informations de débogage :
      Nom demandé : ${name}`,
    });
    throw new ErrorHandler(401, "Nom déjà pris.");
  }

  const updatedAgency = await prisma.online2024_agencies.update({
    where: { id_agency: agencyId },
    data: {
      name,
      name_ar,
      ...(processedImageUrl !== undefined && { url: processedImageUrl }),
      modified_by: modifiedBy,
      modified_date: new Date(),
    },
    select: {
      name: true,
      name_ar: true,
      url: true,
    },
  });
  return {
    logMsg: generateLogMessage(existingAgency, updatedAgency),
    url: updatedAgency.url,
  };
};

function generateLogMessage(oldAgency, updatedAgency) {
  const changes = [];

  for (const key in updatedAgency) {
    if (JSON.stringify(oldAgency[key]) !== JSON.stringify(updatedAgency[key])) {
      const oldValue = oldAgency[key] ?? "non défini";
      const newValue = updatedAgency[key] ?? "non défini";
      changes.push(`${key}: "${oldValue}" → "${newValue}"`);
    }
  }

  if (changes.length > 0) {
    return `Les informations de l'agence "${
      oldAgency.name
    }" ont été modifiées avec succès :
     ${changes.join(", \n ")} `;
  }

  return `Aucun changement détecté pour l'agence "${oldAgency.name}".`;
}

// Function to change the state (activate/deactivate) of a category
export const changeStateAgency = async (userData, logData) => {
  const { agencyId, changeBy } = userData;
  // Check if the category to change state exists in the database
  const existingAgency = await prisma.online2024_agencies.findUnique({
    where: { id_agency: agencyId },
  });

  // If the category doesn't exist, throw an error
  if (!existingAgency) {
    logger.error({
      ...logData,
      action: "activation/desactivation",
      message: `Une tentative de modification de l'état d'une agence inexistante.
      Informations de débogage :
      ID de l'agence demandé : ${agencyId}`,
    });
    throw new ErrorHandler(401, "Agence inexistante");
  }

  // Update the state of the category in the database
  await prisma.online2024_agencies.update({
    where: {
      id_agency: agencyId,
    },
    data: {
      state: !existingAgency.state,
      change_state_by: changeBy,
      change_state_date: new Date(),
    },
  });

  // if the old state is activated then the new one is desactivted then we need to delete the users associted with this agency
  if (existingAgency.state) {
    await prisma.online2024_user_agency.deleteMany({
      where: {
        id_agency: agencyId,
      },
    });
  }

  // Return the name and new state of the category
  return { name: existingAgency.name, state: existingAgency.state };
};

export const addUsersToAgency = async (data, logData) => {
  const { agencyId, users, assignedBy } = data;
  const usersName = [];

  const existingAgency = await prisma.online2024_agencies.findUnique({
    where: { id_agency: agencyId },
  });

  if (!existingAgency) {
    logger.error({
      ...logData,
      message: `Une tentative d'ajout des utilsateurs à une agence inexistant.
      Informations de débogage :
      ID de l'agence demandé : ${agencyId}`,
    });
    throw new ErrorHandler(401, "Agency inexistant");
  }

  for (const userId of users) {
    const existingUser = await prisma.online2024_users.findUnique({
      where: {
        id_user: userId,
      },
      include: {
        online2024_service: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!existingUser) {
      logger.error({
        ...logData,
        message: `Une Tentative d'ajout d'un utilisateur inexistant à une agence.
        Informations de débogage :
        ID du utilisateur demandé : ${userId}`,
      });
      throw new ErrorHandler(401, "Un des utilisateurs n'a pas été trouvé.");
    }

    const existingUserAgency = await prisma.online2024_user_agency.findFirst({
      where: {
        id_user: userId,
        id_agency: agencyId,
      },
    });

    if (existingUserAgency) {
      logger.error({
        ...logData,
        message: `Une tentative d'ajout d'une agence à un utilisateur qui le possède déjà.
        Informations de débogage :
        ID de l'utilisateur demandé : ${userId}`,
      });
      throw new ErrorHandler(
        401,
        `L'utilisateur avec l'identifiant ${userId} possède déjà ce agency.`
      );
    }

    if (
      existingUser.online2024_service.name === "Coopération" &&
      agencyId !== 1 &&
      agencyId !== 2
    ) {
      logger.error({
        ...logData,
        message: `Une tentative d'ajout d'une agence autre que APS pour une abonné type coopération.
            Informations de débogage :
            agence demandé : ${existingAgency.name}
            utilisateur demandé : ${existingUser.username}`,
      });
      throw new ErrorHandler(
        401,
        `L'utilisateur ${existingUser.username} ne peut pas être propriétaire de cette agence`
      );
    }

    usersName.push({
      userId,
      username: existingUser.username,
    });
  }

  // If the user doesn't have the agency, create the relationship
  // Create user-agency relationships
  const createdData = users.map((userId) => ({
    id_agency: agencyId,
    id_user: userId,
    assigned_by: assignedBy,
  }));

  await prisma.online2024_user_agency.createMany({
    data: createdData,
  });

  return {
    agencyName: existingAgency.name,
    usersName,
  };
};

export const removeUsersFromAgency = async (data, logData) => {
  const { agencyId, userId } = data;

  const existingAgency = await prisma.online2024_agencies.findUnique({
    where: { id_agency: agencyId },
  });

  if (!existingAgency) {
    logger.error({
      ...logData,
      message: `Une tentative de supprimer un utilisateur d'une agence inexistant.
      Informations de débogage :
      ID de l'agence demandé : ${agencyId}`,
    });
    throw new ErrorHandler(401, "Agency inexistant.");
  }
  // Check if the user  has the agency
  const existingAgencyUser = await prisma.online2024_user_agency.findFirst({
    where: {
      id_agency: agencyId,
      id_user: userId,
    },
    include: {
      online2024_users: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!existingAgencyUser) {
    logger.error({
      ...logData,
      message: `Une tentative de suppression de l'agence d'un utilisateur qui ne le possède pas.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "L'utilisateur ne possède pas ce agency.");
  }

  // If the relationship exists, delete it
  await prisma.online2024_user_agency.delete({
    where: {
      id_user_id_agency: {
        id_user: userId,
        id_agency: agencyId,
      },
    },
  });

  return {
    agencyName: existingAgency.name,
    username: existingAgencyUser.online2024_users.username,
  };
};

export const getArticlesOfAgency = async (data, logData) => {
  const {
    agencyId,
    userId,
    pageSize = 10,
    page = 1,
    date,
    order = { created_date: "desc" },
  } = data;

  const dateToget = new Date(date);
  // Set time to beginning of the day
  dateToget.setHours(0, 0, 0, 0);

  // const filtreCondition = transformObject(filter);
  const offset = (page - 1) * pageSize;

  const existingAgency = await prisma.online2024_user_agency.findUnique({
    where: {
      id_user_id_agency: {
        id_agency: agencyId,
        id_user: userId,
      },
    },
    select: {
      online2024_users: {
        select: {
          refresh_time: true,
        },
      },
    },
  });

  if (!existingAgency) {
    logger.error({
      ...logData,
      message: `Une tentative d'obtenir des articles d'une agence n'a pas.
      Informations de débogage :
      ID de l'agence demandé : ${agencyId}`,
    });
    throw new ErrorHandler(401, "Agency inexistante");
  }

  const articles = await prisma.online2024_articles.findMany({
    take: parseInt(pageSize),
    skip: parseInt(offset),
    orderBy: [order],
    where: {
      id_agency: agencyId,
      created_date: {
        gte: dateToget, // Greater than or equal to start of the day
        lt: new Date(dateToget.getTime() + 24 * 60 * 60 * 1000), // Less than end of the day
      },
    },
    include: {
      online2024_agencies: {
        select: {
          id_agency: true,
          name: true,
          name_ar: true,
        },
      },
    },
  });

  const articlesCount = await prisma.online2024_articles.count({
    where: {
      id_agency: agencyId,
      created_date: {
        gte: dateToget, // Greater than or equal to start of the day
        lt: new Date(dateToget.getTime() + 24 * 60 * 60 * 1000), // Less than end of the day
      },
    },
  });

  const artcilesFormated = articles.map((article) => {
    const { id_article, id_agency, online2024_agencies, ...rest } = article;
    return {
      id_article: Number(id_article),
      id_agency: id_agency,
      name: online2024_agencies.name,
      name_ar: online2024_agencies.name_ar,
      ...rest,
    };
  });

  return {
    articles: artcilesFormated,
    count: articlesCount,
    refreshTime: existingAgency.online2024_users.refresh_time,
  };
};

export const getArticlesOfAgency2 = async (data, logData) => {
  const {
    agencyId,
    userId,
    pageSize = 10,
    page = 1,
    date,
    order = { created_date: "desc" },
  } = data;

  const dateToget = new Date();
  // Set time to beginning of the day
  dateToget.setHours(0, 0, 0, 0);

  // const filtreCondition = transformObject(filter);
  const offset = (page - 1) * pageSize;

  const existingAgency = await prisma.online2024_user_agency.findUnique({
    where: {
      id_user_id_agency: {
        id_agency: agencyId,
        id_user: userId,
      },
    },
  });

  if (!existingAgency) {
    logger.error({
      ...logData,
      message: `Une tentative d'obtenir des articles d'une agence n'a pas.
      Informations de débogage :
      ID de l'agence demandé : ${agencyId}`,
    });
    throw new ErrorHandler(401, "Agency inexistante");
  }

  // Check Redis cache
  const cacheKey = `agency:${agencyId}`;
  const cachedData = await redisClient.lRange(cacheKey, 0, -1); // -1 to fetch all elements

  if (cachedData && cachedData.length > 0) {
    // Parse each JSON string in the list
    const parsedArticles = cachedData.map((item) => JSON.parse(item));
    // Construct the result
    const count = parsedArticles.length;
    const articles = parsedArticles.slice(offset, offset + pageSize); // Apply pagination

    return { articles, count };
  }

  const articles = await prisma.online2024_articles.findMany({
    take: parseInt(pageSize),
    skip: parseInt(offset),
    orderBy: [order],
    where: {
      id_agency: agencyId,
    },
    include: {
      online2024_agencies: {
        select: {
          id_agency: true,
          name: true,
        },
      },
    },
  });

  const articlesCount = await prisma.online2024_articles.count({
    where: {
      id_agency: agencyId,
    },
  });

  const artcilesFormated = articles.map((article) => {
    const { id_article, id_agency, online2024_agencies, ...rest } = article;
    return {
      id_article: Number(id_article),
      id_agency: id_agency,
      agency: online2024_agencies.name,
      ...rest,
    };
  });

  return { articles: artcilesFormated, count: articlesCount };
};

export const searchArticlesOfAgency = async (data) => {
  const {
    agencyId,
    userId,
    pageSize = 10,
    page = 1,
    searchText,
    date,
    date_start,
    date_finish,
    order = { created_date: "desc" },
  } = data;

  let filter;

  if (date_start && date_finish) {
    const dateStart = new Date(date_start);
    const dateFinish = new Date(date_finish);

    // if (isNaN(dateStart.getTime()) || isNaN(dateFinish.getTime())) {
    //   throw new ErrorHandler(400, "Invalid date_start or date_finish format");
    // }

    // Check if date_start is before date_finish
    if (dateStart >= dateFinish) {
      throw new ErrorHandler(
        400,
        "la date de début doit être antérieure à la date de fin"
      );
    }
    dateFinish.setTime(dateFinish.getTime() + 24 * 60 * 60 * 1000);

    filter = {
      created_date: {
        gte: dateStart,
        lt: dateFinish,
      },
    };
  } else if (date) {
    const dateToget = new Date(date);

    // if (isNaN(dateToget.getTime())) {
    //   throw new ErrorHandler(400, "Invalid date format");
    // }

    dateToget.setHours(0, 0, 0, 0);

    filter = {
      created_date: {
        gte: dateToget, // Greater than or equal to start of the day
        lt: new Date(dateToget.getTime() + 24 * 60 * 60 * 1000), // Less than end of the day
      },
    };
  } else {
    throw new ErrorHandler(
      400,
      "La date ou la date de début et la date de fin doivent être fournies "
    );
  }

  const offset = (page - 1) * pageSize;

  const existingAgency = await prisma.online2024_user_agency.findUnique({
    where: {
      id_user_id_agency: {
        id_agency: agencyId,
        id_user: userId,
      },
    },
  });

  if (!existingAgency) {
    logger.error({
      ...logData,
      message: `Une tentative d'obtenir des articles d'une agence a échoué.
      Informations de débogage :
      ID de l'agence demandé : ${agencyId}`,
    });
    throw new ErrorHandler(401, "Agency inexistante");
  }

  if (searchText == "") {
    const { articles, count } = await getArticlesOfAgency(data);
    return { articles, count };
  }

  const articles = await prisma.online2024_articles.findMany({
    take: parseInt(pageSize),
    skip: parseInt(offset),
    orderBy: [order],
    where: {
      id_agency: agencyId,
      ...filter,
      OR: [
        {
          slug: {
            contains: searchText,
          },
        },
        {
          title: {
            contains: searchText,
          },
        },
        {
          full_text: {
            contains: searchText,
          },
        },
      ],
    },
    include: {
      online2024_agencies: {
        select: {
          id_agency: true,
          name: true,
          name_ar: true,
        },
      },
    },
  });

  const articlesCount = await prisma.online2024_articles.count({
    where: {
      id_agency: agencyId,
      ...filter,
      OR: [
        {
          slug: {
            contains: searchText,
          },
        },
        {
          title: {
            contains: searchText,
          },
        },
        {
          full_text: {
            contains: searchText,
          },
        },
      ],
    },
  });

  const artcilesFormated = articles.map((article) => {
    const { id_article, id_agency, online2024_agencies, ...rest } = article;
    return {
      id_article: Number(id_article),
      id_agency: id_agency,
      name: online2024_agencies.name,
      name_ar: online2024_agencies.name_ar,
      ...rest,
    };
  });

  return { articles: artcilesFormated, count: articlesCount };
};

export const getOneArticle = async ({ articleId }) => {
  const article = await prisma.online2024_articles.findUnique({
    where: {
      id_article: articleId,
    },
    include: {
      online2024_agencies: {
        select: {
          name: true,
          name_ar: true,
        },
      },
    },
  });

  if (!article) {
    throw new ErrorHandler(404, "No Article found");
  }

  const { id_article, online2024_agencies, ...rest } = article;
  return {
    id_article: Number(id_article),
    agency: online2024_agencies.name,
    ...rest,
  };
};

export const searchArticlesGlobale = async (data) => {
  const {
    userId,
    pageSize = 20,
    page = 1,
    searchText,
    date,
    date_start,
    date_finish,
    order = { created_date: "desc" },
  } = data;

  let filter;

  if (date_start && date_finish) {
    const dateStart = new Date(date_start);
    const dateFinish = new Date(date_finish);

    // if (isNaN(dateStart.getTime()) || isNaN(dateFinish.getTime())) {
    //   throw new ErrorHandler(400, "Invalid date_start or date_finish format");
    // }

    // Check if date_start is before date_finish
    if (dateStart >= dateFinish) {
      throw new ErrorHandler(
        400,
        "la date de début doit être antérieure à la date de fin"
      );
    }
    dateFinish.setTime(dateFinish.getTime() + 24 * 60 * 60 * 1000);

    filter = {
      created_date: {
        gte: dateStart,
        lt: dateFinish,
      },
    };
  } else if (date) {
    const dateToget = new Date(date);

    // if (isNaN(dateToget.getTime())) {
    //   throw new ErrorHandler(400, "Invalid date format");
    // }

    dateToget.setHours(0, 0, 0, 0);

    filter = {
      created_date: {
        gte: dateToget, // Greater than or equal to start of the day
        lt: new Date(dateToget.getTime() + 24 * 60 * 60 * 1000), // Less than end of the day
      },
    };
  } else {
    throw new ErrorHandler(
      400,
      "La date ou la date de début et la date de fin doivent être fournies."
    );
  }

  const offset = (page - 1) * pageSize;

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

  const articles = await prisma.online2024_articles.findMany({
    take: parseInt(pageSize),
    skip: parseInt(offset),
    orderBy: [order],
    where: {
      id_agency: {
        in: agencyIds,
      },
      ...filter,
      OR: [
        {
          slug: {
            contains: searchText,
          },
        },
        {
          title: {
            contains: searchText,
          },
        },
        {
          full_text: {
            contains: searchText,
          },
        },
      ],
    },
  });

  const articlesCount = await prisma.online2024_articles.count({
    where: {
      id_agency: {
        in: agencyIds,
      },
      ...filter,
      OR: [
        {
          slug: {
            contains: searchText,
          },
        },
        {
          title: {
            contains: searchText,
          },
        },
        {
          full_text: {
            contains: searchText,
          },
        },
      ],
    },
  });

  // Combine the data and handle BigInt serialization
  const artcilesFormated = articles.map((article) => {
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

  return { articles: artcilesFormated, count: articlesCount };
};
