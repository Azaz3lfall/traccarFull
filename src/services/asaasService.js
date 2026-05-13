import axios from 'axios';

const getBaseUrl = (environment = 'sandbox') => {
  if (environment === 'production') return 'https://api.asaas.com/v3';
  return 'https://sandbox.asaas.com/api/v3';
};

const maskApiKey = (apiKey = '') => {
  if (!apiKey) return null;
  const key = String(apiKey);
  if (key.length <= 8) return `${key.slice(0, 2)}****`;
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
};

function createClient({ apiKey, environment }) {
  const baseURL = getBaseUrl(environment);
  return axios.create({
    baseURL,
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  });
}

async function runConnectionTest({ apiKey, environment }) {
  const client = createClient({ apiKey, environment });
  const response = await client.get('/finance/balance');
  return response.data;
}

async function ensureCustomer({
  apiKey,
  environment,
  customerPayload,
}) {
  const client = createClient({ apiKey, environment });
  const search = await client.get('/customers', {
    params: customerPayload?.cpfCnpj
      ? { cpfCnpj: customerPayload.cpfCnpj }
      : { email: customerPayload?.email },
  });

  if (Array.isArray(search.data?.data) && search.data.data.length > 0) {
    return search.data.data[0];
  }

  const created = await client.post('/customers', customerPayload);
  return created.data;
}

async function createOrUpdateSubscription({
  apiKey,
  environment,
  subscriptionId,
  payload,
}) {
  const client = createClient({ apiKey, environment });
  if (subscriptionId) {
    const updated = await client.put(`/subscriptions/${subscriptionId}`, payload);
    return updated.data;
  }
  const created = await client.post('/subscriptions', payload);
  return created.data;
}

async function listAllPages(client, path, options = {}) {
  const maxPages = Number(options.maxPages || 20);
  const all = [];
  let offset = 0;
  const limit = 100;

  for (let i = 0; i < maxPages; i += 1) {
    const response = await client.get(path, { params: { limit, offset } });
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    all.push(...rows);

    const hasMore = response.data?.hasMore === true;
    if (!hasMore || rows.length === 0) break;
    offset += limit;
  }

  return all;
}

async function listCustomers({ apiKey, environment, maxPages }) {
  const client = createClient({ apiKey, environment });
  return listAllPages(client, '/customers', { maxPages });
}

async function listSubscriptions({ apiKey, environment, maxPages }) {
  const client = createClient({ apiKey, environment });
  return listAllPages(client, '/subscriptions', { maxPages });
}

async function listPayments({ apiKey, environment, maxPages }) {
  const client = createClient({ apiKey, environment });
  return listAllPages(client, '/payments', { maxPages });
}

async function listPaymentsByCustomer({
  apiKey,
  environment,
  customerId,
  statuses = [],
  maxPages,
}) {
  const client = createClient({ apiKey, environment });
  const max = Number(maxPages || 10);
  const all = [];
  let offset = 0;
  const limit = 100;
  const statusSet = new Set((statuses || []).map((s) => String(s).toUpperCase()));

  for (let i = 0; i < max; i += 1) {
    const response = await client.get('/payments', {
      params: { customer: customerId, limit, offset },
    });
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    const filtered = statusSet.size > 0
      ? rows.filter((item) => statusSet.has(String(item.status || '').toUpperCase()))
      : rows;
    all.push(...filtered);
    if (response.data?.hasMore !== true || rows.length === 0) break;
    offset += limit;
  }

  return all;
}

async function getPayment({
  apiKey,
  environment,
  paymentId,
}) {
  const client = createClient({ apiKey, environment });
  const response = await client.get(`/payments/${paymentId}`);
  return response.data;
}

async function getPaymentPixQrCode({
  apiKey,
  environment,
  paymentId,
}) {
  const client = createClient({ apiKey, environment });
  const response = await client.get(`/payments/${paymentId}/pixQrCode`);
  return response.data;
}

async function getPaymentIdentificationField({
  apiKey,
  environment,
  paymentId,
}) {
  const client = createClient({ apiKey, environment });
  const response = await client.get(`/payments/${paymentId}/identificationField`);
  return response.data;
}

export default {
  createClient,
  getBaseUrl,
  maskApiKey,
  runConnectionTest,
  ensureCustomer,
  createOrUpdateSubscription,
  listCustomers,
  listSubscriptions,
  listPayments,
  listPaymentsByCustomer,
  getPayment,
  getPaymentPixQrCode,
  getPaymentIdentificationField,
};

