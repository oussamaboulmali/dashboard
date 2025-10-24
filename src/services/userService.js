import prisma from "../configs/database.js";
import bcrypt from "bcryptjs";
import { ErrorHandler } from "../middlewares/errorMiddleware.js";
import { infoLogger } from "../utils/logger.js";

const logger = infoLogger("utilisateurs");

export const getAllUsers = async ({ userId }) => {
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

  const users = await prisma.online2024_users.findMany({
    where: {
      online2024_service: {
        name: {
          in: userRoleAndServices.map((service) => service.name),
        },
      },
    },
    orderBy: {
      register_date: "desc",
    },
    include: {
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
      online2024_user_agency: {
        select: {
          online2024_agencies: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  users.sort((a, b) => {
    if (a.state === 1 && b.state !== 1) {
      return -1; // a comes before b
    } else if (a.state === 2 && b.state !== 1 && b.state !== 2) {
      return -1; // a comes before b
    } else if (a.state === 0 && (b.state === 1 || b.state === 2)) {
      return 1; // b comes before a
    } else {
      return 0; // no change in order
    }
  });

  const formatedUsers = users.map((user) => {
    const {
      online2024_user_agency,
      online2024_roles,
      online2024_service,
      password,
      ...rest
    } = user;
    return {
      ...rest,
      role: online2024_roles.name,
      service: online2024_service.name,
      agencies: online2024_user_agency.map(
        (agence) => agence.online2024_agencies.name
      ),
    };
  });

  return formatedUsers;
};

export const getAllRoles = async ({ userId }) => {
  const userRole = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
    select: {
      id_role: true,
    },
  });

  const RoleService = await prisma.online2024_service.findMany({
    where: {
      id_role: userRole.id_role,
    },
    select: {
      id_service: true,
      name: true,
    },
  });
  const AllRoles = await prisma.online2024_roles.findMany({
    orderBy: {
      id_role: "desc",
    },
    select: {
      id_role: true,
      name: true,
    },
  });

  // search if user has role admin then return all the roles existed
  if (userRole.id_role === 1) {
    return {
      roles: AllRoles,
      services: RoleService,
    };
  } else {
    const filteredRoles = AllRoles.filter((role) => role.id_role === 2);
    return {
      roles: filteredRoles,
      services: RoleService,
    };
  }
};

export const getOneUser = async ({ userId }) => {
  const user = await prisma.online2024_users.findUnique({
    where: { id_user: userId },
    include: {
      online2024_user_agency: {
        include: {
          online2024_agencies: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new ErrorHandler(404, "No User found");
  }
  delete user.password;
  delete user.login_attempts;

  user.agencies = user.online2024_user_agency.map((agency) => ({
    id_agency: agency.id_agency,
    assigned_date: agency.assigned_date,
    assigned_by: agency.assigned_by,
    name: agency.online2024_agencies.name,
  }));

  delete user.online2024_user_agency;

  return user;
};

export const getLoggedUserDetails = async ({ userId }) => {
  const user = await prisma.online2024_users.findUnique({
    where: { id_user: userId },
    include: {
      online2024_user_agency: {
        include: {
          online2024_agencies: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new ErrorHandler(404, "No User found");
  }
  delete user.password;
  delete user.login_attempts;

  user.agencies = user.online2024_user_agency.map((agency) => ({
    id_agency: agency.id_agency,
    assigned_date: agency.assigned_date,
    assigned_by: agency.assigned_by,
    name: agency.online2024_agencies.name,
  }));

  delete user.online2024_user_agency;

  return user;
};

export const getOtherAgenciesOfUser = async ({ userId }) => {
  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
  });

  if (!user) {
    throw new ErrorHandler(401, "User not founded ");
  }

  const otherAgencies = await prisma.online2024_agencies.findMany({
    where: {
      state: true,
      NOT: {
        online2024_user_agency: {
          some: {
            id_user: userId,
          },
        },
      },
    },
  });

  return otherAgencies;
};

export const createUser = async (userData, logData) => {
  const {
    password,
    username,
    agencies,
    assignedby,
    roleId,
    serviceId,
    ...rest
  } = userData;

  // Check if username is already taken
  const existingUser = await prisma.online2024_users.findUnique({
    where: { username: username },
  });

  if (existingUser) {
    logger.error({
      ...logData,
      message: `Une tentative de créer un nouveau utilisateur avec un username ${username} déjà pris.
      Informations de débogage :
      Username demandé : ${username}`,
    });
    throw new ErrorHandler(401, "Username déjà pris");
  }

  // Check if username is already taken
  const existingRole = await prisma.online2024_roles.findUnique({
    where: { id_role: roleId },
  });

  if (!existingRole) {
    logger.error({
      ...logData,
      message: `Une tentative de créer un nouveau utilisateur avec une role inexistant.
        Informations de débogage :
        Role ID demandé : ${roleId}`,
    });
    throw new ErrorHandler(401, "Role inexistant");
  }

  // Check if username is already taken
  const existingService = await prisma.online2024_service.findUnique({
    where: { id_service: serviceId },
  });

  if (!existingService) {
    logger.error({
      ...logData,
      message: `Une tentative de créer un nouveau utilisateur avec un service inexistant.
          Informations de débogage :
          Service ID demandé : ${serviceId}`,
    });
    throw new ErrorHandler(401, "Service inexistant");
  }

  for (const agencyId of agencies) {
    // Check if the user  has the agency
    const existingUserAgency = await prisma.online2024_agencies.findUnique({
      where: {
        id_agency: agencyId,
      },
    });

    if (!existingUserAgency) {
      logger.error({
        ...logData,
        message: `Une tentative de création d'un utilisateur avec une agence inexistant.
        Informations de débogage :
        ID du agency demandé : ${agencyId}`,
      });
      throw new ErrorHandler(401, "L'un des agences est inexistant.");
    }
  }

  // Hash the password
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt);

  //Create a new user
  const newUser = await prisma.online2024_users.create({
    data: {
      ...rest,
      id_role: roleId,
      id_service: serviceId,
      username,
      password: hashedPassword,
      register_by: assignedby,

      online2024_user_agency: {
        createMany: {
          data: agencies.map((agencyId) => ({
            id_agency: agencyId,
            assigned_by: assignedby,
          })),
        },
      },
    },
    include: {
      online2024_user_agency: {
        select: {
          online2024_agencies: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // Create user-agency relationships
  return {
    user_id: newUser.id_user,
    username: newUser.username,
    email: newUser.email,
    agencies: newUser.online2024_user_agency.map(
      (agencyName) => agencyName.online2024_agencies.name
    ),
  };
};

export const resetUserPassword = async (userdata, logData) => {
  const { userId, password, modifiedby } = userdata;

  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
  });

  if (!user) {
    logger.error({
      ...logData,
      message: `Une tentative de réinitialisation du mot de passe pour un utilisateur inexistant.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant.");
  }

  if (user.state === 0) {
    logger.error({
      ...logData,
      message: `Une tentative de réinitialisation du mot de passe pour un utilisateur désactivé.
      Informations de débogage :
      Username demandé : ${user.username}`,
    });
    throw new ErrorHandler(
      401,
      "L'utilisateur est désactivé, vous ne pouvez pas changer son mot de passe."
    );
  }

  // Hash the password
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt);

  await prisma.online2024_users.update({
    where: {
      id_user: userId,
    },
    data: {
      password: hashedPassword,
      modified_by: modifiedby,
      modified_date: new Date(),
    },
  });

  return user.username;
};

export const changeUserPassword = async (userdata, logData) => {
  const { userId, oldPassword, newPassword, modifiedby } = userdata;

  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
  });

  if (!user) {
    logger.error({
      ...logData,
      message: `Une tentative de changement de son propre mot de passe avec un ID utilisateur incorrect.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant.");
  }

  // Check if the password is correct
  const isCorrectPassword = await bcrypt.compare(oldPassword, user.password);

  if (!isCorrectPassword) {
    logger.error({
      ...logData,
      message: `Une tentative de changement de mot de passe avec un ancien mot de passe incorrect.`,
    });
    throw new ErrorHandler(
      403,
      "Le mot de passe que vous avez fourni est incorrect."
    );
  }

  // Hash the password
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await prisma.online2024_users.update({
    where: {
      id_user: userId,
    },
    data: {
      password: hashedPassword,
      modified_by: modifiedby,
      modified_date: new Date(),
    },
  });
};

export const unblockUser = async (userdata, logData) => {
  const { userId, unblockedBy } = userdata;

  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
  });

  if (!user) {
    logger.error({
      ...logData,
      message: `Une tentative de déblocage du compte d'un utilisateur inexistant.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant.");
  }

  await prisma.online2024_users.update({
    where: {
      id_user: userId,
    },
    data: {
      state: 1,
      login_attempts: 0,
      block_code: null,
      unblocked_by: unblockedBy,
      unblocked_date: new Date(),
    },
  });

  return user.username;
};

export const blockUser = async (userdata, logData) => {
  const { userId, blockCode } = userdata;

  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
  });

  if (!user) {
    logger.error({
      ...logData,
      message: `Une tentative de blocage du compte d'un utilisateur inexistant.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant.");
  }

  await prisma.online2024_users.update({
    where: {
      id_user: userId,
    },
    data: {
      state: 2,
      block_code: blockCode,
      blocked_date: new Date(),
    },
  });

  return user.username;
};

export const activateUser = async (userdata, logData) => {
  const { userId, type, changeBy } = userdata;
  var updateData = {};

  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
  });

  if (!user) {
    logger.error({
      ...logData,
      message: `Une tentative de ${
        type ? "l'activation" : "la désactivation"
      } du compte d'un utilisateur inexistant.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant.");
  }

  if (type) {
    updateData = {
      state: 1,
      activate_by: changeBy,
      activate_date: new Date(),
    };
  } else {
    updateData = {
      state: 0,
      deactivated_by: changeBy,
      desactivate_date: new Date(),
    };
  }

  await prisma.online2024_users.update({
    where: {
      id_user: userId,
    },
    data: updateData,
  });

  return user.username;
};

export const changeStateUser = async (userdata, logData) => {
  const { userId, state, changeBy, note } = userdata;
  var updateData = {};

  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
  });

  if (!user) {
    logger.error({
      ...logData,
      message: `Une tentative du changer l'etat du compte d'un utilisateur inexistant.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant.");
  }

  switch (state) {
    case 0:
      updateData = {
        state: 0,
        deactivated_by: changeBy,
        desactivate_date: new Date(),
        login_attempts: 0,
        note,
      };
      break;
    case 1:
      updateData = {
        state: 1,
        activate_by: changeBy,
        activate_date: new Date(),
        login_attempts: 0,
        note,
      };
      break;
    case 3:
      updateData = {
        state: 3,
        trash_by: changeBy,
        trash_date: new Date(),
        login_attempts: 0,
        note,
      };
      break;
    default:
      break;
  }

  await prisma.online2024_users.update({
    where: {
      id_user: userId,
    },
    data: updateData,
  });

  return user.username;
};

export const updateUser = async (userdata, logData) => {
  const { userId, modifiedby, oldPassword, newPassword, serviceId, ...rest } =
    userdata;
  let hashedPassword;

  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
    select: {
      username: true,
      password: true,
      state: true,
      designation: true,
      phone_number: true,
      lang: true,
      email: true,
      contact: true,
      fonction: true,
      contact_emails: true,
      contact_numbers: true,
      online2024_service: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user) {
    logger.error({
      ...logData,
      message: `Une tentative de modification des informations du compte d'un utilisateur inexistant.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant.");
  }

  if (user.state === 0) {
    logger.error({
      ...logData,
      message: `Une tentative de modification des informations du compte d'un utilisateur désactivé.
      Informations de débogage :
      Nom d'utilisateur demandé : ${user.username}`,
    });
    throw new ErrorHandler(
      401,
      "L'utilisateur est désactivé, vous ne pouvez pas modifier ses informations de compte."
    );
  }

  if (oldPassword !== undefined) {
    // Check if the password is correct
    const isCorrectPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isCorrectPassword) {
      logger.error({
        ...logData,
        message: `Une tentative de changement de mot de passe avec un ancien mot de passe incorrect.`,
      });
      throw new ErrorHandler(
        403,
        "Le mot de passe que vous avez fourni est incorrect."
      );
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    hashedPassword = await bcrypt.hash(newPassword, salt);
  }

  const updatedUser = await prisma.online2024_users.update({
    where: {
      id_user: userId,
    },
    data: {
      ...rest,
      ...(newPassword !== undefined && { password: hashedPassword }),
      ...(serviceId !== undefined && { id_service: serviceId }),
      modified_by: modifiedby,
      modified_date: new Date(),
    },
    select: {
      designation: true,
      phone_number: true,
      lang: true,
      email: true,
      contact: true,
      fonction: true,
      contact_emails: true,
      contact_numbers: true,
      online2024_service: {
        select: {
          name: true,
        },
      },
    },
  });

  return generateLogMessage(user, updatedUser);
};

function generateLogMessage(oldUser, updatedUser) {
  const changes = [];
  const languageMapping = {
    1: "arabe",
    2: "français",
    3: "anglais",
  };

  for (const key in updatedUser) {
    // If the key is 'online2024_service', compare only the 'name' property
    let oldValue = oldUser[key];
    let newValue = updatedUser[key];

    if (key === "online2024_service") {
      oldValue = oldUser[key]?.name ?? "non défini"; // Access the 'name' property
      newValue = updatedUser[key]?.name ?? "non défini"; // Access the 'name' property
    }

    // Handle language conversion
    if (key === "lang") {
      oldValue = languageMapping[oldValue] || oldValue; // Convert language code to name
      newValue = languageMapping[newValue] || newValue; // Convert language code to name
    }

    // Handle other fields and ensure null or undefined values are handled
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      if (key == "password") {
        changes.push(`Mot de passe changé`);
      } else {
        changes.push(`${key}: "${oldValue}" → "${newValue}"`);
      }
    }
  }

  if (changes.length > 0) {
    return `Les informations de l'utilisateur "${
      oldUser.username
    }" ont été modifiées avec succès :
     ${changes.join(", \n ")} `;
  }

  return `Aucun changement détecté pour l'utilisateur "${oldUser.username}".`;
}

export const updateLoggedUser = async (userdata, logData) => {
  const { userId, modifiedby, oldPassword, newPassword, ...rest } = userdata;
  let hashedPassword;

  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
    select: {
      username: true,
      password: true,
      state: true,
      designation: true,
      phone_number: true,
      lang: true,
      email: true,
      contact: true,
      fonction: true,
      contact_emails: true,
      contact_numbers: true,
      online2024_service: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user) {
    logger.error({
      ...logData,
      message: `Une tentative de modification des informations du compte d'un utilisateur inexistant.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant.");
  }

  if (user.state === 0) {
    logger.error({
      ...logData,
      message: `Une tentative de modification des informations du compte d'un utilisateur désactivé.
      Informations de débogage :
      Nom d'utilisateur demandé : ${user.username}`,
    });
    throw new ErrorHandler(
      401,
      "L'utilisateur est désactivé, vous ne pouvez pas modifier ses informations de compte."
    );
  }

  if (oldPassword !== undefined) {
    // Check if the password is correct
    const isCorrectPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isCorrectPassword) {
      logger.error({
        ...logData,
        message: `Une tentative de changement de mot de passe avec un ancien mot de passe incorrect.`,
      });
      throw new ErrorHandler(
        403,
        "Le mot de passe que vous avez fourni est incorrect."
      );
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    hashedPassword = await bcrypt.hash(newPassword, salt);
  }

  const updatedUser = await prisma.online2024_users.update({
    where: {
      id_user: userId,
    },
    select: {
      designation: true,
      phone_number: true,
      lang: true,
      email: true,
      password: true,
      contact: true,
      fonction: true,
      contact_emails: true,
      contact_numbers: true,
      online2024_service: {
        select: {
          name: true,
        },
      },
    },
    data: {
      ...rest,
      ...(newPassword !== undefined && { password: hashedPassword }),
      modified_by: modifiedby,
      modified_date: new Date(),
    },
  });

  return generateLogMessage(user, updatedUser);
};
export const addAgencyToUser = async (data, logData) => {
  const { userId, agencies, assignedBy } = data;
  const agencyName = [];
  const existingUser = await prisma.online2024_users.findUnique({
    where: { id_user: userId },
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
      message: `Une tentative d'ajout des agences à un utilisateur inexistant.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant.");
  }

  if (existingUser.state === 0) {
    logger.error({
      ...logData,
      message: `Une tentative d'ajout des agences à un utilisateur désactivé.
      Informations de débogage :
      Nom d'utilisateur demandé : ${existingUser.username}`,
    });
    throw new ErrorHandler(
      401,
      "L'utilisateur est désactivé, vous ne pouvez pas lui attribuer des agencies."
    );
  }

  for (const agencyId of agencies) {
    const existingAgency = await prisma.online2024_agencies.findUnique({
      where: {
        id_agency: agencyId,
      },
    });

    if (!existingAgency) {
      logger.error({
        ...logData,
        message: `Une tentative d'ajout d'une agence inexistant à ${existingUser.username} .
        Informations de débogage :
        ID du agency demandé : ${agencyId}`,
      });
      throw new ErrorHandler(401, "Une des agencies est inexistant");
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
        message: `Une tentative d'ajout d'une agence deja existant à ${existingUser.username}.
        Informations de débogage :
        agency demandé : ${existingAgency.name}`,
      });
      throw new ErrorHandler(
        401,
        "L'utilisateur possède déjà l'un des agences."
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

    agencyName.push(existingAgency.name);
  }

  // If the user doesn't have the agency, create the relationship
  // Create user-agency relationships
  const createdData = agencies.map((agencyId) => ({
    id_agency: agencyId,
    id_user: userId,
    assigned_by: assignedBy,
  }));

  await prisma.online2024_user_agency.createMany({
    data: createdData,
  });

  return {
    username: existingUser.username,
    agencyName,
  };
};

export const removeAgenciesFromUser = async (data, logData) => {
  const { userId, agencyId } = data;

  const existingUser = await prisma.online2024_users.findUnique({
    where: { id_user: userId },
    include: {
      _count: {
        select: {
          online2024_user_agency: true,
        },
      },
    },
  });

  if (!existingUser) {
    logger.error({
      ...logData,
      message: `Une tentative de suppression d'une agence d'un utilisateur inexistant.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant");
  }

  if (existingUser.state === 0) {
    logger.error({
      ...logData,
      message: `Une tentative de suppression d'une agence d'un utilisateur désactivé.
      Informations de débogage :
      Nom d'utilisateur demandé : ${existingUser.username}`,
    });
    throw new ErrorHandler(
      401,
      "L'utilisateur est désactivé, vous ne pouvez pas lui retirer ses agences."
    );
  }

  // Check if the user you want to remove from it has the agency
  const existingAgencyUser = await prisma.online2024_user_agency.findFirst({
    where: {
      id_agency: agencyId,
      id_user: userId,
    },
    include: {
      online2024_agencies: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!existingAgencyUser) {
    logger.error({
      ...logData,
      message: `Une tentative de suppression d'une agence qu'il ne le possède pas de ${existingUser.username}.
      Informations de débogage :
      ID du agency demandé : ${agencyId}`,
    });
    throw new ErrorHandler(401, "L'utilisateur ne possède pas cette agence.");
  }

  if (existingUser._count.online2024_user_agency == 1) {
    logger.error({
      ...logData,
      message: `Une tentative de suppression de la dernier agence de l'utilisateur.
      Informations de débogage :
      Nom d'utilisateur demandé : ${existingUser.username}
      Nom du agency demandé : ${existingAgencyUser.online2024_agencies.name}`,
    });
    throw new ErrorHandler(
      401,
      "Vous ne pouvez pas supprimer la dernier agence de cet utilisateur."
    );
  }

  // If the relationship exists, delete it
  await prisma.online2024_user_agency.deleteMany({
    where: {
      id_agency: agencyId,
      id_user: userId,
    },
  });

  return {
    username: existingUser.username,
    agencyname: existingAgencyUser.online2024_agencies.name,
  };
};

export const setRefreshTime = async (data) => {
  const { userId, refreshTime } = data;

  const user = await prisma.online2024_users.findUnique({
    where: {
      id_user: userId,
    },
  });

  if (!user) {
    logger.error({
      ...logData,
      message: `Une tentative de modification des informations du compte d'un utilisateur inexistant.
      Informations de débogage :
      ID de l'utilisateur demandé : ${userId}`,
    });
    throw new ErrorHandler(401, "Utilisateur inexistant.");
  }

  await prisma.online2024_users.update({
    where: { id_user: userId },
    data: {
      refresh_time: refreshTime,
    },
  });
};

export const getAllMenu = async ({ userId }) => {
  // Step 1: Fetch all agencies associated with the user
  const userAgencies = await prisma.online2024_agencies.findMany({
    where: {
      online2024_user_agency: {
        some: {
          id_user: userId,
        },
      },
      state: true,
    },
    select: {
      name: true,
      id_agency: true,
      url: true,
      alias: true,
      name_ar: true,
    },
  });

  // Step 2: Fetch user roles and associated menus
  const user = await prisma.online2024_users.findUnique({
    where: { id_user: userId },
    select: {
      online2024_roles: {
        select: {
          online2024_roles_menu: {
            select: {
              online2024_menu: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const menu = user.online2024_roles.online2024_roles_menu.map((item) => {
    const menuName = item.online2024_menu.name;
    return menuName === "Agences" ? { Agences: userAgencies } : menuName;
  });

  return menu;
};
