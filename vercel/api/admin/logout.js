import { loadConfig } from '../../lib/config.js';
import { send, method } from '../../lib/http.js';
import { readSession, clearSessionCookie } from '../../lib/auth.js';
import { putJson, stamp } from '../../lib/store.js';
import { audit } from '../../lib/audit.js';

export default async function handler(req, res) {
  if (!method(req, res, 'POST')) return;
  await loadConfig();
  const s = readSession(req);
  if (s) {
    await putJson(`auth/revoked/${s.sid}-${stamp()}.json`, { at: Date.now() }); // 서버에서도 세션 폐기
    await audit(req, 'LOGOUT', { sid: s.sid.slice(0, 6) });
  }
  clearSessionCookie(res);
  return send(res, 200, { ok: true });
}
