import dotenv from 'dotenv';

dotenv.config({ quiet: true });

/**
 * Centralized, read-only configuration.
 *
 * Reading environment variables in one place keeps secrets out of source
 * files and makes it obvious which values a deployment must provide.
 */
export const config = Object.freeze({
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL?.trim() || '',
  databaseUrl: process.env.DATABASE_URL?.trim() || '',
  dbSslRejectUnauthorized:
    process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
});

export function requireDatabaseUrl() {
  if (!config.databaseUrl) {
    throw new Error(
      'DATABASE_URL is not configured. Copy backend/.env.example to backend/.env and add your Supabase connection string.',
    );
  }
  return config.databaseUrl;
}
