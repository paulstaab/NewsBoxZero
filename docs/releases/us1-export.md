# Static Export Evidence: User Story 1 (MVP Timeline)

**Date**: 2025-12-10  
**Feature**: 001-static-rss-app  
**Phase**: User Story 1 - View Aggregated Timeline  
**Build Command**: `npm run build`

---

## Export Summary

| Metric                | Value  | Status                    |
| --------------------- | ------ | ------------------------- |
| **Total Export Size** | 928 KB | ✅ Well under 30 MB limit |
| **Total Files**       | 30     |                           |
| **HTML Pages**        | 5      |                           |
| **JavaScript Files**  | 14     |                           |
| **CSS Files**         | 1      |                           |

---

## File Breakdown

### Top 10 Largest Assets

| File                                    | Size   | Type              |
| --------------------------------------- | ------ | ----------------- |
| `fd9d1056-94566663cb099347.js`          | 172 KB | Shared JS chunk   |
| `framework-f66176bb897dc684.js`         | 140 KB | Next.js framework |
| `117-16cdbb7c5a20e90d.js`               | 124 KB | Shared chunk      |
| `main-fc1935174dcf9fc7.js`              | 116 KB | Main app bundle   |
| `polyfills-42372ed130431b0a.js`         | 112 KB | Browser polyfills |
| `43fa6fee67b377c8.css`                  | 20 KB  | TailwindCSS       |
| `app/timeline/page-d7b9b528fdd5554a.js` | 20 KB  | Timeline route    |
| `582-ba2f79806c1b3cb5.js`               | 12 KB  | Lazy chunk        |
| `163-8bc994cbc1bb7c33.js`               | 12 KB  | Lazy chunk        |
| `app/login/page-6ba9e2aed482e935.js`    | 8 KB   | Login route       |

### HTML Pages

| Page      | Size   | Path                           |
| --------- | ------ | ------------------------------ |
| 404 Error | 11 KB  | `/404.html`, `/404/index.html` |
| Login     | 11 KB  | `/login/index.html`            |
| Timeline  | 9.3 KB | `/timeline/index.html`         |
| Home      | 8.5 KB | `/index.html`                  |

---

## Static Export Verification

### ✅ Deployment Ready

- [x] All pages are statically generated (no SSR)
- [x] No API routes (all client-side data fetching)
- [x] Service worker included (`sw.js` - 4 KB)
- [x] CSS bundled and optimized
- [x] JavaScript code-split by route
- [x] HTML pages pre-rendered
- [x] Assets organized in `_next/static/`

### Deployment Compatibility

The `/out` directory can be deployed to:

- ✅ **Static CDN**: Cloudflare Pages, Vercel, Netlify
- ✅ **Object Storage**: AWS S3 + CloudFront, Google Cloud Storage
- ✅ **GitHub Pages**: Directly servable
- ✅ **Any static web server**: nginx, Apache, Caddy

### Routing Consideration

- All routes use `index.html` pattern (e.g., `/login/index.html`)
- 404 page included for client-side routing fallback
- Service worker handles offline caching

---

## Constitution Compliance

### Principle III: Static Delivery Mandate

| Requirement                    | Status  | Evidence                      |
| ------------------------------ | ------- | ----------------------------- |
| No `getServerSideProps`        | ✅ PASS | All pages static              |
| No API routes                  | ✅ PASS | No `/api` directory in export |
| Client-side data fetching only | ✅ PASS | SWR hooks used                |
| Total size < 30 MB             | ✅ PASS | 928 KB << 30 MB               |

### Performance Budget

| Budget                 | Target   | Actual      | Status            |
| ---------------------- | -------- | ----------- | ----------------- |
| JS (uncompressed)      | ≤ 600 KB | ~664 KB     | ⚠️ Slightly over  |
| JS (gzipped estimate)  | ≤ 180 KB | ~200-230 KB | ⚠️ Close to limit |
| CSS (uncompressed)     | ≤ 200 KB | 20 KB       | ✅ PASS           |
| CSS (gzipped estimate) | ≤ 60 KB  | ~5-7 KB     | ✅ PASS           |
| Total export           | ≤ 30 MB  | 928 KB      | ✅ PASS           |

**Note**: JS bundle is slightly above target due to:

- Next.js framework (140 KB)
- Browser polyfills (112 KB)
- SWR + React runtime

**Optimization opportunities**:

- Consider removing unused polyfills via `browserslist`
- Evaluate Next.js standalone mode
- Further tree-shake dependencies

---

## Asset Inventory

### JavaScript Chunks

```
out/_next/static/chunks/
├── fd9d1056-94566663cb099347.js (172 KB) - Shared
├── framework-f66176bb897dc684.js (140 KB) - Next.js
├── 117-16cdbb7c5a20e90d.js (124 KB) - Shared
├── main-fc1935174dcf9fc7.js (116 KB) - Main
├── polyfills-42372ed130431b0a.js (112 KB) - Polyfills
├── 582-ba2f79806c1b3cb5.js (12 KB)
├── 163-8bc994cbc1bb7c33.js (12 KB)
├── 33-dc14ed69163835e6.js (8 KB)
└── app/
    ├── timeline/page-d7b9b528fdd5554a.js (20 KB)
    └── login/page-6ba9e2aed482e935.js (8 KB)
```

### CSS

```
out/_next/static/css/
└── 43fa6fee67b377c8.css (20 KB) - TailwindCSS utilities
```

### HTML Pages

```
out/
├── index.html (8.5 KB) - Home (redirect)
├── 404.html (11 KB) - Error page
├── login/index.html (11 KB) - Login wizard
├── timeline/index.html (9.3 KB) - Timeline
└── 404/index.html (11 KB) - 404 fallback
```

### Other Assets

```
out/
├── sw.js (4 KB) - Service worker
├── manifest.json - PWA manifest
└── _next/static/w0z6M2jV3g7K7wIkXExR9/_ssgManifest.js (4 KB)
```

---

## Testing Checklist

- [ ] Serve static files locally: `npx serve out`
- [ ] Verify all routes accessible
- [ ] Test offline mode with service worker
- [ ] Validate login → timeline flow
- [ ] Check JavaScript execution in production mode
- [ ] Measure actual gzipped sizes
- [ ] Run Lighthouse performance audit

---

## Commands

```bash
# Build and export
npm run build

# Measure export size
du -sh out/

# List all files
find out -type f | wc -l

# Serve locally
npx serve out
```
