import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string().required(),

  MONGO_URI: Joi.string().required(),
  MONGO_TEST_URI: Joi.string().optional(),

  ADMIN_USERNAME: Joi.string().required(),
  ADMIN_PASSWORD_HASH: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  INGEST_API_KEY: Joi.string().min(8).required(),

  N8N_BASE_URL: Joi.string().uri().required(),
  N8N_API_KEY: Joi.string().required(),

  SUPABASE_PORTFOLIO_URL: Joi.string().uri().required(),
  SUPABASE_PORTFOLIO_ANON_KEY: Joi.string().required(),

  SUPABASE_N8N_URL: Joi.string().uri().required(),
  SUPABASE_N8N_ANON_KEY: Joi.string().required(),

  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  TELEGRAM_CHAT_ID: Joi.string().required(),
}).options({ abortEarly: false });
