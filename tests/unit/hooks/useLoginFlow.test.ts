import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLoginFlow, LoginStep } from '@/hooks/useLoginFlow';
import { ApiError, NetworkError } from '@/lib/api/client';
import * as loginLib from '@/lib/auth/login';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockLogin = vi.fn();
let mockAuthError: string | null = null;
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin, error: mockAuthError }),
}));

vi.mock('@/lib/auth/login');

const mockedValidateLoginServerUrl = vi.mocked(loginLib.validateLoginServerUrl);
const mockedValidateServerConnectivity = vi.mocked(loginLib.validateServerConnectivity);
const mockedValidateLoginCredentials = vi.mocked(loginLib.validateLoginCredentials);
const mockedGetLoginServerError = vi.mocked(loginLib.getLoginServerError);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupValidServerUrl(normalized = 'https://rss.example.com') {
  mockedValidateLoginServerUrl.mockReturnValue({ raw: normalized, normalized });
  mockedValidateServerConnectivity.mockResolvedValue(undefined);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLoginFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthError = null;
    mockedGetLoginServerError.mockImplementation((err: unknown) =>
      err instanceof Error ? err.message : 'Unknown error',
    );
  });

  it('starts at the SERVER_URL step', () => {
    const { result } = renderHook(() => useLoginFlow());
    expect(result.current.step).toBe(LoginStep.SERVER_URL);
  });

  describe('handleServerUrlSubmit', () => {
    it('transitions to CREDENTIALS on successful URL validation', async () => {
      setupValidServerUrl();
      const { result } = renderHook(() => useLoginFlow());
      await act(async () => {
        await result.current.handleServerUrlSubmit();
      });
      expect(result.current.step).toBe(LoginStep.CREDENTIALS);
      expect(result.current.validationError).toBeNull();
    });

    it('normalizes and stores the server URL after validation', async () => {
      const normalized = 'https://rss.example.com';
      setupValidServerUrl(normalized);
      const { result } = renderHook(() => useLoginFlow());
      act(() => {
        result.current.setServerUrl('https://rss.example.com/');
      });
      await act(async () => {
        await result.current.handleServerUrlSubmit();
      });
      expect(result.current.serverUrl).toBe(normalized);
    });

    it('sets VALIDATING_URL step while awaiting connectivity check', async () => {
      let resolveConnectivity!: () => void;
      mockedValidateLoginServerUrl.mockReturnValue({
        raw: 'https://rss.example.com',
        normalized: 'https://rss.example.com',
      });
      mockedValidateServerConnectivity.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveConnectivity = resolve;
        }),
      );

      const { result } = renderHook(() => useLoginFlow());
      // Start submit but don't await yet
      let submitDone = false;
      act(() => {
        void result.current.handleServerUrlSubmit().then(() => {
          submitDone = true;
        });
      });
      // The step should now be VALIDATING_URL
      expect(result.current.step).toBe(LoginStep.VALIDATING_URL);

      // Now resolve and finish
      await act(async () => {
        resolveConnectivity();
        await Promise.resolve();
      });
      expect(submitDone).toBe(true);
      expect(result.current.step).toBe(LoginStep.CREDENTIALS);
    });

    it('stays at SERVER_URL and sets validationError when URL is invalid', async () => {
      mockedValidateLoginServerUrl.mockImplementation(() => {
        throw new Error('Server URL is required');
      });
      mockedGetLoginServerError.mockReturnValue('Server URL is required');

      const { result } = renderHook(() => useLoginFlow());
      await act(async () => {
        await result.current.handleServerUrlSubmit();
      });
      expect(result.current.step).toBe(LoginStep.SERVER_URL);
      expect(result.current.validationError).toBe('Server URL is required');
    });

    it('maps NetworkError to validationError via getLoginServerError', async () => {
      mockedValidateLoginServerUrl.mockReturnValue({
        raw: 'https://rss.example.com',
        normalized: 'https://rss.example.com',
      });
      const networkErr = new NetworkError('Network unreachable');
      mockedValidateServerConnectivity.mockRejectedValue(networkErr);
      mockedGetLoginServerError.mockReturnValue('Network unreachable');

      const { result } = renderHook(() => useLoginFlow());
      await act(async () => {
        await result.current.handleServerUrlSubmit();
      });
      expect(result.current.step).toBe(LoginStep.SERVER_URL);
      expect(result.current.validationError).toBe('Network unreachable');
    });

    it('maps ApiError 404 to validationError via getLoginServerError', async () => {
      mockedValidateLoginServerUrl.mockReturnValue({
        raw: 'https://rss.example.com',
        normalized: 'https://rss.example.com',
      });
      const apiErr = new ApiError(404, 'Not Found');
      mockedValidateServerConnectivity.mockRejectedValue(apiErr);
      mockedGetLoginServerError.mockReturnValue(
        'Server not found or invalid API endpoint. Please verify the URL.',
      );

      const { result } = renderHook(() => useLoginFlow());
      await act(async () => {
        await result.current.handleServerUrlSubmit();
      });
      expect(result.current.step).toBe(LoginStep.SERVER_URL);
      expect(result.current.validationError).toBe(
        'Server not found or invalid API endpoint. Please verify the URL.',
      );
    });
  });

  describe('handleCredentialsSubmit', () => {
    it('navigates to /timeline on successful login', async () => {
      mockedValidateLoginCredentials.mockReturnValue(undefined);
      mockLogin.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLoginFlow());
      await act(async () => {
        await result.current.handleCredentialsSubmit();
      });
      expect(mockLogin).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith('/timeline');
    });

    it('sets AUTHENTICATING step while login is in progress', async () => {
      mockedValidateLoginCredentials.mockReturnValue(undefined);
      let resolveLogin!: () => void;
      mockLogin.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        }),
      );

      const { result } = renderHook(() => useLoginFlow());
      act(() => {
        void result.current.handleCredentialsSubmit();
      });
      // Step must be AUTHENTICATING while the login call is pending
      expect(result.current.step).toBe(LoginStep.AUTHENTICATING);

      // Resolve the login – on success the hook navigates away; step stays AUTHENTICATING
      await act(async () => {
        resolveLogin();
        await Promise.resolve();
      });
      expect(result.current.step).toBe(LoginStep.AUTHENTICATING);
      expect(mockPush).toHaveBeenCalledWith('/timeline');
    });

    it('returns to CREDENTIALS step and sets validationError on login failure', async () => {
      mockedValidateLoginCredentials.mockReturnValue(undefined);
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useLoginFlow());
      await act(async () => {
        await result.current.handleCredentialsSubmit();
      });
      expect(result.current.step).toBe(LoginStep.CREDENTIALS);
      expect(result.current.validationError).toBe('Invalid credentials');
    });

    it('falls back to "Authentication failed" for non-Error rejections', async () => {
      mockedValidateLoginCredentials.mockReturnValue(undefined);
      mockLogin.mockRejectedValue('some string error');

      const { result } = renderHook(() => useLoginFlow());
      await act(async () => {
        await result.current.handleCredentialsSubmit();
      });
      expect(result.current.validationError).toBe('Authentication failed');
    });

    it('stays at CREDENTIALS with error when credential validation throws', async () => {
      mockedValidateLoginCredentials.mockImplementation(() => {
        throw new Error('Password is required');
      });

      const { result } = renderHook(() => useLoginFlow());
      await act(async () => {
        await result.current.handleCredentialsSubmit();
      });
      expect(result.current.step).toBe(LoginStep.CREDENTIALS);
      expect(result.current.validationError).toBe('Password is required');
    });
  });

  describe('handlePlainSubmit', () => {
    it('validates URL and credentials then logs in and navigates', async () => {
      setupValidServerUrl();
      mockedValidateLoginCredentials.mockReturnValue(undefined);
      mockLogin.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLoginFlow());
      act(() => {
        result.current.setUsername('user');
        result.current.setPassword('pass');
      });
      await act(async () => {
        await result.current.handlePlainSubmit();
      });
      expect(mockLogin).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith('/timeline');
    });

    it('reverts to SERVER_URL step and sets error on URL validation failure', async () => {
      mockedValidateLoginServerUrl.mockImplementation(() => {
        throw new Error('Server URL is required');
      });
      mockedGetLoginServerError.mockReturnValue('Server URL is required');

      const { result } = renderHook(() => useLoginFlow());
      await act(async () => {
        await result.current.handlePlainSubmit();
      });
      expect(result.current.step).toBe(LoginStep.SERVER_URL);
      expect(result.current.validationError).toBe('Server URL is required');
    });
  });

  describe('handleBack', () => {
    it('goes back to SERVER_URL from CREDENTIALS step', async () => {
      setupValidServerUrl();
      const { result } = renderHook(() => useLoginFlow());
      await act(async () => {
        await result.current.handleServerUrlSubmit();
      });
      expect(result.current.step).toBe(LoginStep.CREDENTIALS);

      act(() => {
        result.current.handleBack();
      });
      expect(result.current.step).toBe(LoginStep.SERVER_URL);
      expect(result.current.validationError).toBeNull();
    });

    it('does nothing when already at SERVER_URL step', () => {
      const { result } = renderHook(() => useLoginFlow());
      act(() => {
        result.current.handleBack();
      });
      expect(result.current.step).toBe(LoginStep.SERVER_URL);
    });
  });

  describe('field setters', () => {
    it('updates serverUrl, username, password, and rememberDevice', () => {
      const { result } = renderHook(() => useLoginFlow());
      act(() => {
        result.current.setServerUrl('https://rss.example.com');
        result.current.setUsername('alice');
        result.current.setPassword('secret');
        result.current.setRememberDevice(true);
      });
      expect(result.current.serverUrl).toBe('https://rss.example.com');
      expect(result.current.username).toBe('alice');
      expect(result.current.password).toBe('secret');
      expect(result.current.rememberDevice).toBe(true);
    });
  });

  describe('authError forwarding', () => {
    it('exposes the error from useAuth as authError', () => {
      mockAuthError = 'Session expired';
      const { result } = renderHook(() => useLoginFlow());
      expect(result.current.authError).toBe('Session expired');
    });
  });
});
