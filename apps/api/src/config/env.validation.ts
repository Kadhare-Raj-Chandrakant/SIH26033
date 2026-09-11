/* eslint-disable unicorn/no-thenable */
import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  API_PORT: Joi.number().default(4000),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
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
    is: 'test',
    // oxlint-disable-next-line unicorn/no-thenable
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  JWT_EXPIRATION: Joi.string().default('15m'),
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
});
