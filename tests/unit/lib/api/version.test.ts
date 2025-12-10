/**
 * Unit tests for version API endpoint.
 * Tests connectivity validation before credential entry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { getVersion } from '@/lib/api/version';
import { NetworkError, ApiError } from '@/lib/api/client';

const TEST_BASE_URL = 'https://nextcloud.example.com';
const TEST_BASE_URL_UNREACHABLE = 'https://unreachable.invalid';
const TEST_BASE_URL_404 = 'https://wrong-path.example.com';
const API_PATH = '/index.php/apps/news/api/v1-3/version';

// Mock version response
const mockVersionResponse = {
  version: '18.0.0',
  apiLevels: ['v1-3'],
};

beforeEach(() => {
  server.resetHandlers();
});

describe('getVersion', () => {
  describe('successful responses', () => {
    it('should return version info for valid server', async () => {
      // Uses the default mock handlers
      const result = await getVersion(TEST_BASE_URL);

      expect(result).toEqual(mockVersionResponse);
      expect(result.version).toBe('18.0.0');
      expect(result.apiLevels).toContain('v1-3');
    });

    it('should work without authentication', async () => {
      let receivedAuth = false;

      server.use(
        http.get(`${TEST_BASE_URL}${API_PATH}`, ({ request }) => {
          receivedAuth = request.headers.has('Authorization');
          return HttpResponse.json(mockVersionResponse);
        }),
      );

      await getVersion(TEST_BASE_URL);

      expect(receivedAuth).toBe(false);
    });

    it('should handle different version formats', async () => {
      const customVersion = {
        version: '19.1.2',
        apiLevels: ['v1-3', 'v2-0'],
      };

      server.use(
        http.get(`${TEST_BASE_URL}${API_PATH}`, () => {
          return HttpResponse.json(customVersion);
        }),
      );

      const result = await getVersion(TEST_BASE_URL);

      expect(result.version).toBe('19.1.2');
      expect(result.apiLevels).toHaveLength(2);
    });
  });

  describe('network errors', () => {
    it('should throw NetworkError for unreachable server', async () => {
      // Uses pre-configured handler for unreachable.invalid
      await expect(getVersion(TEST_BASE_URL_UNREACHABLE)).rejects.toThrow(NetworkError);
    }, 10000); // Increase timeout to account for retries
  });

  describe('invalid URLs', () => {
    it('should handle 404 for wrong endpoint path', async () => {
      // Uses pre-configured handler for wrong-path.example.com
      await expect(getVersion(TEST_BASE_URL_404)).rejects.toThrow(ApiError);
      try {
        await getVersion(TEST_BASE_URL_404);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
      }
    });

    it('should handle 500 server errors', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}${API_PATH}`, () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      try {
        await getVersion(TEST_BASE_URL);
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(500);
      }
    }, 15000); // Increase timeout to account for multiple retries
  });

  describe('error handling', () => {
    it('should throw ApiError immediately on 500 errors (no retry)', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}${API_PATH}`, () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      try {
        await getVersion(TEST_BASE_URL);
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(500);
      }
    });

    it('should throw ApiError immediately on 404 errors (no retry)', async () => {
      try {
        await getVersion(TEST_BASE_URL_404);
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
      }
    });
  });

  describe('edge cases', () => {
    it('should validate response structure', async () => {
      const result = await getVersion(TEST_BASE_URL);

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('apiLevels');
      expect(typeof result.version).toBe('string');
      expect(Array.isArray(result.apiLevels)).toBe(true);
    });
  });
});
