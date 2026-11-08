
import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage(text);
    setMessageType(type);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        showMessage(error.message, 'error');
      }

      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (mounted) {
        showMessage('Impossible de contacter Supabase.', 'error');
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (mounted) setSession(newSession);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setMessage('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username.trim();

      if (!cleanEmail || !password) {
        throw new Error('Remplis ton adresse e-mail et ton mot de passe.');
      }

      if (password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
      }

      if (mode === 'register') {
        if (cleanUsername.length < 3 || cleanUsername.length > 24) {
          throw new Error('Le pseudo doit contenir entre 3 et 24 caractères.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username: cleanUsername,
              display_name: cleanUsername
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          setSession(data.session);
          showMessage('Ton compte NEXIUM est créé !', 'success');
        } else if (data.user) {
          showMessage(
            'Inscription enregistrée ! Consulte ta boîte e-mail pour confirmer ton adresse avant de te connecter.',
            'success'
          );
        } else {
          showMessage(
            'Aucune confirmation reçue. Réessaie dans quelques instants.',
            'error'
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (error) throw error;

        setSession(data.session);
        showMessage('Connexion réussie.', 'success');
      }
    } catch (error) {
      console.error('Erreur NEXIUM Auth:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';

      showMessage(errorMessage, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    if (busy) return;

    setBusy(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : 'Connexion Google impossible.',
        'error'
      );
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      showMessage(error.message, 'error');
    } else {
      setSession(null);
      showMessage('Déconnexion réussie.', 'success');
    }

    setBusy(false);
  }

  if (loading) {
    return <main className="loading-screen">NEXIUM</main>;
  }

  if (session) {
    return (
      <main className="app-screen">
        <header className="topbar">
          <div className="brand">NEXIUM<span>.</span></div>
          <button
            className="logout-button"
            onClick={handleLogout}
            disabled={busy}
          >
            Déconnexion
          </button>
        </header>

        <section className="welcome-panel">
          <div className="brand-symbol">N</div>
          <p className="eyebrow">CONNECTÉ AU MONDE</p>
          <h1>Bienvenue sur NEXIUM.</h1>
          <p>Ton compte est connecté.</p>
          <p className="account-email">{session.user.email}</p>
          {message && <p className="feedback">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand-symbol">N</div>
        <div className="brand">NEXIUM<span>.</span></div>
        <p className="tagline">CONNECTÉ AU MONDE.</p>

        <div className="auth-heading">
          <h1>{mode === 'login' ? 'Bon retour.' : 'Rejoins NEXIUM.'}</h1>
          <p>
            {mode === 'login'
              ? 'Connecte-toi à ton compte.'
              : 'Crée ton compte et entre dans la communauté.'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login');
              setMessage('');
            }}
          >
            Connexion
          </button>

          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => {
              setMode('register');
              setMessage('');
            }}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Pseudo
              <input
                type="text"
                placeholder="Ton pseudo"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_]+"
                required
              />
            </label>
          )}

          <label>
            Adresse e-mail
            <input
              type="email"
              placeholder="exemple@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              placeholder="8 caractères minimum"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={busy}>
            {busy
              ? 'Traitement en cours...'
              : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
          </button>
        </form>

        <div className="separator"><span>OU</span></div>

        <button
          className="google-button"
          type="button"
          onClick={handleGoogleLogin}
          disabled={busy}
        >
          Continuer avec Google
        </button>

        {message && (
          <p
            className="feedback"
            role="status"
            style={{
              borderColor: messageType === 'error' ? '#a33b55' : '#553b70',
              background: messageType === 'error' ? '#351923' : '#251632'
            }}
          >
            {message}
          </p>
        )}

        <p className="legal-note">
          En continuant, tu acceptes les règles et conditions
          d'utilisation de NEXIUM.
        </p>
      </section>
    </main>
  );
}
