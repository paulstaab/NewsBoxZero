# Quickstart: Feedfront Development

**Feature**: 001-static-rss-app  
**Date**: 2025-12-10

This guide helps developers get started with the Feedfront static RSS reader project.

---

## Prerequisites

- **Node.js**: 20.x LTS or later
- **npm**: 10.x or later
- **Git**: For version control
- **headless-rss**: Running instance for integration testing (optional)

---

## Project Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url> feedfront
cd feedfront

# Switch to feature branch
git checkout 001-static-rss-app

# Install dependencies
npm install
```

### 2. Project Structure

```
feedfront/
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

Create `.env.local` for development:

```bash
# Optional: Default API URL for development
NEXT_PUBLIC_DEFAULT_API_URL=http://localhost:8080

# Optional: Enable debug mode
NEXT_PUBLIC_DEBUG=true
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

### Mock Setup (tests/mocks/handlers.ts)

```typescript
import { http, HttpResponse } from 'msw';

const BASE = '/index.php/apps/news/api/v1-3';

export const handlers = [
  // Version check (auth validation)
  http.get(`${BASE}/version`, () => {
    return HttpResponse.json({ version: '1.3' });
  }),
  
  // Get feeds
  http.get(`${BASE}/feeds`, () => {
    return HttpResponse.json({
      feeds: [
        { id: 1, title: 'Example Feed', url: 'https://example.com/feed', folderId: null }
      ]
    });
  }),
  
  // Get items
  http.get(`${BASE}/items`, ({ request }) => {
    const url = new URL(request.url);
    const getRead = url.searchParams.get('getRead') === 'true';
    
    return HttpResponse.json({
      items: [
        {
          id: 100,
          title: 'Test Article',
          body: '<p>Test content</p>',
          feedId: 1,
          unread: true,
          starred: false,
          pubDate: Math.floor(Date.now() / 1000),
          lastModified: Math.floor(Date.now() / 1000),
          url: 'https://example.com/article',
          guid: 'test-guid',
          guidHash: 'test-hash'
        }
      ]
    });
  }),
  
  // Mark item read
  http.post(`${BASE}/items/:itemId/read`, () => {
    return HttpResponse.json({});
  })
];
```

### Browser Integration (tests/mocks/browser.ts)

```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

---

## Testing Patterns

### Unit Test Example

```typescript
// tests/unit/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('stores credentials on login', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login('https://test.com', 'user', 'pass');
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem('feedfront:session')).toBeTruthy();
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Wizard', () => {
  test('completes login flow', async ({ page }) => {
    await page.goto('/login');
    
    // Step 1: Enter URL
    await page.fill('[data-testid="server-url"]', 'https://test.example.com');
    await page.click('[data-testid="next-button"]');
    
    // Step 2: Enter credentials
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'testpass');
    await page.click('[data-testid="connect-button"]');
    
    // Should redirect to timeline
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
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

The `out/` directory can be deployed to any static host:

```bash
# Build static export
npm run build

# Deploy to Vercel
vercel deploy out/

# Deploy to Netlify
netlify deploy --prod --dir=out

# Deploy to GitHub Pages (via gh-pages)
npm run deploy
```

### Docker (Optional)

```dockerfile
FROM nginx:alpine
COPY out/ /usr/share/nginx/html/
EXPOSE 80
```

---

## Troubleshooting

### CORS Issues

If API requests fail with CORS errors:

1. Ensure headless-rss has CORS headers configured
2. Check that `Access-Control-Allow-Origin` includes your domain
3. For local dev, use a proxy or configure `rewrites` in next.config.js

### Static Export Limitations

These features are **not available** in static export mode:
- `getServerSideProps`
- API routes (`/api/*`)
- Middleware
- `revalidate` in `getStaticProps`

All data fetching must happen client-side.

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next out node_modules/.cache
npm run build
```

---

## Resources

- [Next.js Static Export Docs](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Nextcloud News API Docs](https://github.com/nextcloud/news/blob/master/docs/api/api-v1-3.md)
- [SWR Documentation](https://swr.vercel.app/)
- [Playwright Testing](https://playwright.dev/)
- [TailwindCSS](https://tailwindcss.com/)
