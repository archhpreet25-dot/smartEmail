
import { useCallback, useEffect, useRef, useState } from 'react';

// Browsers cut off long utterances (Chrome stops after ~15s),
// so text is spoken as a queue of short chunks.
function toChunks(text, max = 180) {
  const sentences =
    text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\s*/g) || [];

  const chunks = [];
  let cur = '';

  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      chunks.push(cur);
      cur = '';
    }

    if (s.length > max) {
      for (let i = 0; i < s.length; i += max) {
        chunks.push(s.slice(i, i + max));
      }
    } else {
      cur += s;
    }
  }

  if (cur) chunks.push(cur);

  return chunks;
}

export default function useSpeech() {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [status, setStatus] = useState('idle'); // idle | speaking | paused
  const [activeId, setActiveId] = useState(null);

  // Incremented on every speak/stop so stale callbacks do nothing.
  const run = useRef(0);

  const stop = useCallback(() => {
    if (!supported) return;

    run.current++;
    window.speechSynthesis.cancel();

    setStatus('idle');
    setActiveId(null);
  }, [supported]);

  const speak = useCallback(
    (text, { rate = 1, id = null } = {}) => {
      if (!supported || !text) return;

      const synth = window.speechSynthesis;
      synth.cancel();

      const token = ++run.current;
      const chunks = toChunks(text);
      let i = 0;

      const next = () => {
        if (token !== run.current) return;

        if (i >= chunks.length) {
          setStatus('idle');
          setActiveId(null);
          return;
        }

        const u = new SpeechSynthesisUtterance(chunks[i++]);
        u.rate = rate;
        u.onend = next;

        u.onerror = (e) => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            next();
          }
        };

        synth.speak(u);
      };

      setStatus('speaking');
      setActiveId(id);
      next();
    },
    [supported]
  );

  const pause = useCallback(() => {
    if (supported) {
      window.speechSynthesis.pause();
      setStatus('paused');
    }
  }, [supported]);

  const resume = useCallback(() => {
    if (supported) {
      window.speechSynthesis.resume();
      setStatus('speaking');
    }
  }, [supported]);

  useEffect(
    () => () => {
      if (supported) window.speechSynthesis.cancel();
    },
    [supported]
  );

  return {
    supported,
    status,
    activeId,
    speak,
    stop,
    pause,
    resume,
  };
}
addEventListener