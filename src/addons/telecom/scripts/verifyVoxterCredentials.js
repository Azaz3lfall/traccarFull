#!/usr/bin/env node
/**
 * Script para verificar credenciais Voxter (VOXTER_EMAIL, VOXTER_PASSWORD, VOXTER_ACCESS_TOKEN)
 * Uso: node src/addons/telecom/scripts/verifyVoxterCredentials.js
 * Ou: cd src/addons/telecom/scripts && node verifyVoxterCredentials.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const BASE = process.env.VOXTER_BASE_URL || 'https://lara.voxter.com.br:8080/api';

async function verify() {
  console.log('🔐 Verificando credenciais Voxter...\n');

  const email = process.env.VOXTER_EMAIL;
  const password = process.env.VOXTER_PASSWORD;
  const accessToken = process.env.VOXTER_ACCESS_TOKEN;

  if (!email) {
    console.error('❌ VOXTER_EMAIL não definido no .env');
    process.exit(1);
  }
  if (!password) {
    console.error('❌ VOXTER_PASSWORD não definido no .env');
    process.exit(1);
  }
  if (!accessToken) {
    console.error('❌ VOXTER_ACCESS_TOKEN não definido no .env');
    process.exit(1);
  }

  console.log('   Email:', email);
  console.log('   Access Token:', accessToken.substring(0, 8) + '...' + accessToken.substring(accessToken.length - 4));
  console.log('   Base URL:', BASE);
  console.log('');

  try {
    const params = new URLSearchParams({ email, password, platform: 1 });
    const res = await fetch(`${BASE}/authenticate2?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': accessToken,
      },
      body: JSON.stringify({ email, password, platform: 1 }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && !data.error && data.token?.token) {
      console.log('✅ Credenciais VOXTER válidas! Autenticação OK.');
      console.log('   Bearer token obtido com sucesso.');
      process.exit(0);
    }

    console.error('❌ Falha na autenticação Voxter:');
    console.error('   Status:', res.status);
    console.error('   Resposta:', JSON.stringify(data, null, 2));
    if (data.message) console.error('   Mensagem:', data.message);
    if (res.status === 401) {
      console.error('\n   Possíveis causas:');
      console.error('   - VOXTER_ACCESS_TOKEN expirado ou inválido (solicite novo no painel Lara)');
      console.error('   - VOXTER_EMAIL ou VOXTER_PASSWORD incorretos');
    }
    process.exit(1);
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
    console.error('   Verifique se a URL', BASE, 'está acessível.');
    process.exit(1);
  }
}

verify();
