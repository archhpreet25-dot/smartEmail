
import { useState } from 'react';
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';

import { api } from './api.js';
import { useAuth } from './AuthContext.jsx';
import { MailProvider, useMail } from './Realtime.jsx';
import { Toaster, toast } from './components/Toast.jsx';

import Auth from './pages/Auth.jsx';
import Mailbox from './pages/Mailbox.jsx';
import Compose from './pages/Compose.jsx';

function Equalizer() {
  return (
    <span className="eq" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function Settings() {
  const { user, updateUser } = useAuth();
  const { speech } = useMail();

  const save = async (patch) => {
    try {
      updateUser(
        (await api.put('/auth/settings', patch)).user
      );
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="pop card">
      <label className="check">
        <input
          type="checkbox"
          checked={user.settings.voiceAnnounce}
          onChange={(e) =>
            save({ voiceAnnounce: e.target.checked })
          }
        />
        Announce new emails automatically
      </label>

      <label>
        Speaking speed
        <select
          value={user.settings.speechRate}
          onChange={(e) =>
            save({ speechRate: Number(e.target.value) })
          }
        >
          {[0.75, 1, 1.25, 1.5].map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
      </label>

      <button
        className="btn ghost sm"
        onClick={() =>
          speech.speak(
            'This is how your email announcements will sound.',
            { rate: user.settings.speechRate }
          )
        }
      >
        Test voice
      </button>

      {!speech.supported && (
        <p className="error small">
          This browser does not support speech synthesis.
          Try Chrome, Edge or Safari.
        </p>
      )}
    </div>
  );
}

function Layout() {
  const { user, logout } = useAuth();

  const {
    unread,
    alert,
    setAlert,
    connected,
    muted,
    setMuted,
    speech,
  } = useMail();

  const nav = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const listen = async () => {
    try {
      const { email } = await api.get('/mail/' + alert._id);

      speech.speak(
        `Email from ${email.from.name}. Subject: ${email.subject}. Message: ${email.body}`,
        {
          rate: user.settings.speechRate,
          id: email._id,
        }
      );

      setAlert(null);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Smart Mail</div>

        <button
          className="btn compose"
          onClick={() => nav('/compose')}
        >
          Compose
        </button>

        <nav>
          <NavLink to="/inbox">
            Inbox
            {unread > 0 && (
              <span
                className="count"
                aria-label={`${unread} unread`}
              >
                {unread}
              </span>
            )}
          </NavLink>

          <NavLink to="/sent">Sent</NavLink>
        </nav>

        <div className="side-foot">
          <div className="small">
            <span
              className={'dot ' + (connected ? 'on' : '')}
            />
            {connected
              ? 'Live notifications on'
              : 'Reconnecting…'}
          </div>

          <div className="small">
            {user.name}
            <br />
            <span className="faint">{user.email}</span>
          </div>

          <button
            className="btn ghost sm"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </aside>

      <section className="main">
        <div className="topbar">
          {speech.status !== 'idle' && (
            <div className="row gap speaking">
              <Equalizer />
              Speaking

              <button
                className="btn ghost sm"
                onClick={
                  speech.status === 'paused'
                    ? speech.resume
                    : speech.pause
                }
              >
                {speech.status === 'paused'
                  ? 'Resume'
                  : 'Pause'}
              </button>

              <button
                className="btn ghost sm"
                onClick={speech.stop}
              >
                Stop
              </button>
            </div>
          )}

          <div className="grow" />

          <button
            className={
              'btn ghost sm' +
              (muted ? ' muted-on' : '')
            }
            aria-pressed={muted}
            onClick={() => setMuted(!muted)}
            title="Silences automatic announcements"
          >
            {muted
              ? 'Unmute announcements'
              : 'Mute announcements'}
          </button>

          <div className="relative">
            <button
              className="btn ghost sm"
              aria-expanded={showSettings}
              onClick={() =>
                setShowSettings(!showSettings)
              }
            >
              Voice settings
            </button>

            {showSettings && <Settings />}
          </div>
        </div>

        {alert && (
          <div className="alert" role="alert">
            <div>
              <strong>
                New email from {alert.from.name}
              </strong>

              <div className="small">{alert.subject}</div>
            </div>

            <div className="row gap">
              <button
                className="btn sm"
                onClick={() => {
                  nav('/inbox/' + alert._id);
                  setAlert(null);
                }}
              >
                Open
              </button>

              <button
                className="btn ghost sm"
                onClick={listen}
              >
                Listen
              </button>

              <button
                className="btn ghost sm"
                onClick={() => setAlert(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <Routes>
          <Route
            path="/inbox"
            element={<Mailbox box="inbox" />}
          />

          <Route
            path="/inbox/:id"
            element={<Mailbox box="inbox" />}
          />

          <Route
            path="/sent"
            element={<Mailbox box="sent" />}
          />

          <Route
            path="/sent/:id"
            element={<Mailbox box="sent" />}
          />

          <Route
            path="/compose"
            element={<Compose />}
          />

          <Route
            path="*"
            element={<Navigate to="/inbox" replace />}
          />
        </Routes>
      </section>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="center muted">Loading…</p>;
  }

  return (
    <>
      {user ? (
        <MailProvider>
          <Layout />
        </MailProvider>
      ) : (
        <Routes>
          <Route
            path="/register"
            element={<Auth mode="register" />}
          />

          <Route
            path="*"
            element={<Auth mode="login" />}
          />
        </Routes>
      )}

      <Toaster />
    </>
  );
}
