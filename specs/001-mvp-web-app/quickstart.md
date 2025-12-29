# Quickstart: NewsBoxZero Development

**Feature**: 001-mvp-web-app  
**Date**: 2025-12-12  
**Last Updated**: Phase 6 completion

This guide helps developers get started with the NewsBoxZero static RSS reader project.

---

## Prerequisites

- **Node.js**: 20.x LTS or later
- **npm**: 10.x or later
- **Git**: For version control
- **Nextcloud News API**: Running instance for production use (optional for development - MSW mocks provided)

---

## Project Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/paulstaab/newsboxzero.git
cd newsboxzero

# Install dependencies
npm install
```

### 2. Project Structure

```
newsboxzero/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home/timeline page
│   │   ├── login/
│   │   │   └── page.tsx        # Login wizard
│   │   └── settings/
│   │       └── page.tsx        # User settings
│   ├── components/             # React components
│   │   ├── ui/                 # Base UI components
│   │   ├── timeline/           # Timeline components
│   │   ├── sidebar/            # Navigation sidebar
│   │   └── article/            # Article display
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts          # Authentication hook
│   │   ├── useItems.ts         # Items/articles hook
│   │   └── useFeeds.ts         # Feeds/folders hook
│   ├── lib/                    # Utilities and API client
│   │   ├── api/                # API client modules
│   │   │   ├── client.ts       # Base fetch wrapper
│   │   │   ├── feeds.ts        # Feeds API
│   │   │   ├── items.ts        # Items API
│   │   │   └── folders.ts      # Folders API
│   │   ├── storage.ts          # Session/local storage helpers
│   │   └── utils.ts            # General utilities
│   ├── types/                  # TypeScript interfaces
│   │   ├── index.ts            # Type exports
│   │   ├── api.ts              # API response types
│   │   └── session.ts          # Session types
│   └── styles/                 # Global styles
│       ├── globals.css         # Global CSS
│       └── tokens.css          # Design tokens
├── tests/
│   ├── unit/                   # Vitest unit tests
│   ├── e2e/                    # Playwright E2E tests
│   └── mocks/                  # MSW mock handlers
├── public/                     # Static assets
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind configuration
├── vitest.config.ts            # Vitest configuration
├── playwright.config.ts        # Playwright configuration
└── package.json
```

### 3. Environment Setup

No environment variables are required for development. The app uses client-side configuration where users enter their server URL during the login wizard.

For production deployment, you may optionally configure:

```bash
# Optional: Default server URL pre-filled in login
NEXT_PUBLIC_DEFAULT_SERVER_URL=https://your-nextcloud.example.com

# Optional: Feature flags (future use)
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
```

---

## Development Commands

### Start Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000`

### Build Static Export

```bash
npm run build
```

Outputs to `out/` directory. This is the deployable static site.

### Run Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

### Lint and Format

```bash
# Lint check
npm run lint

# Fix lint issues
npm run lint:fix

# Type check
npm run typecheck
```

---

## Key Configuration Files

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',           // Static export mode
  trailingSlash: true,        // Folder-style URLs
  images: {
    unoptimized: true         // Required for static export
  },
  // No server-side features allowed
};

module.exports = nextConfig;
```

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '320px',
        'sm': '768px',
        'md': '1024px',
        'lg': '1440px',
      },
    },
  },
  plugins: [],
};
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90
      }
    }
  }
});
```

---

## API Mocking with MSW

MSW (Mock Service Worker) is used for both development and testing. The mock handlers are located in `tests/mocks/handlers.ts`.

### Mock Setup

The project includes comprehensive mocks for all Nextcloud News API v1.3 endpoints:

- `GET /version` - Server version check (no auth required)
- `GET /feeds` - List all feeds
- `GET /items` - Get articles with filtering (type, batchSize, offset, getRead)
- `PUT /items/:id/read` - Mark article as read
- `PUT /items/:id/unread` - Mark article as unread
- `PUT /items/read/multiple` - Batch mark as read
- `GET /folders` - List all folders

### Valid Test Credentials

The MSW mocks expect these credentials:
- **Username**: `testuser`
- **Password**: `testpass`
- **Server URL**: `https://rss.example.com` (or `https://nextcloud.example.com`)

### Running with Mocks

E2E tests automatically use MSW mocks via Playwright's routing. For manual testing:

```bash
# E2E tests with mocks
npm run test:e2e

# Unit tests with mocks (MSW node integration)
npm run test
```

---

## Testing Patterns

### Unit Test Example

```typescript
// tests/unit/lib/api/version.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getVersion } from '@/lib/api/version';
import { NetworkError, ApiError } from '@/lib/api/client';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('getVersion', () => {
  it('should return version info on success', async () => {
    server.use(
      http.get('https://test.example.com/index.php/apps/news/api/v1-3/version', () => {
        return HttpResponse.json({ version: '1.3' });
      }),
    );

    const result = await getVersion('https://test.example.com');
    expect(result.version).toBe('1.3');
  });

  it('should throw NetworkError on connection failure', async () => {
    server.use(
      http.get('https://unreachable.invalid/index.php/apps/news/api/v1-3/version', () => {
        return HttpResponse.error();
      }),
    );

    await expect(getVersion('https://unreachable.invalid')).rejects.toThrow(NetworkError);
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/us1-login-timeline.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Wizard', () => {
  test('should validate server connectivity before showing credentials', async ({ page }) => {
    await page.goto('/login');

    // Enter valid HTTPS URL
    await page.getByLabel(/server url/i).fill('https://rss.example.com');
    await page.getByRole('button', { name: /continue|next/i }).click();

    // Should advance to credentials step after connectivity check
    await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should complete full login flow', async ({ page }) => {
    await page.goto('/login');

    // Step 1: Server URL
    await page.getByLabel(/server url/i).fill('https://rss.example.com');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2: Credentials
    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/password/i).fill('testpass');
    await page.getByRole('button', { name: /connect|sign in/i }).click();

    // Should redirect to timeline
    await expect(page).toHaveURL('/timeline');
    await expect(page.getByText(/your timeline|unread|articles/i)).toBeVisible();
  });
});
```

