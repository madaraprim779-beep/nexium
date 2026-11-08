
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  MessageCircle,
  Mail,
  Lock,
  User,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { supabase } from "./lib/supabase";

type AuthMode = "login" | "register";

export default function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!email.trim() || password.length < 8) {
      setMessage("Vérifie ton adresse e-mail et ton mot de passe (8 caractères minimum).");
      return;
    }

    if (mode === "register" && !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      setMessage("Le pseudo doit contenir 3 à 24 lettres, chiffres ou underscores.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim()
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          setMessage("Compte créé avec succès.");
        } else {
          setMessage("Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) setMessage(error.message);
  }

  if (user) {
    const displayName =
      user.user_metadata?.username ||
      user.user_metadata?.full_name ||
      user.email;

    return (
      <main className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-icon">N</span>
            <span>NEXIUM</span>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            Déconnexion
          </button>
        </header>

        <section className="welcome-panel">
          <div className="welcome-icon">
            <MessageCircle size={42} />
          </div>
          <p className="eyebrow">CONNECTÉ AU MONDE</p>
          <h1>Bienvenue sur NEXIUM</h1>
          <p className="welcome-text">
            Ton compte est connecté. Ton espace de communication
            sera construit dans les prochaines étapes.
          </p>
          <div className="account-card">
            <ShieldCheck size={22} />
            <div>
              <strong>{displayName}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          {message && <p className="notice">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand">
          <span className="brand-icon">N</span>
          <span>NEXIUM</span>
        </div>

        <p className="eyebrow">CONNECTÉ AU MONDE</p>
        <h1>{mode === "login" ? "Bon retour." : "Créer un compte."}</h1>
        <p className="subtitle">
          {mode === "login"
            ? "Connecte-toi à ton espace NEXIUM."
            : "Rejoins ton nouvel espace de communication."}
        </p>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            Connexion
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="field">
              <span>Pseudo</span>
              <div className="input-wrap">
                <User size={19} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ton pseudo"
                  minLength={3}
                  maxLength={24}
                  autoComplete="username"
                  required
                />
              </div>
            </label>
          )}

          <label className="field">
            <span>Adresse e-mail</span>
            <div className="input-wrap">
              <Mail size={19} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@gmail.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <div className="input-wrap">
              <Lock size={19} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                minLength={8}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
              />
            </div>
          </label>

          <button className="primary-button" disabled={loading}>
            {loading
              ? "Chargement..."
              : mode === "login"
                ? "Se connecter"
                : "Créer mon compte"}
          </button>
        </form>

        <div className="separator">
          <span>OU</span>
        </div>

        <button
          className="google-button"
          onClick={handleGoogle}
          disabled={loading}
        >
          <span className="google-letter">G</span>
          Continuer avec Google
        </button>

        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}

        <p className="legal">
          En continuant, tu acceptes les règles et les conditions
          d'utilisation de NEXIUM.
        </p>
      </section>
    </main>
  );
}
