# SMOVE CMS App (`apps/cms`)

Standalone CMS/admin frontend (Vite + React) served at `/cms` in production.

## Local run

Use the root scripts (single package.json):

```bash
npm run dev:cms
```

Default URL: `http://127.0.0.1:5174/#cms`

## Build

```bash
npm run build:cms
```

Output directory: `build/cms` (shared root output).

## Environment variables

Use the root env file only:

```bash
cp .env.example .env
```

Main vars:

- `VITE_API_BASE_URL`: API base route consumed by CMS.
- `VITE_API_ORIGIN`: API origin used by CMS Vite proxy.
- `VITE_PUBLIC_SITE_URL`: public site URL for all "Retour au site" links.
- `VITE_PUBLIC_APP_URL`: legacy fallback retained for backward compatibility.
- `VITE_CMS_PORT`: local CMS dev port.
