import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import { useAuth } from '../context/AuthContext.jsx';
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
      {busy ? 'Redirecting to Google…' : 'Continue with Google'}
    </button>
  );
}

export default function LoginPage() {
  const { login, sendEmailCode, pendingOAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState(
    new URLSearchParams(location.search).get('error') === 'google'
      ? 'Google sign-in failed. Please try again.'
      : null,
  );

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleOtp = async () => {
    if (!email || otpBusy || cooldown > 0) {
      setError('Enter your email address to receive a sign-in code.');
      return;
    }

    setOtpBusy(true);
    setError(null);
    try {
      await sendEmailCode(email);
      setOtpSent(true);
      setCooldown(60);
    } catch (err) {
      const message = err.message || 'Could not send the email code.';
      if (message.toLowerCase().includes('rate limit')) {
        setError(
          'Supabase is rate limiting email sign-in. Try again in a few minutes, or sign in with Google if available.',
        );
      } else {
        setError(message);
      }
    } finally {
      setOtpBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/tasks', { replace: true });
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
          description="Enter your credentials, continue with Google, or create a new account."
        />

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error ? <InlineAlert message={error} onRetry={() => setError(null)} /> : null}

          {pendingOAuth ? <div className="auth-loading">Completing Google sign-in…</div> : null}

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

          <button type="submit" className="btn btn-primary btn-full" disabled={busy || pendingOAuth}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-full"
            disabled={otpBusy || cooldown > 0}
            onClick={handleOtp}
          >
            {otpBusy
              ? 'Sending code…'
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : 'Email me a sign-in code'}
          </button>

          {otpSent ? (
            <p className="auth-footnote" role="status">
              Check your email for the sign-in link. It works for any Gmail or
              organization address.
            </p>
          ) : null}

          <GoogleButton />

          <div className="auth-divider" />
          <Link to="/signup" className="auth-link">Create a new account</Link>
        </form>
      </div>
    </div>
  );
}
