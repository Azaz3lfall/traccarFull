import axios from 'axios';

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

    // Verificar se as variáveis de ambiente estão configuradas
    const traccarApiUrl = process.env.TRACCAR_API_URL;
    
    if (!traccarApiUrl) {
      console.warn('⚠️ TRACCAR_API_URL not configured. Skipping authentication.');
      return next();
    }

    // Validar a sessão diretamente na API do Traccar
    // IMPORTANTE: Traccar é muito estrito com headers - enviar APENAS o Cookie
    try {
      const response = await axios.get(`${traccarApiUrl}/api/session`, {
        headers: {
          Cookie: cookie // Apenas o cookie importa - NÃO enviar Content-Type, Accept, etc.
        },
        // Não lançar erro em 401/403, vamos tratar manualmente
        validateStatus: (status) => status < 500
      });

      // Se a sessão for válida, popular req.user
      if (response.status === 200 && response.data) {
        req.user = response.data;
        console.log('✅ User authenticated:', {
          id: req.user.id,
          email: req.user.email,
          administrator: req.user.administrator
        });
      } else {
        console.log(`⚠️ Session validation failed: ${response.status}`);
        // Não popula req.user, mas continua (a rota decidirá)
      }
    } catch (err) {
      // Erro de rede ou API indisponível
      console.error('❌ Error validating session with Traccar:', err.message);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
      }
      // Não bloqueia a requisição, apenas não popula req.user
    }

    // Continuar para a próxima rota/middleware
    next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err.message);
    // Em caso de erro crítico, não bloqueia mas não popula req.user
    next();
  }
};
