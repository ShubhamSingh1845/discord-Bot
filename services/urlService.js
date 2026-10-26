import { randomBytes } from 'node:crypto';
import Url from '../models/Url.js';

const MAX_ID_ATTEMPTS = 5;

export class InvalidUrlError extends Error {
  constructor() {
    super('URL must be a valid HTTP or HTTPS URL.');
    this.name = 'InvalidUrlError';
  }
}

function validateUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidUrlError();
  }

  const url = value.trim();

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new InvalidUrlError();
    }
  } catch (error) {
    if (error instanceof InvalidUrlError) throw error;
    throw new InvalidUrlError();
  }

  return url;
}

function isShortIdCollision(error) {
  return error?.code === 11000 && (
    error.keyPattern?.shortId === 1
    || Object.hasOwn(error.keyValue ?? {}, 'shortId')
  );
}

export async function saveUrl({ url, discordUserId, commandSource }) {
  const validatedUrl = validateUrl(url);

  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const record = new Url({
      url: validatedUrl,
      shortId: randomBytes(6).toString('hex'),
      discordUserId,
      commandSource
    });

    try {
      return await record.save();
    } catch (error) {
      if (!isShortIdCollision(error) || attempt === MAX_ID_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new Error('Could not generate a unique short ID.');
}
