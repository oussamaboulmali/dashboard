import Joi from "joi";

export const agencySchema = Joi.object({
  name: Joi.string().max(40).required(),
  name_ar: Joi.string().max(50).required(),
});

export const userIdSchema = Joi.object({
  userId: Joi.number().integer().required().strict(),
});

export const agencyIdSchema = Joi.object({
  agencyId: Joi.number().integer().required().strict(),
});

export const articleIdSchema = Joi.object({
  articleId: Joi.number().integer().required().strict(),
});

export const getArticlesSchema = Joi.object({
  agencyId: Joi.number().integer().required().strict(),
  pageSize: Joi.number().integer().required().strict(),
  page: Joi.number().integer().required().strict(),
  date: Joi.date().iso(),
  order: Joi.object()
    .pattern(
      Joi.string().valid("created_date", "title", "slug", "full_text"),
      Joi.string().valid("asc", "desc")
    )
    .length(1),
});

export const searchArticlesSchema = Joi.object({
  agencyId: Joi.number().integer().required().strict(),
  searchText: Joi.string().allow("").required(),
  pageSize: Joi.number().integer().required().strict(),
  page: Joi.number().integer().required().strict(),
  date: Joi.string(),
  date_start: Joi.date().iso(),
  date_finish: Joi.date().iso(),
  order: Joi.object()
    .pattern(
      Joi.string().valid("created_date", "title", "slug", "full_text"),
      Joi.string().valid("asc", "desc")
    )
    .length(1),
})
  .with("date_start", "date_finish") // If date_start exists, date_finish must exist
  .with("date_finish", "date_start");

export const searchGlobaleSchema = Joi.object({
  searchText: Joi.string().allow("").required(),
  pageSize: Joi.number().integer().required().strict(),
  page: Joi.number().integer().required().strict(),
  date: Joi.string(),
  date_start: Joi.date().iso(),
  date_finish: Joi.date().iso(),
  order: Joi.object()
    .pattern(
      Joi.string().valid("created_date", "title", "slug", "full_text"),
      Joi.string().valid("asc", "desc")
    )
    .length(1),
})
  .with("date_start", "date_finish") // If date_start exists, date_finish must exist
  .with("date_finish", "date_start");

export const agencyUpdateSchema = Joi.object({
  agencyId: Joi.number().integer().required().strict(),
  name: Joi.string().max(40),
  name_ar: Joi.string().max(50),
});

export const agencyUsersSchema = Joi.object({
  agencyId: Joi.number().integer().required().strict(),
  users: Joi.array().items(Joi.number().integer().strict()).min(1).required(),
});
export const agencyUserRemoveSchema = Joi.object({
  agencyId: Joi.number().integer().required().strict(),
  userId: Joi.number().integer().strict().required(),
});
