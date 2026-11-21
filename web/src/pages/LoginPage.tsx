import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { TwilightSky } from '../components/background/TwilightSky';
import { useAuth } from '../context/useAuth';
import { ApiError } from '../lib/api';
import { cn } from '../lib/cn';

interface LoginErrorState {
  tone: 'error' | 'warning';
  message: string;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorState, setErrorState] = useState<LoginErrorState | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setErrorState(null);
    setIsSubmitting(true);

    try {
      await login(username.trim(), password);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setErrorState({
            tone: 'error',
            message: 'Credenciais inválidas.',
          });
        } else if (error.status === 429) {
          setErrorState({
            tone: 'warning',
            message:
              'Muitas tentativas. Aguarde 1 minuto antes de tentar novamente.',
          });
        } else {
          setErrorState({
            tone: 'error',
            message: error.message || 'Erro ao autenticar. Tente novamente.',
          });
        }
      } else {
        setErrorState({
          tone: 'error',
          message: 'Não foi possível conectar à API do A.E.T.H.E.R.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center px-4 py-10">
      <TwilightSky />

      <section
        aria-label="Autenticação A.E.T.H.E.R."
        className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--border-arcane)] bg-[var(--surface-glass)] p-8 shadow-2xl shadow-black/60 backdrop-blur-md"
      >
        <header className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold tracking-[0.18em] text-[var(--text-primary)] drop-shadow-[0_0_14px_rgba(139,92,246,0.45)]">
            A.E.T.H.E.R.
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Automated Environment Telemetry & Health Event Radar
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-xs font-medium tracking-wide text-[var(--text-secondary)] uppercase"
            >
              Usuário
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              disabled={isSubmitting}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="noc@aether.com"
              className="w-full rounded-lg border border-[var(--border-arcane)] bg-[var(--surface-card)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-slate-500 transition-colors focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium tracking-wide text-[var(--text-secondary)] uppercase"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-[var(--border-arcane)] bg-[var(--surface-card)] py-2.5 pr-10 pl-3.5 text-sm text-[var(--text-primary)] placeholder:text-slate-500 transition-colors focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                disabled={isSubmitting}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus:outline-none focus-visible:text-violet-300"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {errorState && (
            <div
              role="alert"
              className={cn(
                'flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed',
                errorState.tone === 'warning'
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                  : 'border-red-500/40 bg-red-500/15 text-red-200',
              )}
            >
              <ShieldAlert
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  errorState.tone === 'warning'
                    ? 'text-amber-400'
                    : 'text-red-400',
                )}
                aria-hidden="true"
              />
              <span>{errorState.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !username.trim() || !password}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/50 transition-all hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090B1A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Autenticando...</span>
              </>
            ) : (
              <span>Entrar no Arquipélago</span>
            )}
          </button>
        </form>
      </section>
    </main>
  );
};
