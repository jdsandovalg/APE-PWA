'use client';

/**
 * @file /src/login/page.tsx
 * @fileoverview Página de login.
 * @description Esta es la página de entrada a la aplicación. Permite a los usuarios autenticarse
 * usando su número de casa y clave.
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/services/supabase';
import ThemeToggle from '../components/ThemeToggle';

interface LoginProps {
  onSuccess?: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [clave, setClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<{version?:string, commit?:string}>({});
  const [localeInfo, setLocaleInfo] = useState('');

  useEffect(() => {
    fetch('/build-meta.json').then(r => r.json()).then(j => setMeta(j)).catch(() => {});
    try {
      const loc = Intl.DateTimeFormat().resolvedOptions().locale;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setLocaleInfo(`${loc} · ${tz}`);
    } catch (e) {}
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Llamar a la función 'login_user' para autenticar contra la tabla 'usuarios'.
      const { data, error: rpcError } = await supabase.rpc('login_user', {
        p_identifier: identifier,
        p_clave: clave,
      });

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        throw new Error('Credenciales incorrectas');
      }

      const userData = data[0];
      // Guardamos los datos del usuario en localStorage
      localStorage.setItem('usuario', JSON.stringify(userData));

      toast.success('¡Bienvenido!');

      // Redirigir a la página principal
      onSuccess?.();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ background: 'linear-gradient(135deg, var(--bg-1) 0%, var(--bg-2) 50%, var(--bg-1) 100%)', color: 'var(--text)' }}>
      <div className="glass-card mx-auto p-0.5 sm:p-2 flex flex-col items-center justify-center" style={{ width: '26rem' }}>
        <div className="flex items-center justify-center w-full mb-4">
          <div className="relative" style={{ width: '120px', height: '120px' }}>
            <img src="/logo.png" alt="Logo Condominio" className="w-full h-full object-contain" />
          </div>
        </div>
        <h1 className="text-xl font-bold mb-2 text-center text-white">Autoconsumo de Energía</h1>
        <p className="mb-8 text-center text-sm text-gray-300">Inicia sesión para acceder a tu panel de autoconsumo.</p>

        <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="No. de Casa o Correo"
            required
            className="w-full p-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white placeholder-gray-300 text-sm"
          />
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Clave de acceso"
            required
            className="w-full p-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/10 text-white placeholder-gray-300 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold py-3 text-base disabled:bg-gray-400"
            style={{ background: 'var(--accent-1)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <div className="mt-3">
          <ThemeToggle />
        </div>
        <div className="mt-2 text-xs text-gray-300 opacity-50 text-center" style={{ fontSize: '10px' }}>
          {meta.version ? `Versión ${meta.version}` : ''}{meta.commit ? ` — ${meta.commit}` : ''}
          {localeInfo && <div>{localeInfo}</div>}
        </div>
      </div>
    </div>
  );
}
