
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Auth({ mode }) {
  const { login, register } = useAuth();
  const isReg = mode === 'register';

  const [f, setF] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      isReg
        ? await register(f.name, f.email, f.password)
        : await login(f.email, f.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-intro">
        <div className="brand dark">Smart Mail</div>

        <h1>
          Your inbox tells you
          <br />
          when mail arrives.
        </h1>

        <p>
          New messages appear the moment they are sent, are announced out
          loud, and can be read to you start to finish.
        </p>
      </div>

      <form className="card stack" onSubmit={submit}>
        <h2>{isReg ? 'Create your account' : 'Log in'}</h2>

        {isReg && (
          <label>
            Name
            <input
              required
              value={f.name}
              onChange={set('name')}
              autoComplete="name"
            />
          </label>
        )}

        <label>
          Email
          <input
            required
            type="email"
            value={f.email}
            onChange={set('email')}
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            required
            type="password"
            minLength={isReg ? 6 : undefined}
            value={f.password}
            onChange={set('password')}
            autoComplete={isReg ? 'new-password' : 'current-password'}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn" disabled={busy}>
          {busy
            ? 'Please wait…'
            : isReg
              ? 'Create account'
              : 'Log in'}
        </button>

        <p className="muted small">
          {isReg ? 'Already registered?' : 'New here?'}{' '}
          <Link to={isReg ? '/login' : '/register'}>
            {isReg ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </form>
    </div>
  );
}
