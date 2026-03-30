const COMTELE_URL = 'https://sms.comtele.com.br/api/v2/send';

export async function sendSms(receivers, content, apiKey) {
  const key = apiKey ? String(apiKey).trim() : '';
  if (!key || !receivers || !content) {
    throw new Error('auth-key, Receivers e Content são obrigatórios');
  }
  const res = await fetch(COMTELE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'auth-key': key,
    },
    body: JSON.stringify({
      Sender: 'Traccar',
      Receivers: String(receivers).trim(),
      Content: String(content).trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.Message || data.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return {
    success: data.Success === true,
    requestUniqueId: data.Object?.requestUniqueId || null,
    message: data.Message || data.message,
  };
}
