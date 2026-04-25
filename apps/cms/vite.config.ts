import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

function parsePort(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}


const BASE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function createCsp(hosts: { cmsHost: string; cmsWsHost: string; apiOrigin: string; apiWsOrigin: string }) {

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${hosts.cmsHost}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${hosts.cmsHost} ${hosts.cmsWsHost} ${hosts.apiOrigin} ${hosts.apiWsOrigin}`,
  ].join('; ');
}

function normalizeApiOrigin(rawValue: string | undefined, fallbackPort: number): string {
  const trimmed = rawValue?.trim();
  const candidate = trimmed && trimmed.length > 0 ? trimmed : `http://127.0.0.1:${fallbackPort}`;

  try {
    const parsed = new URL(candidate);
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return `http://127.0.0.1:${fallbackPort}`;
  }
}

export default defineConfig(({ mode }) => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const env = loadEnv(mode, workspaceRoot, '');

  const cmsPort = parsePort(env.VITE_CMS_PORT, 5174);
  const apiPort = parsePort(env.API_PORT, 3001);
  const apiOrigin = normalizeApiOrigin(env.VITE_API_ORIGIN ?? env.API_ORIGIN, apiPort);
  const cmsHost = `http://localhost:${cmsPort}`;
  const cmsWsHost = `ws://localhost:${cmsPort}`;
  const apiWsOrigin = apiOrigin.replace(/^http/, 'ws');

  const SECURITY_HEADERS = {
    ...BASE_SECURITY_HEADERS,
    'Content-Security-Policy': createCsp({ cmsHost, cmsWsHost, apiOrigin, apiWsOrigin }),
  };

  return {
    root: __dirname,
    envDir: workspaceRoot,
    cacheDir: path.resolve(workspaceRoot, 'node_modules/.vite-cms'),
    base: '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    build: {
      outDir: '../../build',
      emptyOutDir: true,
    },
    server: {
      host: 'localhost',
      port: cmsPort,
      strictPort: true,
      headers: SECURITY_HEADERS,
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: apiOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: 'localhost',
      port: cmsPort,
      strictPort: true,
      headers: SECURITY_HEADERS,
    },
  };
});
