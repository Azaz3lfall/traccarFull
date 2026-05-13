import axios from 'axios';
import pool from '../addons/traccar_wrapper/db/index.js';

/**
 * Middleware de autenticação que valida a sessão do Traccar
 * e popula req.user com os dados do usuário logado
 */
export const authenticate = async (req, res, next) => {
  try {
    // Obter o cookie da sessão do Traccar
    const cookie = req.headers.cookie;
    
    // Se não tiver cookie, não há sessão válida
    if (!cookie) {
      console.log('⚠️ No cookie found in request headers');
      // Não retorna erro, apenas deixa req.user como undefined
      // A rota decidirá o que fazer (retornar array vazio ou erro)
      return next();
    }

    const configuredApiUrl = process.env.TRACCAR_API_URL;
    const forwardedProto = req.headers['x-forwarded-proto'];
    const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
    const requestProto = req.protocol || 'https';
    const candidates = [
      configuredApiUrl,
      forwardedHost ? `${forwardedProto || requestProto}://${forwardedHost}` : null,
      forwardedHost ? `https://${forwardedHost}` : null,
      forwardedHost ? `http://${forwardedHost}` : null,
    ].filter(Boolean);

    const traccarApiUrls = [...new Set(candidates)];
    if (traccarApiUrls.length === 0) {
      console.warn('⚠️ No Traccar API URL candidates. Skipping authentication.');
      return next();
    }

    // Validar a sessão diretamente na API do Traccar
    // IMPORTANTE: Traccar é muito estrito com headers - enviar APENAS o Cookie
    let response = null;
    let lastError = null;
    for (const baseUrl of traccarApiUrls) {
      try {
        const candidateResponse = await axios.get(`${baseUrl}/api/session`, {
          headers: {
            Cookie: cookie, // Apenas o cookie importa - NÃO enviar Content-Type, Accept, etc.
          },
          // Não lançar erro em 401/403, vamos tratar manualmente
          validateStatus: (status) => status < 500,
        });
        if (candidateResponse.status === 200 && candidateResponse.data) {
          response = candidateResponse;
          break;
        }
        // 401/403 são respostas válidas da API; não adianta tentar outros hosts.
        if (candidateResponse.status === 401 || candidateResponse.status === 403) {
          response = candidateResponse;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (response?.status === 200 && response.data) {
      req.user = response.data;
      if (pool && req.user?.id) {
        try {
          const blockResult = await pool.query(
            `SELECT c.id, c.name, c.billing_status, c.billing_blocked
             FROM clients c
             WHERE c.id IN (
               SELECT client_id FROM client_users WHERE traccar_user_id = $1
               UNION
               SELECT id FROM clients WHERE traccar_user_id = $1
             )
             ORDER BY c.created_at DESC
             LIMIT 1`,
            [req.user.id]
          );
          const clientRow = blockResult.rows[0];
          if (clientRow) {
            req.user.clientBillingStatus = clientRow.billing_status || 'ativo';
            req.user.clientBillingBlocked = Boolean(clientRow.billing_blocked);
            req.user.clientId = clientRow.id;
          }
        } catch (dbErr) {
          console.error('Financial status check failed:', dbErr.message);
        }
      }
      console.log('✅ User authenticated:', {
        id: req.user.id,
        email: req.user.email,
        administrator: req.user.administrator,
      });
    } else if (response) {
      console.log(`⚠️ Session validation failed: ${response.status}`);
    } else if (lastError) {
      // Erro de rede ou API indisponível
      console.error('❌ Error validating session with Traccar:', lastError.message);
      if (lastError.response) {
        console.error('Response status:', lastError.response.status);
        console.error('Response data:', lastError.response.data);
      }
    }

    // Continuar para a próxima rota/middleware
    next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err.message);
    // Em caso de erro crítico, não bloqueia mas não popula req.user
    next();
  }
};
