
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { toast } from '../components/Toast.jsx';

export default function Compose() {
  const nav = useNavigate();

  const [f, setF] = useState({
    to: '',
    subject: '',
    body: '',
  });

  const [suggest, setSuggest] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const recognitionRef = useRef(null);

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const set = (k) => (e) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const startVoice = () => {
    if (!SpeechRecognition) {
      setVoiceError('Speech Recognition unsupported in this browser');
      return;
    }

    setVoiceError('');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let text = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          text += event.results[i][0].transcript + ' ';
        }
      }

      if (text.trim()) {
        setF((prev) => ({
          ...prev,
          body: prev.body
            ? prev.body + ' ' + text.trim()
            : text.trim(),
        }));
      }
    };

    recognition.onerror = (event) => {
      setVoiceError('Voice error: ' + event.error);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setVoiceError(err.message);
    }
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  useEffect(() => {
    const q = f.to.trim();

    if (q.length < 2 || (q.includes('@') && q.includes('.'))) {
      setSuggest([]);
      return;
    }

    const t = setTimeout(() => {
      api.get('/auth/users?q=' + encodeURIComponent(q))
        .then(setSuggest)
        .catch(() => {});
    }, 250);

    return () => clearTimeout(t);
  }, [f.to]);

  const send = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const d = await api.post('/mail', f);

      toast(
        d.delivered
          ? d.notified
            ? 'Delivered. Recipient notified instantly'
            : 'Delivered to inbox'
          : 'Mail server accepted your message'
      );

      nav('/sent');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="compose-form card stack" onSubmit={send}>
      <h2>New message</h2>

      <label>
        To
        <input
          required
          type="text"
          list="contacts"
          value={f.to}
          onChange={set('to')}
          placeholder="name or email@example.com"
          autoComplete="off"
        />

        <datalist id="contacts">
          {suggest.map((u) => (
            <option key={u._id} value={u.email}>
              {u.name}
            </option>
          ))}
        </datalist>
      </label>

      <label>
        Subject
        <input
          required
          maxLength={200}
          value={f.subject}
          onChange={set('subject')}
        />
      </label>

      <label>
        Message
        <textarea
          required
          rows={12}
          value={f.body}
          onChange={set('body')}
          placeholder="Write or dictate your message..."
        />
      </label>

      <div className="row gap">
        {!listening ? (
          <button
            type="button"
            className="btn"
            onClick={startVoice}
          >
            🎤 Start Voice Typing
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={stopVoice}
          >
            🔴 Stop Voice Typing
          </button>
        )}
      </div>

      {listening && <p>🎙️ Listening... Speak now.</p>}

      {voiceError && <p className="error">{voiceError}</p>}
      {error && <p className="error">{error}</p>}

      <div className="row gap">
        <button className="btn" disabled={busy}>
          {busy ? 'Sending…' : 'Send'}
        </button>

        <button
          type="button"
          className="btn ghost"
          onClick={() => nav(-1)}
        >
          Discard
        </button>
      </div>
    </form>
  );
}
