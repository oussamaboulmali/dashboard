import Joi from "joi";

export const sessionSchema = Joi.object({
  date: Joi.date().iso().required(),
});

export const clearSessionSchema = Joi.object({
  sessionId: Joi.number().integer().required().strict(),
});

export const logsSchema = Joi.object({
  filename: Joi.string().required(),
});

export const frontlogSchema = Joi.object({
  level: Joi.string().max(10).required(),
  folder: Joi.string().max(20).required(),
  action: Joi.string().max(50).allow(""),
  message: Joi.string().required(),
});
