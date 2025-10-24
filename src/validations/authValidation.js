import Joi from "joi";

// Define schema for signIn

export const signInSchema = Joi.object({
  username: Joi.string()
    .trim() // Remove any leading or trailing whitespace
    .max(30)
    .required(),
  password: Joi.string()
    .trim() // Remove any leading or trailing whitespace
    .max(30)
    .required(),
});

export const closeSessionSchema = Joi.object({
  sessionId: Joi.number().integer().required().strict(),
  userId: Joi.number().integer().required().strict(),
  username: Joi.string().max(30).required(),
  password: Joi.string().max(20).required(),
});

export const logOutSchema = Joi.object({
  username: Joi.string().max(30),
});
