import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import { IconGoogle } from '../components/Icons.jsx';

function GoogleButton() {
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handle = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
      setBusy(false);
    }
  };

  return (
    <button type="button" className="btn btn-google btn-full" disabled={busy} onClick={handle}>
      {error ? <IconGoogle /> : <IconGoogle />}
      {busy ? 'Redirecting to Google…' : 'Continue with Google'}
    </button>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <PageHeader
          eyebrow="Sign in"
          title="Welcome back"
          description="Enter your credentials or continue with Google."
        />

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error ? <InlineAlert message={error} onRetry={() => setError(null)} /> : null}

          <label htmlFor="email" className="auth-label">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="password" className="auth-label">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />

          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <GoogleButton />
        </form>

        <p className="auth-footnote">
          Need help? Create an administrator with <code>npm run admin:create</code>.
        </p>
      </div>
    </div>
  );
}
