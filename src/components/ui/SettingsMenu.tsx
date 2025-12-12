'use client';

/**
 * Settings Menu Component.
 * Provides access to app settings including manual PWA install.
 */

import { useState, useRef, useEffect } from 'react';
import { triggerInstallPrompt, canPromptInstall } from '@/lib/pwa/installPrompt';

export interface SettingsMenuProps {
  /**
   * Position of the menu button.
   * Default: 'top-right'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /**
   * Additional CSS classes for the button.
   */
  className?: string;
}

export function SettingsMenu({ position = 'top-right', className = '' }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstallOption, setShowInstallOption] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if install is available
  useEffect(() => {
    setShowInstallOption(canPromptInstall());
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleInstall = async () => {
    setIsInstalling(true);
    await triggerInstallPrompt();
    setIsInstalling(false);
    setIsOpen(false);

    // Check again if install is still available
    setShowInstallOption(canPromptInstall());
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div ref={menuRef} className={`fixed ${positionClasses[position]} z-40 ${className}`}>
      {/* Settings Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--color-surface-elevated))] text-[hsl(var(--color-text))] shadow-lg ring-1 ring-[hsl(var(--color-border))] hover:bg-[hsl(var(--color-surface-hover))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))] focus:ring-offset-2"
        aria-label="Settings menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Settings Menu Dropdown */}
      {isOpen && (
        <div
          className="absolute top-12 right-0 w-56 overflow-hidden rounded-lg bg-[hsl(var(--color-surface-elevated))] shadow-xl ring-1 ring-[hsl(var(--color-border))]"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="settings-menu"
        >
          <div className="py-1">
            {/* Install App Option */}
            <button
              type="button"
              onClick={() => {
                void handleInstall();
              }}
              disabled={!showInstallOption || isInstalling}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[hsl(var(--color-text))] hover:bg-[hsl(var(--color-surface-hover))] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[hsl(var(--color-primary))] disabled:opacity-50 disabled:cursor-not-allowed"
              role="menuitem"
              aria-label={showInstallOption ? 'Install App' : 'Install not available'}
              title={
                showInstallOption
                  ? 'Install Feedfront as an app'
                  : 'App is already installed or install is not available'
              }
            >
              <svg
                className="h-5 w-5 text-[hsl(var(--color-text-secondary))]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span>
                {isInstalling ? 'Installing...' : showInstallOption ? 'Install App' : 'Install App'}
              </span>
            </button>

            {/* About Option (placeholder for future) */}
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[hsl(var(--color-text))] hover:bg-[hsl(var(--color-surface-hover))] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[hsl(var(--color-primary))]"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
              }}
            >
              <svg
                className="h-5 w-5 text-[hsl(var(--color-text-secondary))]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>About Feedfront</span>
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-[hsl(var(--color-border))]" />

            {/* Version Info */}
            <div className="px-4 py-2 text-xs text-[hsl(var(--color-text-tertiary))]">
              Version 1.0.0
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsMenu;
