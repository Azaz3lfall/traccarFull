/**
 * Cliente API Voxter (Lara M2M)
 * Base: https://lara.voxter.com.br:8080/api
 * Env: VOXTER_EMAIL, VOXTER_PASSWORD, VOXTER_ACCESS_TOKEN, VOXTER_BASE_URL
 * Ou credenciais passadas via parâmetro (do painel).
 */

const DEFAULT_BASE = 'https://lara.voxter.com.br:8080/api';

let cachedToken = null;
let tokenExpiresAt = 0;
const TOKEN_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours

function getBaseUrl(creds) {
  return (creds?.baseUrl && String(creds.baseUrl).trim()) || process.env.VOXTER_BASE_URL || DEFAULT_BASE;
}

function getAccessToken(creds) {
  return (creds?.accessToken && String(creds.accessToken).trim()) || process.env.VOXTER_ACCESS_TOKEN || '';
}

async function authenticate(creds = null) {
  const email = creds?.email ?? process.env.VOXTER_EMAIL;
  const password = creds?.password ?? process.env.VOXTER_PASSWORD;
  const accessToken = getAccessToken(creds);

  if (!email || !password || !accessToken) {
    throw new Error('VOXTER_EMAIL, VOXTER_PASSWORD e VOXTER_ACCESS_TOKEN são obrigatórios.');
  }

  const base = getBaseUrl(creds);
  const params = new URLSearchParams({ email, password, platform: 1 });
  const res = await fetch(`${base}/authenticate2?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': accessToken,
    },
    body: JSON.stringify({ email, password, platform: 1 }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  if (data.error) {
    throw new Error(data.message || 'Autenticação falhou.');
  }

  const bearer = data.token?.token;
  if (!bearer) {
    throw new Error('Token não retornado pela API Voxter.');
  }

  return bearer;
}

async function getBearerToken(creds = null) {
  if (creds) {
    return authenticate(creds);
  }
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now) {
    return cachedToken;
  }
  cachedToken = await authenticate();
  tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  return cachedToken;
}

/**
 * Lista simcards da plataforma Voxter (paginação e busca)
 * @param {number} page - Número da página (default 1)
 * @param {string} search - Busca por campo personalizado, linha, ICCID ou IMEI
 * @param {{email, password, accessToken, baseUrl}} creds - Credenciais opcionais (do painel)
 * @returns {{ page, pages, records, data }}
 */
export async function listSimcards(page = 1, search = '', creds = null) {
  const token = await getBearerToken(creds);
  const base = getBaseUrl(creds);
  const params = new URLSearchParams({ page: String(page), search: String(search || ' ').trim() });
  const res = await fetch(`${base}/simcards?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      cachedToken = null;
      tokenExpiresAt = 0;
    }
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }

  return {
    page: data.page ?? 1,
    pages: data.pages ?? 1,
    records: data.records ?? 0,
    data: Array.isArray(data.data) ? data.data : [],
  };
}

/**
 * Envia SMS via Voxter (apenas operadoras Claro e Emnify)
 * @param {number|string} line - Número da linha (ex: 5599999999999)
 * @param {string} payload - Texto do SMS
 * @param {{email, password, accessToken, baseUrl}} creds - Credenciais opcionais (do painel)
 * @returns {{ success: boolean, message?: string }}
 */
export async function sendSms(line, payload, creds = null) {
  const token = await getBearerToken(creds);
  const base = getBaseUrl(creds);
  const lineNum = typeof line === 'string' ? parseInt(line.replace(/\D/g, ''), 10) : parseInt(line, 10);

  const res = await fetch(`${base}/simcards/sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ line: lineNum, payload: String(payload || '').trim() }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      cachedToken = null;
      tokenExpiresAt = 0;
    }
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }

  const success = data.success != null && data.success !== false;
  return {
    success,
    message: data.error || data.success || data.message,
  };
}

/**
 * Reset de simcard (apenas operadoras Algar, Claro, Vivo M2M, NLT, Links Field e Emnify)
 * @param {number|string} simcardId - ID do simcard na plataforma Voxter
 * @param {{email, password, accessToken, baseUrl}} creds - Credenciais opcionais (do painel)
 * @returns {{ success: boolean, message?: string }}
 */
export async function resetSimcard(simcardId, creds = null) {
  const token = await getBearerToken(creds);
  const base = getBaseUrl(creds);
  const id = parseInt(simcardId, 10);

  const res = await fetch(`${base}/simcards/reset/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      cachedToken = null;
      tokenExpiresAt = 0;
    }
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }

  const success = data.success != null && data.success !== false;
  return {
    success,
    message: data.error || data.success || data.message,
  };
}
