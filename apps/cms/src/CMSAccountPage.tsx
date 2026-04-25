import { ShieldCheck, UserCircle2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { getPublicSiteUrl } from './utils/publicSiteUrl';

export default function CMSAccountPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f5f9fa] flex items-center justify-center px-6">
      <div className="max-w-xl w-full bg-white rounded-[20px] shadow-sm border border-[#eef3f5] p-8">
        <div className="flex items-center gap-3 mb-4">
          <UserCircle2 className="text-[#00b3e8]" />
          <h1 className="font-['Medula_One:Regular',sans-serif] text-[32px] tracking-[2px] uppercase text-[#273a41]">Mon compte CMS</h1>
        </div>
        <p className="text-[#38484e] mb-4">Connecté en tant que <strong>{user?.name}</strong> ({user?.email}).</p>
        <p className="text-[#38484e] mb-6">Rôle actuel: <strong className="capitalize">{user?.role}</strong>.</p>
        <a href="#cms" className="inline-flex items-center gap-2 bg-[#9333ea] text-white px-5 py-3 rounded-[12px] mr-3">
          <ShieldCheck size={16} /> Ouvrir le dashboard
        </a>
        <a href={getPublicSiteUrl()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#d7e1e5] px-5 py-3 rounded-[12px]">
          Retour au site public
        </a>
      </div>
    </div>
  );
}
