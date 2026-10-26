import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true
});

function requiredSetting(name) {
  const value = process.env[name]?.trim();

  if (!value || value.startsWith('YOUR_')) {
    throw new Error(`Missing or placeholder value for ${name} in .env.`);
  }

  return value;
}

function optionalPublicBaseUrl() {
  const value = process.env.PUBLIC_BASE_URL?.trim();
  if (!value) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('PUBLIC_BASE_URL must be a valid HTTP or HTTPS URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('PUBLIC_BASE_URL must be a valid HTTP or HTTPS URL.');
  }

  return value.replace(/\/+$/, '');
}

export const env = {
  discordToken: requiredSetting('DISCORD_TOKEN'),
  discordClientId: requiredSetting('DISCORD_CLIENT_ID'),
  mongodbUri: requiredSetting('MONGODB_URI'),
  publicBaseUrl: optionalPublicBaseUrl(),
  port: Number(process.env.PORT || 3000)
};

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
