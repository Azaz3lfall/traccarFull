/**
 * Carrega credenciais dos gateways SMS.
 * Prioridade: banco de dados > variáveis de ambiente.
 * @param {import('pg').Pool} pool
 * @returns {Promise<{comtele: {apiKey: string}, voxter: {email: string, password: string, accessToken: string, baseUrl: string}}>}
 */
export async function getGatewayConfig(pool) {
  const fromEnv = {
    comtele: { apiKey: process.env.COMTELE_API_KEY || '' },
    voxter: {
      email: process.env.VOXTER_EMAIL || '',
      password: process.env.VOXTER_PASSWORD || '',
      accessToken: process.env.VOXTER_ACCESS_TOKEN || '',
      baseUrl: process.env.VOXTER_BASE_URL || 'https://lara.voxter.com.br:8080/api',
    },
  };

  if (!pool) return fromEnv;

  try {
    const res = await pool.query(
      'SELECT comtele_api_key, voxter_email, voxter_password, voxter_access_token, voxter_base_url FROM sms_gateway_config WHERE id = 1 LIMIT 1'
    );
    const row = res.rows[0];
    if (!row) return fromEnv;

    return {
      comtele: {
        apiKey: (row.comtele_api_key && String(row.comtele_api_key).trim())
          ? String(row.comtele_api_key).trim()
          : fromEnv.comtele.apiKey,
      },
      voxter: {
        email: (row.voxter_email && String(row.voxter_email).trim())
          ? String(row.voxter_email).trim()
          : fromEnv.voxter.email,
        password: (row.voxter_password && String(row.voxter_password).trim())
          ? String(row.voxter_password).trim()
          : fromEnv.voxter.password,
        accessToken: (row.voxter_access_token && String(row.voxter_access_token).trim())
          ? String(row.voxter_access_token).trim()
          : fromEnv.voxter.accessToken,
        baseUrl: (row.voxter_base_url && String(row.voxter_base_url).trim())
          ? String(row.voxter_base_url).trim()
          : fromEnv.voxter.baseUrl,
      },
    };
  } catch (err) {
    console.warn('gatewayConfig: erro ao carregar do DB, usando .env:', err?.message);
    return fromEnv;
  }
}

/** Mascara valor sensível (mostra últimos 4 caracteres) */
export function maskSecret(val) {
  if (!val || typeof val !== 'string') return '';
  const s = String(val).trim();
  if (s.length <= 4) return '••••';
  return '••••' + s.slice(-4);
}
