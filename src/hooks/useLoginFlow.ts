'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  getLoginServerError,
  validateLoginCredentials,
  validateLoginServerUrl,
  validateServerConnectivity,
} from '@/lib/auth/login';

export enum LoginStep {
  SERVER_URL = 1,
  VALIDATING_URL = 2,
  CREDENTIALS = 3,
  AUTHENTICATING = 4,
}

/**
 * Owns the login wizard/plain-form state machine.
 */
export function useLoginFlow() {
  const router = useRouter();
  const { login, error } = useAuth();
  const [step, setStep] = useState<LoginStep>(LoginStep.SERVER_URL);
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleServerUrlSubmit = useCallback(async () => {
    setValidationError(null);

    try {
      const { normalized } = validateLoginServerUrl(serverUrl);
      setStep(LoginStep.VALIDATING_URL);
      await validateServerConnectivity(normalized);
      setServerUrl(normalized);
      setStep(LoginStep.CREDENTIALS);
    } catch (error) {
      setStep(LoginStep.SERVER_URL);
      setValidationError(getLoginServerError(error));
    }
  }, [serverUrl]);

  const handleCredentialsSubmit = useCallback(async () => {
    setValidationError(null);

    try {
      validateLoginCredentials(username, password);
      setStep(LoginStep.AUTHENTICATING);
      await login(serverUrl, username, password, rememberDevice);
      router.push('/timeline');
    } catch (error) {
      setStep(LoginStep.CREDENTIALS);
      setValidationError(error instanceof Error ? error.message : 'Authentication failed');
    }
  }, [login, password, rememberDevice, router, serverUrl, username]);

  const handlePlainSubmit = useCallback(async () => {
    setValidationError(null);

    try {
      const { normalized } = validateLoginServerUrl(serverUrl);
      validateLoginCredentials(username, password);
      setStep(LoginStep.AUTHENTICATING);
      await validateServerConnectivity(normalized);
      await login(normalized, username, password, rememberDevice);
      router.push('/timeline');
    } catch (error) {
      setStep(LoginStep.SERVER_URL);
      setValidationError(getLoginServerError(error));
    }
  }, [login, password, rememberDevice, router, serverUrl, username]);

  const handleBack = useCallback(() => {
    setValidationError(null);
    if (step === LoginStep.CREDENTIALS) {
      setStep(LoginStep.SERVER_URL);
    }
  }, [step]);

  return {
    step,
    serverUrl,
    setServerUrl,
    username,
    setUsername,
    password,
    setPassword,
    rememberDevice,
    setRememberDevice,
    validationError,
    authError: error,
    handleServerUrlSubmit,
    handleCredentialsSubmit,
    handlePlainSubmit,
    handleBack,
  };
}
