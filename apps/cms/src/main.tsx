import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CMSApp from './CMSApp';
import './index.css';

const BOOT_ERROR_MESSAGE = "Le CMS n'a pas pu démarrer. Rechargez la page.";

function renderBootFailure(error: unknown) {
  console.error('[cms] boot failure', error);
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  rootElement.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#05070f;color:#e5e7eb;font-family:Inter,system-ui,sans-serif;">
      <section style="max-width:560px;text-align:center;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;background:rgba(9,12,20,0.9)">
        <h1 style="margin:0 0 12px;font-size:1.25rem">Erreur d'initialisation CMS</h1>
        <p style="margin:0 0 18px;line-height:1.5">${BOOT_ERROR_MESSAGE}</p>
        <a href="#login" style="display:inline-block;padding:10px 14px;border-radius:999px;background:#00b3e8;color:#00121a;text-decoration:none;font-weight:600">Retour à la connexion</a>
      </section>
    </main>
  `;
}

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Missing root element #root');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <CMSApp />
    </StrictMode>,
  );
} catch (error) {
  renderBootFailure(error);
}
