# Research: Static Headless RSS Web App

**Feature**: 001-static-rss-app  
**Date**: 2025-12-10  
**Purpose**: Resolve all "NEEDS CLARIFICATION" items and document key technical decisions before Phase 1 design.

---

## 1. Next.js Static Export Compatibility

**Question**: Can Next.js App Router produce a fully static export without runtime Node.js?

**Decision**: Yes — Next.js 14 supports `output: 'export'` in `next.config.js`. Pages using only client components or static generation work out of the box.

**Rationale**: The Feedfront spec mandates no server runtime. Using `output: 'export'` produces an `/out` directory of HTML/CSS/JS that can be deployed to any static CDN (Vercel, Cloudflare Pages, GitHub Pages, S3+CloudFront).

**Alternatives Considered**:
- Vite + React: lighter, but loses Next.js routing conventions, image optimization, and `next/link` prefetching.
- Astro: excellent for static, but JSX islands require explicit opt-in; less familiar to React developers.

**Constraints**:
- No `getServerSideProps`, `getInitialProps`, or API routes.
- Dynamic routes must use `generateStaticParams` or be client-side only.

---

## 2. Client-Side Data Fetching Strategy

**Question**: How should we fetch and cache data from headless-rss without SSR?

**Decision**: Use SWR (stale-while-revalidate) for all API calls. Credentials are read from session/local storage on mount; SWR handles caching, deduplication, and background revalidation.

**Rationale**: SWR is lightweight (~4KB gzip), integrates with React Suspense, and offers built-in retry/error handling. It keeps bundle size within Constitution Principle V budgets.

**Alternatives Considered**:
- TanStack Query (React Query): more features but larger bundle (~12KB); overkill for simple REST calls.
- Native fetch + useEffect: no caching/revalidation; leads to duplicated requests.

**Configuration**:
- `dedupingInterval`: 5000ms (avoid duplicate fetches within 5s)
- `revalidateOnFocus`: true (refresh when user returns to tab)
- `errorRetryCount`: 3 with exponential backoff

---

## 3. Authentication & Credential Storage

**Question**: How should HTTP Basic credentials be stored in the browser?

**Decision**: Default to `sessionStorage` (cleared on tab close). Offer a "Remember this device" checkbox that stores credentials in `localStorage`. Credentials are base64-encoded for the header but not encrypted (browser storage is not a secure vault).

**Rationale**: Spec clarification states session storage by default with optional local storage. True encryption (e.g., Web Crypto API) adds complexity and key management burden without meaningful security gain against XSS.

**Mitigations**:
- Enforce HTTPS-only hosts (FR-002).
- Clear credentials on logout.

---

## 4. API Client Design

**Question**: Should we generate a TypeScript client from the OpenAPI spec or write a thin wrapper?

**Decision**: Write a thin, hand-crafted wrapper in `src/lib/api/`. The OpenAPI spec is small (≈50 endpoints under v1.3), and generated clients add bundle bloat.

**Rationale**: Generated clients (e.g., openapi-typescript-fetch) pull in runtime dependencies and produce verbose code. A manual wrapper with strong TypeScript interfaces gives full control over request/response shaping.

**Implementation**:
- `src/lib/api/client.ts`: base fetch wrapper adding `Authorization` header.
- `src/lib/api/feeds.ts`, `items.ts`, `folders.ts`: domain functions.
- `src/types/api.ts`: interfaces mirroring OpenAPI schemas.

---

## 5. State Management

**Question**: Do we need a global state library (Redux, Zustand) or is local state + SWR sufficient?

**Decision**: SWR cache + React Context for auth/session state. No global store.

**Rationale**: SWR already provides a global cache keyed by request. Authentication state (base URL, credentials, preferences) is a single context. Avoiding Redux/Zustand reduces bundle size and cognitive overhead.

**Context Shape**:
```ts
interface AuthContext {
  baseUrl: string | null;
  credentials: string | null; // base64
  isAuthenticated: boolean;
  login: (url: string, user: string, pass: string) => Promise<void>;
  logout: () => void;
}
```

---

## 6. Responsive Layout Strategy

**Question**: What CSS approach satisfies the responsive breakpoints (320/768/1024/1440px)?

**Decision**: TailwindCSS with custom breakpoints matching spec. Utility classes keep styles co-located and tree-shakeable.

**Rationale**: Tailwind produces minimal CSS when purged; aligns with Constitution Principle V (CSS ≤60KB gzip). Alternatively, CSS Modules work but require more boilerplate.

**Breakpoints**:
- `xs`: 320px (single column)
- `sm`: 768px (collapsible sidebar)
- `md`: 1024px (two-column)
- `lg`: 1440px (three-panel)

---

## 7. Testing Toolchain

**Question**: Which test runners satisfy Constitution Principle III (Test Evidence First)?

**Decision**:
- **Unit**: Vitest (fast, ESM-native, Jest-compatible API)
- **Integration/E2E**: Playwright (cross-browser, visual regression, axe-core integration)
- **Visual Regression**: Playwright screenshots or Percy CI

**Rationale**: Vitest runs in the same toolchain as Vite/Next.js ESM. Playwright supports Chromium/Firefox/WebKit and has built-in accessibility testing via `@axe-core/playwright`.

**Coverage Gate**: `vitest --coverage` with 90% threshold on new lines.

---

## 8. Removed

---

## 9. Offline Capability

**Question**: Should the app work offline (PWA service worker)?

**Decision**: Ship a minimal service worker that caches the static shell (HTML, CSS, JS) but not API data. Show an offline indicator when navigator.onLine is false.

**Rationale**: Spec edge case requires "static shell usable" offline. Caching API data would require complex invalidation; out of scope for MVP.

**Implementation**: `next-pwa` or manual service worker in `public/sw.js`.

---

## 10. CORS Assumptions

**Question**: Will headless-rss allow cross-origin requests from the static frontend?

**Decision**: Assume yes per spec assumption. Document that headless-rss must return `Access-Control-Allow-Origin: *` or the frontend's origin, plus `Access-Control-Allow-Headers: Authorization`.

**Fallback**: If CORS is blocked, users must deploy Feedfront on the same origin or configure a reverse proxy. This is a deployment concern, not an app concern.

---

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| Framework | Next.js 14 with `output: 'export'` |
| Data Fetching | SWR |
| Auth Storage | sessionStorage (default) / localStorage (opt-in) |
| API Client | Hand-crafted TypeScript wrapper |
| State Management | SWR cache + React Context |
| CSS | TailwindCSS |
| Unit Tests | Vitest |
| E2E Tests | Playwright |
| Visual Regression | Playwright screenshots / Percy |
| Accessibility | axe-core via Playwright |
| Offline | Service worker for static shell only |
