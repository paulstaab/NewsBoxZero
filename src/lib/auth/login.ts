import { ApiError, NetworkError } from '@/lib/api/client';
import { getVersion } from '@/lib/api/version';
import { normalizeBaseUrl, validateServerUrl } from '@/lib/config/env';

export interface ValidatedServerUrl {
  raw: string;
  normalized: string;
}

/**
 * Validates and normalizes a server URL entered during login.
 */
export function validateLoginServerUrl(rawValue: string): ValidatedServerUrl {
  const raw = rawValue.trim();
  if (!raw) {
    throw new Error('Server URL is required');
  }

  const validation = validateServerUrl(raw);
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Please enter a valid server URL.');
  }

  const normalized = normalizeBaseUrl(raw);
  if (!normalized) {
    throw new Error('Please enter a valid URL');
  }

  return { raw, normalized };
}

/**
 * Validates the username/password fields entered during login.
 */
export function validateLoginCredentials(username: string, password: string): void {
  if (!username.trim()) {
    throw new Error('Username is required');
  }

  if (!password) {
    throw new Error('Password is required');
  }
}

/**
 * Maps connectivity failures to user-facing login validation copy.
 */
export function getLoginServerError(error: unknown): string {
  if (error instanceof NetworkError) {
    return error.message;
  }

  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'Server not found or invalid API endpoint. Please verify the URL.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return `Server returned error: ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to validate server. Please check your connection.';
}

/**
 * Validates server connectivity through the unauthenticated version endpoint.
 */
export async function validateServerConnectivity(serverUrl: string): Promise<void> {
  await getVersion(serverUrl);
}
