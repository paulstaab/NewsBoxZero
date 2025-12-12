import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';
import { SWRProvider } from '@/lib/swr/provider';
import { AuthProvider } from '@/hooks/useAuth';
import { SkipLink } from '@/components/ui/SkipLink';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ServiceWorkerRegistration } from '@/components/ui/ServiceWorkerRegistration';
import { InstallPrompt } from '@/components/ui/InstallPrompt';
import { SettingsMenu } from '@/components/ui/SettingsMenu';

export const metadata: Metadata = {
  title: 'Feedfront',
  description: 'Static headless RSS reader for Nextcloud News.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-[hsl(var(--color-surface))] text-[hsl(var(--color-text))] antialiased">
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <AuthProvider>
          <SWRProvider>
            <div className="flex min-h-screen flex-col">
              {/* Main content area */}
              <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
                {children}
              </main>
            </div>
            <OfflineBanner />
            <InstallPrompt delayMs={3000} showDuringActivity={false} />
            <SettingsMenu position="top-right" />
          </SWRProvider>
        </AuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
