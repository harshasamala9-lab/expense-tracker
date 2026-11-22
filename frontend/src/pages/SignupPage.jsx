import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      setBusy(false);
      return;
    }

    try {
      await signup(email, password);
      navigate('/tasks', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign-up failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <PageHeader
          eyebrow="Create account"
          title="Get started"
          description="Create an administrator account to manage expense tracking and tasks."
        />

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error ? <InlineAlert message={error} onRetry={() => setError(null)} /> : null}

          <label htmlFor="email" className="auth-label">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="password" className="auth-label">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter a password"
            required
          />

          <label htmlFor="confirm" className="auth-label">Confirm password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Enter the password again"
            required
          />

          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>

          <div className="auth-divider" />
          <Link to="/login" className="auth-link">Already have an account? Sign in</Link>
        </form>
      </div>
    </div>
  );
}
