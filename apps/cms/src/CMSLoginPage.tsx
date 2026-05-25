import { FormEvent, useState } from 'react';
import { AlertCircle, Lock, LogIn, Mail } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

export default function CMSLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, beginOAuthLogin, authError, authNotice, cmsEnabled, oauthProviders } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!cmsEnabled) {
      setError("Le CMS est désactivé dans cet environnement.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Veuillez saisir un email et un mot de passe.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        window.location.hash = result.destination ?? 'cms';
        return;
      }

      setError(result.error ?? authError ?? 'Connexion impossible.');
    } catch (_error) {
      setError(authError ?? 'Connexion impossible. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00b3e8]">SMOVE</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Connexion CMS</h1>
        <p className="mt-1 text-sm text-slate-500">Connectez-vous avec un compte admin ou editor.</p>

        {authNotice ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{authNotice}</p> : null}
        {error ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={16} className="mt-[1px] shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:border-[#00b3e8]">
              <Mail size={16} className="text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border-0 py-2.5 text-sm outline-none"
                placeholder="admin@smove.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 focus-within:border-[#00b3e8]">
              <Lock size={16} className="text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border-0 py-2.5 text-sm outline-none"
                placeholder="••••••••"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00b3e8] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0097c4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={16} />
            {loading ? 'Connexion...' : 'Se connecter'}
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
                Se connecter avec Google
              </button>
            ) : null}
            {oauthProviders.facebook ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => beginOAuthLogin('facebook')}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Se connecter avec Facebook
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
