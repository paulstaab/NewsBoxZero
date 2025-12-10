'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getVersion } from '@/lib/api/version';
import { NetworkError, ApiError } from '@/lib/api/client';

/**
 * Multi-step login wizard
 *
 * Step 1: Server URL validation with HTTPS enforcement and connectivity check
 * Step 2: Credentials entry with remember-device toggle
 * Step 3: Authentication handshake progress
 *
 * Implements FR-001: Login wizard with validation
 * Phase 3b: Enhanced with /version endpoint connectivity check
 */

enum LoginStep {
  SERVER_URL = 1,
  VALIDATING_URL = 2,
  CREDENTIALS = 3,
  AUTHENTICATING = 4,
}

export default function LoginPage() {
  const router = useRouter();
  const { login, error } = useAuth();

  const [step, setStep] = useState<LoginStep>(LoginStep.SERVER_URL);
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Step 1: Validate server URL and check connectivity
  const handleServerUrlSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedUrl = serverUrl.trim();

    if (!trimmedUrl) {
      setValidationError('Server URL is required');
      return;
    }

    // Check HTTPS requirement
    if (!trimmedUrl.startsWith('https://')) {
      setValidationError('Server URL must use HTTPS');
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      setValidationError('Please enter a valid URL');
      return;
    }

    // Check server connectivity using /version endpoint
    setStep(LoginStep.VALIDATING_URL);

    try {
      await getVersion(trimmedUrl);

      // Server is reachable, advance to credentials step
      setStep(LoginStep.CREDENTIALS);
    } catch (err) {
      // Handle connectivity errors
      setStep(LoginStep.SERVER_URL);

      if (err instanceof NetworkError) {
        // Display the detailed NetworkError message (includes CORS-specific info)
        setValidationError(err.message);
      } else if (err instanceof ApiError) {
        if (err.status === 404) {
          setValidationError('Server not found or invalid API endpoint. Please verify the URL.');
        } else if (err.status >= 500) {
          setValidationError('Server error. Please try again later.');
        } else {
          setValidationError(`Server returned error: ${err.statusText}`);
        }
      } else {
        setValidationError('Unable to validate server. Please check your connection.');
      }
    }
  };

  // Step 2: Submit credentials
  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!username.trim()) {
      setValidationError('Username is required');
      return;
    }

    if (!password) {
      setValidationError('Password is required');
      return;
    }

    setStep(LoginStep.AUTHENTICATING);

    try {
      await login(serverUrl, username, password, rememberDevice);

      // Redirect to timeline on success
      router.push('/timeline');
    } catch (err) {
      // Stay on credentials step to allow retry
      setStep(LoginStep.CREDENTIALS);
      setValidationError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (step === LoginStep.CREDENTIALS) {
      setStep(LoginStep.SERVER_URL);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Feedfront</h1>
            <p className="text-gray-600">
              {step === LoginStep.SERVER_URL && 'Connect to your RSS server'}
              {step === LoginStep.VALIDATING_URL && 'Checking server connectivity...'}
              {step === LoginStep.CREDENTIALS && 'Enter your credentials'}
              {step === LoginStep.AUTHENTICATING && 'Verifying credentials...'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="mb-8 flex justify-center space-x-2">
            <div
              className={`h-2 w-12 rounded-full ${step >= LoginStep.SERVER_URL ? 'bg-blue-600' : 'bg-gray-300'}`}
            />
            <div
              className={`h-2 w-12 rounded-full ${step >= LoginStep.VALIDATING_URL ? 'bg-blue-600' : 'bg-gray-300'}`}
            />
            <div
              className={`h-2 w-12 rounded-full ${step >= LoginStep.CREDENTIALS ? 'bg-blue-600' : 'bg-gray-300'}`}
            />
            <div
              className={`h-2 w-12 rounded-full ${step >= LoginStep.AUTHENTICATING ? 'bg-blue-600' : 'bg-gray-300'}`}
            />
          </div>

          {/* Error display */}
          {(validationError ?? error) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{validationError ?? error}</p>
            </div>
          )}

          {/* Step 1: Server URL */}
          {step === LoginStep.SERVER_URL && (
            <form
              onSubmit={(e) => {
                void handleServerUrlSubmit(e);
              }}
              className="space-y-6"
            >
              <div>
                <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Server URL
                </label>
                <input
                  type="url"
                  id="serverUrl"
                  value={serverUrl}
                  onChange={(e) => {
                    setServerUrl(e.target.value);
                  }}
                  placeholder="https://rss.example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Must be an HTTPS URL to your headless-rss instance
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Continue
              </button>
            </form>
          )}

          {/* Step 2: Validating URL */}
          {step === LoginStep.VALIDATING_URL && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Checking connectivity to {serverUrl}...</p>
            </div>
          )}

          {/* Step 3: Credentials */}
          {step === LoginStep.CREDENTIALS && (
            <form
              onSubmit={(e) => {
                void handleCredentialsSubmit(e);
              }}
              className="space-y-6"
            >
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberDevice"
                  checked={rememberDevice}
                  onChange={(e) => {
                    setRememberDevice(e.target.checked);
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="rememberDevice" className="ml-2 block text-sm text-gray-700">
                  Remember this device
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Authenticating */}
          {step === LoginStep.AUTHENTICATING && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Authenticating with {serverUrl}...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Powered by{' '}
          <a
            href="https://github.com/Your-Org/headless-rss"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            headless-rss
          </a>
        </p>
      </div>
    </div>
  );
}
