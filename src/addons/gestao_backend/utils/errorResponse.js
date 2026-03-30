/**
 * Envia resposta de erro 500. Em desenvolvimento, inclui a mensagem real para diagnóstico.
 */
export function send500(res, genericMessage, err) {
    const payload = { error: genericMessage };
    if (process.env.NODE_ENV === 'development' && err?.message) {
        payload.detail = err.message;
    }
    res.status(500).json(payload);
}
