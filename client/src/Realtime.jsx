
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { io } from 'socket.io-client';

import { SERVER, api, getToken } from './api.js';
import { useAuth } from './AuthContext.jsx';
import useSpeech from './hooks/useSpeech.js';

const Ctx = createContext(null);

export const useMail = () => useContext(Ctx);

// Owns the Socket.IO connection, unread counter,
// "new email" alert and the voice controls.
export function MailProvider({ children }) {
  const { user } = useAuth();
  const speech = useSpeech();

  const [unread, setUnread] = useState(0);
  const [alert, setAlert] = useState(null);
  const [connected, setConnected] = useState(false);

  const [muted, setMutedState] = useState(
    () => localStorage.getItem('sm_muted') === '1'
  );

  const live = useRef({});
  live.current = {
    muted,
    user,
    speak: speech.speak,
  }; // Latest values for the socket handler

  const setMuted = (m) => {
    setMutedState(m);
    localStorage.setItem('sm_muted', m ? '1' : '0');

    if (m) speech.stop();
  };

  useEffect(() => {
    if (!user) return;

    api
      .get('/mail/unread-count')
      .then((d) => setUnread(d.unread))
      .catch(() => {});

    const socket = io(SERVER, {
      auth: {
        token: getToken(),
      },
    });

    socket.on('connect', () => setConnected(true));

    socket.on('disconnect', () => setConnected(false));

    socket.on('unread:update', (d) => {
      setUnread(d.unread);
    });

    socket.on('email:new', (m) => {
      setUnread(m.unread);
      setAlert(m);

      window.dispatchEvent(new Event('mail:new'));

      const { muted, user, speak } = live.current;

      if (!muted && user?.settings?.voiceAnnounce) {
        speak(
          `You have received a new email from ${m.from.name}. Subject: ${m.subject}`,
          {
            rate: user.settings.speechRate,
          }
        );
      }
    });

    return () => socket.disconnect();
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = unread
      ? `(${unread}) Smart Mail`
      : 'Smart Mail';
  }, [unread]);

  useEffect(() => {
    if (!alert) return;

    const t = setTimeout(() => setAlert(null), 12000);

    return () => clearTimeout(t);
  }, [alert]);

  useEffect(() => {
    if (!user) {
      speech.stop();
      setUnread(0);
      setAlert(null);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Ctx.Provider
      value={{
        speech,
        unread,
        alert,
        setAlert,
        connected,
        muted,
        setMuted,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
