
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useMail } from '../Realtime.jsx';
import { toast } from '../components/Toast.jsx';

const when = (d) =>
  new Date(d).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const STATUS = {
  sent: 'Accepted by mail server',
  simulated: 'Delivered in-app (SMTP not configured)',
  failed: 'Mail server rejected it',
};

export default function Mailbox({ box }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [list, setList] = useState(null);

  const load = useCallback(
    () =>
      api
        .get('/mail/' + box)
        .then(setList)
        .catch((e) => toast(e.message, 'error')),
    [box]
  );

  useEffect(() => {
    setList(null);
    load();
  }, [load]);

  useEffect(() => {
    // Live refresh when the server pushes a new email
    const h = () => box === 'inbox' && load();

    window.addEventListener('mail:new', h);

    return () => window.removeEventListener('mail:new', h);
  }, [box, load]);

  return (
    <div className="mailbox">
      <div className="list">
        <div className="row between list-head">
          <h2>{box === 'inbox' ? 'Inbox' : 'Sent'}</h2>

          {box === 'inbox' && (
            <button
              className="btn ghost sm"
              onClick={async () => {
                await api.post('/mail/read-all');
                load();
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {!list ? (
          <p className="muted pad">Loading…</p>
        ) : list.length === 0 ? (
          <p className="muted pad">
            {box === 'inbox'
              ? 'No emails yet. Ask a teammate to send you one.'
              : 'You have not sent anything yet.'}
          </p>
        ) : (
          list.map((m) => {
            const who =
              box === 'inbox'
                ? m.from?.name
                : m.to?.name || m.toEmail;

            return (
              <button
                key={m._id}
                className={
                  'item' +
                  (id === m._id ? ' on' : '') +
                  (box === 'inbox' && !m.read ? ' unread' : '')
                }
                onClick={() => nav(`/${box}/${m._id}`)}
              >
                <div className="row between">
                  <strong>{who}</strong>
                  <span className="faint small">
                    {when(m.createdAt)}
                  </span>
                </div>

                <div className="subject">
                  {box === 'inbox' && !m.read && (
                    <span className="udot" />
                  )}
                  {m.subject}
                </div>

                <div className="faint small clamp">
                  {m.body}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="reader">
        {id ? (
          <Reader key={id} id={id} box={box} onChange={load} />
        ) : (
          <p className="muted pad">Select an email to read it.</p>
        )}
      </div>
    </div>
  );
}

function Reader({ id, box, onChange }) {
  const { user } = useAuth();
  const { speech } = useMail();
  const nav = useNavigate();

  const [email, setEmail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/mail/' + id)
      .then((d) => {
        setEmail(d.email);
        onChange();
      })
      .catch((e) => setError(e.message));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="error pad">{error}</p>;

  if (!email) return <p className="muted pad">Loading…</p>;

  const mine =
    speech.activeId === email._id &&
    speech.status !== 'idle';

  const listen = () =>
    speech.speak(
      `Email from ${email.from.name}. Subject: ${email.subject}. Message: ${email.body}`,
      {
        rate: user.settings.speechRate,
        id: email._id,
      }
    );

  const del = async () => {
    if (!window.confirm('Delete this email?')) return;

    try {
      if (mine) speech.stop();

      await api.del('/mail/' + id);

      toast('Email deleted');
      onChange();
      nav('/' + box);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <article className="pad">
      <h2>{email.subject}</h2>

      <p className="faint small">
        From {email.from.name} &lt;{email.from.email}&gt; ·
        To {email.to?.name || email.toEmail} ·
        {when(email.createdAt)}
      </p>

      {box === 'sent' && (
        <p className={'small status ' + email.smtpStatus}>
          {STATUS[email.smtpStatus]}
          {email.smtpResponse ? ` — ${email.smtpResponse}` : ''}
          {email.to
            ? email.read
              ? ' · Read by recipient'
              : ' · Not read yet'
            : ''}
        </p>
      )}

      <div className="row gap wrap controls">
        {!speech.supported ? (
          <span className="error small">
            Speech synthesis is not supported in this browser.
          </span>
        ) : !mine ? (
          <button className="btn" onClick={listen}>
            Listen to this email
          </button>
        ) : (
          <>
            <button
              className="btn"
              onClick={
                speech.status === 'paused'
                  ? speech.resume
                  : speech.pause
              }
            >
              {speech.status === 'paused' ? 'Resume' : 'Pause'}
            </button>

            <button className="btn ghost" onClick={speech.stop}>
              Stop
            </button>
          </>
        )}

        {box === 'inbox' && (
          <button
            className="btn ghost"
            onClick={async () => {
              await api.patch(`/mail/${id}/unread`);
              onChange();
              toast('Marked as unread');
            }}
          >
            Mark unread
          </button>
        )}

        <button className="btn danger" onClick={del}>
          Delete
        </button>
      </div>

      <pre className="body">{email.body}</pre>
    </article>
  );
}
