
export const BASE =
  import.meta.env.VITE_API_URL || '/api';

export const SERVER =
  import.meta.env.VITE_SERVER_URL || undefined;
// undefined = same origin (Vite proxy in dev)

export const getToken = () =>
  localStorage.getItem('sm_token');

async function req(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getToken();

  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  let res;

  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      'Cannot reach the server. Check that the API is running'
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem('sm_token');
      window.location.href = '/login';
    }

    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export const api = {
  get: (p) => req(p),

  post: (p, b) =>
    req(p, {
      method: 'POST',
      body: b,
    }),

  put: (p, b) =>
    req(p, {
      method: 'PUT',
      body: b,
    }),

  patch: (p, b) =>
    req(p, {
      method: 'PATCH',
      body: b,
    }),

  del: (p) =>
    req(p, {
      method: 'DELETE',
    }),
};
