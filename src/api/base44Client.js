// Drop-in replacement for the Base44 SDK client.
// Every page keeps calling `base44.entities.X.list()`, `base44.functions.invoke()`
// and `base44.auth.me()` exactly as before — the calls now go to this app's own
// Netlify backend (/api/*) instead of Base44's servers.

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(method, path, body) {
  const res = await fetch(`/api/${path}`, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (res.status === 401 && path !== 'login') {
    window.dispatchEvent(new CustomEvent('app:unauthorized'));
  }
  if (!res.ok) {
    throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

function qs(params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    p.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// Base44 signature: list(sort?, limit?, skip?) — non-numeric limits are ignored.
const asLimit = (v) => (typeof v === 'number' || /^\d+$/.test(String(v ?? '')) ? v : undefined);

function entityClient(name) {
  const base = `entities/${encodeURIComponent(name)}`;
  return {
    list: (sort, limit, skip) => request('GET', base + qs({ sort, limit: asLimit(limit), skip: asLimit(skip) })),
    filter: (query, sort, limit, skip) =>
      request('GET', base + qs({ q: query || undefined, sort, limit: asLimit(limit), skip: asLimit(skip) })),
    get: (id) => request('GET', `${base}/${encodeURIComponent(id)}`),
    create: (data) => request('POST', base, data),
    bulkCreate: (items) => request('POST', base, items),
    update: (id, data) => request('PUT', `${base}/${encodeURIComponent(id)}`, data),
    delete: (id) => request('DELETE', `${base}/${encodeURIComponent(id)}`),
    deleteMany: (query) => request('DELETE', base + qs({ q: query })),
  };
}

const entityCache = {};
const entities = new Proxy(
  {},
  {
    get(_t, name) {
      if (typeof name !== 'string') return undefined;
      if (!entityCache[name]) entityCache[name] = entityClient(name);
      return entityCache[name];
    },
  },
);

const auth = {
  me: () => request('GET', 'me'),
  updateMe: (data) => request('PUT', 'me', data),
  login: (password) => request('POST', 'login', { password }),
  logout: async (redirectUrl) => {
    try {
      await request('POST', 'logout');
    } finally {
      if (redirectUrl !== undefined) window.location.href = '/';
    }
  },
  redirectToLogin: () => {
    window.dispatchEvent(new CustomEvent('app:unauthorized'));
  },
  isAuthenticated: async () => {
    try {
      await request('GET', 'me');
      return true;
    } catch {
      return false;
    }
  },
};

// Base44 returned an axios-style response, so pages read `{ data }`.
const functions = {
  invoke: async (name, payload = {}) => {
    const data = await request('POST', `functions/${encodeURIComponent(name)}`, payload);
    return { data, status: 200 };
  },
};

const notAvailable = (what) => async () => {
  throw new Error(`${what} is not available in this version of the app.`);
};

const integrations = {
  Core: {
    InvokeLLM: notAvailable('AI text generation'),
    SendEmail: notAvailable('Email sending'),
    SendSMS: notAvailable('SMS sending'),
    UploadFile: notAvailable('File upload'),
    GenerateImage: notAvailable('Image generation'),
    ExtractDataFromUploadedFile: notAvailable('File extraction'),
  },
};

export const api = { request, ApiError };

export const base44 = {
  entities,
  auth,
  functions,
  integrations,
  appLogs: { logUserInApp: async () => {} },
};
