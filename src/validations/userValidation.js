import Joi from "joi";

export const userIdSchema = Joi.object({
  userId: Joi.number().integer().required().strict(),
});

export const refreshTimeSchema = Joi.object({
  refreshTime: Joi.number().integer().strict().required(),
});
export const userSchema = Joi.object({
  agencies: Joi.array()
    .items(Joi.number().integer().strict())
    .min(1)
    .required(),
  designation: Joi.string().max(60).required(),
  username: Joi.string().max(30).required(),
  contact: Joi.string().max(50),
  fonction: Joi.string().max(50),
  contact_numbers: Joi.string(),
  contact_emails: Joi.string(),
  lang: Joi.number().strict().required(),
  email: Joi.string().max(30).email(),
  password: Joi.string().min(6).max(20).required(),
  roleId: Joi.number().integer().required().strict(),
  serviceId: Joi.number().integer().required().strict(),
});

export const resetPasswordSchema = Joi.object({
  userId: Joi.number().integer().required().strict(),
  password: Joi.string().min(6).max(20).required(),
});

export const updatePasswordSchema = Joi.object({
  userId: Joi.number().integer().required().strict(),
  oldPassword: Joi.string().min(6).max(20).required(),
  newPassword: Joi.string().min(6).max(20).required(),
});

export const changeStateSchema = Joi.object({
  userId: Joi.number().integer().required().strict(),
  state: Joi.number().integer().required().strict().valid(0, 1, 3),
  note: Joi.string().min(5).required(),
});

export const blockSchema = Joi.object({
  userId: Joi.number().integer().required().strict(),
  blockCode: Joi.number().integer().required().strict().valid(210, 220),
});

export const updateUserSchema = Joi.object({
  userId: Joi.number().integer().required().strict(),
  designation: Joi.string().max(60),
  phone_number: Joi.string().max(10),
  lang: Joi.number().strict(),
  email: Joi.string().email().max(30),
  oldPassword: Joi.string().min(6).max(20),
  newPassword: Joi.string().min(6).max(20).when("oldPassword", {
    is: Joi.exist(),
    then: Joi.required(),
  }),
  serviceId: Joi.number().integer().strict(),
  contact: Joi.string().max(50),
  fonction: Joi.string().max(50),
  contact_numbers: Joi.string(),
  contact_emails: Joi.string(),
});

export const userAgenciesSchema = Joi.object({
  userId: Joi.number().integer().required().strict(),
  agencies: Joi.array()
    .items(Joi.number().integer().strict())
    .min(1)
    .required(),
});

export const userAgenciesRemoveSchema = Joi.object({
  userId: Joi.number().integer().required().strict(),
  agencyId: Joi.number().integer().required().strict(),
});
