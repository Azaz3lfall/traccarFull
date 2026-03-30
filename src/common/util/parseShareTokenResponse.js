/**
 * Traccar returns share tokens as JSON-encoded strings (body is "token…" with quotes).
 * Using the raw response text in a URL would include those quotes and break /api/session?token=.
 */
export default function parseShareTokenResponseBody(body) {
  const raw = String(body).trim();
  if (!raw) {
    return raw;
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}
