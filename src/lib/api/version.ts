/**
 * Version API wrapper for connectivity validation.
 * The /version endpoint does not require authentication.
 */

import { NetworkError, ApiError } from './client';

/**
 * Version response from Nextcloud News API.
 */
export interface VersionResponse {
  version: string;
  apiLevels: string[];
}

/**
 * Checks server connectivity and API version without authentication.
 *
 * This endpoint is public (no auth required) and useful for:
 * - Pre-credential connectivity validation
 * - Server reachability testing
 * - API compatibility checking
 *
 * Uses a simple fetch without custom headers to avoid CORS preflight requests.
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
  // Construct URL - remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const url = `${cleanBaseUrl}/index.php/apps/news/api/v1-3/version`;

  try {
    // Use simple fetch without custom headers to avoid CORS preflight
    const response = await fetch(url, {
      method: 'GET',
      // Only include standard headers that don't trigger preflight
      headers: {
        Accept: 'application/json',
      },
    });

    // Handle error responses
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    // Parse and return JSON response
    const data = (await response.json()) as VersionResponse;
    return data;
  } catch (error) {
    // CORS errors (typically TypeError with specific message patterns)
    if (error instanceof TypeError) {
      const errorMessage = error.message.toLowerCase();

      // Check for common CORS error patterns
      if (
        errorMessage.includes('cors') ||
        errorMessage.includes('access-control-allow-origin') ||
        errorMessage.includes('cross-origin')
      ) {
        throw new NetworkError(
          'Server is not configured to allow cross-origin requests from this application. ' +
            'Please ensure CORS is properly configured on the server with Access-Control-Allow-Origin headers.',
        );
      }

      // Generic network error
      throw new NetworkError(
        'Unable to connect to server. Please check the URL and your network connection.',
      );
    }

    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Unknown errors
    throw new NetworkError('An unexpected error occurred while connecting to the server.');
  }
}
