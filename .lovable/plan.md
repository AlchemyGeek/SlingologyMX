

# Make SlingologyMX an Installable Web App (PWA)

## Summary

Make the app installable on mobile devices using a Progressive Web App approach. The app icon will use the existing `slingology-icon.png` logo. All data remains in the cloud — no offline data caching. The service worker handles cache-busting and auto-updates so users always get the latest version.

## Approach

Since you don't need offline data access (everything stays in the cloud), we'll use a **lightweight PWA** with:
- A web app manifest for installability (Add to Home Screen)
- A service worker for **auto-update** only (cache app shell assets, push new versions automatically)
- No offline data caching

## Changes

### 1. Install `vite-plugin-pwa`
Add the PWA plugin to handle manifest generation and service worker registration.

### 2. Generate PWA icons
Copy `slingology-icon.png` to `public/` in multiple sizes (192×192, 512×512) for the manifest. These will be the home screen icons.

### 3. Configure `vite.config.ts`
Add VitePWA plugin with:
- `registerType: "autoUpdate"` — automatically activates new service worker versions
- `devOptions: { enabled: false }` — disabled in dev/preview to avoid caching issues
- `navigateFallbackDenylist: [/^\/~oauth/]` — protects auth flows
- Manifest with app name, theme color, and icon references
- Workbox config to cache only app shell (JS/CSS/HTML), not API calls

### 4. Guard service worker in `src/main.tsx`
Prevent service worker registration when running inside Lovable's preview iframe or on preview domains, to avoid caching issues during development.

### 5. Update `index.html`
Add PWA meta tags:
- `<meta name="theme-color">` matching app brand color
- `<meta name="apple-mobile-web-app-capable">` for iOS
- `<link rel="apple-touch-icon">` for iOS home screen icon

### 6. Update notification
The `autoUpdate` registration type means when a new version is deployed, the service worker will automatically update in the background. On the next page load, users get the latest version. Optionally, we can add a small toast/banner prompting the user to reload when an update is ready.

## Key Behaviors

| Scenario | Behavior |
|----------|----------|
| Mobile user visits app | Browser shows "Add to Home Screen" prompt |
| App launched from home screen | Full-screen experience, no browser chrome |
| New version published | Service worker auto-updates; user sees latest on next load |
| Lovable preview/editor | Service worker disabled, no interference |
| Data/API calls | Always go to network (cloud), never cached |

## Files to Create/Modify

- `public/pwa-192x192.png` — App icon (from slingology-icon.png)
- `public/pwa-512x512.png` — App icon (from slingology-icon.png)
- `vite.config.ts` — Add VitePWA plugin configuration
- `src/main.tsx` — Add iframe/preview guard for SW registration
- `index.html` — Add PWA meta tags
- `package.json` — Add `vite-plugin-pwa` dependency

