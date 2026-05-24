import { FormEvent, useState } from 'react';
import { AlertCircle, Lock, Mail, UserRound } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

export default function CMSRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, beginOAuthLogin, authError, authNotice, registrationEnabled, oauthProviders } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!registrationEnabled) {
      setError("L'inscription est désactivée.");
      return;
    }

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Veuillez compléter tous les champs.');
      return;
    }

    setLoading(true);
    const result = await register(email.trim(), password, name.trim());
    setLoading(false);

    if (result.success) {
      window.location.hash = result.destination ?? 'login';
      return;
    }

    setError(result.error ?? authError ?? "Impossible de créer le compte.");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00b3e8]">SMOVE</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Créer un compte CMS</h1>

        {authNotice ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{authNotice}</p> : null}
        {error ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={16} className="mt-[1px] shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Nom</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:border-[#00b3e8]">
              <UserRound size={16} className="text-slate-400" />
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full border-0 py-2.5 text-sm outline-none" />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:border-[#00b3e8]">
              <Mail size={16} className="text-slate-400" />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border-0 py-2.5 text-sm outline-none" />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:border-[#00b3e8]">
              <Lock size={16} className="text-slate-400" />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full border-0 py-2.5 text-sm outline-none" />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#00b3e8] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0097c4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Création...' : 'Créer le compte'}
          </button>
        </form>

        {(oauthProviders.google || oauthProviders.facebook) ? (
          <div className="mt-4 space-y-2">
            {oauthProviders.google ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => beginOAuthLogin('google')}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuer avec Google
              </button>
            ) : null}
            {oauthProviders.facebook ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => beginOAuthLogin('facebook')}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuer avec Facebook
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
