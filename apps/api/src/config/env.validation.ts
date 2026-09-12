/* eslint-disable unicorn/no-thenable */
import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PORT: Joi.number().default(4000),
  PORT: Joi.number().optional(),
  CORS_ORIGIN: Joi.string().when('NODE_ENV', {
    is: 'production',
    // oxlint-disable-next-line unicorn/no-thenable
    then: Joi.string().invalid('*').required(),
    otherwise: Joi.string().default('http://localhost:3000'),
  }),
  DATABASE_URL: Joi.string().when('NODE_ENV', {
    is: 'test',
    // oxlint-disable-next-line unicorn/no-thenable
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  REDIS_URL: Joi.string().when('NODE_ENV', {
    is: 'test',
    // oxlint-disable-next-line unicorn/no-thenable
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    // oxlint-disable-next-line unicorn/no-thenable
    then: Joi.string().min(32).invalid('dev-secret-change-in-production').required(),
    otherwise: Joi.string().when('NODE_ENV', {
      is: 'test',
      // oxlint-disable-next-line unicorn/no-thenable
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
  }),
  JWT_EXPIRATION: Joi.string().default('15m'),
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
  LOGISTICS_PROVIDER: Joi.string().default('mock'),
  AI_SERVICE_URL: Joi.string().default('http://localhost:8080'),
  AI_TIMEOUT_MS: Joi.number().default(5000),
  AI_INTERNAL_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    // oxlint-disable-next-line unicorn/no-thenable
    then: Joi.string().min(16).required(),
    otherwise: Joi.string().optional(),
  }),
  SENTRY_DSN: Joi.string().optional().allow(''),
});