---

## Performance Verification

### Bundle Size Check

```bash
# After build, check bundle sizes
npm run build

# View bundle analysis (if @next/bundle-analyzer installed)
ANALYZE=true npm run build
```

Target: JS < 180KB gzip, CSS < 60KB gzip

---

## Deployment

### Static Host Deployment

The `out/` directory (generated by `npm run build`) can be deployed to any static host:

```bash
# Build static export
npm run build

# The 'out/' directory contains the complete static site
# Deploy it to your preferred static host
```

**Supported Platforms:**
- **Vercel**: Automatic deployment from Git (supports Next.js export)
- **Netlify**: Drag & drop `out/` folder or connect Git repository
- **GitHub Pages**: Upload `out/` contents to gh-pages branch
- **AWS S3 + CloudFront**: Upload `out/` to S3 bucket
- **Any static web server**: nginx, Apache, Caddy, etc.

### CORS Configuration Required

Since NewsBoxZero makes client-side API calls to your Nextcloud News server, you must configure CORS headers on your server:

```apache
# Apache .htaccess or httpd.conf
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header set Access-Control-Allow-Headers "Authorization, Content-Type"
```

```nginx
# nginx configuration
add_header 'Access-Control-Allow-Origin' '*';
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type';
```

### Docker (Optional)

```dockerfile
FROM nginx:alpine

# Copy static build
COPY out/ /usr/share/nginx/html/

# Add nginx configuration for SPA routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Troubleshooting

### CORS Issues

The most common issue is CORS errors when connecting to your Nextcloud News server. Error messages include:
- "Network error" or "Unable to validate server"
- "CORS policy: No 'Access-Control-Allow-Origin' header is present"

**Solutions:**
1. Configure CORS headers on your Nextcloud/Apache/nginx server (see Deployment section)
2. Use a CORS proxy for testing (not recommended for production)
3. Ensure your server URL uses HTTPS (HTTP connections will be rejected)

### Login Issues

**"Server URL must use HTTPS"**
- NewsBoxZero requires HTTPS for security. HTTP URLs are rejected.
- For local testing, use `https://localhost` with a self-signed certificate or use the test server URL `https://rss.example.com` with MSW mocks.

**"Server not found or invalid API endpoint"**
- The `/version` endpoint returned 404. Verify your Nextcloud News app is installed and accessible.
- Check that the URL format is correct: `https://your-server.com` (without trailing path)

**"Invalid credentials"**
- Verify your username and password are correct in Nextcloud
- Check that your Nextcloud user has access to the News app

### Static Export Limitations

These features are **not available** in static export mode:
- `getServerSideProps`
- API routes (`/api/*`)
- Middleware
- ISR (Incremental Static Regeneration)

All data fetching happens client-side after user authentication.

### Build Errors

```bash
# Clear all caches and rebuild
rm -rf .next out node_modules/.cache
npm run build

# If that doesn't work, clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### PWA Installation Issues

**Install prompt doesn't appear:**
- Ensure you're using HTTPS (required for service workers)
- Check that manifest.json and service worker are loading correctly
- PWA install prompt appears only once every 7 days if dismissed

**Service worker not registering:**
- Check browser console for errors
- Ensure `public/sw.js` exists and is accessible
- Clear browser cache and reload

---

## Key Features Implemented

### Phase 1-2: Foundation
- ✅ Next.js 14 static export configuration
- ✅ TypeScript types for all entities (Session, Feed, Folder, Article)
- ✅ API client with Basic auth, exponential backoff, error handling
- ✅ SWR integration for client-side data fetching
- ✅ Service worker for offline capability
- ✅ PWA manifest for installable app

### Phase 3: User Story 1 - Timeline
- ✅ Multi-step login wizard with URL validation
- ✅ Server connectivity check using `/version` endpoint (Phase 4)
- ✅ Credentials validation via `/feeds` endpoint
- ✅ Aggregated timeline with unread/all toggle
- ✅ Infinite scroll with prefetching
- ✅ Article cards with lazy-loaded content
- ✅ Unread count aggregation (computed client-side)

### Phase 5: PWA Install
- ✅ Install prompt detection and UI
- ✅ 7-day dismissal cooldown
- ✅ Manual install trigger in settings

### Phase 6: Polish
- ✅ Accessibility testing with axe-core (11/12 tests passing, WCAG 2.1 AA)
- ✅ Comprehensive E2E and unit test coverage
- ✅ Documentation updates

## Resources

- [Next.js Static Export Docs](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Nextcloud News API v1.3](https://github.com/nextcloud/news/blob/master/docs/externalapi/Legacy.md)
- [SWR Documentation](https://swr.vercel.app/)
- [Playwright Testing](https://playwright.dev/)
- [Vitest Unit Testing](https://vitest.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [MSW (Mock Service Worker)](https://mswjs.io/)
- [Project Repository](https://github.com/paulstaab/newsboxzero)
