import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getPublicSiteUrl } from '../../utils/publicSiteUrl';

interface CMSAppShellProps {
  children: ReactNode;
}

export default function CMSAppShell({ children }: CMSAppShellProps) {
  return (
    <div data-app-boundary="cms-admin" className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00b3e8]">SMOVE</p>
            <h1 className="text-lg font-semibold text-[#273a41]">CMS Admin</h1>
            <p className="text-xs text-slate-500">Espace d'administration</p>
          </div>
          <a
            href={getPublicSiteUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Retour au site public
          </a>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
