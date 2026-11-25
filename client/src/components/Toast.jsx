
import { useEffect, useState } from 'react';

export const toast = (msg, type = 'ok') =>
  window.dispatchEvent(
    new CustomEvent('toast', {
      detail: { msg, type },
    })
  );

export function Toaster() {
  const [t, setT] = useState(null);

  useEffect(() => {
    let timer;

    const h = (e) => {
      setT(e.detail);
      clearTimeout(timer);
      timer = setTimeout(() => setT(null), 4200);
    };

    window.addEventListener('toast', h);

    return () => {
      window.removeEventListener('toast', h);
      clearTimeout(timer);
    };
  }, []);

  return t ? (
    <div className={'toast ' + t.type} role="status">
      {t.msg}
    </div>
  ) : null;
}
