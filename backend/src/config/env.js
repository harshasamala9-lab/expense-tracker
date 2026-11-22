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
  jwtSecret: process.env.JWT_SECRET?.trim() || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '8h',
  automationUrl: process.env.AUTOMATION_URL?.trim().replace(/\/+$/, '') || '',
  automationKey: process.env.AUTOMATION_KEY?.trim() || '',
  supabaseUrl: process.env.SUPABASE_URL?.trim().replace(/\/+$/, '') || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY?.trim() || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || '',
  internalAutomationKey: process.env.INTERNAL_AUTOMATION_KEY?.trim() || '',
  enableWorkers: process.env.ENABLE_WORKERS !== 'false',
  reminderIntervalMs:
    Number(process.env.REMINDER_INTERVAL_MS) || 5 * 60 * 1000,
  automationEventIntervalMs:
    Number(process.env.AUTOMATION_EVENT_INTERVAL_MS) || 30 * 1000,
  reminderDueSoonHours: Number(process.env.REMINDER_DUE_SOON_HOURS) || 24,
  reminderLongRunningHours:
    Number(process.env.REMINDER_LONG_RUNNING_HOURS) || 72,
  reminderCriticalAgeHours:
    Number(process.env.REMINDER_CRITICAL_AGE_HOURS) || 4,
  repeatedFailureThreshold:
    Number(process.env.REPEATED_FAILURE_THRESHOLD) || 3,
});

export function requireDatabaseUrl() {
  if (!config.databaseUrl) {
    throw new Error(
      'DATABASE_URL is not configured. Copy backend/.env.example to backend/.env and add your Supabase connection string.',
    );
  }
  return config.databaseUrl;
}

export function requireJwtSecret() {
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be configured with at least 32 characters. Generate one with: openssl rand -base64 48',
    );
  }
  return config.jwtSecret;
}
