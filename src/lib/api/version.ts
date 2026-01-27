/**
 * Version API wrapper for connectivity validation.
 * The /version endpoint does not require authentication.
 *
 * Re-exports from the centralized API client for backward compatibility.
 */

import { api, type VersionResponse } from './apiClient';

export type { VersionResponse };

/**
 * Checks server connectivity and API version without authentication.
 *
 * This endpoint is public (no auth required) and useful for:
 * - Pre-credential connectivity validation
 * - Server reachability testing
 * - API compatibility checking
 *
 * @param baseUrl - The base URL of the Nextcloud instance
 * @returns Version information if server is reachable
 * @throws {NetworkError} If server is unreachable
 * @throws {ApiError} If response is invalid
 *
 * @example
 * ```ts
 * try {
 *   const version = await getVersion('https://rss.example.com');
 *   console.log(`Server version: ${version.version}`);
 * } catch (error) {
 *   console.error('Server unreachable:', error);
 * }
 * ```
 */
export async function getVersion(baseUrl: string): Promise<VersionResponse> {
  return api.version.get(baseUrl);
}
